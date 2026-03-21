import { useEffect } from 'react';
import {
  CINEMATIC_FEEDBACK_SURFACE_SELECTOR,
  CINEMATIC_FOCUSABLE_SELECTOR,
  CINEMATIC_PRESSABLE_SELECTOR,
  TEXT_ENTRY_SELECTOR,
  findCinematicFocusableTarget,
  findCinematicPressableTarget,
  hasCinematicFeedbackOptOut,
} from '../utils/interactionFeedbackTargets';

type InputModality = 'keyboard' | 'pointer';

type DocumentController = {
  cleanupFns: Array<() => void>;
  delayedFocusClearId: number | null;
  delayedPressClearId: number | null;
  focusedElement: HTMLElement | null;
  frameCleanups: Map<HTMLIFrameElement, () => void>;
  keyboardPressedElement: HTMLElement | null;
  observer: MutationObserver | null;
  pressedElement: HTMLElement | null;
  styleElement: HTMLStyleElement | null;
};

const STYLE_TAG_ID = 'lahs-cinematic-interaction-feedback';
const EMPTY_SHADOW = '0 0 #0000';
const PRESS_RELEASE_DELAY_MS = 90;
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const FEEDBACK_OPT_OUT_SELECTOR = '[data-cinematic-feedback="off"], [data-cinematic-feedback="off"] *';
const feedbackableSelector = `:is(${CINEMATIC_FOCUSABLE_SELECTOR}):not(${FEEDBACK_OPT_OUT_SELECTOR})`;
const pressableSelector = `:is(${CINEMATIC_PRESSABLE_SELECTOR}):not(${FEEDBACK_OPT_OUT_SELECTOR})`;
const feedbackSurfaceSelector = `:is(${CINEMATIC_FEEDBACK_SURFACE_SELECTOR}):not(${FEEDBACK_OPT_OUT_SELECTOR})`;
const textEntrySelector = `:is(${TEXT_ENTRY_SELECTOR}, select)`;

const FEEDBACK_STYLE = `
${feedbackSurfaceSelector} {
  -webkit-tap-highlight-color: transparent;
}

${feedbackableSelector}:focus,
${feedbackableSelector}:focus-visible,
${pressableSelector}:active {
  outline: none;
}

${feedbackableSelector}[data-cinematic-focus="visible"],
${pressableSelector}[data-cinematic-press="on"] {
  transition-duration: var(--cinematic-feedback-duration, 180ms);
}

${feedbackableSelector}[data-cinematic-focus="visible"] {
  outline: 1px solid var(--cinematic-focus-outline, rgba(125, 211, 252, 0.95));
  outline-offset: var(--cinematic-focus-offset, 3px);
  box-shadow:
    var(--cinematic-base-shadow, ${EMPTY_SHADOW}),
    0 0 0 1px var(--cinematic-focus-outline, rgba(125, 211, 252, 0.95)),
    0 0 0 4px var(--cinematic-focus-glow, rgba(56, 189, 248, 0.24)),
    0 0 24px 2px var(--cinematic-focus-glow-strong, rgba(14, 165, 233, 0.34));
}

${feedbackableSelector}[data-cinematic-focus="visible"]:not(${textEntrySelector}) {
  scale: var(--cinematic-focus-scale, 1.004);
}

${pressableSelector}[data-cinematic-press="on"] {
  box-shadow:
    var(--cinematic-base-shadow, ${EMPTY_SHADOW}),
    0 14px 28px -18px var(--cinematic-press-shadow, rgba(15, 23, 42, 0.42)),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  scale: var(--cinematic-press-scale, 0.992);
}

${feedbackableSelector}[data-cinematic-focus="visible"][data-cinematic-press="on"] {
  box-shadow:
    var(--cinematic-base-shadow, ${EMPTY_SHADOW}),
    0 0 0 1px var(--cinematic-focus-outline, rgba(125, 211, 252, 0.95)),
    0 0 0 4px var(--cinematic-focus-glow, rgba(56, 189, 248, 0.24)),
    0 0 24px 2px var(--cinematic-focus-glow-strong, rgba(14, 165, 233, 0.34)),
    0 14px 28px -18px var(--cinematic-press-shadow, rgba(15, 23, 42, 0.42)),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  ${feedbackableSelector}[data-cinematic-focus="visible"],
  ${pressableSelector}[data-cinematic-press="on"] {
    scale: 1;
  }
}
`;

const getWindowForDocument = (doc: Document): Window | null => {
  try {
    return doc.defaultView ?? null;
  } catch {
    return null;
  }
};

const normalizeShadowValue = (shadowValue: string): string => {
  if (!shadowValue || shadowValue === 'none') {
    return EMPTY_SHADOW;
  }

  return shadowValue;
};

const clearTimeoutForDocument = (doc: Document, timeoutId: number | null) => {
  if (timeoutId === null) {
    return;
  }

  const targetWindow = getWindowForDocument(doc);
  if (targetWindow) {
    targetWindow.clearTimeout(timeoutId);
  }
};

const collectIframesFromNode = (node: Node): HTMLIFrameElement[] => {
  if (node.nodeType !== 1) {
    return [];
  }

  const element = node as Element;
  const iframes = Array.from(element.querySelectorAll('iframe'));
  if (element.tagName === 'IFRAME') {
    iframes.unshift(element as HTMLIFrameElement);
  }

  return iframes;
};

const isKeyboardModalityKey = (event: KeyboardEvent): boolean => {
  return !MODIFIER_KEYS.has(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey;
};

const isActivationKey = (event: KeyboardEvent): boolean => {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
};

export const useCinematicInteractionFeedback = (): void => {
  useEffect(() => {
    const controllers = new Map<Document, DocumentController>();

    const releaseSnapshotIfIdle = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      if (
        element.dataset.cinematicFocus === 'visible'
        || element.dataset.cinematicPress === 'on'
      ) {
        return;
      }

      element.style.removeProperty('--cinematic-base-shadow');
    };

    const ensureBaseShadowSnapshot = (element: HTMLElement) => {
      if (element.style.getPropertyValue('--cinematic-base-shadow')) {
        return;
      }

      const ownerWindow = element.ownerDocument.defaultView;
      element.style.setProperty(
        '--cinematic-base-shadow',
        normalizeShadowValue(ownerWindow?.getComputedStyle(element).boxShadow ?? EMPTY_SHADOW),
      );
    };

    const clearFocusElement = (controller: DocumentController) => {
      const current = controller.focusedElement;
      if (!current) {
        return;
      }

      delete current.dataset.cinematicFocus;
      controller.focusedElement = null;
      releaseSnapshotIfIdle(current);
    };

    const setFocusElement = (
      controller: DocumentController,
      element: HTMLElement | null,
      modality: InputModality,
    ) => {
      if (
        !element
        || modality !== 'keyboard'
        || hasCinematicFeedbackOptOut(element)
      ) {
        clearFocusElement(controller);
        return;
      }

      if (controller.focusedElement === element) {
        element.dataset.cinematicFocus = 'visible';
        return;
      }

      clearFocusElement(controller);
      ensureBaseShadowSnapshot(element);
      element.dataset.cinematicFocus = 'visible';
      controller.focusedElement = element;
    };

    const clearPressedElement = (controller: DocumentController) => {
      const current = controller.pressedElement;
      if (!current) {
        return;
      }

      delete current.dataset.cinematicPress;
      controller.pressedElement = null;
      releaseSnapshotIfIdle(current);
    };

    const setPressedElement = (controller: DocumentController, element: HTMLElement | null) => {
      if (!element || hasCinematicFeedbackOptOut(element)) {
        clearPressedElement(controller);
        return;
      }

      if (controller.pressedElement === element) {
        element.dataset.cinematicPress = 'on';
        return;
      }

      clearPressedElement(controller);
      ensureBaseShadowSnapshot(element);
      element.dataset.cinematicPress = 'on';
      controller.pressedElement = element;
    };

    const schedulePressedElementClear = (doc: Document, controller: DocumentController, delay = PRESS_RELEASE_DELAY_MS) => {
      clearTimeoutForDocument(doc, controller.delayedPressClearId);

      const targetWindow = getWindowForDocument(doc);
      if (!targetWindow) {
        clearPressedElement(controller);
        controller.delayedPressClearId = null;
        return;
      }

      controller.delayedPressClearId = targetWindow.setTimeout(() => {
        controller.delayedPressClearId = null;
        clearPressedElement(controller);
      }, delay);
    };

    const setInputModality = (doc: Document, modality: InputModality) => {
      doc.documentElement?.setAttribute('data-cinematic-input-modality', modality);
    };

    const getInputModality = (doc: Document): InputModality => {
      return doc.documentElement?.getAttribute('data-cinematic-input-modality') === 'keyboard'
        ? 'keyboard'
        : 'pointer';
    };

    const syncFocusFromActiveElement = (doc: Document, controller: DocumentController) => {
      const focusTarget = findCinematicFocusableTarget(doc.activeElement);
      setFocusElement(controller, focusTarget, getInputModality(doc));
    };

    const attachDocument = (doc: Document): void => {
      if (controllers.has(doc)) {
        return;
      }

      const styleElement = doc.createElement('style');
      styleElement.id = STYLE_TAG_ID;
      styleElement.textContent = FEEDBACK_STYLE;
      (doc.head ?? doc.documentElement).appendChild(styleElement);

      const controller: DocumentController = {
        cleanupFns: [],
        delayedFocusClearId: null,
        delayedPressClearId: null,
        focusedElement: null,
        frameCleanups: new Map(),
        keyboardPressedElement: null,
        observer: null,
        pressedElement: null,
        styleElement,
      };

      controllers.set(doc, controller);
      setInputModality(doc, 'pointer');

      const registerIframe = (iframe: HTMLIFrameElement) => {
        if (controller.frameCleanups.has(iframe)) {
          return;
        }

        let childDocument: Document | null = null;
        const attachFrameDocument = () => {
          let nextDocument: Document | null = null;

          try {
            nextDocument = iframe.contentDocument ?? null;
          } catch {
            nextDocument = null;
          }

          if (childDocument && childDocument !== nextDocument) {
            detachDocument(childDocument);
          }

          childDocument = nextDocument;
          if (nextDocument) {
            attachDocument(nextDocument);
          }
        };

        const handleLoad = () => {
          attachFrameDocument();
        };

        iframe.addEventListener('load', handleLoad);
        controller.frameCleanups.set(iframe, () => {
          iframe.removeEventListener('load', handleLoad);
          if (childDocument) {
            detachDocument(childDocument);
            childDocument = null;
          }
        });

        attachFrameDocument();
      };

      const unregisterIframe = (iframe: HTMLIFrameElement) => {
        const cleanup = controller.frameCleanups.get(iframe);
        if (!cleanup) {
          return;
        }

        cleanup();
        controller.frameCleanups.delete(iframe);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isKeyboardModalityKey(event)) {
          return;
        }

        setInputModality(doc, 'keyboard');
        syncFocusFromActiveElement(doc, controller);

        if (event.repeat || !isActivationKey(event)) {
          return;
        }

        const pressTarget = findCinematicPressableTarget(doc.activeElement);
        if (!pressTarget) {
          return;
        }

        controller.keyboardPressedElement = pressTarget;
        setPressedElement(controller, pressTarget);
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (!isActivationKey(event)) {
          return;
        }

        if (!controller.keyboardPressedElement) {
          return;
        }

        controller.keyboardPressedElement = null;
        schedulePressedElementClear(doc, controller);
      };

      const handlePointerDown = (event: Event) => {
        setInputModality(doc, 'pointer');
        clearFocusElement(controller);

        const pressTarget = findCinematicPressableTarget(event.target);
        setPressedElement(controller, pressTarget);
      };

      const handlePointerRelease = () => {
        controller.keyboardPressedElement = null;
        schedulePressedElementClear(doc, controller);
      };

      const handleFocusIn = (event: FocusEvent) => {
        const focusTarget = findCinematicFocusableTarget(event.target);
        setFocusElement(controller, focusTarget, getInputModality(doc));
      };

      const handleFocusOut = (event: FocusEvent) => {
        if (controller.focusedElement !== event.target) {
          return;
        }

        clearTimeoutForDocument(doc, controller.delayedFocusClearId);
        const targetWindow = getWindowForDocument(doc);
        if (!targetWindow) {
          clearFocusElement(controller);
          controller.delayedFocusClearId = null;
          return;
        }

        controller.delayedFocusClearId = targetWindow.setTimeout(() => {
          controller.delayedFocusClearId = null;
          syncFocusFromActiveElement(doc, controller);
        }, 0);
      };

      const handleWindowBlur = () => {
        controller.keyboardPressedElement = null;
        clearFocusElement(controller);
        clearPressedElement(controller);
      };

      doc.addEventListener('keydown', handleKeyDown, true);
      doc.addEventListener('keyup', handleKeyUp, true);
      doc.addEventListener('focusin', handleFocusIn, true);
      doc.addEventListener('focusout', handleFocusOut, true);
      controller.cleanupFns.push(() => doc.removeEventListener('keydown', handleKeyDown, true));
      controller.cleanupFns.push(() => doc.removeEventListener('keyup', handleKeyUp, true));
      controller.cleanupFns.push(() => doc.removeEventListener('focusin', handleFocusIn, true));
      controller.cleanupFns.push(() => doc.removeEventListener('focusout', handleFocusOut, true));

      const targetWindow = getWindowForDocument(doc);
      if (targetWindow) {
        const supportsPointerEvents = 'PointerEvent' in targetWindow;
        const pointerDownEvent = supportsPointerEvents ? 'pointerdown' : 'mousedown';
        const pointerUpEvent = supportsPointerEvents ? 'pointerup' : 'mouseup';
        const pointerCancelEvent = supportsPointerEvents ? 'pointercancel' : 'mouseleave';

        doc.addEventListener(pointerDownEvent, handlePointerDown, true);
        doc.addEventListener(pointerUpEvent, handlePointerRelease, true);
        doc.addEventListener(pointerCancelEvent, handlePointerRelease, true);
        targetWindow.addEventListener('blur', handleWindowBlur);

        controller.cleanupFns.push(() => doc.removeEventListener(pointerDownEvent, handlePointerDown, true));
        controller.cleanupFns.push(() => doc.removeEventListener(pointerUpEvent, handlePointerRelease, true));
        controller.cleanupFns.push(() => doc.removeEventListener(pointerCancelEvent, handlePointerRelease, true));
        controller.cleanupFns.push(() => targetWindow.removeEventListener('blur', handleWindowBlur));
      }

      controller.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            collectIframesFromNode(node).forEach(registerIframe);
          });

          mutation.removedNodes.forEach((node) => {
            collectIframesFromNode(node).forEach(unregisterIframe);
          });
        });
      });

      if (doc.documentElement) {
        controller.observer.observe(doc.documentElement, {
          childList: true,
          subtree: true,
        });
      }

      doc.querySelectorAll('iframe').forEach(registerIframe);
      syncFocusFromActiveElement(doc, controller);
    };

    const detachDocument = (doc: Document) => {
      const controller = controllers.get(doc);
      if (!controller) {
        return;
      }

      controller.frameCleanups.forEach((cleanup) => cleanup());
      controller.frameCleanups.clear();
      controller.cleanupFns.forEach((cleanup) => cleanup());
      controller.cleanupFns = [];
      controller.observer?.disconnect();
      controller.observer = null;
      clearTimeoutForDocument(doc, controller.delayedFocusClearId);
      clearTimeoutForDocument(doc, controller.delayedPressClearId);
      controller.delayedFocusClearId = null;
      controller.delayedPressClearId = null;
      clearFocusElement(controller);
      clearPressedElement(controller);
      controller.styleElement?.remove();
      controllers.delete(doc);
    };

    attachDocument(document);

    return () => {
      detachDocument(document);
    };
  }, []);
};
