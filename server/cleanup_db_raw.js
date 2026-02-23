import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for raw cleanup');

        const db = mongoose.connection.db;
        const messagesColl = db.collection('messages');

        const allMessages = await messagesColl.find({}).toArray();
        let deletedCount = 0;

        for (const msg of allMessages) {
            // Check if _id is NOT an ObjectId
            const isIdObjectId = msg._id instanceof mongoose.Types.ObjectId;
            const isRoomObjectId = msg.roomId instanceof mongoose.Types.ObjectId;
            const isSenderObjectId = msg.sender instanceof mongoose.Types.ObjectId;

            if (!isIdObjectId || !isRoomObjectId || !isSenderObjectId) {
                console.log(`🗑️ Deleting raw invalid message: _id=${msg._id} (${typeof msg._id})`);
                await messagesColl.deleteOne({ _id: msg._id });
                deletedCount++;
            }
        }

        console.log(`✅ Raw Cleanup complete. Deleted ${deletedCount} corrupt records.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Raw Cleanup failed:', error);
        process.exit(1);
    }
};

cleanup();
