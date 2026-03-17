import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Loader2, FileText, Download, Music, Video, File, X, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';

const MessageList = ({ messages, currentUserId, hasMore, isLoadingMore, onLoadMore, highlightId }) => {
    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const prevMessagesRef = useRef([]);
    const [previewImage, setPreviewImage] = useState(null);

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

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
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

                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isOwn = msg.sender?._id?.toString() === currentUserId?.toString();
                            const isConsecutive = index > 0 && messages[index - 1].sender?._id?.toString() === msg.sender?._id?.toString();
                            const emojiOnly = isEmojiOnly(msg.text);

                            return (
                                <motion.div
                                    key={index}
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
                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                        {/* Sender Name (only if not consecutive) */}
                                        {!isConsecutive && !isOwn && (
                                            <span className="text-xs text-slate-500 mb-1 ml-1">
                                                {msg.sender?.name || 'Unknown User'}
                                            </span>
                                        )}

                                        <div
                                            className={`break-words ${emojiOnly
                                                ? 'text-4xl py-2 px-1 shadow-none bg-transparent cursor-default select-none'
                                                : `px-4 py-2 rounded-3xl transition-all duration-500 ${highlightId === msg._id ? 'ring-4 ring-orange-500/50 bg-orange-100 dark:bg-orange-900/40 translate-x-2' : ''} ${isOwn
                                                    ? 'bg-[#ffe4c4] text-slate-800 rounded-br-sm shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(210,130,50,0.15),0_2px_6px_rgba(210,130,50,0.15)]'
                                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-[inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_4px_rgba(200,205,215,0.3),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_3px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.15)]'
                                                }`
                                                }`}
                                        >
                                            {/* Render Attachment if exists */}
                                            {msg.attachment && (
                                                <div className={`mb-2 ${msg.text ? 'border-b border-white/20 pb-2 mb-2' : ''}`}>
                                                    {msg.attachment.fileType?.startsWith('image/') ? (
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.attachment.fileUrl); }}
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
                                            {msg.text && <span>{msg.text}</span>}
                                        </div>
                                        <span className={`text-[10px] text-slate-400 mt-1 opacity-70 ${emojiOnly ? 'px-1' : ''}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
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
                            src={previewImage}
                            alt="Preview"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} // Click image back to close too, or allow download button inside?
                        />
                        <button 
                            className="absolute top-6 right-6 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-md transition-colors shadow-sm"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessageList;
