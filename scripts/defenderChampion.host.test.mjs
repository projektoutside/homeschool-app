import assert from 'node:assert/strict';
import test from 'node:test';

import { createAudioController } from '../public/Games/DefenderChampion/src/services/audio.js';
import { createHostBridge } from '../public/Games/DefenderChampion/src/services/host-bridge.js';
import { createSaveStore } from '../public/Games/DefenderChampion/src/services/save-store.js';

class EventTargetDouble {
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, ...event });
    }
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

const createStorage = ({ deny = false, operations = [] } = {}) => {
  let value = null;
  return {
    getItem() {
      if (deny) throw new Error('SecurityError');
      return value;
    },
    setItem(key, nextValue) {
      if (deny) throw new Error('SecurityError');
      operations.push({ type: 'save', key, value: JSON.parse(nextValue) });
      value = nextValue;
    },
  };
};

const createBrowserDoubles = ({
  embedded = false,
  href = 'https://example.test/base/Games/DefenderChampion/index.html',
  search = '',
  referrer = '',
  historyLength = 1,
} = {}) => {
  const windowRef = new EventTargetDouble();
  const documentRef = new EventTargetDouble();
  const parentMessages = [];
  const parentRef = {
    location: { origin: 'https://example.test' },
    postMessage(message, targetOrigin) {
      parentMessages.push({ message, targetOrigin });
    },
  };
  const navigations = [];
  let historyBackCount = 0;

  windowRef.location = {
    href,
    origin: new URL(href).origin,
    search,
    assign(url) {
      navigations.push(url);
    },
  };
  windowRef.parent = embedded ? parentRef : windowRef;
  windowRef.history = {
    length: historyLength,
    back() {
      historyBackCount += 1;
    },
  };
  documentRef.hidden = false;
  documentRef.referrer = referrer;

  return {
    windowRef,
    documentRef,
    parentRef,
    parentMessages,
    navigations,
    get historyBackCount() {
      return historyBackCount;
    },
  };
};

const createPointsBridge = (operations = []) => ({
  initCalls: [],
  awardCalls: [],
  init(options) {
    this.initCalls.push(options);
  },
  awardPoints(points, options) {
    const call = { points, options };
    operations.push({ type: 'award', ...call });
    this.awardCalls.push(call);
    return call;
  },
});

test('medal improvements persist before stable five-point reward events', () => {
  const operations = [];
  const browser = createBrowserDoubles({ embedded: true });
  const pointsBridge = createPointsBridge(operations);
  const saveStore = createSaveStore({ storage: createStorage({ operations }) });
  const bridge = createHostBridge({ ...browser, saveStore, pointsBridge });

  const result = bridge.recordBattleResult({
    levelId: 'level-1',
    score: 500,
    medal: 'gold',
    highestUnlockedLevel: 2,
  });

  assert.equal(result.persisted, true);
  assert.equal(result.rewardsDisabled, false);
  assert.deepEqual(operations.map((operation) => operation.type), ['save', 'award', 'award', 'award']);
  assert.deepEqual(pointsBridge.awardCalls, [
    { points: 5, options: { eventId: 'defender-champion:level-1:medal-bronze', label: 'Bronze Medal', meta: { levelId: 'level-1', medal: 'bronze' } } },
    { points: 5, options: { eventId: 'defender-champion:level-1:medal-silver', label: 'Silver Medal', meta: { levelId: 'level-1', medal: 'silver' } } },
    { points: 5, options: { eventId: 'defender-champion:level-1:medal-gold', label: 'Gold Medal', meta: { levelId: 'level-1', medal: 'gold' } } },
  ]);

  bridge.recordBattleResult({ levelId: 'level-1', score: 450, medal: 'silver' });
  assert.equal(pointsBridge.awardCalls.length, 3);
});

test('QA mode persists progress but never calls awardPoints', () => {
  const browser = createBrowserDoubles({ embedded: true, search: '?qa=1' });
  const pointsBridge = createPointsBridge();
  const bridge = createHostBridge({
    ...browser,
    saveStore: createSaveStore({ storage: createStorage() }),
    pointsBridge,
  });

  const result = bridge.recordBattleResult({ levelId: 'level-1', score: 500, medal: 'gold' });

  assert.equal(result.persisted, true);
  assert.equal(result.rewardsDisabled, true);
  assert.equal(pointsBridge.awardCalls.length, 0);
});

test('storage denial disables rewards while preserving temporary results', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const pointsBridge = createPointsBridge();
  const saveStore = createSaveStore({ storage: createStorage({ deny: true }) });
  const bridge = createHostBridge({ ...browser, saveStore, pointsBridge });

  const result = bridge.recordBattleResult({ levelId: 'level-1', score: 500, medal: 'gold' });

  assert.equal(result.persisted, false);
  assert.equal(result.rewardsDisabled, true);
  assert.equal(pointsBridge.awardCalls.length, 0);
  assert.equal(saveStore.getState().levels['level-1'].medal, 'gold');
});

test('embedded exit posts the exact home request to the same-origin parent', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const bridge = createHostBridge({ ...browser });

  bridge.exit();

  assert.deepEqual(browser.parentMessages, [{
    message: { type: 'LAHS_GAME_EXIT_TO_HOME', tab: 'games' },
    targetOrigin: 'https://example.test',
  }]);
  assert.equal(browser.historyBackCount, 0);
});

test('standalone exit uses browser history only for a safe same-origin referrer', () => {
  const browser = createBrowserDoubles({
    referrer: 'https://example.test/base/play/defender-champion',
    historyLength: 2,
  });
  const bridge = createHostBridge({ ...browser });

  bridge.exit();

  assert.equal(browser.historyBackCount, 1);
  assert.deepEqual(browser.navigations, []);
});

test('standalone direct exit resolves the application root from the current URL', () => {
  const browser = createBrowserDoubles({
    href: 'https://example.test/repo/Games/DefenderChampion/index.html?qa=1',
    referrer: 'https://malicious.test/trap',
    historyLength: 3,
  });
  const bridge = createHostBridge({ ...browser });

  bridge.exit();

  assert.equal(browser.historyBackCount, 0);
  assert.deepEqual(browser.navigations, ['https://example.test/repo/']);
});

test('host, visibility, manual, and modal pause reasons compose independently', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const pauseSnapshots = [];
  const audioPauses = [];
  const bridge = createHostBridge({
    ...browser,
    audioController: { setPaused: (paused) => audioPauses.push(paused) },
    onPauseChange: (snapshot) => pauseSnapshots.push(snapshot),
  });

  bridge.setManualPaused(true);
  bridge.setModalPaused(true);
  browser.documentRef.hidden = true;
  browser.documentRef.dispatch('visibilitychange');
  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: browser.parentRef,
    data: { type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' },
  });
  assert.deepEqual(bridge.getPauseState(), {
    paused: true,
    reasons: ['host', 'visibility', 'manual', 'modal'],
  });

  bridge.setManualPaused(false);
  bridge.setModalPaused(false);
  browser.documentRef.hidden = false;
  browser.documentRef.dispatch('visibilitychange');
  assert.equal(bridge.getPauseState().paused, true);

  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: browser.parentRef,
    data: { type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' },
  });
  assert.deepEqual(bridge.getPauseState(), { paused: false, reasons: [] });
  assert.equal(pauseSnapshots.at(-1).paused, false);
  assert.equal(audioPauses.at(-1), false);
});

test('messages require the expected same-origin source and sound payload types', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const calls = [];
  const bridge = createHostBridge({
    ...browser,
    audioController: {
      setAudioMuted: (value) => calls.push(['muted', value]),
      setMusicVolume: (value) => calls.push(['music', value]),
      setSfxVolume: (value) => calls.push(['sfx', value]),
      setPaused() {},
    },
  });

  browser.windowRef.dispatch('message', {
    origin: 'https://malicious.test',
    source: browser.parentRef,
    data: { type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: true } },
  });
  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: {},
    data: { type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: true } },
  });
  assert.deepEqual(calls, []);

  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: browser.parentRef,
    data: {
      type: 'APP_SOUND_SETTINGS_UPDATE',
      payload: { muted: true, musicVolume: 0.35, sfxVolume: 0.7, homePageMusicTrack: 'ignore' },
    },
  });
  assert.deepEqual(calls, [['muted', true], ['music', 0.35], ['sfx', 0.7]]);
  assert.equal(bridge.getPauseState().paused, false);
});

test('prepare-unload removes listeners, suspends audio, and blocks later rewards', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const pointsBridge = createPointsBridge();
  const audioCalls = [];
  const bridge = createHostBridge({
    ...browser,
    saveStore: createSaveStore({ storage: createStorage() }),
    pointsBridge,
    audioController: {
      setPaused: (paused) => audioCalls.push(['paused', paused]),
      destroy: () => audioCalls.push(['destroy']),
    },
  });

  assert.equal(browser.windowRef.listenerCount('message'), 1);
  assert.equal(browser.documentRef.listenerCount('visibilitychange'), 1);
  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: browser.parentRef,
    data: { type: 'LAHS_HOST_LIFECYCLE', phase: 'prepare-unload' },
  });
  bridge.recordBattleResult({ levelId: 'level-1', score: 500, medal: 'gold' });

  assert.equal(browser.windowRef.listenerCount('message'), 0);
  assert.equal(browser.documentRef.listenerCount('visibilitychange'), 0);
  assert.equal(pointsBridge.awardCalls.length, 0);
  assert.deepEqual(audioCalls.slice(-2), [['paused', true], ['destroy']]);
  assert.equal(bridge.getState().destroyed, true);
});

test('prepare-unload blocks rewards before notifying pause consumers', () => {
  const browser = createBrowserDoubles({ embedded: true });
  const pointsBridge = createPointsBridge();
  let bridge;
  bridge = createHostBridge({
    ...browser,
    saveStore: createSaveStore({ storage: createStorage() }),
    pointsBridge,
    onPauseChange(snapshot) {
      if (snapshot.paused) {
        bridge.recordBattleResult({ levelId: 'level-1', score: 500, medal: 'gold' });
      }
    },
  });

  browser.windowRef.dispatch('message', {
    origin: 'https://example.test',
    source: browser.parentRef,
    data: { type: 'LAHS_HOST_LIFECYCLE', phase: 'prepare-unload' },
  });

  assert.equal(pointsBridge.awardCalls.length, 0);
});

test('audio is gesture-gated, clamps exposed settings, and composes pause reasons', async () => {
  const windowRef = new EventTargetDouble();
  const documentRef = new EventTargetDouble();
  const contexts = [];
  class AudioContextDouble {
    state = 'suspended';
    destination = {};
    resumeCalls = 0;
    suspendCalls = 0;

    constructor() {
      contexts.push(this);
    }

    resume() {
      this.state = 'running';
      this.resumeCalls += 1;
      return Promise.resolve();
    }

    suspend() {
      this.state = 'suspended';
      this.suspendCalls += 1;
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  windowRef.AudioContext = AudioContextDouble;
  const controller = createAudioController({ windowRef, documentRef });

  controller.setAudioMuted(false);
  controller.setMusicVolume(4);
  controller.setSfxVolume(-1);
  assert.equal(contexts.length, 0);
  assert.equal(typeof windowRef.setAudioMuted, 'function');
  assert.deepEqual(controller.getSettings(), { muted: false, musicVolume: 1, sfxVolume: 0 });

  windowRef.dispatch('pointerdown');
  await Promise.resolve();
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumeCalls, 1);
  assert.equal(controller.isUnlocked(), true);

  controller.setPauseReason('manual', true);
  controller.setPauseReason('modal', true);
  controller.setPauseReason('manual', false);
  assert.equal(contexts[0].state, 'suspended');
  controller.setPauseReason('modal', false);
  await Promise.resolve();
  assert.equal(contexts[0].state, 'running');

  controller.destroy();
  assert.equal(windowRef.listenerCount('pointerdown'), 0);
  assert.equal(windowRef.listenerCount('keydown'), 0);
});

test('unsupported audio stays silent and playable', () => {
  const windowRef = new EventTargetDouble();
  const controller = createAudioController({ windowRef, documentRef: new EventTargetDouble() });

  windowRef.dispatch('keydown', { key: 'Enter' });

  assert.equal(controller.isUnlocked(), false);
  assert.equal(controller.playCue('victory'), false);
  assert.doesNotThrow(() => controller.destroy());
});

test('a later gesture retries an audio resume blocked outside a gesture', async () => {
  const windowRef = new EventTargetDouble();
  const contexts = [];
  class GestureSensitiveAudioContext {
    state = 'suspended';
    destination = {};
    resumeCalls = 0;

    constructor() {
      contexts.push(this);
    }

    resume() {
      this.resumeCalls += 1;
      if (this.resumeCalls === 1) return Promise.reject(new Error('NotAllowedError'));
      this.state = 'running';
      return Promise.resolve();
    }

    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  windowRef.AudioContext = GestureSensitiveAudioContext;
  const controller = createAudioController({ windowRef, documentRef: new EventTargetDouble() });
  controller.setAudioMuted(true);
  windowRef.dispatch('pointerdown');
  controller.setAudioMuted(false);
  await Promise.resolve();
  windowRef.dispatch('pointerdown');
  await Promise.resolve();

  assert.equal(controller.isUnlocked(), true);
  assert.equal(contexts[0].resumeCalls, 2);
  assert.equal(contexts[0].state, 'running');
  controller.destroy();
});
