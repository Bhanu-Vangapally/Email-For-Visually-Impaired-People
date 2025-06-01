require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { htmlToText } = require("html-to-text");
const userRoutes = require("./routes/userRoutes");
const connectDB = require("./config/db");

connectDB();
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/users", userRoutes);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized - Not Logged In" });
  }
  next();
};

const getEmailBody = (payload) => {
  const decodeBody = (data) => {
    if (!data) return "";
    return Buffer.from(data, "base64").toString("utf-8");
  };

  const findPart = (parts, mimeType) => {
    return parts.find((part) => part.mimeType === mimeType && part.body?.data);
  };

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBody(payload.body.data);
    return htmlToText(html, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "img", format: "skip" },
        { selector: "table", options: { uppercaseHeaderCells: false } },
      ],
    });
  }

  if (payload.parts) {
    const textPart = findPart(payload.parts, "text/plain");
    if (textPart) return decodeBody(textPart.body.data);

    const htmlPart = findPart(payload.parts, "text/html");
    if (htmlPart) {
      const html = decodeBody(htmlPart.body.data);
      return htmlToText(html, {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
          { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
          { selector: "img", format: "skip" },
          { selector: "table", options: { uppercaseHeaderCells: false } },
        ],
      });
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const nestedBody = getEmailBody(part);
        if (nestedBody) return nestedBody;
      }
    }
  }

  if (payload.body?.data) {
    const body = decodeBody(payload.body.data);
    if (body.startsWith("<") && body.endsWith(">")) {
      return htmlToText(body, {
        wordwrap: false,
        preserveNewlines: true,
      });
    }
    return body;
  }

  return "";
};

const fetchEmails = async (req, res, labelIds) => {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: "Unauthorized - No Access Token" });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: req.user.accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds,
      maxResults: 50,
    });

    const messages = response.data.messages || [];
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        try {
          const email = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "full",
          });

          const headers = email.data.payload.headers;
          const from = headers.find((h) => h.name === "From")?.value;
          const to = headers.find((h) => h.name === "To")?.value || "(No To)";
          const subject =
            headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
          const dateHeader = headers.find((h) => h.name === "Date")?.value;
          
          // Improved date parsing
          let date;
          if (dateHeader) {
            try {
              // Try parsing with the internalDate as fallback
              date = new Date(dateHeader || email.data.internalDate);
              if (isNaN(date.getTime())) {
                date = new Date(); // Fallback to current date if parsing fails
              }
            } catch (e) {
              date = new Date(); // Fallback to current date if parsing fails
            }
          } else {
            date = new Date(); // Fallback to current date if no date header
          }

          const body = getEmailBody(email.data.payload);

          return {
            id: msg.id,
            from,
            to,
            subject,
            body,
            date: date.toISOString(),
            read: !email.data.labelIds?.includes("UNREAD"),
          };
        } catch (error) {
          console.error(`Error processing email ${msg.id}:`, error);
          return null; // Skip this email but continue with others
        }
      })
    );

    // Filter out any null emails from failed processing
    res.json(emailDetails.filter(email => email !== null));
  } catch (err) {
    console.error("Error fetching emails:", err);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
};

app.get("/emails/inbox", isAuthenticated, (req, res) => {
  fetchEmails(req, res, ["INBOX"]);
});

app.get("/emails/sent", isAuthenticated, (req, res) => {
  fetchEmails(req, res, ["SENT"]);
});

app.get("/emails/drafts", isAuthenticated, (req, res) => {
  fetchEmails(req, res, ["DRAFT"]);
});

app.get("/emails/trash", isAuthenticated, (req, res) => {
  fetchEmails(req, res, ["TRASH"]);
});

app.get("/emails/primary", isAuthenticated, (req, res) => {
  fetchEmails(req, res, ["CATEGORY_PRIMARY"]);
});

app.post("/emails/send-email", isAuthenticated, async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: req.user.accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const emailLines = [];
  emailLines.push(`To: ${to}`);
  emailLines.push("Content-Type: text/plain; charset=utf-8");
  emailLines.push("MIME-Version: 1.0");
  emailLines.push(`Subject: ${subject}`);
  emailLines.push("");
  emailLines.push(message);

  const email = emailLines.join("\n");

  const base64Email = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    });

    res.json({ message: "Email sent successfully!", data: response.data });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}`);
  }
);

app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Unauthorized - Not Logged In" });
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.redirect("http://localhost:5173");
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
