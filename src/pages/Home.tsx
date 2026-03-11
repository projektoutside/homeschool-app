import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentItem, ContentType } from '../types/content';
import { useManagerConfig } from '../hooks/useManagerConfig';
import './Home.css';

const PANEL_TITLE_DEFAULTS = [
    'Daily Doubles',
    'Mystery Triple',
    'Newest Featured',
    'Single Player',
    'Multiplayer Games',
    'Favorites',
] as const;
const DAILY_DOUBLES_PANEL_INDEX = 0;
const MYSTERY_PANEL_INDEX = 1;
const NEWEST_FEATURED_PANEL_INDEX = 2;
const SINGLE_PLAYER_PANEL_INDEX = 3;
const MULTIPLAYER_PANEL_INDEX = 4;
const MYSTERY_SHAKE_DURATION_MS = 1500;
const MYSTERY_REVEAL_DURATION_MS = 3100;
const FAVORITES_PANEL_TITLE = 'Favorites';
const FAVORITES_STORAGE_KEY = 'arcade_favorite_games_v1';
const HOLD_DURATION_MS = 2000;

const SINGLE_PLAYER_GAME_IDS = new Set<string>([
    'MathPuzzle',
    'preschool-fun-game',
    'word-puzzle-game',
    'math-1768955732393-game', // PolygonAPP (game entry)
    'math-car-king',
    'math-analog-clock-game-v2',
    'math-farmers-market-frenzy',
]);

const MULTIPLAYER_GAME_IDS = new Set<string>([
    'math-2-players-math-write',
    'math-spy-academy',
]);

type FavoriteActionMode = 'add' | 'remove' | 'none';
type FeedbackKind = 'heart' | 'sad';

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextCtor();
    }
    if (sharedAudioContext.state === 'suspended') {
        void sharedAudioContext.resume();
    }
    return sharedAudioContext;
};

const startBalloonInflateSound = (): (() => void) => {
    const ctx = getAudioContext();
    if (!ctx) return () => { };

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(410, ctx.currentTime + HOLD_DURATION_MS / 1000);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.034, ctx.currentTime + 0.12);
    gain.gain.linearRampToValueAtTime(0.054, ctx.currentTime + HOLD_DURATION_MS / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    return () => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.03);
        try {
            osc.stop(now + 0.11);
        } catch {
            // Oscillator can already be stopped after rapid interactions.
        }
    };
};

const playBalloonPopSound = (): void => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
};

const clampNumber = (value: number, min: number, max: number): number => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

const applyRubberBand = (value: number, min: number, max: number, strength: number): number => {
    if (value < min) {
        return min - (min - value) * strength;
    }
    if (value > max) {
        return max + (value - max) * strength;
    }
    return value;
};

const deriveThumbPathFromHtmlPath = (customHtmlPath?: string): string | null => {
    if (!customHtmlPath) return null;
    const match = customHtmlPath.match(/^(.*)\/index\.html$/i);
    if (!match) return null;
    return `${match[1]}/thumb.png`;
};

const resolveItemIconPath = (item: Pick<ContentItem, 'thumbnail' | 'customHtmlPath'>): string | null => {
    if (item.thumbnail) {
        return buildAssetPath(item.thumbnail);
    }
    const derivedThumbPath = deriveThumbPathFromHtmlPath(item.customHtmlPath);
    return derivedThumbPath ? buildAssetPath(derivedThumbPath) : null;
};

const resolveGameLaunchDocumentUrl = (item: Pick<ContentItem, 'type' | 'customHtmlPath' | 'externalUrl'>): string | null => {
    if (item.type !== 'game') return null;
    if (item.customHtmlPath) return buildAssetPath(item.customHtmlPath);
    if (!item.externalUrl) return null;
    if (/^https?:\/\//i.test(item.externalUrl)) return item.externalUrl;
    return buildAssetPath(item.externalUrl);
};

interface ArcadeGamePanelProps {
    panelIndex: number;
    title: string;
    games: ContentItem[];
    onTitleChange: (value: string) => void;
    onLaunchGame: (item: ContentItem) => void;
    favoriteActionMode: FavoriteActionMode;
    onFavoriteHoldAction: (item: ContentItem, action: Exclude<FavoriteActionMode, 'none'>) => void;
    emptyMessage?: string;
    isFavoritesPanel?: boolean;
    isMysteryPanel?: boolean;
    mysteryShakeActive?: boolean;
    onMysteryActivate?: () => void;
}

interface DragState {
    pointerId: number;
    startX: number;
    startPosition: number;
    lastX: number;
    lastTime: number;
    moved: boolean;
}

interface HoldVisualState {
    gameId: string;
    progress: number;
}

interface HoldTargetState {
    pointerId: number;
    game: ContentItem;
    button: HTMLButtonElement;
}

interface HoldFeedbackState {
    gameId: string;
    kind: FeedbackKind;
    key: number;
}

const ArcadeGamePanel: React.FC<ArcadeGamePanelProps> = ({
    panelIndex,
    title,
    games,
    onTitleChange,
    onLaunchGame,
    favoriteActionMode,
    onFavoriteHoldAction,
    emptyMessage,
    isFavoritesPanel,
    isMysteryPanel,
    mysteryShakeActive,
    onMysteryActivate,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pointerFrameRef = useRef<number | null>(null);
    const pendingPointerPositionRef = useRef<number | null>(null);
    const positionRef = useRef(0);
    const velocityRef = useRef(0);
    const suppressClickUntilRef = useRef(0);
    const holdFrameRef = useRef<number | null>(null);
    const holdSoundStopRef = useRef<(() => void) | null>(null);
    const holdTargetRef = useRef<HoldTargetState | null>(null);
    const holdStartRef = useRef<number | null>(null);
    const holdCompletedRef = useRef(false);
    const pendingLaunchGameRef = useRef<ContentItem | null>(null);

    const [position, setPosition] = useState(0);
    const [iconSize, setIconSize] = useState(84);
    const [spacing, setSpacing] = useState(112);
    const [failedIconIds, setFailedIconIds] = useState<Set<string>>(new Set());
    const [holdVisual, setHoldVisual] = useState<HoldVisualState | null>(null);
    const [holdFeedback, setHoldFeedback] = useState<HoldFeedbackState | null>(null);

    const maxIndex = Math.max(games.length - 1, 0);
    const focusedIndex = clampNumber(Math.round(position), 0, maxIndex);
    const focusedGame = games[focusedIndex];
    const showLeftHint = focusedIndex > 0;
    const showRightHint = focusedIndex < maxIndex;

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const stopAnimation = useCallback(() => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    const stopHoldProcess = useCallback(() => {
        if (holdFrameRef.current !== null) {
            cancelAnimationFrame(holdFrameRef.current);
            holdFrameRef.current = null;
        }
        holdSoundStopRef.current?.();
        holdSoundStopRef.current = null;
        holdTargetRef.current = null;
        holdStartRef.current = null;
        holdCompletedRef.current = false;
        setHoldVisual(null);
    }, []);

    const triggerHoldFeedback = useCallback((gameId: string, kind: FeedbackKind) => {
        const key = Date.now();
        setHoldFeedback({ gameId, kind, key });
        window.setTimeout(() => {
            setHoldFeedback(current => (current?.key === key ? null : current));
        }, 900);
    }, []);

    const completeHoldAction = useCallback(() => {
        if (holdCompletedRef.current) return;
        const holdTarget = holdTargetRef.current;
        if (!holdTarget || favoriteActionMode === 'none') return;

        holdCompletedRef.current = true;
        holdSoundStopRef.current?.();
        holdSoundStopRef.current = null;
        playBalloonPopSound();
        onFavoriteHoldAction(holdTarget.game, favoriteActionMode);
        triggerHoldFeedback(holdTarget.game.id, favoriteActionMode === 'add' ? 'heart' : 'sad');
        suppressClickUntilRef.current = Date.now() + 450;
        setHoldVisual(null);
    }, [favoriteActionMode, onFavoriteHoldAction, triggerHoldFeedback]);

    const shouldBlockGameLaunch = useCallback(() => {
        if (Date.now() < suppressClickUntilRef.current) return true;
        return !!dragStateRef.current?.moved;
    }, []);

    const isFocusedGame = useCallback((game: ContentItem) => (
        !!focusedGame && focusedGame.id === game.id
    ), [focusedGame]);

    const startHoldProcess = useCallback((event: React.PointerEvent<HTMLButtonElement>, game: ContentItem) => {
        if (favoriteActionMode === 'none') return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        stopHoldProcess();
        holdTargetRef.current = {
            pointerId: event.pointerId,
            game,
            button: event.currentTarget,
        };
        holdStartRef.current = performance.now();
        holdSoundStopRef.current = startBalloonInflateSound();
        setHoldVisual({ gameId: game.id, progress: 0 });

        const update = () => {
            const holdStart = holdStartRef.current;
            if (holdStart === null) return;

            const progress = clampNumber((performance.now() - holdStart) / HOLD_DURATION_MS, 0, 1);
            setHoldVisual({ gameId: game.id, progress });

            if (progress >= 1) {
                completeHoldAction();
                return;
            }

            holdFrameRef.current = requestAnimationFrame(update);
        };

        holdFrameRef.current = requestAnimationFrame(update);
    }, [completeHoldAction, favoriteActionMode, stopHoldProcess]);

    const handleGamePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, game: ContentItem) => {
        if (!isFocusedGame(game)) {
            pendingLaunchGameRef.current = null;
            return;
        }
        pendingLaunchGameRef.current = game;
        startHoldProcess(event, game);
    }, [isFocusedGame, startHoldProcess]);

    const endHoldProcess = useCallback((pointerId: number) => {
        const holdTarget = holdTargetRef.current;
        if (!holdTarget || holdTarget.pointerId !== pointerId) return;
        stopHoldProcess();
    }, [stopHoldProcess]);

    const setPositionValue = useCallback((nextValue: number) => {
        positionRef.current = nextValue;
        setPosition(nextValue);
    }, []);

    const flushPointerFrame = useCallback(() => {
        if (pointerFrameRef.current !== null) {
            cancelAnimationFrame(pointerFrameRef.current);
            pointerFrameRef.current = null;
        }

        if (pendingPointerPositionRef.current !== null) {
            setPositionValue(pendingPointerPositionRef.current);
            pendingPointerPositionRef.current = null;
        }
    }, [setPositionValue]);

    const startAnimationLoop = useCallback((step: (dt: number) => boolean) => {
        stopAnimation();

        let lastTimestamp = performance.now();
        const tick = (timestamp: number) => {
            const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
            lastTimestamp = timestamp;

            const done = step(dt);
            if (done) {
                animationFrameRef.current = null;
                return;
            }

            animationFrameRef.current = requestAnimationFrame(tick);
        };

        animationFrameRef.current = requestAnimationFrame(tick);
    }, [stopAnimation]);

    const startSnapAnimation = useCallback((targetIndex: number) => {
        const clampedTarget = clampNumber(targetIndex, 0, maxIndex);
        let springVelocity = velocityRef.current;

        startAnimationLoop((dt) => {
            const currentPosition = positionRef.current;
            const displacement = clampedTarget - currentPosition;

            springVelocity += displacement * 50 * dt;
            springVelocity *= Math.exp(-13 * dt);

            const nextPosition = currentPosition + springVelocity * dt;
            setPositionValue(nextPosition);
            velocityRef.current = springVelocity;

            if (Math.abs(displacement) < 0.001 && Math.abs(springVelocity) < 0.002) {
                velocityRef.current = 0;
                setPositionValue(clampedTarget);
                return true;
            }
            return false;
        });
    }, [maxIndex, setPositionValue, startAnimationLoop]);

    const startInertiaAnimation = useCallback((initialVelocity: number) => {
        if (maxIndex <= 0) {
            velocityRef.current = 0;
            setPositionValue(0);
            return;
        }

        velocityRef.current = initialVelocity;

        startAnimationLoop((dt) => {
            const currentPosition = positionRef.current;
            let nextPosition = currentPosition + velocityRef.current * dt;

            if (nextPosition < 0 || nextPosition > maxIndex) {
                const boundary = nextPosition < 0 ? 0 : maxIndex;
                const overshoot = nextPosition - boundary;
                velocityRef.current += (-overshoot * 64) * dt;
                velocityRef.current *= Math.exp(-13 * dt);
            } else {
                velocityRef.current *= Math.exp(-8.25 * dt);
            }

            nextPosition = currentPosition + velocityRef.current * dt;
            setPositionValue(nextPosition);

            const nearBounds = nextPosition >= -0.015 && nextPosition <= maxIndex + 0.015;
            if (Math.abs(velocityRef.current) < 0.02 && nearBounds) {
                startSnapAnimation(Math.round(clampNumber(nextPosition, 0, maxIndex)));
                return true;
            }
            return false;
        });
    }, [maxIndex, setPositionValue, startAnimationLoop, startSnapAnimation]);

    const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (games.length <= 1) return;
        if (!(event.target instanceof Element) || !event.target.closest('.arcade-app-item')) {
            pendingLaunchGameRef.current = null;
        }

        stopAnimation();
        flushPointerFrame();
        velocityRef.current = 0;

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startPosition: positionRef.current,
            lastX: event.clientX,
            lastTime: performance.now(),
            moved: false,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
    }, [flushPointerFrame, games.length, stopAnimation]);

    const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - dragState.startX;
        const rawPosition = dragState.startPosition - deltaX / spacing;
        const displayPosition = applyRubberBand(rawPosition, 0, maxIndex, 0.24);
        pendingPointerPositionRef.current = displayPosition;
        if (pointerFrameRef.current === null) {
            pointerFrameRef.current = requestAnimationFrame(() => {
                pointerFrameRef.current = null;
                if (pendingPointerPositionRef.current !== null) {
                    setPositionValue(pendingPointerPositionRef.current);
                    pendingPointerPositionRef.current = null;
                }
            });
        }

        const now = performance.now();
        const dt = Math.max((now - dragState.lastTime) / 1000, 0.008);
        const movementVelocity = -((event.clientX - dragState.lastX) / spacing) / dt;
        velocityRef.current = velocityRef.current * 0.72 + movementVelocity * 0.28;

        dragState.lastX = event.clientX;
        dragState.lastTime = now;
        if (Math.abs(deltaX) > 10) {
            dragState.moved = true;
            pendingLaunchGameRef.current = null;
            stopHoldProcess();
        }
    }, [maxIndex, setPositionValue, spacing, stopHoldProcess]);

    const handlePointerRelease = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        endHoldProcess(event.pointerId);
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
        } catch {
            // Pointer capture release can throw on some browsers during rapid state changes.
        }

        flushPointerFrame();
        dragStateRef.current = null;

        if (event.type === 'pointercancel') {
            pendingLaunchGameRef.current = null;
            return;
        }

        if (dragState.moved) {
            pendingLaunchGameRef.current = null;
            suppressClickUntilRef.current = Date.now() + 140;
            startInertiaAnimation(velocityRef.current);
            return;
        }

        startSnapAnimation(Math.round(positionRef.current));
    }, [endHoldProcess, flushPointerFrame, startInertiaAnimation, startSnapAnimation]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            stopAnimation();
            velocityRef.current = 0;

            const delta = event.key === 'ArrowRight' ? 1 : -1;
            const target = clampNumber(Math.round(positionRef.current) + delta, 0, maxIndex);
            startSnapAnimation(target);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            if (!focusedGame) return;
            event.preventDefault();
            if (shouldBlockGameLaunch()) return;
            onLaunchGame(focusedGame);
        }
    }, [focusedGame, maxIndex, onLaunchGame, shouldBlockGameLaunch, startSnapAnimation, stopAnimation]);

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        pendingLaunchGameRef.current = null;
        event.preventDefault();
    }, []);

    const handleGameClick = useCallback((game: ContentItem) => {
        pendingLaunchGameRef.current = null;
        if (!isFocusedGame(game)) return;
        if (shouldBlockGameLaunch()) return;
        onLaunchGame(game);
    }, [isFocusedGame, onLaunchGame, shouldBlockGameLaunch]);

    const handleViewportClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        const pendingGame = pendingLaunchGameRef.current;
        pendingLaunchGameRef.current = null;
        if (!pendingGame || shouldBlockGameLaunch()) return;
        if (!isFocusedGame(pendingGame)) return;
        onLaunchGame(pendingGame);
    }, [isFocusedGame, onLaunchGame, shouldBlockGameLaunch]);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const updateMetrics = () => {
            const width = viewport.clientWidth || 320;
            const computedIconSize = clampNumber(width * 0.23, 64, 124);
            const computedSpacing = computedIconSize + clampNumber(width * 0.075, 18, 46);
            setIconSize(computedIconSize);
            setSpacing(computedSpacing);
        };

        updateMetrics();

        const resizeObserver = new ResizeObserver(updateMetrics);
        resizeObserver.observe(viewport);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const clamped = clampNumber(positionRef.current, 0, maxIndex);
        if (clamped !== positionRef.current) {
            setPositionValue(clamped);
        }
    }, [maxIndex, setPositionValue]);

    useEffect(() => {
        return () => {
            stopAnimation();
            flushPointerFrame();
            stopHoldProcess();
        };
    }, [flushPointerFrame, stopAnimation, stopHoldProcess]);

    if (isMysteryPanel) {
        return (
            <section
                className="arcade-panel-shell"
                aria-label={`Games panel ${panelIndex + 1}`}
                style={{ '--panel-index': String(panelIndex) } as React.CSSProperties}
            >
                <div className="arcade-panel-title-row">
                    <input
                        className="arcade-panel-title-input"
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        maxLength={28}
                        aria-label={`Panel ${panelIndex + 1} title`}
                    />
                </div>

                <div className={`arcade-panel-frame arcade-panel-frame--mystery ${mysteryShakeActive ? 'is-shaking' : ''}`}>
                    <div className="arcade-panel-shimmer" aria-hidden="true"></div>
                    <div className="arcade-panel-sparkles" aria-hidden="true"></div>
                    <button
                        type="button"
                        className="arcade-mystery-trigger"
                        onClick={onMysteryActivate}
                        aria-label="Play a random mystery game"
                    >
                        <span className="arcade-mystery-orb" aria-hidden="true">
                            <span className="arcade-mystery-qmark">?</span>
                        </span>
                        <span className="arcade-mystery-label">Tap For Random Game</span>
                    </button>
                </div>
            </section>
        );
    }

    if (games.length === 0) {
        return (
            <section className="arcade-panel-shell" aria-label={`Games panel ${panelIndex + 1}`}>
                <div className="arcade-panel-title-row">
                    <input
                        className="arcade-panel-title-input"
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        maxLength={28}
                    />
                </div>
                <div className="arcade-panel-frame arcade-panel-frame-empty">
                    <p className={isFavoritesPanel ? 'arcade-empty-message arcade-empty-message--favorites' : ''}>
                        {emptyMessage ?? 'No games available.'}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section
            className="arcade-panel-shell"
            aria-label={`Games panel ${panelIndex + 1}`}
            style={{ '--panel-index': String(panelIndex) } as React.CSSProperties}
        >
            <div className="arcade-panel-title-row">
                <div
                    className={`arcade-scroll-hint arcade-scroll-hint--title arcade-scroll-hint--left ${showLeftHint ? '' : 'is-hidden'}`}
                    aria-hidden="true"
                >
                    <span className="arcade-scroll-hint__glow" aria-hidden="true"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                </div>

                <input
                    className="arcade-panel-title-input"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    maxLength={28}
                    aria-label={`Panel ${panelIndex + 1} title`}
                />

                <div
                    className={`arcade-scroll-hint arcade-scroll-hint--title arcade-scroll-hint--right ${showRightHint ? '' : 'is-hidden'}`}
                    aria-hidden="true"
                >
                    <span className="arcade-scroll-hint__glow" aria-hidden="true"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                    <span className="arcade-scroll-hint__chevron"></span>
                </div>
            </div>

            <div className="arcade-panel-frame">
                <div className="arcade-panel-shimmer" aria-hidden="true"></div>
                <div className="arcade-panel-sparkles" aria-hidden="true"></div>

                <div
                    ref={viewportRef}
                    className="arcade-carousel-viewport"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerRelease}
                    onPointerCancel={handlePointerRelease}
                    onKeyDown={handleKeyDown}
                    onClick={handleViewportClick}
                    onContextMenu={handleContextMenu}
                    tabIndex={0}
                    role="listbox"
                    aria-label={`Games carousel ${panelIndex + 1}`}
                    style={{ '--arcade-icon-size': `${iconSize}px` } as React.CSSProperties}
                >
                    <div className="arcade-carousel-track">
                        {games.map((game, index) => {
                            const iconPath = resolveItemIconPath(game);
                            const showIconImage = !!iconPath && !failedIconIds.has(game.id);
                            const distance = Math.abs(index - position);
                            const proximity = clampNumber(1 - distance, 0, 1);
                            const scale = 0.74 + proximity * 0.42;
                            const x = (index - position) * spacing;
                            const isFocused = index === focusedIndex;
                            const y = (1 - scale) * 16 + 2 + proximity * 4;
                            const opacity = clampNumber(0.34 + proximity * 0.66, 0.3, 1);
                            const brightness = 0.76 + proximity * 0.34;
                            const zIndex = Math.round(180 - distance * 80);
                            const holdProgress = holdVisual?.gameId === game.id ? holdVisual.progress : 0;
                            const holdScaleMultiplier = 1 + holdProgress * 0.22;
                            const feedbackKind = holdFeedback?.gameId === game.id ? holdFeedback.kind : null;

                            const itemStyle: React.CSSProperties = {
                                transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale * holdScaleMultiplier})`,
                                opacity,
                                filter: `brightness(${brightness}) saturate(${0.8 + proximity * 0.42})`,
                                zIndex,
                            };

                            return (
                                <button
                                    key={`${game.id}-${panelIndex}`}
                                    type="button"
                                    className={`arcade-app-item ${isFocused ? 'is-focused' : ''}`}
                                    style={itemStyle}
                                    onClick={() => handleGameClick(game)}
                                    onPointerDown={(event) => handleGamePointerDown(event, game)}
                                    title={game.title}
                                    aria-label={game.title}
                                    aria-disabled={!isFocused}
                                    tabIndex={isFocused ? 0 : -1}
                                >
                                    <span className="arcade-app-thumb">
                                        {showIconImage ? (
                                            <img
                                                src={iconPath}
                                                alt=""
                                                draggable={false}
                                                onError={() => {
                                                    setFailedIconIds(prev => {
                                                        const next = new Set(prev);
                                                        next.add(game.id);
                                                        return next;
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <span className="arcade-app-fallback" aria-hidden="true">🎮</span>
                                        )}
                                    </span>
                                    {feedbackKind ? (
                                        <span
                                            className={`arcade-hold-feedback arcade-hold-feedback--${feedbackKind}`}
                                            aria-hidden="true"
                                        >
                                            {feedbackKind === 'heart' ? '💖' : '😢'}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                </div>

                <div className="arcade-focus-name" aria-live="polite">
                    {focusedGame?.title ?? ''}
                </div>
            </div>
        </section>
    );
};

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { config, resolvedItems, allItems } = useManagerConfig();
    const [activeTab, setActiveTab] = useState<string>(config.tabs[0]?.id ?? '');
    const [openFolderId, setOpenFolderId] = useState<string | null>(null);
    const [panelTitles, setPanelTitles] = useState<string[]>(() => [...PANEL_TITLE_DEFAULTS]);
    const [mysteryShakeActive, setMysteryShakeActive] = useState(false);
    const [mysteryTargetGameId, setMysteryTargetGameId] = useState<string | null>(null);
    const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((value): value is string => typeof value === 'string');
        } catch {
            return [];
        }
    });

    const currentTabId = useMemo(
        () => (config.tabs.find(tab => tab.id === activeTab)?.id ?? config.tabs[0]?.id ?? ''),
        [activeTab, config.tabs],
    );

    const foldersForTab = useMemo(
        () => config.folders.filter(folder => folder.tabId === currentTabId),
        [config.folders, currentTabId],
    );

    const rootItems = useMemo(() => {
        const itemIds = config.tabItems[currentTabId] ?? [];
        return itemIds
            .map(id => resolvedItems.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .slice(0, 30);
    }, [config.tabItems, currentTabId, resolvedItems]);

    const folderItems = useMemo(() => {
        if (!openFolderId) return [];
        const folder = foldersForTab.find(f => f.id === openFolderId);
        if (!folder) return [];

        return folder.itemIds
            .map(id => resolvedItems.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [foldersForTab, openFolderId, resolvedItems]);

    const visibleItems = openFolderId ? folderItems : rootItems;
    const currentTab = useMemo(
        () => config.tabs.find(tab => tab.id === currentTabId),
        [config.tabs, currentTabId],
    );
    const isGamesTab = currentTab?.sourceType === 'game'
        || currentTab?.label.trim().toLowerCase() === 'games'
        || currentTab?.id === 'game';

    const allGameItems = useMemo(
        () => allItems.filter(item => item.type === 'game'),
        [allItems],
    );
    const singlePlayerGames = useMemo(
        () => allGameItems.filter(item => SINGLE_PLAYER_GAME_IDS.has(item.id)),
        [allGameItems],
    );
    const multiplayerGames = useMemo(
        () => allGameItems.filter(item => MULTIPLAYER_GAME_IDS.has(item.id)),
        [allGameItems],
    );
    const dailyDoubleGames = useMemo(() => {
        if (allGameItems.length === 0) return [];

        // Deterministic per local day so the "Daily Doubles" game changes once per day.
        const now = new Date();
        const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        let hash = 0;
        for (let i = 0; i < dayKey.length; i += 1) {
            hash = ((hash << 5) - hash) + dayKey.charCodeAt(i);
            hash |= 0;
        }

        const gameIndex = Math.abs(hash) % allGameItems.length;
        return [allGameItems[gameIndex]];
    }, [allGameItems]);
    const gamesForPanelByIndex = useMemo(() => {
        const map = new Map<number, ContentItem[]>();
        map.set(DAILY_DOUBLES_PANEL_INDEX, dailyDoubleGames);
        map.set(NEWEST_FEATURED_PANEL_INDEX, allGameItems);
        map.set(SINGLE_PLAYER_PANEL_INDEX, singlePlayerGames);
        map.set(MULTIPLAYER_PANEL_INDEX, multiplayerGames);
        return map;
    }, [allGameItems, dailyDoubleGames, multiplayerGames, singlePlayerGames]);
    const favoriteGames = useMemo(() => {
        const byId = new Map(allGameItems.map(item => [item.id, item]));
        return favoriteGameIds
            .map(id => byId.get(id))
            .filter((item): item is ContentItem => Boolean(item));
    }, [allGameItems, favoriteGameIds]);
    const shouldRenderArcadePanels = isGamesTab && !openFolderId && allGameItems.length > 0;

    const favoritesPanelIndex = useMemo(
        () => panelTitles.findIndex(title => title.trim().toLowerCase() === FAVORITES_PANEL_TITLE.toLowerCase()),
        [panelTitles],
    );
    const itemsForPreload = useMemo(
        () => (shouldRenderArcadePanels
            ? [...allGameItems, ...favoriteGames]
            : visibleItems),
        [allGameItems, favoriteGames, shouldRenderArcadePanels, visibleItems],
    );
    const visibleIconPaths = useMemo(
        () => itemsForPreload
            .slice(0, 16)
            .map(item => resolveItemIconPath(item))
            .filter((path): path is string => Boolean(path)),
        [itemsForPreload],
    );
    const gameLaunchPrefetchUrls = useMemo(() => {
        const sourceItems = shouldRenderArcadePanels ? allGameItems : visibleItems;
        return sourceItems
            .filter(item => item.type === 'game')
            .map(item => resolveGameLaunchDocumentUrl(item))
            .filter((url): url is string => Boolean(url))
            .slice(0, 6);
    }, [allGameItems, shouldRenderArcadePanels, visibleItems]);
    const prefetchedGameLaunchUrlsRef = useRef<Set<string>>(new Set());

    const prefetchGameLaunchDocument = useCallback((url: string) => {
        if (typeof window === 'undefined' || typeof document === 'undefined' || !url) return;
        if (import.meta.env.DEV) return;
        if (prefetchedGameLaunchUrlsRef.current.has(url)) return;
        prefetchedGameLaunchUrlsRef.current.add(url);

        const prefetchKey = encodeURIComponent(url);
        const existingPrefetch = document.querySelector<HTMLLinkElement>(
            `link[data-prefetch-game-doc="${prefetchKey}"]`,
        );
        if (!existingPrefetch) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.as = 'document';
            prefetchLink.href = url;
            prefetchLink.setAttribute('data-prefetch-game-doc', prefetchKey);
            document.head.appendChild(prefetchLink);
        }

        const isAbsoluteHttp = /^https?:\/\//i.test(url);
        const isSameOriginAbsolute = isAbsoluteHttp && url.startsWith(window.location.origin);
        const isRelative = !isAbsoluteHttp;
        if (isSameOriginAbsolute || isRelative) {
            void fetch(url, {
                cache: 'force-cache',
                credentials: 'same-origin',
            }).catch(() => {
                // Warmup fetch is opportunistic.
            });
        }
    }, []);

    useEffect(() => {
        const requestedTab = new URLSearchParams(location.search).get('tab')?.trim().toLowerCase();
        if (!requestedTab) return;

        // Always route worksheets tab requests to the dedicated HTML viewer.
        if (requestedTab === 'worksheets') {
            navigate('/html-viewer', { replace: true });
            return;
        }

        const tabFromQuery = config.tabs.find(tab => tab.label.trim().toLowerCase() === requestedTab);
        if (!tabFromQuery) return;

        if (tabFromQuery.id === activeTab && openFolderId === null) {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            setActiveTab(tabFromQuery.id);
            setOpenFolderId(null);
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [activeTab, config.tabs, location.search, navigate, openFolderId]);

    // Prime the most visible icons for faster first paint on slower connections/devices.
    useEffect(() => {
        visibleIconPaths.forEach(src => {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
        });
    }, [visibleIconPaths]);

    // Warm the first few game entry documents while users browse game panels.
    useEffect(() => {
        if (import.meta.env.DEV) return;
        if (gameLaunchPrefetchUrls.length === 0) return;

        const timerIds: number[] = [];
        gameLaunchPrefetchUrls.forEach((url, index) => {
            const timerId = window.setTimeout(() => {
                prefetchGameLaunchDocument(url);
            }, 120 + index * 220);
            timerIds.push(timerId);
        });

        return () => {
            timerIds.forEach((timerId) => window.clearTimeout(timerId));
        };
    }, [gameLaunchPrefetchUrls, prefetchGameLaunchDocument]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteGameIds));
    }, [favoriteGameIds]);

    useEffect(() => {
        const validGameIds = new Set(allGameItems.map(item => item.id));
        const frameId = window.requestAnimationFrame(() => {
            setFavoriteGameIds(prev => {
                const filtered = prev.filter(id => validGameIds.has(id));
                return filtered.length === prev.length ? prev : filtered;
            });
        });
        return () => window.cancelAnimationFrame(frameId);
    }, [allGameItems]);

    const handlePanelTitleChange = useCallback((panelIndex: number, nextTitle: string) => {
        setPanelTitles(prevTitles => prevTitles.map((value, index) => (
            index === panelIndex ? nextTitle : value
        )));
    }, []);

    const openItem = useCallback((item: ContentItem) => {
        const launchDocumentUrl = resolveGameLaunchDocumentUrl(item);
        if (launchDocumentUrl) {
            prefetchGameLaunchDocument(launchDocumentUrl);
        }

        if (item.externalUrl) {
            navigate(item.externalUrl);
            return;
        }

        const targetPath = item.type === 'game'
            ? `/play/${item.id}`
            : (item.type === 'worksheet' || item.type === 'tool')
                ? `/open/${item.id}`
                : `/resource/${item.id}`;
        navigate(targetPath, { state: { launchItem: item } });
    }, [navigate, prefetchGameLaunchDocument]);

    const handleFavoriteHoldAction = useCallback((item: ContentItem, action: Exclude<FavoriteActionMode, 'none'>) => {
        setFavoriteGameIds(prev => {
            if (action === 'add') {
                return prev.includes(item.id) ? prev : [...prev, item.id];
            }
            return prev.filter(id => id !== item.id);
        });
    }, []);

    const activateMysteryPanel = useCallback(() => {
        if (allGameItems.length === 0 || mysteryShakeActive || mysteryTargetGameId) return;

        const randomGame = allGameItems[Math.floor(Math.random() * allGameItems.length)];
        setMysteryShakeActive(true);

        window.setTimeout(() => {
            setMysteryShakeActive(false);
            setMysteryTargetGameId(randomGame.id);
        }, MYSTERY_SHAKE_DURATION_MS);

        window.setTimeout(() => {
            navigate(`/play/${randomGame.id}`, { state: { launchItem: randomGame } });
        }, MYSTERY_REVEAL_DURATION_MS);
    }, [allGameItems, mysteryShakeActive, mysteryTargetGameId, navigate]);

    const getFallbackIcon = (type: ContentType): string => {
        if (type === 'game') return '🎮';
        if (type === 'worksheet') return '📄';
        if (type === 'tool') return '🧰';
        return '📁';
    };

    const mysteryGlyphStyles = useMemo(
        () => Array.from({ length: 64 }, (_, index) => {
            const xSeed = ((index * 37) % 101) / 100;
            const ySeed = ((index * 53) % 103) / 100;
            const x = (xSeed * 2 - 1) * 56;
            const y = (ySeed * 2 - 1) * 52;
            const size = 0.85 + ((index * 29) % 7) * 0.26;
            const delay = (index % 16) * 0.035;

            return {
                '--mx': `${x}vw`,
                '--my': `${y}vh`,
                '--msize': size.toFixed(2),
                '--mdelay': `${delay}s`,
            } as React.CSSProperties;
        }),
        [],
    );

    return (
        <div className="os-desktop-shell">
            <section
                className={`os-icon-area ${shouldRenderArcadePanels ? 'os-icon-area--arcade' : ''}`}
                aria-label={`${currentTabId} apps`}
            >
                {shouldRenderArcadePanels ? (
                    <div className="arcade-games-board">
                        {panelTitles.map((title, index) => {
                            const isFavoritesPanel = index === favoritesPanelIndex && favoritesPanelIndex !== -1;
                            const isMysteryPanel = index === MYSTERY_PANEL_INDEX;
                            const gamesForPanel = isMysteryPanel
                                ? []
                                : (isFavoritesPanel ? favoriteGames : (gamesForPanelByIndex.get(index) ?? allGameItems));
                            const favoriteActionMode: FavoriteActionMode = isMysteryPanel
                                ? 'none'
                                : (isFavoritesPanel ? 'remove' : 'add');
                            return (
                            <ArcadeGamePanel
                                key={`arcade-panel-${index}`}
                                panelIndex={index}
                                title={title}
                                games={gamesForPanel}
                                onTitleChange={(nextTitle) => handlePanelTitleChange(index, nextTitle)}
                                onLaunchGame={openItem}
                                favoriteActionMode={favoriteActionMode}
                                onFavoriteHoldAction={handleFavoriteHoldAction}
                                emptyMessage={isFavoritesPanel ? 'Press and hold any game to add it to Favorites. Your saved picks stay here for quick access.' : undefined}
                                isFavoritesPanel={isFavoritesPanel}
                                isMysteryPanel={isMysteryPanel}
                                mysteryShakeActive={isMysteryPanel ? mysteryShakeActive : false}
                                onMysteryActivate={isMysteryPanel ? activateMysteryPanel : undefined}
                            />
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {!openFolderId && foldersForTab.map(folder => (
                            <button
                                key={folder.id}
                                type="button"
                                className="desktop-app-icon desktop-app-folder"
                                onClick={() => setOpenFolderId(folder.id)}
                                aria-label={`Open folder ${folder.name}`}
                            >
                                <span className="desktop-app-icon-inner" aria-hidden="true">
                                    <span className="desktop-app-fallback folder-glyph">📁</span>
                                </span>
                            </button>
                        ))}

                        {openFolderId && (
                            <button
                                type="button"
                                className="desktop-app-icon desktop-app-folder"
                                onClick={() => setOpenFolderId(null)}
                                aria-label="Back to tab root"
                            >
                                <span className="desktop-app-icon-inner" aria-hidden="true">
                                    <span className="desktop-app-fallback folder-glyph">↩️</span>
                                </span>
                            </button>
                        )}

                        {visibleItems.map((item, index) => {
                            const iconPath = resolveItemIconPath(item);
                            const prioritizeIcon = index < 12;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="desktop-app-icon"
                                    onClick={() => openItem(item)}
                                    aria-label={`Open ${item.title}`}
                                >
                                    <span className="desktop-app-icon-inner" aria-hidden="true">
                                        {iconPath ? (
                                            <img
                                                src={iconPath}
                                                alt=""
                                                loading={prioritizeIcon ? 'eager' : 'lazy'}
                                                fetchPriority={prioritizeIcon ? 'high' : 'auto'}
                                                decoding={prioritizeIcon ? 'sync' : 'async'}
                                                width={66}
                                                height={66}
                                                draggable={false}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.removeAttribute('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <span className="desktop-app-fallback" hidden={!!iconPath}>{getFallbackIcon(item.type)}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </>
                )}
            </section>
            {mysteryTargetGameId ? (
                <div className="mystery-screen-transition" aria-hidden="true">
                    <div className="mystery-screen-fade"></div>
                    <div className="mystery-glyph-cloud">
                        {mysteryGlyphStyles.map((style, index) => (
                            <span key={`mystery-glyph-${index}`} className="mystery-glyph" style={style}>?</span>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default HomePage;
