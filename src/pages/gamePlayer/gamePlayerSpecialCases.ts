import type { User } from '@supabase/supabase-js';

export const CAR_KING_GAME_ID = 'math-car-king';
export const WORD_PUZZLE_GAME_ID = 'word-puzzle-game';
export const CAR_KING_MIC_PREF_SYNC = 'LAHS_CAR_KING_MIC_PREF_SYNC';
export const CAR_KING_MIC_PREF_REQUEST = 'LAHS_CAR_KING_MIC_PREF_REQUEST';
export const CAR_KING_MIC_PREF_SAVE = 'LAHS_CAR_KING_MIC_PREF_SAVE';
export const CAR_KING_MIC_PREF_SAVE_RESULT = 'LAHS_CAR_KING_MIC_PREF_SAVE_RESULT';
const CAR_KING_MIC_PREF_STORAGE_PREFIX = 'carKingMicPreference';
const WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY = 'LAHS_WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP';
export const WORD_PUZZLE_USER_CONTEXT_SYNC = 'LAHS_WORD_PUZZLE_USER_CONTEXT_SYNC';
export const WORD_PUZZLE_USER_CONTEXT_REQUEST = 'LAHS_WORD_PUZZLE_USER_CONTEXT_REQUEST';

export type CarKingMicPreference = 'ask' | 'session' | 'always';
export type WordPuzzleUserContext = {
    userId: string | null;
    username: string | null;
    isAuthenticated: boolean;
    storageScope: string;
};

export const isCarKingMicPreference = (value: unknown): value is CarKingMicPreference => {
    return value === 'ask' || value === 'session' || value === 'always';
};

const getCarKingMicPreferenceStorageKey = (userId: string) => {
    return `${CAR_KING_MIC_PREF_STORAGE_PREFIX}:${userId}`;
};

const readLocalCarKingMicPreference = (userId?: string | null): CarKingMicPreference => {
    if (!userId) return 'ask';

    try {
        const stored = window.localStorage.getItem(getCarKingMicPreferenceStorageKey(userId));
        return isCarKingMicPreference(stored) ? stored : 'ask';
    } catch {
        return 'ask';
    }
};

export const writeLocalCarKingMicPreference = (
    userId: string | null | undefined,
    preference: CarKingMicPreference,
) => {
    if (!userId) return;

    try {
        const key = getCarKingMicPreferenceStorageKey(userId);
        if (preference === 'always') {
            window.localStorage.setItem(key, preference);
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Ignore local fallback storage failures.
    }
};

export const getUserCarKingMicPreference = (user: User | null): CarKingMicPreference => {
    const storedInMetadata = user?.user_metadata?.car_king_mic_preference;
    if (isCarKingMicPreference(storedInMetadata)) {
        return storedInMetadata;
    }

    return readLocalCarKingMicPreference(user?.id);
};

export const buildWordPuzzleUserContext = (user: User | null): WordPuzzleUserContext => {
    const userId = user?.id ?? null;
    const usernameFromMetadata = user?.user_metadata?.username;
    const username = typeof usernameFromMetadata === 'string' && usernameFromMetadata.trim()
        ? usernameFromMetadata.trim()
        : null;

    return {
        userId,
        username,
        isAuthenticated: Boolean(userId),
        storageScope: userId ? `supabase-user:${userId}` : 'anonymous-test',
    };
};

export const buildWordPuzzleBootstrapKey = (userId: string | null): string => {
    return `${WORD_PUZZLE_GAME_ID}:${userId ?? 'anonymous'}`;
};

export const persistWordPuzzleBootstrapContext = (context: WordPuzzleUserContext) => {
    try {
        window.sessionStorage.setItem(WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY, JSON.stringify(context));
    } catch {
        // Ignore bootstrap storage failures and allow anonymous fallback inside the iframe.
    }
};
