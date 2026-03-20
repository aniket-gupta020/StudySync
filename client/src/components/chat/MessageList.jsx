import React, { useRef, useEffect, useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Loader2, FileText, Download, Music, Video, File, X, ZoomIn, Check, CheckCheck, Smile } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const groupReactions = (reactions) => {
    if (!reactions || !Array.isArray(reactions)) return {};
    const counts = {};
    reactions.forEach(r => {
        if (r.emoji) counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
};

const UrlPreviewCard = ({ url }) => {
    const { api } = useAuth();
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        api.get(`/api/url-info?url=${encodeURIComponent(url)}`)
            .then(({ data }) => {
                if (isMounted) {
                    setMetadata(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [url, api]);

    if (loading) return <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400/80"><Loader2 className="w-3 h-3 animate-spin"/> Loading preview...</div>;
    if (!metadata || (!metadata.title && !metadata.image)) return null;

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 block max-w-[260px] rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
        >
            {metadata.image && (
                <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={metadata.image} alt={metadata.title} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-2.5">
                <h4 className="font-bold text-[11px] text-slate-800 dark:text-slate-100 line-clamp-1">{metadata.title}</h4>
                {metadata.description && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{metadata.description}</p>
                )}
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block truncate">{new URL(url).hostname}</span>
            </div>
        </a>
    );
};

const renderMessageTextWithLinks = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:underline break-all font-medium" onClick={e => e.stopPropagation()}>
                    {part}
                </a>
            );
        }
        return part;
    });
};

const MessageList = ({ messages, currentUserId, hasMore, isLoadingMore, onLoadMore, highlightId, totalMembers, onAddReaction, onEditClick, onDeleteMessage, onClearMessages, isSelectionMode, setIsSelectionMode, selectedMessages, setSelectedMessages, typingUsers = [] }) => {
    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const prevMessagesRef = useRef([]);
    const [previewImage, setPreviewImage] = useState(null); // { url, name }
    
    // Reactions state
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [reactingToMsg, setReactingToMsg] = useState(null); // msgId
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(0); // 0-5
    const [defaultEmojis, setDefaultEmojis] = useState(() => {
        const saved = localStorage.getItem('defaultEmojis');
        return saved ? JSON.parse(saved) : ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    });

    
    const [revealHistory, setRevealHistory] = useState({}); // { msgId: index }

    const handleToggleSelect = (msgId) => {
        setSelectedMessages(prev => {
            const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
            if (next.length === 0) setIsSelectionMode(false);
            return next;
        });
    };

    const handleStartSelection = (msgId) => {
        setIsSelectionMode(true);
        setSelectedMessages([msgId]);
        setReactingToMsg(null);
    };

    const handleSingleClick = (msg) => {
        if (!msg.editHistory || msg.editHistory.length === 0) return;
        setRevealHistory(prev => {
            const currentIdx = prev[msg._id] !== undefined ? prev[msg._id] : msg.editHistory.length;
            const nextIdx = currentIdx - 1;
            
            if (nextIdx < -1) { // Reaches beyond original text -> cycle back to most recent edit
                return { ...prev, [msg._id]: undefined };
            }
            return { ...prev, [msg._id]: nextIdx };
        });
    };

    const getMessageText = (msg) => {
        if (msg.isDeleted) return '🚫 This message was deleted';
        const index = revealHistory[msg._id];
        if (index === -1) return msg.editHistory[0]?.text || msg.text; // VERY FIRST entry? Wait, editHistory[0] is the *oldest* edit!
        // Wait, if editHistory is pushed sequentially:
        // [0] = first text
        // [1] = second text
        // if we are going BACKWARDS from the current text (which isn't in history yet):
        // index = editHistory.length - 1 is the most recent PREVIOUS text.
        if (index !== undefined && msg.editHistory[index]) {
            return msg.editHistory[index].text;
        }
        return msg.text;
    };

    const handlePressStart = (msgId) => {
        if (longPressTimer) clearTimeout(longPressTimer);
        const timer = setTimeout(() => {
            setReactingToMsg(msgId);
        }, 400); // 400ms duration for long press
        setLongPressTimer(timer);
    };

    const handlePressEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleDownloadPreview = async (e) => {
        e.stopPropagation();
        if (!previewImage) return;
        
        try {
            const response = await fetch(previewImage.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = previewImage.name || 'download.png';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download directly. Opening in new tab.');
            window.open(previewImage.url, '_blank');
        }
    };

    useEffect(() => {
        const prevMessages = prevMessagesRef.current;
        const container = containerRef.current;

        if (container && messages.length > 0) {
            // 1. Initial Load: Previous was empty OR it's a completely different chat (e.g., room change)
            if (prevMessages.length === 0 || (prevMessages[0]?._id !== messages[0]?._id && prevMessages.length > messages.length)) {
                // Scroll instantly to bottom after a delay for layout calculation
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    }
                }, 100);
            } 
            // 2. New Message Appended (length increase & last message id is different)
            else if (messages.length > prevMessages.length) {
                const lastMsg = messages[messages.length - 1];
                const prevLastMsg = prevMessages[prevMessages.length - 1];
                
                if (lastMsg?._id !== prevLastMsg?._id) {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
        prevMessagesRef.current = messages;
    }, [messages]);

    // Handle jumping to a specific message
    useEffect(() => {
        if (highlightId) {
            const element = document.getElementById(`msg-${highlightId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (!isLoadingMore && hasMore) {
                toast.error('Message is older, try loading previous messages');
            }
        }
    }, [highlightId]);

    // Helper to check if string is only emojis
    const isEmojiOnly = (str) => {
        if (!str) return false;
        // This regex matches strings that only contain emojis, numbers, and whitespace
        // We exclude numbers to ensure text-like numbers still get a background
        const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|[ \t\n\r\f\v])+$/g;
        return emojiRegex.test(str);
    };

    const getFileIcon = (mimeType) => {
        if (mimeType?.includes('audio')) return Music;
        if (mimeType?.includes('video')) return Video;
        if (mimeType?.includes('pdf') || mimeType?.includes('word') || mimeType?.includes('document')) return FileText;
        return File;
    };

    try {
        return (
            <div ref={containerRef} onScroll={() => { if (reactingToMsg) setReactingToMsg(null); }} onTouchStart={() => { if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') document.activeElement.blur(); }} className="flex-1 overflow-y-auto p-4 scroll-smooth">
            <div className="min-h-full flex flex-col justify-end">
                {/* Load Previous Button at the TOP */}
                {hasMore && (
                    <div className="flex justify-center mb-6">
                        <button
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-800/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 group"
                        >
                            {isLoadingMore ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            )}
                            View Previous Messages
                        </button>
                    </div>
                )}

                <div>
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isOwn = msg.sender?._id?.toString() === currentUserId?.toString();
                            const isConsecutive = index > 0 && messages[index - 1].sender?._id?.toString() === msg.sender?._id?.toString();
                            const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender?._id?.toString() !== msg.sender?._id?.toString();
                            const emojiOnly = isEmojiOnly(msg.text);

                            return (
                                <motion.div
                                    key={msg._id || index}
                                    id={msg._id ? `msg-${msg._id}` : undefined}
                                    initial={emojiOnly
                                        ? { opacity: 0, scale: 0.5, x: isOwn ? 20 : -20 }
                                        : { opacity: 0, y: 10, scale: 0.95 }
                                    }
                                    animate={emojiOnly
                                        ? { opacity: 1, scale: 1, x: 0 }
                                        : { opacity: 1, y: 0, scale: 1 }
                                    }
                                    transition={emojiOnly
                                        ? { type: "spring", stiffness: 300, damping: 15 }
                                        : { duration: 0.2 }
                                    }
                                    whileHover={emojiOnly ? { scale: 1.1 } : {}}
                                    style={emojiOnly ? { originX: isOwn ? 1 : 0 } : {}}
                                    className={`flex items-center gap-3 ${isOwn ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                                >
                                    {isSelectionMode && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); handleToggleSelect(msg._id); }} 
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${selectedMessages.includes(msg._id) ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600'}`}
                                        >
                                            {selectedMessages.includes(msg._id) && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    )}
                                    <div className={`flex gap-2 items-end max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isOwn && (
                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 shadow-sm">
                                                {!isConsecutive ? (
                                                    msg.sender?.avatarUrl ? (
                                                        <img src={msg.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                                                            {msg.sender?.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )
                                                ) : <div className="w-8" />}
                                            </div>
                                        )}
                                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                            {/* Sender Name (only if not consecutive) */}
                                        {!isConsecutive && !isOwn && (
                                            <span className="text-xs text-slate-500 mb-1 ml-1">
                                                {msg.sender?.name || 'Unknown User'}
                                            </span>
                                        )}

                                        <div
                                            onClick={(e) => { e.stopPropagation(); isSelectionMode ? handleToggleSelect(msg._id) : handleSingleClick(msg); }}
                                            onPointerDown={() => !isSelectionMode && handlePressStart(msg._id)}
                                            onPointerUp={handlePressEnd}
                                            onPointerLeave={handlePressEnd}
                                            className={`break-all relative cursor-pointer ${emojiOnly
                                                ? 'text-4xl py-2 px-1 shadow-none bg-transparent select-none'
                                                : `px-4 py-2 rounded-3xl transition-all duration-500 ${highlightId === msg._id ? 'ring-4 ring-orange-500/50 bg-orange-100 dark:bg-orange-900/40 translate-x-2' : ''} ${isOwn
                                                    ? 'bg-[#ffe4c4] text-slate-800 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(210,130,50,0.15),0_2px_6px_rgba(210,130,50,0.15)]'
                                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_4px_rgba(200,205,215,0.3),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_3px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.15)]'
                                                }`
                                                }`}
                                        >
                                            {/* Floating Reaction Bar */}
                                            {reactingToMsg === msg._id && (
                                                <div 
                                                    className="fixed inset-0 z-40 bg-transparent" 
                                                    onClick={(e) => { e.stopPropagation(); setReactingToMsg(null); }} 
                                                />
                                            )}
                                            <AnimatePresence>
                                                {reactingToMsg === msg._id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                                        className={`absolute bottom-full mb-1.5 ${isOwn ? 'right-0' : 'left-0'} flex flex-col gap-1.5 z-50`}
                                                    >
                                                        {/* Emoji Bar */}
                                                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80">
                                                            {defaultEmojis.map((emoji, i) => (
                                                                <button 
                                                                    key={i} 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        onAddReaction?.(msg._id, emoji); 
                                                                        setReactingToMsg(null); 
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-lg"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    setSelectedSlot(0); 
                                                                    setShowCustomizeModal(msg._id); 
                                                                    setReactingToMsg(null); 
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                                                            >
                                                                <Smile className="w-4.5 h-4.5" />
                                                            </button>
                                                        </div>

                                                        {/* Actions Menu */}
                                                        {!msg.isDeleted && (
                                                            <div className="flex flex-col bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 w-44">
                                                                {isOwn && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); onEditClick?.(msg); setReactingToMsg(null); }} 
                                                                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                                                                    >
                                                                        <Smile className="w-3.5 h-3.5 text-blue-500" /> Edit Message
                                                                    </button>
                                                                )}
                                                                {isOwn && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); onDeleteMessage?.([msg._id]); setReactingToMsg(null); }} 
                                                                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-xs font-semibold text-red-600 transition-colors"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5 text-red-500" /> Unsend
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleStartSelection(msg._id); }} 
                                                                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                                                                >
                                                                    <Check className="w-3.5 h-3.5 text-orange-500" /> Select
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {/* Render Attachment if exists */}
                                            {msg.attachment && (
                                                <div className={`mb-2 ${msg.text ? 'border-b border-white/20 pb-2 mb-2' : ''}`}>
                                                    {msg.attachment.fileType?.startsWith('image/') ? (
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: msg.attachment.fileUrl, name: msg.attachment.fileName }); }}
                                                            className="cursor-pointer group/img relative rounded-lg overflow-hidden"
                                                        >
                                                            <img 
                                                                src={msg.attachment.fileUrl} 
                                                                alt={msg.attachment.fileName} 
                                                                className="max-w-[240px] max-h-[240px] rounded-lg object-contain bg-slate-100/50 hover:brightness-95 transition-all shadow-sm" 
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 rounded-lg transition-all flex items-center justify-center">
                                                                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <a 
                                                            href={msg.attachment.fileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            download={msg.attachment.fileName}
                                                            className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                                                                isOwn 
                                                                    ? 'bg-white/50 hover:bg-white/70 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.6)]' 
                                                                    : 'bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05)]'
                                                            }`}
                                                        >
                                                            <div className={`p-2 rounded-xl flex items-center justify-center ${isOwn ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'}`}>
                                                                {(() => {
                                                                    const Icon = getFileIcon(msg.attachment.fileType);
                                                                    return <Icon className="w-4 h-4" />;
                                                                })()}
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <p className={`text-sm font-semibold truncate ${isOwn ? 'text-orange-900' : 'text-slate-800 dark:text-slate-100'}`}>
                                                                    {msg.attachment.fileName}
                                                                </p>
                                                            </div>
                                                            <Download className={`w-4 h-4 flex-shrink-0 ${isOwn ? 'text-orange-800/70' : 'opacity-70'}`} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                             {/* Render Text if exists */}
                                             <div className="flex flex-col">
                                                      <div className="flex items-baseline flex-wrap">
                                                          <span>{renderMessageTextWithLinks(getMessageText(msg))}</span>
                                                     {msg.editHistory && msg.editHistory.length > 0 && !msg.isDeleted && (
                                                         <span className="text-[9px] opacity-60 ml-1 select-none">(edited)</span>
                                                     )}
                                                     {revealHistory[msg._id] !== undefined && (
                                                         <span className="text-[9px] text-orange-500 font-semibold ml-1 select-none">
                                                             [v{revealHistory[msg._id] === -1 ? 1 : revealHistory[msg._id] + 2}]
                                                         </span>
                                                     )}
                                                 </div>
                                                      {!msg.isDeleted && (() => {
                                                          const urlMatches = getMessageText(msg).match(/(https?:\/\/[^\s]+)/g);
                                                          return urlMatches && urlMatches[0] && <UrlPreviewCard url={urlMatches[0]} />;
                                                      })()}
                                                  </div>
                                        </div>

                                        {/* Render Grouped Reactions */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                {Object.entries(groupReactions(msg.reactions)).map(([emoji, count]) => (
                                                    <button 
                                                        key={emoji} 
                                                        onClick={() => onAddReaction?.(msg._id, emoji)}
                                                        className="flex items-center gap-1.5 px-2 py-0.5 bg-white/90 dark:bg-slate-800/90 rounded-full text-xs shadow-sm border border-slate-200/40 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <span>{emoji}</span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {isLastInGroup && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className={`text-[10px] text-slate-400 opacity-70 ${emojiOnly ? 'px-1' : ''}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isOwn && (
                                                    <span className="flex-shrink-0">
                                                        {msg.seenBy?.length >= totalMembers ? (
                                                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                                        ) : msg.deliveredTo?.length >= totalMembers ? (
                                                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Typing Indicator */}
                    {typingUsers && typingUsers.length > 0 && (
                        <div className="flex items-end gap-2 mb-4 px-2 animate-in slide-in-from-bottom-1 duration-200">
                            <div className="flex -space-x-1.5 items-center">
                                {typingUsers.map((u) => (
                                    <img 
                                        key={u._id} 
                                        src={u.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name) + "&background=random"} 
                                        alt={u.name} 
                                        className="w-7 h-7 rounded-full border border-white dark:border-slate-800 object-cover shadow-sm" 
                                        title={u.name}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center px-1 py-1.5 bg-transparent">
                                <div className="flex gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}

</div>
<div ref={bottomRef} />
            </div>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewImage(null)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
                    >
                        <motion.img
                            src={previewImage.url}
                            alt="Preview"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} // Click image back to close too
                        />
                        
                        {/* Actions Toolbar */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            <button 
                                className="p-2.5 bg-black/40 hover:bg-black/60 rounded-xl text-white backdrop-blur-md transition-colors shadow-sm flex items-center justify-center hover:scale-105 active:scale-95"
                                title="Download"
                                onClick={handleDownloadPreview}
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button 
                                className="p-2.5 bg-black/40 hover:bg-black/60 rounded-xl text-white backdrop-blur-md transition-colors shadow-sm flex items-center justify-center hover:scale-105 active:scale-95"
                                title="Close"
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Emoji Picker Modal */}
            <AnimatePresence>
                {showCustomizeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-white">Customize Reactions</h3>
                                <button onClick={() => setShowCustomizeModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400">Select a slot to replace, then pick an emoji below:</p>

                            <div className="flex gap-2 justify-between px-1">
                                {defaultEmojis.map((e, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setSelectedSlot(idx)}
                                        className={`w-11 h-11 flex items-center justify-center rounded-2xl text-xl font-body transition-all ${selectedSlot === idx ? 'bg-orange-100 dark:bg-orange-900/40 border-2 border-orange-500 scale-105 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>

                            <div className="h-[350px] w-full flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                <Suspense fallback={<div className="animate-pulse text-sm text-slate-400">Loading Picker...</div>}>
                                    <EmojiPicker 
                                        width="100%"
                                        height="100%"
                                        skinTonesDisabled
                                        searchDisabled={false}
                                        previewConfig={{ showPreview: false }}
                                        theme="auto"
                                        onEmojiClick={(emojiObject) => {
                                            const updated = [...defaultEmojis];
                                            updated[selectedSlot] = emojiObject.emoji;
                                            setDefaultEmojis(updated);
                                            localStorage.setItem('defaultEmojis', JSON.stringify(updated));
                                            toast.success('Default updated!');
                                            // Optional: advance to next slot automatically or leave as is
                                        }}
                                    />
                                </Suspense>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
    } catch (e) {
        return <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 text-center z-50">
            <h2 className="text-xl font-bold mb-2">MessageList Crash Detected</h2>
            <p className="text-sm opacity-90 max-w-md break-all">{e.message}</p>
        </div>;
    }
};

export default MessageList;
