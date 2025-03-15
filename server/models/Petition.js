import mongoose from 'mongoose';

const AssignmentHistorySchema = new mongoose.Schema({
    official: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official',
        required: true
    },
    status: {
        type: String,
        enum: ['Assigned', 'Accepted', 'Declined', 'Completed'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        default: null
    }
});

const PetitionSchema = new mongoose.Schema({
    petitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Petitioner',
        required: true
    },
    department: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    file: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    dateFiled: {
        type: Date,
        default: Date.now
    },
    expectedResolution: {
        type: Date,
        required: true
    },
    assignedOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official',
        default: null
    },
    assignmentHistory: [AssignmentHistorySchema],
    resolution: {
        type: String,
        default: null
    },
    resolutionDate: {
        type: Date,
        default: null
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Update lastUpdated timestamp on every save
PetitionSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});

const Petition = mongoose.model('Petition', PetitionSchema);

export default Petition; 