import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ReceiverPage from "./pages/Reciever";
import SenderPage from "./pages/Sender";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/receiver" element={<ReceiverPage />} />
        <Route path="/sender" element={<SenderPage />} />
      </Routes>
    </Router>
  );
};

export default App;
