import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Send, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const MessageInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
            setShowEmojiPicker(false);
        }
    };

    const onEmojiClick = (emojiObject) => {
        setMessage((prev) => prev + emojiObject.emoji);
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

            <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-white dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-slate-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <Smile className="w-5 h-5" />
                </button>

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    rows={1}
                />

                <button
                    type="submit"
                    disabled={!message.trim()}
                    className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-500/20"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
