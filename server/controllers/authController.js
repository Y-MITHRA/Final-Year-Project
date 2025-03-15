import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Official from '../models/Official.js';
import Petitioner from '../models/Petitioner.js';
import Admin from '../models/Admin.js';
import * as dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const generateToken = (user, role) => {
    return jwt.sign(
        { id: user._id, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Login Controllers
export const loginPetitioner = async (req, res, next) => {
    try {
        // Ensure request body is properly formatted
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request format'
            });
        }

        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide both email and password'
            });
        }

        // Validate email format
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid email address'
            });
        }

        // Find user
        const petitioner = await Petitioner.findOne({ email: email.toLowerCase() });
        if (!petitioner) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found. Please check your credentials or register.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, petitioner.password);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(petitioner, 'petitioner');

        // Send success response
        res.status(200).json({
            status: 'success',
            data: {
                token,
                user: {
                    id: petitioner._id,
                    name: petitioner.name,
                    email: petitioner.email,
                    role: 'petitioner'
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

export const loginOfficial = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const official = await Official.findOne({ email });
        if (!official) {
            return res.status(404).json({ message: 'User not found. Please check your credentials or register.' });
        }

        const isMatch = await bcrypt.compare(password, official.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(official, 'official');
        res.json({
            token,
            user: {
                id: official._id,
                name: official.name,
                email: official.email,
                department: official.department,
                role: 'official'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'User not found. Please check your credentials or register.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(admin, 'admin');
        res.json({
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Registration Controllers
export const registerPetitioner = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingUser = await Petitioner.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const petitioner = await Petitioner.create({
            name,
            email,
            password: hashedPassword,
            phone
        });

        const token = generateToken(petitioner, 'petitioner');
        res.status(201).json({
            token,
            user: {
                id: petitioner._id,
                name: petitioner.name,
                email: petitioner.email,
                role: 'petitioner'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const registerOfficial = async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        if (!name || !email || !password || !department) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingUser = await Official.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const official = await Official.create({
            name,
            email,
            password: hashedPassword,
            department
        });

        const token = generateToken(official, 'official');
        res.status(201).json({
            token,
            user: {
                id: official._id,
                name: official.name,
                email: official.email,
                department: official.department,
                role: 'official'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingUser = await Admin.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword
        });

        const token = generateToken(admin, 'admin');
        res.status(201).json({
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};