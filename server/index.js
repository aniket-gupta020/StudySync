// 1. WINDOWS DNS FIX (Crucial for MongoDB Atlas ECONNREFUSED on Windows)
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Global Error Handlers (Prevent process exit on unhandled errors)
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import resourceRoutes from './routes/resources.js';
import Message from './models/Message.js';
import { populateUsers } from './utils/populate.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS (Vite uses 5173 by default)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/resources', resourceRoutes);

// Root Health Check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'StudySync API is running',
        timestamp: new Date().toISOString()
    });
});

// Socket.io connection handling (Real-time features)
io.on('connection', (socket) => {
    console.log(`✨ User connected to Socket: ${socket.id}`);

    // Join a room (study group)
    socket.on('join-room', (roomId) => {
        if (!roomId || roomId === 'undefined') return;
        const roomIdStr = roomId.toString();
        socket.join(roomIdStr);
        console.log(`📁 Room Joined: ${socket.id} joined group ${roomIdStr}`);
        socket.to(roomIdStr).emit('user-joined', { userId: socket.id });
    });

    // Leave a room
    socket.on('leave-room', (roomId) => {
        if (!roomId || roomId === 'undefined') return;
        const roomIdStr = roomId.toString();
        socket.leave(roomIdStr);
        console.log(`🚪 Room Left: ${socket.id} left group ${roomIdStr}`);
        socket.to(roomIdStr).emit('user-left', { userId: socket.id });
    });

    // Chat message handling
    socket.on('send-message', async ({ roomId, message, sender }) => {
        try {
            if (!roomId || roomId === 'undefined') {
                console.warn('⚠️ send-message: Missing or invalid roomId');
                return;
            }
            const roomIdStr = roomId.toString();

            // Validate roomId format as ObjectId
            if (!roomIdStr.match(/^[0-9a-fA-F]{24}$/)) {
                console.warn(`⚠️ send-message: Invalid roomId format: ${roomIdStr}`);
                return;
            }

            console.log(`💬 Message from ${sender?.name} (${sender?._id}) in room ${roomIdStr}: ${message}`);

            if (!sender?._id) {
                console.error('❌ send-message: Missing sender._id');
                return;
            }

            // Save to database
            const newMessage = new Message({
                roomId: roomIdStr,
                sender: sender._id,
                text: message
            });
            await newMessage.save();

            // Use custom populate to handle both Students and Tutors
            const populatedMsg = await populateUsers(newMessage, ['sender']);

            if (!populatedMsg) {
                console.error('❌ send-message: Population failed to return a document');
                return;
            }

            console.log(`📡 Broadcasting message to room ${roomIdStr}`);

            // Broadcast to everyone in the room INCLUDING the sender
            io.to(roomIdStr).emit('receive-message', {
                message: populatedMsg.text,
                sender: populatedMsg.sender,
                timestamp: populatedMsg.timestamp
            });
        } catch (error) {
            console.error('❌ socket error in send-message:', error);
        }
    });

    // Whiteboard drawing handling (Transmits coordinates to room)
    socket.on('draw', ({ roomId, drawData }) => {
        socket.to(roomId).emit('draw-update', drawData);
    });

    // Whiteboard clear
    socket.on('clear-canvas', (roomId) => {
        socket.to(roomId).emit('canvas-cleared');
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Attach io to app instance for use in external route files
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({
        error: true,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
    =========================================
    🚀 STUDY SYNC BACKEND INITIALIZED
    📡 Port: ${PORT}
    🌐 Client: ${process.env.CLIENT_URL || 'http://localhost:5173'}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    =========================================
    `);
});