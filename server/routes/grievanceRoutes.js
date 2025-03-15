import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    createGrievance,
    handleAssignmentResponse,
    updateGrievanceStatus,
    getOfficialGrievances,
    getGrievancesByDepartment
} from '../controllers/grievanceController.js';
import { auth, isOfficial } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Sanitize filename
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and PDF files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Middleware to handle file upload errors
const handleFileUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    message: 'File size is too large. Maximum size is 5MB.'
                });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// Create a new grievance (requires authentication)
router.post('/create', auth, handleFileUpload, createGrievance);

// Get grievances for an official
router.get('/official/:officialId', auth, isOfficial, getOfficialGrievances);

// Get grievances by department (requires official authentication)
router.get('/department/:department', auth, isOfficial, getGrievancesByDepartment);

// Handle grievance assignment (accept/decline)
router.post('/:grievanceId/accept', auth, isOfficial, (req, res) => handleAssignmentResponse(req, res, true));
router.post('/:grievanceId/decline', auth, isOfficial, (req, res) => handleAssignmentResponse(req, res, false));

// Update grievance status
router.post('/:grievanceId/updateStatus', auth, isOfficial, updateGrievanceStatus);

export default router; 