import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
    {
        // Cloudinary public_id  — needed for deletion
        filename: {
            type: String,
            required: [true, 'Filename (public_id) is required'],
        },
        // Human-readable name the user uploaded
        originalName: {
            type: String,
            required: [true, 'Original filename is required'],
        },
        // Cloudinary secure_url
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },
        // MIME type  e.g. "application/pdf", "image/png"
        fileType: {
            type: String,
            required: true,
        },
        // Size in bytes
        fileSize: {
            type: Number,
            required: true,
        },
        // Who uploaded it
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        // Which study group it belongs to
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index — fast look-ups by group, newest first
resourceSchema.index({ group: 1, createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
