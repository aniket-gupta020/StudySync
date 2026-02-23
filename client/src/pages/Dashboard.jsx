import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, LogIn as JoinIcon, BookOpen, Sparkles, GraduationCap, BookMarked } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/layout/GlassCard';
import GroupCard from '../components/groups/GroupCard';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import JoinGroupModal from '../components/groups/JoinGroupModal';
import LoadingPage from '../components/LoadingPage';

const Dashboard = () => {
    const { user, api } = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    // Fetch user's groups
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

    if (loading) return <LoadingPage />;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
                    Welcome back,{' '}
                    <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                        {user?.name?.split(' ')[0]}
                    </span>
                    ! 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    Ready to sync your study session?
                </p>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <GlassCard className="flex items-center gap-4 p-5">
                        <div className="h-12 w-12 rounded-xl bg-primary-500/15 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                {groups.length}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Study Groups</p>
                        </div>
                    </GlassCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <GlassCard className="flex items-center gap-4 p-5">
                        <div className="h-12 w-12 rounded-xl bg-accent-500/15 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                        </div>
                        <div>
                            {user?.role === 'tutor' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                                    <BookMarked className="w-4 h-4" fill="currentColor" /> TUTOR
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                    <GraduationCap className="w-4 h-4" /> STUDENT
                                </span>
                            )}
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your Role</p>
                        </div>
                    </GlassCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard className="flex items-center gap-4 p-5">
                        <div className="h-12 w-12 rounded-xl bg-green-500/15 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                Phase 1
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Current Build</p>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="glass-button flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Create Group
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowJoinModal(true)}
                    className="glass-button-secondary flex items-center gap-2"
                >
                    <JoinIcon className="h-5 w-5" />
                    Join with Code
                </motion.button>
            </div>

            {/* Groups Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Your Study Groups
                    </h2>
                    {groups.length > 0 && (
                        <Link
                            to="/groups"
                            className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                        >
                            View All →
                        </Link>
                    )}
                </div>

                {groups.length === 0 ? (
                    <GlassCard className="text-center py-12">
                        <Users className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            No study groups yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                            Create your first study group or join an existing one with an invite code.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="glass-button text-sm"
                            >
                                Create Group
                            </button>
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="glass-button-secondary text-sm"
                            >
                                Join Group
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="grid-desktop">
                        {groups.slice(0, 6).map((group, index) => (
                            <motion.div
                                key={group._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <GroupCard group={group} onClick={() => navigate(`/groups/${group._id}`)} />
                            </motion.div>
                        ))}
                    </div>
                )}
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
        </div>
    );
};

export default Dashboard;
