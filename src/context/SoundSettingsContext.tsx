import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const DEFAULT_SETTINGS: SoundSettings = {
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
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: Boolean(parsed.muted),
      musicVolume: clampPercent(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clampPercent(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
      homePageMusicTrack: normalizeHomePageMusicTrack(
        parsed.homePageMusicTrack ?? DEFAULT_SETTINGS.homePageMusicTrack,
      ),
      natureSoundsMuted: Boolean(parsed.natureSoundsMuted ?? DEFAULT_SETTINGS.natureSoundsMuted),
      natureSoundsVolume: clampPercent(
        parsed.natureSoundsVolume ?? DEFAULT_SETTINGS.natureSoundsVolume,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
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

  const value = useMemo<SoundSettingsContextValue>(() => ({
    settings,
    setMuted: (muted: boolean) => setSettings(prev => ({ ...prev, muted })),
    setMusicVolume: (value: number) => setSettings(prev => ({ ...prev, musicVolume: clampPercent(value) })),
    setSfxVolume: (value: number) => setSettings(prev => ({ ...prev, sfxVolume: clampPercent(value) })),
    setHomePageMusicTrack: (value: string) => setSettings(prev => ({
      ...prev,
      homePageMusicTrack: normalizeHomePageMusicTrack(value),
    })),
    setNatureSoundsMuted: (muted: boolean) => setSettings(prev => ({ ...prev, natureSoundsMuted: muted })),
    setNatureSoundsVolume: (value: number) => setSettings(prev => ({
      ...prev,
      natureSoundsVolume: clampPercent(value),
    })),
    resetSoundSettings: () => setSettings(DEFAULT_SETTINGS),
  }), [settings]);

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
};

export const useSoundSettings = (): SoundSettingsContextValue => {
  const ctx = useContext(SoundSettingsContext);
  if (!ctx) {
    throw new Error('useSoundSettings must be used within SoundSettingsProvider');
  }
  return ctx;
};
