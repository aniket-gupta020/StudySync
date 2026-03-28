import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        trim: true
    },
    attachment: {
        fileUrl: String,
        fileName: String,
        fileType: String
    },
    quiz: {
        _id: String,
        title: String,
        description: String,
        questionCount: Number,
        attemptCount: Number,
    },
    clearedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    deliveredTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reactions: [{
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        emoji: { 
            type: String, 
            required: true 
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        text: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
