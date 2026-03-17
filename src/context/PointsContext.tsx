import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  type PointsAwardInput,
  type PointsAwardResult,
  RESERVED_STARS_TOTAL,
  getPointEventKey,
  normalizeStoredPointTotal,
  sanitizePointDeltaValue,
  sanitizePointValue,
} from '../utils/gamePoints';

const USER_POINTS_TOTALS_TABLE = 'user_points_totals';
const APPLY_GAME_POINTS_RPC = 'apply_game_points_event';
const POINTS_CACHE_VERSION = 1;

interface PendingPointEvent {
  gameId: string;
  sessionId: string;
  eventId: string;
  points: number;
  occurredAt: string;
  label: string | null;
  meta: Record<string, unknown>;
}

interface CachedPointsState {
  version: number;
  serverTotalPoints: number;
  pendingEvents: PendingPointEvent[];
}

interface PointsContextValue {
  totalPoints: number;
  stars: number;
  loading: boolean;
  awardPoints: (input: PointsAwardInput) => Promise<PointsAwardResult>;
  spendPoints: (input: PointsAwardInput) => Promise<PointsAwardResult>;
}

const PointsContext = createContext<PointsContextValue | undefined>(undefined);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const sanitizeMeta = (value: unknown): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const sanitizeOccurredAt = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date().toISOString();
  }

  const parsedAt = Date.parse(value);
  return Number.isNaN(parsedAt) ? new Date().toISOString() : new Date(parsedAt).toISOString();
};

const sanitizePendingPointEvent = (value: unknown): PendingPointEvent | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const gameId = typeof value.gameId === 'string' && value.gameId.trim() ? value.gameId.trim() : '';
  const sessionId = typeof value.sessionId === 'string' && value.sessionId.trim() ? value.sessionId.trim() : '';
  const eventId = typeof value.eventId === 'string' && value.eventId.trim() ? value.eventId.trim() : '';
  const points = sanitizePointDeltaValue(value.points);

  if (!gameId || !sessionId || !eventId || points === 0) {
    return null;
  }

  return {
    gameId,
    sessionId,
    eventId,
    points,
    occurredAt: sanitizeOccurredAt(value.occurredAt),
    label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : null,
    meta: sanitizeMeta(value.meta),
  };
};

const buildPointsCacheKey = (userId: string): string => {
  return `lahs.user-points.v${POINTS_CACHE_VERSION}:${userId}`;
};

const buildPointsSyncDisabledKey = (userId: string): string => {
  return `lahs.user-points-sync-disabled.v${POINTS_CACHE_VERSION}:${userId}`;
};

const readCachedPointsState = (userId: string): CachedPointsState => {
  if (typeof window === 'undefined') {
    return { version: POINTS_CACHE_VERSION, serverTotalPoints: 0, pendingEvents: [] };
  }

  try {
    const raw = window.localStorage.getItem(buildPointsCacheKey(userId));
    if (!raw) {
      return { version: POINTS_CACHE_VERSION, serverTotalPoints: 0, pendingEvents: [] };
    }

    const parsed = JSON.parse(raw) as Partial<CachedPointsState>;
    const pendingEvents = Array.isArray(parsed.pendingEvents)
      ? parsed.pendingEvents.map(sanitizePendingPointEvent).filter((event): event is PendingPointEvent => Boolean(event))
      : [];

    return {
      version: POINTS_CACHE_VERSION,
      serverTotalPoints: normalizeStoredPointTotal(parsed.serverTotalPoints),
      pendingEvents,
    };
  } catch {
    return { version: POINTS_CACHE_VERSION, serverTotalPoints: 0, pendingEvents: [] };
  }
};

const writeCachedPointsState = (userId: string, state: CachedPointsState): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(buildPointsCacheKey(userId), JSON.stringify(state));
  } catch {
    // Ignore local cache failures and continue with in-memory state.
  }
};

const readPointsSyncDisabled = (userId: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(buildPointsSyncDisabledKey(userId)) === '1';
  } catch {
    return false;
  }
};

const writePointsSyncDisabled = (userId: string, disabled: boolean): void => {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = buildPointsSyncDisabledKey(userId);
    if (disabled) {
      window.sessionStorage.setItem(storageKey, '1');
      return;
    }

    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore session storage failures and continue with in-memory state.
  }
};

const getSupabaseErrorText = (value: unknown): string => {
  if (!isPlainRecord(value)) {
    return typeof value === 'string' ? value.toLowerCase() : '';
  }

  return [
    typeof value.message === 'string' ? value.message : '',
    typeof value.details === 'string' ? value.details : '',
    typeof value.hint === 'string' ? value.hint : '',
    typeof value.code === 'string' ? value.code : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const isMissingPointsSchemaError = (error: unknown): boolean => {
  const status = isPlainRecord(error) && typeof error.status === 'number' ? error.status : null;
  const text = getSupabaseErrorText(error);

  if (status === 404) {
    return true;
  }

  const mentionsPointsResource = text.includes(USER_POINTS_TOTALS_TABLE) || text.includes(APPLY_GAME_POINTS_RPC);
  const indicatesMissingResource =
    text.includes('schema cache') ||
    text.includes('could not find the table') ||
    text.includes('could not find the function') ||
    text.includes('does not exist') ||
    text.includes('undefined function');

  return mentionsPointsResource && indicatesMissingResource;
};

const parseRpcTotal = (value: unknown): number => {
  if (Array.isArray(value)) {
    const firstRow = value[0];
    if (isPlainRecord(firstRow) && 'total_points' in firstRow) {
      return normalizeStoredPointTotal(firstRow.total_points);
    }

    return normalizeStoredPointTotal(firstRow);
  }

  if (isPlainRecord(value) && 'total_points' in value) {
    return normalizeStoredPointTotal(value.total_points);
  }

  return normalizeStoredPointTotal(value);
};

const parseRpcAccepted = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    const firstRow = value[0];
    if (isPlainRecord(firstRow) && 'accepted' in firstRow) {
      return Boolean(firstRow.accepted);
    }
    return true;
  }

  if (isPlainRecord(value) && 'accepted' in value) {
    return Boolean(value.accepted);
  }

  return true;
};

const parseRpcReason = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const firstRow = value[0];
    if (isPlainRecord(firstRow) && typeof firstRow.reason === 'string' && firstRow.reason.trim()) {
      return firstRow.reason.trim();
    }
    return null;
  }

  if (isPlainRecord(value) && typeof value.reason === 'string' && value.reason.trim()) {
    return value.reason.trim();
  }

  return null;
};

const getPendingPointsTotal = (events: PendingPointEvent[]): number => {
  return events.reduce((sum, event) => sum + event.points, 0);
};

const buildPointsResult = (
  accepted: boolean,
  totalPoints: number,
  reason: string | null = null,
): PointsAwardResult => ({
  accepted,
  totalPoints: normalizeStoredPointTotal(totalPoints),
  stars: RESERVED_STARS_TOTAL,
  reason,
});

export const PointsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [serverTotalPoints, setServerTotalPoints] = useState(0);
  const [pendingEvents, setPendingEvents] = useState<PendingPointEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const serverTotalRef = useRef(0);
  const pendingEventsRef = useRef<PendingPointEvent[]>([]);
  const flushInProgressRef = useRef(false);
  const seenEventKeysRef = useRef<Set<string>>(new Set());
  const pointsSyncUnavailableRef = useRef(false);

  const getCurrentTotalPoints = useCallback(() => {
    return normalizeStoredPointTotal(serverTotalRef.current + getPendingPointsTotal(pendingEventsRef.current));
  }, []);

  const commitState = useCallback((nextServerTotalPoints: number, nextPendingEvents: PendingPointEvent[]) => {
    serverTotalRef.current = nextServerTotalPoints;
    pendingEventsRef.current = nextPendingEvents;
    setServerTotalPoints(nextServerTotalPoints);
    setPendingEvents(nextPendingEvents);

    if (user?.id) {
      writeCachedPointsState(user.id, {
        version: POINTS_CACHE_VERSION,
        serverTotalPoints: nextServerTotalPoints,
        pendingEvents: nextPendingEvents,
      });
    }
  }, [user?.id]);

  const disablePointsSync = useCallback((reason: string, error: unknown) => {
    if (pointsSyncUnavailableRef.current) {
      return;
    }

    pointsSyncUnavailableRef.current = true;
    if (user?.id) {
      writePointsSyncDisabled(user.id, true);
    }
    console.warn('Points sync is unavailable for this session because the Supabase points schema is missing.', {
      reason,
      error,
    });
  }, [user?.id]);

    const flushPendingEvents = useCallback(async () => {
        const client = supabase;
        if (
            flushInProgressRef.current
            || pointsSyncUnavailableRef.current
            || !user?.id
            || !client
            || !isSupabaseConfigured
        ) {
            return;
        }

    flushInProgressRef.current = true;

        try {
            while (pendingEventsRef.current.length > 0) {
                const nextEvent = pendingEventsRef.current[0];
                const { data, error } = await client.rpc(APPLY_GAME_POINTS_RPC, {
          p_game_id: nextEvent.gameId,
          p_session_id: nextEvent.sessionId,
          p_event_id: nextEvent.eventId,
          p_points: nextEvent.points,
          p_metadata: nextEvent.meta,
          p_occurred_at: nextEvent.occurredAt,
        });

        if (error) {
          if (isMissingPointsSchemaError(error)) {
            disablePointsSync('apply_game_points_event', error);
            break;
          }

          console.warn('Points sync failed. Pending event will retry later.', error);
          break;
        }

        const nextEventKey = getPointEventKey(nextEvent.gameId, nextEvent.sessionId, nextEvent.eventId);
        const nextServerTotalPoints = parseRpcTotal(data);
        const accepted = parseRpcAccepted(data);
        const reason = parseRpcReason(data);

        const remainingEvents = pendingEventsRef.current.filter((pendingEvent) => {
          return getPointEventKey(pendingEvent.gameId, pendingEvent.sessionId, pendingEvent.eventId) !== nextEventKey;
        });

        seenEventKeysRef.current.add(nextEventKey);
        if (!accepted) {
          console.warn('Points sync event was not applied by the server. Reverting local pending event.', {
            gameId: nextEvent.gameId,
            sessionId: nextEvent.sessionId,
            eventId: nextEvent.eventId,
            reason,
          });
        }
        commitState(nextServerTotalPoints, remainingEvents);
      }
    } finally {
      flushInProgressRef.current = false;
    }
    }, [commitState, disablePointsSync, user?.id]);

    useEffect(() => {
        const client = supabase;
        if (!user?.id) {
            pointsSyncUnavailableRef.current = false;
            seenEventKeysRef.current.clear();
            commitState(0, []);
            setLoading(false);
            return;
    }

    pointsSyncUnavailableRef.current = readPointsSyncDisabled(user.id);
    const cachedState = readCachedPointsState(user.id);
    seenEventKeysRef.current = new Set(
      cachedState.pendingEvents.map((event) => getPointEventKey(event.gameId, event.sessionId, event.eventId)),
    );
    commitState(cachedState.serverTotalPoints, cachedState.pendingEvents);

        if (!client || !isSupabaseConfigured || pointsSyncUnavailableRef.current) {
            setLoading(false);
            return;
        }

    let cancelled = false;
    setLoading(true);

        const hydratePoints = async () => {
            try {
                const { data, error } = await client
                    .from(USER_POINTS_TOTALS_TABLE)
                    .select('total_points')
                    .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          if (isMissingPointsSchemaError(error)) {
            disablePointsSync(USER_POINTS_TOTALS_TABLE, error);
            return;
          }

          console.warn('Unable to fetch canonical user points total.', error);
          return;
        }

        const nextServerTotalPoints = normalizeStoredPointTotal(data?.total_points);
        commitState(nextServerTotalPoints, pendingEventsRef.current);
      } finally {
        if (!cancelled) {
          setLoading(false);
          void flushPendingEvents();
        }
      }
    };

    void hydratePoints();

    return () => {
      cancelled = true;
    };
  }, [commitState, disablePointsSync, flushPendingEvents, user?.id]);

    useEffect(() => {
        const client = supabase;
        if (!user?.id || !client || !isSupabaseConfigured) {
            return;
        }

    const handleOnline = () => {
      void flushPendingEvents();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void flushPendingEvents();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingEvents, user?.id]);

    const awardPoints = useCallback(async (input: PointsAwardInput): Promise<PointsAwardResult> => {
    const gameId = typeof input.gameId === 'string' ? input.gameId.trim() : '';
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId.trim() : '';
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    const points = sanitizePointValue(input.points);

    if (!user?.id || !gameId || !sessionId || !eventId || points <= 0) {
      return buildPointsResult(false, getCurrentTotalPoints(), user?.id ? 'invalid' : 'not_authenticated');
    }

    const pointEventKey = getPointEventKey(gameId, sessionId, eventId);
    if (seenEventKeysRef.current.has(pointEventKey)) {
      return buildPointsResult(false, getCurrentTotalPoints(), 'duplicate');
    }

    seenEventKeysRef.current.add(pointEventKey);

    const nextEvent: PendingPointEvent = {
      gameId,
      sessionId,
      eventId,
      points,
      occurredAt: sanitizeOccurredAt(input.occurredAt),
      label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : null,
      meta: sanitizeMeta(input.meta),
    };

    const nextPendingEvents = [...pendingEventsRef.current, nextEvent];
    commitState(serverTotalRef.current, nextPendingEvents);

    void flushPendingEvents();

    const nextPendingTotal = getPendingPointsTotal(nextPendingEvents);
    return buildPointsResult(true, serverTotalRef.current + nextPendingTotal);
  }, [commitState, flushPendingEvents, getCurrentTotalPoints, user?.id]);

  const spendPoints = useCallback(async (input: PointsAwardInput): Promise<PointsAwardResult> => {
    const gameId = typeof input.gameId === 'string' ? input.gameId.trim() : '';
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId.trim() : '';
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    const points = sanitizePointValue(input.points);

    if (!user?.id || !gameId || !sessionId || !eventId || points <= 0) {
      return buildPointsResult(false, getCurrentTotalPoints(), user?.id ? 'invalid' : 'not_authenticated');
    }

    const pointEventKey = getPointEventKey(gameId, sessionId, eventId);
    if (seenEventKeysRef.current.has(pointEventKey)) {
      return buildPointsResult(false, getCurrentTotalPoints(), 'duplicate');
    }

    if (getCurrentTotalPoints() < points) {
      return buildPointsResult(false, getCurrentTotalPoints(), 'insufficient_points');
    }

    seenEventKeysRef.current.add(pointEventKey);
    const nextEvent: PendingPointEvent = {
      gameId,
      sessionId,
      eventId,
      points: -points,
      occurredAt: sanitizeOccurredAt(input.occurredAt),
      label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : null,
      meta: sanitizeMeta(input.meta),
    };

    const nextPendingEvents = [...pendingEventsRef.current, nextEvent];
    commitState(serverTotalRef.current, nextPendingEvents);

    void flushPendingEvents();

    const nextPendingTotal = getPendingPointsTotal(nextPendingEvents);
    return buildPointsResult(true, serverTotalRef.current + nextPendingTotal);
  }, [commitState, flushPendingEvents, getCurrentTotalPoints, user?.id]);

  const totalPoints = useMemo(() => {
    return normalizeStoredPointTotal(serverTotalPoints + getPendingPointsTotal(pendingEvents));
  }, [pendingEvents, serverTotalPoints]);

  const value = useMemo<PointsContextValue>(() => ({
    totalPoints,
    stars: RESERVED_STARS_TOTAL,
    loading,
    awardPoints,
    spendPoints,
  }), [awardPoints, loading, spendPoints, totalPoints]);

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePoints = (): PointsContextValue => {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return ctx;
};
