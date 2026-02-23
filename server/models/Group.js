import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a group name'],
            trim: true,
            maxlength: [100, 'Group name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
            },
        ],
        inviteCode: {
            type: String,
            unique: true,
            default: () => nanoid(10),
        },
    },
    {
        timestamps: true,
    }
);

// Add creator to members automatically
groupSchema.pre('save', function (next) {
    if (this.isNew && !this.members.includes(this.createdBy)) {
        this.members.push(this.createdBy);
    }
    next();
});

const Group = mongoose.model('Group', groupSchema);

export default Group;
