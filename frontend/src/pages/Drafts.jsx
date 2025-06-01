import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const Drafts = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isListening, setIsListening] = useState(false); // Track listening state
  const emailsPerPage = 10;
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user authentication status
  useEffect(() => {
    axios
      .get("http://localhost:5000/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  // Fetch emails only when user is authenticated
  useEffect(() => {
    if (user) {
      setLoading(true);
      axios
        .get("http://localhost:5000/emails/drafts", { withCredentials: true })
        .then((response) => {
          setEmails(response.data);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load emails");
          setLoading(false);
        });
    }
  }, [user]);

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

  // Handle click on email and trigger speech
  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    speakEmail(email);
  };

  // Function to speak out the email details
  const speakEmail = (email) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech synthesis.");
      return;
    }

    window.speechSynthesis.cancel();

    try {
      // Speak metadata
      const metaText = `Email from ${email.from}. Subject: ${email.subject}`;
      const metaSpeech = new SpeechSynthesisUtterance(metaText);
      metaSpeech.lang = "en-US";

      // Speak body (limit to 500 characters to avoid very long messages)
      const bodyText = `Message: ${email.body.substring(0, 500)}${
        email.body.length > 500 ? "..." : ""
      }`;
      const bodySpeech = new SpeechSynthesisUtterance(bodyText);
      bodySpeech.lang = "en-US";

      // Adjust rates for better listening
      metaSpeech.rate = 1.1;
      bodySpeech.rate = 1.0;

      // Queue them
      window.speechSynthesis.speak(metaSpeech);
      window.speechSynthesis.speak(bodySpeech);
    } catch (error) {
      console.error("Error speaking email:", error);
      alert("There was an error reading the email.");
    }
  };

  // Handle back to inbox
  const handleBack = () => {
    setSelectedEmail(null);
  };

  // Initialize speech recognition for navigation
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      console.log("You said:", transcript);

      // Navigate based on spoken command
      if (transcript.includes("inbox")) {
        navigate("/inbox");
      } else if (transcript.includes("trash")) {
        navigate("/trash");
      } else if (transcript.includes("drafts")) {
        navigate("/drafts");
      } else if (transcript.includes("sent")) {
        navigate("/sent");
      } else if (transcript.includes("compose")) {
        navigate("/compose");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Voice search function
  const startVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    setIsListening(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Stop speech recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // Filter emails based on search query
  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = filteredEmails.slice(
    indexOfFirstEmail,
    indexOfLastEmail
  );

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Total number of pages
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);

  return (
    <div
      className="flex h-screen bg-gray-100"
      onMouseEnter={startListening}
      onMouseLeave={stopListening}
    >
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">DRAFTS</h1>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative flex-grow w-[500px]">
                  <input
                    type="text"
                    placeholder="Search mail"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-12 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                  <button
                    onClick={startVoiceSearch}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    title="Voice search"
                  >
                    <svg
                      className={`w-5 h-5 ${
                        isListening
                          ? "text-red-500 animate-pulse"
                          : "text-gray-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </button>
                </div>
              ) : null}

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
          </div>

          {/* Loading and Error States */}
          {loading && (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-600">Loading emails...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Voice search status */}
          {isListening && (
            <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded-lg flex items-center">
              <svg
                className="w-5 h-5 mr-2 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Listening... Speak now to search
            </div>
          )}

          {/* Email List or Selected Email */}
          {!selectedEmail ? (
            <>
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {currentEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">
                        {email.from}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(email.date).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-gray-700 mt-1">{email.subject}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {email.body}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center mt-6 space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => paginate(index + 1)}
                    className={`px-4 py-2 ${
                      currentPage === index + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    } rounded-lg hover:bg-blue-500 hover:text-white transition-all`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <button
                onClick={handleBack}
                className="mb-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Back to Drafts
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedEmail.subject}
              </h2>
              <p className="text-gray-600 mt-2">From: {selectedEmail.from}</p>
              <p className="text-gray-600 mt-1">
                Date: {new Date(selectedEmail.date).toLocaleString()}
              </p>
              <div className="mt-6 text-gray-700">{selectedEmail.body}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drafts;
