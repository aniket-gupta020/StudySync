import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, PenLine, MessageSquare, MoreVertical, Search, Info, Trash2, LogOut,
    Phone, Video as VideoIcon, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import LoadingPage from '../../components/LoadingPage';
import ChatRoom from '../../components/chat/ChatRoom';
import WhiteboardList from '../../components/chat/WhiteboardList';
import Whiteboard from '../../components/chat/Whiteboard';
import SearchModal from '../../components/chat/SearchModal';
import CallScreen from '../../components/call/CallScreen';
import IncomingCallOverlay from '../../components/call/IncomingCallOverlay';
import GroupSettingsDrawer from '../../components/groups/GroupSettingsDrawer';

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { api, user } = useAuth();
    const { startCall, inCall, incomingCall, joinCall, declineCall, checkActiveCall, activeCallInfo } = useCall();
    const { socket } = useSocket();

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeView, setActiveView] = useState('chat'); // 'chat' | 'whiteboards' | 'whiteboard_canvas'
    const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCallDropdown, setShowCallDropdown] = useState(false);
    const [refreshChatTrigger, setRefreshChatTrigger] = useState(0);
    const [refreshResourcesTrigger, setRefreshResourcesTrigger] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [highlightId, setHighlightId] = useState(null);

    const dropdownRef = useRef(null);
    const callDropdownRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);

    // Selection States for Chat Message Multi-Select
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [chatRoomActions, setChatRoomActions] = useState(null); // { deleteMessages, clearMessages, allOwnSelected }

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (callDropdownRef.current && !callDropdownRef.current.contains(event.target)) {
                setShowCallDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check for active call when entering the group
    useEffect(() => {
        if (id && socket) {
            checkActiveCall(id);
        }
    }, [id, socket, checkActiveCall]);

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
        setIsDrawerOpen(false);
        navigate('/groups');
    };

    const handleBackToSidebar = () => {
        navigate('/groups');
    };

    const handleClearChat = async () => {
        if (window.confirm("Are you sure you want to clear this chat? You may not see these messages again.")) {
            try {
                await api.delete(`/groups/${id}/messages/clear`);
                toast.success("Chat cleared");
                setRefreshChatTrigger(prev => prev + 1);
                setShowDropdown(false);
            } catch (error) {
                toast.error("Failed to clear chat");
            }
        }
    };

    const handleExitGroup = async () => {
        if (window.confirm("Are you sure you want to exit this group?")) {
            try {
                await api.post(`/groups/${id}/leave`);
                toast.success("Left group successfully");
                navigate('/groups');
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to exit group");
            }
        }
    };

    const handleJumpToMessage = (messageId) => {
        setHighlightId(messageId);
        // Clear highlight after some time
        setTimeout(() => setHighlightId(null), 3000);
    };

    const handleJumpToFile = (fileUrl) => {
        window.open(fileUrl, '_blank');
    };

    if (loading) return <LoadingPage />;
    if (!group) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-[calc(100vh-0px)] min-w-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                {/* Back arrow */}
                <button
                    onClick={isSelectionMode ? () => { setIsSelectionMode(false); setSelectedMessages([]); } : handleBackToSidebar}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                    {isSelectionMode ? <X className="w-5 h-5 text-slate-500" /> : <ArrowLeft className="w-5 h-5 text-slate-500" />}
                </button>

                {isSelectionMode ? (
                    <div className="flex-1 flex items-center">
                        <span className="font-bold text-slate-800 dark:text-white text-base">
                            {selectedMessages.length} Selected
                        </span>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsDrawerOpen(true)}
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
                                {group.members?.length} members ({activeCallInfo && activeCallInfo.roomId === id ? 'Calling...' : 'Idle'})
                            </p>
                        </div>
                    </button>
                )}

                {/* Action buttons */}
                {isSelectionMode ? (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => chatRoomActions?.clearMessages(selectedMessages)} 
                            className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            Delete For Me
                        </button>
                        {chatRoomActions?.allOwnSelected(selectedMessages) && (
                            <button 
                                onClick={() => chatRoomActions?.deleteMessages(selectedMessages)} 
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-semibold text-white transition-colors"
                            >
                                Unsend
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Call / Join Button */}
                        <div className="relative" ref={callDropdownRef}>
                            {activeCallInfo && activeCallInfo.roomId === id && !inCall ? (
                                /* Active call exists — show Join button */
                                <button
                                    onClick={() => joinCall(id, activeCallInfo.callType)}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,100,0.4),0_4px_8px_rgba(99,102,241,0.25)] hover:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(0,0,100,0.5),0_6px_12px_rgba(99,102,241,0.3)] transition-all active:scale-95 animate-pulse"
                                    title="Join ongoing call"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="text-sm font-medium">Join Call</span>
                                </button>
                            ) : (
                                /* No active call — show Call dropdown */
                                <>
                                    <button
                                        onClick={() => setShowCallDropdown(!showCallDropdown)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-gradient-to-tr from-orange-400 to-orange-500 text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(200,80,0,0.4),0_4px_8px_rgba(249,115,22,0.25)] hover:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(200,80,0,0.5),0_6px_12px_rgba(249,115,22,0.3)] transition-all active:scale-95"
                                        title="Call"
                                    >
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm font-medium hidden sm:inline">Call</span>
                                    </button>

                                    {showCallDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                                            <button
                                                onClick={() => {
                                                    setShowCallDropdown(false);
                                                    startCall(id, 'voice');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <Phone className="w-4 h-4 text-orange-500" />
                                                Voice Call
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowCallDropdown(false);
                                                    startCall(id, 'video');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <VideoIcon className="w-4 h-4 text-blue-500" />
                                                Video Call
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Whiteboard toggle */}
                        <button
                            onClick={() => {
                                if (activeView === 'chat') {
                                    setActiveView('whiteboards');
                                } else {
                                    setActiveView('chat');
                                    setSelectedWhiteboard(null);
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl transition-all active:scale-95 ${
                                activeView !== 'chat'
                                    ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.6),inset_-2px_-2px_4px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.1)]'
                                    : 'bg-gradient-to-tr from-orange-400 to-orange-500 text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(200,80,0,0.4),0_4px_8px_rgba(249,115,22,0.25)] hover:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(200,80,0,0.5),0_6px_12px_rgba(249,115,22,0.3)]'
                            }`}
                            title={activeView !== 'chat' ? 'Back to chat' : 'Whiteboards'}
                        >
                            {activeView !== 'chat' ? (
                                <>
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="text-sm font-medium hidden sm:inline">Chat</span>
                                </>
                            ) : (
                                <>
                                    <PenLine className="w-4 h-4" />
                                    <span className="text-sm font-medium hidden sm:inline">Whiteboards</span>
                                </>
                            )}
                        </button>

                        {/* 3-Dots Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {showDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setIsSearchOpen(true);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <Search className="w-4 h-4 text-orange-500" />
                                            Search
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(true);
                                                setShowDropdown(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <Info className="w-4 h-4" />
                                            Group Info
                                        </button>
                                        <button
                                            onClick={handleClearChat}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-orange-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Chat
                                        </button>
                                        <button
                                            onClick={handleExitGroup}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Exit Group
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat / Whiteboard Body */}
            <div className="flex-1 overflow-hidden relative">
                <div className={`h-full ${activeView === 'chat' ? 'block' : 'hidden'}`}>
                    <ChatRoom
                        groupId={id}
                        pendingFile={pendingFile}
                        onFileProcessed={() => setPendingFile(null)}
                        highlightId={highlightId}
                        totalMembers={group.members?.length}
                        isSelectionMode={isSelectionMode}
                        setIsSelectionMode={setIsSelectionMode}
                        selectedMessages={selectedMessages}
                        setSelectedMessages={setSelectedMessages}
                        onActionTriggerReady={setChatRoomActions}
                        onFileSelect={(file) => {
                            setPendingFile(file);
                            setActiveView('chat');
                        }}
                        refreshTrigger={refreshChatTrigger}
                    />
                </div>
                
                <div className={`h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 ${activeView === 'whiteboards' ? 'block' : 'hidden'}`}>
                    {activeView === 'whiteboards' && (
                        <WhiteboardList 
                            api={api} 
                            groupId={id} 
                            onSelectWhiteboard={(board) => {
                                setSelectedWhiteboard(board);
                                setActiveView('whiteboard_canvas');
                            }} 
                        />
                    )}
                </div>

                <div className={`h-full overflow-y-hidden bg-slate-50 dark:bg-slate-950 ${activeView === 'whiteboard_canvas' ? 'block' : 'hidden'}`}>
                    {selectedWhiteboard && (
                        <Whiteboard 
                            groupId={id} 
                            whiteboard={selectedWhiteboard}
                            user={user}
                            api={api}
                            isActive={activeView === 'whiteboard_canvas'}
                            onBack={() => {
                                setSelectedWhiteboard(null);
                                setActiveView('whiteboards');
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Settings Drawer */}
            <GroupSettingsDrawer
                group={group}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onGroupUpdate={setGroup}
                onNavigateAway={() => navigate('/groups')}
                refreshResourcesTrigger={refreshResourcesTrigger}
            />

            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                groupId={id}
                onJumpToMessage={handleJumpToMessage}
                onJumpToFile={handleJumpToFile}
            />

            {/* Call Screen Overlay */}
            {inCall && <CallScreen groupName={group?.name} />}

            {/* Incoming Call Full-Screen Overlay (when user is in the same group) */}
            {incomingCall && incomingCall.roomId === id && !inCall && (
                <IncomingCallOverlay
                    callerName={incomingCall.initiator?.name}
                    callType={incomingCall.callType}
                    groupName={group?.name}
                    onAccept={() => joinCall(incomingCall.roomId, incomingCall.callType)}
                    onDecline={declineCall}
                />
            )}
        </div>
    );
};

export default GroupDetailPage;
