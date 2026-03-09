import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, LogIn as JoinIcon, Users, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GroupCard from '../../components/groups/GroupCard';
import CreateGroupModal from '../../components/groups/CreateGroupModal';
import JoinGroupModal from '../../components/groups/JoinGroupModal';
import LoadingPage from '../../components/LoadingPage';

const GroupsPage = () => {
    const { api } = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const fetchGroups = async () => {
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (error) {
            console.error('Fetch groups error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleGroupCreated = (newGroup) => {
        setGroups((prev) => [newGroup, ...prev]);
        setShowCreateModal(false);
    };

    const handleGroupJoined = (joinedGroup) => {
        setGroups((prev) => [joinedGroup, ...prev]);
        setShowJoinModal(false);
    };

    // Filter groups by search
    const filteredGroups = groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <LoadingPage />;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        Study Groups
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage and explore your study groups
                    </p>
                </div>

                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateModal(true)}
                        className="clay-button flex items-center gap-2 text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Group
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowJoinModal(true)}
                        className="clay-button-secondary flex items-center gap-2 text-sm"
                    >
                        <JoinIcon className="h-4 w-4" />
                        Join
                    </motion.button>
                </div>
            </div>

            {/* Search */}
            {groups.length > 0 && (
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your groups..."
                        className="clay-input pl-11"
                    />
                </div>
            )}

            {/* Groups Grid */}
            {filteredGroups.length === 0 ? (
                <div className="clay-card text-center py-16">
                    <Users className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {search ? 'No matching groups' : 'No study groups yet'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        {search
                            ? 'Try a different search term'
                            : 'Create a study group or join one with an invite code'}
                    </p>
                </div>
            ) : (
                <div className="grid-desktop">
                    {filteredGroups.map((group, index) => (
                        <motion.div
                            key={group._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <GroupCard
                                group={group}
                                onClick={() => navigate(`/groups/${group._id}`)}
                            />
                        </motion.div>
                    ))}
                </div>
            )}

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
        </div>
    );
};

export default GroupsPage;
