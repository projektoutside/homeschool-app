import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentItem } from '../types/content';
import type { FullscreenHTMLElementType } from '../types/fullscreen';
import { useAuth } from '../context/AuthContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { supabase } from '../lib/supabase';
import { applySoundSettingsToWindow } from '../utils/soundSettings';
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

type CarKingMicPreference = 'ask' | 'session' | 'always';
type WordPuzzleUserContext = {
    userId: string | null;
    username: string | null;
    isAuthenticated: boolean;
    storageScope: string;
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
        storageScope: userId ? `supabase-user:${userId}` : 'anonymous-test',
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
    const [isLoading, setIsLoading] = useState(true);
    const [wordPuzzleBootstrapStamp, setWordPuzzleBootstrapStamp] = useState<string | null>(null);
    const { user } = useAuth();
    const { settings: soundSettings } = useSoundSettings();

    useEffect(() => {
        applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
    }, [soundSettings]);

    const launchStateItem = useMemo(() => {
        const state = location.state as { launchItem?: ContentItem } | null;
        if (!state || typeof state !== 'object' || !state.launchItem) return null;
        return state.launchItem;
    }, [location.state]);

    const item = useMemo(() => {
        if (launchStateItem && launchStateItem.id === id) {
            return launchStateItem;
        }
        return CONTENT_ITEMS.find(content => content.id === id);
    }, [id, launchStateItem]);
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
    const isCarKingGame = item?.id === CAR_KING_GAME_ID;
    const isWordPuzzleGame = item?.id === WORD_PUZZLE_GAME_ID;
    const carKingMicPreference = useMemo(() => getUserCarKingMicPreference(user), [user]);
    const wordPuzzleUserContext = useMemo(() => buildWordPuzzleUserContext(user), [user]);
    const wordPuzzleBootstrapKey = useMemo(() => {
        return `${WORD_PUZZLE_GAME_ID}:${wordPuzzleUserContext.userId ?? 'anonymous'}`;
    }, [wordPuzzleUserContext.userId]);

    // Only handle games and tools in fullscreen mode
    // Worksheets are handled by the Viewer with print preview mode
    const isImmersiveType = item?.type === 'game' || item?.type === 'tool';

    const postMessageToGame = useCallback((payload: Record<string, unknown>) => {
        const targetWindow = iframeRef.current?.contentWindow;
        if (!targetWindow) return;

        targetWindow.postMessage(payload, window.location.origin);
    }, []);

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

    useEffect(() => {
        if (!isWordPuzzleGame) {
            setWordPuzzleBootstrapStamp(WORD_PUZZLE_GAME_ID);
            return;
        }

        persistWordPuzzleBootstrapContext(wordPuzzleUserContext);
        setWordPuzzleBootstrapStamp(wordPuzzleBootstrapKey);
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

    useEffect(() => {
        const handleGameMessage = (event: MessageEvent) => {
            if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
                return;
            }

            const message = event.data as {
                type?: unknown;
                preference?: unknown;
                gameId?: unknown;
            } | null;
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

                if (!supabase || !user) {
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

            navigate('/home-profile');
        };

        window.addEventListener('message', handleGameMessage);
        return () => window.removeEventListener('message', handleGameMessage);
    }, [isCarKingGame, isWordPuzzleGame, navigate, postMessageToGame, syncCarKingMicPreference, syncWordPuzzleUserContext, user]);

    const enterFullscreen = useCallback(async () => {
        const element = document.documentElement as FullscreenHTMLElementType;
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
        } catch {
            // Browser may block auto fullscreen without user gesture.
        }
    }, []);

    useEffect(() => {
        if (!item || !isImmersiveType || !launchPath) {
            navigate(item ? `/resource/${item.id}` : '/', { replace: true });
        }
    }, [item, isImmersiveType, launchPath, navigate]);

    if (!item || !isImmersiveType || !launchPath) {
        return null;
    }

    const isIframeReady = !isWordPuzzleGame || wordPuzzleBootstrapStamp === wordPuzzleBootstrapKey;

    return (
        <div className="game-player-shell" ref={containerRef}>
            {isLoading && <div className="game-player-loading" aria-live="polite">Launching {item.type}...</div>}

            {isIframeReady && (
                <iframe
                    ref={iframeRef}
                    src={launchPath}
                    title={item.title}
                    className={`game-player-frame ${isLoading ? 'is-loading' : ''}`}
                    allow="fullscreen; camera; microphone; geolocation"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                    onLoad={() => {
                        setIsLoading(false);
                        applySoundSettingsToWindow(iframeRef.current?.contentWindow, soundSettings);
                        syncCarKingMicPreference();
                        syncWordPuzzleUserContext();
                        setTimeout(() => {
                            enterFullscreen().catch(() => {
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
