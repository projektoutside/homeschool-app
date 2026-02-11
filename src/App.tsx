import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWA } from './hooks/usePWA';
import { UpdateNotification } from './components/UpdateNotification';
import { useAuth } from './context/AuthContext';
import './App.css';
import './components/ErrorBoundary.css';

// Lazy load pages for performance
const Home = React.lazy(() => import('./pages/Home'));
const GamePlayer = React.lazy(() => import('./pages/GamePlayer'));
const ManagerPage = React.lazy(() => import('./pages/ManagerPage'));
const Viewer = React.lazy(() => import('./pages/Viewer'));
const HTMLViewer = React.lazy(() => import('./pages/HTMLViewer'));
const InstallPage = React.lazy(() => import('./pages/InstallPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const UserHomePage = React.lazy(() => import('./pages/UserHomePage'));

// Loading component with accessibility
const LoadingFallback: React.FC = () => (
    <div className="loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true"></div>
        <span className="sr-only">Loading...</span>
    </div>
);

const RequireAuth: React.FC<{ user: User | null; loading: boolean; children: React.ReactNode }> = ({
    user,
    loading,
    children,
}) => {
    if (loading) return <LoadingFallback />;
    if (!user) return <Navigate to="/auth" replace />;
    return <>{children}</>;
};

/**
 * PWA Wrapper Component
 * Handles fullscreen mode and PWA initialization
 */
const PWAWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isStandalone, enterFullscreen, isFullscreen } = usePWA();

    // Auto-enter fullscreen when app is launched from home screen
    useEffect(() => {
        const attemptFullscreen = async () => {
            // Only auto-enter fullscreen if:
            // 1. App is in standalone mode (installed)
            // 2. Not already in fullscreen
            // 3. Not on iOS (iOS doesn't support fullscreen API well)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (isStandalone && !isFullscreen && !isIOS) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    enterFullscreen().catch(() => {
                        // Fullscreen may be blocked, that's ok
                    });
                }, 100);
            }
        };

        attemptFullscreen();
    }, [isStandalone, isFullscreen, enterFullscreen]);

    return <>{children}</>;
};

const App: React.FC = () => {
    const { user, loading } = useAuth();

    // Use the same base path as Vite config
    // BASE_URL from Vite includes the trailing slash, but React Router basename shouldn't
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Remove trailing slash for React Router basename
    const basename = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');

    return (
        <ErrorBoundary>
            <BrowserRouter basename={basename}>
                <PWAWrapper>
                    <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                            {/* Install page - accessible without layout */}
                            <Route path="/install" element={<InstallPage />} />
                            <Route
                                path="/auth"
                                element={loading ? <LoadingFallback /> : user ? <Navigate to="/home-profile" replace /> : <AuthPage />}
                            />
                            
                            {/* Main app routes with layout */}
                            <Route path="/" element={<MainLayout />}>
                                <Route index element={<RequireAuth user={user} loading={loading}><Navigate to="/home-profile" replace /></RequireAuth>} />
                                <Route path="apps" element={<RequireAuth user={user} loading={loading}><Home /></RequireAuth>} />
                                <Route path="play/:id" element={<RequireAuth user={user} loading={loading}><GamePlayer /></RequireAuth>} />
                                <Route path="open/:id" element={<RequireAuth user={user} loading={loading}><GamePlayer /></RequireAuth>} />
                                <Route path="manager" element={<RequireAuth user={user} loading={loading}><ManagerPage /></RequireAuth>} />
                                <Route path="resource/:id" element={<RequireAuth user={user} loading={loading}><Viewer /></RequireAuth>} />
                                <Route path="html-viewer" element={<RequireAuth user={user} loading={loading}><HTMLViewer /></RequireAuth>} />
                                <Route path="home-profile" element={<RequireAuth user={user} loading={loading}><UserHomePage /></RequireAuth>} />
                                <Route path="*" element={<Navigate to="/home-profile" replace />} />
                            </Route>
                        </Routes>
                    </Suspense>
                    <UpdateNotification />
                </PWAWrapper>
            </BrowserRouter>
        </ErrorBoundary>
    );
};

export default App;
