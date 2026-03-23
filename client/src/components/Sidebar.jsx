import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Calendar,
    Settings, User, Sun, Moon, LogOut, X,
    GraduationCap, BookMarked, Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './notifications/NotificationPanel';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ mobile, closeMobile }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { user, logout, api } = useAuth();
    const { socket, isConnected } = useSocket();
    const darkMode = theme === 'dark';
    const [recentGroups, setRecentGroups] = useState([]);
    const [view, setView] = useState('main'); // 'main' | 'notifications'
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const { unreadCount } = useNotifications();

    // Track unread message counts per group: { groupId: count }
    const [unreadCounts, setUnreadCounts] = useState({});
    // Track typing users per group: { groupId: { userId: userName } }
    const [typingByGroup, setTypingByGroup] = useState({});
    // Typing timeout refs
    const typingTimers = useRef({});

    // Fetch groups
    useEffect(() => {
        if (!user) return;
        const fetchRecent = async () => {
            try {
                const { data } = await api.get('/groups');
                setRecentGroups(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRecent();

        const handleGroupUpdate = () => {
            fetchRecent();
        };

        window.addEventListener('groupUpdated', handleGroupUpdate);
        return () => window.removeEventListener('groupUpdated', handleGroupUpdate);
    }, [user, api]);

    // Clear unread count when user navigates to a group's page
    useEffect(() => {
        const match = location.pathname.match(/^\/groups\/([a-f0-9]{24})$/i);
        if (match) {
            const currentGroupId = match[1];
            setUnreadCounts(prev => {
                if (prev[currentGroupId]) {
                    const next = { ...prev };
                    delete next[currentGroupId];
                    return next;
                }
                return prev;
            });
        }
    }, [location.pathname]);

    // Socket listeners for unread counts, typing, and dynamic reordering
    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        // Listen for new message notifications (sent to personal room)
        const handleAppNotification = (data) => {
            if (data.type !== 'message') return;
            const groupId = data.groupId;
            if (!groupId) return;

            // Don't count if user is currently viewing that group
            const isViewingGroup = location.pathname === `/groups/${groupId}`;
            if (!isViewingGroup) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [groupId]: (prev[groupId] || 0) + 1
                }));
            }

            // Move this group to top of the list (most recent message)
            setRecentGroups(prev => {
                const idx = prev.findIndex(g => g._id === groupId);
                if (idx <= 0) return prev; // Already at top or not found
                const updated = [...prev];
                const [group] = updated.splice(idx, 1);
                updated.unshift(group);
                return updated;
            });
        };

        // Listen for typing events
        const handleUserTyping = ({ user: typingUser }) => {
            if (!typingUser || String(typingUser._id) === String(user._id)) return;
            
            // We need to figure out which group this typing is for.
            // The typing events are broadcast to room members. But in the sidebar,
            // we listen via the personal room. We need to emit a sidebar-specific event.
            // Actually, we can use 'app-notification' style. But typing events are emitted
            // to the room, not the personal room. Let me handle via a different approach.
        };

        socket.on('app-notification', handleAppNotification);

        // Listen for sidebar-specific typing events (we'll emit these from the server)
        const handleSidebarTyping = ({ groupId, userId, userName }) => {
            if (String(userId) === String(user._id)) return;

            setTypingByGroup(prev => ({
                ...prev,
                [groupId]: { ...(prev[groupId] || {}), [userId]: userName }
            }));

            // Auto-clear after 3 seconds
            const timerKey = `${groupId}_${userId}`;
            if (typingTimers.current[timerKey]) {
                clearTimeout(typingTimers.current[timerKey]);
            }
            typingTimers.current[timerKey] = setTimeout(() => {
                setTypingByGroup(prev => {
                    const groupTyping = { ...(prev[groupId] || {}) };
                    delete groupTyping[userId];
                    if (Object.keys(groupTyping).length === 0) {
                        const next = { ...prev };
                        delete next[groupId];
                        return next;
                    }
                    return { ...prev, [groupId]: groupTyping };
                });
            }, 3000);
        };

        const handleSidebarStopTyping = ({ groupId, userId }) => {
            const timerKey = `${groupId}_${userId}`;
            if (typingTimers.current[timerKey]) {
                clearTimeout(typingTimers.current[timerKey]);
                delete typingTimers.current[timerKey];
            }
            setTypingByGroup(prev => {
                const groupTyping = { ...(prev[groupId] || {}) };
                delete groupTyping[userId];
                if (Object.keys(groupTyping).length === 0) {
                    const next = { ...prev };
                    delete next[groupId];
                    return next;
                }
                return { ...prev, [groupId]: groupTyping };
            });
        };

        socket.on('sidebar-typing', handleSidebarTyping);
        socket.on('sidebar-stop-typing', handleSidebarStopTyping);

        return () => {
            socket.off('app-notification', handleAppNotification);
            socket.off('sidebar-typing', handleSidebarTyping);
            socket.off('sidebar-stop-typing', handleSidebarStopTyping);
            // Clear all typing timers
            Object.values(typingTimers.current).forEach(clearTimeout);
            typingTimers.current = {};
        };
    }, [socket, isConnected, user, location.pathname]);

    const isActive = (path) => path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname === path;

    const LINK_CLASSES = (path) => (location.pathname === path || (path === '/groups' && location.pathname === '/groups')) ? "sidebar-nav-item-active" : "sidebar-nav-item";

    const handleToggleTheme = () => {
        toggleTheme();
        toast.success(`Switched to ${darkMode ? 'Light' : 'Dark'} Mode`, {
            icon: darkMode ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-slate-800 dark:text-white" />,
            className: 'clay-toast'
        });
    };

    const handleLogout = () => {
        toast.custom((t) => (
            <div className="clay-card max-w-sm w-full pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full">
                        <LogOut className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Log Out?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">Really want to log out?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    logout();
                                    navigate('/login');
                                }}
                                className="clay-button flex-1 text-sm py-2 px-4"
                            >
                                Log Out
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="clay-button-secondary flex-1 text-sm py-2 px-4"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ));
    };

    // Helper: get typing text for a group
    const getTypingText = (groupId) => {
        const typers = typingByGroup[groupId];
        if (!typers) return null;
        const names = Object.values(typers);
        if (names.length === 0) return null;
        if (names.length === 1) return `${names[0]} is typing...`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
        return `${names[0]} and ${names.length - 1} others typing...`;
    };

    return (
        <div className="h-full relative overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
                {view === 'main' ? (
                    <motion.div
                        key="main"
                        initial={{ x: 0 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                    >
                        <div className="p-4 px-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
                            <Link to="/dashboard" className="flex items-center gap-3 hover:scale-[1.02] transition-transform">
                                <div className="clay-card !p-2 !rounded-xl">
                                    <BookOpen className="w-5 h-5 text-orange-500 dark:text-yellow-400" />
                                </div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                                    StudySync
                                </h1>
                            </Link>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setView('notifications')}
                                    className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Notifications"
                                >
                                    <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-[0_2px_4px_rgba(249,115,22,0.3)]">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Nav links */}
                        <div className="px-4 pt-3 pb-1 space-y-1 flex-shrink-0">
                            <Link to="/dashboard" className={LINK_CLASSES('/dashboard')} onClick={mobile ? closeMobile : undefined}>
                                <LayoutDashboard className="w-5 h-5" /> Dashboard
                            </Link>
                            <Link to="/groups" className={LINK_CLASSES('/groups')} onClick={mobile ? closeMobile : undefined}>
                                <Users className="w-5 h-5" /> Groups
                            </Link>
                        </div>

                        {/* Group list - scrollable */}
                        <div className="flex-1 overflow-y-auto px-3 py-1">
                            {recentGroups.length > 0 && (
                                <div className="space-y-0.5">
                                    {recentGroups.map(g => {
                                        const count = unreadCounts[g._id] || 0;
                                        const typingText = getTypingText(g._id);
                                        const isCurrentGroup = location.pathname === `/groups/${g._id}`;

                                        return (
                                            <Link 
                                                key={g._id} 
                                                to={`/groups/${g._id}`} 
                                                onClick={() => {
                                                    setUnreadCounts(prev => {
                                                        const next = { ...prev };
                                                        delete next[g._id];
                                                        return next;
                                                    });
                                                    if (mobile) closeMobile?.();
                                                }}
                                                className={`flex items-center gap-2.5 py-2 px-2.5 rounded-xl transition-all ${
                                                    isCurrentGroup 
                                                    ? 'bg-orange-500/10 dark:bg-orange-500/10' 
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                {/* Group Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                                                    {g.groupPicture ? (
                                                        <img src={g.groupPicture} alt={g.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        g.name?.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                {/* Name + Typing/Preview */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm truncate ${
                                                        isCurrentGroup
                                                        ? 'text-orange-600 dark:text-orange-400 font-semibold'
                                                        : count > 0
                                                        ? 'text-slate-800 dark:text-white font-semibold'
                                                        : 'text-slate-600 dark:text-slate-300 font-medium'
                                                    }`}>
                                                        {g.name}
                                                    </p>
                                                    {typingText ? (
                                                        <p className="text-[11px] text-green-500 dark:text-green-400 font-medium truncate italic">
                                                            {typingText}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                                            {g.members?.length} members
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Unread Badge */}
                                                {count > 0 && !isCurrentGroup && (
                                                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_2px_4px_rgba(249,115,22,0.3)]">
                                                        {count > 9 ? '9+' : count}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2 mt-auto relative">
                            <AnimatePresence>
                                {showAccountMenu && (
                                    <>
                                        <div className="fixed inset-0 z-0" onClick={() => setShowAccountMenu(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-4 right-4 mb-3 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-10 flex flex-col gap-1 animate-in duration-150"
                                        >
                                            <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm transition-colors" onClick={() => { setShowAccountMenu(false); if (mobile) closeMobile(); }}>
                                                <User className="w-4 h-4" /> View Profile
                                            </Link>
                                            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm transition-colors w-full">
                                                <LogOut className="w-4 h-4" /> Log Out
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>

                            <button onClick={handleToggleTheme} className="sidebar-nav-item w-full text-xs">
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {darkMode ? "Light Mode" : "Dark Mode"}
                            </button>
                            
                            <button onClick={() => setShowAccountMenu(!showAccountMenu)} className={`sidebar-nav-item w-full flex items-center gap-3 p-2 rounded-xl transition-all ${showAccountMenu ? 'bg-slate-100 dark:bg-slate-800 shadow-sm' : ''}`}>
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="notifications"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                    >
                        <NotificationPanel
                            onClose={() => setView('main')}
                            onNavigate={mobile ? closeMobile : undefined}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sidebar;
