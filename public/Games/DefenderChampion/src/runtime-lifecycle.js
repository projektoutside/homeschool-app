const safelyCall = (callback) => {
  try {
    callback?.();
  } catch {
    // Lifecycle steps are independent so one unavailable adapter cannot block the rest.
  }
};

const pausedScenesByGame = new WeakMap();

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
        if (pausedScenes.has(scene) || scene.scene.isPaused() || !scene.scene.isActive()) return;
        pausedScenes.add(scene);
        scene.scene.pause();
      });
    } else {
      pausedScenes.forEach((scene) => {
        if (scene.scene.isPaused() || scene.scene.isActive()) scene.scene.resume();
      });
      pausedScenes.clear();
    }
  }
  if (!paused) battleScene?.handleResume?.();
};

export const createRuntimeLifecycle = ({
  windowRef = globalThis.window,
  audioController,
  game,
  hostBridge,
  hud,
  orientationController,
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
