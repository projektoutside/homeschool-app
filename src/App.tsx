import React, { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWA } from './hooks/usePWA';
import { UpdateNotification } from './components/UpdateNotification';
import { useAuth } from './context/AuthContext';
import { buildAssetPath } from './utils/pathUtils';
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
const ClassroomPage = React.lazy(() => import('./pages/ClassroomPage'));

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

type PWAState = ReturnType<typeof usePWA>;

// Routes where auto-fullscreen should be skipped (content handles its own fullscreen)
const CONTENT_ROUTES = ['/play/', '/open/', '/resource/', '/html-viewer'];

// Main app routes where auto-fullscreen should be active
const MAIN_APP_ROUTES = ['/', '/apps', '/home-profile', '/manager', '/classroom'];

const PWAWrapperWithState: React.FC<{ children: React.ReactNode; pwa: PWAState }> = ({ children, pwa }) => {
    const { enterFullscreen, isFullscreen } = pwa;
    const location = useLocation();
    const fullscreenAttempted = useRef(false);
    const retryCount = useRef(0);
    const maxRetries = 3;

    useEffect(() => {
        const attemptFullscreen = async () => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            // Check if current route is a content route (games/worksheets/tools)
            const isContentRoute = CONTENT_ROUTES.some(route => location.pathname.startsWith(route));
            
            // Check if current route is a main app route
            const isMainAppRoute = MAIN_APP_ROUTES.some(route => 
                location.pathname === route || location.pathname.startsWith(route + '/')
            );
            
            // Auto-fullscreen for main app routes only (not content routes)
            // Skip iOS as it doesn't support the Fullscreen API well
            if (!isFullscreen && !isIOS && !isContentRoute && isMainAppRoute && retryCount.current < maxRetries) {
                retryCount.current++;
                
                // Try multiple times with increasing delays
                const delays = [100, 500, 1000];
                const currentDelay = delays[retryCount.current - 1] || 1000;
                
                setTimeout(() => {
                    enterFullscreen().then(() => {
                        fullscreenAttempted.current = true;
                    }).catch(() => {
                        // Fullscreen may be blocked (user gesture required), will retry
                        if (retryCount.current < maxRetries) {
                            attemptFullscreen();
                        }
                    });
                }, currentDelay);
            }
        };

        // Reset retry count when route changes to main app routes
        const isContentRoute = CONTENT_ROUTES.some(route => location.pathname.startsWith(route));
        if (!isContentRoute) {
            retryCount.current = 0;
        }
        
        attemptFullscreen();
    }, [isFullscreen, enterFullscreen, location.pathname]);

    return <>{children}</>;
};

const HomeProfileRouteShell = () => <div />;

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_APP_VERSION = '2026-02-15-3';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const pwa = usePWA();
    const homePageAppUrl = buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOME_PAGE_APP_VERSION}`);

    useEffect(() => {
        if (loading || !user) return;

        const preconnectHref = `${window.location.origin}/`;
        const preconnectRel = document.querySelector<HTMLLinkElement>(
            'link[data-prefetch="homeschool-home-app-preconnect"]',
        );
        if (!preconnectRel) {
            const preconnectLink = document.createElement('link');
            preconnectLink.rel = 'preconnect';
            preconnectLink.href = preconnectHref;
            preconnectLink.setAttribute('data-prefetch', 'homeschool-home-app-preconnect');
            document.head.appendChild(preconnectLink);
        }

        const preloadRel = document.querySelector<HTMLLinkElement>(
            'link[data-prefetch="homeschool-home-app-preload"]',
        );
        if (!preloadRel) {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'document';
            preloadLink.href = homePageAppUrl;
            preloadLink.setAttribute('data-prefetch', 'homeschool-home-app-preload');
            preloadLink.setAttribute('fetchpriority', 'high');
            document.head.appendChild(preloadLink);
        }

        const prefetchRel = document.querySelector<HTMLLinkElement>(
            'link[data-prefetch="homeschool-home-app-prefetch"]',
        );
        if (!prefetchRel) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.as = 'document';
            prefetchLink.href = homePageAppUrl;
            prefetchLink.setAttribute('data-prefetch', 'homeschool-home-app-prefetch');
            document.head.appendChild(prefetchLink);
        }
    }, [homePageAppUrl, loading, user]);

    useEffect(() => {
        return () => {
            document
                .querySelectorAll<HTMLLinkElement>('link[data-prefetch^="homeschool-home-app-"]')
                .forEach((link) => link.remove());
        };
    }, []);


    // Use the same base path as Vite config
    // BASE_URL from Vite includes the trailing slash, but React Router basename shouldn't
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Remove trailing slash for React Router basename
    const basename = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');

    return (
        <ErrorBoundary>
            <BrowserRouter basename={basename}>
                <PWAWrapperWithState pwa={pwa}>
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
                                <Route path="home-profile" element={<RequireAuth user={user} loading={loading}><HomeProfileRouteShell /></RequireAuth>} />
                                <Route path="classroom" element={<RequireAuth user={user} loading={loading}><ClassroomPage /></RequireAuth>} />
                                <Route path="*" element={<Navigate to="/home-profile" replace />} />
                            </Route>
                        </Routes>
                    </Suspense>
                    <UpdateNotification
                        updateInfo={pwa.updateInfo}
                        isCheckingForUpdates={pwa.isCheckingForUpdates}
                        checkForUpdates={pwa.checkForUpdates}
                        applyUpdate={pwa.applyUpdate}
                    />
                </PWAWrapperWithState>
            </BrowserRouter>
        </ErrorBoundary>
    );
};

export default App;
