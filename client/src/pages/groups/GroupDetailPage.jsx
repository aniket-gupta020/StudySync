import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Search, PenLine, Users, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingPage from '../../components/LoadingPage';
import ChatRoom from '../../components/chat/ChatRoom';
import Whiteboard from '../../components/chat/Whiteboard';
import GroupSidebar from '../../components/groups/GroupSidebar';
import GroupSettingsDrawer from '../../components/groups/GroupSettingsDrawer';

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, api } = useAuth();

    const [groups, setGroups] = useState([]);
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [activeView, setActiveView] = useState('chat'); // 'chat' | 'whiteboard'

    // Fetch all groups
    useEffect(() => {
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
        fetchGroups();
    }, []);

    // Fetch selected group details
    useEffect(() => {
        if (!id) {
            setGroup(null);
            setShowSidebar(true);
            return;
        }
        const fetchGroup = async () => {
            try {
                const { data } = await api.get(`/groups/${id}`);
                setGroup(data);
                // On mobile, hide sidebar when group is selected
                if (window.innerWidth < 768) setShowSidebar(false);
            } catch (error) {
                console.error('Fetch group error:', error);
                toast.error('Failed to load group');
                navigate('/groups');
            }
        };
        fetchGroup();
    }, [id]);

    const handleGroupSelect = (groupId) => {
        setActiveView('chat');
        navigate(`/groups/${groupId}`);
    };

    const handleGroupUpdate = (updatedGroup) => {
        setGroup(updatedGroup);
        setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
    };

    const handleNavigateAway = () => {
        setShowSettings(false);
        setGroup(null);
        setGroups(prev => prev.filter(g => g._id !== id));
        navigate('/groups');
    };

    const handleBackToSidebar = () => {
        setShowSidebar(true);
        setGroup(null);
        navigate('/groups');
    };

    if (loading) return <LoadingPage />;

    return (
        <div className="flex h-[calc(100vh-0px)] md:h-[calc(100vh-0px)] overflow-hidden bg-slate-100 dark:bg-slate-950">
            {/* ─── Left Sidebar ─── */}
            <div className={`${
                showSidebar ? 'flex' : 'hidden'
            } md:flex w-full md:w-80 lg:w-96 flex-shrink-0 flex-col`}>
                <GroupSidebar
                    groups={groups}
                    activeGroupId={id}
                    onGroupSelect={handleGroupSelect}
                    onGroupsChange={setGroups}
                />
            </div>

            {/* ─── Right Chat Panel ─── */}
            <div className={`${
                !showSidebar || id ? 'flex' : 'hidden'
            } md:flex flex-1 flex-col min-w-0`}>
                {group ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                            {/* Back arrow (mobile only) */}
                            <button
                                onClick={handleBackToSidebar}
                                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </button>

                            {/* Group info (tappable → settings) */}
                            <button
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-3 flex-1 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 py-1.5 transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {group.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm truncate">
                                        {group.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {group.members?.length} members
                                    </p>
                                </div>
                            </button>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Whiteboard toggle */}
                                <button
                                    onClick={() => setActiveView(activeView === 'whiteboard' ? 'chat' : 'whiteboard')}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                                        activeView === 'whiteboard'
                                            ? 'bg-orange-500 text-white'
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title={activeView === 'whiteboard' ? 'Back to chat' : 'Whiteboard'}
                                >
                                    {activeView === 'whiteboard'
                                        ? <MessageSquare className="w-4 h-4" />
                                        : <PenLine className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Chat / Whiteboard Body */}
                        <div className="flex-1 overflow-hidden">
                            {activeView === 'chat' ? (
                                <ChatRoom groupId={id} />
                            ) : (
                                <div className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
                                    <Whiteboard groupId={id} />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Empty state — no group selected */
                    <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">
                                StudySync
                            </h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                Select a group to start chatting
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Settings Drawer ─── */}
            <GroupSettingsDrawer
                group={group}
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onGroupUpdate={handleGroupUpdate}
                onNavigateAway={handleNavigateAway}
            />
        </div>
    );
};

export default GroupDetailPage;
