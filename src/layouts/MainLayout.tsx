import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';
import { BottomNavigation } from '../components/BottomNavigation';
import { GlobalSettings } from '../components/GlobalSettings';
import { AppShellGuard } from '../components/AppShellGuard';
import { useGlobalUiClickSound } from '../hooks/useGlobalUiClickSound';
import { useZoomLock } from '../hooks/useZoomLock';
import { HomepageSessionProvider } from '../context/homepageSessionContext';
import { useAuth } from '../context/AuthContext';
import UserHomePage from '../pages/UserHomePage';

const MainLayout: React.FC = () => {
    useGlobalUiClickSound();

    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsCloseRequestId, setSettingsCloseRequestId] = useState(0);
    const [isHomepageSummonNavigationLocked, setIsHomepageSummonNavigationLocked] = useState(false);
    const [isHomepageSummonSkipVisible, setIsHomepageSummonSkipVisible] = useState(false);
    const [homepageSummonSkipRequestId, setHomepageSummonSkipRequestId] = useState(0);
    const interactionShieldRef = useRef<HTMLDivElement | null>(null);
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
    const isHtmlViewerRoute = location.pathname === '/html-viewer';
    // Tool-style routes should render immediately even on direct entry or hard reload.
    const shouldBypassHomepageSessionBootstrap = isManagerRoute || isCharacterCreatorRoute || isHtmlViewerRoute;
    const isHomepageSessionGateReady = isHomepageSessionReady || shouldBypassHomepageSessionBootstrap;
    const isPrimingHomepageSession = !isHomepageSessionGateReady;
    const shouldRenderHomepageSession = !shouldBypassHomepageSessionBootstrap;
    const isHomepageSessionVisible = shouldRenderHomepageSession && (isUserHomeRoute || isPrimingHomepageSession);
    const shouldShowRouteLayer = !isUserHomeRoute && isHomepageSessionGateReady;
    const isHomepageSummonInteractionLocked = isUserHomeRoute && isHomepageSummonNavigationLocked;
    const isImmersiveRoute =
        isHomeRoute
        || isAppsRoute
        || isUserHomeRoute
        || isGamePlayerRoute
        || isManagerRoute
        || isClassroomRoute
        || isHtmlViewerRoute
        || isCharacterCreatorRoute
        || isPrimingHomepageSession;
    const shouldDisableZoom = isUserHomeRoute || isAppsRoute || isGamePlayerRoute || isClassroomRoute || isHtmlViewerRoute || isPrimingHomepageSession;

    useZoomLock({ enabled: shouldDisableZoom });

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        document.body.classList.toggle('homepage-summon-locked', isHomepageSummonInteractionLocked);

        return () => {
            document.body.classList.remove('homepage-summon-locked');
        };
    }, [isHomepageSummonInteractionLocked]);

    useEffect(() => {
        if (!isUserHomeRoute) {
            setIsHomepageSummonSkipVisible(false);
        }
    }, [isUserHomeRoute]);

    useEffect(() => {
        const currentDocument = typeof document !== 'undefined' ? document : null;
        if (!isHomepageSummonInteractionLocked || typeof window === 'undefined' || !currentDocument) {
            return undefined;
        }

        const consumeLockedInteraction = (event: Event) => {
            const eventTarget = event.target;
            if (eventTarget instanceof Element && eventTarget.closest('[data-homepage-summon-skip="true"]')) {
                return;
            }
            if (event.cancelable) {
                event.preventDefault();
            }
            event.stopPropagation();
            if (typeof (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation === 'function') {
                (event as Event & { stopImmediatePropagation: () => void }).stopImmediatePropagation();
            }
        };

        const pointerEventNames = [
            'click',
            'dblclick',
            'auxclick',
            'contextmenu',
            'mousedown',
            'mouseup',
            'pointerdown',
            'pointerup',
            'pointermove',
            'pointercancel',
            'touchstart',
            'touchmove',
            'touchend',
            'touchcancel',
            'wheel',
        ] as const;
        const keyboardEventNames = ['keydown', 'keypress', 'keyup'] as const;

        pointerEventNames.forEach((eventName) => {
            window.addEventListener(eventName, consumeLockedInteraction, { capture: true, passive: false });
        });
        keyboardEventNames.forEach((eventName) => {
            window.addEventListener(eventName, consumeLockedInteraction, { capture: true });
        });

        return () => {
            pointerEventNames.forEach((eventName) => {
                window.removeEventListener(eventName, consumeLockedInteraction, true);
            });
            keyboardEventNames.forEach((eventName) => {
                window.removeEventListener(eventName, consumeLockedInteraction, true);
            });
        };
    }, [isHomepageSummonInteractionLocked]);

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
        if (isHomepageSummonInteractionLocked) {
            return;
        }

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

    const handleSummonNavigationLockChange = useCallback((locked: boolean) => {
        setIsHomepageSummonNavigationLocked(locked);
        if (locked) {
            setIsSettingsOpen(false);
        }
    }, []);

    const handleSummonSkipVisibilityChange = useCallback((visible: boolean) => {
        setIsHomepageSummonSkipVisible(visible);
    }, []);

    const handleSummonSkipRequest = useCallback(() => {
        setIsHomepageSummonSkipVisible(false);
        setHomepageSummonSkipRequestId((current) => current + 1);
    }, []);

    return (
        <HomepageSessionProvider value={{ isReady: isHomepageSessionGateReady }}>
            <div
                className={`layout-container ${isImmersiveRoute ? 'home-immersive' : ''} ${isGamePlayerRoute ? 'game-immersive' : ''} ${isHomepageSummonInteractionLocked ? 'homepage-summon-locked' : ''}`}
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
                                onSummonNavigationLockChange={handleSummonNavigationLockChange}
                                onSummonSkipVisibilityChange={handleSummonSkipVisibilityChange}
                                summonSkipRequestId={homepageSummonSkipRequestId}
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

                <BottomNavigation
                    onOpenSettings={handleSettingsButtonClick}
                    isSettingsOpen={isSettingsOpen}
                    isInteractionLocked={isHomepageSummonInteractionLocked}
                />

                <div
                    ref={interactionShieldRef}
                    className={`layout-interaction-shield ${isHomepageSummonInteractionLocked ? 'is-active' : ''}`}
                    aria-hidden="true"
                    data-no-click-sound="true"
                    tabIndex={-1}
                />

                {isHomepageSummonSkipVisible ? (
                    <button
                        type="button"
                        className="homepage-summon-skip-button"
                        onClick={handleSummonSkipRequest}
                        data-no-click-sound="true"
                        data-homepage-summon-skip="true"
                    >
                        Skip Scene
                    </button>
                ) : null}

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
