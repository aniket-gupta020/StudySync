// 1. WINDOWS DNS FIX (Crucial for MongoDB Atlas ECONNREFUSED on Windows)
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1', '8.8.8.8']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Group from './models/Group.js';
import Student from './models/Student.js';
import Tutor from './models/Tutor.js';
import jwt from 'jsonwebtoken';
import { createReadStream } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studysync';
const JWT_SECRET = process.env.JWT_SECRET;

async function runTest() {
    try {
        console.log(`Connecting to: ${MONGO_URI}`);
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
        const gifBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        await fsPromises.writeFile(dummyFilePath, gifBuffer);

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
        await fsPromises.unlink(dummyFilePath);

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
