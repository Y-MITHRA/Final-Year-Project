import express from 'express';
import { auth, checkRole } from '../middleware/auth.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// Create a new chat for a grievance
router.post('/create', auth, async (req, res) => {
    try {
        const { grievanceId, petitionerId, officialId } = req.body;

        // Check if chat already exists
        const existingChat = await Chat.findOne({
            grievanceId,
            petitioner: petitionerId,
            official: officialId
        });

        if (existingChat) {
            return res.json(existingChat);
        }

        const newChat = new Chat({
            grievanceId,
            petitioner: petitionerId,
            official: officialId,
            messages: []
        });

        await newChat.save();
        res.status(201).json(newChat);
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Get chat by ID
router.get('/:chatId', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('petitioner', 'firstName lastName email')
            .populate('official', 'name email department');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Verify user has access to this chat
        if (chat.petitioner._id.toString() !== req.user.id &&
            chat.official._id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// Get all chats for a user
router.get('/', auth, async (req, res) => {
    try {
        const query = req.user.role === 'petitioner'
            ? { petitioner: req.user.id }
            : { official: req.user.id };

        const chats = await Chat.find(query)
            .populate('petitioner', 'firstName lastName email')
            .populate('official', 'name email department')
            .populate('grievanceId', 'subject status')
            .sort({ lastMessage: -1 });

        res.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Mark messages as read
router.put('/:chatId/read', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Mark unread messages as read
        chat.messages.forEach(message => {
            if (message.sender.toString() !== req.user.id) {
                message.read = true;
            }
        });

        await chat.save();
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
    try {
        const chats = await Chat.find(
            req.user.role === 'petitioner'
                ? { petitioner: req.user.id }
                : { official: req.user.id }
        );

        let unreadCount = 0;
        chats.forEach(chat => {
            unreadCount += chat.messages.filter(
                msg => !msg.read && msg.sender.toString() !== req.user.id
            ).length;
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

export default router; 