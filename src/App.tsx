import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWA } from './hooks/usePWA';
import { UpdateNotification } from './components/UpdateNotification';
import './App.css';
import './components/ErrorBoundary.css';

// Lazy load pages for performance
const Home = React.lazy(() => import('./pages/Home'));
const GamePlayer = React.lazy(() => import('./pages/GamePlayer'));
const ManagerPage = React.lazy(() => import('./pages/ManagerPage'));
const Viewer = React.lazy(() => import('./pages/Viewer'));
const HTMLViewer = React.lazy(() => import('./pages/HTMLViewer'));
const InstallPage = React.lazy(() => import('./pages/InstallPage'));

// Loading component with accessibility
const LoadingFallback: React.FC = () => (
    <div className="loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true"></div>
        <span className="sr-only">Loading...</span>
    </div>
);

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
                            
                            {/* Main app routes with layout */}
                            <Route path="/" element={<MainLayout />}>
                                <Route index element={<Home />} />
                                <Route path="play/:id" element={<GamePlayer />} />
                                <Route path="open/:id" element={<GamePlayer />} />
                                <Route path="manager" element={<ManagerPage />} />
                                <Route path="resource/:id" element={<Viewer />} />
                                <Route path="html-viewer" element={<HTMLViewer />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
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
