import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import * as guest from '../src/utils/guestSession.ts';

const SESSION_KEY = 'lahs.guest-session.v1';
const PROFILE_KEY = 'lahs.guest-profile.v1';
const POINTS_KEY = 'lahs.user-points.v1:local-guest-device';
const STAMINA_KEY = 'lahs.user-stamina.v1:local-guest-device';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

beforeEach(() => {
  globalThis.window = { localStorage: createStorage(), sessionStorage: createStorage() };
});

afterEach(() => {
  delete globalThis.window;
});

test('guest identity and edited profile survive a new browser session', () => {
  guest.startGuestSession();
  guest.updateGuestProfile({ username: 'Local Learner', homeLabel: 'Our Classroom' });
  window.sessionStorage = createStorage();

  const restored = guest.readActiveGuestUser();
  assert.equal(restored?.id, guest.GUEST_USER_ID);
  assert.equal(restored?.user_metadata.username, 'Local Learner');
  assert.equal(restored?.user_metadata.home_label, 'Our Classroom');
});

test('sign-out ends guest access without deleting saved progress or profile', () => {
  guest.startGuestSession();
  guest.updateGuestProfile({ username: 'Returning Learner' });
  window.localStorage.setItem(POINTS_KEY, JSON.stringify({ version: 1, serverTotalPoints: 50, pendingEvents: [] }));
  window.localStorage.setItem(STAMINA_KEY, JSON.stringify({ version: 1, available: 16, updatedAtMs: Date.now() }));

  guest.clearGuestSession();
  assert.equal(guest.readActiveGuestUser(), null);
  window.sessionStorage = createStorage();

  const returning = guest.startGuestSession();
  assert.equal(returning.user_metadata.username, 'Returning Learner');
  assert.equal(JSON.parse(window.localStorage.getItem(POINTS_KEY)).serverTotalPoints, 50);
  assert.equal(JSON.parse(window.localStorage.getItem(STAMINA_KEY)).available, 16);
});

test('existing temporary guest identity and profile migrate without losing edits', () => {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ active: true, userId: guest.GUEST_USER_ID }));
  window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify({ id: guest.GUEST_USER_ID, username: 'Existing Guest', homeLabel: 'Saved Home' }));

  assert.equal(guest.readActiveGuestUser()?.user_metadata.username, 'Existing Guest');
  assert.equal(window.sessionStorage.getItem(SESSION_KEY), null);
  assert.equal(window.sessionStorage.getItem(PROFILE_KEY), null);
  window.sessionStorage = createStorage();
  assert.equal(guest.readActiveGuestUser()?.user_metadata.home_label, 'Saved Home');
});

test('existing temporary points and stamina migrate with their original storage format', () => {
  const points = JSON.stringify({ version: 1, serverTotalPoints: 50, pendingEvents: [] });
  const stamina = JSON.stringify({ version: 1, available: 16, updatedAtMs: Date.now() });
  for (const [key, value] of [[POINTS_KEY, points], [STAMINA_KEY, stamina]]) {
    window.sessionStorage.setItem(key, value);
    assert.equal(guest.readGuestStorageItem(key), value);
    assert.equal(window.localStorage.getItem(key), value);
    assert.equal(window.sessionStorage.getItem(key), null);
  }
});

test('newer persistent progress takes precedence over a stale temporary copy', () => {
  window.localStorage.setItem(POINTS_KEY, 'newer-save');
  window.sessionStorage.setItem(POINTS_KEY, 'older-save');
  assert.equal(guest.readGuestStorageItem(POINTS_KEY), 'newer-save');
});

test('guest sign-out leaves account caches and saved guest data untouched', () => {
  const accountKey = 'lahs.user-points.v1:account-user';
  window.localStorage.setItem(accountKey, 'account-data');
  guest.startGuestSession();
  const profile = window.localStorage.getItem(PROFILE_KEY);
  assert.ok(profile);
  guest.clearGuestSession();
  assert.equal(window.localStorage.getItem(accountKey), 'account-data');
  assert.equal(window.localStorage.getItem(PROFILE_KEY), profile);
  assert.equal(window.localStorage.getItem(SESSION_KEY), null);
});

test('blocked persistent storage reports that guest progress cannot be saved', () => {
  window.localStorage.setItem = () => { throw new Error('Storage blocked'); };
  assert.throws(() => guest.startGuestSession(), /local storage|save.*progress/i);
  assert.equal(guest.readActiveGuestUser(), null);
});

test('malformed stored guest session does not grant guest access', () => {
  window.localStorage.setItem(SESSION_KEY, '{invalid');
  assert.equal(guest.readActiveGuestUser(), null);
});
