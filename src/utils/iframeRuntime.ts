import type { SoundSettings } from '../context/SoundSettingsContext';
import { postIframeLifecyclePhase } from './iframeLifecycle';
import { getFullscreenElement, requestElementFullscreen } from './fullscreen';
import { applySoundSettingsToWindow } from './soundSettings';

type SyncIframeSoundOptions = {
  homePageActive?: boolean;
};

type ResumeIframeRuntimeOptions = {
  reason: string;
  origin?: string;
  soundSettings?: SoundSettings;
  soundOptions?: SyncIframeSoundOptions;
};

const iframeFullscreenInteractionCleanup = new WeakMap<HTMLIFrameElement, () => void>();

const syncIframeFullscreenOnInteraction = (
  iframe: HTMLIFrameElement | null | undefined,
): void => {
  if (!iframe) {
    return;
  }

  const existingCleanup = iframeFullscreenInteractionCleanup.get(iframe);
  if (existingCleanup) {
    existingCleanup();
    iframeFullscreenInteractionCleanup.delete(iframe);
  }

  const targetWindow = iframe.contentWindow;
  const hostDocument = iframe.ownerDocument;
  if (!targetWindow || !hostDocument?.documentElement) {
    return;
  }

  let targetDocument: Document;
  try {
    targetDocument = targetWindow.document;
  } catch {
    return;
  }

  let lastAttemptAt = 0;
  const maybeEnterFullscreen = (event: Event) => {
    if (getFullscreenElement(hostDocument)) {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      return;
    }

    const now = Date.now();
    if (now - lastAttemptAt < 250) {
      return;
    }

    lastAttemptAt = now;
    void requestElementFullscreen(hostDocument.documentElement);
  };

  const pointerHandler = (event: Event) => {
    maybeEnterFullscreen(event);
  };

  const keyHandler = (event: KeyboardEvent) => {
    maybeEnterFullscreen(event);
  };

  targetDocument.addEventListener('pointerdown', pointerHandler, true);
  targetDocument.addEventListener('touchstart', pointerHandler, true);
  targetDocument.addEventListener('mousedown', pointerHandler, true);
  targetDocument.addEventListener('keydown', keyHandler, true);

  iframeFullscreenInteractionCleanup.set(iframe, () => {
    targetDocument.removeEventListener('pointerdown', pointerHandler, true);
    targetDocument.removeEventListener('touchstart', pointerHandler, true);
    targetDocument.removeEventListener('mousedown', pointerHandler, true);
    targetDocument.removeEventListener('keydown', keyHandler, true);
  });
};

export const syncIframeSoundSettings = (
  iframe: HTMLIFrameElement | null | undefined,
  soundSettings: SoundSettings,
  options?: SyncIframeSoundOptions,
): void => {
  applySoundSettingsToWindow(iframe?.contentWindow, soundSettings, options);
};

export const resumeIframeRuntime = (
  iframe: HTMLIFrameElement | null | undefined,
  { reason, origin, soundSettings, soundOptions }: ResumeIframeRuntimeOptions,
): void => {
  postIframeLifecyclePhase(iframe, 'resume', { reason, origin });
  syncIframeFullscreenOnInteraction(iframe);

  if (soundSettings) {
    syncIframeSoundSettings(iframe, soundSettings, soundOptions);
  }
};
