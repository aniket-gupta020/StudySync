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

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'studysync/resources',
        // Explicitly set resource_type based on file mimetype
        resource_type: (req, file) => {
            if (file.mimetype.startsWith('image/')) return 'image';
            if (file.mimetype.startsWith('video/')) return 'video';
            return 'raw';
        },
        public_id: (req, file) => {
            // Get original extension
            const ext = file.originalname.split('.').pop();
            // Create a unique name without extension
            const cleanName = file.originalname
                .split('.')
                .slice(0, -1)
                .join('.')
                .replace(/[^a-zA-Z0-9_-]/g, '_');
            
            // For 'raw' files (PDFs, ZIPs, Docs), we MUST include the extension in public_id
            // so that Cloudinary serves the file with that extension in the URL.
            const isRaw = !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/');
            if (isRaw && ext) {
                return `${Date.now()}_${cleanName}.${ext}`;
            }
            return `${Date.now()}_${cleanName}`;
        },
    },
});

// ─── Multer Instance ───────────────────────────────────────────────
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,  // 50 MB
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
