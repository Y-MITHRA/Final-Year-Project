import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Chat from '../models/Chat.js';
import Petition from '../models/Petition.js';

const router = express.Router();

// Initialize chat for a grievance
router.post('/initialize/:grievanceId', authenticateToken, async (req, res) => {
    try {
        const { grievanceId } = req.params;

        // Check if chat already exists
        const existingChat = await Chat.findOne({ grievanceId });
        if (existingChat) {
            return res.json(existingChat);
        }

        // Get grievance details
        const grievance = await Petition.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Verify that the user is either the petitioner or the assigned official
        if (grievance.petitioner.toString() !== req.user.id &&
            grievance.assignedOfficer?.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to access this chat' });
        }

        // Create new chat
        const newChat = new Chat({
            grievanceId,
            petitioner: grievance.petitioner,
            official: grievance.assignedOfficer,
            messages: []
        });

        await newChat.save();
        res.status(201).json(newChat);
    } catch (error) {
        console.error('Error initializing chat:', error);
        res.status(500).json({ message: 'Error initializing chat' });
    }
});

// Get chat messages
router.get('/:grievanceId/messages', authenticateToken, async (req, res) => {
    try {
        const { grievanceId } = req.params;

        // Get grievance details
        const grievance = await Petition.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Verify that the user is either the petitioner or the assigned official
        if (grievance.petitioner.toString() !== req.user.id &&
            grievance.assignedOfficer?.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to access this chat' });
        }

        // Get chat
        const chat = await Chat.findOne({ grievanceId })
            .populate('messages.sender', 'firstName lastName');

        if (!chat) {
            return res.json({ messages: [] });
        }

        // Mark messages as read
        if (chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                if (msg.sender.toString() !== req.user.id) {
                    msg.read = true;
                }
            });
            await chat.save();
        }

        res.json(chat.messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Send a message
router.post('/:grievanceId/send', authenticateToken, async (req, res) => {
    try {
        const { grievanceId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        // Get grievance details
        const grievance = await Petition.findById(grievanceId);
        if (!grievance) {
            return res.status(404).json({ message: 'Grievance not found' });
        }

        // Verify that the user is either the petitioner or the assigned official
        if (grievance.petitioner.toString() !== req.user.id &&
            grievance.assignedOfficer?.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
        }

        // Get or create chat
        let chat = await Chat.findOne({ grievanceId });
        if (!chat) {
            chat = new Chat({
                grievanceId,
                petitioner: grievance.petitioner,
                official: grievance.assignedOfficer,
                messages: []
            });
        }

        // Add message
        const newMessage = {
            sender: req.user.id,
            senderModel: req.user.role === 'petitioner' ? 'Petitioner' : 'Official',
            content,
            timestamp: new Date(),
            read: false
        };

        chat.messages.push(newMessage);
        await chat.save();

        // Emit the message through WebSocket
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(grievanceId).emit('new_message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Get unread message count
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { petitioner: req.user.id },
                { official: req.user.id }
            ]
        });

        let unreadCount = 0;
        chats.forEach(chat => {
            unreadCount += chat.messages.filter(msg =>
                msg.sender.toString() !== req.user.id && !msg.read
            ).length;
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ message: 'Error getting unread count' });
    }
});

export default router; 