export const SAVE_KEY = 'defenderChampion.save.v1';

const SAVE_VERSION = 1;
const MAX_LEVEL = 10;
const VALID_MEDALS = new Set(['bronze', 'silver', 'gold']);
const VALID_LEVEL_ID = /^level-(?:[1-9]|10)$/;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isTrustedPersistedState = (candidate) => {
  if (!isRecord(candidate) || candidate.version !== SAVE_VERSION) return false;
  if (!Number.isInteger(candidate.highestUnlockedLevel)
    || candidate.highestUnlockedLevel < 1
    || candidate.highestUnlockedLevel > MAX_LEVEL) return false;
  if (!isRecord(candidate.levels) || !isRecord(candidate.tutorialHints)) return false;
  if (candidate.reducedMotionOverride !== null
    && typeof candidate.reducedMotionOverride !== 'boolean') return false;

  for (const [levelId, levelValue] of Object.entries(candidate.levels)) {
    if (!VALID_LEVEL_ID.test(levelId) || !isRecord(levelValue)) return false;
    if (!Number.isFinite(levelValue.bestScore) || levelValue.bestScore < 0) return false;
    if (!VALID_MEDALS.has(levelValue.medal)) return false;
  }
  if (!Object.entries(candidate.tutorialHints)
    .every(([hintId, completed]) => hintId !== '__proto__' && typeof completed === 'boolean')) return false;

  const sanitized = sanitizeSaveState(candidate);
  const candidateLevelIds = Object.keys(candidate.levels).sort();
  const sanitizedLevelIds = Object.keys(sanitized.levels).sort();
  return candidate.highestUnlockedLevel === sanitized.highestUnlockedLevel
    && candidateLevelIds.length === sanitizedLevelIds.length
    && candidateLevelIds.every((levelId, index) => levelId === sanitizedLevelIds[index]);
};

const notify = (onNotice, notice) => {
  try {
    onNotice?.(notice);
  } catch {
    // Notices are advisory and must never interrupt play.
  }
};

export const createDefaultSaveState = () => ({
  version: SAVE_VERSION,
  highestUnlockedLevel: 1,
  levels: {},
  tutorialHints: {},
  reducedMotionOverride: null,
});

export const sanitizeSaveState = (candidate) => {
  if (!isRecord(candidate) || candidate.version !== SAVE_VERSION) {
    return createDefaultSaveState();
  }

  const validLevels = {};
  if (isRecord(candidate.levels)) {
    for (const [levelId, levelValue] of Object.entries(candidate.levels)) {
      if (!VALID_LEVEL_ID.test(levelId) || !isRecord(levelValue)) continue;
      if (!Number.isFinite(levelValue.bestScore) || levelValue.bestScore < 0) continue;
      if (!VALID_MEDALS.has(levelValue.medal)) continue;
      validLevels[levelId] = {
        bestScore: Math.floor(levelValue.bestScore),
        medal: levelValue.medal,
      };
    }
  }

  const levels = {};
  let clearedPrefix = 0;
  for (let levelNumber = 1; levelNumber <= MAX_LEVEL; levelNumber += 1) {
    const levelId = `level-${levelNumber}`;
    if (!validLevels[levelId]) break;
    levels[levelId] = validLevels[levelId];
    clearedPrefix = levelNumber;
  }
  const highestUnlockedLevel = clearedPrefix === MAX_LEVEL
    ? MAX_LEVEL
    : clearedPrefix + 1;

  const tutorialHints = {};
  if (isRecord(candidate.tutorialHints)) {
    for (const [hintId, completed] of Object.entries(candidate.tutorialHints)) {
      if (typeof completed === 'boolean' && hintId !== '__proto__') {
        tutorialHints[hintId] = completed;
      }
    }
  }

  const reducedMotionOverride = typeof candidate.reducedMotionOverride === 'boolean'
    ? candidate.reducedMotionOverride
    : null;

  return {
    version: SAVE_VERSION,
    highestUnlockedLevel,
    levels,
    tutorialHints,
    reducedMotionOverride,
  };
};

const resolveStorage = (providedStorage) => {
  if (providedStorage !== undefined) return providedStorage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const createSaveStore = ({ storage: providedStorage, onNotice } = {}) => {
  const storage = resolveStorage(providedStorage);
  let durable = Boolean(storage);
  let rewardHistoryTrusted = true;
  let storageNoticeSent = false;
  let state = createDefaultSaveState();

  const markStorageUnavailable = () => {
    durable = false;
    if (!storageNoticeSent) {
      storageNoticeSent = true;
      notify(onNotice, { type: 'storage-unavailable', reason: 'denied' });
    }
  };

  if (storage) {
    try {
      const serialized = storage.getItem(SAVE_KEY);
      if (serialized !== null) {
        try {
          const parsed = JSON.parse(serialized);
          if (!isTrustedPersistedState(parsed)) {
            rewardHistoryTrusted = false;
            notify(onNotice, { type: 'save-reset', reason: 'invalid-schema' });
          }
          state = sanitizeSaveState(parsed);
        } catch {
          rewardHistoryTrusted = false;
          state = createDefaultSaveState();
          notify(onNotice, { type: 'save-reset', reason: 'corrupt' });
        }
      }
    } catch {
      markStorageUnavailable();
    }
  } else {
    markStorageUnavailable();
  }

  const getState = () => sanitizeSaveState(state);

  const save = (candidate) => {
    state = sanitizeSaveState({ ...candidate, version: SAVE_VERSION });
    if (!durable || !storage) {
      return { state: getState(), persisted: false, rewardsDisabled: true };
    }

    try {
      storage.setItem(SAVE_KEY, JSON.stringify(state));
      return { state: getState(), persisted: true, rewardsDisabled: !rewardHistoryTrusted };
    } catch {
      markStorageUnavailable();
      return { state: getState(), persisted: false, rewardsDisabled: true };
    }
  };

  return Object.freeze({
    getState,
    isDurable: () => durable,
    rewardsDisabled: () => !durable || !rewardHistoryTrusted,
    save,
  });
};
