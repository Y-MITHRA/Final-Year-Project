import mongoose from "mongoose";

const petitionerSchema = new mongoose.Schema({
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
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Petitioner = mongoose.model("Petitioner", petitionerSchema);
export default Petitioner;