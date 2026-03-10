import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Search, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';

const GroupSidebar = ({ groups, activeGroupId, onGroupSelect, onGroupsChange }) => {
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const filtered = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase())
    );

    const handleGroupCreated = (newGroup) => {
        onGroupsChange(prev => [newGroup, ...prev]);
        setShowCreateModal(false);
        onGroupSelect(newGroup._id);
    };

    const handleGroupJoined = (joinedGroup) => {
        onGroupsChange(prev => [joinedGroup, ...prev]);
        setShowJoinModal(false);
        onGroupSelect(joinedGroup._id);
    };

    return (
        <>
            <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Groups</h2>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 transition-colors"
                                title="Create group"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 transition-colors"
                                title="Join group"
                            >
                                <LogIn className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search groups..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 border-none focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Group List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {search ? 'No matching groups' : 'No groups yet'}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                {search ? 'Try a different search' : 'Create or join a group to start'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(group => (
                            <button
                                key={group._id}
                                onClick={() => onGroupSelect(group._id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 ${
                                    activeGroupId === group._id
                                        ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 !border-l-orange-500'
                                        : 'border-l-4 border-l-transparent'
                                }`}
                            >
                                {/* Avatar */}
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                                    activeGroupId === group._id
                                        ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                                        : 'bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700'
                                }`}>
                                    {group.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold text-sm truncate ${
                                            activeGroupId === group._id
                                                ? 'text-orange-600 dark:text-orange-400'
                                                : 'text-slate-800 dark:text-slate-100'
                                        }`}>
                                            {group.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-400 truncate">
                                            {group.members?.length || 0} members
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateGroupModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleGroupCreated}
                />
            )}
            {showJoinModal && (
                <JoinGroupModal
                    onClose={() => setShowJoinModal(false)}
                    onJoined={handleGroupJoined}
                />
            )}
        </>
    );
};

export default GroupSidebar;
