import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AuthBootTimeoutError,
  getSessionAfterRefreshFailure,
  isUsableSupabaseSession,
  withAuthTimeout,
} from '../src/context/authBoot.ts';

const futureSession = {
  user: { id: 'user-1' },
  expires_at: Math.floor(Date.now() / 1000) + 60,
};

const expiredSession = {
  user: { id: 'user-1' },
  expires_at: Math.floor(Date.now() / 1000) - 60,
};

test('isUsableSupabaseSession accepts user sessions that are not expired', () => {
  assert.equal(isUsableSupabaseSession(futureSession), true);
  assert.equal(isUsableSupabaseSession({ user: { id: 'user-1' } }), true);
});

test('isUsableSupabaseSession rejects missing, userless, and expired sessions', () => {
  assert.equal(isUsableSupabaseSession(null), false);
  assert.equal(isUsableSupabaseSession({ expires_at: futureSession.expires_at }), false);
  assert.equal(isUsableSupabaseSession(expiredSession), false);
});

test('getSessionAfterRefreshFailure keeps an unexpired cached session only for timeout failures', () => {
  assert.equal(
    getSessionAfterRefreshFailure(futureSession, new AuthBootTimeoutError('refreshSession', 3000)),
    futureSession,
  );
  assert.equal(getSessionAfterRefreshFailure(futureSession, new Error('invalid refresh token')), null);
  assert.equal(
    getSessionAfterRefreshFailure(expiredSession, new AuthBootTimeoutError('refreshSession', 3000)),
    null,
  );
});

test('withAuthTimeout rejects slow auth operations with AuthBootTimeoutError', async () => {
  await assert.rejects(
    () => withAuthTimeout(new Promise(() => {}), 5, 'getSession'),
    AuthBootTimeoutError,
  );
});

test('protected-route bootstrap allows authenticated and persisted guests, waits while unresolved, and denies unauthenticated access', async () => {
  const {
    createInitialAuthState,
    resolveProtectedRouteState,
  } = await import('../src/context/authBoot.ts');
  const accountUser = { id: 'account-user' };
  const guestUser = { id: 'local-guest-device', app_metadata: { is_guest: true } };

  assert.equal(resolveProtectedRouteState({ user: accountUser, loading: false }), 'allow');

  const localGuestState = createInitialAuthState({
    remoteAuthAvailable: false,
    readPersistedGuest: () => guestUser,
  });
  assert.deepEqual(localGuestState, { loading: false, user: guestUser });
  assert.equal(resolveProtectedRouteState(localGuestState), 'allow');

  const remoteGuestState = createInitialAuthState({
    remoteAuthAvailable: true,
    readPersistedGuest: () => guestUser,
  });
  assert.deepEqual(remoteGuestState, { loading: true, user: guestUser });
  assert.equal(resolveProtectedRouteState(remoteGuestState), 'pending');
  assert.equal(resolveProtectedRouteState({ ...remoteGuestState, loading: false }), 'allow');

  const unresolvedState = createInitialAuthState({
    remoteAuthAvailable: true,
    readPersistedGuest: () => null,
  });
  assert.deepEqual(unresolvedState, { loading: true, user: null });
  assert.equal(resolveProtectedRouteState(unresolvedState), 'pending');
  assert.equal(resolveProtectedRouteState({ loading: false, user: null }), 'deny');
});
