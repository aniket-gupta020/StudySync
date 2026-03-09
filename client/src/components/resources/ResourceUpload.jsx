import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ResourceUpload = ({ groupId, onUploaded }) => {
    const { api } = useAuth();

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);

        const dropped = e.dataTransfer.files[0];
        if (dropped) {
            validateAndSet(dropped);
        }
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            validateAndSet(selected);
        }
    };

    const validateAndSet = (file) => {
        // 10 MB limit
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be under 10MB');
            return;
        }
        setFile(file);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/groups/${groupId}/resources`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const pct = Math.round((e.loaded * 100) / e.total);
                    setProgress(pct);
                },
            });

            toast.success('File uploaded successfully! 📁');
            setFile(null);
            setProgress(0);
            onUploaded();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to upload file';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const UploadUI = ({ isMobile = false }) => (
        <div className={`
            ${isMobile ? 'p-6 pb-8' : 'clay-card'} 
            ${isMobile && 'bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-3xl'}
        `}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Upload Resource
                </h3>
                {isMobile && (
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="clay-button-icon"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {!file ? (
                /* Drop Zone */
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-primary-500/5'
                        }`}
                >
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                        Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-400">
                        PDF, Word, Excel, PowerPoint, Images, Text — max 10MB
                    </p>

                    <input
                        ref={inputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.txt,.csv,.md,.json,.zip,.rar"
                    />
                </div>
            ) : (
                /* File Preview */
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                            <File className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                {file.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatFileSize(file.size)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {!uploading && (
                            <button
                                onClick={() => setFile(null)}
                                className="clay-button-icon !p-1.5"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleUpload}
                            disabled={uploading}
                            className="clay-button text-sm py-2 px-4 flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {progress}%
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Upload Progress Bar */}
            {uploading && (
                <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                    />
                </div>
            )}
        </div>
    );

    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop View */}
            <div className="hidden md:block">
                <UploadUI />
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen(true)}
                    className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center"
                >
                    <Upload className="h-6 w-6" />
                </motion.button>

                {/* Mobile Drawer Overlay */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full relative pointer-events-auto"
                        >
                            <UploadUI isMobile={true} />
                        </motion.div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ResourceUpload;
