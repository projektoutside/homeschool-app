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
import AppLoadingFallback from './components/AppLoadingFallback';
import { HomepageSessionGate } from './components/HomepageSessionGate';
import { useAuth } from './context/AuthContext';
import { resolveProtectedRouteState } from './context/authBoot';
import { CLASSROOM_RUNTIME_VERSION } from './constants/classroomRuntimeVersion';
import { HOMEPAGE_APP_RUNTIME_VERSION } from './constants/homepageAppVersion';
import { useCinematicInteractionFeedback } from './hooks/useCinematicInteractionFeedback';
import { buildAssetPath } from './utils/pathUtils';
import './App.css';
import './components/ErrorBoundary.css';

const loadHomeRoute = () => import('./pages/Home');
const loadHTMLViewerRoute = () => import('./pages/HTMLViewer');
const loadClassroomRoute = () => import('./pages/ClassroomPage');
const loadGamePlayerRoute = () => import('./pages/GamePlayer');
const loadManagerRoute = () => import('./pages/ManagerPage');
const loadViewerRoute = () => import('./pages/Viewer');
const loadInstallRoute = () => import('./pages/InstallPage');
const loadAuthRoute = () => import('./pages/AuthPage');
const loadCharacterCreatorRoute = () => import('./pages/CharacterCreatorPage');

// Lazy load pages for performance
const Home = React.lazy(loadHomeRoute);
const HTMLViewer = React.lazy(loadHTMLViewerRoute);
const ClassroomPage = React.lazy(loadClassroomRoute);
const GamePlayer = React.lazy(loadGamePlayerRoute);
const ManagerPage = React.lazy(loadManagerRoute);
const Viewer = React.lazy(loadViewerRoute);
const InstallPage = React.lazy(loadInstallRoute);
const AuthPage = React.lazy(loadAuthRoute);
const CharacterCreatorPage = React.lazy(loadCharacterCreatorRoute);

// Loading component with accessibility
const LoadingFallback: React.FC = () => (
    <AppLoadingFallback />
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
    const location = useLocation();
    const canBypassLoadingFallback = React.useMemo(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const isWorksheetOrClassroomRoute =
            location.pathname === '/html-viewer'
            || location.pathname === '/classroom';

        if (!isWorksheetOrClassroomRoute) {
            return false;
        }

        try {
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index) ?? '';
                if (!/^sb-.*-auth-token$/i.test(key)) {
                    continue;
                }

                if (window.localStorage.getItem(key)) {
                    return true;
                }
            }
        } catch {
            return false;
        }

        return false;
    }, [location.pathname]);

    const routeState = resolveProtectedRouteState({
        user,
        loading,
        allowWhileLoading: canBypassLoadingFallback,
    });
    if (routeState === 'pending') return <LoadingFallback />;
    if (routeState === 'deny') return <Navigate to="/auth" replace />;
    return <>{children}</>;
};

type PWAState = ReturnType<typeof usePWA>;

const RoutePrefetchCoordinator: React.FC<{
    loading: boolean;
    homePageAppUrl: string;
    classroomAppUrl: string;
    classroomDoorIntroUrl: string;
    classroomDoorAudioUrl: string;
}> = ({
    loading,
    homePageAppUrl,
    classroomAppUrl,
    classroomDoorIntroUrl,
    classroomDoorAudioUrl,
}) => {
    const location = useLocation();

    useAppAssetPrefetch({
        loading,
        routePath: location.pathname,
        homePageAppUrl,
        classroomAppUrl,
        classroomDoorIntroUrl,
        classroomDoorAudioUrl,
        loadHomeRoute,
        loadClassroomRoute,
        loadHTMLViewerRoute,
        loadViewerRoute,
    });

    return null;
};

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
    const isFullscreenExemptRoute = FULLSCREEN_EXEMPT_ROUTES.some(route =>
        location.pathname === route || location.pathname.startsWith(`${route}/`)
    );

    useEffect(() => {
        const attemptFullscreen = async () => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const shellAlreadyImmersive = isFullscreen || isStandaloneShell;

            if (
                !shellAlreadyImmersive
                && !isIOS
                && !isFullscreenExemptRoute
                && !requiresInstalledShell
                && shouldUseNativeFullscreenFallback
                && retryCount.current < maxRetries
            ) {
                retryCount.current += 1;

                const delays = [100, 500, 1000];
                const currentDelay = delays[retryCount.current - 1] || 1000;

                window.setTimeout(() => {
                    enterFullscreen().catch(() => {
                        if (retryCount.current < maxRetries) {
                            void attemptFullscreen();
                        }
                    });
                }, currentDelay);
            }
        };

        if (!isFullscreenExemptRoute) {
            retryCount.current = 0;
        }

        void attemptFullscreen();
    }, [
        enterFullscreen,
        isFullscreen,
        isFullscreenExemptRoute,
        isStandaloneShell,
        requiresInstalledShell,
        shouldUseNativeFullscreenFallback,
    ]);

    useEffect(() => {
        if (isFullscreenExemptRoute || requiresInstalledShell || !shouldUseNativeFullscreenFallback) {
            return;
        }

        let lastAttemptAt = 0;
        const maybeEnterFullscreen = (event: Event) => {
            if (isFullscreen || isStandaloneShell) {
                return;
            }

            if (event.target instanceof Element && event.target.closest('[data-loader-interaction="true"]')) {
                return;
            }

            if (event instanceof KeyboardEvent && event.key === 'Escape') {
                return;
            }

            const now = Date.now();
            if (now - lastAttemptAt < 250) {
                return;
            }

            lastAttemptAt = now;
            void enterFullscreen();
        };

        const pointerHandler = (event: Event) => {
            maybeEnterFullscreen(event);
        };

        const keyHandler = (event: KeyboardEvent) => {
            maybeEnterFullscreen(event);
        };

        document.addEventListener('pointerdown', pointerHandler, true);
        document.addEventListener('touchstart', pointerHandler, true);
        document.addEventListener('mousedown', pointerHandler, true);
        document.addEventListener('keydown', keyHandler, true);

        return () => {
            document.removeEventListener('pointerdown', pointerHandler, true);
            document.removeEventListener('touchstart', pointerHandler, true);
            document.removeEventListener('mousedown', pointerHandler, true);
            document.removeEventListener('keydown', keyHandler, true);
        };
    }, [
        enterFullscreen,
        isFullscreen,
        isFullscreenExemptRoute,
        isStandaloneShell,
        requiresInstalledShell,
        shouldUseNativeFullscreenFallback,
    ]);

    if (isFullscreenExemptRoute || pwa.requiresInstalledShell) {
        return <>{children}</>;
    }

    return <>{children}</>;
};

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const CLASSROOM_APP_PATH = '3dClass/index.html';
const CLASSROOM_DOOR_INTRO_PATH = '3dClass/door-intro.html';
const CLASSROOM_DOOR_AUDIO_PATH = '3dClass/audio/dooropening.mp3';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    useCinematicInteractionFeedback();
    const pwa = usePWA();
    useNativeShell({ isNativeApp: pwa.isNativeApp, nativePlatform: pwa.nativePlatform });
    const homePageAppUrl = buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOMEPAGE_APP_RUNTIME_VERSION}`);
    const classroomAppUrl = buildAssetPath(`${CLASSROOM_APP_PATH}?v=${CLASSROOM_RUNTIME_VERSION}&intro=0`);
    const classroomDoorIntroUrl = buildAssetPath(`${CLASSROOM_DOOR_INTRO_PATH}?v=${CLASSROOM_RUNTIME_VERSION}`);
    const classroomDoorAudioUrl = buildAssetPath(CLASSROOM_DOOR_AUDIO_PATH);

    // Use the same base path as Vite config
    // BASE_URL from Vite includes the trailing slash, but React Router basename shouldn't
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Remove trailing slash for React Router basename
    const basename = baseUrl === '/' || baseUrl === './' ? '' : baseUrl.replace(/\/$/, '');
    const renderProtectedPage = (node: React.ReactNode) => (
        <RequireAuth user={user} loading={loading}>
            <RequireInstalledShell pwa={pwa}>{node}</RequireInstalledShell>
        </RequireAuth>
    );

    return (
        <ErrorBoundary>
            <BrowserRouter basename={basename}>
                <PWAWrapperWithState pwa={pwa}>
                    <RoutePrefetchCoordinator
                        loading={loading}
                        homePageAppUrl={homePageAppUrl}
                        classroomAppUrl={classroomAppUrl}
                        classroomDoorIntroUrl={classroomDoorIntroUrl}
                        classroomDoorAudioUrl={classroomDoorAudioUrl}
                    />
                    <Routes>
                        {/* Install page - accessible without layout */}
                        <Route path="/install" element={<RouteBoundary><InstallPage /></RouteBoundary>} />
                        <Route
                            path="/auth"
                            element={
                                loading
                                    ? <LoadingFallback />
                                    : user
                                        ? <Navigate to="/" replace />
                                        : <RouteBoundary><AuthPage /></RouteBoundary>
                            }
                        />
                        
                        {/* Main app routes with layout */}
                        <Route path="/" element={renderProtectedPage(<MainLayout />)}>
                            <Route index element={<HomeRoutePlaceholder />} />
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
                                element={<RouteBoundary><HTMLViewer /></RouteBoundary>}
                            />
                            <Route path="home-profile" element={<Navigate to="/" replace />} />
                            <Route
                                path="classroom"
                                element={(
                                    <HomepageSessionGate>
                                        <RouteBoundary><ClassroomPage /></RouteBoundary>
                                    </HomepageSessionGate>
                                )}
                            />
                            <Route path="*" element={<Navigate to="/" replace />} />
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
