import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';
import { RefreshCcw, ChevronUp, Loader2 } from 'lucide-react';

const ChatRoom = ({ groupId }) => {
    const { socket, isConnected } = useSocket();
    const { user, api } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Fetch initial history (Latest 10)
    useEffect(() => {
        if (!groupId || groupId === 'undefined') return;

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/groups/${groupId}/messages?limit=10&page=1`);
                setMessages(data);
                setPage(1);
                setHasMore(data.length === 10);
            } catch (error) {
                console.error('Failed to fetch messages', error);
                if (error.response?.status !== 400) {
                    toast.error('Could not load chat history');
                }
            }
        };
        fetchMessages();
    }, [groupId, refreshKey, api]);

    const loadMoreMessages = async () => {
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const { data } = await api.get(`/groups/${groupId}/messages?limit=10&page=${nextPage}`);

            if (data.length < 10) {
                setHasMore(false);
            }

            if (data.length > 0) {
                setMessages(prev => [...data, ...prev]);
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load more messages', error);
            toast.error('Could not load older messages');
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!socket || !isConnected || !groupId || groupId === 'undefined') return;

        // Join room
        const roomIdStr = groupId.toString();
        console.log(`🏠 Joining room: ${roomIdStr}`);
        socket.emit('join-room', roomIdStr);
        setIsJoined(true);

        // Listen for messages
        const handleReceiveMessage = (data) => {
            console.log('📨 Received message:', data);
            const adaptedMessage = {
                text: data.message,
                sender: data.sender,
                timestamp: data.timestamp
            };
            setMessages((prev) => [...prev, adaptedMessage]);
        };

        socket.on('receive-message', handleReceiveMessage);

        // Cleanup
        return () => {
            socket.off('receive-message', handleReceiveMessage);
            socket.emit('leave-room', roomIdStr);
        };
    }, [socket, isConnected, groupId]);

    const handleSendMessage = useCallback((message) => {
        if (socket && isJoined) {
            socket.emit('send-message', {
                roomId: groupId,
                message,
                sender: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    }, [socket, isJoined, groupId, user]);

    return (
        <div className="flex flex-col h-[600px] bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 italic">Live Study Chat</h3>
                </div>
                <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <MessageList
                messages={messages}
                currentUserId={user._id}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreMessages}
            />

            {/* Input Area */}
            <div className="p-4 bg-white/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                <MessageInput onSendMessage={handleSendMessage} />
            </div>
        </div>
    );
};

export default ChatRoom;
