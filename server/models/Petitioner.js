import mongoose from 'mongoose';

const petitionerSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^[0-9]{6}$/ },
    password: { type: String, required: true },
    role: { type: String, default: 'petitioner' }
}, { timestamps: true });

export default mongoose.model('Petitioner', petitionerSchema);
