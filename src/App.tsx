import React, { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import AndroidInstallGate from './components/AndroidInstallGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWA } from './hooks/usePWA';
import { useAppAssetPrefetch } from './hooks/useAppAssetPrefetch';
import { useNativeShell } from './hooks/useNativeShell';
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

const RequireInstalledShell: React.FC<{ pwa: PWAState; children: React.ReactNode }> = ({ pwa, children }) => {
    if (pwa.requiresInstalledShell) {
        return <AndroidInstallGate />;
    }

    return <>{children}</>;
};

const FULLSCREEN_EXEMPT_ROUTES = ['/install', '/auth'];

const PWAWrapperWithState: React.FC<{ children: React.ReactNode; pwa: PWAState }> = ({ children, pwa }) => {
    const {
        enterFullscreen,
        isFullscreen,
        isStandaloneShell,
        requiresInstalledShell,
        shouldUseNativeFullscreenFallback,
    } = pwa;
    const location = useLocation();
    const retryCount = useRef(0);
    const maxRetries = 3;

    useEffect(() => {
        const attemptFullscreen = async () => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isFullscreenExemptRoute = FULLSCREEN_EXEMPT_ROUTES.some(route =>
                location.pathname === route || location.pathname.startsWith(`${route}/`)
            );
            const shellAlreadyImmersive = isFullscreen || isStandaloneShell;

            // Keep the installed app shell fullscreen on every authenticated route.
            // Skip iOS because the browser Fullscreen API is not reliable there.
            if (
                !shellAlreadyImmersive
                && !isIOS
                && !isFullscreenExemptRoute
                && !requiresInstalledShell
                && shouldUseNativeFullscreenFallback
                && retryCount.current < maxRetries
            ) {
                retryCount.current++;
                
                // Try multiple times with increasing delays
                const delays = [100, 500, 1000];
                const currentDelay = delays[retryCount.current - 1] || 1000;
                
                setTimeout(() => {
                    enterFullscreen().catch(() => {
                        // Fullscreen may be blocked (user gesture required), will retry
                        if (retryCount.current < maxRetries) {
                            attemptFullscreen();
                        }
                    });
                }, currentDelay);
            }
        };

        const isFullscreenExemptRoute = FULLSCREEN_EXEMPT_ROUTES.some(route =>
            location.pathname === route || location.pathname.startsWith(`${route}/`)
        );
        if (!isFullscreenExemptRoute) {
            retryCount.current = 0;
        }
        
        attemptFullscreen();
    }, [
        enterFullscreen,
        isFullscreen,
        isStandaloneShell,
        location.pathname,
        requiresInstalledShell,
        shouldUseNativeFullscreenFallback,
    ]);

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
    useNativeShell({ isNativeApp: pwa.isNativeApp, nativePlatform: pwa.nativePlatform });
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
    const renderProtectedPage = (node: React.ReactNode) => (
        <RequireAuth user={user} loading={loading}>
            <RequireInstalledShell pwa={pwa}>{node}</RequireInstalledShell>
        </RequireAuth>
    );

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
                            <Route path="/" element={renderProtectedPage(<MainLayout />)}>
                                <Route index element={<Navigate to="/home-profile" replace />} />
                                <Route path="apps" element={<Home />} />
                                <Route path="play/:id" element={<GamePlayer />} />
                                <Route path="open/:id" element={<GamePlayer />} />
                                <Route path="manager" element={<ManagerPage />} />
                                <Route path="character-creator" element={<CharacterCreatorPage />} />
                                <Route path="resource/:id" element={<Viewer />} />
                                <Route path="html-viewer" element={<HTMLViewer />} />
                                <Route path="home-profile" element={<HomeProfileRouteShell />} />
                                <Route path="classroom" element={<ClassroomRouteShell />} />
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
