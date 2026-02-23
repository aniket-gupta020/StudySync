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
    // Text / Code
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
];

// ─── Cloudinary Storage via multer-storage-cloudinary ──────────────
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'studysync/resources',   // All uploads go into this Cloudinary folder
        resource_type: 'auto',           // auto-detect: image, video, or raw (PDF, docs…)
        allowed_formats: null,           // We rely on fileFilter instead
        public_id: (req, file) => {
            // Create a unique readable name:  1708234567890_My-Notes
            const cleanName = file.originalname
                .replace(/\.[^/.]+$/, '')     // strip extension
                .replace(/[^a-zA-Z0-9_-]/g, '_'); // sanitise
            return `${Date.now()}_${cleanName}`;
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
                    `File type not allowed: ${file.mimetype}. Allowed: PDF, Word, Excel, PowerPoint, images, text, CSV, JSON, ZIP.`
                ),
                false
            );
        }
    },
});

export default upload;
