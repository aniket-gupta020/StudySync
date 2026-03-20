import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Calendar,
    Settings, User, Sun, Moon, LogOut, X,
    GraduationCap, BookMarked, Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './notifications/NotificationPanel';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ mobile, closeMobile }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { user, logout, api } = useAuth();
    const darkMode = theme === 'dark';
    const [recentGroups, setRecentGroups] = useState([]);
    const [view, setView] = useState('main'); // 'main' | 'notifications'
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const { unreadCount } = useNotifications();

    useEffect(() => {
        if (!user) return;
        const fetchRecent = async () => {
            try {
                const { data } = await api.get('/groups');
                setRecentGroups(data.slice(0, 3));
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
                        <div className="p-6 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50">
                            <Link to="/dashboard" className="flex items-center gap-3 hover:scale-[1.02] transition-transform">
                                <div className="clay-card !p-2.5 !rounded-xl">
                                    <BookOpen className="w-6 h-6 text-orange-500 dark:text-yellow-400" />
                                </div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                                    StudySync
                                </h1>
                            </Link>
                            {mobile && <button onClick={closeMobile} className="clay-button-icon"><X className="w-5 h-5" /></button>}
                        </div>

                        <nav className="mt-4 px-4 space-y-3 flex-1 overflow-y-auto">
                            <Link to="/dashboard" className={LINK_CLASSES('/dashboard')} onClick={mobile ? closeMobile : undefined}>
                                <LayoutDashboard className="w-5 h-5" /> Dashboard
                            </Link>
                            <Link to="/groups" className={LINK_CLASSES('/groups')} onClick={mobile ? closeMobile : undefined}>
                                <Users className="w-5 h-5" /> Groups
                            </Link>
                            
                            {/* Recent Groups Dropdown */}
                            {recentGroups.length > 0 && (
                                <div className="pl-11 pr-4 space-y-1">
                                    {recentGroups.map(g => (
                                        <Link 
                                            key={g._id} 
                                            to={`/groups/${g._id}`} 
                                            onClick={mobile ? closeMobile : undefined}
                                            className={`block text-sm truncate py-1.5 px-3 rounded-lg transition-colors ${
                                                location.pathname === `/groups/${g._id}` 
                                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' 
                                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            # {g.name}
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* Notifications */}
                            <button
                                onClick={() => {
                                    setView('notifications');
                                }}
                                className="sidebar-nav-item w-full relative"
                            >
                                <Bell className="w-5 h-5" />
                                <span>Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_1px_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(249,115,22,0.3)]">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>


                        </nav>

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
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs">
                                    {user?.name?.charAt(0).toUpperCase()}
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
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sidebar;
