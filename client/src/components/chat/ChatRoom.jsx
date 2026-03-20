import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';
import { RefreshCcw, ChevronUp, Loader2, UploadCloud } from 'lucide-react';

const ChatRoom = ({ groupId, pendingFile, onFileProcessed, onFileSelect, refreshTrigger, highlightId, totalMembers, isSelectionMode, setIsSelectionMode, selectedMessages, setSelectedMessages, onActionTriggerReady }) => {
    const { socket, isConnected } = useSocket();
    const { user, api } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingMessage, setEditingMessage] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [whiteboardDrawers, setWhiteboardDrawers] = useState({});

    // Action Trigger Forwarding for Navbar Selection Mode
    useEffect(() => {
        if (onActionTriggerReady) {
            onActionTriggerReady({
                deleteMessages: (ids) => {
                    if (socket && isConnected) {
                        if (ids.length === 1) socket.emit('delete-message', { messageId: ids[0] });
                        else socket.emit('delete-messages', { messageIds: ids, roomId: groupId });
                        setSelectedMessages([]);
                        setIsSelectionMode(false);
                    }
                },
                clearMessages: (ids) => {
                    if (socket && isConnected) {
                        socket.emit('clear-messages', { messageIds: ids, userId: user._id, roomId: groupId });
                        setSelectedMessages([]);
                        setIsSelectionMode(false);
                    }
                },
                allOwnSelected: (ids) => ids.every(id => messages.find(m => m._id === id)?.sender?._id === user._id)
            });
        }
    }, [messages, socket, isConnected, onActionTriggerReady, setSelectedMessages, setIsSelectionMode, groupId, user?._id]);

    // Fetch initial history (Latest 10)
    useEffect(() => {
        if (!groupId || groupId === 'undefined') return;

        const fetchMessages = async () => {
            try {
                const { data } = await api.get(`/groups/${groupId}/messages?limit=10&page=1`);
                setMessages(data);
                setPage(1);
                setHasMore(data.length === 10);

                // Auto-emit 'seen' for any message you're reading now
                if (socket && isConnected) {
                    data.forEach(msg => {
                        if (msg.sender?._id !== user._id && !msg.seenBy?.includes(user._id)) {
                            socket.emit('message-seen', { messageId: msg._id, userId: user._id });
                        }
                    });
                }
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
            
            setMessages((prev) => {
                // Prevent duplicate Appends
                if (prev.some(m => m._id === data._id)) return prev;
                return [...prev, data];
            });

            // Emit delivered and seen immediately since user is actively inside this page/room.
            if (data.sender?._id !== user._id) {
                socket.emit('message-delivered', { messageId: data._id, userId: user._id });
                socket.emit('message-seen', { messageId: data._id, userId: user._id });
            }
        };

        const handleStatusUpdate = ({ messageId, deliveredTo, seenBy }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, deliveredTo, seenBy } : msg
                )
            );
        };

        const handleReactionUpdated = ({ messageId, reactions }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, reactions } : msg
                )
            );
        };

        const handleMessageEdited = ({ messageId, text, editHistory }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, text, editHistory } : msg
                )
            );
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, isDeleted: true, text: '', attachment: undefined } : msg
                )
            );
        };

        const handleMessagesDeleted = ({ messageIds }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    messageIds.includes(msg._id) ? { ...msg, isDeleted: true, text: '', attachment: undefined } : msg
                )
            );
        };

        const handleMessagesClearedLocal = ({ messageIds }) => {
            setMessages((prev) => prev.filter(msg => !messageIds.includes(msg._id)));
        };

        socket.on('receive-message', handleReceiveMessage);
        socket.on('message-status-update', handleStatusUpdate);
        socket.on('reaction-updated', handleReactionUpdated);
        socket.on('message-edited', handleMessageEdited);
        socket.on('message-deleted', handleMessageDeleted);
        socket.on('messages-deleted', handleMessagesDeleted);
        socket.on('messages-cleared-local', handleMessagesClearedLocal);

        const handleWhiteboardStatus = (data) => {
            console.log('✏️ Whiteboard status update:', data);
            setWhiteboardDrawers(data.drawers || {});
        };
        socket.on('whiteboard-status-update', handleWhiteboardStatus);

        const handleUserTyping = ({ user: typingUser }) => {
            if (String(typingUser._id) !== String(user._id)) {
                setTypingUsers(prev => ({ ...prev, [typingUser._id]: typingUser }));
            }
        };

        const handleUserStopTyping = ({ userId }) => {
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        };

        socket.on('user-typing', handleUserTyping);
        socket.on('user-stop-typing', handleUserStopTyping);

        // Cleanup
        return () => {
            socket.off('receive-message', handleReceiveMessage);
            socket.off('message-status-update', handleStatusUpdate);
            socket.off('reaction-updated', handleReactionUpdated);
            socket.off('message-edited', handleMessageEdited);
            socket.off('message-deleted', handleMessageDeleted);
            socket.off('messages-deleted', handleMessagesDeleted);
            socket.off('messages-cleared-local', handleMessagesClearedLocal);
            socket.off('whiteboard-status-update', handleWhiteboardStatus);
            socket.off('user-typing', handleUserTyping);
            socket.off('user-stop-typing', handleUserStopTyping);
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



    try {
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
            <div className="flex-1 overflow-hidden flex flex-col relative">
                <MessageList
                    messages={messages}
                    currentUserId={user._id}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={loadMoreMessages}
                    highlightId={highlightId}
                    totalMembers={totalMembers}
                    isSelectionMode={isSelectionMode}
                    setIsSelectionMode={setIsSelectionMode}
                    selectedMessages={selectedMessages}
                    setSelectedMessages={setSelectedMessages}
                    onAddReaction={(messageId, emoji) => {
                        if (socket && isConnected) {
                            socket.emit('add-reaction', { messageId, emoji, userId: user._id });
                        }
                    }}
                    onEditClick={(msg) => setEditingMessage(msg)}
                    onDeleteMessage={(messageIds) => {
                        if (socket && isConnected) {
                            if (messageIds.length === 1) {
                                socket.emit('delete-message', { messageId: messageIds[0] });
                            } else {
                                socket.emit('delete-messages', { messageIds, roomId: groupId });
                            }
                        }
                    }}
                    onClearMessages={(messageIds) => {
                        if (socket && isConnected) {
                            socket.emit('clear-messages', { messageIds, userId: user._id, roomId: groupId });
                        }
                    }}
                />
                
                {/* Whiteboard Activity Status */}
                {Object.keys(whiteboardDrawers).some(id => !whiteboardDrawers[id].ready) && (
                    <div className="mx-4 mb-2 p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-orange-200 dark:border-orange-900/30 shadow-lg shadow-orange-500/5 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                <RefreshCcw className="w-5 h-5 text-orange-500 animate-spin" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">
                                    Whiteboard session active
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {(() => {
                                        const notReady = Object.keys(whiteboardDrawers).filter(id => !whiteboardDrawers[id].ready);
                                        const names = notReady.map(id => id === socket.id ? 'You' : whiteboardDrawers[id].name);
                                        const count = names.length;
                                        if (count === 0) return null;
                                        if (count === 1) return `${names[0]} ${names[0] === 'You' ? 'are' : 'is'} still drawing... waiting for completion`;
                                        if (count === 2) return `${names[0]} and ${names[1]} are still drawing... waiting for completion`;
                                        return `${names[0]}, ${names[1]} and ${count - 2} others are still drawing... waiting for completion`;
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-2 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex -space-x-1.5 items-center">
                            {Object.values(typingUsers).map((u, i) => (
                                <img 
                                    key={u._id} 
                                    src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                                    alt={u.name} 
                                    className="w-5 h-5 rounded-full border border-white dark:border-slate-800 object-cover shadow-sm" 
                                    style={{ zIndex: Object.keys(typingUsers).length - i }}
                                    title={u.name}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                            <span className="font-semibold truncate max-w-[120px]">
                                {Object.values(typingUsers).length === 1 
                                    ? Object.values(typingUsers)[0].name 
                                    : `${Object.values(typingUsers).length} people`}
                            </span>
                            <span> {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing</span>
                            <div className="flex gap-0.5 ml-1">
                                <span className="w-1 h-1 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <MessageInput 
                    onSendMessage={handleSendMessage} 
                    onFileSelect={onFileSelect} 
                    editingMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    onSaveEdit={(text) => {
                        if (socket && isConnected && editingMessage) {
                            socket.emit('edit-message', { messageId: editingMessage._id, newText: text, userId: user._id });
                            setEditingMessage(null);
                        }
                    }}
                    onTypingStart={() => {
                        if (socket && isConnected) {
                            socket.emit('typing-start', { roomId: groupId, user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl } });
                        }
                    }}
                    onTypingStop={() => {
                        if (socket && isConnected) {
                            socket.emit('typing-stop', { roomId: groupId, userId: user._id });
                        }
                    }}
                />
            </div>
        </div>
    );
    } catch (e) {
        return <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 text-center z-50">
            <h2 className="text-xl font-bold mb-2">ChatRoom Crash Detected</h2>
            <p className="text-sm opacity-90 max-w-md break-all">{e.message}</p>
        </div>;
    }
};

export default ChatRoom;
