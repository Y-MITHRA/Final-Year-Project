import mongoose from 'mongoose';

const officialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['water', 'electricity', 'roads', 'sanitation']
    },
    employeeId: {
        type: String,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Official = mongoose.model('Official', officialSchema);
export default Official;

