import AWS from 'aws-sdk';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if real S3 credentials are configured
const isS3Configured = () => {
    return (
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_ACCESS_KEY_ID !== 'your_access_key_here' &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_SECRET_ACCESS_KEY !== 'your_secret_key_here'
    );
};

// Configure AWS S3 (only if credentials are real)
let s3Client = null;
if (isS3Configured()) {
    s3Client = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
    });
    console.log('☁️  S3 storage configured');
} else {
    console.log('📁 S3 not configured — using local file storage (server/uploads/)');
}

// Local uploads directory
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Upload a file to S3 or local storage (fallback)
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - File MIME type
 * @param {string} groupId - Group ID for organizing files
 * @returns {Object} { fileUrl, filename }
 */
export const uploadFile = async (fileBuffer, originalName, mimetype, groupId) => {
    const ext = path.extname(originalName);
    const uniqueName = `${groupId}/${nanoid(12)}${ext}`;

    if (s3Client) {
        // --- S3 Upload ---
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: uniqueName,
            Body: fileBuffer,
            ContentType: mimetype,
        };

        const result = await s3Client.upload(params).promise();
        return {
            fileUrl: result.Location,
            filename: uniqueName,
        };
    } else {
        // --- Local File Storage Fallback ---
        const groupDir = path.join(UPLOADS_DIR, groupId);

        // Ensure directory exists
        if (!fs.existsSync(groupDir)) {
            fs.mkdirSync(groupDir, { recursive: true });
        }

        const localFilename = `${nanoid(12)}${ext}`;
        const filePath = path.join(groupDir, localFilename);

        // Write file to disk
        fs.writeFileSync(filePath, fileBuffer);

        return {
            fileUrl: `/uploads/${groupId}/${localFilename}`,
            filename: `${groupId}/${localFilename}`,
        };
    }
};

/**
 * Delete a file from S3 or local storage
 * @param {string} filename - The stored filename (key)
 */
export const deleteFile = async (filename) => {
    if (s3Client) {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: filename,
        };
        await s3Client.deleteObject(params).promise();
    } else {
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

export { s3Client, isS3Configured };
