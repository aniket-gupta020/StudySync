import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, CheckCheck, Trash2, MessageSquare, Phone, Palette, Users, PhoneOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const typeColors = {
    message: 'from-blue-500/10 to-blue-500/5',
    call: 'from-green-500/10 to-green-500/5',
    'call-ended': 'from-red-500/10 to-red-500/5',
    whiteboard: 'from-purple-500/10 to-purple-500/5',
    group: 'from-orange-500/10 to-orange-500/5',
    system: 'from-slate-500/10 to-slate-500/5',
};

const typeIcons = {
    message: <MessageSquare className="w-4 h-4 text-blue-500" />,
    call: <Phone className="w-4 h-4 text-green-500" />,
    'call-ended': <PhoneOff className="w-4 h-4 text-red-500" />,
    whiteboard: <Palette className="w-4 h-4 text-purple-500" />,
    group: <Users className="w-4 h-4 text-orange-500" />,
    system: <Bell className="w-4 h-4 text-slate-500" />,
};

const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const NotificationPanel = ({ onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotifications();
    const navigate = useNavigate();
    const [selectedCallDetails, setSelectedCallDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'calls'

    const filteredNotifications = notifications.filter(notif => {
        const isCall = notif.type === 'call-ended' || notif.type === 'call';
        if (activeTab === 'calls') return isCall;
        return !isCall;
    });

    const handleNotificationClick = (notif) => {
        markAsRead(notif.id);
        if (notif.type === 'call-ended') {
            setSelectedCallDetails(notif.data);
            return;
        }
        if (notif.groupId) {
            navigate(`/groups/${notif.groupId}`);
            onClose();
        }
    };

    return (
        <div className="h-full flex flex-col bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
                        title="Back to menu"
                    >
                        <ArrowLeft className="w-4.5 h-4.5" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-1px_-1px_3px_rgba(0,0,0,0.15)]">
                        <Bell className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white text-base">Notifications</h2>
                        {unreadCount > 0 && (
                            <p className="text-[11px] text-orange-500 font-medium">{unreadCount} unread</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs Switcher */}
            <div className="flex border-b border-slate-200/50 dark:border-slate-800/50 px-5 gap-4 bg-white/50 dark:bg-slate-900/50 flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`pb-2.5 pt-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
                        activeTab === 'notifications' 
                        ? 'border-orange-500 text-orange-500 dark:text-orange-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    Alerts
                </button>
                <button 
                    onClick={() => setActiveTab('calls')}
                    className={`pb-2.5 pt-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
                        activeTab === 'calls' 
                        ? 'border-orange-500 text-orange-500 dark:text-orange-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <Phone className="w-3.5 h-3.5" /> Call History
                </button>
            </div>

            {/* Actions bar */}
            {filteredNotifications.length > 0 && activeTab === 'notifications' && (
                <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                    </button>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear all
                    </button>
                </div>
            )}

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
                            style={{
                                boxShadow: 'inset 2px 2px 6px rgba(255,255,255,0.15), inset -2px -2px 6px rgba(0,0,0,0.06)'
                            }}
                        >
                            <BellOff className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {activeTab === 'calls' ? 'No call history yet' : 'No notifications yet'}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                            {activeTab === 'calls' ? 'Logs of your completed or missed calls will appear here' : "You'll see new messages, calls, and activity here"}
                        </p>
                    </div>
                ) : (
                    <div className="py-1">
                        <AnimatePresence>
                            {filteredNotifications.map((notif) => (
                                <motion.button
                                    key={notif.id}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                        !notif.read ? 'bg-orange-50/40 dark:bg-orange-900/5' : ''
                                    }`}
                                >
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${typeColors[notif.type] || typeColors.system} flex items-center justify-center flex-shrink-0 mt-0.5`}
                                        style={{
                                            boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        {typeIcons[notif.type] || typeIcons.system}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm truncate ${!notif.read ? 'font-semibold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.read && (
                                                <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {notif.body}
                                        </p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                            {timeAgo(notif.timestamp)}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Call Details Modal */}
            <AnimatePresence>
                {selectedCallDetails && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedCallDetails(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="clay-card max-w-sm w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-3 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                                        <PhoneOff className="w-4.5 h-4.5 text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Call Details</h3>
                                        <p className="text-[10px] text-slate-500">Duration: {selectedCallDetails.duration || '00:00'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedCallDetails(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            <div>
                                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" /> Participants ({selectedCallDetails.participants?.length || 0})
                                </h4>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {selectedCallDetails.participants && selectedCallDetails.participants.length > 0 ? (
                                        selectedCallDetails.participants.map((name, i) => (
                                            <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-200">
                                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[9px] font-bold">
                                                    {name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate">{name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No other participants joined</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationPanel;
