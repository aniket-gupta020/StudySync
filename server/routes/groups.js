import express from 'express';
import Group from '../models/Group.js';
import Message from '../models/Message.js';
import Resource from '../models/Resource.js';
import Whiteboard from '../models/Whiteboard.js';
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

        groups = await populateUsers(groups, ['createdBy', 'members', 'admins', 'joinRequests']);

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
        const { name, description, groupPicture } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Please provide a group name' });
        }

        let group = await Group.create({
            name,
            description,
            groupPicture: groupPicture || '',
            createdBy: req.user._id,
            admins: [req.user._id],
        });

        group = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

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

        group = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

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

        // Check if user is an admin or the creator
        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString()) || 
                        (group.createdBy && group.createdBy.toString() === req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can update this group' });
        }

        const { name, description, membersCanInvite, requireApproval } = req.body;

        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (membersCanInvite !== undefined) group.membersCanInvite = membersCanInvite;
        if (requireApproval !== undefined) group.requireApproval = requireApproval;

        await group.save();

        group = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

        res.json(group);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ message: 'Server error updating group' });
    }
});

// @route   POST /api/groups/:id/picture
// @desc    Upload group picture
// @access  Private (Admins only)
router.post('/:id/picture', protect, upload.single('groupPicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please select an image file to upload' });
        }

        let group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString()) || 
                        (group.createdBy && group.createdBy.toString() === req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can change the group picture' });
        }

        group.groupPicture = req.file.path;
        await group.save();

        group = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

        res.json(group);
    } catch (error) {
        console.error('Group picture upload error:', error);
        res.status(500).json({ message: 'Server error uploading group picture' });
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

        // Check if user is an admin or the creator
        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can delete this group' });
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

        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );

        if (isMember) {
            return res.status(400).json({ message: 'You are already a member of this group' });
        }

        // Check if user is already in approvals queue
        const isPending = group.joinRequests && group.joinRequests.some(
            (request) => request.toString() === req.user._id.toString()
        );

        if (isPending) {
            return res.status(400).json({ message: 'Your request to join this group is already pending approval by admins' });
        }

        if (group.requireApproval) {
            group.joinRequests.push(req.user._id);
            await group.save();
            return res.status(202).json({ message: 'Join request sent to admins! 🕒', pending: true });
        } else {
            group.members.push(req.user._id);
            await group.save();
            
            group = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);
            return res.status(200).json(group);
        }
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

        // Remove user from admins array
        group.admins = group.admins.filter(
            (admin) => admin.toString() !== req.user._id.toString()
        );

        // If there are no admins left, promote the oldest member
        if (group.admins.length === 0) {
            if (group.members.length > 0) {
                // The participant who joined next becomes the new admin
                group.admins.push(group.members[0]);
                await group.save();
            } else {
                // No members left, delete the group entirely
                await group.deleteOne();
                // Delete associated messages
                await Message.deleteMany({ roomId: req.params.id });
                return res.json({ message: 'Group deleted since no members left' });
            }
        } else {
            // Still admins left
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

        // Check if user is an admin or creator
        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can remove members' });
        }

        const memberIdToRemove = req.params.userId;

        // cannot remove yourself
        if (memberIdToRemove === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot remove yourself. Leave the group instead.' });
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

        // Remove from admins just in case
        group.admins = group.admins.filter(
            (admin) => admin.toString() !== memberIdToRemove
        );

        console.log('DEBUG: Group members after filter:', group.members);
        await group.save();

        // Re-populate to return the updated list
        const updatedGroup = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

        res.json(updatedGroup);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error removing member' });
    }
});

// @route   POST /api/groups/:id/admins/:userId
// @desc    Promote a member to admin
// @access  Private (Admins only)
router.post('/:id/admins/:userId', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is an admin or creator
        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can promote members' });
        }

        const memberIdToPromote = req.params.userId;

        // Check if user is actually a member
        const isMember = group.members.some(
            (member) => member.toString() === memberIdToPromote
        );

        if (!isMember) {
            return res.status(404).json({ message: 'User is not a member of this group' });
        }

        // Promote to admin if not already
        const isAlreadyAdmin = group.admins.some(
            (admin) => admin.toString() === memberIdToPromote
        );

        if (!isAlreadyAdmin) {
            group.admins.push(memberIdToPromote);
            await group.save();
        }

        // Re-populate to return the updated list
        const updatedGroup = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

        res.json(updatedGroup);
    } catch (error) {
        console.error('Promote member error:', error);
        res.status(500).json({ message: 'Server error promoting member' });
    }
});

// @route   DELETE /api/groups/:id/admins/:userId
// @desc    Demote an admin to a regular member
// @access  Private (Admins only)
router.delete('/:id/admins/:userId', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is an admin or creator
        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can demote members' });
        }

        const adminIdToDemote = req.params.userId;

        // Cannot demote group creator
        if (group.createdBy.toString() === adminIdToDemote) {
            return res.status(400).json({ message: 'Cannot demote the original group creator' });
        }
        
        // Cannot demote yourself
        if (adminIdToDemote === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot demote yourself. Leave the group instead.' });
        }

        // Check if user is actually an admin
        const isTargetAdmin = group.admins.some(
            (admin) => admin.toString() === adminIdToDemote
        );

        if (!isTargetAdmin) {
            return res.status(400).json({ message: 'User is not an admin' });
        }

        // Demote admin
        group.admins = group.admins.filter(
            (admin) => admin.toString() !== adminIdToDemote
        );

        await group.save();

        // Re-populate to return the updated list
        const updatedGroup = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);

        res.json(updatedGroup);
    } catch (error) {
        console.error('Demote admin error:', error);
        res.status(500).json({ message: 'Server error demoting admin' });
    }
});

// @route   POST /api/groups/:id/requests/:userId/approve
// @desc    Approve a join request
// @access  Private (Admins only)
router.post('/:id/requests/:userId/approve', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) return res.status(403).json({ message: 'Only admins can approve requests' });

        const userId = req.params.userId;

        const isAlreadyMember = group.members.some(m => m.toString() === userId.toString());
        if (!isAlreadyMember) {
            group.members.push(userId);
        }
        
        group.joinRequests = group.joinRequests.filter(reqId => reqId.toString() !== userId);
        
        await group.save();
        const updatedGroup = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);
        res.json(updatedGroup);
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ message: 'Server error approving request' });
    }
});

// @route   POST /api/groups/:id/requests/:userId/reject
// @desc    Reject a join request
// @access  Private (Admins only)
router.post('/:id/requests/:userId/reject', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isAdmin = group.admins.some((admin) => admin.toString() === req.user._id.toString())
                        || group.createdBy.toString() === req.user._id.toString();
        if (!isAdmin) return res.status(403).json({ message: 'Only admins can reject requests' });

        const userId = req.params.userId;

        // Remove from requests
        group.joinRequests = group.joinRequests.filter(reqId => reqId.toString() !== userId);
        
        await group.save();
        const updatedGroup = await populateUsers(group, ['createdBy', 'members', 'admins', 'joinRequests']);
        res.json(updatedGroup);
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ message: 'Server error rejecting request' });
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

// @route   GET /api/groups/:id/search
// @desc    Search messages and resources in a group
// @access  Private
router.get('/:id/search', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(
            (member) => member.toString() === req.user._id.toString()
        );
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const searchRegex = new RegExp(q, 'i');

        // Search Messages
        let messages = await Message.find({
            roomId: id,
            $or: [
                { text: searchRegex },
                { 'attachment.fileName': searchRegex }
            ],
            clearedBy: { $ne: req.user._id }
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

        messages = await populateUsers(messages, ['sender']);

        // Search Resources
        let resources = await Resource.find({
            group: id,
            originalName: searchRegex
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

        resources = await populateUsers(resources, ['uploadedBy']);

        // Format results
        const results = [
            ...messages.map(m => ({
                type: 'message',
                id: m._id,
                content: m.text || m.attachment?.fileName,
                timestamp: m.timestamp,
                sender: m.sender,
                attachment: m.attachment
            })),
            ...resources.map(r => ({
                type: 'file',
                id: r._id,
                content: r.originalName,
                timestamp: r.createdAt,
                sender: r.uploadedBy,
                fileUrl: r.fileUrl,
                fileType: r.fileType
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error during search' });
    }
});

// @route   GET /api/groups/:id/whiteboards
// @desc    Get all whiteboards for a group
// @access  Private
router.get('/:id/whiteboards', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const whiteboards = await Whiteboard.find({ groupId: id }).sort({ createdAt: -1 });
        res.json(whiteboards);
    } catch (error) {
        console.error('Get whiteboards error:', error);
        res.status(500).json({ message: 'Server error fetching whiteboards' });
    }
});

// @route   POST /api/groups/:id/whiteboards
// @desc    Create a new whiteboard
// @access  Private
router.post('/:id/whiteboards', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, canvasData } = req.body;

        if (!name) return res.status(400).json({ message: 'Whiteboard name is required' });

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const whiteboard = await Whiteboard.create({
            groupId: id,
            name,
            canvasData: canvasData || ''
        });

        res.status(201).json(whiteboard);
    } catch (error) {
        console.error('Create whiteboard error:', error);
        res.status(500).json({ message: 'Server error creating whiteboard' });
    }
});

// @route   PUT /api/groups/:id/whiteboards/:whiteboardId
// @desc    Update a whiteboard (rename / save canvas data)
// @access  Private
router.put('/:id/whiteboards/:whiteboardId', protect, async (req, res) => {
    try {
        const { id, whiteboardId } = req.params;
        const { name, canvasData } = req.body;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const whiteboard = await Whiteboard.findOne({ _id: whiteboardId, groupId: id });
        if (!whiteboard) return res.status(404).json({ message: 'Whiteboard not found' });

        if (name !== undefined) whiteboard.name = name;
        if (canvasData !== undefined) whiteboard.canvasData = canvasData;

        await whiteboard.save();
        res.json(whiteboard);
    } catch (error) {
        console.error('Update whiteboard error:', error);
        res.status(500).json({ message: 'Server error updating whiteboard' });
    }
});

// @route   DELETE /api/groups/:id/whiteboards/:whiteboardId
// @desc    Delete a whiteboard
// @access  Private
router.delete('/:id/whiteboards/:whiteboardId', protect, async (req, res) => {
    try {
        const { id, whiteboardId } = req.params;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const whiteboard = await Whiteboard.findOne({ _id: whiteboardId, groupId: id });
        if (!whiteboard) return res.status(404).json({ message: 'Whiteboard not found' });

        await whiteboard.deleteOne();
        res.json({ message: 'Whiteboard deleted successfully' });
    } catch (error) {
        console.error('Delete whiteboard error:', error);
        res.status(500).json({ message: 'Server error deleting whiteboard' });
    }
});

export default router;
