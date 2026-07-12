import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('guest identity and profile use session storage', async () => {
  const source = await readSource('src/utils/guestSession.ts');

  assert.match(source, /window\.sessionStorage\.setItem\(STORAGE_TEST_KEY/);
  assert.match(source, /window\.sessionStorage\.getItem\(key\)/);
  assert.match(source, /window\.sessionStorage\.setItem\(key, JSON\.stringify\(value\)\)/);
  assert.doesNotMatch(source, /window\.localStorage\.setItem\(STORAGE_TEST_KEY/);
});

test('guest cleanup removes current session data and legacy persistent data', async () => {
  const source = await readSource('src/utils/guestSession.ts');

  assert.match(source, /window\.sessionStorage\.removeItem\(GUEST_SESSION_STORAGE_KEY\)/);
  assert.match(source, /window\.sessionStorage\.removeItem\(GUEST_PROFILE_STORAGE_KEY\)/);
  assert.match(source, /window\.localStorage\.removeItem\(GUEST_SESSION_STORAGE_KEY\)/);
  assert.match(source, /window\.localStorage\.removeItem\(GUEST_PROFILE_STORAGE_KEY\)/);
});

test('guest points and stamina use session storage while accounts retain local storage', async () => {
  const points = await readSource('src/context/PointsContext.tsx');
  const stamina = await readSource('src/context/StaminaContext.tsx');

  assert.match(points, /const storage = isGuestUserId\(userId\) \? window\.sessionStorage : window\.localStorage/);
  assert.match(stamina, /const storage = isGuestUserId\(userId\) \? window\.sessionStorage : window\.localStorage/);
});

test('authentication screen offers Play as Guest with reset wording', async () => {
  const source = await readSource('src/pages/AuthPage.tsx');

  assert.match(source, /Play as Guest/);
  assert.match(source, /resets when you sign out or close the browser or app/i);
  assert.doesNotMatch(source, /Log in as Guest/);
});

test('guest account settings describe temporary progress accurately', async () => {
  const source = await readSource('src/components/GlobalSettings.tsx');

  assert.match(source, /Guest profile changes last only for this play session\./);
  assert.doesNotMatch(source, /Guest profile changes are saved locally on this device\./);
});
