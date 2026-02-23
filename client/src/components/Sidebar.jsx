import React from 'react';
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
    const { user, logout } = useAuth();
    const darkMode = theme === 'dark';

    const isActive = (path) => path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path);

    const LINK_CLASSES = (path) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive(path)
        ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white dark:bg-yellow-500 dark:text-black shadow-lg shadow-orange-500/20"
        : "text-slate-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/5"
        }`;

    const handleToggleTheme = () => {
        toggleTheme();
        toast.success(`Switched to ${darkMode ? 'Light' : 'Dark'} Mode`, {
            icon: darkMode ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-white" />,
            style: { borderRadius: '12px', background: darkMode ? '#fff' : '#333', color: darkMode ? '#000' : '#fff' }
        });
    };

    const handleLogout = () => {
        toast.custom((t) => (
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/5 p-6 rounded-2xl max-w-sm w-full">
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
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-colors"
                            >
                                Log Out
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl font-medium text-sm transition-colors"
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
                <h1 className="text-2xl font-bold text-orange-600 dark:text-yellow-400 flex items-center gap-2">
                    <BookOpen className="w-8 h-8" /> StudySync
                </h1>
                {mobile && <button onClick={closeMobile}><X className="w-6 h-6 dark:text-white" /></button>}
            </div>

            <nav className="mt-2 px-4 space-y-3 flex-1">
                <Link to="/dashboard" className={LINK_CLASSES('/dashboard')} onClick={mobile ? closeMobile : undefined}>
                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                </Link>
                <Link to="/groups" className={LINK_CLASSES('/groups')} onClick={mobile ? closeMobile : undefined}>
                    <Users className="w-5 h-5" /> Groups
                </Link>
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

            <div className="p-4 border-t border-white/20 dark:border-white/5 space-y-3 mt-auto">
                <button onClick={handleToggleTheme} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/5 rounded-xl font-medium transition-all duration-300">
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-medium transition-all duration-300">
                    <LogOut className="w-5 h-5" /> Log Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
