import express from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user (Student or Tutor)
// @access  Public
router.post('/register', async (req, res) => {
    try {
        let { name, email, password, role } = req.body;
        if (email) email = email.toLowerCase();

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const userRole = role === 'tutor' ? 'tutor' : 'student';
        const Model = userRole === 'tutor' ? Tutor : Student;

        // Check if user already exists in EITHER collection to avoid confusion
        const studentExists = await Student.findOne({ email });
        const tutorExists = await Tutor.findOne({ email });

        if (studentExists || tutorExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = await Model.create({
            name,
            email,
            password,
            role: userRole,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                themePreference: user.themePreference,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check Student collection first
        let user = await Student.findOne({ email }).select('+password');
        let role = 'student';

        // If not found, check Tutor collection
        if (!user) {
            user = await Tutor.findOne({ email }).select('+password');
            role = 'tutor';
        }

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || role, // Ensure role is returned
                themePreference: user.themePreference,
                token: generateToken(user._id, user.role || role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        // req.user is already populated by middleware
        const user = req.user;

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                themePreference: user.themePreference,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/auth/theme
// @desc    Update user theme preference
// @access  Private
router.put('/theme', protect, async (req, res) => {
    try {
        const { theme } = req.body;

        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ message: 'Invalid theme value' });
        }

        // req.user is a Mongoose document from middleware
        const user = req.user;

        if (user) {
            user.themePreference = theme;
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                themePreference: user.themePreference,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Update theme error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to user email
// @access  Public
router.post('/send-otp', async (req, res) => {
    try {
        let { email, type } = req.body;
        if (email) email = email.trim().toLowerCase();

        // Check both collections
        let user = await Student.findOne({ email });
        if (!user) {
            user = await Tutor.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to user
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send email
        await sendEmail(email, otp, type || 'login_otp');

        res.status(200).json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ message: 'Error sending email', error: error.message });
    }
});

// @route   POST /api/auth/login-via-otp
// @desc    Login using OTP
// @access  Public
router.post('/login-via-otp', async (req, res) => {
    try {
        let { email, otp } = req.body;
        if (email) email = email.trim().toLowerCase();

        // Check both collections
        let user = await Student.findOne({ email });
        let role = 'student';

        if (!user) {
            user = await Tutor.findOne({ email });
            role = 'tutor';
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify OTP
        if (!user.otp || user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Verify Expiration
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }

        // Clear OTP
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Return token and user data
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || role,
            themePreference: user.themePreference,
            token: generateToken(user._id, user.role || role),
        });

    } catch (error) {
        console.error('OTP Login error:', error);
        res.status(500).json({ message: 'Server error check console', error: error.message });
    }
});

export default router;
