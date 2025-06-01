import axios from "axios";
import Sidebar from "../components/Sidebar";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Compose = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const synth = window.speechSynthesis;

  // Mapping fields to custom speech prompts
  const prompts = {
    to: "To whom do you want to send the email?",
    subject: "What is the subject of your email?",
    message: "What do you want to say in your message?",
  };

  useEffect(() => {
    axios
      .get("http://localhost:5000/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));

    return () => {
      stopListening();
      synth.cancel();
    };
  }, []);

  // Redirect to Google login
  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  // Logout function
  const handleLogout = () => {
    axios
      .get("http://localhost:5000/logout", { withCredentials: true })
      .then(() => setUser(null));
    navigate("/");
  };

  // Process email address from speech
  const processEmail = (transcript) => {
    return transcript
      .replace(/\s+/g, "") // Remove all spaces
      .replace(/ at /g, "@") // Replace "at" with "@"
      .replace(/ dot /g, "."); // Replace "dot" with "."
  };

  // Start continuous listening for navigation
  const startNavigationListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (recognitionRef.current) return; // Already listening

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      console.log("Navigation command:", transcript);

      // Navigate based on spoken command
      if (transcript.includes("inbox")) {
        navigate("/inbox");
      } else if (transcript.includes("trash")) {
        navigate("/trash");
      } else if (transcript.includes("draft")) {
        navigate("/drafts");
      } else if (transcript.includes("sent")) {
        navigate("/sent");
      } else if (transcript.includes("send")) {
        handleSendEmail();
      } else if (transcript.includes("receiver") && !activeField) {
        handleFieldClick("to");
      } else if (
        (transcript.includes("subject") || transcript.includes("title")) &&
        !activeField
      ) {
        handleFieldClick("subject");
      } else if (
        (transcript.includes("message") || transcript.includes("body")) &&
        !activeField
      ) {
        handleFieldClick("message");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // Automatically restart if no speech detected
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  // Handle field click (start listening for specific field)
  const handleFieldClick = (field) => {
    setActiveField(field);
    stopListening(); // Stop navigation listening temporarily

    // Speak the prompt for the field
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(prompts[field]);
    synth.speak(utterance);

    utterance.onend = () => {
      startFieldListening(field);
    };
  };

  // Start listening for specific field input
  const startFieldListening = (field) => {
    if (!("webkitSpeechRecognition" in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = event.results[0][0].transcript.toLowerCase().trim();

      if (transcript === "clear") {
        setForm((prev) => ({ ...prev, [field]: "" }));
        synth.speak(new SpeechSynthesisUtterance("Field cleared."));
        startFieldListening(field); // Restart listening
        return;
      }

      // Process the transcript for email field
      if (field === "to") {
        transcript = processEmail(transcript);
      }

      // Update the form field
      setForm((prev) => ({ ...prev, [field]: transcript }));

      // Confirm what was entered
      const confirmation =
        field === "to"
          ? `Recipient set to ${transcript}@gmail.com`
          : `You said: ${transcript}`;
      synth.speak(new SpeechSynthesisUtterance(confirmation));
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      setActiveField(null);
      // Restart navigation listening after a short delay
      setTimeout(startNavigationListening, 500);
    };

    recognition.start();
  };

  // Stop all listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setActiveField(null);
  };

  // Send email function
  const handleSendEmail = async () => {
    if (!form.to || !form.subject || !form.message) {
      const utterance = new SpeechSynthesisUtterance(
        "Please fill in all fields before sending the email."
      );
      synth.speak(utterance);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/emails/send-email",
        {
          to: `${form.to}@gmail.com`,
          subject: form.subject,
          message: form.message,
        },
        { withCredentials: true }
      );

     
        const successMessage = `Email sent successfully to ${form.to}@gmail.com`;
        synth.speak(new SpeechSynthesisUtterance(successMessage));
        setForm({ to: "", subject: "", message: "" });
      
    } catch (error) {
      console.error("Error sending email:", error);
      synth.speak(
        new SpeechSynthesisUtterance("Failed to send email. Please try again.")
      );
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="flex max-h-screen overflow-auto bg-gray-100"
      onMouseEnter={startNavigationListening}
    >
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-8 transform transition-all duration-300 hover:shadow-2xl">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">COMPOSE</h2>

          {/* Status indicator */}
          <div className="mb-4 flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                isListening ? "bg-green-500" : "bg-gray-400"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {isListening ? "Microphone is active" : "Microphone is off"}
            </span>
          </div>

          {/* User controls */}
          <div className="flex justify-between items-center mb-6">
            {user ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all"
              >
                Login with Google
              </button>
            )}
          </div>

          {/* To Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To:
            </label>
            <div className="relative">
              <input
                type="text"
                value={`${form.to}@gmail.com`}
                onChange={(e) =>
                  handleInputChange(
                    "to",
                    e.target.value.replace("@gmail.com", "")
                  )
                }
                onClick={() => handleFieldClick("to")}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter recipient email"
              />
              {activeField === "to" && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Subject Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject:
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                onClick={() => handleFieldClick("subject")}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter subject"
              />
              {activeField === "subject" && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message:
            </label>
            <div className="relative">
              <textarea
                value={form.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                onClick={() => handleFieldClick("message")}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Enter message"
                rows="6"
              />
              {activeField === "message" && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendEmail}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-200 transform hover:scale-105"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Compose;
