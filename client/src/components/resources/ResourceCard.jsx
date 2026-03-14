import { motion } from 'framer-motion';
import {
    FileText,
    Image,
    FileSpreadsheet,
    FileCode,
    File,
    Download,
    Trash2,
    Clock,
    Music,
    Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Map MIME types to icons and colors
const getFileInfo = (mimeType) => {
    if (mimeType?.includes('pdf')) {
        return { icon: FileText, colorClass: 'file-icon-pdf', label: 'PDF' };
    }
    if (mimeType?.includes('word') || mimeType?.includes('document')) {
        return { icon: FileText, colorClass: 'file-icon-doc', label: 'DOC' };
    }
    if (mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) {
        return { icon: FileSpreadsheet, colorClass: 'file-icon-sheet', label: 'XLS' };
    }
    if (mimeType?.includes('image')) {
        return { icon: Image, colorClass: 'file-icon-image', label: 'IMG' };
    }
    if (mimeType?.includes('audio')) {
        return { icon: Music, colorClass: 'file-icon-audio', label: 'AUD' };
    }
    if (mimeType?.includes('video')) {
        return { icon: Video, colorClass: 'file-icon-video', label: 'VID' };
    }
    if (
        mimeType?.includes('json') ||
        mimeType?.includes('javascript') ||
        mimeType?.includes('text/plain') ||
        mimeType?.includes('markdown')
    ) {
        return { icon: FileCode, colorClass: 'file-icon-code', label: 'TXT' };
    }
    return { icon: File, colorClass: 'file-icon-default', label: 'FILE' };
};

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ResourceCard = ({ resource, isCreator, onDelete }) => {
    const { user } = useAuth();
    const { icon: FileIcon, colorClass, label } = getFileInfo(resource.fileType);
    const isUploader = resource.uploadedBy?._id === user?._id;
    const canDelete = isUploader || isCreator;

    const uploadDate = new Date(resource.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    // Build download URL
    // Build download URL
    const downloadUrl = resource.fileUrl;

    return (
        <div className="clay-card !p-4 group">
            <div className="flex items-start gap-3">
                {/* File Icon */}
                <div className={`h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <FileIcon className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate text-sm">
                        {resource.originalName}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                        <span>{formatFileSize(resource.fileSize)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                            {label}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="clay-button-icon !p-1.5"
                        title="Download"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </a>

                    {canDelete && (
                        <button
                            onClick={() => onDelete(resource._id)}
                            className="clay-button-icon !p-1.5 hover:!text-red-500"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    by {resource.uploadedBy?.name || 'Unknown'}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    <Clock className="h-3 w-3" />
                    {uploadDate}
                </div>
            </div>
        </div>
    );
};

export default ResourceCard;
