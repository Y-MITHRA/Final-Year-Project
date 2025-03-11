import mongoose from 'mongoose';

const officialSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    employeeId: { type: String, required: true, unique: true, trim: true },
    department: { 
        type: String, 
        required: true,
        enum: ['Water', 'RTO', 'Electricity']  // Ensures only valid departments are accepted
    },
    designation: { type: String, required: true, trim: true },
    officeAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^[0-9]{6}$/ },
    password: { type: String, required: true },
    role: { type: String, default: 'official' }
}, { timestamps: true });

export default mongoose.model('Official', officialSchema);
