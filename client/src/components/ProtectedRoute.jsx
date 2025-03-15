import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    // Show loading state or return null while checking authentication
    if (loading) {
        return null; // Or return a loading spinner component
    }

    if (!isAuthenticated()) {
        // Redirect to login page but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user is not set, redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If allowedRoles is empty, allow all authenticated users
    if (allowedRoles.length === 0) {
        return children;
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const dashboardMap = {
            petitioner: '/petitioner-dashboard',
            official: '/official-dashboard',
            admin: '/admin-dashboard'
        };
        return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;
