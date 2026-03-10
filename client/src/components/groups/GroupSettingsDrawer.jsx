import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Pen, Trash2, Copy, Users, UserMinus, LogOut,
    FolderOpen, Link, Shield, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ResourceUpload from '../resources/ResourceUpload';
import ResourceList from '../resources/ResourceList';

const GroupSettingsDrawer = ({ group, isOpen, onClose, onGroupUpdate, onNavigateAway }) => {
    const { user, api } = useAuth();
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: group?.name || '', description: group?.description || '' });
    const [activeSection, setActiveSection] = useState(null); // 'members' | 'resources' | null
    const [refreshResources, setRefreshResources] = useState(0);

    const isCreator = group?.createdBy?._id === user?._id;
    const groupId = group?._id;

    // Copy invite code
    const handleCopyCode = () => {
        navigator.clipboard.writeText(group.inviteCode);
        toast.success('Invite code copied!');
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/join/${group.inviteCode}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied!');
    };

    // Update group
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.put(`/groups/${groupId}`, editForm);
            onGroupUpdate(data);
            setEditing(false);
            toast.success('Group updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update');
        }
    };

    // Delete group
    const handleDelete = async () => {
        if (!window.confirm('Delete this group? This cannot be undone.')) return;
        try {
            await api.delete(`/groups/${groupId}`);
            toast.success('Group deleted');
            onNavigateAway();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    // Leave group
    const handleLeave = async () => {
        if (!window.confirm('Leave this group?')) return;
        try {
            await api.post(`/groups/${groupId}/leave`);
            toast.success('Left group');
            onNavigateAway();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to leave');
        }
    };

    // Remove member
    const handleRemoveMember = async (memberId, memberName) => {
        if (!window.confirm(`Remove ${memberName} from the group?`)) return;
        try {
            await api.delete(`/groups/${groupId}/members/${memberId}`);
            toast.success('Member removed');
            const { data } = await api.get(`/groups/${groupId}`);
            onGroupUpdate(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove');
        }
    };

    if (!group) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[101] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Group Settings</h2>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Group Info */}
                            <div className="p-6 flex flex-col items-center text-center border-b border-slate-100 dark:border-slate-800">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-lg shadow-orange-500/20">
                                    {group.name.charAt(0).toUpperCase()}
                                </div>

                                {editing ? (
                                    <form onSubmit={handleUpdate} className="w-full space-y-3 mt-2">
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-orange-500/30 outline-none text-slate-800 dark:text-white"
                                            required
                                        />
                                        <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-orange-500/30 outline-none resize-none text-slate-800 dark:text-white"
                                            rows={2}
                                            placeholder="Description..."
                                        />
                                        <div className="flex gap-2 justify-center">
                                            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">Save</button>
                                            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{group.name}</h3>
                                        {group.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                            {group.members?.length} members • Created by {group.createdBy?.name}
                                        </p>
                                        {isCreator && (
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="mt-3 flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                                            >
                                                <Pen className="w-3.5 h-3.5" /> Edit
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Invite Section */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Invite Code</p>
                                <div className="flex items-center gap-2">
                                    <span className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-mono text-orange-600 dark:text-orange-400 font-bold tracking-wider">
                                        {group.inviteCode}
                                    </span>
                                    <button onClick={handleCopyCode} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-500 hover:text-orange-500 transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleCopyLink} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-500 hover:text-orange-500 transition-colors">
                                        <Link className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                {/* Members */}
                                <button
                                    onClick={() => setActiveSection(activeSection === 'members' ? null : 'members')}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Members</span>
                                    <span className="text-xs text-slate-400">{group.members?.length}</span>
                                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === 'members' ? 'rotate-90' : ''}`} />
                                </button>

                                {/* Members Expand */}
                                <AnimatePresence>
                                    {activeSection === 'members' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-3 space-y-1">
                                                {group.members?.map(member => (
                                                    <div key={member._id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                                                            {member.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{member.name}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                                                        </div>
                                                        {group.createdBy?._id === member._id ? (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">Admin</span>
                                                        ) : isCreator && (
                                                            <button
                                                                onClick={() => handleRemoveMember(member._id, member.name)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            >
                                                                <UserMinus className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Resources */}
                                <button
                                    onClick={() => setActiveSection(activeSection === 'resources' ? null : 'resources')}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                        <FolderOpen className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Resources</span>
                                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === 'resources' ? 'rotate-90' : ''}`} />
                                </button>

                                {/* Resources Expand */}
                                <AnimatePresence>
                                    {activeSection === 'resources' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-3 space-y-3">
                                                <ResourceUpload
                                                    groupId={groupId}
                                                    onUploaded={() => setRefreshResources(n => n + 1)}
                                                />
                                                <ResourceList
                                                    groupId={groupId}
                                                    isCreator={isCreator}
                                                    refreshKey={refreshResources}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Danger Zone */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                                {isCreator ? (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Group
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleLeave}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
                                    >
                                        <LogOut className="w-4 h-4" /> Leave Group
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default GroupSettingsDrawer;
