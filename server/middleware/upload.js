import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// ─── Allowed MIME Types ────────────────────────────────────────────
const ALLOWED_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Text / Code
    'text/plain',
    'text/rtf',
    'text/csv',
    'text/markdown',
    'application/json',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
];

// ─── Cloudinary Storage via multer-storage-cloudinary ──────────────
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'studysync/resources',   // All uploads go into this Cloudinary folder
        resource_type: 'auto',           // auto-detect: image, video, or raw (PDF, docs…)
        allowed_formats: null,           // We rely on fileFilter instead
        public_id: (req, file) => {
            // Get extension
            const ext = file.originalname.split('.').pop();
            // Create a unique readable name without stripping extension for 'auto' resource type
            const cleanName = file.originalname
                .replace(/\.[^/.]+$/, '')     // strip extension for the name part
                .replace(/[^a-zA-Z0-9_-]/g, '_'); // sanitise
            return `${Date.now()}_${cleanName}.${ext}`;
        },
    },
});

// ─── Multer Instance ───────────────────────────────────────────────
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10 MB
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `File type not allowed: ${file.mimetype}. Allowed: PDF, Word, Excel, PowerPoint, Audio, Videos, Images, Text, CSV, JSON, Archives.`
                ),
                false
            );
        }
    },
});

export default upload;
