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
import AdminLogin from './pages/AdminLogin'; 
import OfficialLogin from './pages/OfficialLogin'; 
import PetitionerLogin from "./pages/PetitionerLogin";


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
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/official" element={<OfficialLogin />} />
        <Route path="/login/petitioner" element={<PetitionerLogin />} />


      </Routes>
    </Router>
  );
}

export default App;
