// 1. WINDOWS DNS FIX (Crucial for MongoDB Atlas ECONNREFUSED on Windows)
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import https from 'node:https';
import http from 'node:http';


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
import Group from './models/Group.js';
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

// URL Metadata Scraper Endpoint for link previews
app.get('/api/url-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const fetchUrl = (targetUrl, redirects = 0) => {
            if (redirects > 3) return Promise.reject(new Error('Too many redirects'));
            return new Promise((resolve, reject) => {
                const client = targetUrl.startsWith('https') ? https : http;
                const options = {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
                    },
                    timeout: 5000
                };
                client.get(targetUrl, options, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        return resolve(fetchUrl(new URL(response.headers.location, targetUrl).toString(), redirects + 1));
                    }
                    
                    if (response.statusCode !== 200) {
                        return reject(new Error(`Server responded with ${response.statusCode}`));
                    }

                    let data = '';
                    response.on('data', chunk => { data += chunk; });
                    response.on('end', () => resolve(data));
                }).on('error', reject);
            });
        };

        const html = await fetchUrl(url);

        const getMeta = (property) => {
            const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
            const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
            const m1 = html.match(r1);
            if (m1) return m1[1];
            const m2 = html.match(r2);
            return m2 ? m2[1] : '';
        };

        const title = getMeta('og:title') || (html.match(/<title>([^<]+)<\/title>/i)?.[1] || '');
        const image = getMeta('og:image');
        const description = getMeta('og:description');

        res.json({ title: title.trim(), image, description: description.trim(), url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// Socket.io connection handling (Real-time features)
io.on('connection', (socket) => {
    console.log(`✨ User connected to Socket: ${socket.id}`);

    // Register user to their personal room for global notifications
    socket.on('register-user', (userId) => {
        if (!userId) return;
        const userIdStr = userId.toString();
        socket.join(userIdStr);
        console.log(`👤 User Registered: ${socket.id} joined personal room ${userIdStr}`);
    });
    
    // In-memory whiteboard session tracking
    // Structure: { roomId: { drawers: { socketId: { name, ready } }, lastDrawAt: timestamp } }
    if (!global.whiteboardSessions) global.whiteboardSessions = {};

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
    socket.on('send-message', async ({ roomId, message, attachment, sender, quiz }) => {
        try {
            if (!roomId || roomId === 'undefined') {
                console.warn('⚠️ send-message: Missing or invalid roomId');
                return;
            }
            const roomIdStr = roomId.toString();

            if (!roomIdStr.match(/^[0-9a-fA-F]{24}$/)) {
                console.warn(`⚠️ send-message: Invalid roomId format: ${roomIdStr}`);
                return;
            }

            console.log(`💬 Message from ${sender?.name} (${sender?._id}) in room ${roomIdStr}: ${message}`);

            if (!sender?._id) {
                console.error('❌ send-message: Missing sender._id');
                return;
            }

            // Save to database with tracking initialized to sender
            const messageData = {
                roomId: roomIdStr,
                sender: sender._id,
                deliveredTo: [sender._id],
                seenBy: [sender._id]
            };
            
            if (message) messageData.text = message;
            if (attachment) messageData.attachment = attachment;
            if (quiz) messageData.quiz = quiz;

            const newMessage = new Message(messageData);
            await newMessage.save();

            const populatedMsg = await populateUsers(newMessage, ['sender']);

            if (!populatedMsg) {
                console.error('❌ send-message: Population failed to return a document');
                return;
            }

            console.log(`📡 Broadcasting message to room ${roomIdStr}`);

            const messagePayload = {
                _id: populatedMsg._id,
                roomId: roomIdStr,
                text: populatedMsg.text,
                attachment: populatedMsg.attachment,
                quiz: populatedMsg.quiz || quiz || undefined,
                sender: populatedMsg.sender,
                timestamp: populatedMsg.timestamp,
                deliveredTo: populatedMsg.deliveredTo || [sender._id],
                seenBy: populatedMsg.seenBy || [sender._id]
            };

            // Broadcast to everyone in the room INCLUDING the sender
            io.to(roomIdStr).emit('receive-message', messagePayload);

            // Send global app-notification sounds/alerts to members NOT in the screen room
            const group = await Group.findById(roomIdStr);
            if (group) {
                const preview = message 
                    ? message.length > 40 ? message.substring(0, 40) + '...' : message 
                    : '📎 Sent an attachment';

                group.members.forEach(memberId => {
                    const memberIdStr = memberId.toString();
                    if (memberIdStr !== sender._id.toString()) {
                        io.to(memberIdStr).emit('app-notification', {
                            type: 'message',
                            title: `💬 ${sender.name}`,
                            body: preview,
                            groupId: roomIdStr,
                            groupPicture: group.groupPicture,
                            groupName: group.name,
                            senderId: sender._id,
                            timestamp: populatedMsg.timestamp
                        });
                    }
                });
            }
        } catch (error) {
            console.error('❌ socket error in send-message:', error);
        }
    });

    // Add/Update Emoji Reaction Handler
    socket.on('add-reaction', async ({ messageId, emoji, userId }) => {
        try {
            if (!messageId || !emoji || !userId) return;
            const msg = await Message.findById(messageId);
            if (!msg) return;

            // Check if user already reacted
            const existingReact = msg.reactions.find(r => r.user.toString() === userId.toString());
            
            if (existingReact) {
                if (existingReact.emoji === emoji) {
                    // Remove reaction if clicking the exact same one again
                    msg.reactions = msg.reactions.filter(r => r.user.toString() !== userId.toString());
                } else {
                    // Switch emoji
                    existingReact.emoji = emoji;
                }
            } else {
                msg.reactions.push({ user: userId, emoji });
            }

            await msg.save();

            // Broadcast update to the group room
            io.to(msg.roomId.toString()).emit('reaction-updated', { 
                messageId, 
                reactions: msg.reactions 
            });
            console.log(`👍 Reaction ${emoji} updated for message ${messageId}`);
        } catch (error) {
            console.error('❌ Error handling add-reaction:', error);
        }
    });

    // Edit Message Handler
    socket.on('edit-message', async ({ messageId, newText, userId }) => {
        try {
            if (!messageId || !newText || !userId) return;
            const msg = await Message.findById(messageId);
            if (!msg) return;

            // Optional: Verify senderId matches userId if we had authentication, but following existing trust model
            
            // Save to history before updating
            msg.editHistory.push({ text: msg.text, timestamp: new Date() });
            msg.text = newText;
            await msg.save();

            io.to(msg.roomId.toString()).emit('message-edited', { 
                messageId, 
                text: newText,
                editHistory: msg.editHistory 
            });
            console.log(`✏️ Message ${messageId} edited`);
        } catch (error) {
            console.error('❌ Error handling edit-message:', error);
        }
    });

    // Delete Message Handler (Unsend for Everyone)
    socket.on('delete-message', async ({ messageId }) => {
        try {
            if (!messageId) return;
            const msg = await Message.findById(messageId);
            if (!msg) return;

            msg.isDeleted = true;
            msg.text = ''; // Clear text
            msg.attachment = undefined; // Clear attachment details
            await msg.save();

            io.to(msg.roomId.toString()).emit('message-deleted', { messageId });
            console.log(`🗑️ Message ${messageId} deleted for everyone`);
        } catch (error) {
            console.error('❌ Error handling delete-message:', error);
        }
    });

    // Batch Unsend Messages Handler
    socket.on('delete-messages', async ({ messageIds, roomId }) => {
        try {
            if (!messageIds || !Array.isArray(messageIds) || !roomId) return;
            
            await Message.updateMany(
                { _id: { $in: messageIds } },
                { $set: { isDeleted: true, text: '', attachment: undefined } }
            );

            io.to(roomId).emit('messages-deleted', { messageIds });
            console.log(`🗑️ Batch deleted ${messageIds.length} messages for everyone`);
        } catch (error) {
            console.error('❌ Error handling delete-messages:', error);
        }
    });

    // Batch Clear Messages Handler (Delete for Me)
    socket.on('clear-messages', async ({ messageIds, userId, roomId }) => {
        try {
            if (!messageIds || !Array.isArray(messageIds) || !userId || !roomId) return;

            await Message.updateMany(
                { _id: { $in: messageIds } },
                { $addToSet: { clearedBy: userId } }
            );

            // Notify only that specific user socket if needed, or broadcast & filter client-side
            socket.emit('messages-cleared-local', { messageIds });
            console.log(`🧹 Batch cleared ${messageIds.length} messages for user ${userId}`);
        } catch (error) {
            console.error('❌ Error handling clear-messages:', error);
        }
    });

    // Message Delivered Status Handler
    socket.on('message-delivered', async ({ messageId, userId }) => {
        try {
            if (!messageId || !userId) return;
            const msg = await Message.findByIdAndUpdate(
                messageId, 
                { $addToSet: { deliveredTo: userId } }, 
                { new: true }
            );
            if (msg) {
                io.to(msg.roomId.toString()).emit('message-status-update', {
                    messageId,
                    deliveredTo: msg.deliveredTo,
                    seenBy: msg.seenBy
                });
            }
        } catch (error) {
            console.error('❌ Error handling message-delivered:', error);
        }
    });

    // Message Seen Status Handler
    socket.on('message-seen', async ({ messageId, userId }) => {
        try {
            if (!messageId || !userId) return;
            const msg = await Message.findByIdAndUpdate(
                messageId, 
                { $addToSet: { seenBy: userId } }, 
                { new: true }
            );
            if (msg) {
                io.to(msg.roomId.toString()).emit('message-status-update', {
                    messageId,
                    deliveredTo: msg.deliveredTo,
                    seenBy: msg.seenBy
                });
            }
        } catch (error) {
            console.error('❌ Error handling message-seen:', error);
        }
    });

    // Whiteboard drawing handling (Transmits coordinates to room)
    socket.on('draw', ({ roomId, drawData }) => {
        const roomIdStr = roomId.toString();
        socket.to(roomIdStr).emit('draw-update', drawData);
        
        // Update activity timestamp
        if (global.whiteboardSessions[roomIdStr]) {
            global.whiteboardSessions[roomIdStr].lastDrawAt = Date.now();
        }
    });

    // Whiteboard join/leave/ready tracking
    socket.on('whiteboard-join', async ({ roomId, user }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        socket.join(roomIdStr);
        if (!global.whiteboardSessions[roomIdStr]) {
            global.whiteboardSessions[roomIdStr] = { drawers: {}, lastDrawAt: Date.now() };
        }
        global.whiteboardSessions[roomIdStr].drawers[socket.id] = { name: user.name, ready: false };
        
        // Broadcast updated status
        io.to(roomIdStr).emit('whiteboard-status-update', {
            drawers: global.whiteboardSessions[roomIdStr].drawers,
            sessionActive: true
        });

        // Notify all group members globally about whiteboard activity via personal rooms
        const group = await Group.findById(roomIdStr);
        if (group) {
            group.members.forEach(memberId => {
                const memberIdStr = memberId.toString();
                if (memberIdStr !== user._id?.toString()) {
                    io.to(memberIdStr).emit('whiteboard-activity', {
                        roomId: roomIdStr,
                        userId: user._id,
                        userName: user.name
                    });
                }
            });
        }
    });

    socket.on('whiteboard-ready', ({ roomId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        if (global.whiteboardSessions[roomIdStr] && global.whiteboardSessions[roomIdStr].drawers[socket.id]) {
            global.whiteboardSessions[roomIdStr].drawers[socket.id].ready = true;
            
            const session = global.whiteboardSessions[roomIdStr];
            const drawerIds = Object.keys(session.drawers);
            const allReady = drawerIds.every(id => session.drawers[id].ready);
            
            // If all are ready, designate the FIRST socket as the capturer
            if (allReady && drawerIds.length > 0) {
                const capturerId = drawerIds[0];
                io.to(roomIdStr).emit('whiteboard-trigger-post', { capturerId });
                
                // Session is complete, clean it up
                delete global.whiteboardSessions[roomIdStr];
                io.to(roomIdStr).emit('whiteboard-status-update', {
                    drawers: {},
                    sessionActive: false
                });
                return; // Session deleted, no need to send further status to this room below
            }

            io.to(roomIdStr).emit('whiteboard-status-update', {
                drawers: session.drawers,
                sessionActive: true
            });
        }
    });

    socket.on('whiteboard-leave', ({ roomId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        socket.leave(roomIdStr);
        if (global.whiteboardSessions[roomIdStr] && global.whiteboardSessions[roomIdStr].drawers[socket.id]) {
            delete global.whiteboardSessions[roomIdStr].drawers[socket.id];
            
            const session = global.whiteboardSessions[roomIdStr];
            const drawerIds = Object.keys(session.drawers);
            const allReady = drawerIds.every(id => session.drawers[id].ready);
            
            if (drawerIds.length === 0) {
                delete global.whiteboardSessions[roomIdStr];
                io.to(roomIdStr).emit('whiteboard-status-update', { drawers: {}, sessionActive: false });
            } else if (allReady) {
                const capturerId = drawerIds[0];
                io.to(roomIdStr).emit('whiteboard-trigger-post', { capturerId });
                delete global.whiteboardSessions[roomIdStr];
                io.to(roomIdStr).emit('whiteboard-status-update', { drawers: {}, sessionActive: false });
            } else {
                io.to(roomIdStr).emit('whiteboard-status-update', {
                    drawers: session.drawers,
                    sessionActive: true
                });
            }
        }
    });

    // Whiteboard clear
    socket.on('clear-canvas', (roomId) => {
        const roomIdStr = roomId.toString();
        socket.to(roomIdStr).emit('canvas-cleared');
        if (global.whiteboardSessions[roomIdStr]) {
            delete global.whiteboardSessions[roomIdStr];
            io.to(roomIdStr).emit('whiteboard-status-update', {
                drawers: {},
                sessionActive: false
            });
        }
    });

    // ===================== CALL SIGNALING =====================
    // Track active calls: { roomId: { type: 'voice'|'video', participants: { socketId: { userId, name } }, initiatorId: string } }
    if (!global.activeCalls) global.activeCalls = {};

    // Initiate a call in a group room
    socket.on('call-initiate', async ({ roomId, callType, user: callerUser }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        console.log(`📞 Call initiated by ${callerUser?.name} in room ${roomIdStr} (${callType})`);

        if (!global.activeCalls[roomIdStr]) {
            global.activeCalls[roomIdStr] = { type: callType, participants: {}, initiatorId: callerUser?._id };
        }
        global.activeCalls[roomIdStr].participants[socket.id] = {
            userId: callerUser?._id,
            name: callerUser?.name,
            socketId: socket.id
        };

        // Only ring ONLINE group members (those with connected sockets in their personal room)
        const group = await Group.findById(roomIdStr);
        if (group) {
            for (const memberId of group.members) {
                const memberIdStr = memberId.toString();
                if (memberIdStr !== callerUser?._id?.toString()) {
                    // Check if this member has any connected sockets
                    const sockets = await io.in(memberIdStr).fetchSockets();
                    if (sockets.length > 0) {
                        io.to(memberIdStr).emit('call-incoming', {
                            roomId: roomIdStr,
                            callType,
                            initiator: { userId: callerUser?._id, name: callerUser?.name, socketId: socket.id },
                            participants: global.activeCalls[roomIdStr].participants
                        });
                        console.log(`📞 Ringing online member: ${memberIdStr}`);
                    } else {
                        console.log(`📞 Skipping offline member: ${memberIdStr}`);
                    }
                }
            }
        }

        // Confirm to initiator
        socket.emit('call-joined', {
            roomId: roomIdStr,
            participants: global.activeCalls[roomIdStr].participants
        });
    });

    // Join an existing call
    socket.on('call-join', ({ roomId, user: joinerUser }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();

        if (!global.activeCalls[roomIdStr]) {
            global.activeCalls[roomIdStr] = { type: 'voice', participants: {} };
        }

        // Get existing participant socket IDs BEFORE adding new one
        const existingParticipants = Object.keys(global.activeCalls[roomIdStr].participants);

        global.activeCalls[roomIdStr].participants[socket.id] = {
            userId: joinerUser?._id,
            name: joinerUser?.name,
            socketId: socket.id
        };

        console.log(`📞 ${joinerUser?.name} joined call in room ${roomIdStr}`);

        // Tell the joiner about existing participants so they can create offers
        socket.emit('call-joined', {
            roomId: roomIdStr,
            participants: global.activeCalls[roomIdStr].participants,
            existingParticipants // socket IDs to send offers to
        });

        // Tell existing participants about the new joiner
        existingParticipants.forEach(pid => {
            io.to(pid).emit('call-user-joined', {
                socketId: socket.id,
                userId: joinerUser?._id,
                name: joinerUser?.name
            });
        });
    });

    // Relay WebRTC signaling data (offer, answer, ICE candidates)
    socket.on('call-signal', ({ to, signal, type }) => {
        console.log(`📡 Relaying ${type} from ${socket.id} to ${to}`);
        io.to(to).emit('call-signal', {
            from: socket.id,
            signal,
            type
        });
    });

    // Handle call decline — notify caller and end call if nobody is left to answer
    socket.on('call-decline', async ({ roomId, userId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        console.log(`📞 User ${userId} declined call in room ${roomIdStr}`);

        // If call has only the initiator (nobody joined yet), check if anyone else might answer
        // For now, notify the caller that someone declined
        if (global.activeCalls[roomIdStr]) {
            const participants = global.activeCalls[roomIdStr].participants;
            const participantIds = Object.values(participants).map(p => p.userId);
            
            // Tell call participants that someone declined
            Object.keys(participants).forEach(pid => {
                io.to(pid).emit('call-user-declined', { userId });
            });
        }
    });

    // Leave a call
    socket.on('call-leave', async ({ roomId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        console.log(`📞 ${socket.id} left call in room ${roomIdStr}`);

        if (global.activeCalls[roomIdStr]) {
            delete global.activeCalls[roomIdStr].participants[socket.id];

            const remaining = Object.keys(global.activeCalls[roomIdStr].participants);

            if (remaining.length <= 1) {
                // End call if only 1 or 0 people left
                delete global.activeCalls[roomIdStr];
                
                // Notify ALL group members that call ended (stops ringing for everyone)
                const group = await Group.findById(roomIdStr);
                if (group) {
                    group.members.forEach(m => io.to(m.toString()).emit('call-ended', { roomId: roomIdStr }));
                }
            } else {
                // Notify remaining participants
                remaining.forEach(pid => {
                    io.to(pid).emit('call-user-left', { socketId: socket.id });
                });
            }
        } else {
            // Even if no active call tracked, broadcast call-ended to stop any lingering ringing
            const group = await Group.findById(roomIdStr);
            if (group) {
                group.members.forEach(m => io.to(m.toString()).emit('call-ended', { roomId: roomIdStr }));
            }
        }
    });

    // End call for everyone
    socket.on('call-end', async ({ roomId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        console.log(`📞 Call ended in room ${roomIdStr}`);

        if (global.activeCalls[roomIdStr]) {
            delete global.activeCalls[roomIdStr];
        }
        
        // Notify all group members that call ended
        const group = await Group.findById(roomIdStr);
        if (group) {
            group.members.forEach(m => io.to(m.toString()).emit('call-ended', { roomId: roomIdStr }));
        }
    });

    // Get active call info for a room
    socket.on('call-check', ({ roomId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        const call = global.activeCalls[roomIdStr];
        socket.emit('call-status', {
            roomId: roomIdStr,
            active: !!call,
            callType: call?.type || null,
            participants: call?.participants || {}
        });
    });

    // ===================== END CALL SIGNALING =====================

        // ===================== TYPING INDICATOR =====================
    socket.on('typing-start', async ({ roomId, user: typingUser }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        socket.to(roomIdStr).emit('user-typing', { user: typingUser });

        // Also broadcast to all group members' personal rooms for sidebar typing indicator
        try {
            const group = await Group.findById(roomIdStr);
            if (group) {
                group.members.forEach(memberId => {
                    const memberIdStr = memberId.toString();
                    if (memberIdStr !== typingUser?._id?.toString()) {
                        io.to(memberIdStr).emit('sidebar-typing', {
                            groupId: roomIdStr,
                            userId: typingUser?._id,
                            userName: typingUser?.name
                        });
                    }
                });
            }
        } catch (e) {
            // Non-critical, don't crash
        }
    });

    socket.on('typing-stop', async ({ roomId, userId }) => {
        if (!roomId) return;
        const roomIdStr = roomId.toString();
        socket.to(roomIdStr).emit('user-stop-typing', { userId });

        // Also broadcast to personal rooms for sidebar
        try {
            const group = await Group.findById(roomIdStr);
            if (group) {
                group.members.forEach(memberId => {
                    const memberIdStr = memberId.toString();
                    if (memberIdStr !== userId?.toString()) {
                        io.to(memberIdStr).emit('sidebar-stop-typing', {
                            groupId: roomIdStr,
                            userId
                        });
                    }
                });
            }
        } catch (e) {
            // Non-critical
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);

        // Cleanup from any active calls
        if (global.activeCalls) {
            Object.keys(global.activeCalls).forEach(async (roomIdStr) => {
                if (global.activeCalls[roomIdStr]?.participants[socket.id]) {
                    delete global.activeCalls[roomIdStr].participants[socket.id];

                    const remaining = Object.keys(global.activeCalls[roomIdStr].participants);
                    if (remaining.length <= 1) {
                        // End call if only 1 or 0 people left
                        delete global.activeCalls[roomIdStr];
                        
                        // Notify all group members that call ended
                        const group = await Group.findById(roomIdStr);
                        if (group) {
                            group.members.forEach(m => io.to(m.toString()).emit('call-ended', { roomId: roomIdStr }));
                        }
                    } else {
                        remaining.forEach(pid => {
                            io.to(pid).emit('call-user-left', { socketId: socket.id });
                        });
                    }
                }
            });
        }

        // Cleanup from any whiteboard sessions
        if (global.whiteboardSessions) {
            Object.keys(global.whiteboardSessions).forEach(roomIdStr => {
                if (global.whiteboardSessions[roomIdStr].drawers[socket.id]) {
                    delete global.whiteboardSessions[roomIdStr].drawers[socket.id];
                    
                    const session = global.whiteboardSessions[roomIdStr];
                    const drawerIds = Object.keys(session.drawers);
                    const allReady = drawerIds.every(id => session.drawers[id].ready);

                    if (drawerIds.length === 0) {
                        delete global.whiteboardSessions[roomIdStr];
                        io.to(roomIdStr).emit('whiteboard-status-update', { drawers: {}, sessionActive: false });
                    } else if (allReady) {
                        const capturerId = drawerIds[0];
                        io.to(roomIdStr).emit('whiteboard-trigger-post', { capturerId });
                        delete global.whiteboardSessions[roomIdStr];
                        io.to(roomIdStr).emit('whiteboard-status-update', { drawers: {}, sessionActive: false });
                    } else {
                        io.to(roomIdStr).emit('whiteboard-status-update', {
                            drawers: session.drawers,
                            sessionActive: true
                        });
                    }
                }
            });
        }
    });
});

// Periodic check for whiteboard inactivity (Auto-post after 5 minutes)
setInterval(() => {
    if (!global.whiteboardSessions) return;
    const now = Date.now();
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

    Object.keys(global.whiteboardSessions).forEach(roomIdStr => {
        const session = global.whiteboardSessions[roomIdStr];
        if (now - session.lastDrawAt > INACTIVITY_LIMIT) {
            const drawerIds = Object.keys(session.drawers);
            if (drawerIds.length > 0) {
                console.log(`⏰ Inactivity timeout for room ${roomIdStr}. Triggering auto-post.`);
                const capturerId = drawerIds[0];
                io.to(roomIdStr).emit('whiteboard-trigger-post', { capturerId, isTimeout: true });
                
                // Clean up session immediately after triggering auto-post
                delete global.whiteboardSessions[roomIdStr];
                io.to(roomIdStr).emit('whiteboard-status-update', {
                    drawers: {},
                    sessionActive: false
                });
            }
        }
    });
}, 30000); // Check every 30 seconds

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