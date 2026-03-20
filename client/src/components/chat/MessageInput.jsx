import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Send, Smile, Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const MessageInput = ({ onSendMessage, onFileSelect, editingMessage, onCancelEdit, onSaveEdit }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const hasText = message.trim().length > 0;

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (message.trim()) {
            if (editingMessage) {
                onSaveEdit?.(message.trim());
            } else {
                onSendMessage?.(message.trim());
            }
            setMessage('');
            setShowEmojiPicker(false);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset after submit
            }
        }
    };

    // Handle Edit State Population
    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.text || '');
            setShowEmojiPicker(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
        } else {
            setMessage('');
        }
    }, [editingMessage]);

    const onEmojiClick = (emojiObject) => {
        const start = textareaRef.current?.selectionStart || message.length;
        const end = textareaRef.current?.selectionEnd || message.length;
        const newText = message.substring(0, start) + emojiObject.emoji + message.substring(end);
        setMessage(newText);
        
        // Restore focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
            }
        }, 0);
    };

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            if (onFileSelect) {
                onFileSelect(e.target.files[0]);
            }
            // Reset input so the same file can be selected again
            e.target.value = '';
        }
    };

    return (
        <div className="relative">
            {/* Emoji Picker Popover */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-2 z-50"
                        ref={pickerRef}
                    >
                        <Suspense fallback={<div className="w-[300px] h-[400px] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center animate-pulse"><span className="text-slate-500 dark:text-slate-400 text-sm">Loading emojis...</span></div>}>
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                theme="auto"
                                searchDisabled={false}
                                width={300}
                                height={400}
                            />
                        </Suspense>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {/* Edit Message Indicator */}
            {editingMessage && (
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-orange-100/80 dark:bg-orange-900/30 rounded-t-2xl border-x border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-1 duration-200">
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Editing Message</span>
                    <button 
                        type="button" 
                        onClick={onCancelEdit} 
                        className="p-1 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                    </button>
                </div>
            )}

            <form 
                style={{ 
                    borderRadius: editingMessage 
                        ? '0 0 24px 24px' 
                        : (message.includes('\n') || (textareaRef.current && textareaRef.current.scrollHeight > 50) ? '24px' : '9999px') 
                }}
                className="flex items-end gap-1 bg-white dark:bg-slate-800 p-1.5 pl-2 transition-all duration-200 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
                {/* Emoji Toggle */}
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-slate-400 hover:text-orange-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
                    title="Add Emoji"
                >
                    <Smile className="w-6 h-6" />
                </button>

                {/* Attachment Button — hidden when user is typing */}
                <AnimatePresence>
                    {!hasText && (
                        <motion.button
                            type="button"
                            onClick={handleFileClick}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-2.5 text-slate-400 hover:text-orange-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0 overflow-hidden"
                            title="Attach File"
                        >
                            <Paperclip className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Growable Textarea */}
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault(); // Prevents newline
                            handleSubmit(e);
                        }
                    }}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 overflow-y-auto custom-scrollbar min-h-[48px]"
                    rows={1}
                />

                {/* Send Button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                    className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-all flex-shrink-0"
                    title="Send (Enter)"
                >
                    <Send className="w-5 h-5 -ml-0.5" />
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
