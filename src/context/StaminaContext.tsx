import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  GAME_STAMINA_COST,
  STAMINA_MAX_TOTAL,
  STAMINA_STORAGE_VERSION,
  createDefaultStaminaState,
  getSecondsUntilNextRecharge,
  hydrateStaminaState,
  sanitizeStaminaValue,
  sanitizeTimestampMs,
  type StoredStaminaState,
} from '../utils/stamina';

const STAMINA_SESSION_CACHE_VERSION = 1;

interface ConsumeStaminaInput {
  amount: number;
  eventId: string;
  reason?: string | null;
}

interface ConsumeStaminaResult {
  accepted: boolean;
  alreadyProcessed: boolean;
  currentStamina: number;
  maxStamina: number;
  nextRechargeAtMs: number | null;
  secondsUntilNextRecharge: number;
}

interface StaminaContextValue {
  currentStamina: number;
  maxStamina: number;
  gameCost: number;
  nextRechargeAtMs: number | null;
  consumeStamina: (input: ConsumeStaminaInput) => Promise<ConsumeStaminaResult>;
}

const StaminaContext = createContext<StaminaContextValue | undefined>(undefined);

const buildStaminaStorageKey = (userId: string): string => {
  return `lahs.user-stamina.v${STAMINA_STORAGE_VERSION}:${userId}`;
};

const buildStaminaSessionKey = (userId: string): string => {
  return `lahs.user-stamina-session.v${STAMINA_SESSION_CACHE_VERSION}:${userId}`;
};

const readStoredStaminaState = (userId: string): StoredStaminaState => {
  if (typeof window === 'undefined') {
    return createDefaultStaminaState();
  }

  try {
    const raw = window.localStorage.getItem(buildStaminaStorageKey(userId));
    if (!raw) {
      return createDefaultStaminaState();
    }

    const parsed = JSON.parse(raw) as Partial<StoredStaminaState>;
    return {
      version: STAMINA_STORAGE_VERSION,
      available: sanitizeStaminaValue(parsed.available),
      updatedAtMs: sanitizeTimestampMs(parsed.updatedAtMs, Date.now()),
    };
  } catch {
    return createDefaultStaminaState();
  }
};

const writeStoredStaminaState = (userId: string, state: StoredStaminaState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(buildStaminaStorageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage failures and continue with in-memory stamina state.
  }
};

const readProcessedStaminaEventIds = (userId: string): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(buildStaminaSessionKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
  } catch {
    return [];
  }
};

const writeProcessedStaminaEventIds = (userId: string, eventIds: Iterable<string>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const nextIds = Array.from(new Set(Array.from(eventIds).filter((value) => typeof value === 'string' && value.trim().length > 0)));
    window.sessionStorage.setItem(buildStaminaSessionKey(userId), JSON.stringify(nextIds));
  } catch {
    // Ignore session cache failures and continue with the in-memory seen set.
  }
};

export const StaminaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [, setStoredState] = useState<StoredStaminaState>(() => createDefaultStaminaState());
  const [currentStamina, setCurrentStamina] = useState(STAMINA_MAX_TOTAL);
  const [nextRechargeAtMs, setNextRechargeAtMs] = useState<number | null>(null);
  const storedStateRef = useRef<StoredStaminaState>(createDefaultStaminaState());
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const commitStoredState = useCallback((nextState: StoredStaminaState, { persist = true }: { persist?: boolean } = {}) => {
    storedStateRef.current = nextState;
    setStoredState(nextState);

    if (persist && currentUserId) {
      writeStoredStaminaState(currentUserId, nextState);
    }
  }, [currentUserId]);

  const syncResolvedState = useCallback((nowMs = Date.now()) => {
    const resolvedState = hydrateStaminaState(storedStateRef.current, nowMs);
    setCurrentStamina(resolvedState.available);
    setNextRechargeAtMs(resolvedState.nextRechargeAtMs);

    const needsPersist =
      resolvedState.available !== storedStateRef.current.available
      || (
        resolvedState.available < STAMINA_MAX_TOTAL
        && resolvedState.anchorMs !== storedStateRef.current.updatedAtMs
      )
      || (
        resolvedState.available >= STAMINA_MAX_TOTAL
        && storedStateRef.current.available < STAMINA_MAX_TOTAL
      );

    if (!needsPersist) {
      return resolvedState;
    }

    const normalizedState: StoredStaminaState = resolvedState.available >= STAMINA_MAX_TOTAL
      ? {
          version: STAMINA_STORAGE_VERSION,
          available: STAMINA_MAX_TOTAL,
          updatedAtMs: sanitizeTimestampMs(nowMs, Date.now()),
        }
      : {
          version: STAMINA_STORAGE_VERSION,
          available: resolvedState.available,
          updatedAtMs: resolvedState.anchorMs,
        };

    commitStoredState(normalizedState);
    return resolvedState;
  }, [commitStoredState]);

  useEffect(() => {
    let frameId: number | null = null;

    if (!currentUserId) {
      processedEventIdsRef.current.clear();
      const defaultState = createDefaultStaminaState();
      frameId = window.requestAnimationFrame(() => {
        commitStoredState(defaultState, { persist: false });
        setCurrentStamina(STAMINA_MAX_TOTAL);
        setNextRechargeAtMs(null);
      });

      return () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    const nextStoredState = readStoredStaminaState(currentUserId);
    processedEventIdsRef.current = new Set(readProcessedStaminaEventIds(currentUserId));
    frameId = window.requestAnimationFrame(() => {
      commitStoredState(nextStoredState, { persist: false });
      syncResolvedState();
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [commitStoredState, currentUserId, syncResolvedState]);

  useEffect(() => {
    if (!nextRechargeAtMs) {
      return undefined;
    }

    const delayMs = Math.max(250, nextRechargeAtMs - Date.now() + 30);
    const timeoutId = window.setTimeout(() => {
      syncResolvedState();
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [nextRechargeAtMs, syncResolvedState]);

  const consumeStamina = useCallback(async (input: ConsumeStaminaInput): Promise<ConsumeStaminaResult> => {
    const amount = Math.max(0, Math.round(sanitizeStaminaValue(input.amount)));
    const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';
    const nowMs = Date.now();
    const resolvedBeforeConsume = hydrateStaminaState(storedStateRef.current, nowMs);

    if (!currentUserId || !eventId || amount <= 0) {
      return {
        accepted: false,
        alreadyProcessed: false,
        currentStamina: resolvedBeforeConsume.available,
        maxStamina: STAMINA_MAX_TOTAL,
        nextRechargeAtMs: resolvedBeforeConsume.nextRechargeAtMs,
        secondsUntilNextRecharge: getSecondsUntilNextRecharge(resolvedBeforeConsume.nextRechargeAtMs, nowMs),
      };
    }

    if (processedEventIdsRef.current.has(eventId)) {
      return {
        accepted: true,
        alreadyProcessed: true,
        currentStamina: resolvedBeforeConsume.available,
        maxStamina: STAMINA_MAX_TOTAL,
        nextRechargeAtMs: resolvedBeforeConsume.nextRechargeAtMs,
        secondsUntilNextRecharge: getSecondsUntilNextRecharge(resolvedBeforeConsume.nextRechargeAtMs, nowMs),
      };
    }

    if (resolvedBeforeConsume.available < amount) {
      return {
        accepted: false,
        alreadyProcessed: false,
        currentStamina: resolvedBeforeConsume.available,
        maxStamina: STAMINA_MAX_TOTAL,
        nextRechargeAtMs: resolvedBeforeConsume.nextRechargeAtMs,
        secondsUntilNextRecharge: getSecondsUntilNextRecharge(resolvedBeforeConsume.nextRechargeAtMs, nowMs),
      };
    }

    const nextAvailable = resolvedBeforeConsume.available - amount;
    const nextStoredState: StoredStaminaState = {
      version: STAMINA_STORAGE_VERSION,
      available: nextAvailable,
      updatedAtMs: resolvedBeforeConsume.available < STAMINA_MAX_TOTAL
        ? resolvedBeforeConsume.anchorMs
        : nowMs,
    };

    processedEventIdsRef.current.add(eventId);
    writeProcessedStaminaEventIds(currentUserId, processedEventIdsRef.current);
    commitStoredState(nextStoredState);

    const resolvedAfterConsume = hydrateStaminaState(nextStoredState, nowMs);
    setCurrentStamina(resolvedAfterConsume.available);
    setNextRechargeAtMs(resolvedAfterConsume.nextRechargeAtMs);

    return {
      accepted: true,
      alreadyProcessed: false,
      currentStamina: resolvedAfterConsume.available,
      maxStamina: STAMINA_MAX_TOTAL,
      nextRechargeAtMs: resolvedAfterConsume.nextRechargeAtMs,
      secondsUntilNextRecharge: getSecondsUntilNextRecharge(resolvedAfterConsume.nextRechargeAtMs, nowMs),
    };
  }, [commitStoredState, currentUserId]);

  const value = useMemo<StaminaContextValue>(() => ({
    currentStamina,
    maxStamina: STAMINA_MAX_TOTAL,
    gameCost: GAME_STAMINA_COST,
    nextRechargeAtMs,
    consumeStamina,
  }), [consumeStamina, currentStamina, nextRechargeAtMs]);

  return <StaminaContext.Provider value={value}>{children}</StaminaContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStamina = (): StaminaContextValue => {
  const context = useContext(StaminaContext);
  if (!context) {
    throw new Error('useStamina must be used within a StaminaProvider');
  }
  return context;
};
