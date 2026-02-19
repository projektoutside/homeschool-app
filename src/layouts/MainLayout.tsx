import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';
import { BottomNavigation } from '../components/BottomNavigation';
import { GlobalSettings } from '../components/GlobalSettings';
import UserHomePage from '../pages/UserHomePage';

const LazyClassroomPage = React.lazy(() => import('../pages/ClassroomPage'));

type WarmupNavigator = Navigator & {
    connection?: {
        saveData?: boolean;
        effectiveType?: string;
    };
    deviceMemory?: number;
    hardwareConcurrency?: number;
};

const getClassroomWarmupDelayMs = (): number => {
    const nav = window.navigator as WarmupNavigator;
    const effectiveType = String(nav.connection?.effectiveType ?? '').toLowerCase();
    const saveDataEnabled = Boolean(nav.connection?.saveData);
    const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
    const cpuCores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;

    const constrainedNetwork = effectiveType.includes('2g') || effectiveType.includes('3g');
    const constrainedDevice = (deviceMemory !== null && deviceMemory <= 4) || (cpuCores !== null && cpuCores <= 4);

    if (saveDataEnabled || constrainedNetwork || constrainedDevice) {
        return 2400;
    }

    return 1200;
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [hasHomePageMounted, setHasHomePageMounted] = useState<boolean>(
        location.pathname === '/home-profile' || location.pathname === '/',
    );
    const [hasClassroomMounted, setHasClassroomMounted] = useState<boolean>(
        location.pathname === '/classroom',
    );

    const isUserHomeRoute = location.pathname === '/home-profile' || location.pathname === '/';
    const isHomeRoute = location.pathname === '/';
    const isAppsRoute = location.pathname === '/apps';
    const isClassroomRoute = location.pathname === '/classroom';
    const isGamePlayerRoute = location.pathname.startsWith('/play/') || location.pathname.startsWith('/open/');
    const isManagerRoute = location.pathname === '/manager';
    const isImmersiveRoute = isHomeRoute || isAppsRoute || isUserHomeRoute || isGamePlayerRoute || isManagerRoute || isClassroomRoute;
    const shouldRenderUserHomePage = hasHomePageMounted || isUserHomeRoute;
    const shouldRenderClassroomPage = hasClassroomMounted || isClassroomRoute;

    useEffect(() => {
        if (!isUserHomeRoute) {
            return;
        }
        const timerId = window.setTimeout(() => {
            setHasHomePageMounted(true);
        }, 0);
        return () => window.clearTimeout(timerId);
    }, [isUserHomeRoute]);

    useEffect(() => {
        if (!isClassroomRoute) {
            return;
        }
        const timerId = window.setTimeout(() => {
            setHasClassroomMounted(true);
        }, 0);
        return () => window.clearTimeout(timerId);
    }, [isClassroomRoute]);

    // Warm the classroom iframe in idle time so first-open is faster without hurting low-end devices.
    useEffect(() => {
        if (hasClassroomMounted) {
            return;
        }

        const warmupDelayMs = getClassroomWarmupDelayMs();
        let timerId: number | null = null;
        let idleId: number | null = null;
        const idleWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        const mountClassroom = () => {
            setHasClassroomMounted(true);
        };

        const scheduleWarmup = () => {
            const queueMount = () => {
                timerId = window.setTimeout(mountClassroom, warmupDelayMs);
            };

            if (typeof idleWindow.requestIdleCallback === 'function') {
                idleId = idleWindow.requestIdleCallback(
                    () => queueMount(),
                    { timeout: warmupDelayMs },
                );
                return;
            }

            queueMount();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            scheduleWarmup();
        };

        if (document.visibilityState === 'visible') {
            scheduleWarmup();
        } else {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
                idleWindow.cancelIdleCallback(idleId);
            }
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
        };
    }, [hasClassroomMounted]);

    // Dev-only shortcut: Ctrl+Shift+M to toggle manager
    useEffect(() => {
        if (!import.meta.env.DEV) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                if (location.pathname === '/manager') {
                    navigate('/');
                } else {
                    navigate('/manager');
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [location.pathname, navigate]);

    return (
        <div
            className={`layout-container ${isImmersiveRoute ? 'home-immersive' : ''} ${isGamePlayerRoute ? 'game-immersive' : ''}`}
        >
            {/* Skip to main content link for keyboard users */}
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>

            {/* Main Content Area */}
            <main id="main-content" className="main-content">
                <Outlet />
                {shouldRenderUserHomePage ? (
                    <section
                        className={`persistent-home-page ${isUserHomeRoute ? 'is-visible' : 'is-hidden'}`}
                        aria-hidden={!isUserHomeRoute}
                    >
                        <UserHomePage isActive={isUserHomeRoute} />
                    </section>
                ) : null}
                {shouldRenderClassroomPage ? (
                    <section
                        className={`persistent-home-page ${isClassroomRoute ? 'is-visible' : 'is-hidden'}`}
                        aria-hidden={!isClassroomRoute}
                    >
                        <LazyClassroomPage isActive={isClassroomRoute} />
                    </section>
                ) : null}
            </main>

            {/* Persistent Bottom Navigation */}
            {/* Render always, or maybe hide on GamePlayer if strictly needed? User said "regardless of which page". */}
            <BottomNavigation onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Global Settings Panel */}
            <GlobalSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default MainLayout;
