import mongoose from 'mongoose';

const whiteboardSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    canvasData: {
        type: String,
        default: '' // Can store base64 image data for persistence
    }
}, { timestamps: true });

export default mongoose.model('Whiteboard', whiteboardSchema);
