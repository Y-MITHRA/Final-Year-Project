import bcryptjs from 'bcryptjs';
import Petitioner from '../models/Petitioner.js';
import Official from '../models/Official.js';
import Admin from '../models/Admin.js';

// Register Petitioner
export const registerPetitioner = async (req, res) => {
    const { email, password, firstName, lastName, phone } = req.body;

    try {
        console.log('📥 Received petitioner registration data:', {
            ...req.body,
            password: '[REDACTED]'
        });

        // Check if Petitioner already exists
        const existingPetitioner = await Petitioner.findOne({ email });
        if (existingPetitioner) {
            console.log('❌ Petitioner Already Exists:', email);
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !phone) {
            console.log('❌ Missing Required Fields');
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcryptjs.hash(password, 10);
        console.log('Password hashed successfully');

        const newPetitioner = new Petitioner({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            role: 'petitioner'
        });

        await newPetitioner.save();
        console.log('✅ Petitioner Registered Successfully:', {
            id: newPetitioner._id,
            email: newPetitioner.email
        });

        res.status(201).json({
            message: "Petitioner registered successfully!",
            petitioner: {
                id: newPetitioner._id,
                email: newPetitioner.email,
                name: `${newPetitioner.firstName} ${newPetitioner.lastName}`
            }
        });

    } catch (error) {
        console.error('❌ Error Registering Petitioner:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Register Official
export const registerOfficial = async (req, res) => {
    const { email, password, department, firstName, lastName } = req.body;

    try {
        console.log('📥 Received official registration data:', {
            ...req.body,
            password: '[REDACTED]'
        });

        // Check if Official already exists
        const existingOfficial = await Official.findOne({ email });
        if (existingOfficial) {
            console.log('❌ Official Already Exists:', email);
            return res.status(400).json({ error: 'Official already registered.' });
        }

        // Check for valid department
        const validDepartments = ['Water', 'RTO', 'Electricity', 'Road', 'Hospital'];
        if (!validDepartments.includes(department)) {
            console.log('❌ Invalid Department Selected:', department);
            return res.status(400).json({ error: 'Invalid department selected.' });
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !department) {
            console.log('❌ Missing Required Fields');
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcryptjs.hash(password, 10);
        console.log('Password hashed successfully');

        const newOfficial = new Official({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            department,
            role: 'official'
        });

        await newOfficial.save();
        console.log('✅ Official Registered Successfully:', {
            id: newOfficial._id,
            email: newOfficial.email,
            department: newOfficial.department
        });

        res.status(201).json({
            message: "Official registered successfully!",
            official: {
                id: newOfficial._id,
                email: newOfficial.email,
                name: `${newOfficial.firstName} ${newOfficial.lastName}`,
                department: newOfficial.department
            }
        });

    } catch (error) {
        console.error('❌ Error Registering Official:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Register Admin
export const registerAdmin = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        console.log('📥 Received admin registration data:', {
            ...req.body,
            password: '[REDACTED]'
        });

        // Check if Admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('❌ Admin Already Exists:', email);
            return res.status(400).json({ error: 'Admin already registered.' });
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            console.log('❌ Missing Required Fields');
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcryptjs.hash(password, 10);
        console.log('Password hashed successfully');

        const newAdmin = new Admin({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();
        console.log('✅ Admin Registered Successfully:', {
            id: newAdmin._id,
            email: newAdmin.email
        });

        res.status(201).json({
            message: "Admin registered successfully!",
            admin: {
                id: newAdmin._id,
                email: newAdmin.email,
                name: `${newAdmin.firstName} ${newAdmin.lastName}`
            }
        });

    } catch (error) {
        console.error('❌ Error Registering Admin:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};


