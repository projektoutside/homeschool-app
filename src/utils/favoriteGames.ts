export const FAVORITE_GAMES_STORAGE_KEY = 'arcade_favorite_games_v1';
export const FAVORITE_GAMES_UPDATED_EVENT = 'LAHS_FAVORITE_GAMES_UPDATED';

export const readFavoriteGameIds = (): string[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(FAVORITE_GAMES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

export const notifyFavoriteGamesUpdated = (favoriteGameIds: string[]): void => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<string[]>(FAVORITE_GAMES_UPDATED_EVENT, {
    detail: favoriteGameIds,
  }));
};
