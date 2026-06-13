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
