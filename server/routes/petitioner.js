import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Petitioner from "../models/Petitioner.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// ✅ Register Petitioner
router.post("/register", async (req, res) => {
    const { firstName, lastName, email, phone, address, city, state, pincode, password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const existingUser = await Petitioner.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Petitioner already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newPetitioner = new Petitioner({
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            password: hashedPassword,
        });

        await newPetitioner.save();
        res.status(201).json({ message: "Petitioner registered successfully!" });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Petitioner Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt for email:', email);

        const petitioner = await Petitioner.findOne({ email });
        if (!petitioner) {
            console.log('No petitioner found with email:', email);
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, petitioner.password);
        if (!isMatch) {
            console.log('Invalid password for petitioner:', email);
            return res.status(400).json({ error: "Invalid email or password" });
        }

        console.log('Login successful for petitioner:', email);

        const token = jwt.sign(
            {
                id: petitioner._id,
                role: "petitioner"
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Send back all required user data
        res.json({
            token,
            id: petitioner._id,
            name: `${petitioner.firstName} ${petitioner.lastName}`,
            email: petitioner.email,
            role: "petitioner"
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: "An error occurred during login. Please try again." });
    }
});

// Protected routes
router.use(protect); // Apply authentication middleware to all routes below this

// Get petitioner dashboard data
router.get("/dashboard", authorize('petitioner'), async (req, res) => {
    try {
        // Get user ID from authenticated request
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        // Fetch petitioner data
        const petitioner = await Petitioner.findById(userId)
            .select('-password'); // Exclude password from the response

        if (!petitioner) {
            return res.status(404).json({
                status: 'error',
                message: 'Petitioner not found'
            });
        }

        // You can add more dashboard-specific data here
        res.json({
            status: 'success',
            data: {
                petitioner,
                // Add other dashboard data here
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching dashboard data'
        });
    }
});

export default router;
