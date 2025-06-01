import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  // Function to speak a given text
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Handle email input
  useEffect(() => {
    if (email) {
      speak(`Your email is ${email}`);
    }
  }, [email]);

  // Handle password input
  useEffect(() => {
    if (password) {
      speak(`Your password is ${password}`);
    }
  }, [password]);

  // Speech recognition setup
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

      if (command === "email") {
        setPrompt("Please say your email.");
        speak("Please say your email."); // Speak the prompt
      } else if (command === "password") {
        setPrompt("Please say your password.");
        speak("Please say your password."); // Speak the prompt
      } else if (command === "login") {
        handleSubmit({ preventDefault: () => {} });
      } else if (prompt.includes("email")) {
        // Remove spaces from the transcribed email
        const cleanedEmail = command.replace(/\s+/g, "");
        setEmail(cleanedEmail);
        setPrompt("");
      } else if (prompt.includes("password")) {
        setPassword(command);
        setPrompt("");
      } else if (command === "face") {
        navigate("/faceLogin");
      } else if (command === "voice") {
        navigate("/voiceLogin");
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [prompt]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/users/login", {
        email,
        password,
      });

      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/home");
    } catch (error) {
      speak(error.response?.data?.message);
      setErrorMessage(error.response?.data?.message || "Login failed");
    }
  };

  // Navigate to face login
  const handleFaceLogin = () => {
    navigate("/faceLogin");
  };

  // Navigate to voice login
  const handleVoiceLogin = () => {
    navigate("/voiceLogin");
  };

  return (
    <div className="h-screen flex items-center justify-end bg-[url('https://img.freepik.com/free-vector/new-message-concept-landing-page_23-2148310397.jpg?t=st=1741183252~exp=1741186852~hmac=4cefa1490273901103595de3595971b13b69a86623002f7e107812e48885065c&w=900')] bg-cover">
      <div className="h-full w-full backdrop-blur-sm flex items-center justify-end ">
        <div className="bg-opacity-65 bg-slate-100 shadow-lg rounded-lg p-8 max-w-md w-full mr-10 font-serif">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
            LOGIN
          </h2>
          <form onSubmit={handleSubmit}>
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

            {errorMessage && (
              <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-purple-500 text-center hover:bg-purple-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              >
                Sign In
              </button>
            </div>

            {/* Additional Login Options */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleFaceLogin}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-2"
              >
                Login via Face
              </button>
              <button
                type="button"
                onClick={handleVoiceLogin}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              >
                Login via Voice
              </button>
            </div>

            <p className="text-center text-gray-600 text-[16px] mt-4">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-purple-500 hover:text-purple-700 font-bold"
              >
                Register
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

export default Login;
