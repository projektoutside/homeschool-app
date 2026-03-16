export const PROFILE_STORAGE_KEY = 'quizItPolygon.profile.v2';
const LEGACY_SETTINGS_KEY = 'quizItPolygon.settings.v1';
const LEGACY_PROGRESS_KEY = 'quizItPolygon.progress.v1';

function safeGetItem(key) {
    try {
        return globalThis.localStorage?.getItem(key) ?? null;
    } catch (error) {
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        globalThis.localStorage?.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
}

export function createDefaultProfile() {
    return {
        version: 2,
        settings: {
            sound: true,
            music: true,
            readAloud: false,
            bigText: false
        },
        unlockedWorld: 0,
        currentStreak: 0,
        badges: [],
        missions: {},
        stats: {
            missionsCleared: 0,
            legacyBestScore: 0,
            legacyRoundsPlayed: 0
        }
    };
}

export function loadProfile() {
    try {
        const raw = safeGetItem(PROFILE_STORAGE_KEY);
        if (!raw) {
            const migrated = migrateLegacyProfile();
            saveProfile(migrated);
            return migrated;
        }

        const parsed = JSON.parse(raw);
        return normalizeProfile(parsed);
    } catch (error) {
        const fallback = migrateLegacyProfile();
        saveProfile(fallback);
        return fallback;
    }
}

export function saveProfile(profile) {
    safeSetItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
}

export function resetProfile() {
    const profile = migrateLegacyProfile();
    saveProfile(profile);
    return profile;
}

export function getMissionRecord(profile, missionId) {
    return profile.missions[missionId] || {
        cleared: false,
        stars: 0,
        bestMistakes: null,
        bestHintStage: null,
        plays: 0
    };
}

export function setMissionRecord(profile, missionId, record) {
    profile.missions[missionId] = {
        ...getMissionRecord(profile, missionId),
        ...record
    };
}

function normalizeProfile(profile) {
    const base = createDefaultProfile();
    return {
        ...base,
        ...profile,
        settings: {
            ...base.settings,
            ...(profile?.settings || {})
        },
        badges: Array.isArray(profile?.badges) ? [...new Set(profile.badges)] : [],
        missions: typeof profile?.missions === 'object' && profile.missions
            ? profile.missions
            : {},
        stats: {
            ...base.stats,
            ...(profile?.stats || {})
        }
    };
}

function migrateLegacyProfile() {
    const profile = createDefaultProfile();

    try {
        const legacySettings = JSON.parse(safeGetItem(LEGACY_SETTINGS_KEY) || '{}');
        profile.settings.sound = legacySettings.soundEnabled !== false;
        profile.settings.music = legacySettings.musicEnabled !== false;
    } catch (error) {
        // Keep defaults.
    }

    try {
        const legacyProgress = JSON.parse(safeGetItem(LEGACY_PROGRESS_KEY) || '{}');
        profile.stats.legacyBestScore = Number.isFinite(legacyProgress.bestScore) ? legacyProgress.bestScore : 0;
        profile.stats.legacyRoundsPlayed = Number.isFinite(legacyProgress.roundsPlayed) ? legacyProgress.roundsPlayed : 0;
    } catch (error) {
        // Keep defaults.
    }

    return profile;
}
