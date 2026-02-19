import type { SoundSettings } from '../context/SoundSettingsContext';

type AudioControlWindow = Window & {
  setAudioMuted?: (muted: boolean) => void;
  setMusicVolume?: (volume: number) => void;
  setSfxVolume?: (volume: number) => void;
  setHomePageMusicTrack?: (track: string) => void;
  setNatureSoundsMuted?: (muted: boolean) => void;
  setNatureSoundsVolume?: (volume: number) => void;
  setHomePageActive?: (isActive: boolean) => void;
};

const toUnitVolume = (percent: number): number => {
  const normalized = Number.isFinite(percent) ? percent / 100 : 0;
  return Math.max(0, Math.min(1, normalized));
};

export const applySoundSettingsToWindow = (
  targetWindow: Window | null | undefined,
  settings: SoundSettings,
  options?: { homePageActive?: boolean },
): void => {
  if (!targetWindow) return;

  const audioWindow = targetWindow as AudioControlWindow;
  const musicVolume = toUnitVolume(settings.musicVolume);
  const sfxVolume = toUnitVolume(settings.sfxVolume);
  const natureSoundsVolume = toUnitVolume(settings.natureSoundsVolume);
  const hasHomePageActive = typeof options?.homePageActive === 'boolean';
  const forceMuteForInactiveHomePage = hasHomePageActive && options?.homePageActive === false;

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
    if (typeof audioWindow.setHomePageMusicTrack === 'function') {
      audioWindow.setHomePageMusicTrack(settings.homePageMusicTrack);
    }
    if (typeof audioWindow.setNatureSoundsMuted === 'function') {
      audioWindow.setNatureSoundsMuted(settings.natureSoundsMuted);
    }
    if (typeof audioWindow.setNatureSoundsVolume === 'function') {
      audioWindow.setNatureSoundsVolume(natureSoundsVolume);
    }
    if (hasHomePageActive && typeof audioWindow.setHomePageActive === 'function') {
      audioWindow.setHomePageActive(Boolean(options?.homePageActive));
    }
  } catch {
    // Ignore cross-window access errors.
  }

  try {
    const media = targetWindow.document?.querySelectorAll?.('audio, video');
    media?.forEach(element => {
      const el = element as HTMLMediaElement;
      el.muted = settings.muted || forceMuteForInactiveHomePage;
      el.volume = (settings.muted || forceMuteForInactiveHomePage) ? 0 : sfxVolume;
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
          homePageMusicTrack: settings.homePageMusicTrack,
          natureSoundsMuted: settings.natureSoundsMuted,
          natureSoundsVolume,
          ...(hasHomePageActive ? { homePageActive: Boolean(options?.homePageActive) } : {}),
        },
      },
      '*',
    );
  } catch {
    // no-op
  }
};
