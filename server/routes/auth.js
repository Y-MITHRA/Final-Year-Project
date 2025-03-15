import express from 'express';
import { loginOfficial, loginPetitioner, loginAdmin } from '../controllers/authController.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/loginOfficial', loginOfficial);
router.post('/loginPetitioner', loginPetitioner);
router.post('/loginAdmin', loginAdmin);

// Protected routes example
router.get('/profile', auth, (req, res) => {
    res.json({ user: req.user });
});

// Role-based protected routes
router.get('/official-only', auth, checkRole(['official']), (req, res) => {
    res.json({ message: 'Official access granted' });
});

router.get('/admin-only', auth, checkRole(['admin']), (req, res) => {
    res.json({ message: 'Admin access granted' });
});

router.get('/petitioner-only', auth, checkRole(['petitioner']), (req, res) => {
    res.json({ message: 'Petitioner access granted' });
});

export default router; 