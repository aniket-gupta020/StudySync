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
                ref: 'User',
            },
        ],
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        inviteCode: {
            type: String,
            unique: true,
            default: () => nanoid(10),
        },
        membersCanInvite: {
            type: Boolean,
            default: false,
        },
        requireApproval: {
            type: Boolean,
            default: false,
        },
        joinRequests: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Add creator to members automatically
groupSchema.pre('save', function (next) {
    if (this.isNew) {
        if (!this.members.includes(this.createdBy)) {
            this.members.push(this.createdBy);
        }
        if (!this.admins.includes(this.createdBy)) {
            this.admins.push(this.createdBy);
        }
    }
    next();
});

const Group = mongoose.model('Group', groupSchema);

export default Group;
