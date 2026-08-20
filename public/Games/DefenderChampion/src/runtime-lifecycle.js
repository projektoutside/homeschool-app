const safelyCall = (callback) => {
  try {
    callback?.();
  } catch {
    // Lifecycle steps are independent so one unavailable adapter cannot block the rest.
  }
};

const pausedScenesByGame = new WeakMap();

const isScenePaused = (scene) => (
  scene?.sys?.isPaused?.() ?? scene?.scene?.isPaused?.() ?? false
);

const isSceneActive = (scene) => (
  scene?.sys?.isActive?.() ?? scene?.scene?.isActive?.() ?? false
);

const pauseSceneImmediately = (scene) => {
  if (typeof scene?.sys?.pause === 'function') scene.sys.pause();
  else scene?.scene?.pause?.();
};

const resumeSceneImmediately = (scene) => {
  if (typeof scene?.sys?.resume === 'function') scene.sys.resume();
  else scene?.scene?.resume?.();
};

export const applyRuntimePauseState = ({
  battleScene,
  game,
  paused = false,
  reasons = [],
} = {}) => {
  battleScene?.setExternalPauseReasons?.(reasons);
  if (game) {
    let pausedScenes = pausedScenesByGame.get(game);
    if (!pausedScenes) {
      pausedScenes = new Set();
      pausedScenesByGame.set(game, pausedScenes);
    }
    if (paused) {
      game.scene?.scenes?.forEach((scene) => {
        if (pausedScenes.has(scene) || isScenePaused(scene) || !isSceneActive(scene)) return;
        pausedScenes.add(scene);
        pauseSceneImmediately(scene);
      });
    } else {
      pausedScenes.forEach((scene) => {
        if (isScenePaused(scene) || isSceneActive(scene)) resumeSceneImmediately(scene);
      });
      pausedScenes.clear();
    }
  }
  if (!paused) battleScene?.handleResume?.();
};

export const createRuntimePauseReplay = ({
  game,
  getBattleScene = () => null,
  getPauseState = () => ({ paused: false, reasons: [] }),
} = {}) => {
  let started = false;
  const sceneListeners = new Map();

  const sync = () => {
    const state = getPauseState?.() ?? { paused: false, reasons: [] };
    applyRuntimePauseState({
      battleScene: getBattleScene?.() ?? null,
      game,
      paused: Boolean(state.paused),
      reasons: Array.isArray(state.reasons) ? state.reasons : [],
    });
    return state;
  };

  const start = () => {
    if (started) return;
    started = true;
    for (const scene of game?.scene?.scenes ?? []) {
      const listener = () => {
        pausedScenesByGame.get(game)?.delete(scene);
        sync();
      };
      scene?.sys?.events?.on?.('create', listener);
      sceneListeners.set(scene, listener);
    }
    sync();
  };

  const destroy = () => {
    if (!started) return;
    started = false;
    for (const [scene, listener] of sceneListeners) {
      scene?.sys?.events?.off?.('create', listener);
    }
    sceneListeners.clear();
  };

  return Object.freeze({ destroy, start, sync });
};

export const createRuntimeLifecycle = ({
  windowRef = globalThis.window,
  audioController,
  game,
  hostBridge,
  hud,
  orientationController,
  pauseReplayCleanup,
} = {}) => {
  let bfcacheSuspended = false;
  let destroyed = false;

  const shutdownActiveScenes = () => {
    for (const scene of game?.scene?.scenes ?? []) {
      if (scene?.scene?.isActive?.() || scene?.scene?.isPaused?.()) {
        safelyCall(() => scene.scene.stop());
      }
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    windowRef?.removeEventListener?.('pagehide', handlePageHide);
    windowRef?.removeEventListener?.('pageshow', handlePageShow);
    safelyCall(() => pauseReplayCleanup?.());
    shutdownActiveScenes();
    safelyCall(() => hostBridge?.cleanup?.());
    safelyCall(() => orientationController?.stop?.());
    safelyCall(() => hud?.destroy?.());
    safelyCall(() => game?.destroy?.(true));
  };

  const handlePageHide = (event) => {
    if (destroyed) return;
    if (!event?.persisted) {
      destroy();
      return;
    }
    if (bfcacheSuspended) return;
    bfcacheSuspended = true;
    safelyCall(() => audioController?.setPauseReason?.('bfcache', true));
    safelyCall(() => game?.loop?.sleep?.());
  };

  const handlePageShow = (event) => {
    if (destroyed || !event?.persisted || !bfcacheSuspended) return;
    bfcacheSuspended = false;
    safelyCall(() => game?.loop?.wake?.());
    safelyCall(() => game?.scale?.refresh?.());
    safelyCall(() => hud?.reconcile?.());
    safelyCall(() => audioController?.setPauseReason?.('bfcache', false));
  };

  windowRef?.addEventListener?.('pagehide', handlePageHide);
  windowRef?.addEventListener?.('pageshow', handlePageShow);

  return Object.freeze({
    destroy,
    prepareUnload: destroy,
    getState: () => ({ bfcacheSuspended, destroyed }),
  });
};
