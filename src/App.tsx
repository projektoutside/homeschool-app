import React, { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWA } from './hooks/usePWA';
import { useAppAssetPrefetch } from './hooks/useAppAssetPrefetch';
import { UpdateNotification } from './components/UpdateNotification';
import { useAuth } from './context/AuthContext';
import { HOMEPAGE_APP_RUNTIME_VERSION } from './constants/homepageAppVersion';
import { buildAssetPath } from './utils/pathUtils';
import './App.css';
import './components/ErrorBoundary.css';

const loadHomeRoute = () => import('./pages/Home');
const loadGamePlayerRoute = () => import('./pages/GamePlayer');
const loadManagerRoute = () => import('./pages/ManagerPage');
const loadViewerRoute = () => import('./pages/Viewer');
const loadHTMLViewerRoute = () => import('./pages/HTMLViewer');
const loadInstallRoute = () => import('./pages/InstallPage');
const loadAuthRoute = () => import('./pages/AuthPage');
const loadClassroomRoute = () => import('./pages/ClassroomPage');
const loadCharacterCreatorRoute = () => import('./pages/CharacterCreatorPage');

// Lazy load pages for performance
const Home = React.lazy(loadHomeRoute);
const GamePlayer = React.lazy(loadGamePlayerRoute);
const ManagerPage = React.lazy(loadManagerRoute);
const Viewer = React.lazy(loadViewerRoute);
const HTMLViewer = React.lazy(loadHTMLViewerRoute);
const InstallPage = React.lazy(loadInstallRoute);
const AuthPage = React.lazy(loadAuthRoute);
const CharacterCreatorPage = React.lazy(loadCharacterCreatorRoute);

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
const MAIN_APP_ROUTES = ['/', '/apps', '/home-profile', '/manager', '/classroom', '/character-creator'];

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
const ClassroomRouteShell = () => <div />;

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_APP_THREE_MODULE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
const CLASSROOM_APP_PATH = '3dClass/index.html';
const CLASSROOM_DOOR_INTRO_PATH = '3dClass/door-intro.html';
const CLASSROOM_DOOR_AUDIO_PATH = '3dClass/audio/dooropening.mp3';
const CLASSROOM_APP_VERSION = '2026-03-10-1';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const pwa = usePWA();
    const homePageAppUrl = buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOMEPAGE_APP_RUNTIME_VERSION}`);
    const classroomAppUrl = buildAssetPath(`${CLASSROOM_APP_PATH}?v=${CLASSROOM_APP_VERSION}&intro=0`);
    const classroomDoorIntroUrl = buildAssetPath(`${CLASSROOM_DOOR_INTRO_PATH}?v=${CLASSROOM_APP_VERSION}`);
    const classroomDoorAudioUrl = buildAssetPath(CLASSROOM_DOOR_AUDIO_PATH);

    useAppAssetPrefetch({
        loading,
        homePageAppUrl,
        classroomAppUrl,
        classroomDoorIntroUrl,
        classroomDoorAudioUrl,
        homePageThreeModuleUrl: HOME_PAGE_APP_THREE_MODULE_URL,
        loadHomeRoute,
        loadClassroomRoute,
        loadHTMLViewerRoute,
        loadGamePlayerRoute,
        loadViewerRoute,
        loadCharacterCreatorRoute,
        loadManagerRoute,
    });


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
                                <Route path="character-creator" element={<RequireAuth user={user} loading={loading}><CharacterCreatorPage /></RequireAuth>} />
                                <Route path="resource/:id" element={<RequireAuth user={user} loading={loading}><Viewer /></RequireAuth>} />
                            <Route path="html-viewer" element={<RequireAuth user={user} loading={loading}><HTMLViewer /></RequireAuth>} />
                                <Route path="home-profile" element={<RequireAuth user={user} loading={loading}><HomeProfileRouteShell /></RequireAuth>} />
                                <Route path="classroom" element={<RequireAuth user={user} loading={loading}><ClassroomRouteShell /></RequireAuth>} />
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
