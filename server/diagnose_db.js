import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']); // Windows DNS fix

import Message from './models/Message.js';
import User from './models/User.js';
import Group from './models/Group.js';

dotenv.config();

const diagnose = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const messageCount = await Message.countDocuments();
        console.log(`Total messages in DB: ${messageCount}`);

        if (messageCount > 0) {
            const sampleMessages = await Message.find().limit(5).lean();
            console.log('Sample messages:', JSON.stringify(sampleMessages, null, 2));

            for (const msg of sampleMessages) {
                console.log(`Checking msg ${msg._id}: roomId=${msg.roomId}, sender=${msg.sender}`);
                if (msg.roomId && !mongoose.Types.ObjectId.isValid(msg.roomId)) {
                    console.error(`❌ Invalid roomId found: ${msg.roomId}`);
                }
                if (msg.sender && !mongoose.Types.ObjectId.isValid(msg.sender)) {
                    console.error(`❌ Invalid sender found: ${msg.sender}`);
                }
            }
        }

        const groups = await Group.find().limit(5).lean();
        console.log('Sample groups:', JSON.stringify(groups, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
        process.exit(1);
    }
};

diagnose();
