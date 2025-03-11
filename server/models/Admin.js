import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    adminId: { type: String, required: true, unique: true, trim: true },
    position: { type: String, required: true, trim: true },
    securityKey: { type: String, required: true },  // For added security during registration
    password: { type: String, required: true },
    role: { type: String, default: 'admin' }
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
