import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    BookOpen,
    Users,
    Calendar,
    Settings,
    Menu,
    X
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/**
 * Navigation - Responsive navigation component
 * Desktop: Fixed sidebar on the left
 * Tablet: Collapsible sidebar
 * Mobile: Bottom navigation bar
 */
const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/study', icon: BookOpen, label: 'Study' },
        { path: '/groups', icon: Users, label: 'Groups' },
        { path: '/schedule', icon: Calendar, label: 'Schedule' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (path) => location.pathname === path;

    // Desktop & Tablet Sidebar
    const Sidebar = () => (
        <aside
            className={`
        fixed top-0 left-0 h-full w-64 
        glass-sidebar
        transform transition-transform duration-300 ease-in-out
        z-40
        hidden md:block
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        >
            <div className="flex flex-col h-full p-6">
                {/* Logo */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                        StudySync
                    </h1>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={
                                    isActive(item.path)
                                        ? 'sidebar-nav-item-active'
                                        : 'sidebar-nav-item'
                                }
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Theme Toggle */}
                <div className="mt-auto pt-6 border-t border-white/20 dark:border-white/10">
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );

    // Mobile Bottom Navigation
    const BottomNav = () => (
        <nav className="bottom-nav">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.slice(0, 4).map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={
                                isActive(item.path)
                                    ? 'bottom-nav-item-active'
                                    : 'bottom-nav-item'
                            }
                        >
                            <Icon size={24} />
                            <span className="text-xs mt-1">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );

    // Mobile Menu Toggle Button
    const MenuToggle = () => (
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="fixed top-4 left-4 z-50 md:hidden glass-button-icon"
            aria-label="Toggle menu"
        >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
    );

    // Mobile Sidebar Overlay
    const MobileOverlay = () => (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
            <aside
                className={`
          fixed top-0 left-0 h-full w-64 
          glass-sidebar
          transform transition-transform duration-300 ease-in-out
          z-40
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full p-6 pt-20">
                    {/* Navigation Items */}
                    <nav className="flex-1 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={
                                        isActive(item.path)
                                            ? 'sidebar-nav-item-active'
                                            : 'sidebar-nav-item'
                                    }
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Theme Toggle */}
                    <div className="mt-auto pt-6 border-t border-white/20 dark:border-white/10">
                        <ThemeToggle />
                    </div>
                </div>
            </aside>
        </>
    );

    return (
        <>
            <Sidebar />
            <BottomNav />
            <MenuToggle />
            <MobileOverlay />
        </>
    );
};

export default Navigation;
