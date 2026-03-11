import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, PenLine, MessageSquare, Paperclip
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingPage from '../../components/LoadingPage';
import ChatRoom from '../../components/chat/ChatRoom';
import Whiteboard from '../../components/chat/Whiteboard';
import GroupSettingsDrawer from '../../components/groups/GroupSettingsDrawer';

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { api } = useAuth();

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [activeView, setActiveView] = useState('chat'); // 'chat' | 'whiteboard'

    const fileInputRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);

    // Fetch selected group details
    useEffect(() => {
        if (!id) {
            navigate('/groups');
            return;
        }
        const fetchGroup = async () => {
            try {
                const { data } = await api.get(`/groups/${id}`);
                setGroup(data);
            } catch (error) {
                console.error('Fetch group error:', error);
                toast.error('Failed to load group');
                navigate('/groups');
            } finally {
                setLoading(false);
            }
        };
        fetchGroup();
    }, [id, api, navigate]);

    const handleGroupUpdate = (updatedGroup) => {
        setGroup(updatedGroup);
    };

    const handleNavigateAway = () => {
        setShowSettings(false);
        navigate('/groups');
    };

    const handleBackToSidebar = () => {
        navigate('/groups');
    };

    if (loading) return <LoadingPage />;
    if (!group) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-[calc(100vh-0px)] min-w-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                {/* Back arrow */}
                <button
                    onClick={handleBackToSidebar}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Back to Groups"
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
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Attachment toggle */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Attachment"
                    >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">Attachment</span>
                    </button>
                    
                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setPendingFile(e.target.files[0]);
                                // Reset input so the same file can be selected again
                                e.target.value = '';
                                // Make sure we're in chat view to see it upload
                                setActiveView('chat');
                            }
                        }} 
                    />

                    {/* Whiteboard toggle */}
                    <button
                        onClick={() => setActiveView(activeView === 'whiteboard' ? 'chat' : 'whiteboard')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                            activeView === 'whiteboard'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={activeView === 'whiteboard' ? 'Back to chat' : 'Whiteboard'}
                    >
                        {activeView === 'whiteboard' ? (
                            <>
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm font-medium hidden sm:inline">Chat</span>
                            </>
                        ) : (
                            <>
                                <PenLine className="w-4 h-4" />
                                <span className="text-sm font-medium hidden sm:inline">Whiteboard</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Chat / Whiteboard Body */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'chat' ? (
                    <ChatRoom 
                        groupId={id} 
                        pendingFile={pendingFile} 
                        onFileProcessed={() => setPendingFile(null)} 
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
                        <Whiteboard groupId={id} />
                    </div>
                )}
            </div>

            {/* Settings Drawer */}
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
