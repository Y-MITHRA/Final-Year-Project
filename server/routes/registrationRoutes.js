import express from 'express';
import { registerOfficial, registerPetitioner, registerAdmin } from '../controllers/registrationController.js';

const router = express.Router();

// Public registration routes
router.post('/register/petitioner', registerPetitioner);
router.post('/register/official', registerOfficial);
router.post('/register/admin', registerAdmin);

export default router;
