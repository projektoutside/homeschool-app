import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { findBaseModuleById, resolveAreaFromRequest, resolveAreaRoute } from '../data/moduleRegistry';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentItem } from '../types/content';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointsContext';
import { useStamina } from '../context/StaminaContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { usePWA } from '../hooks/usePWA';
import { useZoomLock } from '../hooks/useZoomLock';
import { useManagerConfig } from '../hooks/useManagerConfig';
import { supabase } from '../lib/supabase';
import { isGuestUser } from '../utils/guestSession';
import { getGameHostPolicy } from '../utils/gameHostPolicy';
import { teardownIframeElement, teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import { getFullscreenElement, requestElementFullscreen } from '../utils/fullscreen';
import { GAME_STAMINA_COST, getSecondsUntilNextRecharge } from '../utils/stamina';
import { resumeIframeRuntime, syncIframeSoundSettings } from '../utils/iframeRuntime';
import {
    type GamePointsAckMessage,
    type GamePointsContextMessage,
    GAME_POINTS_ACK_MESSAGE,
    GAME_POINTS_CONTEXT_MESSAGE,
    GAME_POINTS_EARNED_MESSAGE,
    createGamePointsSessionId,
    getPointEventKey,
    isSinglePlayerPointsGameId,
    sanitizePointValue,
} from '../utils/gamePoints';
import {
    CAR_KING_SPEECH_CONTROL,
    createCarKingSpeechEvent,
    isCarKingSpeechControlMessage,
} from '../features/speech/speechBridge';
import { CarKingNativeFirstSpeechController } from '../features/speech/nativeSpeechController';
import './GamePlayer.css';

const GAME_EXIT_TO_HOME_MESSAGE = 'LAHS_GAME_EXIT_TO_HOME';
const CAR_KING_GAME_ID = 'math-car-king';
const WORD_PUZZLE_GAME_ID = 'word-puzzle-game';
const CAR_KING_MIC_PREF_SYNC = 'LAHS_CAR_KING_MIC_PREF_SYNC';
const CAR_KING_MIC_PREF_REQUEST = 'LAHS_CAR_KING_MIC_PREF_REQUEST';
const CAR_KING_MIC_PREF_SAVE = 'LAHS_CAR_KING_MIC_PREF_SAVE';
const CAR_KING_MIC_PREF_SAVE_RESULT = 'LAHS_CAR_KING_MIC_PREF_SAVE_RESULT';
const CAR_KING_MIC_PREF_STORAGE_PREFIX = 'carKingMicPreference';
const WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY = 'LAHS_WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP';
const WORD_PUZZLE_USER_CONTEXT_SYNC = 'LAHS_WORD_PUZZLE_USER_CONTEXT_SYNC';
const WORD_PUZZLE_USER_CONTEXT_REQUEST = 'LAHS_WORD_PUZZLE_USER_CONTEXT_REQUEST';
const DEV_CACHE_BUST = import.meta.env.DEV ? Date.now().toString() : '';
const GAME_FULLSCREEN_RETRY_THROTTLE_MS = 250;
const GAME_FULLSCREEN_RETRY_DELAYS_MS = [0, 120, 360, 900];

type CarKingMicPreference = 'ask' | 'session' | 'always';
type WordPuzzleUserContext = {
    userId: string | null;
    username: string | null;
    isAuthenticated: boolean;
    storageScope: string;
};

type StaminaGateStatus = {
    requestKey: string | null;
    status: 'checking' | 'allowed' | 'blocked';
};

const isCarKingMicPreference = (value: unknown): value is CarKingMicPreference => {
    return value === 'ask' || value === 'session' || value === 'always';
};

const getCarKingMicPreferenceStorageKey = (userId: string) => {
    return `${CAR_KING_MIC_PREF_STORAGE_PREFIX}:${userId}`;
};

const readLocalCarKingMicPreference = (userId?: string | null): CarKingMicPreference => {
    if (!userId) return 'ask';

    try {
        const stored = window.localStorage.getItem(getCarKingMicPreferenceStorageKey(userId));
        return isCarKingMicPreference(stored) ? stored : 'ask';
    } catch {
        return 'ask';
    }
};

const writeLocalCarKingMicPreference = (
    userId: string | null | undefined,
    preference: CarKingMicPreference,
) => {
    if (!userId) return;

    try {
        const key = getCarKingMicPreferenceStorageKey(userId);
        if (preference === 'always') {
            window.localStorage.setItem(key, preference);
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Ignore local fallback storage failures.
    }
};

const getUserCarKingMicPreference = (user: User | null): CarKingMicPreference => {
    const storedInMetadata = user?.user_metadata?.car_king_mic_preference;
    if (isCarKingMicPreference(storedInMetadata)) {
        return storedInMetadata;
    }

    return readLocalCarKingMicPreference(user?.id);
};

const buildWordPuzzleUserContext = (user: User | null): WordPuzzleUserContext => {
    const userId = user?.id ?? null;
    const usernameFromMetadata = user?.user_metadata?.username;
    const username = typeof usernameFromMetadata === 'string' && usernameFromMetadata.trim()
        ? usernameFromMetadata.trim()
        : null;

    return {
        userId,
        username,
        isAuthenticated: Boolean(userId),
        storageScope: userId ? `${isGuestUser(user) ? 'local-guest' : 'supabase-user'}:${userId}` : 'anonymous-test',
    };
};

const persistWordPuzzleBootstrapContext = (context: WordPuzzleUserContext) => {
    try {
        window.sessionStorage.setItem(WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY, JSON.stringify(context));
    } catch {
        // Ignore bootstrap storage failures and allow anonymous fallback inside the iframe.
    }
};

const GamePlayer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const carKingSpeechControllerRef = useRef<CarKingNativeFirstSpeechController | null>(null);
    const zoomLockIframes = useMemo(() => [iframeRef], []);
    const [loadedLaunchPath, setLoadedLaunchPath] = useState<string | null>(null);
    const [wordPuzzleBootstrapStamp, setWordPuzzleBootstrapStamp] = useState<string | null>(null);
    const [staminaGateState, setStaminaGateState] = useState<StaminaGateStatus>({
        requestKey: null,
        status: 'checking',
    });
    const [staminaAttemptNonce, setStaminaAttemptNonce] = useState(0);
    const [staminaCountdownNowMs, setStaminaCountdownNowMs] = useState(() => Date.now());
    const { isGuest, user } = useAuth();
    const { resolvedItems } = useManagerConfig();
    const { totalPoints, stars, awardPoints } = usePoints();
    const { currentStamina, nextRechargeAtMs, consumeStamina } = useStamina();
    const { settings: soundSettings } = useSoundSettings();
    const { shouldUseNativeFullscreenFallback } = usePWA();
    const processedPointEventsRef = useRef<Set<string>>(new Set());
    const fullscreenAttemptAtRef = useRef(0);
    const [isRouteFullscreenActive, setIsRouteFullscreenActive] = useState(() => {
        if (typeof document === 'undefined') {
            return false;
        }

        return Boolean(getFullscreenElement(document));
    });

    useEffect(() => {
        syncIframeSoundSettings(iframeRef.current, soundSettings);
    }, [soundSettings]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const syncFullscreenState = () => {
            setIsRouteFullscreenActive(Boolean(getFullscreenElement(document)));
        };

        syncFullscreenState();
        document.addEventListener('fullscreenchange', syncFullscreenState);
        document.addEventListener('webkitfullscreenchange', syncFullscreenState);
        document.addEventListener('mozfullscreenchange', syncFullscreenState);
        document.addEventListener('MSFullscreenChange', syncFullscreenState);

        return () => {
            document.removeEventListener('fullscreenchange', syncFullscreenState);
            document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
            document.removeEventListener('mozfullscreenchange', syncFullscreenState);
            document.removeEventListener('MSFullscreenChange', syncFullscreenState);
        };
    }, []);

    const launchStateItem = useMemo(() => {
        const state = location.state as { launchItem?: ContentItem } | null;
        if (!state || typeof state !== 'object' || !state.launchItem) return null;
        return state.launchItem;
    }, [location.state]);

    const item = useMemo(() => {
        if (launchStateItem && launchStateItem.id === id) {
            return launchStateItem;
        }
        return resolvedItems.get(id ?? '') ?? findBaseModuleById(id);
    }, [id, launchStateItem, resolvedItems]);
    const launchPath = useMemo(() => {
        if (!item) return '';
        if (item.customHtmlPath) {
            const basePath = buildAssetPath(item.customHtmlPath);
            if (!import.meta.env.DEV) {
                return basePath;
            }
            const separator = basePath.includes('?') ? '&' : '?';
            return `${basePath}${separator}dev=${DEV_CACHE_BUST}`;
        }
        if (item.externalUrl) return item.externalUrl;
        return '';
    }, [item]);
    const currentGameId = item?.id ?? null;
    const gameHostPolicy = getGameHostPolicy(currentGameId ?? id);
    useZoomLock({ enabled: gameHostPolicy.lockZoom, iframeRefs: zoomLockIframes });
    const isGameItem = item?.type === 'game';
    const isCarKingGame = currentGameId === CAR_KING_GAME_ID;
    const isWordPuzzleGame = currentGameId === WORD_PUZZLE_GAME_ID;
    const isSinglePlayerPointsGame = item?.type === 'game' && isSinglePlayerPointsGameId(currentGameId);
    const carKingMicPreference = useMemo(() => getUserCarKingMicPreference(user), [user]);
    const wordPuzzleUserContext = useMemo(() => buildWordPuzzleUserContext(user), [user]);
    const pointsSessionId = useMemo(() => {
        return createGamePointsSessionId(currentGameId ?? id ?? 'game');
    }, [currentGameId, id]);
    const wordPuzzleBootstrapKey = useMemo(() => {
        return `${WORD_PUZZLE_GAME_ID}:${wordPuzzleUserContext.userId ?? 'anonymous'}`;
    }, [wordPuzzleUserContext.userId]);
    const staminaLaunchEventId = useMemo(() => {
        if (!isGameItem || !currentGameId) {
            return null;
        }

        const safeLocationKey = location.key && location.key !== 'default'
            ? location.key
            : `${location.pathname}:${currentGameId}`;
        return `launch:${currentGameId}:${safeLocationKey}`;
    }, [currentGameId, isGameItem, location.key, location.pathname]);
    const staminaLaunchRequestKey = useMemo(() => {
        if (!staminaLaunchEventId) {
            return null;
        }

        return `${staminaLaunchEventId}:${staminaAttemptNonce}`;
    }, [staminaAttemptNonce, staminaLaunchEventId]);
    const secondsUntilNextStamina = useMemo(() => {
        return getSecondsUntilNextRecharge(nextRechargeAtMs, staminaCountdownNowMs);
    }, [nextRechargeAtMs, staminaCountdownNowMs]);
    const nextStaminaCountdownLabel = useMemo(() => {
        const minutes = Math.floor(secondsUntilNextStamina / 60);
        const seconds = secondsUntilNextStamina % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }, [secondsUntilNextStamina]);

    // Only handle games and tools in fullscreen mode
    // Worksheets are handled by the Viewer with print preview mode
    const isImmersiveType = item?.type === 'game' || item?.type === 'tool';
    const requiresStaminaCharge = Boolean(item && launchPath && item.type === 'game' && staminaLaunchEventId);
    const isFrameLoading = loadedLaunchPath !== launchPath;
    const requiresRouteFullscreen = Boolean(
        gameHostPolicy.requiresNativeFullscreen
        && shouldUseNativeFullscreenFallback
        && isImmersiveType
        && launchPath,
    );
    const isIframeReady = !isWordPuzzleGame || wordPuzzleBootstrapStamp === wordPuzzleBootstrapKey;
    const effectiveStaminaGateState = requiresStaminaCharge
        ? (staminaGateState.requestKey === staminaLaunchRequestKey ? staminaGateState.status : 'checking')
        : 'allowed';
    const isGameLaunchAllowed = !isGameItem || effectiveStaminaGateState === 'allowed';
    const showLoadingOverlay = (isGameItem && effectiveStaminaGateState === 'checking') || (isGameLaunchAllowed && isFrameLoading);
    const showFullscreenGuard = requiresRouteFullscreen && !isRouteFullscreenActive;

    const postMessageToGame = useCallback((payload: object) => {
        const targetWindow = iframeRef.current?.contentWindow;
        if (!targetWindow) return;

        targetWindow.postMessage(payload, window.location.origin);
    }, []);

    useEffect(() => {
        if (!isCarKingGame) {
            const activeController = carKingSpeechControllerRef.current;
            carKingSpeechControllerRef.current = null;
            void activeController?.dispose();
            return;
        }

        const controller = new CarKingNativeFirstSpeechController((message) => {
            postMessageToGame(createCarKingSpeechEvent(message));
        });

        carKingSpeechControllerRef.current = controller;

        return () => {
            if (carKingSpeechControllerRef.current === controller) {
                carKingSpeechControllerRef.current = null;
            }
            void controller.dispose();
        };
    }, [isCarKingGame, postMessageToGame]);

    useEffect(() => {
        processedPointEventsRef.current.clear();
    }, [pointsSessionId]);

    useEffect(() => {
        const iframe = iframeRef.current;
        return () => {
            teardownIframeElementWhenDisconnected(iframe, { reason: 'game-player-unmount' });
            if (iframeRef.current === iframe) {
                iframeRef.current = null;
            }
        };
    }, [launchPath]);

    const syncCarKingMicPreference = useCallback(() => {
        if (!isCarKingGame) return;

        postMessageToGame({
            type: CAR_KING_MIC_PREF_SYNC,
            gameId: CAR_KING_GAME_ID,
            preference: carKingMicPreference,
            userId: user?.id ?? null,
        });
    }, [carKingMicPreference, isCarKingGame, postMessageToGame, user?.id]);

    useEffect(() => {
        syncCarKingMicPreference();
    }, [syncCarKingMicPreference]);

    const syncCarKingSpeechAvailability = useCallback(() => {
        if (!isCarKingGame) return;
        void carKingSpeechControllerRef.current?.syncAvailability();
    }, [isCarKingGame]);

    useEffect(() => {
        syncCarKingSpeechAvailability();
    }, [syncCarKingSpeechAvailability]);

    useEffect(() => {
        const nextBootstrapStamp = !isWordPuzzleGame ? WORD_PUZZLE_GAME_ID : wordPuzzleBootstrapKey;

        if (isWordPuzzleGame) {
            persistWordPuzzleBootstrapContext(wordPuzzleUserContext);
        }

        const frameId = window.requestAnimationFrame(() => {
            setWordPuzzleBootstrapStamp((currentStamp) => {
                return currentStamp === nextBootstrapStamp ? currentStamp : nextBootstrapStamp;
            });
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [isWordPuzzleGame, wordPuzzleBootstrapKey, wordPuzzleUserContext]);

    const syncWordPuzzleUserContext = useCallback(() => {
        if (!isWordPuzzleGame) return;

        postMessageToGame({
            type: WORD_PUZZLE_USER_CONTEXT_SYNC,
            gameId: WORD_PUZZLE_GAME_ID,
            ...wordPuzzleUserContext,
        });
    }, [isWordPuzzleGame, postMessageToGame, wordPuzzleUserContext]);

    useEffect(() => {
        syncWordPuzzleUserContext();
    }, [syncWordPuzzleUserContext]);

    const syncGamePointsContext = useCallback(() => {
        if (!isSinglePlayerPointsGame || !currentGameId) return;

        const message: GamePointsContextMessage = {
            type: GAME_POINTS_CONTEXT_MESSAGE,
            gameId: currentGameId,
            sessionId: pointsSessionId,
            totalPoints,
            stars,
            userId: user?.id ?? null,
            isAuthenticated: Boolean(user?.id),
        };

        postMessageToGame(message);
    }, [currentGameId, isSinglePlayerPointsGame, pointsSessionId, postMessageToGame, stars, totalPoints, user?.id]);

    useEffect(() => {
        syncGamePointsContext();
    }, [syncGamePointsContext]);

    useEffect(() => {
        if (!requiresStaminaCharge || !item || !staminaLaunchEventId || !staminaLaunchRequestKey) {
            return;
        }

        let cancelled = false;

        void consumeStamina({
            amount: GAME_STAMINA_COST,
            eventId: staminaLaunchEventId,
            reason: `launch:${item.id}`,
        }).then((result) => {
            if (cancelled) {
                return;
            }

            setStaminaGateState({
                requestKey: staminaLaunchRequestKey,
                status: result.accepted ? 'allowed' : 'blocked',
            });
        }).catch(() => {
            if (cancelled) {
                return;
            }

            setStaminaGateState({
                requestKey: staminaLaunchRequestKey,
                status: 'blocked',
            });
        });

        return () => {
            cancelled = true;
        };
    }, [consumeStamina, item, requiresStaminaCharge, staminaLaunchEventId, staminaLaunchRequestKey]);

    useEffect(() => {
        if (staminaGateState.status !== 'blocked') {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setStaminaCountdownNowMs(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [staminaGateState.status]);

    useEffect(() => {
        const handleGameMessage = (event: MessageEvent) => {
            if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
                return;
            }

            const message = event.data as {
                type?: unknown;
                preference?: unknown;
                gameId?: unknown;
                tab?: unknown;
                request?: unknown;
                sessionId?: unknown;
                eventId?: unknown;
                points?: unknown;
                occurredAt?: unknown;
                label?: unknown;
                meta?: unknown;
            } | null;

            if (isCarKingGame && isCarKingSpeechControlMessage(message)) {
                const controller = carKingSpeechControllerRef.current;
                if (!controller) {
                    return;
                }

                if (message.type !== CAR_KING_SPEECH_CONTROL) {
                    return;
                }

                switch (message.command) {
                    case 'prewarm':
                        void controller.prewarm(message.options);
                        return;
                    case 'start':
                        void controller.start(message.options);
                        return;
                    case 'stop':
                        void controller.stop();
                        return;
                    case 'abort':
                        void controller.abort(message.options);
                        return;
                    default:
                        return;
                }
            }

            if (
                isSinglePlayerPointsGame &&
                currentGameId &&
                message &&
                message.type === GAME_POINTS_CONTEXT_MESSAGE &&
                (!message.gameId || message.gameId === currentGameId) &&
                Boolean(message.request)
            ) {
                syncGamePointsContext();
                return;
            }

            if (isSinglePlayerPointsGame && currentGameId && message && message.type === GAME_POINTS_EARNED_MESSAGE) {
                const messageGameId = typeof message.gameId === 'string' && message.gameId.trim()
                    ? message.gameId.trim()
                    : currentGameId;
                if (messageGameId !== currentGameId) {
                    return;
                }

                const messageSessionId = typeof message.sessionId === 'string' && message.sessionId.trim()
                    ? message.sessionId.trim()
                    : pointsSessionId;
                if (messageSessionId !== pointsSessionId) {
                    return;
                }

                const messageEventId = typeof message.eventId === 'string' && message.eventId.trim()
                    ? message.eventId.trim()
                    : '';
                const messagePoints = sanitizePointValue(message.points);
                if (!messageEventId || messagePoints <= 0) {
                    return;
                }

                const pointEventKey = getPointEventKey(messageGameId, messageSessionId, messageEventId);
                const postPointsAck = (accepted: boolean, nextTotalPoints: number, nextStars: number) => {
                    const ackMessage: GamePointsAckMessage = {
                        type: GAME_POINTS_ACK_MESSAGE,
                        gameId: messageGameId,
                        sessionId: messageSessionId,
                        eventId: messageEventId,
                        accepted,
                        totalPoints: nextTotalPoints,
                        stars: nextStars,
                    };

                    postMessageToGame(ackMessage);
                };

                if (processedPointEventsRef.current.has(pointEventKey)) {
                    postPointsAck(false, totalPoints, stars);
                    return;
                }

                processedPointEventsRef.current.add(pointEventKey);

                void awardPoints({
                    gameId: messageGameId,
                    sessionId: messageSessionId,
                    eventId: messageEventId,
                    points: messagePoints,
                    occurredAt: typeof message.occurredAt === 'string' ? message.occurredAt : undefined,
                    label: typeof message.label === 'string' ? message.label : null,
                    meta: typeof message.meta === 'object' && message.meta ? message.meta as Record<string, unknown> : undefined,
                }).then((result) => {
                    postPointsAck(result.accepted, result.totalPoints, result.stars);
                    syncGamePointsContext();
                }).catch(() => {
                    processedPointEventsRef.current.delete(pointEventKey);
                    postPointsAck(false, totalPoints, stars);
                });

                return;
            }

            if (!message || message.type !== GAME_EXIT_TO_HOME_MESSAGE) {
                if (
                    isWordPuzzleGame &&
                    message &&
                    message.type === WORD_PUZZLE_USER_CONTEXT_REQUEST &&
                    (!message.gameId || message.gameId === WORD_PUZZLE_GAME_ID)
                ) {
                    syncWordPuzzleUserContext();
                    return;
                }

                if (!isCarKingGame || !message || typeof message.type !== 'string') {
                    return;
                }

                if (message.gameId && message.gameId !== CAR_KING_GAME_ID) {
                    return;
                }

                if (message.type === CAR_KING_MIC_PREF_REQUEST) {
                    syncCarKingMicPreference();
                    return;
                }

                if (message.type !== CAR_KING_MIC_PREF_SAVE) {
                    return;
                }

                const requestedPreference = isCarKingMicPreference(message.preference)
                    ? message.preference
                    : 'ask';
                const remotePreference: CarKingMicPreference = requestedPreference === 'always' ? 'always' : 'ask';

                writeLocalCarKingMicPreference(user?.id, remotePreference);

                const postSaveResult = (success: boolean, persisted: 'local' | 'supabase', error?: string) => {
                    postMessageToGame({
                        type: CAR_KING_MIC_PREF_SAVE_RESULT,
                        gameId: CAR_KING_GAME_ID,
                        success,
                        persisted,
                        preference: remotePreference,
                        requestedPreference,
                        ...(error ? { error } : {}),
                    });
                };

                if (!supabase || !user || isGuest) {
                    postSaveResult(true, 'local');
                    return;
                }

                const nextMetadata = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
                if (remotePreference === 'always') {
                    nextMetadata.car_king_mic_preference = 'always';
                } else {
                    delete nextMetadata.car_king_mic_preference;
                }

                supabase.auth.updateUser({ data: nextMetadata })
                    .then(({ error }) => {
                        if (error) {
                            postSaveResult(
                                true,
                                'local',
                                'Saved locally for testing. Supabase update can be finalized later.',
                            );
                            return;
                        }

                        postSaveResult(true, 'supabase');
                    })
                    .catch(() => {
                        postSaveResult(
                            true,
                            'local',
                            'Saved locally for testing. Supabase update can be finalized later.',
                        );
                    });

                return;
            }

            const requestedArea = resolveAreaFromRequest(message.tab);
            const targetPath = resolveAreaRoute(requestedArea ?? 'home');

            teardownIframeElement(iframeRef.current, { reason: 'game-exit-message' });
            navigate(targetPath);
        };

        window.addEventListener('message', handleGameMessage);
        return () => window.removeEventListener('message', handleGameMessage);
    }, [awardPoints, currentGameId, isCarKingGame, isGuest, isSinglePlayerPointsGame, isWordPuzzleGame, navigate, pointsSessionId, postMessageToGame, stars, syncCarKingMicPreference, syncGamePointsContext, syncWordPuzzleUserContext, totalPoints, user]);

    const attemptGameFullscreen = useCallback(async (force = false): Promise<boolean> => {
        if (!requiresRouteFullscreen || typeof document === 'undefined') {
            return false;
        }

        if (getFullscreenElement(document)) {
            setIsRouteFullscreenActive(true);
            return true;
        }

        const now = Date.now();
        if (!force && (now - fullscreenAttemptAtRef.current) < GAME_FULLSCREEN_RETRY_THROTTLE_MS) {
            return false;
        }

        fullscreenAttemptAtRef.current = now;
        const didEnterFullscreen = await requestElementFullscreen(document.documentElement);
        setIsRouteFullscreenActive(Boolean(getFullscreenElement(document)));
        return didEnterFullscreen;
    }, [requiresRouteFullscreen]);

    useEffect(() => {
        if (!requiresRouteFullscreen) {
            return undefined;
        }

        const timeoutIds = GAME_FULLSCREEN_RETRY_DELAYS_MS.map((delayMs) => window.setTimeout(() => {
            void attemptGameFullscreen();
        }, delayMs));

        return () => {
            timeoutIds.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
        };
    }, [attemptGameFullscreen, launchPath, requiresRouteFullscreen]);

    useEffect(() => {
        if (!requiresRouteFullscreen || typeof document === 'undefined') {
            return undefined;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void attemptGameFullscreen();
            }
        };

        const handleWindowFocus = () => {
            void attemptGameFullscreen();
        };

        const handlePageShow = () => {
            void attemptGameFullscreen();
        };

        const handleDocumentInteraction = (event: Event) => {
            if (event instanceof KeyboardEvent && event.key === 'Escape') {
                return;
            }

            void attemptGameFullscreen();
        };

        window.addEventListener('focus', handleWindowFocus, true);
        window.addEventListener('pageshow', handlePageShow, true);
        document.addEventListener('visibilitychange', handleVisibilityChange, true);
        document.addEventListener('pointerdown', handleDocumentInteraction, true);
        document.addEventListener('touchstart', handleDocumentInteraction, true);
        document.addEventListener('mousedown', handleDocumentInteraction, true);
        document.addEventListener('keydown', handleDocumentInteraction, true);

        return () => {
            window.removeEventListener('focus', handleWindowFocus, true);
            window.removeEventListener('pageshow', handlePageShow, true);
            document.removeEventListener('visibilitychange', handleVisibilityChange, true);
            document.removeEventListener('pointerdown', handleDocumentInteraction, true);
            document.removeEventListener('touchstart', handleDocumentInteraction, true);
            document.removeEventListener('mousedown', handleDocumentInteraction, true);
            document.removeEventListener('keydown', handleDocumentInteraction, true);
        };
    }, [attemptGameFullscreen, requiresRouteFullscreen]);

    useEffect(() => {
        if (!item || !isImmersiveType || !launchPath) {
            navigate(item ? `/resource/${item.id}` : '/', { replace: true });
        }
    }, [item, isImmersiveType, launchPath, navigate]);

    if (!item || !isImmersiveType || !launchPath) {
        return null;
    }

    return (
        <div className="game-player-shell" ref={containerRef}>
            {showLoadingOverlay ? (
                <div className="game-player-loading" aria-live="polite">
                    {isGameItem && effectiveStaminaGateState === 'checking'
                        ? `Preparing ${item.title}...`
                        : `Launching ${item.type}...`}
                </div>
            ) : null}

            {isGameItem && effectiveStaminaGateState === 'blocked' ? (
                <section className="game-player-stamina-gate" aria-live="polite">
                    <div className="game-player-stamina-gate__card">
                        <p className="game-player-stamina-gate__eyebrow">Not Enough Stamina</p>
                        <h1 className="game-player-stamina-gate__title">{item.title} needs 1 stamina to start.</h1>
                        <p className="game-player-stamina-gate__body">
                            You currently have {currentStamina}/20 stamina. One point recharges every 10 minutes.
                        </p>
                        <p className="game-player-stamina-gate__countdown">
                            {nextRechargeAtMs
                                ? `Next stamina in ${nextStaminaCountdownLabel}`
                                : 'Stamina is recharging.'}
                        </p>
                        <div className="game-player-stamina-gate__actions">
                            <button
                                type="button"
                                className="game-player-stamina-gate__btn game-player-stamina-gate__btn--primary"
                                onClick={() => {
                                    setStaminaAttemptNonce((current) => current + 1);
                                }}
                                disabled={currentStamina < GAME_STAMINA_COST}
                            >
                                Start Game
                            </button>
                            <button
                                type="button"
                                className="game-player-stamina-gate__btn"
                                onClick={() => navigate('/apps')}
                            >
                                Back To Games
                            </button>
                        </div>
                    </div>
                </section>
            ) : null}

            {showFullscreenGuard ? (
                <section className="game-player-fullscreen-guard" aria-live="polite">
                    <div className="game-player-fullscreen-guard__card">
                        <p className="game-player-fullscreen-guard__eyebrow">Full Screen Required</p>
                        <h1 className="game-player-fullscreen-guard__title">Opening {item.title} in full screen.</h1>
                        <p className="game-player-fullscreen-guard__body">
                            Keep this launch immersive and out of the browser frame. Tap below if the browser needs a fresh fullscreen confirmation.
                        </p>
                        <div className="game-player-fullscreen-guard__actions">
                            <button
                                type="button"
                                className="game-player-fullscreen-guard__btn game-player-fullscreen-guard__btn--primary"
                                onClick={() => {
                                    void attemptGameFullscreen(true);
                                }}
                            >
                                Continue Full Screen
                            </button>
                            <button
                                type="button"
                                className="game-player-fullscreen-guard__btn"
                                onClick={() => navigate('/apps')}
                            >
                                Back To Apps
                            </button>
                        </div>
                    </div>
                </section>
            ) : null}

            {isIframeReady && isGameLaunchAllowed && (
                <iframe
                    ref={iframeRef}
                    src={launchPath}
                    title={item.title}
                    className={`game-player-frame ${isFrameLoading ? 'is-loading' : ''}`}
                    allow={gameHostPolicy.iframeAllow}
                    allowFullScreen={gameHostPolicy.allowFullScreen}
                    sandbox={gameHostPolicy.iframeSandbox}
                    onLoad={() => {
                        setLoadedLaunchPath(launchPath);
                        resumeIframeRuntime(iframeRef.current, {
                            reason: 'game-load',
                            soundSettings,
                        });
                        syncCarKingMicPreference();
                        syncCarKingSpeechAvailability();
                        syncWordPuzzleUserContext();
                        syncGamePointsContext();
                        window.setTimeout(() => {
                            attemptGameFullscreen(true).catch(() => {
                                // noop
                            });
                        }, 160);
                    }}
                />
            )}
        </div>
    );
};

export default GamePlayer;
