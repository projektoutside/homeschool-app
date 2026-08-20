const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
  let hasSynced = false;

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
    try {
      await windowRef?.screen?.orientation?.lock?.('portrait');
      return true;
    } catch {
      return false;
    }
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
    if (!started) return;
    started = false;
    const wasPortrait = portrait;
    windowRef?.removeEventListener?.('resize', sync);
    windowRef?.removeEventListener?.('orientationchange', sync);
    windowRef?.removeEventListener?.('pointerdown', handleFirstGesture);
    windowRef?.removeEventListener?.('keydown', handleFirstGesture);
    documentRef?.removeEventListener?.('keydown', handleTrapKeydown);
    if (overlay) overlay.hidden = true;
    if (shell) shell.inert = false;
    if (documentElement?.dataset) documentElement.dataset.orientation = 'portrait';
    if (!wasPortrait) hostBridge?.setOrientationPaused?.(false);
    hasSynced = false;
    portrait = true;
  };

  return Object.freeze({
    getState: () => ({ portrait }),
    requestPortraitLock,
    start,
    stop,
  });
};
