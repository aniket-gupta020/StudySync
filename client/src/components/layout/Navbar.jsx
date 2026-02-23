import { motion } from 'framer-motion';
import { Moon, Sun, User, LogOut, GraduationCap, BookMarked } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <nav className="glass-nav sticky top-0 z-50 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">SS</span>
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent">
                        StudySync
                    </h1>
                </motion.div>

                {/* Right Side */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleTheme}
                        className="glass-button-secondary p-2.5 rounded-lg"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? (
                            <Moon className="h-5 w-5" />
                        ) : (
                            <Sun className="h-5 w-5" />
                        )}
                    </motion.button>

                    {/* User Profile Dropdown */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 glass-button-secondary px-4 py-2.5 rounded-lg"
                        >
                            <User className="h-5 w-5" />
                            <span className="hidden md:inline font-medium">{user?.name}</span>
                        </motion.button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 mt-2 w-56 glass-modal p-2 shadow-xl"
                            >
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {user?.name}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {user?.email}
                                    </p>
                                    {user?.role === 'tutor' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white mt-1">
                                            <BookMarked className="w-3 h-3" fill="currentColor" /> TUTOR
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white mt-1">
                                            <GraduationCap className="w-3 h-3" /> STUDENT
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-2 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Logout</span>
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
