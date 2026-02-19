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

interface AppliedSoundSnapshot {
  documentRef: Document | null;
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  homePageMusicTrack: string;
  natureSoundsMuted: boolean;
  natureSoundsVolume: number;
  hasHomePageActive: boolean;
  homePageActive: boolean;
  forceMuteForInactiveHomePage: boolean;
}

const toUnitVolume = (percent: number): number => {
  const normalized = Number.isFinite(percent) ? percent / 100 : 0;
  return Math.max(0, Math.min(1, normalized));
};

const appliedSoundSettingsByWindow = new WeakMap<Window, AppliedSoundSnapshot>();

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
  const nextHomePageActive = hasHomePageActive ? Boolean(options?.homePageActive) : false;

  let targetDocument: Document | null = null;
  try {
    targetDocument = targetWindow.document ?? null;
  } catch {
    // cross-origin iframe or detached window
  }

  const previous = appliedSoundSettingsByWindow.get(targetWindow);
  const isFreshApply = !previous || previous.documentRef !== targetDocument;

  const changed = {
    muted: isFreshApply || previous.muted !== settings.muted,
    musicVolume: isFreshApply || previous.musicVolume !== musicVolume,
    sfxVolume: isFreshApply || previous.sfxVolume !== sfxVolume,
    homePageMusicTrack: isFreshApply || previous.homePageMusicTrack !== settings.homePageMusicTrack,
    natureSoundsMuted: isFreshApply || previous.natureSoundsMuted !== settings.natureSoundsMuted,
    natureSoundsVolume: isFreshApply || previous.natureSoundsVolume !== natureSoundsVolume,
    homePageActive: hasHomePageActive && (
      isFreshApply
      || !previous.hasHomePageActive
      || previous.homePageActive !== nextHomePageActive
    ),
    mediaMuting: isFreshApply
      || previous.muted !== settings.muted
      || previous.sfxVolume !== sfxVolume
      || previous.forceMuteForInactiveHomePage !== forceMuteForInactiveHomePage,
  };

  try {
    if (changed.muted && typeof audioWindow.setAudioMuted === 'function') {
      audioWindow.setAudioMuted(settings.muted);
    }
    if (changed.musicVolume && typeof audioWindow.setMusicVolume === 'function') {
      audioWindow.setMusicVolume(musicVolume);
    }
    if (changed.sfxVolume && typeof audioWindow.setSfxVolume === 'function') {
      audioWindow.setSfxVolume(sfxVolume);
    }
    if (changed.homePageMusicTrack && typeof audioWindow.setHomePageMusicTrack === 'function') {
      audioWindow.setHomePageMusicTrack(settings.homePageMusicTrack);
    }
    if (changed.natureSoundsMuted && typeof audioWindow.setNatureSoundsMuted === 'function') {
      audioWindow.setNatureSoundsMuted(settings.natureSoundsMuted);
    }
    if (changed.natureSoundsVolume && typeof audioWindow.setNatureSoundsVolume === 'function') {
      audioWindow.setNatureSoundsVolume(natureSoundsVolume);
    }
    if (changed.homePageActive && typeof audioWindow.setHomePageActive === 'function') {
      audioWindow.setHomePageActive(nextHomePageActive);
    }
  } catch {
    // Ignore cross-window access errors.
  }

  if (changed.mediaMuting) {
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
  }

  const payload: Record<string, unknown> = {};
  if (changed.muted) payload.muted = settings.muted;
  if (changed.musicVolume) payload.musicVolume = musicVolume;
  if (changed.sfxVolume) payload.sfxVolume = sfxVolume;
  if (changed.homePageMusicTrack) payload.homePageMusicTrack = settings.homePageMusicTrack;
  if (changed.natureSoundsMuted) payload.natureSoundsMuted = settings.natureSoundsMuted;
  if (changed.natureSoundsVolume) payload.natureSoundsVolume = natureSoundsVolume;
  if (changed.homePageActive) payload.homePageActive = nextHomePageActive;

  try {
    if (Object.keys(payload).length > 0) {
      targetWindow.postMessage(
        {
          type: 'APP_SOUND_SETTINGS_UPDATE',
          payload,
        },
        '*',
      );
    }
  } catch {
    // no-op
  }

  appliedSoundSettingsByWindow.set(targetWindow, {
    documentRef: targetDocument,
    muted: settings.muted,
    musicVolume,
    sfxVolume,
    homePageMusicTrack: settings.homePageMusicTrack,
    natureSoundsMuted: settings.natureSoundsMuted,
    natureSoundsVolume,
    hasHomePageActive,
    homePageActive: nextHomePageActive,
    forceMuteForInactiveHomePage,
  });
};
