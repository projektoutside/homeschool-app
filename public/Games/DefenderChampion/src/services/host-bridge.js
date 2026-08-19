import { getCrossedMedalRanks } from '../core/scoring.js';

const GAME_ID = 'defender-champion';
const HOST_LIFECYCLE_MESSAGE = 'LAHS_HOST_LIFECYCLE';
const GAME_EXIT_TO_HOME_MESSAGE = 'LAHS_GAME_EXIT_TO_HOME';
const SOUND_SETTINGS_MESSAGE = 'APP_SOUND_SETTINGS_UPDATE';
const PAUSE_REASON_ORDER = Object.freeze(['host', 'visibility', 'manual', 'modal']);
const MEDAL_ORDER = Object.freeze(['bronze', 'silver', 'gold']);
const VALID_LEVEL_ID = /^level-(?:[1-9]|10)$/;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const getOrigin = (location) => {
  try {
    const origin = location?.origin || new URL(location?.href).origin;
    return origin && origin !== 'null' ? origin : null;
  } catch {
    return null;
  }
};

const isQaMode = (location) => {
  try {
    return new URLSearchParams(location?.search ?? new URL(location?.href).search).get('qa') === '1';
  } catch {
    return false;
  }
};

const resolveSameOriginParent = (windowRef, origin) => {
  try {
    if (!windowRef?.parent || windowRef.parent === windowRef || !origin) return null;
    return windowRef.parent.location?.origin === origin ? windowRef.parent : null;
  } catch {
    return null;
  }
};

const medalRank = (medal) => MEDAL_ORDER.indexOf(medal);

export const createHostBridge = ({
  windowRef = globalThis.window,
  documentRef = globalThis.document,
  saveStore = null,
  pointsBridge = windowRef?.LAHSPointsBridge,
  audioController = null,
  onPauseChange,
  onPrepareUnload,
} = {}) => {
  const origin = getOrigin(windowRef?.location);
  const parentRef = resolveSameOriginParent(windowRef, origin);
  const qaMode = isQaMode(windowRef?.location);
  const pauseReasons = new Set();
  let destroyed = false;
  let rewardsBridgeHealthy = typeof pointsBridge?.init === 'function'
    && typeof pointsBridge?.awardPoints === 'function';
  let lastPaused = false;

  const getPauseState = () => ({
    paused: pauseReasons.size > 0,
    reasons: PAUSE_REASON_ORDER.filter((reason) => pauseReasons.has(reason)),
  });

  const syncPause = () => {
    const snapshot = getPauseState();
    try {
      audioController?.setPaused?.(snapshot.paused);
    } catch {
      // Audio failures cannot interrupt lifecycle handling.
    }
    if (snapshot.paused !== lastPaused) {
      lastPaused = snapshot.paused;
      try {
        onPauseChange?.(snapshot);
      } catch {
        // Consumer callbacks are isolated from bridge state.
      }
    }
  };

  const setPauseReason = (reason, active) => {
    if (destroyed || !PAUSE_REASON_ORDER.includes(reason)) return;
    if (active) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    syncPause();
  };

  const setManualPaused = (paused) => setPauseReason('manual', Boolean(paused));
  const setModalPaused = (paused) => setPauseReason('modal', Boolean(paused));

  const isTrustedHostMessage = (event) => {
    if (!event || !origin || event.origin !== origin) return false;
    const expectedSource = parentRef ?? windowRef;
    return event.source === expectedSource;
  };

  const applySoundSettings = (payload) => {
    if (!isRecord(payload)) return;
    try {
      if (typeof payload.muted === 'boolean') audioController?.setAudioMuted?.(payload.muted);
      if (typeof payload.musicVolume === 'number') audioController?.setMusicVolume?.(payload.musicVolume);
      if (typeof payload.sfxVolume === 'number') audioController?.setSfxVolume?.(payload.sfxVolume);
    } catch {
      // Malformed or unsupported audio controls degrade to silence.
    }
  };

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    try {
      onPrepareUnload?.();
    } catch {
      // Runtime teardown remains isolated from host listener cleanup.
    }
    pauseReasons.add('host');
    syncPause();
    windowRef?.removeEventListener?.('message', handleHostMessage);
    documentRef?.removeEventListener?.('visibilitychange', handleVisibilityChange);
    try {
      audioController?.destroy?.();
    } catch {
      // Teardown must remain safe after partial initialization.
    }
  };

  const handleHostMessage = (event) => {
    if (destroyed || !isTrustedHostMessage(event) || !isRecord(event.data)) return;
    if (event.data.type === SOUND_SETTINGS_MESSAGE) {
      applySoundSettings(event.data.payload);
      return;
    }
    if (event.data.type !== HOST_LIFECYCLE_MESSAGE) return;
    if (event.data.phase === 'pause') setPauseReason('host', true);
    else if (event.data.phase === 'resume') setPauseReason('host', false);
    else if (event.data.phase === 'prepare-unload') cleanup();
  };

  const handleVisibilityChange = () => {
    setPauseReason('visibility', Boolean(documentRef?.hidden));
  };

  const recordBattleResult = ({ levelId, score, medal, highestUnlockedLevel } = {}) => {
    const currentState = saveStore?.getState?.();
    if (destroyed || !currentState || !VALID_LEVEL_ID.test(levelId) || medalRank(medal) < 0) {
      return {
        state: currentState ?? null,
        persisted: false,
        rewardsDisabled: true,
        crossedMedalRanks: [],
      };
    }

    const previousLevel = currentState.levels[levelId];
    const previousMedal = previousLevel?.medal ?? 'none';
    const bestMedal = medalRank(medal) > medalRank(previousMedal) ? medal : previousMedal;
    const bestScore = Math.max(
      Number.isFinite(previousLevel?.bestScore) ? previousLevel.bestScore : 0,
      Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0,
    );
    const nextHighestUnlocked = Number.isFinite(highestUnlockedLevel)
      ? Math.max(currentState.highestUnlockedLevel, Math.floor(highestUnlockedLevel))
      : currentState.highestUnlockedLevel;
    const nextState = {
      ...currentState,
      highestUnlockedLevel: nextHighestUnlocked,
      levels: {
        ...currentState.levels,
        [levelId]: { bestScore, medal: bestMedal },
      },
    };
    const saveResult = saveStore.save(nextState);
    const crossedMedalRanks = getCrossedMedalRanks(previousMedal, bestMedal);
    let rewardsDisabled = qaMode
      || !saveResult.persisted
      || saveResult.rewardsDisabled
      || !rewardsBridgeHealthy;

    if (!rewardsDisabled) {
      for (const crossedMedal of crossedMedalRanks) {
        try {
          const awardResult = pointsBridge.awardPoints(5, {
            eventId: `${GAME_ID}:${levelId}:medal-${crossedMedal}`,
            label: `${crossedMedal[0].toUpperCase()}${crossedMedal.slice(1)} Medal`,
            meta: { levelId, medal: crossedMedal },
          });
          if (!awardResult || typeof awardResult.then === 'function') {
            awardResult?.catch?.(() => {});
            rewardsBridgeHealthy = false;
            break;
          }
        } catch {
          rewardsBridgeHealthy = false;
          break;
        }
      }
      rewardsDisabled = !rewardsBridgeHealthy;
    }

    return {
      ...saveResult,
      rewardsDisabled,
      crossedMedalRanks,
    };
  };

  const exit = () => {
    if (destroyed) return false;
    if (parentRef && origin) {
      try {
        parentRef.postMessage({ type: GAME_EXIT_TO_HOME_MESSAGE, tab: 'games' }, origin);
        return true;
      } catch {
        // Use the standalone fallback if host messaging fails.
      }
    }

    try {
      const referrer = documentRef?.referrer ? new URL(documentRef.referrer) : null;
      if (referrer?.origin === origin && windowRef.history?.length > 1) {
        windowRef.history.back();
        return true;
      }
    } catch {
      // Invalid referrers are treated as unsafe.
    }

    try {
      windowRef.location.assign(new URL('../../', windowRef.location.href).href);
      return true;
    } catch {
      return false;
    }
  };

  windowRef?.addEventListener?.('message', handleHostMessage);
  documentRef?.addEventListener?.('visibilitychange', handleVisibilityChange);
  if (documentRef?.hidden) pauseReasons.add('visibility');
  try {
    pointsBridge?.init?.({ gameId: GAME_ID });
  } catch {
    rewardsBridgeHealthy = false;
  }
  syncPause();

  return Object.freeze({
    cleanup,
    exit,
    getPauseState,
    getState: () => ({
      destroyed,
      embedded: Boolean(parentRef),
      qaMode,
      rewardsDisabled: destroyed
        || qaMode
        || !rewardsBridgeHealthy
        || Boolean(saveStore?.rewardsDisabled?.()),
      ...getPauseState(),
    }),
    recordBattleResult,
    setManualPaused,
    setModalPaused,
  });
};
