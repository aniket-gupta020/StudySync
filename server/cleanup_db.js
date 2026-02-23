import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import Message from './models/Message.js';

dotenv.config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for cleanup');

        const allMessages = await Message.find().lean();
        let deletedCount = 0;

        for (const msg of allMessages) {
            const isIdValid = mongoose.Types.ObjectId.isValid(msg._id);
            const isRoomValid = mongoose.Types.ObjectId.isValid(msg.roomId);
            const isSenderValid = mongoose.Types.ObjectId.isValid(msg.sender);

            if (!isIdValid || !isRoomValid || !isSenderValid) {
                console.log(`🗑️ Deleting invalid message: _id=${msg._id}, roomId=${msg.roomId}, sender=${msg.sender}`);
                // Since _id might be a string, we need to match it exactly
                await Message.deleteOne({ _id: msg._id });
                deletedCount++;
            }
        }

        console.log(`✅ Cleanup complete. Deleted ${deletedCount} invalid messages.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
};

cleanup();
