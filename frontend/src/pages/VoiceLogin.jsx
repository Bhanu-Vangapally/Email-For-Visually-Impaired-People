import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link, useNavigate } from "react-router-dom";

const VoiceLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const isNameSetRef = useRef(false);

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
      speak("Welcome to Voice Login. Please say your name.");
    } else {
      toast.warning("Speech recognition is not supported in your browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopRecording();
    };
  }, []);

  const handleVoiceCommand = (command) => {
    console.log("Command:", command);

    if (command.includes("login")) {
      speak("Navigating to login page.");
      navigate("/voiceLogin");
      return;
    }

    if (!isNameSetRef.current && command && !isRecording) {
      setName(command);
      isNameSetRef.current = true;
      speak(
        `You said your name is ${command}. Press Enter to start recording.`
      );
    } else if (
      command.includes("record") &&
      isNameSetRef.current &&
      !isRecording
    ) {
      startRecording();
    } else if (command.includes("register") && audioBlob) {
      const fakeEvent = { preventDefault: () => {} };
      handleSubmit(fakeEvent);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !isRecording && isNameSetRef.current) {
        e.preventDefault();
        startRecording();
      } else if (e.key === "Shift" && audioBlob) {
        e.preventDefault();
        handleSubmit({ preventDefault: () => {} });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, audioBlob]);

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, "RIFF");
    // file length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, "WAVE");
    // format chunk identifier
    writeString(view, 12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, "data");
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // write the PCM samples
    floatTo16BitPCM(view, 44, samples);

    return view;
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const startRecording = async () => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          // Convert the audio to WAV format
          const audioBuffer = await audioBlob.arrayBuffer();
          const audioData = await audioContextRef.current.decodeAudioData(
            audioBuffer
          );

          // Get the first channel (mono)
          const samples = audioData.getChannelData(0);
          const wavView = encodeWAV(samples, audioData.sampleRate);
          const wavBlob = new Blob([wavView], { type: "audio/wav" });

          setAudioBlob(wavBlob);
          speak("Voice recorded. Say 'register' or press Shift to submit.");
        } catch (error) {
          console.error("Error processing audio:", error);
          speak("Error processing audio. Please try again.");
          toast.error("Error processing audio. Please try again.");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      speak("Recording started. Please speak now.");
      setTimeout(() => stopRecording(), 5000); // Stops after 5 seconds
    } catch (error) {
      console.error("Error accessing microphone:", error);
      speak("Microphone access denied. Please allow access.");
      toast.error("Microphone access denied. Please allow access.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();

    if (!name || !audioBlob) {
      toast.warning("Please complete all steps");
      speak("Please complete all steps first.");
      return;
    }

    setIsLoading(true);
    speak("Processing your login. Please wait.");

    try {
      // First check if user exists
      const userCheckResponse = await axios.post(
        `http://localhost:5000/users/loginwithName`,
        { name },
      
      );

      

      // If user exists, proceed with voice verification
      const formData = new FormData();
      formData.append("audio_file", audioBlob, `${name}-voice.wav`);

      const voiceVerifyResponse = await axios.post(
        `http://127.0.0.1:8000/verify_speaker`,
        formData,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (voiceVerifyResponse.data.identified_speaker_id == name) {
        toast.success("Login successful!");
        speak("Login successful!");
        navigate("/home");
      } else {
        toast.error("Voice verification failed. Please try again.");
        speak("Voice verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      if (error.response && error.response.status === 404) {
        toast.error("User not found. Please register first.");
        speak("You don't have an account. Please create an account first.");
        navigate("/voiceRegister");
      } else {
        toast.error("An error occurred. Please try again.");
        speak("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-8">Voice Login</h1>

      <div className="mb-4 text-sm text-gray-400">
        <p>Press ENTER to start recording</p>
        <p>Press SHIFT to submit</p>
        <p>Say "login" anytime to go to login page</p>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6">
          <label htmlFor="name" className="block text-lg font-medium mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name will be recorded automatically"
            readOnly
          />
        </div>

        {isRecording && (
          <div className="mb-4 p-3 bg-red-600 rounded-lg text-center">
            Recording... (5 seconds)
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || !audioBlob}
          className={`w-full px-8 py-3 ${
            isLoading || !audioBlob
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } text-white rounded-lg transition-colors duration-300 mb-6`}
        >
          {isLoading ? "Processing..." : "Submit (SHIFT)"}
        </button>

        <div className="mt-6 text-xl">
          Don't have an account?{" "}
          <Link to="/voiceRegister" className="font-semibold text-blue-400">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VoiceLogin;
