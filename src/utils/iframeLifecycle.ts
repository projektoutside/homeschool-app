export const IFRAME_HOST_LIFECYCLE_MESSAGE = 'LAHS_HOST_LIFECYCLE';

export type IframeHostLifecyclePhase = 'pause' | 'prepare-unload' | 'resume';

type LifecycleOptions = {
  origin?: string;
  reason?: string;
};

const DEFAULT_MESSAGE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '*';

const buildLifecycleMessage = (
  phase: IframeHostLifecyclePhase,
  { reason }: LifecycleOptions,
) => ({
  type: IFRAME_HOST_LIFECYCLE_MESSAGE,
  phase,
  reason: reason ?? null,
  timestamp: Date.now(),
});

const pauseMediaElements = (doc: Document) => {
  doc.querySelectorAll<HTMLMediaElement>('audio, video').forEach((element) => {
    try {
      element.muted = true;
      element.pause();
      element.currentTime = 0;
    } catch {
      // Ignore cross-runtime media shutdown failures.
    }
  });
};

export const postIframeLifecyclePhase = (
  iframe: HTMLIFrameElement | null | undefined,
  phase: IframeHostLifecyclePhase,
  options: LifecycleOptions = {},
) => {
  const targetWindow = iframe?.contentWindow;
  if (!targetWindow) {
    return;
  }

  try {
    targetWindow.postMessage(
      buildLifecycleMessage(phase, options),
      options.origin ?? DEFAULT_MESSAGE_ORIGIN,
    );
  } catch {
    // Ignore lifecycle bridge failures and continue with host-side cleanup.
  }
};

export const teardownIframeElement = (
  iframe: HTMLIFrameElement | null | undefined,
  options: LifecycleOptions = {},
) => {
  if (!iframe) {
    return;
  }

  postIframeLifecyclePhase(iframe, 'pause', options);
  postIframeLifecyclePhase(iframe, 'prepare-unload', options);

  const targetWindow = iframe.contentWindow;
  if (targetWindow) {
    try {
      pauseMediaElements(targetWindow.document);
    } catch {
      // Cross-origin iframes may not expose their document.
    }

    try {
      targetWindow.stop?.();
    } catch {
      // Ignore stop failures; about:blank navigation below is the hard reset.
    }
  }

  try {
    iframe.src = 'about:blank';
  } catch {
    // Ignore navigation failures during teardown.
  }

  try {
    iframe.removeAttribute('srcdoc');
  } catch {
    // Ignore cleanup failures on non-srcdoc frames.
  }
};

export const teardownIframeElementWhenDisconnected = (
  iframe: HTMLIFrameElement | null | undefined,
  options: LifecycleOptions = {},
) => {
  if (!iframe) {
    return;
  }

  const finalizeTeardown = () => {
    if (iframe.isConnected) {
      return;
    }
    teardownIframeElement(iframe, options);
  };

  if (typeof window !== 'undefined') {
    window.setTimeout(finalizeTeardown, 0);
    return;
  }

  finalizeTeardown();
};
