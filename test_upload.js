import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Group from '../server/models/Group.js';
import Student from '../server/models/Student.js';
import Tutor from '../server/models/Tutor.js';
import jwt from 'jsonwebtoken';
import { createReadStream } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';

dotenv.config({ path: '../server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studysync';
const JWT_SECRET = process.env.JWT_SECRET;

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find a user or create one
        let user = await Student.findOne();
        if (!user) user = await Tutor.findOne();

        if (!user) {
            console.log('No user found to test with');
            return;
        }

        console.log(`Testing with user: ${user.name} (${user.email})`);

        // Generate token
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        // Find a group where user is admin
        let group = await Group.findOne({ admins: user._id });
        if (!group) {
            console.log('No group found where user is admin, creating one...');
            group = await Group.create({
                name: 'Test Group for Upload',
                description: 'Testing upload route',
                createdBy: user._id,
                admins: [user._id],
            });
        }

        console.log(`Testing with group: ${group.name} (${group._id})`);

        // Create a dummy file
        const dummyFilePath = path.join(process.cwd(), 'dummy.jpg');
        // If file doesn't exist, create simple text file (Cloudinary will reject if not image but route will process)
        // Better to create a real dummy image if possible, or just use text to see if it reaches next steps.
        // Let's create a minimal 1x1 GIF
        const gifBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        const fs = await import('fs/promises');
        await fs.writeFile(dummyFilePath, gifBuffer);

        // Prepare FormData
        const form = new FormData();
        form.append('groupPicture', createReadStream(dummyFilePath), {
            filename: 'dummy.jpg',
            contentType: 'image/jpeg',
        });

        console.log('Sending request to upload...');
        const response = await axios.post(`http://localhost:8000/api/groups/${group._id}/picture`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Upload response:', response.status, response.data);

        console.log('Cleaning up dummy file...');
        await fs.unlink(dummyFilePath);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
