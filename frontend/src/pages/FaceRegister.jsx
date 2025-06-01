import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FaceRegister = () => {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const webcamRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Initialize speech recognition
  useEffect(() => {
    const speak = (text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    };

    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript
          .toLowerCase()
          .trim();
        handleVoiceCommand(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
      };

      recognitionRef.current = recognition;
      recognitionRef.current.start();
      speak("Welcome to Face Registration. Please say your name.");
    } else {
      toast.warning("Speech recognition is not supported in your browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle voice commands
  const handleVoiceCommand = (command) => {
    console.log("Command:", command);

    // First check if user wants to navigate to login
    if (command.includes("login")) {
      speak("Navigating to login page.");
      navigate("/faceLogin");
      return;
    }

    if (!name && command) {
      setName(command);
      speak(`You said your name is ${command}. Say "open camera" to continue.`);
    } else if (command.includes("open camera") && !isWebcamOpen) {
      openWebcam();
    } else if (command.includes("capture") && isWebcamOpen) {
      capturePhoto();
    } else if (command.includes("register") && image) {
      const fakeEvent = { preventDefault: () => {} };
      handleSubmit(fakeEvent);
    }
  };

  // Text to speech function
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !isWebcamOpen && name) {
        e.preventDefault();
        openWebcam();
      } else if (e.key === " " && isWebcamOpen) {
        e.preventDefault();
        capturePhoto();
      } else if (e.key === "Shift" && image) {
        e.preventDefault();
        const fakeEvent = { preventDefault: () => {} };
        handleSubmit(fakeEvent);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWebcamOpen, name, image]);

  // Open webcam
  const openWebcam = () => {
    setIsWebcamOpen(true);
    speak("Camera opened. Press Space to capture photo.");
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
    setIsWebcamOpen(false);
    speak("Photo captured. Say 'register' to complete registration.");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();

    if (!name || !image) {
      toast.warning("Please enter your name and capture a photo.");
      speak("Please complete all steps first.");
      return;
    }

    setIsLoading(true);
    speak("Registering your face. Please wait.");

    // Convert base64 image to a file
    const file = base64ToFile(image, "photo.png");

    // Prepare FormData
    const formData = new FormData();
    formData.append("name", name);
    formData.append("face_image", file);

    try {
      // Send data to the ML endpoint
      const response = await fetch("http://127.0.0.1:8001/register", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Registration successful!");
        speak("Registration successful! You can now login.");
        navigate("/faceLogin");
      } else {
        toast.error("Registration failed. Please try again.");
        speak("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
      speak("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert base64 to file
  const base64ToFile = (base64, filename) => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-8">Face Registration</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        {/* Name Input */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Say your name or type it"
          />
        </div>

        {/* Webcam and Capture Button */}
        <div className="mb-6">
          {isWebcamOpen ? (
            <div className="flex flex-col items-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/png"
                className="rounded-lg mb-4"
              />
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Capture Photo (SPACE)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openWebcam}
              disabled={!name}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Open Camera (ENTER)
            </button>
          )}
        </div>

        {/* Display Captured Photo */}
        {image && (
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-2">Captured Photo:</h2>
            <img
              src={image}
              alt="Captured"
              className="rounded-lg w-full h-auto"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !image}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? "Registering..." : "Register (SHIFT)"}
        </button>

        <div className="mt-6 text-xl">
          Already have an account?{" "}
          <Link to="/faceLogin" className="font-semibold text-blue-400">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default FaceRegister;
