import type { SoundSettings } from '../context/SoundSettingsContext';
import { postIframeLifecyclePhase } from './iframeLifecycle';
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

  if (soundSettings) {
    syncIframeSoundSettings(iframe, soundSettings, soundOptions);
  }
};
