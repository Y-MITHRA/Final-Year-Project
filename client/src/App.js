import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GrievancePortal from "./components/GrievancePortal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PetitionerRegistration from "./pages/PetitionerRegistration";
import OfficialRegistration from "./pages/OfficialRegistration";
import AdminRegistration from "./pages/AdminRegistration";
// import 'bootstrap/dist/css/bootstrap.min.css';
function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<GrievancePortal />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/petitioner" element={<PetitionerRegistration />} />
        <Route path="/register/official" element={<OfficialRegistration />} />
        <Route path="/register/admin" element={<AdminRegistration />} />
      </Routes>
    </Router>
  );
}

export default App;
