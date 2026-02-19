export interface HomePageMusicOption {
  value: string;
  label: string;
}

export const HOME_PAGE_MUSIC_OPTIONS: HomePageMusicOption[] = [
  { value: 'homepage-track-3', label: 'Default.mp3 (Default)' },
  { value: 'homepage-track-1', label: 'HomepageAPP.mp3' },
  { value: 'homepage-track-2', label: 'HomepageAPP (1).mp3' },
  { value: 'homepage-track-4', label: 'HomepageAPP (3).mp3' },
  { value: 'homepage-track-5', label: 'HomepageAPP (4).mp3' },
];

export const DEFAULT_HOME_PAGE_MUSIC_TRACK = 'homepage-track-3';

export const normalizeHomePageMusicTrack = (value: unknown): string => {
  if (typeof value !== 'string') return DEFAULT_HOME_PAGE_MUSIC_TRACK;
  const normalized = value.trim();
  return HOME_PAGE_MUSIC_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_HOME_PAGE_MUSIC_TRACK;
};
