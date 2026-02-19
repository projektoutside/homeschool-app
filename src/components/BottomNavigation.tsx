import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import './BottomNavigation.css';

interface BottomNavigationProps {
    onOpenSettings: () => void;
}

const HOME_TRANSITION_FADE_IN_MS = 220;
const HOME_TRANSITION_FADE_OUT_MS = 280;
const STATS_PULSE_CYCLE_MS = 950;
const AUTO_GAME_DOCK_PULSE_COUNT = 2;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenSettings }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isPlayRoute = location.pathname.startsWith('/play/');
    
    const [isMinimized, setIsMinimized] = useState(false);
    const [isStatsMinimized, setIsStatsMinimized] = useState(false);
    const [isStatsLineDormant, setIsStatsLineDormant] = useState(false);
    const [isStatsLinePulsing, setIsStatsLinePulsing] = useState(false);
    const [isStatsLineAwakeFlash, setIsStatsLineAwakeFlash] = useState(false);
    const [statsPulseCount, setStatsPulseCount] = useState(1);
    const [expandedMode, setExpandedMode] = useState(false);
    const [failedGameIconIds, setFailedGameIconIds] = useState<Set<string>>(new Set());
    const sliderRef = useRef<HTMLDivElement>(null);
    const statsTouchStartX = useRef<number | null>(null);
    const hasStatsSwiped = useRef<boolean>(false);
    const statsPulseTimeoutRef = useRef<number | null>(null);
    const statsAwakeFlashTimeoutRef = useRef<number | null>(null);
    const statsAutoDimTimeoutRef = useRef<number | null>(null);
    const wasFullscreenLikeActiveRef = useRef<boolean>(false);
    const lastFullscreenActivationKeyRef = useRef<string>('');
    const isStatsMinimizedRef = useRef<boolean>(false);
    const prevIsStatsMinimizedRef = useRef<boolean>(false);
    const [homeTransitionPhase, setHomeTransitionPhase] = useState<'idle' | 'fading-in' | 'fading-out'>('idle');
    const homeTransitionPendingNavRef = useRef<boolean>(false);
    const homeTransitionFadeInTimerRef = useRef<number | null>(null);
    const homeTransitionFadeOutTimerRef = useRef<number | null>(null);
    const lastAutoFlushGameRouteRef = useRef<string>('');

    const clearHomeTransitionTimers = useCallback(() => {
        if (homeTransitionFadeInTimerRef.current !== null) {
            window.clearTimeout(homeTransitionFadeInTimerRef.current);
            homeTransitionFadeInTimerRef.current = null;
        }
        if (homeTransitionFadeOutTimerRef.current !== null) {
            window.clearTimeout(homeTransitionFadeOutTimerRef.current);
            homeTransitionFadeOutTimerRef.current = null;
        }
    }, []);

    const startHomepageTransition = useCallback(() => {
        if (homeTransitionPhase !== 'idle') {
            return;
        }

        clearHomeTransitionTimers();
        homeTransitionPendingNavRef.current = true;
        setHomeTransitionPhase('fading-in');

        homeTransitionFadeInTimerRef.current = window.setTimeout(() => {
            homeTransitionFadeInTimerRef.current = null;
            const isAlreadyHome = location.pathname === '/home-profile' || location.pathname === '/';
            if (isAlreadyHome) {
                homeTransitionPendingNavRef.current = false;
                setHomeTransitionPhase('fading-out');
                return;
            }
            navigate('/home-profile');
        }, HOME_TRANSITION_FADE_IN_MS);
    }, [clearHomeTransitionTimers, homeTransitionPhase, location.pathname, navigate]);

    const triggerStatsAwakeFlash = useCallback((durationMs: number) => {
        setIsStatsLineDormant(false);
        setIsStatsLinePulsing(false);
        setIsStatsLineAwakeFlash(true);

        if (statsAwakeFlashTimeoutRef.current !== null) {
            window.clearTimeout(statsAwakeFlashTimeoutRef.current);
        }

        statsAwakeFlashTimeoutRef.current = window.setTimeout(() => {
            setIsStatsLineAwakeFlash(false);
            if (isStatsMinimizedRef.current) {
                setIsStatsLineDormant(true);
            }
            statsAwakeFlashTimeoutRef.current = null;
        }, durationMs);
    }, []);

    const triggerStatsPulseGlow = useCallback((pulseCount: number) => {
        const normalizedPulseCount = Math.max(1, Math.floor(pulseCount));
        const totalDurationMs = STATS_PULSE_CYCLE_MS * normalizedPulseCount;

        setStatsPulseCount(normalizedPulseCount);
        setIsStatsLineDormant(false);
        setIsStatsLinePulsing(true);
        setIsStatsLineAwakeFlash(true);

        if (statsPulseTimeoutRef.current !== null) {
            window.clearTimeout(statsPulseTimeoutRef.current);
        }
        statsPulseTimeoutRef.current = window.setTimeout(() => {
            setIsStatsLinePulsing(false);
            statsPulseTimeoutRef.current = null;
        }, totalDurationMs);

        if (statsAwakeFlashTimeoutRef.current !== null) {
            window.clearTimeout(statsAwakeFlashTimeoutRef.current);
        }
        statsAwakeFlashTimeoutRef.current = window.setTimeout(() => {
            setIsStatsLineAwakeFlash(false);
            if (isStatsMinimizedRef.current) {
                setIsStatsLineDormant(true);
            }
            statsAwakeFlashTimeoutRef.current = null;
        }, totalDurationMs);
    }, []);

    useEffect(() => {
        if (!homeTransitionPendingNavRef.current) {
            return;
        }

        const isHomeRoute = location.pathname === '/home-profile' || location.pathname === '/';
        if (!isHomeRoute) {
            return;
        }

        homeTransitionPendingNavRef.current = false;
        setHomeTransitionPhase('fading-out');
    }, [location.pathname]);

    // Auto-collapse the bottom dock when a game route opens so only the flush gold bar remains.
    useLayoutEffect(() => {
        if (!isPlayRoute) {
            lastAutoFlushGameRouteRef.current = '';
            return;
        }

        setExpandedMode(false);
        setIsMinimized(true);
        setIsStatsMinimized(true);
    }, [isPlayRoute]);

    // Flash the flush gold bar once per opened game route as a discoverability hint.
    useEffect(() => {
        if (!isPlayRoute) {
            return;
        }
        if (!isMinimized || !isStatsMinimized) {
            return;
        }

        const routeKey = `${location.pathname}${location.search}`;
        if (lastAutoFlushGameRouteRef.current === routeKey) {
            return;
        }
        lastAutoFlushGameRouteRef.current = routeKey;
        triggerStatsPulseGlow(AUTO_GAME_DOCK_PULSE_COUNT);
    }, [isMinimized, isPlayRoute, isStatsMinimized, location.pathname, location.search, triggerStatsPulseGlow]);

    useEffect(() => {
        if (homeTransitionPhase !== 'fading-out') {
            return;
        }

        if (homeTransitionFadeOutTimerRef.current !== null) {
            window.clearTimeout(homeTransitionFadeOutTimerRef.current);
        }

        homeTransitionFadeOutTimerRef.current = window.setTimeout(() => {
            homeTransitionFadeOutTimerRef.current = null;
            setHomeTransitionPhase('idle');
        }, HOME_TRANSITION_FADE_OUT_MS);
    }, [homeTransitionPhase]);
    
    // Sync dependent dock states when main dock toggles
    useEffect(() => {
        if (isMinimized) {
            setExpandedMode(false);
            // Keep gold dock fully flushed while playing games.
            setIsStatsMinimized(isPlayRoute);
        } else {
            setIsStatsMinimized(false);
            setIsStatsLineDormant(false);
            setIsStatsLinePulsing(false);
            setIsStatsLineAwakeFlash(false);
        }
    }, [isMinimized, isPlayRoute]);

    // Always clear dormant/pulse state when stats panel is opened.
    useEffect(() => {
        isStatsMinimizedRef.current = isStatsMinimized;
        if (!isStatsMinimized) {
            setIsStatsLineDormant(false);
            setIsStatsLinePulsing(false);
            setIsStatsLineAwakeFlash(false);
            if (statsAwakeFlashTimeoutRef.current !== null) {
                window.clearTimeout(statsAwakeFlashTimeoutRef.current);
                statsAwakeFlashTimeoutRef.current = null;
            }
            if (statsAutoDimTimeoutRef.current !== null) {
                window.clearTimeout(statsAutoDimTimeoutRef.current);
                statsAutoDimTimeoutRef.current = null;
            }
        }
    }, [isStatsMinimized]);

    // When user minimizes the gold panel again, auto-dim after inactivity.
    useEffect(() => {
        const justMinimized = isStatsMinimized && !prevIsStatsMinimizedRef.current;
        prevIsStatsMinimizedRef.current = isStatsMinimized;

        if (!justMinimized) return;

        if (statsAutoDimTimeoutRef.current !== null) {
            window.clearTimeout(statsAutoDimTimeoutRef.current);
        }

        statsAutoDimTimeoutRef.current = window.setTimeout(() => {
            if (isStatsMinimizedRef.current) {
                setIsStatsLineDormant(true);
                setIsStatsLinePulsing(false);
                setIsStatsLineAwakeFlash(false);
            }
            statsAutoDimTimeoutRef.current = null;
        }, 2500);
    }, [isStatsMinimized]);

    // Scroll to end when entering expanded mode
    useEffect(() => {
        if (expandedMode && sliderRef.current) {
            // Slight timeout to ensure layout is ready/transition has started
            const timer = setTimeout(() => {
                if (sliderRef.current) {
                    sliderRef.current.scrollLeft = sliderRef.current.scrollWidth;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [expandedMode]);

    // Touch swipe handling
    const touchStartX = useRef<number | null>(null);
    const hasSwiped = useRef<boolean>(false);
    const minSwipeDistance = 50; // Minimum distance for a full swipe action
    const clickBlockThreshold = 10; // Distance to consider a tap as a drag/swipe (blocks click)

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        hasSwiped.current = false;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        
        const currentX = e.targetTouches[0].clientX;
        const diff = touchStartX.current - currentX;

        // If moved more than threshold, mark as swiped to block accidental clicks
        if (Math.abs(diff) > clickBlockThreshold) {
            hasSwiped.current = true;
        }

        // --- GESTURE LOGIC ---

        // 1. MINIMIZE: Swipe Left (positive diff) on Standard View
        if (diff > minSwipeDistance && !isMinimized && !expandedMode) {
            setIsMinimized(true);
            touchStartX.current = null; 
            return;
        }
        
        // 2. RESTORE: Swipe Right (negative diff) on Minimized View
        if (diff < -minSwipeDistance && isMinimized) {
            setIsMinimized(false);
            touchStartX.current = null; 
            return;
        }

        // 3. OPEN SLIDER: Swipe Right (negative diff) on Standard View
        if (diff < -minSwipeDistance && !isMinimized && !expandedMode) {
            setExpandedMode(true);
            touchStartX.current = null;
            return;
        }

        // 4. CLOSE SLIDER: Swipe Left (positive diff) on Slider View AT THE RIGHT EDGE
        if (diff > minSwipeDistance && !isMinimized && expandedMode && sliderRef.current) {
            const slider = sliderRef.current;
            // Check if we are roughly at the right edge (tolerance of 5px)
            // Logic: scrollLeft + clientWidth approx equals scrollWidth
            const distFromRight = slider.scrollWidth - (slider.scrollLeft + slider.clientWidth);
            const isAtRightEdge = distFromRight < 20; // 20px tolerance for ease of use

            if (isAtRightEdge) {
                setExpandedMode(false);
                touchStartX.current = null;
            }
        }
    };

    const onTouchEnd = () => {
        touchStartX.current = null;
    };

    // Block accidental clicks if a swipe occurred
    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasSwiped.current) {
            e.stopPropagation();
            e.preventDefault();
            hasSwiped.current = false; 
        }
    };

    const onStatsTouchStart = (e: React.TouchEvent) => {
        statsTouchStartX.current = e.targetTouches[0].clientX;
        hasStatsSwiped.current = false;
        if (statsAutoDimTimeoutRef.current !== null) {
            window.clearTimeout(statsAutoDimTimeoutRef.current);
            statsAutoDimTimeoutRef.current = null;
        }
    };

    const onStatsTouchMove = (e: React.TouchEvent) => {
        if (statsTouchStartX.current === null) return;

        const currentX = e.targetTouches[0].clientX;
        const diff = statsTouchStartX.current - currentX;

        if (Math.abs(diff) > clickBlockThreshold) {
            hasStatsSwiped.current = true;
        }

        // Minimize stats dock
        if (diff > minSwipeDistance && !isStatsMinimized) {
            setIsStatsMinimized(true);
            statsTouchStartX.current = null;
            return;
        }

        // Restore stats dock
        if (diff < -minSwipeDistance && isStatsMinimized) {
            // Hidden/dormant state requires a tap first to re-arm the line.
            if (isStatsLineDormant) {
                return;
            }
            setIsStatsMinimized(false);
            statsTouchStartX.current = null;
        }
    };

    const onStatsTouchEnd = () => {
        statsTouchStartX.current = null;
        // Ensure the first tap after a swipe can wake the dormant line.
        hasStatsSwiped.current = false;
    };

    const handleStatsClickCapture = (e: React.MouseEvent) => {
        if (hasStatsSwiped.current) {
            e.stopPropagation();
            e.preventDefault();
            hasStatsSwiped.current = false;
        }
    };

    useEffect(() => {
        const getFullscreenLikeState = () => {
            const doc = document as Document & {
                webkitFullscreenElement?: Element | null;
                mozFullScreenElement?: Element | null;
                msFullscreenElement?: Element | null;
            };

            const browserFullscreen = !!(
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement
            );

            const routeFullscreenLike =
                location.pathname.startsWith('/play/') ||
                location.pathname.startsWith('/open/');

            const pageFullscreenLike = !!document.querySelector(
                '.html-viewer-page.is-fullscreen, .viewer-page.fullscreen-mode, .iframe-container.fullscreen-active'
            );

            const isNowFullscreenLike = browserFullscreen || routeFullscreenLike || pageFullscreenLike;
            const activationKey = routeFullscreenLike
                ? `${location.pathname}${location.search}`
                : isNowFullscreenLike
                    ? 'fullscreen-context'
                    : '';

            return { isNowFullscreenLike, routeFullscreenLike, activationKey };
        };

        const triggerDormantPulse = () => {
            setStatsPulseCount(1);
            setIsStatsLineDormant(false);
            setIsStatsLinePulsing(true);

            if (statsPulseTimeoutRef.current !== null) {
                window.clearTimeout(statsPulseTimeoutRef.current);
            }

            statsPulseTimeoutRef.current = window.setTimeout(() => {
                setIsStatsLinePulsing(false);
                setIsStatsLineDormant(true);
                statsPulseTimeoutRef.current = null;
            }, STATS_PULSE_CYCLE_MS);
        };

        const evaluateFullscreenTransition = () => {
            const { isNowFullscreenLike, routeFullscreenLike, activationKey } = getFullscreenLikeState();
            const isNewRouteActivation =
                routeFullscreenLike &&
                activationKey !== '' &&
                activationKey !== lastFullscreenActivationKeyRef.current;

            if (
                isMinimized &&
                isStatsMinimized &&
                (
                    (isNowFullscreenLike && !wasFullscreenLikeActiveRef.current) ||
                    isNewRouteActivation
                )
            ) {
                triggerDormantPulse();
            }

            wasFullscreenLikeActiveRef.current = isNowFullscreenLike;
            lastFullscreenActivationKeyRef.current = activationKey;
        };

        evaluateFullscreenTransition();

        const onFullscreenChange = () => evaluateFullscreenTransition();
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, onFullscreenChange);
        });

        const mutationObserver = new MutationObserver(() => {
            evaluateFullscreenTransition();
        });

        mutationObserver.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            fullscreenEvents.forEach(eventName => {
                document.removeEventListener(eventName, onFullscreenChange);
            });
            mutationObserver.disconnect();
        };
    }, [location.pathname, location.search, isMinimized, isStatsMinimized]);

    useEffect(() => {
        return () => {
            if (statsPulseTimeoutRef.current !== null) {
                window.clearTimeout(statsPulseTimeoutRef.current);
            }
            if (statsAwakeFlashTimeoutRef.current !== null) {
                window.clearTimeout(statsAwakeFlashTimeoutRef.current);
            }
            if (statsAutoDimTimeoutRef.current !== null) {
                window.clearTimeout(statsAutoDimTimeoutRef.current);
            }
            clearHomeTransitionTimers();
        };
    }, [clearHomeTransitionTimers]);

    // Keep the yellow line visible by preventing iframe/container-only fullscreen
    // while the line-only mode is active.
    useEffect(() => {
        if (!isMinimized || !isStatsMinimized) return;

        const getFullscreenElement = () => {
            const doc = document as Document & {
                webkitFullscreenElement?: Element | null;
                mozFullScreenElement?: Element | null;
                msFullscreenElement?: Element | null;
            };
            return doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || null;
        };

        const exitAnyFullscreen = async () => {
            const doc = document as Document & {
                webkitExitFullscreen?: () => Promise<void>;
                mozCancelFullScreen?: () => Promise<void>;
                msExitFullscreen?: () => Promise<void>;
            };
            try {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
                else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
                else if (doc.msExitFullscreen) await doc.msExitFullscreen();
            } catch {
                // noop
            }
        };

        const ensureOverlayCompatibleFullscreen = () => {
            const fsElement = getFullscreenElement();
            if (fsElement && fsElement !== document.documentElement) {
                void exitAnyFullscreen();
            }
        };

        ensureOverlayCompatibleFullscreen();

        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(eventName => document.addEventListener(eventName, ensureOverlayCompatibleFullscreen));

        return () => {
            events.forEach(eventName => document.removeEventListener(eventName, ensureOverlayCompatibleFullscreen));
        };
    }, [isMinimized, isStatsMinimized]);

    // Helper to determine active state
    const isHomeActive = location.pathname === '/' || location.pathname === '/home-profile';
    const isGamesActive = location.pathname === '/apps' && new URLSearchParams(location.search).get('tab')?.toLowerCase() === 'game';
    const tab = new URLSearchParams(location.search).get('tab')?.toLowerCase();
    const isClassroomActive = 
        location.pathname === '/classroom' ||
        (location.pathname === '/apps' && (tab === 'worksheet' || tab === 'worksheets' || tab === 'tool' || tab === 'tools')) ||
        location.pathname === '/html-viewer';

    // Content for Expanded Mode
    const games = CONTENT_ITEMS.filter(item => item.type === 'game');

    return (
        <>
            <nav 
                className={`bottom-navigation-dock ${isMinimized ? 'minimized' : ''} ${expandedMode ? 'expanded' : ''} ${isStatsMinimized ? 'stats-minimized-active' : ''}`} 
                aria-label="Main navigation"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClickCapture={handleClickCapture}
            >
            {/* Restore Handle (Thin Line) - Visible only when minimized */}
            <div 
                className="nav-restore-handle" 
                aria-hidden={!isMinimized}
                onClick={(e) => {
                    if (isMinimized) {
                        setIsMinimized(false);
                        e.stopPropagation(); 
                    }
                }}
                title="Slide right or click to restore"
            >
                <div className="nav-restore-line"></div>
            </div>

            {/* View Stack: Holds both Standard and Slider views overlapping */}
            <div className="dock-view-stack">
                
                {/* Standard Tab Buttons */}
                <div className={`nav-content-container ${expandedMode ? 'view-hidden-left' : 'view-active'}`}>
                    <button
                        type="button"
                        className="nav-settings-btn"
                        onClick={onOpenSettings}
                        aria-label="Open settings"
                        title="Settings"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-settings-icon" aria-hidden="true">
                            <span className="settings-square"></span>
                            <span className="settings-square"></span>
                            <span className="settings-square"></span>
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`}
                        onClick={startHomepageTransition}
                        aria-label="Homepage"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🏠</span>
                        <span>Homepage</span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isGamesActive ? 'active' : ''}`}
                        onClick={() => navigate('/apps?tab=game')}
                        aria-label="Games"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🎮</span>
                        <span>Games</span>
                    </button>

                    <button
                        type="button"
                        className={`nav-tab-btn ${isClassroomActive ? 'active' : ''}`}
                        onClick={() => navigate('/classroom')}
                        aria-label="Classroom"
                        tabIndex={expandedMode ? -1 : 0}
                    >
                        <span className="nav-tab-icon" aria-hidden="true">🏫</span>
                        <span>Classroom</span>
                    </button>
                </div>

                {/* Expanded Slider Content */}
                <div 
                    className={`nav-slider-container ${expandedMode ? 'view-active' : 'view-hidden-right'}`} 
                    ref={sliderRef}
                >
                    {/* HOME SECTION (Leftmost) */}
                    <div className="nav-slider-section home-section">
                        <button
                            type="button"
                            className="nav-slider-item"
                            onClick={() => navigate('/home-profile')}
                            title="Home"
                            tabIndex={expandedMode ? 0 : -1}
                        >
                            <span className="nav-slider-icon">🏠</span>
                            <span className="nav-slider-label">Home</span>
                        </button>
                    </div>

                    {/* GAMES SECTION */}
                    <div className="nav-slider-section games-section">
                        {games.map(game => {
                            const iconPath = game.thumbnail ? buildAssetPath(game.thumbnail) : null;
                            const showGameImage = !!iconPath && !failedGameIconIds.has(game.id);

                            return (
                                <button
                                    key={game.id}
                                    className="nav-slider-item has-image"
                                    onClick={() => navigate(`/play/${game.id}`)}
                                    title={game.title}
                                    tabIndex={expandedMode ? 0 : -1}
                                >
                                    <span className="nav-slider-icon">
                                        {showGameImage ? (
                                            <img 
                                                src={iconPath} 
                                                alt="" 
                                                className="nav-slider-img"
                                                onError={() => {
                                                    setFailedGameIconIds(prev => {
                                                        const next = new Set(prev);
                                                        next.add(game.id);
                                                        return next;
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <span aria-hidden="true">🎮</span>
                                        )}
                                    </span>
                                    <span className="nav-slider-label">{game.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* CLASSROOM SECTION (Rightmost) */}
                    <div className="nav-slider-section classroom-section">
                        <button
                            className="nav-slider-item"
                            onClick={() => navigate('/apps?tab=tools')}
                            title="Tools"
                            tabIndex={expandedMode ? 0 : -1}
                        >
                            <span className="nav-slider-icon">🧰</span>
                            <span className="nav-slider-label">Tools</span>
                        </button>
                        <button
                            className="nav-slider-item"
                            onClick={() => navigate('/html-viewer')}
                            title="Worksheets"
                            tabIndex={expandedMode ? 0 : -1}
                        >
                            <span className="nav-slider-icon">📄</span>
                            <span className="nav-slider-label">Worksheets</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* Minimize Toggle (Vertical Line) */}
                <button
                    type="button"
                    className="nav-minimize-btn"
                    onClick={(e) => {
                        if (expandedMode) {
                            setExpandedMode(false); // Close expand first
                        } else {
                            setIsMinimized(!isMinimized);
                        }
                        e.stopPropagation();
                    }}
                    aria-label={isMinimized ? "Restore navigation" : (expandedMode ? "Close slider" : "Minimize navigation")}
                    title={isMinimized ? "Restore" : (expandedMode ? "Close" : "Minimize")}
                >
                    <div className="nav-minimize-line"></div>
                </button>
            </nav>

            <aside
                className={`bottom-stats-dock ${isMinimized ? 'visible' : 'hidden'} ${isStatsMinimized ? 'minimized' : ''} ${isStatsLineDormant ? 'dormant' : ''} ${isStatsLinePulsing ? 'pulse' : ''} ${isStatsLineAwakeFlash ? 'awake' : ''}`}
                aria-label="User stats"
                aria-hidden={!isMinimized}
                style={{ '--stats-pulse-count': String(statsPulseCount) } as React.CSSProperties}
                onTouchStart={onStatsTouchStart}
                onTouchMove={onStatsTouchMove}
                onTouchEnd={onStatsTouchEnd}
                onClickCapture={handleStatsClickCapture}
            >
                    <div
                        className="stats-restore-handle"
                        aria-hidden={!isStatsMinimized || !isMinimized}
                        onClick={(e) => {
                            if (isStatsMinimized && isMinimized) {
                                if (isStatsLineDormant) {
                                    triggerStatsAwakeFlash(2500);
                                    e.stopPropagation();
                                    return;
                                }
                                // In minimized-line mode, opening is swipe-only.
                                e.stopPropagation();
                            }
                        }}
                        title="Slide right or click to restore stats"
                    >
                        <div className="stats-restore-line"></div>
                    </div>

                    <div className="stats-content">
                        <div className="stats-item stats-item-left">
                            <span className="stats-icon" aria-hidden="true">🥈</span>
                            <span className="stats-text">99</span>
                        </div>
                        <div className="stats-item stats-item-right">
                            <span className="stats-label">Total Points:</span>
                            <span className="stats-text">123456</span>
                        </div>
                    </div>
                </aside>
            <div
                className={`homepage-transition-overlay ${homeTransitionPhase === 'idle' ? '' : 'is-active'} ${homeTransitionPhase === 'fading-out' ? 'is-fading-out' : ''}`}
                aria-hidden="true"
            />
        </>
    );
};
