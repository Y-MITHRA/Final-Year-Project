import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import GeneralContextProvider from "./context/GeneralContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GrievancePortal from "./components/GrievancePortal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PetitionerRegistration from "./pages/PetitionerRegistration";
import OfficialRegistration from "./pages/OfficialRegistration";
import AdminRegistration from "./pages/AdminRegistration";
import AdminLogin from "./pages/AdminLogin";
import OfficialLogin from "./pages/OfficialLogin";
import PetitionerLogin from "./pages/PetitionerLogin";
import PetitionerDashboard from "./pages/PetitionerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import OfficialDashboard from "./pages/OfficialDashboard";
import WaterDashboard from "./official_dept/Water";
import RTODashboard from "./official_dept/Rto";
import ElectricityDashboard from "./official_dept/Electricity";
import SubmitGrievance from './pages/SubmitGrievance';

function App() {
  return (
    <Router>
      <AuthProvider>
        <GeneralContextProvider>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes */}
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
            <Route path="/submit-grievance" element={<SubmitGrievance />} />

            {/* Protected Routes */}
            <Route
              path="/petitioner-dashboard"
              element={
                <ProtectedRoute allowedRoles={["petitioner"]}>
                  <PetitionerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/official-dashboard"
              element={
                <ProtectedRoute allowedRoles={["official"]}>
                  <OfficialDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/official-dashboard/water"
              element={
                <ProtectedRoute allowedRoles={["official"]}>
                  <WaterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/official-dashboard/rto"
              element={
                <ProtectedRoute allowedRoles={["official"]}>
                  <RTODashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/official-dashboard/electricity"
              element={
                <ProtectedRoute allowedRoles={["official"]}>
                  <ElectricityDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </GeneralContextProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;


