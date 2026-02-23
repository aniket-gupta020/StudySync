import express from 'express';
import Resource from '../models/Resource.js';
import { protect } from '../middleware/auth.js';
import { groupMember } from '../middleware/groupMember.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import { populateUsers } from '../utils/populate.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication + group membership
router.use(protect, groupMember);

// ═══════════════════════════════════════════════════════════════════
// @route   POST /api/groups/:groupId/resources
// @desc    Upload a file resource to a group (stored on Cloudinary)
// @access  Private — group members only
// ═══════════════════════════════════════════════════════════════════
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please select a file to upload' });
        }

        const { groupId } = req.params;

        // multer-storage-cloudinary sets:
        //   req.file.path     → Cloudinary secure_url
        //   req.file.filename → Cloudinary public_id
        let resource = await Resource.create({
            filename: req.file.filename,       // public_id  (needed for delete)
            originalName: req.file.originalname,    // original name user uploaded
            fileUrl: req.file.path,            // Cloudinary CDN URL
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user._id,
            group: groupId,
        });

        // Return resource with uploader info populated
        resource = await populateUsers(resource, ['uploadedBy']);

        res.status(201).json(resource);
    } catch (error) {
        console.error('Upload resource error:', error);

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size exceeds the 10 MB limit' });
        }

        res.status(500).json({ message: error.message || 'Server error uploading resource' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// @route   GET /api/groups/:groupId/resources
// @desc    Get all resources for a group (newest first)
// @access  Private — group members only
// ═══════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        let resources = await Resource.find({ group: req.params.groupId })
            .sort({ createdAt: -1 });

        resources = await populateUsers(resources, ['uploadedBy']);

        res.json(resources);
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ message: 'Server error fetching resources' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// @route   DELETE /api/groups/:groupId/resources/:resourceId
// @desc    Delete a resource (uploader or group creator only)
// @access  Private — group members only
// ═══════════════════════════════════════════════════════════════════
router.delete('/:resourceId', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.resourceId);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Permission check — only uploader or group creator may delete
        const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
        const isGroupCreator = req.group.createdBy.toString() === req.user._id.toString();

        if (!isUploader && !isGroupCreator) {
            return res.status(403).json({
                message: 'Only the uploader or group creator can delete this resource',
            });
        }

        // Remove file from Cloudinary
        // Try each resource_type until one succeeds (Cloudinary needs the correct type)
        const publicId = resource.filename;
        try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch {
            try {
                await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            } catch {
                await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
            }
        }

        // Remove metadata from MongoDB
        await resource.deleteOne();

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ message: 'Server error deleting resource' });
    }
});

export default router;
