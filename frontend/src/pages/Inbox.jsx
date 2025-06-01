import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const Inbox = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const emailsPerPage = 10;
  const recognitionRef = useRef(null);
  const searchRecognitionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/user", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      axios
        .get("http://localhost:5000/emails/inbox", { withCredentials: true })
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

  useEffect(() => {
    if (emails.length > 0) {
      announceUnreadEmails();
    }
  }, [emails, currentPage]);

  // Initialize voice commands on component mount
  useEffect(() => {
    initializeVoiceCommands();
    return () => {
      stopListening();
      stopSearchListening();
      window.speechSynthesis.cancel();
    };
  }, []);

  const initializeVoiceCommands = () => {
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
      console.log("Voice command:", transcript);

      if (transcript.includes("inbox")) {
        navigate("/inbox");
      } else if (transcript.includes("trash")) {
        navigate("/trash");
      } else if (transcript.includes("draft")) {
        navigate("/drafts");
      } else if (transcript.includes("sent")) {
        navigate("/sent");
      } else if (transcript.includes("compose")) {
        navigate("/compose");
      } else if (transcript.includes("search")) {
        startSearchListening();
      } else if (transcript.includes("stop")) {
        stopSearchListening();
      } else if (transcript.includes("logout")) {
        handleLogout();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "aborted") {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 500);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const announceUnreadEmails = () => {
    const unreadEmails = emails.filter((email) => !email.read);
    const currentPageUnreadEmails = unreadEmails.slice(
      (currentPage - 1) * emailsPerPage,
      currentPage * emailsPerPage
    );

    if (currentPageUnreadEmails.length > 0 && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance();
      speech.text = `Page ${currentPage}: You have ${
        currentPageUnreadEmails.length
      } unread emails. ${currentPageUnreadEmails
        .map((email, index) => `Email ${index + 1} from ${email.from}`)
        .join(", ")}`;
      speech.lang = "en-US";
      speech.rate = 1;
      speech.volume = 1;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    }
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const handleLogout = () => {
    axios
      .get("http://localhost:5000/logout", { withCredentials: true })
      .then(() => setUser(null));
    navigate("/");
  };

  const handleEmailClick = (email) => {
    if (!email.read) {
      axios
        .patch(
          `http://localhost:5000/emails/${email.id}/read`,
          {},
          { withCredentials: true }
        )
        .then(() => {
          setEmails(
            emails.map((e) => (e.id === email.id ? { ...e, read: true } : e))
          );
        });
    }
    setSelectedEmail(email);
    speakEmail(email);
  };

  const speakEmail = (email) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech synthesis.");
      return;
    }

    window.speechSynthesis.cancel();

    try {
      const metaText = `Email from ${email.from}. Subject: ${email.subject}`;
      const metaSpeech = new SpeechSynthesisUtterance(metaText);
      metaSpeech.lang = "en-US";

      const bodyText = `Message: ${email.body.substring(0, 500)}${
        email.body.length > 500 ? "..." : ""
      }`;
      const bodySpeech = new SpeechSynthesisUtterance(bodyText);
      bodySpeech.lang = "en-US";

      metaSpeech.rate = 1.1;
      bodySpeech.rate = 1.0;

      window.speechSynthesis.speak(metaSpeech);
      window.speechSynthesis.speak(bodySpeech);
    } catch (error) {
      console.error("Error speaking email:", error);
      alert("There was an error reading the email.");
    }
  };

  const handleBack = () => {
    setSelectedEmail(null);
  };

  const startListening = () => {
    if (recognitionRef.current) return;
    initializeVoiceCommands();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onerror = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === " " && !isListening) {
        e.preventDefault();
        startSearchListening();
      } else if (e.key === " " && isListening) {
        e.preventDefault();
        stopSearchListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isListening]);

 

  const startSearchListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    // Stop any existing recognition
    stopSearchListening();

    // Request microphone permission first
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          const prompt = new SpeechSynthesisUtterance(
            "Listening for search terms. Say your search query."
          );
          window.speechSynthesis.speak(prompt);
        };

        recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          // Update search query with the most accurate transcript
          setSearchQuery(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);

          if (event.error === "not-allowed") {
            alert("Microphone access denied. Please allow microphone access.");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        searchRecognitionRef.current = recognition;
      })
      .catch((err) => {
        console.error("Microphone access denied:", err);
        alert("Microphone access is required for voice search.");
      });
  };

  const stopSearchListening = () => {
    if (searchRecognitionRef.current) {
      searchRecognitionRef.current.stop();
      searchRecognitionRef.current = null;
    }
    setIsListening(false);
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadEmails = filteredEmails.filter((email) => !email.read);
  const readEmails = filteredEmails.filter((email) => email.read);

  const indexOfLastUnread = currentPage * emailsPerPage;
  const indexOfFirstUnread = indexOfLastUnread - emailsPerPage;
  const currentUnreadEmails = unreadEmails.slice(
    indexOfFirstUnread,
    indexOfLastUnread
  );

  const totalUnreadPages = Math.ceil(unreadEmails.length / emailsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const SearchInput = () => (
    <div className="relative flex-grow w-[500px]">
      <input
        type="text"
        placeholder={isListening ? "Listening..." : "Search mail"}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-16 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
        onClick={isListening ? stopSearchListening : startSearchListening}
        onMouseDown={(e) => e.preventDefault()}
        className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
          isListening ? "text-red-500" : "text-gray-400"
        }`}
        aria-label={isListening ? "Stop listening" : "Start voice search"}
      >
        {isListening ? (
          <svg
            className="w-5 h-5 animate-pulse"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      {isListening && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white shadow-lg rounded-lg p-2 z-10">
          <p className="text-sm text-gray-600">
            Listening... Say "search" or press space to stop
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">INBOX</h1>
            <div className="flex items-center space-x-4">
              {user ? <SearchInput /> : null}

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

          {!selectedEmail ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="bg-blue-100 p-3 border-b">
                    <h2 className="font-bold text-blue-800">
                      Unread ({unreadEmails.length})
                    </h2>
                  </div>
                  {currentUnreadEmails.length > 0 ? (
                    currentUnreadEmails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => handleEmailClick(email)}
                        className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-all bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-800">
                            {email.from}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(email.date).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-gray-700 mt-1 font-bold">
                          {email.subject}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {email.body}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No unread emails
                    </div>
                  )}
                </div>

                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 border-b">
                    <h2 className="font-bold text-gray-800">
                      Read ({readEmails.length})
                    </h2>
                  </div>
                  {readEmails.length > 0 ? (
                    readEmails.map((email) => (
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
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No read emails
                    </div>
                  )}
                </div>
              </div>

              {unreadEmails.length > 0 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalUnreadPages }, (_, index) => (
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
                    disabled={currentPage === totalUnreadPages}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <button
                onClick={handleBack}
                className="mb-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Back to Inbox
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedEmail.subject}
              </h2>
              <p className="text-gray-600 mt-2">From: {selectedEmail.from}</p>
              <p className="text-gray-600 mt-1">
                Date: {new Date(selectedEmail.date).toLocaleString()}
              </p>
              <div className="mt-6 text-gray-700 w-[300px]">
                {selectedEmail.body}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
