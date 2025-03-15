import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Chat from '../models/Chat.js';
import * as dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

class WebSocketService {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization"]
            },
            path: '/socket.io/',
            serveClient: false,
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            connectTimeout: 45000
        });

        this.userSockets = new Map(); // userId -> socket
        this.initialize();
    }

    initialize() {
        this.io.use(async (socket, next) => {
            try {
                let token = socket.handshake.auth?.token;
                console.log('Raw auth token:', token ? token.substring(0, 50) + '...' : 'No token');

                if (!token) {
                    console.error('No token provided in socket connection');
                    return next(new Error('Authentication required'));
                }

                // Remove Bearer prefix if present
                if (token.startsWith('Bearer ')) {
                    token = token.slice(7);
                }

                try {
                    console.log('JWT Secret:', JWT_SECRET ? 'Present' : 'Missing');
                    console.log('Attempting to verify token...');

                    const decoded = jwt.verify(token, JWT_SECRET);
                    console.log('Token verified successfully:', {
                        id: decoded.id,
                        role: decoded.role,
                        department: decoded.department
                    });

                    if (!decoded || !decoded.id) {
                        console.error('Invalid token payload:', decoded);
                        return next(new Error('Invalid authentication token'));
                    }

                    // Set user info on socket
                    socket.userId = decoded.id;
                    socket.userRole = decoded.role;
                    socket.department = decoded.department;

                    console.log(`Socket authenticated - User: ${socket.userId}, Role: ${socket.userRole}, Department: ${socket.department}`);

                    // Join role-specific room
                    socket.join(`${socket.userRole}_${socket.userId}`);

                    // Join department room if applicable
                    if (socket.department) {
                        socket.join(`department_${socket.department}`);
                        console.log(`Joined department room: department_${socket.department}`);
                    }

                    next();
                } catch (jwtError) {
                    console.error('JWT verification failed:', {
                        error: jwtError.message,
                        name: jwtError.name,
                        stack: jwtError.stack
                    });
                    return next(new Error('Invalid token'));
                }
            } catch (error) {
                console.error('Socket authentication error:', {
                    message: error.message,
                    stack: error.stack
                });
                return next(new Error('Authentication failed'));
            }
        });

        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.userId);
            this.userSockets.set(socket.userId, socket);

            // Handle joining chat rooms
            socket.on('join_chat', async (chatId) => {
                socket.join(`chat_${chatId}`);
                console.log(`User ${socket.userId} joined chat ${chatId}`);
            });

            // Handle new messages
            socket.on('send_message', async (data) => {
                try {
                    const { chatId, content } = data;
                    const chat = await Chat.findById(chatId);

                    if (!chat) {
                        throw new Error('Chat not found');
                    }

                    // Add message to chat
                    const newMessage = {
                        sender: socket.userId,
                        senderModel: socket.userRole === 'petitioner' ? 'Petitioner' : 'Official',
                        content,
                        timestamp: new Date()
                    };

                    chat.messages.push(newMessage);
                    await chat.save();

                    // Emit message to all users in the chat room
                    this.io.to(`chat_${chatId}`).emit('new_message', {
                        chatId,
                        message: newMessage
                    });

                    // Send notification to other participant
                    const recipientId = socket.userRole === 'petitioner' ? chat.official : chat.petitioner;
                    this.io.to(`${socket.userRole === 'petitioner' ? 'official' : 'petitioner'}_${recipientId}`).emit('notification', {
                        type: 'new_message',
                        chatId,
                        message: 'You have a new message'
                    });
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.userId);
                this.userSockets.delete(socket.userId);
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
                socket.emit('error', { message: 'An error occurred' });
            });
        });
    }

    // Method to send notifications to admin
    notifyAdmin(adminId, data) {
        this.io.to(`admin_${adminId}`).emit('admin_notification', data);
    }

    // Method to broadcast department stats
    broadcastStats(department, stats) {
        this.io.to(`department_${department}`).emit('department_stats', stats);
    }

    // Method to notify about new grievances
    notifyNewGrievance(department, grievanceData) {
        this.io.to(`department_${department}`).emit('new_grievance_assigned', grievanceData);
    }

    // Method to notify about status updates
    notifyStatusUpdate(userId, role, data) {
        this.io.to(`${role}_${userId}`).emit('grievance_status_updated', data);
    }
}

export default WebSocketService; 