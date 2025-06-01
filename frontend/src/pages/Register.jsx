import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [prompt, setPrompt] = useState("");

  // Function to speak a given text
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Function to speak password as individual digits
  const speakPassword = (password) => {
    const digits = password.split("").join(" "); // Split into individual characters and join with spaces
    speak(`Your password is ${digits}`);
  };

  // Speak name when it changes
  useEffect(() => {
    if (name) {
      speak(`Your name is ${name}`);
    }
  }, [name]);

  // Speak email when it changes
  useEffect(() => {
    if (email) {
      speak(`Your email is ${email}`);
    }
  }, [email]);

  // Speak password when it changes
  useEffect(() => {
    if (password) {
      speakPassword(password); // Use the new function for password
    }
  }, [password]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.trim().toLowerCase();

      if (command === "name") {
        setPrompt("Please say your name.");
        speak("Please say your name."); // Speak the prompt
      } else if (command === "email") {
        setPrompt("Please say your email.");
        speak("Please say your email."); // Speak the prompt
      } else if (command === "password") {
        setPrompt("Please say your password.");
        speak("Please say your password."); // Speak the prompt
      } else if (command === "register") {
        handleSubmit({ preventDefault: () => {} });
      } else if (prompt.includes("name")) {
        setName(command);
        setPrompt("");
      } else if (prompt.includes("email")) {
        setEmail(command);
        setPrompt("");
      } else if (prompt.includes("password")) {
        setPassword(command);
        setPrompt("");
      } else if (command === "register") {
        handleSubmit();
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [prompt]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    console.log(name, email, password);

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/users/signup", {
        name,
        email,
        password,
      });
      if (response) {
        setLoading(false);
        navigate("/"); // Redirect to login page after successful signup
      }
      // Handle success
    } catch (err) {
      setLoading(false);
      setError("Error registering user. Please try again.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-end bg-[url('https://img.freepik.com/free-vector/new-message-concept-landing-page_23-2148310397.jpg?t=st=1741183252~exp=1741186852~hmac=4cefa1490273901103595de3595971b13b69a86623002f7e107812e48885065c&w=900')] bg-cover">
      <div className="h-full w-full backdrop-blur-sm flex items-center justify-end">
        <div className="bg-opacity-65 bg-slate-100 shadow-lg rounded-lg p-8 max-w-md w-full mr-10 font-serif">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Register
          </h2>
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="name"
              >
                Name
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-purple-500 text-center hover:bg-purple-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={loading}
              >
                {loading ? "Loading..." : "Sign Up"}
              </button>
            </div>
            <p className="text-center text-gray-600 text-[16px] mt-4">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-purple-500 hover:text-purple-700 font-bold"
              >
                Login
              </Link>
            </p>
          </form>
          {listening && (
            <p className="text-center text-gray-600">Listening...</p>
          )}
          {prompt && <p className="text-center text-gray-600">{prompt}</p>}
        </div>
      </div>
    </div>
  );
};

export default Register;
