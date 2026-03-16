import { useEffect, type RefObject } from 'react';

type ZoomLockOptions = {
  enabled: boolean;
  iframeRefs?: ReadonlyArray<RefObject<HTMLIFrameElement | null>>;
};

const LOCKED_VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

const preventWheelZoom = (event: WheelEvent) => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
  }
};

const preventKeyboardZoom = (event: KeyboardEvent) => {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === '+' || key === '=' || key === '-' || key === '_' || key === '0') {
    event.preventDefault();
  }
};

const preventGestureZoom = (event: Event) => {
  event.preventDefault();
};

const preventTouchPinchZoom = (event: TouchEvent) => {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
};

const applyZoomLockToWindow = (targetWindow: Window | null | undefined): (() => void) => {
  if (!targetWindow) {
    return () => {};
  }

  const { document } = targetWindow;
  const head = document.head;
  if (!head) {
    return () => {};
  }

  let viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const createdViewportMeta = !viewportMeta;
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    head.appendChild(viewportMeta);
  }

  const previousViewportContent = viewportMeta.getAttribute('content');
  viewportMeta.setAttribute('content', LOCKED_VIEWPORT_CONTENT);

  const documentElement = document.documentElement;
  const previousDocumentTouchAction = documentElement.style.touchAction;
  const previousBodyTouchAction = document.body?.style.touchAction ?? '';
  documentElement.style.touchAction = 'manipulation';
  if (document.body) {
    document.body.style.touchAction = 'manipulation';
  }

  targetWindow.addEventListener('wheel', preventWheelZoom, { passive: false });
  targetWindow.addEventListener('keydown', preventKeyboardZoom);
  targetWindow.addEventListener('gesturestart', preventGestureZoom, { passive: false });
  targetWindow.addEventListener('gesturechange', preventGestureZoom, { passive: false });
  targetWindow.addEventListener('gestureend', preventGestureZoom, { passive: false });
  document.addEventListener('touchmove', preventTouchPinchZoom, { passive: false });

  return () => {
    targetWindow.removeEventListener('wheel', preventWheelZoom);
    targetWindow.removeEventListener('keydown', preventKeyboardZoom);
    targetWindow.removeEventListener('gesturestart', preventGestureZoom);
    targetWindow.removeEventListener('gesturechange', preventGestureZoom);
    targetWindow.removeEventListener('gestureend', preventGestureZoom);
    document.removeEventListener('touchmove', preventTouchPinchZoom);

    if (createdViewportMeta) {
      viewportMeta?.remove();
    } else if (viewportMeta) {
      if (previousViewportContent === null) {
        viewportMeta.removeAttribute('content');
      } else {
        viewportMeta.setAttribute('content', previousViewportContent);
      }
    }

    documentElement.style.touchAction = previousDocumentTouchAction;
    if (document.body) {
      document.body.style.touchAction = previousBodyTouchAction;
    }
  };
};

export const useZoomLock = ({ enabled, iframeRefs = [] }: ZoomLockOptions) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const rootCleanup = applyZoomLockToWindow(window);
    const frameCleanupMap = new Map<HTMLIFrameElement, () => void>();

    const applyFrameLock = (iframe: HTMLIFrameElement | null) => {
      if (!iframe?.contentWindow) {
        return;
      }

      frameCleanupMap.get(iframe)?.();
      frameCleanupMap.set(iframe, applyZoomLockToWindow(iframe.contentWindow));
    };

    const frameListeners = iframeRefs
      .map((iframeRef) => iframeRef.current)
      .filter((iframe): iframe is HTMLIFrameElement => Boolean(iframe))
      .map((iframe) => {
        applyFrameLock(iframe);
        const handleLoad = () => applyFrameLock(iframe);
        iframe.addEventListener('load', handleLoad);
        return { iframe, handleLoad };
      });

    return () => {
      rootCleanup();
      frameListeners.forEach(({ iframe, handleLoad }) => {
        iframe.removeEventListener('load', handleLoad);
      });
      frameCleanupMap.forEach((cleanup) => cleanup());
      frameCleanupMap.clear();
    };
  }, [enabled, iframeRefs]);
};
