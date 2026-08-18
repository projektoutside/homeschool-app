import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCrossedMedalRanks,
} from '../public/Games/DefenderChampion/src/core/scoring.js';
import {
  SAVE_KEY,
  createDefaultSaveState,
  createSaveStore,
  sanitizeSaveState,
} from '../public/Games/DefenderChampion/src/services/save-store.js';

const createMemoryStorage = (initialValue = null) => {
  let value = initialValue;
  return {
    getItem(key) {
      assert.equal(key, SAVE_KEY);
      return value;
    },
    setItem(key, nextValue) {
      assert.equal(key, SAVE_KEY);
      value = nextValue;
    },
    snapshot() {
      return value;
    },
  };
};

test('medal crossings are bounded and cumulative', () => {
  assert.deepEqual(getCrossedMedalRanks('none', 'gold'), ['bronze', 'silver', 'gold']);
  assert.deepEqual(getCrossedMedalRanks('silver', 'gold'), ['gold']);
  assert.deepEqual(getCrossedMedalRanks('gold', 'silver'), []);
  assert.deepEqual(getCrossedMedalRanks('invalid', 'invalid'), []);
  assert.deepEqual(getCrossedMedalRanks('invalid', 'gold'), []);
});

test('default save contains only durable campaign fields', () => {
  assert.deepEqual(createDefaultSaveState(), {
    version: 1,
    highestUnlockedLevel: 1,
    levels: {},
    tutorialHints: {},
    reducedMotionOverride: null,
  });
});

test('save data excludes active combat and clamps campaign progress', () => {
  const value = sanitizeSaveState({
    version: 1,
    highestUnlockedLevel: 99,
    levels: { 'level-1': { bestScore: 500, medal: 'gold' } },
    activeWave: 7,
    coins: 9999,
  });
  assert.equal(value.highestUnlockedLevel, 10);
  assert.equal('activeWave' in value, false);
  assert.equal('coins' in value, false);
});

test('save validation migrates incomplete snapshots and discards invalid nested fields', () => {
  const value = sanitizeSaveState({
    version: 1,
    highestUnlockedLevel: 3.8,
    levels: {
      'level-1': { bestScore: 410.9, medal: 'silver', activeWave: 4 },
      'level-2': { bestScore: -10, medal: 'platinum' },
      'level-11': { bestScore: 900, medal: 'gold' },
    },
    tutorialHints: {
      placement: true,
      upgrade: false,
      invalid: 'yes',
    },
    reducedMotionOverride: false,
    identity: { userId: 'secret' },
    permanentPower: 7,
  });

  assert.deepEqual(value, {
    version: 1,
    highestUnlockedLevel: 3,
    levels: {
      'level-1': { bestScore: 410, medal: 'silver' },
    },
    tutorialHints: {
      placement: true,
      upgrade: false,
    },
    reducedMotionOverride: false,
  });
});

test('unknown save versions and corrupt JSON recover to defaults with a notice', () => {
  assert.deepEqual(sanitizeSaveState({ version: 99, highestUnlockedLevel: 10 }), createDefaultSaveState());

  const notices = [];
  const store = createSaveStore({
    storage: createMemoryStorage('{not-json'),
    onNotice: (notice) => notices.push(notice),
  });

  assert.deepEqual(store.getState(), createDefaultSaveState());
  assert.equal(store.isDurable(), true);
  assert.equal(store.rewardsDisabled(), true);
  assert.deepEqual(notices, [{ type: 'save-reset', reason: 'corrupt' }]);

  const saveResult = store.save({
    levels: { 'level-1': { bestScore: 500, medal: 'gold' } },
  });
  assert.equal(saveResult.persisted, true);
  assert.equal(saveResult.rewardsDisabled, true);
});

test('invalid save schemas reset with a non-blocking notice', () => {
  const notices = [];
  const storage = createMemoryStorage(JSON.stringify({ version: 99, highestUnlockedLevel: 10 }));
  const store = createSaveStore({ storage, onNotice: (notice) => notices.push(notice) });

  assert.deepEqual(store.getState(), createDefaultSaveState());
  assert.equal(store.rewardsDisabled(), true);
  assert.deepEqual(notices, [{ type: 'save-reset', reason: 'invalid-schema' }]);
});

test('save writes a complete validated snapshot to the versioned key', () => {
  const storage = createMemoryStorage();
  const store = createSaveStore({ storage });

  const result = store.save({
    highestUnlockedLevel: 2,
    levels: { 'level-1': { bestScore: 275, medal: 'bronze', coins: 80 } },
    tutorialHints: { placement: true },
    reducedMotionOverride: true,
    activeWave: 3,
  });

  assert.equal(result.persisted, true);
  assert.equal(result.rewardsDisabled, false);
  assert.deepEqual(JSON.parse(storage.snapshot()), {
    version: 1,
    highestUnlockedLevel: 2,
    levels: { 'level-1': { bestScore: 275, medal: 'bronze' } },
    tutorialHints: { placement: true },
    reducedMotionOverride: true,
  });
});

test('storage denial keeps temporary campaign progress and disables rewards', () => {
  const notices = [];
  const deniedStorage = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
  };
  const store = createSaveStore({
    storage: deniedStorage,
    onNotice: (notice) => notices.push(notice),
  });

  const result = store.save({
    highestUnlockedLevel: 2,
    levels: { 'level-1': { bestScore: 500, medal: 'gold' } },
  });

  assert.equal(result.persisted, false);
  assert.equal(result.rewardsDisabled, true);
  assert.equal(store.getState().highestUnlockedLevel, 2);
  assert.equal(store.isDurable(), false);
  assert.deepEqual(notices, [{ type: 'storage-unavailable', reason: 'denied' }]);
});
