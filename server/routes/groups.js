import express from 'express';
import Group from '../models/Group.js';
import Message from '../models/Message.js';
import Resource from '../models/Resource.js';
import { protect } from '../middleware/auth.js';
import { populateUsers } from '../utils/populate.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// @route   GET /api/groups
// @desc    Get all groups for authenticated user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let groups = await Group.find({ members: req.user._id })
            .sort({ createdAt: -1 });

        groups = await populateUsers(groups, ['createdBy', 'members']);

        res.json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Server error fetching groups' });
    }
});

// @route   POST /api/groups
// @desc    Create a new study group
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Please provide a group name' });
        }

        let group = await Group.create({
            name,
            description,
            createdBy: req.user._id,
        });

        group = await populateUsers(group, ['createdBy', 'members']);

        res.status(201).json(group);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: 'Server error creating group' });
    }
});

// @route   GET /api/groups/:id
// @desc    Get single group details
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        let group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member
        // Note: group.members is array of ObjectIds here before population?
        // Wait, I need to check membership BEFORE population because populateUsers converts IDs to Objects.
        // Actually, populateUsers returns POJOs, so checks heavily rely on string comparison.

        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to view this group' });
        }

        group = await populateUsers(group, ['createdBy', 'members']);

        res.json(group);
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ message: 'Server error fetching group' });
    }
});

// @route   PUT /api/groups/:id
// @desc    Update group details
// @access  Private (Creator only)
router.put('/:id', protect, async (req, res) => {
    try {
        let group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the creator
        if (group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the group creator can update this group' });
        }

        const { name, description } = req.body;

        if (name) group.name = name;
        if (description !== undefined) group.description = description;

        await group.save();

        group = await populateUsers(group, ['createdBy', 'members']);

        res.json(group);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ message: 'Server error updating group' });
    }
});

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private (Creator only)
router.delete('/:id', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the creator
        if (group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the group creator can delete this group' });
        }

        await group.deleteOne();

        res.json({ message: 'Group removed successfully' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ message: 'Server error deleting group' });
    }
});

// @route   POST /api/groups/join/:inviteCode
// @desc    Join a group using invite code
// @access  Private
router.post('/join/:inviteCode', protect, async (req, res) => {
    try {
        let group = await Group.findOne({ inviteCode: req.params.inviteCode });

        if (!group) {
            return res.status(404).json({ message: 'Invalid invite code' });
        }

        // Check if already a member
        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );

        if (isMember) {
            return res.status(400).json({ message: 'You are already a member of this group' });
        }

        group.members.push(req.user._id);
        await group.save();

        group = await populateUsers(group, ['createdBy', 'members']);

        res.json(group);
    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ message: 'Server error joining group' });
    }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.post('/:id/leave', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member
        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(400).json({ message: 'You are not a member of this group' });
        }

        // Remove user from members array
        group.members = group.members.filter(
            (member) => member.toString() !== req.user._id.toString()
        );

        // If the user was the creator/admin, reassign to the next oldest member or delete group
        if (group.createdBy.toString() === req.user._id.toString()) {
            if (group.members.length > 0) {
                // The participant who joined next becomes the new admin
                group.createdBy = group.members[0];
                await group.save();
            } else {
                // No members left, delete the group entirely
                await group.deleteOne();
                // Delete associated messages
                await Message.deleteMany({ roomId: req.params.id });
                return res.json({ message: 'Group deleted since no members left' });
            }
        } else {
            // Normal member left
            await group.save();
        }

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ message: 'Server error leaving group' });
    }
});

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove a member from a group (Creator only)
// @access  Private
router.delete('/:id/members/:userId', protect, async (req, res) => {
    try {
        console.log('DEBUG: Remove member request', req.params);
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the creator
        if (group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the group creator can remove members' });
        }

        const memberIdToRemove = req.params.userId;

        // cannot remove yourself (creator)
        if (memberIdToRemove === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot remove yourself. Delete the group instead.' });
        }

        // Check if user is actually a member
        const isMember = group.members.some(
            (member) => member.toString() === memberIdToRemove
        );

        if (!isMember) {
            return res.status(404).json({ message: 'User is not a member of this group' });
        }

        // Remove member
        group.members = group.members.filter(
            (member) => member.toString() !== memberIdToRemove
        );

        console.log('DEBUG: Group members after filter:', group.members);
        await group.save();

        // Re-populate to return the updated list
        const updatedGroup = await populateUsers(group, ['createdBy', 'members']);

        res.json(updatedGroup);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error removing member' });
    }
});

// @route   GET /api/groups/:id/messages
// @desc    Get chat history for a group
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        console.log(`🔍 DEBUG: Fetching messages for room: "${id}" (Page: ${page}, Limit: ${limit})`);

        // Validate ObjectId
        if (!id || id === 'undefined' || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
            console.warn(`⚠️ DEBUG: Invalid Room ID provided: "${id}"`);
            return res.status(400).json({ message: 'Invalid Room ID' });
        }

        let messages = await Message.find({ 
            roomId: id,
            clearedBy: { $ne: req.user._id } // exclude messages cleared by this user
        })
            .sort({ timestamp: -1 }) // Get newest first for pagination
            .skip(skip)
            .limit(limit)
            .lean();

        // Use custom populate to handle both Students and Tutors
        messages = await populateUsers(messages, ['sender']);

        // Reverse back to chronological order for the UI
        messages.reverse();

        console.log(`✅ DEBUG: Found ${messages.length} messages`);
        res.json(messages);
    } catch (error) {
        console.error('❌ Get messages error:', error);
        res.status(500).json({
            message: 'Server error fetching messages',
            error: error.message
        });
    }
});

// @route   DELETE /api/groups/:id/messages/clear
// @desc    Clear chat history for the current user
// @access  Private
router.delete('/:id/messages/clear', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Add current user to clearedBy array of all existing messages in this room
        await Message.updateMany(
            { roomId: id },
            { $addToSet: { clearedBy: req.user._id } }
        );

        res.json({ message: 'Chat cleared successfully' });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({ message: 'Server error clearing chat' });
    }
});

// @route   POST /api/groups/:id/messages/attachment
// @desc    Upload an attachment for a chat message
// @access  Private
router.post('/:id/messages/attachment', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please select a file to upload' });
        }

        const { id } = req.params;
        const group = await Group.findById(id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to post in this group' });
        }

        // Automatically add this attachment as a group Resource
        await Resource.create({
            filename: req.file.filename,       // Cloudinary public_id
            originalName: req.file.originalname,
            fileUrl: req.file.path,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user._id,
            group: id,
        });

        // Return the Cloudinary URL and details for the chat message
        res.status(201).json({
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            fileType: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload attachment error:', error);
        res.status(500).json({ message: error.message || 'Server error uploading attachment' });
    }
});

export default router;
