import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const tutorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            default: 'tutor',
            immutable: true, // Force role to be tutor for this collection
        },
        themePreference: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light',
        },
        otp: {
            type: String,
        },
        otpExpires: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
tutorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
tutorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Tutor = mongoose.model('Tutor', tutorSchema);

export default Tutor;
