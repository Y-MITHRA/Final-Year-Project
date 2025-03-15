import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

export const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        console.log('Auth header:', authHeader);

        if (!authHeader) {
            console.log('No Authorization header found');
            return res.status(401).json({ message: 'No Authorization header found' });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Token extracted:', token ? 'Present' : 'Missing');

        if (!token) {
            console.log('No token found after Bearer prefix');
            return res.status(401).json({ message: 'No authentication token found after Bearer prefix' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully:', { userId: decoded.id, role: decoded.role });

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token format' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }

        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};

// This is the same as auth, just with a different name for backward compatibility
export const authenticateToken = auth;

// Middleware to check if user is an official
export const isOfficial = async (req, res, next) => {
    try {
        if (req.user.role !== 'official') {
            return res.status(403).json({ message: 'Access denied. Officials only.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Middleware to check if user is a petitioner
export const isPetitioner = async (req, res, next) => {
    try {
        if (req.user.role !== 'petitioner') {
            return res.status(403).json({ message: 'Access denied. Petitioners only.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Middleware to check if user is an admin
export const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        console.log('Checking role:', req.user.role, 'against allowed roles:', roles);
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

export { checkRole }; 