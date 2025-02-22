import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
    const userType = localStorage.getItem("userType"); // Get user role from localStorage

    return allowedRoles.includes(userType) ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
