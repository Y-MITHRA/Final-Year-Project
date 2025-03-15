import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth, checkRole } from '../middleware/auth.js';
import Petition from '../models/Petition.js';
import AssignmentService from '../services/AssignmentService.js';
import Chat from '../models/Chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Submit new petition with automated assignment
router.post('/submit', auth, checkRole(['petitioner']), async (req, res) => {
    try {
        console.log('Received petition submission request');
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { department, subject, description } = req.body;

        if (!department || !subject || !description) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newPetition = new Petition({
            petitioner: req.user.id,
            department,
            subject,
            description,
            file: req.file ? `/uploads/${req.file.filename}` : null,
            status: 'Pending',
            dateFiled: new Date(),
            expectedResolution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        console.log('Creating new petition:', newPetition);
        await newPetition.save();

        // Attempt to assign the petition to an official
        try {
            const assignment = await AssignmentService.assignGrievance(newPetition._id);

            // Create a chat for the assigned official and petitioner
            const chat = new Chat({
                grievanceId: newPetition._id,
                petitioner: req.user.id,
                official: assignment.official._id,
                messages: []
            });
            await chat.save();

            // Notify the assigned official
            if (req.webSocketService) {
                req.webSocketService.io.emit('assignment_update', {
                    officialId: assignment.official._id,
                    grievanceId: newPetition._id,
                    status: 'assigned'
                });
            }

            res.status(201).json({
                message: 'Petition submitted and assigned successfully',
                petition: assignment.grievance,
                chatId: chat._id
            });
        } catch (assignError) {
            console.error('Error in assignment:', assignError);
            // Still save the petition even if assignment fails
            res.status(201).json({
                message: 'Petition submitted successfully but could not be assigned',
                petition: newPetition
            });
        }
    } catch (error) {
        console.error('Error submitting petition:', error);
        res.status(500).json({ error: 'Failed to submit petition' });
    }
});

// Get petitioner's petitions
router.get('/my-petitions', auth, checkRole(['petitioner']), async (req, res) => {
    try {
        console.log('Fetching petitions for user:', req.user.id);
        const petitions = await Petition.find({ petitioner: req.user.id })
            .populate('assignedOfficer', 'name email department')
            .sort({ dateFiled: -1 });

        // Get chat IDs for each petition
        const petitionsWithChat = await Promise.all(petitions.map(async (petition) => {
            const chat = await Chat.findOne({ grievanceId: petition._id });
            return {
                ...petition.toObject(),
                chatId: chat ? chat._id : null
            };
        }));

        console.log('Found petitions:', petitionsWithChat);
        res.json(petitionsWithChat);
    } catch (error) {
        console.error('Error fetching petitions:', error);
        res.status(500).json({ error: 'Failed to fetch petitions' });
    }
});

// Handle official's response to assignment
router.post('/:id/assignment-response', auth, checkRole(['official']), async (req, res) => {
    try {
        const { accepted, reason } = req.body;
        const grievanceId = req.params.id;

        const result = await AssignmentService.handleAssignmentResponse(
            grievanceId,
            req.user.id,
            accepted,
            reason
        );

        if (req.webSocketService) {
            // Notify admin about the assignment response
            const admins = await Official.find({ role: 'admin' });
            admins.forEach(admin => {
                req.webSocketService.notifyAdmin(admin._id, {
                    type: 'assignment_response',
                    grievanceId,
                    officialId: req.user.id,
                    status: accepted ? 'accepted' : 'declined',
                    reason
                });
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error handling assignment response:', error);
        res.status(500).json({ error: 'Failed to process assignment response' });
    }
});

// Get department-wise statistics
router.get('/stats', auth, checkRole(['admin']), async (req, res) => {
    try {
        const stats = await AssignmentService.getAssignmentStats();

        if (req.webSocketService) {
            req.webSocketService.broadcastStats(stats);
        }

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router; 