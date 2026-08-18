export const SAVE_KEY = 'defenderChampion.save.v1';

const SAVE_VERSION = 1;
const MAX_LEVEL = 10;
const VALID_MEDALS = new Set(['bronze', 'silver', 'gold']);
const VALID_LEVEL_ID = /^level-(?:[1-9]|10)$/;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

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

  const highestUnlockedLevel = Number.isFinite(candidate.highestUnlockedLevel)
    ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(candidate.highestUnlockedLevel)))
    : 1;
  const levels = {};
  if (isRecord(candidate.levels)) {
    for (const [levelId, levelValue] of Object.entries(candidate.levels)) {
      if (!VALID_LEVEL_ID.test(levelId) || !isRecord(levelValue)) continue;
      if (!Number.isFinite(levelValue.bestScore) || levelValue.bestScore < 0) continue;
      if (!VALID_MEDALS.has(levelValue.medal)) continue;
      levels[levelId] = {
        bestScore: Math.floor(levelValue.bestScore),
        medal: levelValue.medal,
      };
    }
  }

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
          if (!isRecord(parsed) || parsed.version !== SAVE_VERSION) {
            notify(onNotice, { type: 'save-reset', reason: 'invalid-schema' });
          }
          state = sanitizeSaveState(parsed);
        } catch {
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
      return { state: getState(), persisted: true, rewardsDisabled: false };
    } catch {
      markStorageUnavailable();
      return { state: getState(), persisted: false, rewardsDisabled: true };
    }
  };

  return Object.freeze({
    getState,
    isDurable: () => durable,
    rewardsDisabled: () => !durable,
    save,
  });
};
