import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token based on role if available
            if (decoded.role === 'tutor') {
                req.user = await Tutor.findById(decoded.id).select('-password');
            } else if (decoded.role === 'student') {
                req.user = await Student.findById(decoded.id).select('-password');
            } else {
                // Fallback for legacy tokens or if role is missing: try both
                req.user = await Student.findById(decoded.id).select('-password');
                if (!req.user) {
                    req.user = await Tutor.findById(decoded.id).select('-password');
                }
            }

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
