import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_HOME_PAGE_MUSIC_TRACK, normalizeHomePageMusicTrack } from '../utils/homePageMusic';

export interface SoundSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  homePageMusicTrack: string;
  natureSoundsMuted: boolean;
  natureSoundsVolume: number;
}

interface SoundSettingsContextValue {
  settings: SoundSettings;
  setMuted: (muted: boolean) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setHomePageMusicTrack: (value: string) => void;
  setNatureSoundsMuted: (muted: boolean) => void;
  setNatureSoundsVolume: (value: number) => void;
  resetSoundSettings: () => void;
}

const STORAGE_KEY = 'app_sound_settings_v1';

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  muted: false,
  musicVolume: 20,
  sfxVolume: 75,
  homePageMusicTrack: DEFAULT_HOME_PAGE_MUSIC_TRACK,
  natureSoundsMuted: false,
  natureSoundsVolume: 35,
};

const SoundSettingsContext = createContext<SoundSettingsContextValue | undefined>(undefined);

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const readStoredSettings = (): SoundSettings => {
  if (typeof window === 'undefined') return DEFAULT_SOUND_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: Boolean(parsed.muted),
      musicVolume: clampPercent(parsed.musicVolume ?? DEFAULT_SOUND_SETTINGS.musicVolume),
      sfxVolume: clampPercent(parsed.sfxVolume ?? DEFAULT_SOUND_SETTINGS.sfxVolume),
      homePageMusicTrack: normalizeHomePageMusicTrack(
        parsed.homePageMusicTrack ?? DEFAULT_SOUND_SETTINGS.homePageMusicTrack,
      ),
      natureSoundsMuted: Boolean(parsed.natureSoundsMuted ?? DEFAULT_SOUND_SETTINGS.natureSoundsMuted),
      natureSoundsVolume: clampPercent(
        parsed.natureSoundsVolume ?? DEFAULT_SOUND_SETTINGS.natureSoundsVolume,
      ),
    };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
};

export const SoundSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SoundSettings>(readStoredSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage failures
    }
  }, [settings]);

  const setMuted = useCallback((muted: boolean) => {
    const normalizedMuted = Boolean(muted);
    setSettings(prev => (prev.muted === normalizedMuted ? prev : { ...prev, muted: normalizedMuted }));
  }, []);

  const setMusicVolume = useCallback((value: number) => {
    const normalizedVolume = clampPercent(value);
    setSettings(prev => (prev.musicVolume === normalizedVolume ? prev : { ...prev, musicVolume: normalizedVolume }));
  }, []);

  const setSfxVolume = useCallback((value: number) => {
    const normalizedVolume = clampPercent(value);
    setSettings(prev => (prev.sfxVolume === normalizedVolume ? prev : { ...prev, sfxVolume: normalizedVolume }));
  }, []);

  const setHomePageMusicTrack = useCallback((value: string) => {
    const normalizedTrack = normalizeHomePageMusicTrack(value);
    setSettings(prev => (
      prev.homePageMusicTrack === normalizedTrack
        ? prev
        : { ...prev, homePageMusicTrack: normalizedTrack }
    ));
  }, []);

  const setNatureSoundsMuted = useCallback((muted: boolean) => {
    const normalizedMuted = Boolean(muted);
    setSettings(prev => (
      prev.natureSoundsMuted === normalizedMuted
        ? prev
        : { ...prev, natureSoundsMuted: normalizedMuted }
    ));
  }, []);

  const setNatureSoundsVolume = useCallback((value: number) => {
    const normalizedVolume = clampPercent(value);
    setSettings(prev => (
      prev.natureSoundsVolume === normalizedVolume
        ? prev
        : { ...prev, natureSoundsVolume: normalizedVolume }
    ));
  }, []);

  const resetSoundSettings = useCallback(() => {
    setSettings(prev => {
      if (
        prev.muted === DEFAULT_SOUND_SETTINGS.muted
        && prev.musicVolume === DEFAULT_SOUND_SETTINGS.musicVolume
        && prev.sfxVolume === DEFAULT_SOUND_SETTINGS.sfxVolume
        && prev.homePageMusicTrack === DEFAULT_SOUND_SETTINGS.homePageMusicTrack
        && prev.natureSoundsMuted === DEFAULT_SOUND_SETTINGS.natureSoundsMuted
        && prev.natureSoundsVolume === DEFAULT_SOUND_SETTINGS.natureSoundsVolume
      ) {
        return prev;
      }
      return DEFAULT_SOUND_SETTINGS;
    });
  }, []);

  const value = useMemo<SoundSettingsContextValue>(() => ({
    settings,
    setMuted,
    setMusicVolume,
    setSfxVolume,
    setHomePageMusicTrack,
    setNatureSoundsMuted,
    setNatureSoundsVolume,
    resetSoundSettings,
  }), [
    resetSoundSettings,
    setHomePageMusicTrack,
    setMusicVolume,
    setMuted,
    setNatureSoundsMuted,
    setNatureSoundsVolume,
    setSfxVolume,
    settings,
  ]);

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSoundSettings = (): SoundSettingsContextValue => {
  const ctx = useContext(SoundSettingsContext);
  if (!ctx) {
    throw new Error('useSoundSettings must be used within SoundSettingsProvider');
  }
  return ctx;
};
