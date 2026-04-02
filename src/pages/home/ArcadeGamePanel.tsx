import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ContentItem } from '../../types/content';
import { resolveItemIconPath } from './gameArtwork';

const HOLD_DURATION_MS = 2000;

export type FavoriteActionMode = 'add' | 'remove' | 'none';
type FeedbackKind = 'heart' | 'sad';

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
}

interface HoldFeedbackState {
    gameId: string;
    kind: FeedbackKind;
    key: number;
}

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

export const ArcadeGamePanel: React.FC<ArcadeGamePanelProps> = ({
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
    const holdFeedbackTimeoutRef = useRef<number | null>(null);

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
        if (holdFeedbackTimeoutRef.current !== null) {
            window.clearTimeout(holdFeedbackTimeoutRef.current);
            holdFeedbackTimeoutRef.current = null;
        }

        const key = Date.now();
        setHoldFeedback({ gameId, kind, key });
        holdFeedbackTimeoutRef.current = window.setTimeout(() => {
            holdFeedbackTimeoutRef.current = null;
            setHoldFeedback((current) => (current?.key === key ? null : current));
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

    const isFocusedGame = useCallback((game: ContentItem) => {
        return !!focusedGame && focusedGame.id === game.id;
    }, [focusedGame]);

    const startHoldProcess = useCallback((event: React.PointerEvent<HTMLButtonElement>, game: ContentItem) => {
        if (favoriteActionMode === 'none') return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        stopHoldProcess();
        holdTargetRef.current = {
            pointerId: event.pointerId,
            game,
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
            if (holdFeedbackTimeoutRef.current !== null) {
                window.clearTimeout(holdFeedbackTimeoutRef.current);
                holdFeedbackTimeoutRef.current = null;
            }
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
                                                    setFailedIconIds((prev) => {
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
