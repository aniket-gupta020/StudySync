import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const JoinGroupModal = ({ onClose, onJoined }) => {
    const { api } = useAuth();

    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!inviteCode.trim()) {
            toast.error('Please enter an invite code');
            return;
        }

        setLoading(true);

        try {
            const { data } = await api.post(`/groups/join/${inviteCode.trim()}`);
            toast.success('Joined group successfully! 🎉');
            onJoined(data);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to join group';
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
                className="glass-modal p-6 w-full max-w-md mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Join a Study Group
                    </h2>
                    <button
                        onClick={onClose}
                        className="glass-button-icon"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Info */}
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Enter the invite code shared by your group member to join their study group.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Invite Code
                        </label>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Paste invite code here"
                            required
                            className="glass-input text-center text-lg tracking-wider font-mono"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="glass-button-secondary flex-1 py-3 text-center"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="glass-button flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    Join Group
                                </>
                            )}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default JoinGroupModal;
