import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Add token management
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Function to decode JWT token
const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Create axios instance
const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle unauthorized responses
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const { email, password, role } = credentials;

            // Make login request based on role
            const endpoint = `/auth/login${role.charAt(0).toUpperCase() + role.slice(1)}`;
            const response = await axiosInstance.post(endpoint, {
                email: email.trim(),
                password
            });

            if (response.data && response.data.token) {
                const { token, user: userData } = response.data;

                // Store auth data
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                setUser(userData);

                // Return success with redirect based on role
                const redirectMap = {
                    petitioner: '/petitioner/dashboard',
                    official: '/official/dashboard',
                    admin: '/admin/dashboard'
                };

                return {
                    success: true,
                    redirectTo: redirectMap[userData.role] || '/login'
                };
            }

            throw new Error('Invalid response from server');
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const register = async (userData, role) => {
        try {
            const endpoint = `/auth/register${role.charAt(0).toUpperCase() + role.slice(1)}`;
            const response = await axiosInstance.post(endpoint, userData);

            if (response.data && response.data.token) {
                const { token, user: newUser } = response.data;

                // Store auth data
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(newUser));
                setUser(newUser);

                return {
                    success: true,
                    redirectTo: `/${role}/dashboard`
                };
            }

            throw new Error('Invalid response from server');
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export the axios instance for use in other components
export const api = axiosInstance;

export default AuthContext;