import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';
import { RefreshCcw, ChevronUp, Loader2, UploadCloud } from 'lucide-react';

const ChatRoom = ({ groupId, pendingFile, onFileProcessed, refreshTrigger }) => {
    const { socket, isConnected } = useSocket();
    const { user, api } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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
    }, [groupId, refreshKey, refreshTrigger, api]);

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
                text: data.text,
                attachment: data.attachment,
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

    const handleSendMessage = useCallback((message, attachment = null) => {
        if (socket && isJoined) {
            socket.emit('send-message', {
                roomId: groupId,
                message,
                attachment,
                sender: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    }, [socket, isJoined, groupId, user]);

    const handleFileUpload = async (file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            return toast.error("File size cannot exceed 10MB");
        }
        
        setIsUploading(true);
        setUploadProgress(0);
        const loadingToast = toast.loading('Uploading file...');
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const { data } = await api.post(`/groups/${groupId}/messages/attachment`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            
            // On success, emit the message with attachment
            handleSendMessage('', data);
            toast.success('File sent', { id: loadingToast });
            if (onFileProcessed) onFileProcessed();
        } catch (error) {
            console.error('File upload failed', error);
            toast.error(error.response?.data?.message || 'Failed to upload file', { id: loadingToast });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Handle incoming pending file from parent (GroupDetailPage)
    useEffect(() => {
        if (pendingFile) {
            handleFileUpload(pendingFile);
        }
    }, [pendingFile]);

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div 
            className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-orange-500/10 backdrop-blur-sm border-2 border-dashed border-orange-500 rounded-lg flex flex-col items-center justify-center pointer-events-none">
                    <UploadCloud className="w-16 h-16 text-orange-500 mb-4 animate-bounce" />
                    <p className="text-xl font-bold text-orange-500">Drop file to send</p>
                </div>
            )}

            {/* Upload Progress Bar Overlay */}
            {isUploading && (
                <div className="absolute top-0 left-0 right-0 z-40 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 max-w-2xl mx-auto">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <UploadCloud className="w-5 h-5 text-orange-500 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm font-semibold mb-1.5 w-full">
                                <span className="text-slate-700 dark:text-slate-200 truncate pr-2 flex-1">Uploading file...</span>
                                <span className="text-orange-600 dark:text-orange-400 w-12 text-right">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 shadow-inner overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <MessageList
                messages={messages}
                currentUserId={user._id}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreMessages}
            />

            {/* Input Area */}
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <MessageInput onSendMessage={handleSendMessage} />
            </div>
        </div>
    );
};

export default ChatRoom;
