import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import './BottomNavigation.css';

interface BottomNavigationProps {
    onOpenSettings: () => void;
    isSettingsOpen: boolean;
}

const HOME_TRANSITION_FADE_IN_MS = 220;
const HOME_TRANSITION_FADE_OUT_MS = 280;
const STATS_PULSE_CYCLE_MS = 950;
const AUTO_GAME_DOCK_PULSE_COUNT = 2;
const STATS_WAKE_GLOW_MS = 2000;
const STATS_SHIFT_HANDLE_DRAG_PX = 28;
const CLASSROOM_IMMERSIVE_SCOPE = 'classroom-3d';
const CLASSROOM_IMMERSIVE_OPEN_MESSAGE = 'LAHS_CLASSROOM_IMMERSIVE_OPEN';
const CLASSROOM_IMMERSIVE_CLOSE_MESSAGE = 'LAHS_CLASSROOM_IMMERSIVE_CLOSE';

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenSettings, isSettingsOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isClassroomRoute = location.pathname === '/classroom';
    const isPlayRoute = location.pathname.startsWith('/play/');
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab')?.toLowerCase();
    const isClassroomViewerRoute =
        location.pathname === '/html-viewer' &&
        searchParams.get('source')?.toLowerCase() === 'classroom';
    
    const [isMinimized, setIsMinimized] = useState(true);
    const [isStatsMinimized, setIsStatsMinimized] = useState(false);
    const [isStatsLineDormant, setIsStatsLineDormant] = useState(false);
    const [isStatsLinePulsing, setIsStatsLinePulsing] = useState(false);
    const [isStatsLineAwakeFlash, setIsStatsLineAwakeFlash] = useState(false);
    const [statsPulseCount, setStatsPulseCount] = useState(1);
    const [expandedMode, setExpandedMode] = useState(false);
    const [failedGameIconIds, setFailedGameIconIds] = useState<Set<string>>(new Set());
    const [isClassroomImmersiveActive, setIsClassroomImmersiveActive] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const statsTouchStartX = useRef<number | null>(null);
    const hasStatsSwiped = useRef<boolean>(false);
    const statsPulseTimeoutRef = useRef<number | null>(null);
    const statsAwakeFlashTimeoutRef = useRef<number | null>(null);
    const statsAutoDimTimeoutRef = useRef<number | null>(null);
    const statsShiftHandlePointerIdRef = useRef<number | null>(null);
    const statsShiftHandleStartXRef = useRef<number | null>(null);
    const statsShiftHandleDraggedRef = useRef<boolean>(false);
    const wasFullscreenLikeActiveRef = useRef<boolean>(false);
    const lastFullscreenActivationKeyRef = useRef<string>('');
    const isStatsMinimizedRef = useRef<boolean>(false);
    const prevIsStatsMinimizedRef = useRef<boolean>(false);
    const [homeTransitionPhase, setHomeTransitionPhase] = useState<'idle' | 'fading-in' | 'fading-out'>('idle');
    const homeTransitionPendingNavRef = useRef<boolean>(false);
    const homeTransitionFadeInTimerRef = useRef<number | null>(null);
    const homeTransitionFadeOutTimerRef = useRef<number | null>(null);
    const lastAutoFlushGameRouteRef = useRef<string>('');
    const fullscreenEvaluateFrameRef = useRef<number | null>(null);

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

    const enforceGameDockFlush = useCallback(() => {
        setExpandedMode(false);
        setIsMinimized(true);
        setIsStatsMinimized(true);
    }, []);

    const isGameLikeImmersive = isPlayRoute || isClassroomViewerRoute || isClassroomImmersiveActive;

    useEffect(() => {
        if (!isClassroomRoute) {
            const frameId = window.requestAnimationFrame(() => {
                setIsClassroomImmersiveActive(false);
            });
            return () => window.cancelAnimationFrame(frameId);
        }

        const onWindowMessage = (event: MessageEvent<unknown>) => {
            if (event.origin !== window.location.origin) {
                return;
            }

            const data = event.data as { scope?: unknown; type?: unknown } | null;
            if (!data || data.scope !== CLASSROOM_IMMERSIVE_SCOPE || typeof data.type !== 'string') {
                return;
            }

            if (data.type === CLASSROOM_IMMERSIVE_OPEN_MESSAGE) {
                setIsClassroomImmersiveActive(true);
                return;
            }

            if (data.type === CLASSROOM_IMMERSIVE_CLOSE_MESSAGE) {
                setIsClassroomImmersiveActive(false);
            }
        };

        window.addEventListener('message', onWindowMessage);
        return () => window.removeEventListener('message', onWindowMessage);
    }, [isClassroomRoute]);

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

    const minimizeStatsDockToEdge = useCallback(() => {
        setExpandedMode(false);
        setIsMinimized(true);
        setIsStatsMinimized(true);
    }, []);

    useEffect(() => {
        if (!homeTransitionPendingNavRef.current) {
            return;
        }

        const isHomeRoute = location.pathname === '/home-profile' || location.pathname === '/';
        if (!isHomeRoute) {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            homeTransitionPendingNavRef.current = false;
            setHomeTransitionPhase('fading-out');
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [location.pathname]);

    // Auto-collapse the bottom dock when immersive content opens so only the flush gold bar remains.
    useLayoutEffect(() => {
        if (!isGameLikeImmersive) {
            lastAutoFlushGameRouteRef.current = '';
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            enforceGameDockFlush();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [enforceGameDockFlush, isGameLikeImmersive]);

    // Keep flush-left dock anchored through orientation/viewport changes while immersive content is active.
    useEffect(() => {
        if (!isGameLikeImmersive) return;

        const syncFlushState = () => {
            window.requestAnimationFrame(() => {
                enforceGameDockFlush();
            });
        };

        window.addEventListener('orientationchange', syncFlushState);
        window.addEventListener('resize', syncFlushState);

        return () => {
            window.removeEventListener('orientationchange', syncFlushState);
            window.removeEventListener('resize', syncFlushState);
        };
    }, [enforceGameDockFlush, isGameLikeImmersive]);

    // Flash the flush gold bar once per opened immersive context as a discoverability hint.
    useEffect(() => {
        if (!isGameLikeImmersive) {
            return;
        }
        if (!isMinimized || !isStatsMinimized) {
            return;
        }

        const routeKey = `${location.pathname}${location.search}|${isClassroomImmersiveActive ? 'classroom-immersive' : 'route-immersive'}`;
        if (lastAutoFlushGameRouteRef.current === routeKey) {
            return;
        }
        lastAutoFlushGameRouteRef.current = routeKey;
        const frameId = window.requestAnimationFrame(() => {
            triggerStatsPulseGlow(AUTO_GAME_DOCK_PULSE_COUNT);
        });
        return () => window.cancelAnimationFrame(frameId);
    }, [isClassroomImmersiveActive, isGameLikeImmersive, isMinimized, isStatsMinimized, location.pathname, location.search, triggerStatsPulseGlow]);

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
        const frameId = window.requestAnimationFrame(() => {
            if (isMinimized) {
                setExpandedMode(false);
                // Keep gold dock fully flushed while immersive content is active.
                setIsStatsMinimized(isGameLikeImmersive);
            } else {
                setIsStatsMinimized(false);
                setIsStatsLineDormant(false);
                setIsStatsLinePulsing(false);
                setIsStatsLineAwakeFlash(false);
            }
        });
        return () => window.cancelAnimationFrame(frameId);
    }, [isGameLikeImmersive, isMinimized]);

    // Always clear dormant/pulse state when stats panel is opened.
    useEffect(() => {
        isStatsMinimizedRef.current = isStatsMinimized;
        if (!isStatsMinimized) {
            const frameId = window.requestAnimationFrame(() => {
                setIsStatsLineDormant(false);
                setIsStatsLinePulsing(false);
                setIsStatsLineAwakeFlash(false);
            });
            if (statsAwakeFlashTimeoutRef.current !== null) {
                window.clearTimeout(statsAwakeFlashTimeoutRef.current);
                statsAwakeFlashTimeoutRef.current = null;
            }
            if (statsAutoDimTimeoutRef.current !== null) {
                window.clearTimeout(statsAutoDimTimeoutRef.current);
                statsAutoDimTimeoutRef.current = null;
            }
            return () => window.cancelAnimationFrame(frameId);
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
            // Stage restore flow: yellow panel first, gray nav second.
            if (isStatsMinimized) {
                setIsStatsMinimized(false);
                touchStartX.current = null;
                return;
            }
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
        const statsSwipeDistance = 34;

        if (Math.abs(diff) > clickBlockThreshold) {
            hasStatsSwiped.current = true;
        }

        // Minimize stats dock
        if (diff > statsSwipeDistance && !isStatsMinimized) {
            setIsStatsMinimized(true);
            statsTouchStartX.current = null;
            return;
        }

        // Restore stats dock
        if (diff < -statsSwipeDistance && isStatsMinimized) {
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

    const clearStatsShiftHandleGesture = useCallback((eventTarget?: EventTarget | null) => {
        const target = eventTarget instanceof Element ? eventTarget : null;
        const pointerId = statsShiftHandlePointerIdRef.current;
        if (target && pointerId !== null && typeof (target as Element & { releasePointerCapture?: (pointerId: number) => void }).releasePointerCapture === 'function') {
            try {
                (target as Element & { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(pointerId);
            } catch {
                // Ignore pointer release failures; clearing refs is enough to end the gesture safely.
            }
        }
        statsShiftHandlePointerIdRef.current = null;
        statsShiftHandleStartXRef.current = null;
        statsShiftHandleDraggedRef.current = false;
    }, []);

    const handleStatsShiftHandlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        if (!isMinimized || isStatsMinimized) {
            return;
        }
        statsShiftHandlePointerIdRef.current = event.pointerId;
        statsShiftHandleStartXRef.current = event.clientX;
        statsShiftHandleDraggedRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [isMinimized, isStatsMinimized]);

    const handleStatsShiftHandlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        if (statsShiftHandlePointerIdRef.current !== event.pointerId || statsShiftHandleStartXRef.current === null || isStatsMinimized) {
            return;
        }
        const diff = statsShiftHandleStartXRef.current - event.clientX;
        if (diff > 10) {
            statsShiftHandleDraggedRef.current = true;
        }
        if (diff >= STATS_SHIFT_HANDLE_DRAG_PX) {
            minimizeStatsDockToEdge();
            clearStatsShiftHandleGesture(event.currentTarget);
        }
    }, [clearStatsShiftHandleGesture, isStatsMinimized, minimizeStatsDockToEdge]);

    const handleStatsShiftHandlePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        clearStatsShiftHandleGesture(event.currentTarget);
    }, [clearStatsShiftHandleGesture]);

    const handleStatsShiftHandleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (statsShiftHandleDraggedRef.current) {
            statsShiftHandleDraggedRef.current = false;
            return;
        }
        if (!isMinimized || isStatsMinimized) {
            return;
        }
        minimizeStatsDockToEdge();
    }, [isMinimized, isStatsMinimized, minimizeStatsDockToEdge]);

    const handleStatsClickCapture = (e: React.MouseEvent) => {
        if (hasStatsSwiped.current) {
            e.stopPropagation();
            e.preventDefault();
            hasStatsSwiped.current = false;
        }
    };

    const handleWakeZonePress = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!(isMinimized && isStatsMinimized)) return;
        if (isStatsLineDormant) {
            triggerStatsAwakeFlash(STATS_WAKE_GLOW_MS);
            return;
        }
        setIsStatsMinimized(false);
    }, [isMinimized, isStatsMinimized, isStatsLineDormant, triggerStatsAwakeFlash]);

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
                location.pathname.startsWith('/open/') ||
                isClassroomViewerRoute ||
                isClassroomImmersiveActive;

            const pageFullscreenLike = !!document.querySelector(
                '.html-viewer-page.is-fullscreen, .viewer-page.fullscreen-mode, .iframe-container.fullscreen-active'
            );

            const isNowFullscreenLike = browserFullscreen || routeFullscreenLike || pageFullscreenLike;
            const activationKey = routeFullscreenLike
                ? `${location.pathname}${location.search}|${isClassroomImmersiveActive ? 'classroom-immersive' : 'route-immersive'}`
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

        const scheduleFullscreenEvaluation = () => {
            if (fullscreenEvaluateFrameRef.current !== null) {
                return;
            }
            fullscreenEvaluateFrameRef.current = window.requestAnimationFrame(() => {
                fullscreenEvaluateFrameRef.current = null;
                evaluateFullscreenTransition();
            });
        };

        evaluateFullscreenTransition();

        const shouldTrackTransitions = isMinimized && isStatsMinimized;
        if (!shouldTrackTransitions) {
            return () => {
                if (fullscreenEvaluateFrameRef.current !== null) {
                    window.cancelAnimationFrame(fullscreenEvaluateFrameRef.current);
                    fullscreenEvaluateFrameRef.current = null;
                }
            };
        }

        const onFullscreenChange = () => scheduleFullscreenEvaluation();
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
            scheduleFullscreenEvaluation();
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
            if (fullscreenEvaluateFrameRef.current !== null) {
                window.cancelAnimationFrame(fullscreenEvaluateFrameRef.current);
                fullscreenEvaluateFrameRef.current = null;
            }
        };
    }, [isClassroomImmersiveActive, isClassroomViewerRoute, isMinimized, isStatsMinimized, location.pathname, location.search]);

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

    // Keep bottom dock overlays visible during gameplay by preventing
    // iframe/container-only fullscreen (documentElement fullscreen is allowed).
    useEffect(() => {
        if (!isPlayRoute) return;

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
    }, [isPlayRoute]);

    // Helper to determine active state
    const isHomeActive = location.pathname === '/' || location.pathname === '/home-profile';
    const shouldShowStatsDock = isMinimized;
    const isGamesActive = location.pathname === '/apps' && activeTab === 'game';
    const tab = activeTab;
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
                        // Stage restore flow: click once opens yellow panel,
                        // click again restores gray nav tabs.
                        if (isStatsMinimized) {
                            setIsStatsMinimized(false);
                            e.stopPropagation();
                            return;
                        }
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
                        className={`nav-settings-btn ${isSettingsOpen ? 'settings-open' : ''}`}
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
                className={`bottom-stats-dock ${shouldShowStatsDock ? 'visible' : 'hidden'} ${isStatsMinimized ? 'minimized' : ''} ${isStatsLineDormant ? 'dormant' : ''} ${isStatsLinePulsing ? 'pulse' : ''} ${isStatsLineAwakeFlash ? 'awake' : ''}`}
                aria-label="User stats"
                aria-hidden={!shouldShowStatsDock}
                style={{ '--stats-pulse-count': String(statsPulseCount) } as React.CSSProperties}
                onTouchStart={onStatsTouchStart}
                onTouchMove={onStatsTouchMove}
                onTouchEnd={onStatsTouchEnd}
                onClickCapture={handleStatsClickCapture}
            >
                    <button
                        type="button"
                        className="stats-shift-handle"
                        aria-hidden={isStatsMinimized || !isMinimized}
                        aria-label="Slide stats dock left"
                        title="Click or drag left to move the dock out of the way"
                        onPointerDown={handleStatsShiftHandlePointerDown}
                        onPointerMove={handleStatsShiftHandlePointerMove}
                        onPointerUp={handleStatsShiftHandlePointerUp}
                        onPointerCancel={handleStatsShiftHandlePointerUp}
                        onClick={handleStatsShiftHandleClick}
                    >
                        <div className="stats-shift-line"></div>
                    </button>
                    <div
                        className="stats-restore-handle"
                        aria-hidden={!isStatsMinimized || !isMinimized}
                        onClick={(e) => {
                            if (isStatsMinimized && isMinimized) {
                                if (isStatsLineDormant) {
                                    triggerStatsAwakeFlash(STATS_WAKE_GLOW_MS);
                                    e.stopPropagation();
                                    return;
                                }
                                setIsStatsMinimized(false);
                                e.stopPropagation();
                            }
                        }}
                        title="Tap to wake/open, or slide right to open"
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
            {isMinimized && isStatsMinimized ? (
                <button
                    type="button"
                    className="stats-wake-zone"
                    aria-label={isStatsLineDormant ? "Activate dock handle glow" : "Open bottom tabs"}
                    title={isStatsLineDormant ? "Tap once to wake handle, tap again or slide right to open" : "Tap to open bottom tabs"}
                    onPointerDown={handleWakeZonePress}
                />
            ) : null}
            <div
                className={`homepage-transition-overlay ${homeTransitionPhase === 'idle' ? '' : 'is-active'} ${homeTransitionPhase === 'fading-out' ? 'is-fading-out' : ''}`}
                aria-hidden="true"
            />
        </>
    );
};
