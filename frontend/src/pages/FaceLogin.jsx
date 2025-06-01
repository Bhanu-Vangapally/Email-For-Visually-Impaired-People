import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const FaceLogin = () => {
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
      speak("Welcome to Face Login. Please say your name.");
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

    // First check if user wants to navigate to registration
    if (command.includes("register")) {
      speak("Navigating to registration page.");
      navigate("/faceRegister");
      return;
    }

    if (!name && command) {
      setName(command);
      speak(`You said your name is ${command}.`);
    } else if (command.includes("open camera") && !isWebcamOpen) {
      openWebcam();
    } else if (command.includes("capture") && isWebcamOpen) {
      capturePhoto();
    } else if (command.includes("login") && image) {
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
        handleSubmit({ preventDefault: () => {} });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWebcamOpen, name, image]);

  const openWebcam = () => {
    setIsWebcamOpen(true);
    speak("Camera opened. Press Space to capture photo.");
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
    setIsWebcamOpen(false);
    speak("Photo captured. Say 'login' to submit.");
  };

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

  const handleSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();

    if (!name || !image) {
      toast.warning("Please complete all steps");
      return;
    }

    setIsLoading(true);

    try {
      const file = base64ToFile(image, "photo.png");
      const formData = new FormData();
      formData.append("name", name);
      formData.append("face_image", file);

      const response = await axios.post(
        "http://127.0.0.1:8001/detect",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response?.data?.matched && response?.data?.name === name) {
        const { data } = await axios.post(
          "http://localhost:5000/users/loginwithName",
          { name }
        );
        localStorage.setItem("userId", data?.user?._id);
        toast.success("Login successful!");
        navigate("/home");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-8">Face Login</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            readOnly
            className="w-full px-4 py-2 bg-gray-700 rounded-lg"
            placeholder="Your name will be recorded automatically"
          />
        </div>

        {isWebcamOpen && (
          <div className="mb-6 flex flex-col items-center">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/png"
              className="rounded-lg mb-4"
              onUserMedia={() => toast.success("Camera ready!")}
              onUserMediaError={() => toast.error("Camera access denied")}
            />
            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Capture Photo (SPACE)
            </button>
          </div>
        )}

        {image && (
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-2">Captured Photo:</h2>
            <img
              src={image}
              alt="Captured"
              className="rounded-lg w-full h-auto"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Submit (SHIFT)
            </button>
          </div>
        )}

        <div className="mt-6 text-xl">
          Don't have an account?{" "}
          <Link to="/faceRegister" className="font-semibold text-blue-400">
            Register
          </Link>
        </div>
      </form>
    </div>
  );
};

export default FaceLogin;
