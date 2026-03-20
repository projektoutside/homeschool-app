import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useZoomLock } from '../hooks/useZoomLock';
import { supabase } from '../lib/supabase';
import { buildAssetPath } from '../utils/pathUtils';
import { getUsername, isManagerUser } from '../utils/managerAccess';
import { postIframeLifecyclePhase, teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import './Home.css';
import './ClassroomPage.css';

const CLASSROOM_APP_VERSION = '2026-03-10-1';
const CLASSROOM_SYNC_SCOPE = 'classroom-3d';
const CLASSROOM_GLOBAL_STATE_TABLE = 'classroom_global_states';
const CLASSROOM_GLOBAL_STATE_APP_ID = '3dClass';
const CLASSROOM_MESSAGE_AUTH_SYNC = 'LAHS_CLASSROOM_AUTH_SYNC';
const CLASSROOM_MESSAGE_AUTH_REQUEST = 'LAHS_CLASSROOM_AUTH_REQUEST';
const CLASSROOM_MESSAGE_READY = 'LAHS_CLASSROOM_READY';
const CLASSROOM_MESSAGE_STATE_REQUEST = 'LAHS_CLASSROOM_STATE_REQUEST';
const CLASSROOM_MESSAGE_STATE_SYNC = 'LAHS_CLASSROOM_STATE_SYNC';
const CLASSROOM_MESSAGE_STATE_SAVE = 'LAHS_CLASSROOM_STATE_SAVE';
const CLASSROOM_MESSAGE_NAVIGATE = 'LAHS_CLASSROOM_NAVIGATE';
const CLASSROOM_SAVE_DEBOUNCE_MS = 420;
const CLASSROOM_DOOR_INTRO_SCOPE = 'classroom-main';
const CLASSROOM_DOOR_INTRO_DONE = 'LAHS_CLASSROOM_DOOR_INTRO_DONE';
const CLASSROOM_DOOR_INTRO_FALLBACK_MS = 2200;

type ClassroomLayoutEntry = {
    left: number;
    top: number;
    width: number;
};

type ClassroomPersistedState = {
    layout: Record<string, ClassroomLayoutEntry>;
    locked: boolean;
    componentFiles: string[];
};

type IncomingIframeMessage = {
    scope?: unknown;
    type?: unknown;
    payload?: unknown;
};

type IncomingSavePayload = {
    state?: unknown;
};

interface ClassroomPageProps {
    isActive?: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const parseBooleanQuery = (value: string | null): boolean => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const sanitizeClassroomState = (rawState: unknown): ClassroomPersistedState | null => {
    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
        return null;
    }

    const rawRecord = rawState as Record<string, unknown>;
    const rawLayout = rawRecord.layout;
    const rawComponentFiles = rawRecord.componentFiles;
    const rawLocked = rawRecord.locked;

    if (!rawLayout || typeof rawLayout !== 'object' || Array.isArray(rawLayout)) {
        return null;
    }

    const layout: Record<string, ClassroomLayoutEntry> = {};
    Object.entries(rawLayout as Record<string, unknown>).forEach(([key, value]) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return;
        }

        const entry = value as Record<string, unknown>;
        const left = Number(entry.left);
        const top = Number(entry.top);
        const width = Number(entry.width);

        if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width)) {
            return;
        }

        layout[key] = {
            left: clamp(left, 0, 95),
            top: clamp(top, 0, 95),
            width: clamp(width, 6, 60),
        };
    });

    const componentFiles = Array.isArray(rawComponentFiles)
        ? rawComponentFiles
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [];

    return {
        layout,
        locked: typeof rawLocked === 'boolean' ? rawLocked : true,
        componentFiles,
    };
};

const ClassroomPage: React.FC<ClassroomPageProps> = ({ isActive = true }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [loadedLaunchPath, setLoadedLaunchPath] = useState<string | null>(null);
    const [completedDoorIntroKey, setCompletedDoorIntroKey] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const introFrameRef = useRef<HTMLIFrameElement | null>(null);
    const zoomLockIframes = useMemo(() => [iframeRef, introFrameRef], []);
    const pendingStateRef = useRef<ClassroomPersistedState | null>(null);
    const pendingSaveTimerRef = useRef<number | null>(null);
    const introFallbackTimerRef = useRef<number | null>(null);
    const lastPersistedSignatureRef = useRef<string>('');
    const hasManagerAccess = useMemo(() => isManagerUser(user), [user]);
    const managerRequested = useMemo(() => {
        if (!isActive) {
            return false;
        }
        const params = new URLSearchParams(location.search);
        return parseBooleanQuery(params.get('manager')) || parseBooleanQuery(params.get('manager_ui'));
    }, [isActive, location.search]);
    const launchPath = useMemo(
        () => {
            const params = new URLSearchParams();
            params.set('v', CLASSROOM_APP_VERSION);
            params.set('intro', '0');
            if (hasManagerAccess && managerRequested) {
                params.set('manager', '1');
                params.set('manager_ui', '1');
            }
            return buildAssetPath(`3dClass/index.html?${params.toString()}`);
        },
        [hasManagerAccess, managerRequested],
    );
    const doorIntroPath = useMemo(() => {
        const params = new URLSearchParams();
        params.set('v', CLASSROOM_APP_VERSION);
        return buildAssetPath(`3dClass/door-intro.html?${params.toString()}`);
    }, []);
    const shouldPlayDoorIntro = useMemo(() => {
        if (!isActive) {
            return false;
        }
        return !(hasManagerAccess && managerRequested);
    }, [hasManagerAccess, isActive, managerRequested]);
    const introActivationKey = useMemo(() => {
        if (!isActive || !shouldPlayDoorIntro) {
            return null;
        }
        return `${launchPath}|${location.key}`;
    }, [isActive, launchPath, location.key, shouldPlayDoorIntro]);
    const isFrameLoaded = loadedLaunchPath === launchPath;
    const isDoorIntroComplete = !introActivationKey || completedDoorIntroKey === introActivationKey;
    const isTransitionComplete = isFrameLoaded && isDoorIntroComplete;

    useZoomLock({ enabled: isActive, iframeRefs: zoomLockIframes });

    useEffect(() => {
        if (!isActive) {
            return;
        }
        if (managerRequested && !hasManagerAccess) {
            navigate('/classroom', { replace: true });
        }
    }, [hasManagerAccess, isActive, managerRequested, navigate]);

    const postMessageToClassroom = useCallback((type: string, payload: Record<string, unknown> = {}) => {
        const targetWindow = iframeRef.current?.contentWindow;
        if (!targetWindow) return;

        targetWindow.postMessage(
            {
                scope: CLASSROOM_SYNC_SCOPE,
                type,
                payload,
            },
            window.location.origin,
        );
    }, []);

    const syncAuthToClassroom = useCallback(() => {
        postMessageToClassroom(CLASSROOM_MESSAGE_AUTH_SYNC, {
            userId: user?.id ?? null,
            username: getUsername(user),
            isAuthenticated: Boolean(user),
            isSupabaseEnabled: Boolean(supabase),
            isManager: hasManagerAccess,
            managerRequested,
        });
    }, [hasManagerAccess, managerRequested, postMessageToClassroom, user]);

    const loadRemoteState = useCallback(async (): Promise<{
        state: ClassroomPersistedState;
        updatedAt: string | null;
        username: string | null;
    } | null> => {
        if (!supabase || !user) {
            return null;
        }

        const { data, error } = await supabase
            .from(CLASSROOM_GLOBAL_STATE_TABLE)
            .select('state, updated_at, updated_by_username')
            .eq('app_id', CLASSROOM_GLOBAL_STATE_APP_ID)
            .maybeSingle();

        if (error) {
            console.error('[ClassroomPage] Failed to load classroom state:', error.message);
            return null;
        }

        const row = data as { state?: unknown; updated_at?: string | null; updated_by_username?: string | null } | null;
        const sanitizedState = sanitizeClassroomState(row?.state);
        if (!sanitizedState) {
            return null;
        }

        return {
            state: sanitizedState,
            updatedAt: row?.updated_at ?? null,
            username: row?.updated_by_username ?? null,
        };
    }, [user]);

    const postStateToClassroom = useCallback(
        (state: ClassroomPersistedState, updatedAt: string | null, source: string) => {
            postMessageToClassroom(CLASSROOM_MESSAGE_STATE_SYNC, {
                state,
                updatedAt,
                username: getUsername(user),
                source,
            });
        },
        [postMessageToClassroom, user],
    );

    const syncLatestStateToClassroom = useCallback(
        async (source: string) => {
            const loadedState = await loadRemoteState();
            if (!loadedState) {
                return;
            }

            lastPersistedSignatureRef.current = JSON.stringify(loadedState.state);
            postStateToClassroom(loadedState.state, loadedState.updatedAt, source);
        },
        [loadRemoteState, postStateToClassroom],
    );

    const persistStateToSupabase = useCallback(
        async (state: ClassroomPersistedState) => {
            if (!supabase || !user || !hasManagerAccess) {
                return;
            }

            const updatedAt = new Date().toISOString();
            const { error } = await supabase
                .from(CLASSROOM_GLOBAL_STATE_TABLE)
                .upsert(
                    {
                        app_id: CLASSROOM_GLOBAL_STATE_APP_ID,
                        updated_by_user_id: user.id,
                        updated_by_username: getUsername(user),
                        state,
                        updated_at: updatedAt,
                    },
                    {
                        onConflict: 'app_id',
                    },
                );

            if (error) {
                console.error('[ClassroomPage] Failed to save classroom state:', error.message);
                return;
            }

            lastPersistedSignatureRef.current = JSON.stringify(state);
        },
        [hasManagerAccess, user],
    );

    const queueStateSave = useCallback(
        (state: ClassroomPersistedState) => {
            if (!hasManagerAccess) {
                return;
            }
            pendingStateRef.current = state;
            if (pendingSaveTimerRef.current !== null) {
                window.clearTimeout(pendingSaveTimerRef.current);
            }

            pendingSaveTimerRef.current = window.setTimeout(() => {
                pendingSaveTimerRef.current = null;
                const nextState = pendingStateRef.current;
                if (!nextState) {
                    return;
                }

                const nextSignature = JSON.stringify(nextState);
                if (nextSignature === lastPersistedSignatureRef.current) {
                    return;
                }

                void persistStateToSupabase(nextState);
            }, CLASSROOM_SAVE_DEBOUNCE_MS);
        },
        [hasManagerAccess, persistStateToSupabase],
    );

    const handleClassroomMessage = useCallback(
        (event: MessageEvent<unknown>) => {
            if (event.origin !== window.location.origin) {
                return;
            }

            if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
                return;
            }

            const message = event.data as IncomingIframeMessage;
            if (!message || message.scope !== CLASSROOM_SYNC_SCOPE || typeof message.type !== 'string') {
                return;
            }

            switch (message.type) {
                case CLASSROOM_MESSAGE_AUTH_REQUEST:
                case CLASSROOM_MESSAGE_READY: {
                    syncAuthToClassroom();
                    break;
                }
                case CLASSROOM_MESSAGE_STATE_REQUEST: {
                    syncAuthToClassroom();
                    void syncLatestStateToClassroom('request');
                    break;
                }
                case CLASSROOM_MESSAGE_STATE_SAVE: {
                    if (!hasManagerAccess) {
                        return;
                    }
                    const payload = (message.payload ?? {}) as IncomingSavePayload;
                    const sanitizedState = sanitizeClassroomState(payload.state);
                    if (!sanitizedState) {
                        return;
                    }

                    queueStateSave(sanitizedState);
                    break;
                }
                case CLASSROOM_MESSAGE_NAVIGATE: {
                    const payload = (message.payload ?? {}) as Record<string, unknown>;
                    const requestedPath = typeof payload.path === 'string' ? payload.path.trim() : '';
                    // Only allow in-app navigation targets initiated by the classroom iframe.
                    const isAllowedTarget = requestedPath === '/html-viewer' || requestedPath.startsWith('/html-viewer?');
                    if (!isAllowedTarget) {
                        return;
                    }
                    navigate(requestedPath);
                    break;
                }
                default:
                    break;
            }
        },
        [hasManagerAccess, navigate, queueStateSave, syncAuthToClassroom, syncLatestStateToClassroom],
    );

    useEffect(() => {
        window.addEventListener('message', handleClassroomMessage);
        return () => window.removeEventListener('message', handleClassroomMessage);
    }, [handleClassroomMessage]);

    const handleDoorIntroMessage = useCallback((event: MessageEvent<unknown>) => {
        if (event.origin !== window.location.origin) {
            return;
        }

        if (!introFrameRef.current?.contentWindow || event.source !== introFrameRef.current.contentWindow) {
            return;
        }

        const message = event.data as IncomingIframeMessage;
        if (!message || message.scope !== CLASSROOM_DOOR_INTRO_SCOPE || message.type !== CLASSROOM_DOOR_INTRO_DONE) {
            return;
        }

        if (introFallbackTimerRef.current !== null) {
            window.clearTimeout(introFallbackTimerRef.current);
            introFallbackTimerRef.current = null;
        }
        if (!introActivationKey) {
            return;
        }
        setCompletedDoorIntroKey(introActivationKey);
    }, [introActivationKey]);

    useEffect(() => {
        window.addEventListener('message', handleDoorIntroMessage);
        return () => window.removeEventListener('message', handleDoorIntroMessage);
    }, [handleDoorIntroMessage]);

    useEffect(() => {
        if (!supabase || !user) {
            return;
        }

        const supabaseClient = supabase;

        const channel = supabaseClient
            .channel(`classroom-state-${CLASSROOM_GLOBAL_STATE_APP_ID}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: CLASSROOM_GLOBAL_STATE_TABLE,
                    filter: `app_id=eq.${CLASSROOM_GLOBAL_STATE_APP_ID}`,
                },
                (payload) => {
                    const row = (payload.new as Record<string, unknown> | null) ?? null;
                    const nextState = sanitizeClassroomState(row?.state);
                    if (!nextState) {
                        return;
                    }

                    lastPersistedSignatureRef.current = JSON.stringify(nextState);
                    const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : null;
                    postStateToClassroom(nextState, updatedAt, 'realtime');
                },
            )
            .subscribe();

        return () => {
            void supabaseClient.removeChannel(channel);
        };
    }, [postStateToClassroom, user]);

    useEffect(() => {
        syncAuthToClassroom();
        if (user) {
            void syncLatestStateToClassroom('auth-change');
        }
    }, [syncAuthToClassroom, syncLatestStateToClassroom, user]);

    const handleFrameLoad = useCallback(() => {
        setLoadedLaunchPath(launchPath);
        postIframeLifecyclePhase(iframeRef.current, 'resume', { reason: 'classroom-load' });
        syncAuthToClassroom();
        void syncLatestStateToClassroom('frame-load');
    }, [launchPath, syncAuthToClassroom, syncLatestStateToClassroom]);

    useEffect(() => {
        postIframeLifecyclePhase(iframeRef.current, isActive ? 'resume' : 'pause', {
            reason: isActive ? 'classroom-active' : 'classroom-inactive',
        });
    }, [isActive, isFrameLoaded, launchPath]);

    useEffect(() => {
        if (introFallbackTimerRef.current !== null) {
            window.clearTimeout(introFallbackTimerRef.current);
            introFallbackTimerRef.current = null;
        }

        if (!introActivationKey || isDoorIntroComplete) {
            return;
        }

        introFallbackTimerRef.current = window.setTimeout(() => {
            introFallbackTimerRef.current = null;
            setCompletedDoorIntroKey(introActivationKey);
        }, CLASSROOM_DOOR_INTRO_FALLBACK_MS);

        return () => {
            if (introFallbackTimerRef.current !== null) {
                window.clearTimeout(introFallbackTimerRef.current);
                introFallbackTimerRef.current = null;
            }
        };
    }, [introActivationKey, isDoorIntroComplete]);

    useEffect(() => () => {
        if (pendingSaveTimerRef.current !== null) {
            window.clearTimeout(pendingSaveTimerRef.current);
        }
        if (introFallbackTimerRef.current !== null) {
            window.clearTimeout(introFallbackTimerRef.current);
        }
        teardownIframeElementWhenDisconnected(iframeRef.current, { reason: 'classroom-host-unmount' });
        teardownIframeElementWhenDisconnected(introFrameRef.current, { reason: 'classroom-intro-unmount' });
        iframeRef.current = null;
        introFrameRef.current = null;
    }, []);

    return (
        <div className="os-desktop-shell classroom-app-page">
            <section className="os-icon-area classroom-app-area" aria-label="Classroom app">
                <div className="classroom-app-shell">
                    <iframe
                        key={launchPath}
                        ref={iframeRef}
                        src={launchPath}
                        title="Classroom App"
                        className={`classroom-app-frame ${isFrameLoaded ? '' : 'is-loading'}`}
                        allow="fullscreen; autoplay; microphone; camera"
                        allowFullScreen
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                        onLoad={handleFrameLoad}
                    />
                    {!isTransitionComplete ? (
                        <div className="classroom-door-intro-layer" aria-hidden={false}>
                            {!isDoorIntroComplete ? (
                                <iframe
                                    key={introActivationKey ?? 'inactive'}
                                    ref={introFrameRef}
                                    src={doorIntroPath}
                                    title="Classroom Door Intro"
                                    className="classroom-door-intro-frame"
                                    sandbox="allow-same-origin allow-scripts"
                                />
                            ) : null}
                            {isDoorIntroComplete && !isFrameLoaded ? (
                                <div className="classroom-app-loading classroom-app-loading-overlay" aria-live="polite">
                                    Loading classroom...
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
};

export default ClassroomPage;
