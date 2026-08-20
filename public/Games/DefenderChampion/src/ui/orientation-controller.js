const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const GAME_ID = 'defender-champion';
const ORIENTATION_REQUEST_MESSAGE = 'LAHS_GAME_ORIENTATION_REQUEST';
const ORIENTATION_RESULT_MESSAGE = 'LAHS_GAME_ORIENTATION_RESULT';

const isPortraitViewport = (windowRef) => {
  const width = Number(windowRef?.innerWidth);
  const height = Number(windowRef?.innerHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return true;
  return height >= width;
};

export const createOrientationController = ({
  windowRef = globalThis.window,
  documentRef = globalThis.document,
  hostBridge,
} = {}) => {
  const overlay = documentRef?.getElementById?.('portrait-lock-screen') ?? null;
  const shell = documentRef?.getElementById?.('game-shell') ?? null;
  const documentElement = documentRef?.documentElement ?? null;
  let portrait = true;
  let returnFocus = null;
  let started = false;
  let lockRequested = false;
  let lockSource = null;
  let lockRequestEpoch = 0;
  let hasSynced = false;
  let nextRequestId = 1;

  const getHostTarget = () => {
    try {
      const origin = windowRef?.location?.origin;
      const parentRef = windowRef?.parent;
      if (!origin || origin === 'null' || !parentRef || parentRef === windowRef) return null;
      if (parentRef.location?.origin !== origin) return null;
      return { origin, parentRef };
    } catch {
      return null;
    }
  };

  const sendHostRequest = (action, { awaitResult = false } = {}) => {
    const target = getHostTarget();
    if (!target) return awaitResult ? Promise.resolve(false) : false;
    const requestId = `${GAME_ID}-${nextRequestId++}`;
    const payload = {
      action,
      gameId: GAME_ID,
      orientation: 'portrait',
      requestId,
      type: ORIENTATION_REQUEST_MESSAGE,
    };
    if (!awaitResult) {
      try {
        target.parentRef.postMessage(payload, target.origin);
        return true;
      } catch {
        return false;
      }
    }
    return new Promise((resolve) => {
      const clearTimer = windowRef?.clearTimeout?.bind?.(windowRef) ?? globalThis.clearTimeout;
      const setTimer = windowRef?.setTimeout?.bind?.(windowRef) ?? globalThis.setTimeout;
      let settled = false;
      let timeoutId;
      const finish = (success) => {
        if (settled) return;
        settled = true;
        clearTimer(timeoutId);
        windowRef?.removeEventListener?.('message', handleResult);
        resolve(Boolean(success));
      };
      const handleResult = (event) => {
        if (event?.source !== target.parentRef || event?.origin !== target.origin
          || event?.data?.type !== ORIENTATION_RESULT_MESSAGE
          || event?.data?.requestId !== requestId) return;
        finish(event.data.supported === true && event.data.success === true);
      };
      timeoutId = setTimer(() => finish(false), 400);
      windowRef?.addEventListener?.('message', handleResult);
      try {
        target.parentRef.postMessage(payload, target.origin);
      } catch {
        finish(false);
      }
    });
  };

  const getFocusable = () => Array.from(overlay?.querySelectorAll?.(FOCUSABLE_SELECTOR) ?? [])
    .filter((element) => !element.disabled && !element.hidden);

  const focusOverlay = () => {
    if (overlay?.hidden) return;
    overlay?.focus?.();
  };

  const sync = () => {
    const nextPortrait = isPortraitViewport(windowRef);
    const enteringLandscape = !nextPortrait && portrait;
    const returningPortrait = nextPortrait && !portrait;
    if (hasSynced && !enteringLandscape && !returningPortrait) return;
    hasSynced = true;
    portrait = nextPortrait;
    if (enteringLandscape) returnFocus = documentRef?.activeElement ?? returnFocus;
    if (overlay) overlay.hidden = portrait;
    if (shell) shell.inert = !portrait;
    if (documentElement?.dataset) {
      documentElement.dataset.orientation = portrait ? 'portrait' : 'landscape';
    }
    hostBridge?.setOrientationPaused?.(!portrait);
    if (enteringLandscape) focusOverlay();
    else if (returningPortrait && returnFocus?.isConnected !== false) returnFocus?.focus?.();
  };

  const handleTrapKeydown = (event) => {
    if (portrait || overlay?.hidden || event.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      overlay?.focus?.();
      return;
    }
    if (focusable.length === 1) {
      event.preventDefault();
      focusable[0].focus?.();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    const current = documentRef?.activeElement;
    if (event.shiftKey && (current === first || !overlay.contains?.(current))) {
      event.preventDefault();
      last.focus?.();
    } else if (!event.shiftKey && (current === last || !overlay.contains?.(current))) {
      event.preventDefault();
      first.focus?.();
    }
  };

  const requestPortraitLock = async () => {
    const requestEpoch = ++lockRequestEpoch;
    if (await sendHostRequest('request', { awaitResult: true })) {
      if (requestEpoch !== lockRequestEpoch) {
        sendHostRequest('release');
        return false;
      }
      lockSource = 'host';
      return true;
    }
    if (requestEpoch !== lockRequestEpoch) return false;
    const lock = windowRef?.screen?.orientation?.lock;
    if (typeof lock !== 'function') return false;
    try {
      await lock.call(windowRef.screen.orientation, 'portrait');
      if (requestEpoch !== lockRequestEpoch) {
        try {
          windowRef?.screen?.orientation?.unlock?.();
        } catch {
          // The stale request is already cancelled even when unlock is unavailable.
        }
        return false;
      }
      lockSource = 'browser';
      return true;
    } catch {
      return false;
    }
  };

  const releasePortraitLock = () => {
    lockRequestEpoch += 1;
    if (lockSource === 'host') sendHostRequest('release');
    else if (lockSource === 'browser') {
      try {
        windowRef?.screen?.orientation?.unlock?.();
      } catch {
        // An unavailable unlock is already the browser fallback state.
      }
    } else if (getHostTarget()) sendHostRequest('release');
    lockSource = null;
  };

  const handleFirstGesture = () => {
    if (lockRequested) return;
    lockRequested = true;
    void requestPortraitLock();
  };

  const start = () => {
    if (started) return;
    started = true;
    windowRef?.addEventListener?.('resize', sync);
    windowRef?.addEventListener?.('orientationchange', sync);
    windowRef?.addEventListener?.('pointerdown', handleFirstGesture);
    windowRef?.addEventListener?.('keydown', handleFirstGesture);
    documentRef?.addEventListener?.('keydown', handleTrapKeydown);
    sync();
  };

  const stop = () => {
    const wasPortrait = portrait;
    if (started) {
      started = false;
      windowRef?.removeEventListener?.('resize', sync);
      windowRef?.removeEventListener?.('orientationchange', sync);
      windowRef?.removeEventListener?.('pointerdown', handleFirstGesture);
      windowRef?.removeEventListener?.('keydown', handleFirstGesture);
      documentRef?.removeEventListener?.('keydown', handleTrapKeydown);
    }
    releasePortraitLock();
    if (overlay) overlay.hidden = true;
    if (shell) shell.inert = false;
    if (documentElement?.dataset) documentElement.dataset.orientation = 'portrait';
    if (!wasPortrait) hostBridge?.setOrientationPaused?.(false);
    hasSynced = false;
    portrait = true;
  };

  return Object.freeze({
    getState: () => ({ portrait }),
    releasePortraitLock,
    requestPortraitLock,
    start,
    stop,
  });
};
