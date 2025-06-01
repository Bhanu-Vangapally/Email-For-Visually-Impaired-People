import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Inbox from "./pages/Inbox";
import Trash from "./pages/Trash";
import Sent from "./pages/Sent";
import Drafts from "./pages/Drafts";
import Compose from "./pages/Compose";
import VoiceLogin from "./pages/VoiceLogin";
import VoiceRegister from "./pages/VoiceRegister";
import FaceLogin from "./pages/FaceLogin";
import FaceRegister from "./pages/FaceRegister";

const App = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/voiceLogin" element={<VoiceLogin />} />
          <Route path="/voiceRegister" element={<VoiceRegister />} />
          <Route path="/faceRegister" element={<FaceRegister />} />
          <Route path="/faceLogin" element={<FaceLogin />} />
          <Route path="/home" element={<Inbox />} />
          <Route path="/register" element={<Register />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/sent" element={<Sent />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/compose" element={<Compose />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
