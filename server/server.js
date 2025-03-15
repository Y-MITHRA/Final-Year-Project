import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createServer } from 'http';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import connectDB from './config/db.js';
import registrationRoutes from './routes/registrationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import petitionerRoutes from './routes/petitioner.js';
import adminRoutes from './routes/admin.js';
import petitionRoutes from './routes/petitions.js';
import chatRoutes from './routes/chat.js';
import fs from 'fs';
import grievanceRoutes from './routes/grievanceRoutes.js';
import { createSocketServer } from './socket.js';
import { initializeWebSocket } from './controllers/grievanceController.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG and PDF files are allowed.'));
        }
    }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grievance-portal')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);

    // Join room for user's department if they're an official
    if (socket.user.department) {
        socket.join(socket.user.department);
    }

    // Join personal room for direct messages
    socket.join(socket.user.id);

    // Handle joining specific grievance chat rooms
    socket.on('join_grievance_chat', (grievanceId) => {
        socket.join(grievanceId);
    });

    // Handle leaving grievance chat rooms
    socket.on('leave_grievance_chat', (grievanceId) => {
        socket.leave(grievanceId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.id);
    });
});

// Routes
app.use('/api', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/petitioner', petitionerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/petitions', petitionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/grievances', grievanceRoutes);

// Root route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Grievance Portal API is running' });
});

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File size is too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({ message: err.message });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }
    next(err);
});

// General error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Server Listening
httpServer.listen(process.env.PORT || 5000, () => {
    console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`🌐 WebSocket server initialized`);
    console.log(`🔗 API endpoint: http://localhost:${process.env.PORT || 5000}`);
});
