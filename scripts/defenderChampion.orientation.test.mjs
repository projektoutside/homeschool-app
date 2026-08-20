import assert from 'node:assert/strict';
import test from 'node:test';

import { createOrientationController } from '../public/Games/DefenderChampion/src/ui/orientation-controller.js';

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
    const dispatched = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      type,
      ...event,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(dispatched);
    return dispatched;
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class ElementDouble {
  constructor(documentRef, { id = '', focusable = false } = {}) {
    this.documentRef = documentRef;
    this.id = id;
    this.hidden = false;
    this.inert = false;
    this.isConnected = true;
    this.disabled = false;
    this.children = [];
    this.attributes = new Map();
    if (id) this.attributes.set('id', id);
    if (focusable) this.attributes.set('tabindex', '0');
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  focus() {
    this.documentRef.activeElement = this;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  matchesFocusable() {
    if (this.hidden || this.disabled) return false;
    if (this.getAttribute('tabindex') === '-1') return false;
    return this.getAttribute('tabindex') !== null || this.tagName === 'BUTTON';
  }

  querySelectorAll() {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matchesFocusable()) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child === node || child.contains?.(node));
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

const createOrientationFixture = ({
  width = 390,
  height = 844,
  lockImplementation = async () => {},
  screenLockSupported = true,
} = {}) => {
  const windowRef = new EventTargetDouble();
  const documentRef = new EventTargetDouble();
  const documentElement = { dataset: {} };
  const overlay = new ElementDouble(documentRef, { id: 'portrait-lock-screen', focusable: true });
  const shell = new ElementDouble(documentRef, { id: 'game-shell' });
  const primary = new ElementDouble(documentRef, { id: 'primary-button', focusable: true });
  const secondary = new ElementDouble(documentRef, { id: 'secondary-button', focusable: true });
  const returnFocus = new ElementDouble(documentRef, { id: 'return-focus', focusable: true });
  primary.tagName = 'BUTTON';
  secondary.tagName = 'BUTTON';
  overlay.tagName = 'SECTION';
  shell.tagName = 'MAIN';
  overlay.append(primary, secondary);
  const elements = new Map([
    ['portrait-lock-screen', overlay],
    ['game-shell', shell],
  ]);
  const lockCalls = [];
  const unlockCalls = [];
  windowRef.innerWidth = width;
  windowRef.innerHeight = height;
  windowRef.location = { href: 'https://learn.test/Games/DefenderChampion/', origin: 'https://learn.test' };
  windowRef.parent = windowRef;
  windowRef.screen = screenLockSupported ? {
    orientation: {
      async lock(mode) {
        lockCalls.push(mode);
        return lockImplementation(mode);
      },
      unlock() {
        unlockCalls.push('unlock');
      },
    },
  } : {};
  documentRef.documentElement = documentElement;
  documentRef.activeElement = returnFocus;
  documentRef.getElementById = (id) => elements.get(id) ?? null;

  return {
    documentRef,
    hostBridge: {
      calls: [],
      setOrientationPaused(active) {
        this.calls.push(active);
      },
    },
    listenerCount() {
      return ['resize', 'orientationchange', 'pointerdown', 'keydown']
        .reduce((sum, type) => sum + windowRef.listenerCount(type), 0)
        + ['keydown'].reduce((sum, type) => sum + documentRef.listenerCount(type), 0);
    },
    lockCalls,
    overlay,
    primary,
    resizeTo(nextWidth, nextHeight) {
      windowRef.innerWidth = nextWidth;
      windowRef.innerHeight = nextHeight;
      windowRef.dispatch('resize');
      windowRef.dispatch('orientationchange');
    },
    returnFocus,
    secondary,
    shell,
    unlockCalls,
    windowRef,
  };
};

test('landscape covers the product and composes orientation pause', () => {
  const fixture = createOrientationFixture({ width: 844, height: 390 });
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  controller.start();
  assert.equal(fixture.overlay.hidden, false);
  assert.equal(fixture.shell.inert, true);
  assert.equal(fixture.documentRef.documentElement.dataset.orientation, 'landscape');
  assert.deepEqual(fixture.hostBridge.calls, [true]);
  assert.equal(fixture.documentRef.activeElement, fixture.overlay);

  fixture.resizeTo(390, 844);
  assert.equal(fixture.overlay.hidden, true);
  assert.equal(fixture.shell.inert, false);
  assert.equal(fixture.documentRef.documentElement.dataset.orientation, 'portrait');
  assert.deepEqual(fixture.hostBridge.calls, [true, false]);
  assert.equal(fixture.documentRef.activeElement, fixture.returnFocus);

  controller.stop();
  assert.equal(fixture.listenerCount(), 0);
});

test('landscape dialog traps Tab and Shift+Tab while active', () => {
  const fixture = createOrientationFixture({ width: 844, height: 390 });
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  controller.start();
  fixture.secondary.focus();
  const forward = fixture.documentRef.dispatch('keydown', { key: 'Tab' });
  assert.equal(forward.defaultPrevented, true);
  assert.equal(fixture.documentRef.activeElement, fixture.primary);

  fixture.primary.focus();
  const backward = fixture.documentRef.dispatch('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(backward.defaultPrevented, true);
  assert.equal(fixture.documentRef.activeElement, fixture.secondary);
});

test('first pointer or keyboard gesture requests portrait lock once and ignores rejection', async () => {
  const fixture = createOrientationFixture({
    lockImplementation: async () => {
      throw new Error('NotAllowedError');
    },
  });
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  controller.start();
  await Promise.resolve(fixture.windowRef.dispatch('pointerdown'));
  await Promise.resolve();
  fixture.windowRef.dispatch('keydown', { key: 'Enter' });
  await Promise.resolve();
  assert.deepEqual(fixture.lockCalls, ['portrait']);
  assert.equal(await controller.requestPortraitLock(), false);
});

test('portrait request reports unsupported when neither host nor browser can lock', async () => {
  const fixture = createOrientationFixture({ screenLockSupported: false });
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  assert.equal(await controller.requestPortraitLock(), false);
  controller.stop();
  assert.deepEqual(fixture.lockCalls, []);
  assert.deepEqual(fixture.unlockCalls, []);
});

test('embedded portrait request and cleanup use the game-scoped host request and release seam', async () => {
  const fixture = createOrientationFixture({ screenLockSupported: false });
  const messages = [];
  const parentRef = {
    location: { origin: fixture.windowRef.location.origin },
    postMessage(message, origin) {
      messages.push({ message, origin });
      if (message.action !== 'request') return;
      queueMicrotask(() => fixture.windowRef.dispatch('message', {
        data: {
          type: 'LAHS_GAME_ORIENTATION_RESULT',
          requestId: message.requestId,
          success: true,
          supported: true,
        },
        origin,
        source: parentRef,
      }));
    },
  };
  fixture.windowRef.parent = parentRef;
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  controller.start();
  assert.equal(await controller.requestPortraitLock(), true);
  controller.stop();
  await Promise.resolve();
  assert.deepEqual(messages.map(({ message }) => ({
    action: message.action,
    gameId: message.gameId,
    orientation: message.orientation,
    type: message.type,
  })), [
    {
      action: 'request',
      gameId: 'defender-champion',
      orientation: 'portrait',
      type: 'LAHS_GAME_ORIENTATION_REQUEST',
    },
    {
      action: 'release',
      gameId: 'defender-champion',
      orientation: 'portrait',
      type: 'LAHS_GAME_ORIENTATION_REQUEST',
    },
  ]);
});

test('stopping during a pending embedded portrait request releases the eventual host lock', async () => {
  const fixture = createOrientationFixture({ screenLockSupported: false });
  const messages = [];
  const parentRef = {
    location: { origin: fixture.windowRef.location.origin },
    postMessage(message, origin) {
      messages.push({ message, origin });
    },
  };
  fixture.windowRef.parent = parentRef;
  const controller = createOrientationController({
    documentRef: fixture.documentRef,
    hostBridge: fixture.hostBridge,
    windowRef: fixture.windowRef,
  });

  controller.start();
  const pendingRequest = controller.requestPortraitLock();
  await Promise.resolve();
  const request = messages.find(({ message }) => message.action === 'request');
  assert.ok(request);

  controller.stop();
  assert.deepEqual(messages.map(({ message }) => message.action), ['request', 'release']);

  fixture.windowRef.dispatch('message', {
    data: {
      type: 'LAHS_GAME_ORIENTATION_RESULT',
      requestId: request.message.requestId,
      success: true,
      supported: true,
    },
    origin: request.origin,
    source: parentRef,
  });
  assert.equal(await pendingRequest, false);
  assert.deepEqual(messages.map(({ message }) => message.action), ['request', 'release', 'release']);
});

test('host orientation adapter requests, releases, and reports unsupported capabilities', async () => {
  const {
    releaseGamePortraitOrientation,
    requestGamePortraitOrientation,
  } = await import('../src/utils/gameOrientation.ts');
  const calls = [];
  const nativeWindow = {
    LAHSGameOrientationBridge: {
      async releasePortrait(gameId) { calls.push(['release', gameId]); return true; },
      async requestPortrait(gameId) { calls.push(['request', gameId]); return true; },
    },
  };
  assert.deepEqual(await requestGamePortraitOrientation(nativeWindow, 'defender-champion'), {
    source: 'native-host',
    success: true,
    supported: true,
  });
  assert.deepEqual(await releaseGamePortraitOrientation(nativeWindow, 'defender-champion'), {
    source: 'native-host',
    success: true,
    supported: true,
  });
  assert.deepEqual(calls, [
    ['request', 'defender-champion'],
    ['release', 'defender-champion'],
  ]);

  assert.deepEqual(await requestGamePortraitOrientation({}, 'defender-champion'), {
    source: 'unsupported',
    success: false,
    supported: false,
  });
  assert.deepEqual(await releaseGamePortraitOrientation({}, 'defender-champion'), {
    source: 'unsupported',
    success: false,
    supported: false,
  });
});
