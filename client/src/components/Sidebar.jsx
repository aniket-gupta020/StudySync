import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Calendar,
    Settings, User, Sun, Moon, LogOut, X,
    GraduationCap, BookMarked
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Sidebar = ({ mobile, closeMobile }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { user, logout, api } = useAuth();
    const darkMode = theme === 'dark';
    const [recentGroups, setRecentGroups] = useState([]);

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
        <div className="flex flex-col h-full">
            <div className="p-6 flex items-center justify-between">
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

            <nav className="mt-2 px-4 space-y-3 flex-1">
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
                <Link to="/profile" className={LINK_CLASSES('/profile')} onClick={mobile ? closeMobile : undefined}>
                    <User className="w-5 h-5" />
                    <div className="flex-1 flex items-center justify-between">
                        <span>{user?.name || 'Profile'}</span>
                        <span className="text-base" title={user?.role === 'tutor' ? 'Tutor' : 'Student'}>
                            {user?.role === 'tutor' ? '📖' : '🎓'}
                        </span>
                    </div>
                </Link>
            </nav>

            <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3 mt-auto">
                <button onClick={handleToggleTheme} className="sidebar-nav-item w-full">
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={handleLogout} className="sidebar-nav-item w-full !text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20">
                    <LogOut className="w-5 h-5" /> Log Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
