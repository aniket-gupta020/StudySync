import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CreateGroupModal = ({ onClose, onCreated }) => {
    const { api } = useAuth();

    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                return toast.error('File size must be less than 5MB');
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await api.post('/groups', formData);
            
            if (imageFile) {
                const imgData = new FormData();
                imgData.append('groupPicture', imageFile);
                await api.post(`/groups/${data._id}/picture`, imgData);
            }

            toast.success('Study group created! 🎉');
            window.dispatchEvent(new Event('groupUpdated'));
            onCreated(data);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create group';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="clay-modal p-6 w-full max-w-md mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Create Study Group
                    </h2>
                    <button
                        onClick={onClose}
                        className="clay-button-icon"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Group Icon Upload */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-inner">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                                <Plus className="h-8 w-8 text-slate-400" />
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                            <Plus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Group Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g., CS101 Study Group"
                            required
                            maxLength={100}
                            className="clay-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="What will your group study? (optional)"
                            maxLength={500}
                            rows={3}
                            className="clay-input resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="clay-button-secondary flex-1 py-3 text-center"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="clay-button flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Create
                                </>
                            )}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateGroupModal;
