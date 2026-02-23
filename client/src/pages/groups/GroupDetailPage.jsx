import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Users,
    Copy,
    Check,
    Pen,
    Trash2,
    FolderOpen,
    UserCircle,
    LogOut,
    UserMinus,
    MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import GlassCard from '../../components/layout/GlassCard';
import ResourceUpload from '../../components/resources/ResourceUpload';
import ResourceList from '../../components/resources/ResourceList';
import LoadingPage from '../../components/LoadingPage';
import ChatRoom from '../../components/chat/ChatRoom';

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, api } = useAuth();

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resources');
    const [copied, setCopied] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [refreshResources, setRefreshResources] = useState(0);

    // Fetch group details
    useEffect(() => {
        const fetchGroup = async () => {
            try {
                const { data } = await api.get(`/groups/${id}`);
                setGroup(data);
                setEditForm({ name: data.name, description: data.description || '' });
            } catch (error) {
                console.error('Fetch group error:', error);
                toast.error('Failed to load group');
                navigate('/groups');
            } finally {
                setLoading(false);
            }
        };

        fetchGroup();
    }, [id]);

    const isCreator = group?.createdBy?._id === user?._id;

    // Copy invite code
    const handleCopyCode = () => {
        navigator.clipboard.writeText(group.inviteCode);
        setCopied(true);
        toast.success('Invite code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Update group
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.put(`/groups/${id}`, editForm);
            setGroup(data);
            setEditing(false);
            toast.success('Group updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update group');
        }
    };

    // Delete group
    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/groups/${id}`);
            toast.success('Group deleted');
            navigate('/groups');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete group');
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (!group) return null;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Back Button */}
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate('/groups')}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Groups
            </motion.button>

            {/* Group Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <GlassCard withGlow className="mb-6">
                    {editing ? (
                        /* Edit Form */
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="glass-input text-xl font-bold"
                                required
                            />
                            <textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="glass-input resize-none"
                                rows={2}
                                placeholder="Group description..."
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="glass-button text-sm py-2">
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="glass-button-secondary text-sm py-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {group.name}
                                    </h1>
                                    {group.description && (
                                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                                            {group.description}
                                        </p>
                                    )}
                                </div>

                                {isCreator ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="glass-button-icon"
                                            title="Edit group"
                                        >
                                            <Pen className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="glass-button-icon hover:!text-red-500"
                                            title="Delete group"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                toast.custom((t) => (
                                                    <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/5 p-6 rounded-2xl max-w-sm w-full pointer-events-auto">
                                                        <div className="flex items-start gap-4">
                                                            <div className="p-3 bg-red-500/10 rounded-full">
                                                                <LogOut className="w-6 h-6 text-red-500" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Leave Group?</h3>
                                                                <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">Really want to leave this group?</p>
                                                                <div className="flex gap-3">
                                                                    <button
                                                                        onClick={async () => {
                                                                            toast.dismiss(t.id);
                                                                            try {
                                                                                await api.post(`/groups/${id}/leave`);
                                                                                toast.success('Left group successfully');
                                                                                navigate('/groups');
                                                                            } catch (error) {
                                                                                toast.error(error.response?.data?.message || 'Failed to leave group');
                                                                            }
                                                                        }}
                                                                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-colors"
                                                                    >
                                                                        Leave
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toast.dismiss(t.id)}
                                                                        className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            }}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 dark:border-red-900/30 transition-all duration-200 text-sm font-medium flex items-center gap-2"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Leave Group
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Invite Code & Share Link */}
                            <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Invite Members
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Share the code or sending a direct link.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {/* Copy Code */}
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <code className="text-sm font-mono text-primary-600 dark:text-primary-400 tracking-wider">
                                            {group.inviteCode}
                                        </code>
                                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                                        <button
                                            onClick={handleCopyCode}
                                            className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors text-xs font-medium flex items-center gap-1"
                                            title="Copy Code"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            Code
                                        </button>
                                    </div>

                                    {/* Copy Link */}
                                    <button
                                        onClick={() => {
                                            const link = `${window.location.origin}/join/${group.inviteCode}`;
                                            navigator.clipboard.writeText(link);
                                            toast.success('Invite link copied!');
                                        }}
                                        className="glass-button-secondary text-xs py-1.5 px-3 flex items-center gap-2"
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        Copy Link
                                    </button>
                                </div>
                            </div>

                            {/* Stats bar */}
                            <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    {group.members?.length} members
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium">
                                    Created by {group.createdBy?.name}
                                </span>
                            </div>
                        </>
                    )}
                </GlassCard>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 glass-card !p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'resources'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    <FolderOpen className="h-4 w-4" />
                    Resources
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'members'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Members
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'chat'
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    Live Chat
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'resources' ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    {/* Upload Area */}
                    <ResourceUpload
                        groupId={id}
                        onUploaded={() => setRefreshResources((n) => n + 1)}
                    />

                    {/* Resource List */}
                    <ResourceList
                        groupId={id}
                        isCreator={isCreator}
                        refreshKey={refreshResources}
                    />
                </motion.div>
            ) : activeTab === 'members' ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <GlassCard>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Group Members ({group.members?.length})
                        </h3>
                        <div className="space-y-3">
                            {group.members?.map((member) => (
                                <div
                                    key={member._id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold text-sm">
                                            {member.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-100">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {group.createdBy?._id === member._id ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium">
                                                Creator
                                            </span>
                                        ) : isCreator && (
                                            <button
                                                onClick={() => {
                                                    toast.custom((t) => (
                                                        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/5 p-6 rounded-2xl max-w-sm w-full pointer-events-auto">
                                                            <div className="flex items-start gap-4">
                                                                <div className="p-3 bg-red-500/10 rounded-full">
                                                                    <UserMinus className="w-6 h-6 text-red-500" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">Remove Member?</h3>
                                                                    <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">Really want to remove <b>{member.name}</b>?</p>
                                                                    <div className="flex gap-3">
                                                                        <button
                                                                            onClick={async () => {
                                                                                toast.dismiss(t.id);
                                                                                try {
                                                                                    await api.delete(`/groups/${id}/members/${member._id}`);
                                                                                    toast.success('Member removed');
                                                                                    // Refresh group data
                                                                                    const { data } = await api.get(`/groups/${id}`);
                                                                                    setGroup(data);
                                                                                } catch (error) {
                                                                                    toast.error(error.response?.data?.message || 'Failed to remove member');
                                                                                }
                                                                            }}
                                                                            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-colors"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                        <button
                                                                            onClick={() => toast.dismiss(t.id)}
                                                                            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ));
                                                }}
                                                className="glass-button-icon !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20"
                                                title="Remove member"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            ) : activeTab === 'chat' ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <ChatRoom groupId={id} />
                </motion.div>
            ) : null}
        </div>
    );
};

export default GroupDetailPage;
