import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeToggle - Smooth theme switching component
 * Features sliding animation and orange accent color
 */
const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle w-full flex items-center justify-between"
            aria-label="Toggle theme"
        >
            <div className="flex items-center gap-3">
                {isDark ? (
                    <>
                        <Moon className="text-primary-400" size={20} />
                        <span className="text-sm font-medium text-slate-200">Dark Mode</span>
                    </>
                ) : (
                    <>
                        <Sun className="text-primary-600" size={20} />
                        <span className="text-sm font-medium text-slate-700">Light Mode</span>
                    </>
                )}
            </div>

            {/* Toggle Switch */}
            <div className="relative w-12 h-6 bg-white/30 dark:bg-dark-50/30 rounded-full transition-colors duration-300">
                <div
                    className={`
            absolute top-0.5 w-5 h-5 
            bg-gradient-to-r from-primary-500 to-primary-600 
            rounded-full shadow-md
            transform transition-transform duration-300 ease-in-out
            ${isDark ? 'translate-x-6' : 'translate-x-0.5'}
          `}
                />
            </div>
        </button>
    );
};

export default ThemeToggle;
