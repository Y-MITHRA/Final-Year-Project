import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderModel'
    },
    senderModel: {
        type: String,
        required: true,
        enum: ['Petitioner', 'Official']
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

const ChatSchema = new mongoose.Schema({
    grievanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Petition',
        required: true
    },
    petitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Petitioner',
        required: true
    },
    official: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Official',
        required: true
    },
    messages: [MessageSchema],
    lastMessage: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Update lastMessage timestamp when new messages are added
ChatSchema.pre('save', function (next) {
    if (this.messages.length > 0) {
        this.lastMessage = this.messages[this.messages.length - 1].timestamp;
    }
    next();
});

const Chat = mongoose.model('Chat', ChatSchema);
export default Chat; 