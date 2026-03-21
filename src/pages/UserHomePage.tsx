import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointsContext';
import { useStamina } from '../context/StaminaContext';
import { useSoundSettings } from '../context/SoundSettingsContext';
import { useHomepageCatalog } from '../hooks/useHomepageCatalog';
import { useZoomLock } from '../hooks/useZoomLock';
import { buildAssetPath } from '../utils/pathUtils';
import CinematicLoadingScreen from '../components/CinematicLoadingScreen';
import {
  buildHomepagePendingSummonRecovery,
  clearHomepagePendingSummonRecovery,
  consumeHomepageMysteryTestLaunchToken,
  createCreatorCatalogSyncPayload,
  persistHomepagePendingSummonRecovery,
  persistHomepageCatalogSnapshot,
  readHomepageCatalogSnapshot,
  readHomepagePendingSummonRecovery,
  readHomepageMysteryTestSession,
} from '../utils/homepageCatalogBridge';
import { isManagerUser } from '../utils/managerAccess';
import { HOMEPAGE_APP_RUNTIME_VERSION } from '../constants/homepageAppVersion';
import { HOMEPAGE_BOOT_STABLE_EVENT } from '../constants/runtimeEvents';
import type { HomepageCatalogSnapshot } from '../types/homepageCatalog';
import {
  buildPendingMysteryLaunchState,
  createInitialHomepageLaunchState,
  snapshotContainsPropKey,
  type PendingMysteryLaunchState,
} from './userHomePage/homepageLaunchState';
import type { HomepagePendingSummonRecoveryPayload } from '../utils/homepageCatalogBridge';
import { postIframeLifecyclePhase, teardownIframeElementWhenDisconnected } from '../utils/iframeLifecycle';
import { resumeIframeRuntime, syncIframeSoundSettings } from '../utils/iframeRuntime';
import './Home.css';
import './UserHomePage.css';

const HOME_PAGE_APP_PATH = 'HomePageAPP/index.html';
const HOME_PAGE_TILT_STATUS_MESSAGE = 'homepage-deviceorientation-status';
const HOME_PAGE_TILT_SAMPLE_MESSAGE = 'homepage-deviceorientation';
const HOME_PAGE_TILT_PERMISSION_REQUEST_MESSAGE = 'homepage-deviceorientation-request-permission';
const HOME_PAGE_TILT_SYNC_REQUEST_MESSAGE = 'homepage-deviceorientation-sync-status';
const HOME_PAGE_POINTS_SYNC_MESSAGE = 'LAHS_HOMEPAGE_POINTS_SYNC';
const HOME_PAGE_POINTS_SYNC_REQUEST_MESSAGE = 'LAHS_HOMEPAGE_POINTS_SYNC_REQUEST';
const HOME_PAGE_DAILY_LUNCHBOX_CLAIM_MESSAGE = 'LAHS_HOMEPAGE_DAILY_LUNCHBOX_CLAIM';
const HOME_PAGE_DAILY_LUNCHBOX_CLAIM_RESULT_MESSAGE = 'LAHS_HOMEPAGE_DAILY_LUNCHBOX_CLAIM_RESULT';
const HOME_PAGE_MYSTERY_PULL_REQUEST_MESSAGE = 'LAHS_HOMEPAGE_MYSTERY_PULL_REQUEST';
const HOME_PAGE_MYSTERY_PULL_RESULT_MESSAGE = 'LAHS_HOMEPAGE_MYSTERY_PULL_RESULT';
const HOME_PAGE_SUMMON_RECOVERY_UPDATE_MESSAGE = 'LAHS_HOMEPAGE_SUMMON_RECOVERY_UPDATE';
const HOME_PAGE_SUMMON_RECOVERY_SYNC_MESSAGE = 'LAHS_HOMEPAGE_SUMMON_RECOVERY_SYNC';
const HOME_PAGE_BOOT_READY_MESSAGE = 'LAHS_HOMEPAGE_BOOT_READY';
const HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS = 100;
const HOME_PAGE_DAILY_LUNCHBOX_GAME_ID = 'homepage-daily-lunchbox';
const HOME_PAGE_DAILY_LUNCHBOX_SESSION_PREFIX = 'homepage-daily-lunchbox';
const HOME_PAGE_DAILY_LUNCHBOX_STORAGE_VERSION = 2;
const HOME_PAGE_DAILY_LUNCHBOX_REFRESH_MS = 10 * 1000;
const HOME_PAGE_MYSTERY_PULL_COST_POINTS = 100;
const HOME_PAGE_MYSTERY_PULL_GAME_ID = 'homepage-mystery-box';
const HOME_PAGE_MYSTERY_PULL_SESSION_PREFIX = 'homepage-mystery-box';
const HOME_PAGE_BOOT_SIGNAL_GRACE_MS = 1200;
const HOME_PAGE_HOST_LOAD_TIMEOUT_MS = 10 * 1000;
const HOME_PAGE_HOST_INITIAL_PROGRESS = 0.06;

const clampNumber = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

type HomePageTiltPermissionState =
  | 'unknown'
  | 'unsupported'
  | 'blocked'
  | 'prompt'
  | 'denied'
  | 'granted';

type HomePageTiltBridge = {
  ensureStarted: (options?: { userGesture?: boolean }) => Promise<boolean>;
  getState: () => {
    permission: HomePageTiltPermissionState;
    listening: boolean;
  };
};

type DeviceOrientationPermissionAPI = (typeof DeviceOrientationEvent) & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

declare global {
  interface Window {
    __homePageTiltBridge?: HomePageTiltBridge;
  }
}

interface UserHomePageProps {
  isActive?: boolean;
  onBootStable?: () => void;
}

const buildDailyLunchboxClaimStorageKey = (userId: string): string => {
  return `lahs.homepage-daily-lunchbox.v${HOME_PAGE_DAILY_LUNCHBOX_STORAGE_VERSION}:${userId}`;
};

const normalizeDailyLunchboxClaimExpiresAt = (
  expiresAt: number | null | undefined,
  nowMs = Date.now(),
): number | null => {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    return null;
  }

  if (expiresAt <= nowMs) {
    return null;
  }

  const remainingMs = expiresAt - nowMs;
  const maxAllowedRemainingMs = HOME_PAGE_DAILY_LUNCHBOX_REFRESH_MS * 2;
  if (remainingMs > maxAllowedRemainingMs) {
    return null;
  }

  return expiresAt;
};

const readDailyLunchboxClaimExpiresAt = (userId: string | null | undefined): number | null => {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(buildDailyLunchboxClaimStorageKey(userId));
    if (!storedValue || storedValue === 'claimed') {
      return null;
    }
    const parsedValue = Number(storedValue);
    return normalizeDailyLunchboxClaimExpiresAt(parsedValue);
  } catch {
    return null;
  }
};

const writeDailyLunchboxClaimExpiresAt = (userId: string | null | undefined, expiresAt: number | null): void => {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  try {
    const key = buildDailyLunchboxClaimStorageKey(userId);
    if (typeof expiresAt === 'number' && Number.isFinite(expiresAt) && expiresAt > 0) {
      window.localStorage.setItem(key, String(expiresAt));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures and keep runtime state in memory.
  }
};

const UserHomePage: React.FC<UserHomePageProps> = ({ isActive = true, onBootStable }) => {
  const [initialLaunchState] = useState(createInitialHomepageLaunchState);
  const initialPendingMysteryLaunch = initialLaunchState.pendingMysteryLaunch;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedInitialBoot, setHasCompletedInitialBoot] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [bootReadyReceived, setBootReadyReceived] = useState(false);
  const [bootFallbackReady, setBootFallbackReady] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [bootProgress, setBootProgress] = useState(HOME_PAGE_HOST_INITIAL_PROGRESS);
  const [pendingMysteryLaunch, setPendingMysteryLaunch] = useState<PendingMysteryLaunchState | null>(initialPendingMysteryLaunch);
  const [pendingSummonRecovery, setPendingSummonRecovery] = useState<HomepagePendingSummonRecoveryPayload | null>(null);
  const [storedSnapshot, setStoredSnapshot] = useState<HomepageCatalogSnapshot | null>(
    () => initialLaunchState.storedSnapshot,
  );
  const { user } = useAuth();
  const { totalPoints, stars, awardPoints, spendPoints } = usePoints();
  const { currentStamina, maxStamina } = useStamina();
  const { settings: soundSettings } = useSoundSettings();
  const { snapshot, isLoading: isCatalogLoading } = useHomepageCatalog({ includeInactive: false });
  const hasDeveloperAccess = useMemo(() => isManagerUser(user), [user]);
  const [dailyLunchboxClaimExpiresAtByUser, setDailyLunchboxClaimExpiresAtByUser] = useState<Record<string, number | null>>({});
  const [dailyLunchboxClaimPendingByUser, setDailyLunchboxClaimPendingByUser] = useState<Record<string, boolean>>({});
  const [dailyLunchboxClockTick, setDailyLunchboxClockTick] = useState(() => Date.now());
  const zoomLockIframes = useMemo(() => [iframeRef], []);
  const shouldHoldStoredSnapshot = useMemo(() => {
    if (isCatalogLoading) {
      return false;
    }
    const pendingPropKey = pendingMysteryLaunch?.propKey ?? null;
    if (!pendingPropKey) {
      return false;
    }
    return (
      !snapshotContainsPropKey(snapshot, pendingPropKey)
      && snapshotContainsPropKey(storedSnapshot, pendingPropKey)
    );
  }, [isCatalogLoading, pendingMysteryLaunch?.propKey, snapshot, storedSnapshot]);
  const effectiveSnapshot = useMemo(
    () => {
      if (
        !isCatalogLoading
        && !shouldHoldStoredSnapshot
        && (snapshot.categories.length > 0 || snapshot.props.length > 0)
      ) {
        return snapshot;
      }
      return storedSnapshot ?? snapshot;
    },
    [isCatalogLoading, shouldHoldStoredSnapshot, snapshot, storedSnapshot],
  );
  const launchPath = useMemo(
    () => buildAssetPath(`${HOME_PAGE_APP_PATH}?v=${HOMEPAGE_APP_RUNTIME_VERSION}&hostLoader=1${hasDeveloperAccess ? '&developer=1' : ''}`),
    [hasDeveloperAccess],
  );
  const loaderVisible = !hasCompletedInitialBoot && isLoading;
  const iframeLoadedState = iframeLoaded;
  const bootReadyReceivedState = bootReadyReceived;
  const bootFallbackReadyState = bootFallbackReady;
  const loadTimedOutState = loadTimedOut;
  const bootProgressValue = bootProgress;
  const bootCompletionRequested = bootReadyReceivedState || bootFallbackReadyState || loadTimedOutState;
  const tiltBridgeStateRef = useRef<{
    permission: HomePageTiltPermissionState;
    listening: boolean;
    handler: ((event: DeviceOrientationEvent) => void) | null;
  }>({
    permission: 'unknown',
    listening: false,
    handler: null,
  });
  const currentUserId = user?.id ?? null;
  const dailyLunchboxClaimExpiresAt = useMemo(() => {
    if (!currentUserId) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(dailyLunchboxClaimExpiresAtByUser, currentUserId)) {
      return normalizeDailyLunchboxClaimExpiresAt(
        dailyLunchboxClaimExpiresAtByUser[currentUserId] ?? null,
        dailyLunchboxClockTick,
      );
    }
    return readDailyLunchboxClaimExpiresAt(currentUserId);
  }, [currentUserId, dailyLunchboxClaimExpiresAtByUser, dailyLunchboxClockTick]);
  const dailyLunchboxClaimed = useMemo(() => {
    if (!dailyLunchboxClaimExpiresAt) {
      return false;
    }
    return dailyLunchboxClaimExpiresAt > dailyLunchboxClockTick;
  }, [dailyLunchboxClaimExpiresAt, dailyLunchboxClockTick]);
  const dailyLunchboxClaimPending = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    return Boolean(dailyLunchboxClaimPendingByUser[currentUserId]);
  }, [currentUserId, dailyLunchboxClaimPendingByUser]);
  const dailyLunchboxRewardReady = Boolean(user?.id) && !dailyLunchboxClaimed;

  useZoomLock({ enabled: isActive, iframeRefs: zoomLockIframes });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setDailyLunchboxClockTick(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const postTiltBridgeMessage = useCallback((payload: Record<string, unknown>) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    try {
      target.postMessage(payload, window.location.origin);
    } catch {
      return;
    }
  }, []);

  const persistPendingSummonRecoveryState = useCallback((payload: HomepagePendingSummonRecoveryPayload | null) => {
    if (payload) {
      persistHomepagePendingSummonRecovery(payload);
      setPendingSummonRecovery(payload);
      return;
    }
    clearHomepagePendingSummonRecovery(user?.id ?? null);
    setPendingSummonRecovery(null);
  }, [user?.id]);

  const syncPendingSummonRecoveryToIframe = useCallback(() => {
    postTiltBridgeMessage({
      type: HOME_PAGE_SUMMON_RECOVERY_SYNC_MESSAGE,
      payload: pendingSummonRecovery,
    });
  }, [pendingSummonRecovery, postTiltBridgeMessage]);

  const syncHomepagePointsToIframe = useCallback(() => {
    postTiltBridgeMessage({
      type: HOME_PAGE_POINTS_SYNC_MESSAGE,
      totalPoints,
      stars,
      stamina: currentStamina,
      staminaMax: maxStamina,
      userId: user?.id ?? null,
      isAuthenticated: Boolean(user?.id),
      dailyLunchboxRewardReady,
      dailyLunchboxRewardPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
      dailyLunchboxClaimPending,
      dailyLunchboxClaimed,
    });
  }, [
    dailyLunchboxClaimPending,
    dailyLunchboxClaimed,
    dailyLunchboxRewardReady,
    postTiltBridgeMessage,
    currentStamina,
    maxStamina,
    stars,
    totalPoints,
    user?.id,
  ]);

  const syncTiltBridgeStateToIframe = useCallback(() => {
    const bridgeState = tiltBridgeStateRef.current;
    postTiltBridgeMessage({
      type: HOME_PAGE_TILT_STATUS_MESSAGE,
      permission: bridgeState.permission,
      listening: bridgeState.listening,
    });
  }, [postTiltBridgeMessage]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPendingSummonRecovery(user?.id ? readHomepagePendingSummonRecovery(user.id) : null);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [user?.id]);

  useEffect(() => {
    syncPendingSummonRecoveryToIframe();
  }, [syncPendingSummonRecoveryToIframe]);

  useEffect(() => {
    if (!loaderVisible) {
      return;
    }

    let animationFrameId = 0;

    const animateProgress = () => {
      setBootProgress((current) => {
        const target = bootCompletionRequested ? 1 : 0.9;
        const easing = bootCompletionRequested ? 0.19 : 0.03;
        const drift = bootCompletionRequested ? 0 : 0.0022;
        const next = current + ((target - current) * easing);
        return clampNumber(Math.max(next, Math.min(target, current + drift)), HOME_PAGE_HOST_INITIAL_PROGRESS, 1);
      });

      animationFrameId = window.requestAnimationFrame(animateProgress);
    };

    animationFrameId = window.requestAnimationFrame(animateProgress);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [bootCompletionRequested, loaderVisible]);

  useEffect(() => {
    if (!loaderVisible || !iframeLoadedState || bootReadyReceivedState || loadTimedOutState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBootFallbackReady(true);
    }, HOME_PAGE_BOOT_SIGNAL_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [bootReadyReceivedState, iframeLoadedState, loaderVisible, loadTimedOutState]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const activeSession = readHomepageMysteryTestSession();
    const launchToken = activeSession ? null : consumeHomepageMysteryTestLaunchToken();
    const nextPendingMysteryLaunch = buildPendingMysteryLaunchState({
      session: activeSession,
      launchToken,
    });
    if (!nextPendingMysteryLaunch) {
      return;
    }

    const latestStoredSnapshot = readHomepageCatalogSnapshot() ?? initialLaunchState.storedSnapshot ?? storedSnapshot;
    const frameId = window.requestAnimationFrame(() => {
      if (latestStoredSnapshot) {
        setStoredSnapshot(latestStoredSnapshot);
      }
      setPendingMysteryLaunch(nextPendingMysteryLaunch);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [initialLaunchState.storedSnapshot, isActive, storedSnapshot]);

  useEffect(() => {
    syncIframeSoundSettings(iframeRef.current, soundSettings, { homePageActive: isActive });
  }, [isActive, soundSettings]);

  useEffect(() => {
    syncHomepagePointsToIframe();
  }, [syncHomepagePointsToIframe]);

  useEffect(() => {
    const bridgeState = tiltBridgeStateRef.current;

    const startTiltListener = () => {
      if (bridgeState.listening) {
        syncTiltBridgeStateToIframe();
        return true;
      }

      const handler = (event: DeviceOrientationEvent) => {
        postTiltBridgeMessage({
          type: HOME_PAGE_TILT_SAMPLE_MESSAGE,
          beta: typeof event.beta === 'number' ? event.beta : null,
          gamma: typeof event.gamma === 'number' ? event.gamma : null,
          alpha: typeof event.alpha === 'number' ? event.alpha : null,
          absolute: Boolean(event.absolute),
        });
      };

      window.addEventListener('deviceorientation', handler, { passive: true });
      bridgeState.handler = handler;
      bridgeState.listening = true;
      bridgeState.permission = 'granted';
      syncTiltBridgeStateToIframe();
      return true;
    };

    const ensureStarted = async ({ userGesture = false }: { userGesture?: boolean } = {}) => {
      if (bridgeState.listening) {
        syncTiltBridgeStateToIframe();
        return true;
      }

      if (typeof window.DeviceOrientationEvent === 'undefined') {
        bridgeState.permission = 'unsupported';
        syncTiltBridgeStateToIframe();
        return false;
      }

      if (!window.isSecureContext) {
        bridgeState.permission = 'blocked';
        syncTiltBridgeStateToIframe();
        return false;
      }

      const deviceOrientationPermissionAPI =
        window.DeviceOrientationEvent as DeviceOrientationPermissionAPI | undefined;
      const requestPermission = deviceOrientationPermissionAPI?.requestPermission;
      if (typeof requestPermission === 'function') {
        if (!userGesture) {
          bridgeState.permission = 'prompt';
          syncTiltBridgeStateToIframe();
          return false;
        }

        try {
          const result = await requestPermission.call(deviceOrientationPermissionAPI);
          bridgeState.permission = result === 'granted' ? 'granted' : 'denied';
          if (bridgeState.permission !== 'granted') {
            syncTiltBridgeStateToIframe();
            return false;
          }
        } catch {
          bridgeState.permission = 'denied';
          syncTiltBridgeStateToIframe();
          return false;
        }
      }

      return startTiltListener();
    };

    const bridge: HomePageTiltBridge = {
      ensureStarted,
      getState: () => ({
        permission: bridgeState.permission,
        listening: bridgeState.listening,
      }),
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;

      const type = (event.data as { type?: string }).type;
      if (type === HOME_PAGE_BOOT_READY_MESSAGE) {
        setBootReadyReceived(true);
        return;
      }
      if (type === HOME_PAGE_POINTS_SYNC_REQUEST_MESSAGE) {
        syncHomepagePointsToIframe();
        return;
      }
      if (type === HOME_PAGE_DAILY_LUNCHBOX_CLAIM_MESSAGE) {
        if (!user?.id || dailyLunchboxClaimPending) {
          postTiltBridgeMessage({
            type: HOME_PAGE_DAILY_LUNCHBOX_CLAIM_RESULT_MESSAGE,
            accepted: false,
            totalPoints,
            stars,
            dailyLunchboxRewardReady,
            dailyLunchboxRewardPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
            dailyLunchboxClaimPending,
            dailyLunchboxClaimed,
          });
          return;
        }

        if (dailyLunchboxClaimed) {
          postTiltBridgeMessage({
            type: HOME_PAGE_DAILY_LUNCHBOX_CLAIM_RESULT_MESSAGE,
            accepted: false,
            totalPoints,
            stars,
            dailyLunchboxRewardReady: false,
            dailyLunchboxRewardPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
            dailyLunchboxClaimPending: false,
            dailyLunchboxClaimed: true,
            collectedPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
          });
          return;
        }

        const claimStartedAt = Date.now();
        const claimSessionId = `${HOME_PAGE_DAILY_LUNCHBOX_SESSION_PREFIX}:${user.id}:${claimStartedAt}`;
        const claimEventId = `claim-${claimStartedAt}`;
        const occurredAt = new Date(claimStartedAt).toISOString();
        setDailyLunchboxClaimPendingByUser((current) => ({
          ...current,
          [user.id]: true,
        }));
        void awardPoints({
          gameId: HOME_PAGE_DAILY_LUNCHBOX_GAME_ID,
          sessionId: claimSessionId,
          eventId: claimEventId,
          points: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
          occurredAt,
          label: 'Daily Lunchbox Reward',
          meta: {
            source: 'homepage-daily-lunchbox',
            rewardVersion: 1,
            refreshMs: HOME_PAGE_DAILY_LUNCHBOX_REFRESH_MS,
          },
        }).then((result) => {
          const claimAccepted = Boolean(result.accepted);
          const claimExpiresAt = claimAccepted
            ? claimStartedAt + HOME_PAGE_DAILY_LUNCHBOX_REFRESH_MS
            : null;
          writeDailyLunchboxClaimExpiresAt(user.id, claimExpiresAt);
          setDailyLunchboxClaimExpiresAtByUser((current) => ({
            ...current,
            [user.id]: claimExpiresAt,
          }));
          setDailyLunchboxClaimPendingByUser((current) => ({
            ...current,
            [user.id]: false,
          }));
          postTiltBridgeMessage({
            type: HOME_PAGE_DAILY_LUNCHBOX_CLAIM_RESULT_MESSAGE,
            accepted: claimAccepted,
            totalPoints: result.totalPoints,
            stars: result.stars,
            dailyLunchboxRewardReady: !claimAccepted,
            dailyLunchboxRewardPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
            dailyLunchboxClaimPending: false,
            dailyLunchboxClaimed: claimAccepted,
            collectedPoints: claimAccepted ? HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS : 0,
          });
        }).catch(() => {
          setDailyLunchboxClaimPendingByUser((current) => ({
            ...current,
            [user.id]: false,
          }));
          postTiltBridgeMessage({
            type: HOME_PAGE_DAILY_LUNCHBOX_CLAIM_RESULT_MESSAGE,
            accepted: false,
            totalPoints,
            stars,
            dailyLunchboxRewardReady: true,
            dailyLunchboxRewardPoints: HOME_PAGE_DAILY_LUNCHBOX_REWARD_POINTS,
            dailyLunchboxClaimPending: false,
            dailyLunchboxClaimed: false,
          });
        });
        return;
      }
      if (type === HOME_PAGE_MYSTERY_PULL_REQUEST_MESSAGE) {
        const requestId = typeof (event.data as { requestId?: unknown }).requestId === 'string'
          ? (event.data as { requestId: string }).requestId.trim()
          : '';
        const occurredAt = typeof (event.data as { occurredAt?: unknown }).occurredAt === 'string'
          ? (event.data as { occurredAt: string }).occurredAt
          : new Date().toISOString();
        const requestedCostPoints = Number((event.data as { costPoints?: unknown }).costPoints);
        const costPoints = Number.isFinite(requestedCostPoints) && requestedCostPoints > 0
          ? Math.max(1, Math.round(requestedCostPoints))
          : HOME_PAGE_MYSTERY_PULL_COST_POINTS;

        if (!requestId || !user?.id) {
          postTiltBridgeMessage({
            type: HOME_PAGE_MYSTERY_PULL_RESULT_MESSAGE,
            requestId,
            accepted: false,
            reason: user?.id ? 'invalid_request' : 'not_authenticated',
            costPoints,
            totalPoints,
            stars,
          });
          return;
        }

        const sessionId = `${HOME_PAGE_MYSTERY_PULL_SESSION_PREFIX}:${user.id}:${requestId}`;
        const eventId = `pull-${requestId}`;
        const userId = user.id;

        void spendPoints({
          gameId: HOME_PAGE_MYSTERY_PULL_GAME_ID,
          sessionId,
          eventId,
          points: costPoints,
          occurredAt,
          label: 'Mystery Box Pull',
          meta: {
            source: 'homepage-mystery-box',
            requestId,
            costPoints,
            trigger: 'mystery-scroll-pull',
          },
        }).then((result) => {
          if (result.accepted) {
            const pendingRecovery = buildHomepagePendingSummonRecovery({
              userId,
              requestId,
              costPoints,
              createdAt: occurredAt,
              status: 'pointsAccepted',
            });
            persistPendingSummonRecoveryState(pendingRecovery);
          }
          postTiltBridgeMessage({
            type: HOME_PAGE_MYSTERY_PULL_RESULT_MESSAGE,
            requestId,
            accepted: Boolean(result.accepted),
            reason: result.reason ?? null,
            costPoints,
            totalPoints: result.totalPoints,
            stars: result.stars,
          });
        }).catch(() => {
          postTiltBridgeMessage({
            type: HOME_PAGE_MYSTERY_PULL_RESULT_MESSAGE,
            requestId,
            accepted: false,
            reason: 'sync_failed',
            costPoints,
            totalPoints,
            stars,
          });
        });
        return;
      }
      if (type === HOME_PAGE_SUMMON_RECOVERY_UPDATE_MESSAGE) {
        const action = typeof (event.data as { action?: unknown }).action === 'string'
          ? (event.data as { action: string }).action.trim()
          : 'upsert';
        if (action === 'clear') {
          persistPendingSummonRecoveryState(null);
          return;
        }

        const rawPayload = (event.data as { payload?: unknown }).payload;
        const payload = buildHomepagePendingSummonRecovery({
          userId: user?.id ?? null,
          requestId: typeof rawPayload === 'object' && rawPayload ? (rawPayload as { requestId?: unknown }).requestId as string : null,
          costPoints: typeof rawPayload === 'object' && rawPayload ? Number((rawPayload as { costPoints?: unknown }).costPoints) : 0,
          rewardKey: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { rewardKey?: unknown }).rewardKey as string | null | undefined) ?? null : null,
          rewardLabel: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { rewardLabel?: unknown }).rewardLabel as string | null | undefined) ?? null : null,
          rewardRarity: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { rewardRarity?: unknown }).rewardRarity as HomepagePendingSummonRecoveryPayload['rewardRarity']) ?? null : null,
          createdAt: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { createdAt?: unknown }).createdAt as string | undefined) : undefined,
          resolvedAt: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { resolvedAt?: unknown }).resolvedAt as string | null | undefined) ?? null : null,
          status: typeof rawPayload === 'object' && rawPayload ? ((rawPayload as { status?: unknown }).status as HomepagePendingSummonRecoveryPayload['status']) : undefined,
        });

        if (!payload) {
          persistPendingSummonRecoveryState(null);
          return;
        }

        if (action === 'refundFallback') {
          if (!user?.id) {
            persistPendingSummonRecoveryState(null);
            return;
          }
          const refundSessionId = `${HOME_PAGE_MYSTERY_PULL_SESSION_PREFIX}:${user.id}:${payload.requestId}:recovery-refund`;
          const refundEventId = `refund-${payload.requestId}`;
          void awardPoints({
            gameId: HOME_PAGE_MYSTERY_PULL_GAME_ID,
            sessionId: refundSessionId,
            eventId: refundEventId,
            points: payload.costPoints,
            occurredAt: payload.resolvedAt ?? payload.createdAt,
            label: 'Mystery Box Pull Recovery Refund',
            meta: {
              source: 'homepage-mystery-box-recovery',
              requestId: payload.requestId,
              costPoints: payload.costPoints,
              rewardKey: payload.rewardKey,
            },
          }).finally(() => {
            persistPendingSummonRecoveryState(null);
          });
          return;
        }

        persistPendingSummonRecoveryState(payload);
        return;
      }
      if (type === HOME_PAGE_TILT_PERMISSION_REQUEST_MESSAGE) {
        void ensureStarted({ userGesture: true });
        return;
      }
      if (type === HOME_PAGE_TILT_SYNC_REQUEST_MESSAGE) {
        void ensureStarted({ userGesture: false });
      }
    };

    window.__homePageTiltBridge = bridge;
    window.addEventListener('message', handleMessage);
    void ensureStarted({ userGesture: false });

    return () => {
      window.removeEventListener('message', handleMessage);
      if (bridgeState.handler) {
        window.removeEventListener('deviceorientation', bridgeState.handler);
      }
      bridgeState.handler = null;
      bridgeState.listening = false;
      bridgeState.permission = 'unknown';
      if (window.__homePageTiltBridge === bridge) {
        delete window.__homePageTiltBridge;
      }
    };
  }, [
    awardPoints,
    spendPoints,
    dailyLunchboxClaimPending,
    dailyLunchboxClaimed,
    dailyLunchboxRewardReady,
    persistPendingSummonRecoveryState,
    postTiltBridgeMessage,
    stars,
    syncPendingSummonRecoveryToIframe,
    syncHomepagePointsToIframe,
    syncTiltBridgeStateToIframe,
    totalPoints,
    user?.id,
  ]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    if (shouldHoldStoredSnapshot) {
      console.info('[HomepageHost] Holding fresher local catalog snapshot until the live query contains the pending mystery-test prop.', {
        pendingPropKey: pendingMysteryLaunch?.propKey ?? null,
        requiredCatalogRevision: pendingMysteryLaunch?.requiredCatalogRevision ?? null,
        fetchedSnapshotUpdatedAt: snapshot.updatedAt || null,
        fetchedSnapshotEmpty: snapshot.categories.length === 0 && snapshot.props.length === 0,
        storedSnapshotUpdatedAt: storedSnapshot?.updatedAt || null,
      });
      return;
    }
    persistHomepageCatalogSnapshot(snapshot);
    const frameId = window.requestAnimationFrame(() => {
      setStoredSnapshot(snapshot);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [
    isCatalogLoading,
    pendingMysteryLaunch?.propKey,
    pendingMysteryLaunch?.requiredCatalogRevision,
    shouldHoldStoredSnapshot,
    snapshot,
    storedSnapshot?.updatedAt,
  ]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    const pendingPropKey = pendingMysteryLaunch?.propKey ?? null;
    if (!pendingPropKey) {
      return;
    }
    if (!snapshotContainsPropKey(snapshot, pendingPropKey)) {
      return;
    }
    console.info('[HomepageHost] Live catalog query now contains the pending mystery-test prop.', {
      pendingPropKey,
      snapshotUpdatedAt: snapshot.updatedAt || null,
    });
    const frameId = window.requestAnimationFrame(() => {
      setPendingMysteryLaunch(null);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isCatalogLoading, pendingMysteryLaunch, snapshot]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    try {
      target.postMessage(
        createCreatorCatalogSyncPayload({
          snapshot: effectiveSnapshot,
          publishEnabled: false,
          reason: null,
        }),
        window.location.origin,
      );
    } catch {
      // Ignore early sync failures until the iframe is fully booted.
    }
  }, [effectiveSnapshot, isCatalogLoading]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    postIframeLifecyclePhase(iframe, isActive ? 'resume' : 'pause', {
      reason: isActive ? 'homepage-active' : 'homepage-inactive',
    });
  }, [iframeLoadedState, isActive]);

  const handleLoad = () => {
    setIframeLoaded(true);
    resumeIframeRuntime(iframeRef.current, {
      reason: 'homepage-load',
      soundSettings,
      soundOptions: { homePageActive: isActive },
    });
    syncHomepagePointsToIframe();
    syncTiltBridgeStateToIframe();
    syncPendingSummonRecoveryToIframe();
    if (isCatalogLoading) {
      return;
    }
    try {
      iframeRef.current?.contentWindow?.postMessage(
        createCreatorCatalogSyncPayload({
          snapshot: effectiveSnapshot,
          publishEnabled: false,
          reason: null,
        }),
        window.location.origin,
      );
    } catch {
      // Ignore transient sync failures on early iframe boot.
    }
  };

  useEffect(() => {
    if (!loaderVisible) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLoadTimedOut(true);
    }, HOME_PAGE_HOST_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [loaderVisible]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const shouldHideBottomDock = isActive && loaderVisible;
    document.body.classList.toggle('homepage-host-loading', shouldHideBottomDock);

    return () => {
      document.body.classList.remove('homepage-host-loading');
    };
  }, [isActive, loaderVisible]);

  const handleLoaderFinish = useCallback(() => {
    setIsLoading(false);
    setHasCompletedInitialBoot(true);
    onBootStable?.();
    window.dispatchEvent(new CustomEvent(HOMEPAGE_BOOT_STABLE_EVENT));
  }, [onBootStable]);

  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      teardownIframeElementWhenDisconnected(iframe, { reason: 'homepage-host-unmount' });
      if (iframeRef.current === iframe) {
        iframeRef.current = null;
      }
    };
  }, []);

  return (
    <div className="os-desktop-shell">
      <section className="os-icon-area user-home-os-area" aria-label="Homepage app">
        <div className="user-home-app-shell">
          {loaderVisible && (
            <div className="user-home-app-loading">
              <CinematicLoadingScreen
                mode="boot"
                ready={bootCompletionRequested}
                onFinish={handleLoaderFinish}
                progressOverride={bootProgressValue}
                surface="panel"
              />
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={launchPath}
            title="Homepage App"
            className={`user-home-app-frame ${loaderVisible ? 'is-loading' : ''}`}
            allow="fullscreen; autoplay; microphone; camera; accelerometer; gyroscope"
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
            onLoad={handleLoad}
          />
        </div>
      </section>
    </div>
  );
};

export default UserHomePage;
