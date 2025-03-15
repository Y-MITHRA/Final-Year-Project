import express from 'express';
import {
    loginOfficial,
    loginPetitioner,
    loginAdmin,
    registerPetitioner,
    registerOfficial,
    registerAdmin
} from '../controllers/authController.js';

const router = express.Router();

// Registration routes
router.post('/register/petitioner', registerPetitioner);
router.post('/register/official', registerOfficial);
router.post('/register/admin', registerAdmin);

// Login routes
router.post('/login/petitioner', loginPetitioner);
router.post('/login/official', loginOfficial);
router.post('/login/admin', loginAdmin);

export default router;
