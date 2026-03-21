import React, { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';
import { BottomNavigation } from '../components/BottomNavigation';
import { GlobalSettings } from '../components/GlobalSettings';
import { HomeInstallLauncher } from '../components/HomeInstallLauncher';
import { AppShellGuard } from '../components/AppShellGuard';
import { useGlobalUiClickSound } from '../hooks/useGlobalUiClickSound';
import { useZoomLock } from '../hooks/useZoomLock';
import { HomepageSessionProvider } from '../context/homepageSessionContext';
import { useAuth } from '../context/AuthContext';
import { isManagerUser } from '../utils/managerAccess';
import UserHomePage from '../pages/UserHomePage';

const MainLayout: React.FC = () => {
    useGlobalUiClickSound();

    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsCloseRequestId, setSettingsCloseRequestId] = useState(0);
    const currentUserId = user?.id ?? null;
    const [homepageSessionState, setHomepageSessionState] = useState(() => ({
        ownerId: currentUserId,
        ready: false,
    }));
    const isHomepageSessionReady =
        homepageSessionState.ownerId === currentUserId
        && homepageSessionState.ready;

    const isUserHomeRoute = location.pathname === '/home-profile' || location.pathname === '/';
    const isHomeRoute = location.pathname === '/';
    const isAppsRoute = location.pathname === '/apps';
    const isClassroomRoute = location.pathname === '/classroom';
    const isCharacterCreatorRoute = location.pathname === '/character-creator';
    const isGamePlayerRoute = location.pathname.startsWith('/play/') || location.pathname.startsWith('/open/');
    const isManagerRoute = location.pathname === '/manager';
    // Developer tooling should not be blocked by the hidden homepage bootstrap.
    const shouldBypassHomepageSessionBootstrap = isManagerRoute || isCharacterCreatorRoute;
    const isHomepageSessionGateReady = isHomepageSessionReady || shouldBypassHomepageSessionBootstrap;
    const isPrimingHomepageSession = !isHomepageSessionGateReady;
    const shouldRenderHomepageSession = !shouldBypassHomepageSessionBootstrap;
    const isHomepageSessionVisible = shouldRenderHomepageSession && (isUserHomeRoute || isPrimingHomepageSession);
    const shouldShowRouteLayer = !isUserHomeRoute && isHomepageSessionGateReady;
    const isImmersiveRoute =
        isHomeRoute
        || isAppsRoute
        || isUserHomeRoute
        || isGamePlayerRoute
        || isManagerRoute
        || isClassroomRoute
        || isCharacterCreatorRoute
        || isPrimingHomepageSession;
    const hasDeveloperAccess = isManagerUser(user);
    const shouldShowCharacterCreatorLauncher =
        hasDeveloperAccess
        && isUserHomeRoute
        && !isCharacterCreatorRoute;
    const shouldDisableZoom = isUserHomeRoute || isAppsRoute || isGamePlayerRoute || isClassroomRoute || isPrimingHomepageSession;

    useZoomLock({ enabled: shouldDisableZoom });

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

    const handleSettingsButtonClick = () => {
        if (!isSettingsOpen) {
            setIsSettingsOpen(true);
            return;
        }

        setSettingsCloseRequestId(prev => prev + 1);
    };

    const handleHomepageBootStable = useCallback(() => {
        setHomepageSessionState((current) => {
            if (current.ownerId === currentUserId && current.ready) {
                return current;
            }

            return {
                ownerId: currentUserId,
                ready: true,
            };
        });
    }, [currentUserId]);

    return (
        <HomepageSessionProvider value={{ isReady: isHomepageSessionGateReady }}>
            <div
                className={`layout-container ${isImmersiveRoute ? 'home-immersive' : ''} ${isGamePlayerRoute ? 'game-immersive' : ''}`}
            >
                {/* Skip to main content link for keyboard users */}
                <a href="#main-content" className="skip-to-main">
                    Skip to main content
                </a>

                {/* Main Content Area */}
                <main id="main-content" className="main-content">
                    {shouldRenderHomepageSession ? (
                        <div
                            className={`main-content__home-session ${isHomepageSessionVisible ? 'is-visible' : 'is-hidden'}`}
                            aria-hidden={!isHomepageSessionVisible}
                        >
                            <UserHomePage
                                key={currentUserId ?? 'homepage-session'}
                                isActive={isHomepageSessionVisible}
                                onBootStable={handleHomepageBootStable}
                            />
                        </div>
                    ) : null}
                    <div
                        className={`main-content__route-layer ${shouldShowRouteLayer ? 'is-visible' : 'is-hidden'}`}
                        aria-hidden={!shouldShowRouteLayer}
                    >
                        <Outlet />
                    </div>
                </main>

                {shouldShowCharacterCreatorLauncher ? (
                    <Link
                        to="/character-creator"
                        className="character-creator-launcher"
                        aria-label="Open XiO Studio"
                    >
                        <span className="character-creator-launcher__eyebrow">Studio Access</span>
                        <span className="character-creator-launcher__title">XiO Studio</span>
                    </Link>
                ) : null}

                {isUserHomeRoute ? <HomeInstallLauncher /> : null}

                <BottomNavigation onOpenSettings={handleSettingsButtonClick} isSettingsOpen={isSettingsOpen} />

                <GlobalSettings
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    externalCloseRequestId={settingsCloseRequestId}
                />
                <AppShellGuard />
            </div>
        </HomepageSessionProvider>
    );
};

export default MainLayout;
