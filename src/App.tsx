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
import CinematicLoadingScreen from './components/CinematicLoadingScreen';
import { HomepageSessionGate } from './components/HomepageSessionGate';
import { useAuth } from './context/AuthContext';
import { HOMEPAGE_APP_RUNTIME_VERSION } from './constants/homepageAppVersion';
import { buildAssetPath } from './utils/pathUtils';
import Home from './pages/Home';
import './App.css';
import './components/ErrorBoundary.css';

const loadGamePlayerRoute = () => import('./pages/GamePlayer');
const loadManagerRoute = () => import('./pages/ManagerPage');
const loadViewerRoute = () => import('./pages/Viewer');
const loadHTMLViewerRoute = () => import('./pages/HTMLViewer');
const loadInstallRoute = () => import('./pages/InstallPage');
const loadAuthRoute = () => import('./pages/AuthPage');
const loadClassroomRoute = () => import('./pages/ClassroomPage');
const loadCharacterCreatorRoute = () => import('./pages/CharacterCreatorPage');

// Lazy load pages for performance
const GamePlayer = React.lazy(loadGamePlayerRoute);
const ManagerPage = React.lazy(loadManagerRoute);
const Viewer = React.lazy(loadViewerRoute);
const HTMLViewer = React.lazy(loadHTMLViewerRoute);
const InstallPage = React.lazy(loadInstallRoute);
const AuthPage = React.lazy(loadAuthRoute);
const ClassroomPage = React.lazy(loadClassroomRoute);
const CharacterCreatorPage = React.lazy(loadCharacterCreatorRoute);

// Loading component with accessibility
const LoadingFallback: React.FC = () => (
    <CinematicLoadingScreen mode="indeterminate" ready={false} surface="page" />
);

const RouteBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
);

const HomeRoutePlaceholder: React.FC = () => null;

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

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_APP_THREE_MODULE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const pwa = usePWA();
    useNativeShell({ isNativeApp: pwa.isNativeApp, nativePlatform: pwa.nativePlatform });
    const homePageAppUrl = buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOMEPAGE_APP_RUNTIME_VERSION}`);

    useAppAssetPrefetch({
        loading,
        homePageAppUrl,
        homePageThreeModuleUrl: HOME_PAGE_APP_THREE_MODULE_URL,
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
                    <Routes>
                        {/* Install page - accessible without layout */}
                        <Route path="/install" element={<RouteBoundary><InstallPage /></RouteBoundary>} />
                        <Route
                            path="/auth"
                            element={
                                loading
                                    ? <LoadingFallback />
                                    : user
                                        ? <Navigate to="/home-profile" replace />
                                        : <RouteBoundary><AuthPage /></RouteBoundary>
                            }
                        />
                        
                        {/* Main app routes with layout */}
                        <Route path="/" element={renderProtectedPage(<MainLayout />)}>
                            <Route index element={<Navigate to="/home-profile" replace />} />
                            <Route
                                path="apps"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><Home /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="play/:id"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><GamePlayer /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="open/:id"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><GamePlayer /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="manager"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><ManagerPage /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="character-creator"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><CharacterCreatorPage /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="resource/:id"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><Viewer /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route
                                path="html-viewer"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><HTMLViewer /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route path="home-profile" element={<HomeRoutePlaceholder />} />
                            <Route
                                path="classroom"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><ClassroomPage /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route path="*" element={<Navigate to="/home-profile" replace />} />
                        </Route>
                    </Routes>
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
