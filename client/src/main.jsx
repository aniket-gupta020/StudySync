import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ToasterWrapper from './components/layout/ToasterWrapper.jsx';
import { Menu } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

import './index.css';

// Providers
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { CallProvider } from './context/CallContext.jsx';

// Layout
import Sidebar from './components/Sidebar.jsx';
import LoadingPage from './components/LoadingPage.jsx';

import { Suspense, lazy } from 'react';

// Pages - Lazy Loaded for Performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const GroupsPage = lazy(() => import('./pages/groups/GroupsPage.jsx'));
const GroupDetailPage = lazy(() => import('./pages/groups/GroupDetailPage.jsx'));
const DesignSystemDemo = lazy(() => import('./pages/DesignSystemDemo.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const JoinPage = lazy(() => import('./pages/groups/JoinPage.jsx'));

const GLASS_CLASSES = "bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl shadow-orange-500/5";

/**
 * ProtectedRoute — Redirects to /login if not authenticated
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingPage />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

/**
 * PublicRoute — Redirects to /dashboard if already authenticated
 */
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingPage />;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

/**
 * AppLayout — Protected wrapper with Sidebar (FreelanceFlow style)
 */
const AppLayout = ({ children, noPadding = false, hideHamburger = false }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen transition-colors duration-500 ease-in-out bg-transparent select-none">
            <div className="flex h-screen overflow-hidden">

                {/* Mobile Menu Overlay */}
                <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
                    <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setIsMobileMenuOpen(false)} />
                    <div className={`absolute top-0 left-0 w-72 h-full clay-sidebar rounded-r-2xl border-r border-white/50 dark:border-white/10 transform transition-transform duration-300 ease-out pointer-events-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <Sidebar mobile={true} closeMobile={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>

                {/* Mobile Hamburger Button */}
                {!hideHamburger && (
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className={`fixed top-4 right-4 z-50 md:hidden clay-button-icon`}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}

                {/* Desktop Sidebar */}
                <aside className={`w-72 hidden md:block clay-sidebar z-10`}>
                    <Sidebar mobile={false} />
                </aside>

                {/* Main Content */}
                <main className={`flex-1 ${noPadding ? 'overflow-hidden' : 'overflow-y-auto p-4 md:p-8'} relative`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

/**
 * App — Root component with all routes
 */
function App() {
    return (
        <Suspense fallback={<LoadingPage />}>
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <RegisterPage />
                        </PublicRoute>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Dashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/groups"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <GroupsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/groups/:id"
                    element={
                        <ProtectedRoute>
                            <AppLayout noPadding hideHamburger={true}>
                                <GroupDetailPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <ProfilePage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/join/:inviteCode"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <JoinPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Design System Demo (always accessible) */}
                <Route path="/demo" element={<DesignSystemDemo />} />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}

/**
 * Root render with all providers
 */
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <SocketProvider>
                        <CallProvider>
                            <App />
                            <ToasterWrapper />
                        </CallProvider>
                    </SocketProvider>
                </AuthProvider>
            </ThemeProvider>
            <Analytics />
        </BrowserRouter>
    </React.StrictMode>
);