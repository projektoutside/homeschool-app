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
  windowRef.innerWidth = width;
  windowRef.innerHeight = height;
  windowRef.screen = {
    orientation: {
      async lock(mode) {
        lockCalls.push(mode);
        return lockImplementation(mode);
      },
    },
  };
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
