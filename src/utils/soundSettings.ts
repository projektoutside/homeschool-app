import type { SoundSettings } from '../context/SoundSettingsContext';

type AudioControlWindow = Window & {
  setAudioMuted?: (muted: boolean) => void;
  setMusicVolume?: (volume: number) => void;
  setSfxVolume?: (volume: number) => void;
};

const toUnitVolume = (percent: number): number => {
  const normalized = Number.isFinite(percent) ? percent / 100 : 0;
  return Math.max(0, Math.min(1, normalized));
};

export const applySoundSettingsToWindow = (targetWindow: Window | null | undefined, settings: SoundSettings): void => {
  if (!targetWindow) return;

  const audioWindow = targetWindow as AudioControlWindow;
  const musicVolume = toUnitVolume(settings.musicVolume);
  const sfxVolume = toUnitVolume(settings.sfxVolume);

  try {
    if (typeof audioWindow.setAudioMuted === 'function') {
      audioWindow.setAudioMuted(settings.muted);
    }
    if (typeof audioWindow.setMusicVolume === 'function') {
      audioWindow.setMusicVolume(musicVolume);
    }
    if (typeof audioWindow.setSfxVolume === 'function') {
      audioWindow.setSfxVolume(sfxVolume);
    }
  } catch {
    // Ignore cross-window access errors.
  }

  try {
    const media = targetWindow.document?.querySelectorAll?.('audio, video');
    media?.forEach(element => {
      const el = element as HTMLMediaElement;
      el.muted = settings.muted;
      el.volume = settings.muted ? 0 : sfxVolume;
    });
  } catch {
    // Ignore if the iframe is cross-origin or inaccessible.
  }

  try {
    targetWindow.postMessage(
      {
        type: 'APP_SOUND_SETTINGS_UPDATE',
        payload: {
          muted: settings.muted,
          musicVolume,
          sfxVolume,
        },
      },
      '*',
    );
  } catch {
    // no-op
  }
};
