import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Pen, Trash2, Copy, Users, UserMinus, LogOut,
    FolderOpen, Link, Shield, ShieldOff, ChevronRight, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ResourceList from '../resources/ResourceList';

const GroupSettingsDrawer = ({ group, isOpen, onClose, onGroupUpdate, onNavigateAway, refreshResourcesTrigger }) => {
    const { user, api } = useAuth();
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: group?.name || '', description: group?.description || '' });
    const [activeSection, setActiveSection] = useState(null); // 'members' | 'resources' | 'invite' | 'requests' | null
    const [expandedMembers, setExpandedMembers] = useState(false);
    const [refreshResources, setRefreshResources] = useState(0);

    // React to external refresh triggers (like a new chat upload)
    useEffect(() => {
        if (refreshResourcesTrigger > 0) {
            setRefreshResources(prev => prev + 1);
        }
    }, [refreshResourcesTrigger]);

    const isCreator = group?.createdBy?._id === user?._id || group?.createdBy === user?._id;
    const isAdmin = group?.admins?.some(admin => 
        (admin._id || admin) === user?._id
    ) || isCreator; // Fallback to isCreator if admins array isn't populated yet
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
            window.dispatchEvent(new Event('groupUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update');
        }
    };

    // Toggle Member Invites
    const handleToggleInvite = async () => {
        try {
            const { data } = await api.put(`/groups/${groupId}`, {
                membersCanInvite: !group.membersCanInvite
            });
            onGroupUpdate(data);
            toast.success(data.membersCanInvite ? 'Members can now invite' : 'Only admins can invite');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update invite settings');
        }
    };

    // Toggle Require Approval
    const handleToggleApproval = async () => {
        try {
            const { data } = await api.put(`/groups/${groupId}`, {
                requireApproval: !group.requireApproval
            });
            onGroupUpdate(data);
            toast.success(data.requireApproval ? 'New members now require approval' : 'Anyone can join instantly');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update approval settings');
        }
    };

    // Delete group
    const handleDelete = async () => {
        if (!window.confirm('Delete this group? This cannot be undone.')) return;
        try {
            await api.delete(`/groups/${groupId}`);
            toast.success('Group deleted');
            window.dispatchEvent(new Event('groupUpdated'));
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
            window.dispatchEvent(new Event('groupUpdated'));
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

    // Promote to Admin
    const handleMakeAdmin = async (memberId, memberName) => {
        if (!window.confirm(`Make ${memberName} an Admin?`)) return;
        try {
            await api.post(`/groups/${groupId}/admins/${memberId}`);
            toast.success(`${memberName} is now an Admin`);
            const { data } = await api.get(`/groups/${groupId}`);
            onGroupUpdate(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to make admin');
        }
    };

    // Demote Admin
    const handleRemoveAdmin = async (memberId, memberName) => {
        if (!window.confirm(`Remove Admin privileges from ${memberName}?`)) return;
        try {
            await api.delete(`/groups/${groupId}/admins/${memberId}`);
            toast.success(`${memberName} is no longer an Admin`);
            const { data } = await api.get(`/groups/${groupId}`);
            onGroupUpdate(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove admin');
        }
    };

    // Approve Join Request
    const handleApproveRequest = async (userId) => {
        try {
            const { data } = await api.post(`/groups/${groupId}/requests/${userId}/approve`);
            toast.success(`Request approved`);
            onGroupUpdate(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve request');
        }
    };

    // Reject Join Request
    const handleRejectRequest = async (userId) => {
        try {
            const { data } = await api.post(`/groups/${groupId}/requests/${userId}/reject`);
            toast.success(`Request rejected`);
            onGroupUpdate(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject request');
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
                        className="fixed right-0 top-0 h-full w-full max-w-md clay-card rounded-none z-[101] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/10 dark:border-slate-800/50">
                            <button
                                onClick={onClose}
                                className="clay-button-icon"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Group Settings</h2>
                            
                            {isAdmin && !editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                                >
                                    <Pen className="w-4 h-4" /> Edit
                                </button>
                            )}
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
                                            className="clay-input"
                                            required
                                        />
                                        <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            className="clay-input resize-none"
                                            rows={2}
                                            placeholder="Description..."
                                        />
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditing(false)} className="clay-button-secondary flex-1 py-2 rounded-xl">Cancel</button>
                                            <button type="submit" className="clay-button flex-1 py-2 rounded-xl">Save</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{group.name}</h3>
                                        {group.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                            {group.members?.length} members • Created by {group.createdBy?.name || 'Unknown'}
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                {/* Attachments */}
                                <div className="flex items-center gap-3 px-4 py-3 mt-2">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                        <FolderOpen className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Attachments</span>
                                </div>
                                <div className="px-4 pb-3 space-y-3">
                                    <ResourceList
                                        groupId={groupId}
                                        isCreator={isCreator}
                                        refreshKey={refreshResources}
                                    />
                                </div>

                                {/* Invitation Settings */}
                                {(isAdmin || group.membersCanInvite) ? (
                                    <>
                                        <button
                                            onClick={() => setActiveSection(activeSection === 'invite' ? null : 'invite')}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                                                <Link className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Invitation Settings</span>
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${activeSection === 'invite' ? 'rotate-90' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeSection === 'invite' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-3 pt-2">
                                                        <div className="clay-card !bg-white/50 dark:!bg-slate-800/50 !p-4">
                                                            <div className="flex items-center w-full mb-3">
                                                                
                                                                {/* Admin Toggle for Invites */}
                                                                {isAdmin && (
                                                                    <div className="flex flex-col gap-3 w-full">
                                                                        <div className="flex items-center justify-between gap-4 w-full">
                                                                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium tracking-wide">Members can invite:</span>
                                                                            <button 
                                                                                onClick={handleToggleInvite}
                                                                                className={`w-14 h-7 rounded-full transition-colors relative flex items-center shrink-0 shadow-inner ${group.membersCanInvite ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                                            >
                                                                                <span className={`absolute text-[10px] font-bold text-white transition-opacity duration-300 ${group.membersCanInvite ? 'left-2 opacity-100' : 'opacity-0'}`}>ON</span>
                                                                                <span className={`absolute text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-opacity duration-300 ${!group.membersCanInvite ? 'right-2 opacity-100' : 'opacity-0'}`}>OFF</span>
                                                                                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-transform duration-300 ${group.membersCanInvite ? 'translate-x-8' : 'translate-x-1'}`} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex items-center justify-between gap-4 w-full">
                                                                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium tracking-wide">Require approval:</span>
                                                                            <button 
                                                                                onClick={handleToggleApproval}
                                                                                className={`w-14 h-7 rounded-full transition-colors relative flex items-center shrink-0 shadow-inner ${group.requireApproval ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                                            >
                                                                                <span className={`absolute text-[10px] font-bold text-white transition-opacity duration-300 ${group.requireApproval ? 'left-2 opacity-100' : 'opacity-0'}`}>ON</span>
                                                                                <span className={`absolute text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-opacity duration-300 ${!group.requireApproval ? 'right-2 opacity-100' : 'opacity-0'}`}>OFF</span>
                                                                                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-transform duration-300 ${group.requireApproval ? 'translate-x-8' : 'translate-x-1'}`} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm font-mono text-orange-600 dark:text-orange-400 font-bold tracking-wider text-center">
                                                                    {group.inviteCode}
                                                                </span>
                                                                <button onClick={handleCopyCode} className="clay-button-icon shrink-0 !w-9 !h-9">
                                                                    <Copy className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={handleCopyLink} className="clay-button-icon shrink-0 !w-9 !h-9">
                                                                    <Link className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <div className="px-4 py-3 border-b border-white/5 dark:border-slate-800/30 text-center">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Only admins can invite new members to this group.</p>
                                    </div>
                                )}
                                {/* Members */}
                                <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Members</span>
                                    <span className="text-xs text-slate-400">{group.members?.length}</span>
                                </div>

                                <div className="px-4 pb-3 space-y-1">
                                                {(() => {
                                                    // Sorting Members:
                                                    // 1. Current User
                                                    // 2. Admins
                                                    // 3. Regular Members
                                                    const sortedMembers = [...(group.members || [])].sort((a, b) => {
                                                        const aIsMe = a._id === user._id;
                                                        const bIsMe = b._id === user._id;
                                                        if (aIsMe) return -1;
                                                        if (bIsMe) return 1;

                                                        const aIsAdmin = group.admins?.some(admin => (admin._id || admin) === a._id) || group.createdBy?._id === a._id;
                                                        const bIsAdmin = group.admins?.some(admin => (admin._id || admin) === b._id) || group.createdBy?._id === b._id;
                                                        if (aIsAdmin && !bIsAdmin) return -1;
                                                        if (!aIsAdmin && bIsAdmin) return 1;

                                                        return 0; // maintain relative order for others
                                                    });

                                                    const displayedMembers = expandedMembers ? sortedMembers : sortedMembers.slice(0, 3);
                                                    
                                                    return displayedMembers.map(member => {
                                                        const isMemberAdmin = group.admins?.some(admin => (admin._id || admin) === member._id) 
                                                                            || (group.createdBy?._id === member._id);
                                                        const isMemberCreator = group.createdBy?._id === member._id;
                                                        const isMe = member._id === user._id;

                                                        return (
                                                            <div key={member._id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                                                                    {member.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{member.name}</p>
                                                                    <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                                                                </div>

                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {isMe && (
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">You</span>
                                                                    )}
                                                                    {isMemberAdmin && !isMe ? (
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">Admin</span>
                                                                    ) : null}

                                                                    {isAdmin && !isMe && (
                                                                        <div className="flex items-center gap-1 transition-opacity shrink-0">
                                                                            {isMemberAdmin ? (
                                                                                !isMemberCreator && (
                                                                                    <button
                                                                                        onClick={() => handleRemoveAdmin(member._id, member.name)}
                                                                                        title="Remove Admin"
                                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                                                                    >
                                                                                        <ShieldOff className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleMakeAdmin(member._id, member.name)}
                                                                                    title="Make Admin"
                                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                                                >
                                                                                    <Shield className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                            
                                                                            <button
                                                                                onClick={() => handleRemoveMember(member._id, member.name)}
                                                                                title="Remove Member"
                                                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                            >
                                                                                <UserMinus className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                                
                                                {/* Expand Members Button */}
                                                {(group.members?.length || 0) > 3 && (
                                                    <button
                                                        onClick={() => setExpandedMembers(!expandedMembers)}
                                                        className="w-full mt-2 py-2 text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                                    >
                                                        {expandedMembers ? 'Show less' : `Show all ${group.members.length} members`}
                                                    </button>
                                                )}
                                </div>



                                {/* Pending Requests */}
                                {isAdmin && group.joinRequests && group.joinRequests.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => setActiveSection(activeSection === 'requests' ? null : 'requests')}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                <span className="relative flex h-3 w-3 absolute -top-1 -right-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                                </span>
                                                <Users className="w-4 h-4 text-orange-500 absolute" />
                                            </div>
                                            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 text-left">Pending Requests</span>
                                            <span className="text-xs text-white bg-orange-500 px-2 py-0.5 rounded-full font-bold">{group.joinRequests.length}</span>
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === 'requests' ? 'rotate-90' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeSection === 'requests' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-3 space-y-1 mt-2">
                                                        {group.joinRequests.map(requestUser => (
                                                            <div key={requestUser._id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                                                                    {requestUser.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{requestUser.name}</p>
                                                                    <p className="text-[11px] text-slate-400 truncate">{requestUser.email}</p>
                                                                </div>
                                                                <div className="flex gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => handleApproveRequest(requestUser._id)}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectRequest(requestUser._id)}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div className="p-4 border-t border-white/10 dark:border-slate-800/50 mt-2">
                                {isAdmin ? (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl clay-button-secondary !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/10 transition-colors text-sm font-medium mb-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Group
                                    </button>
                                ) : null}
                                <button
                                    onClick={handleLeave}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl clay-button-secondary !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/10 transition-colors text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" /> Leave Group
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default GroupSettingsDrawer;
