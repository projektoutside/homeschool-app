import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service worker source is stamped and compares live build metadata', async () => {
  const source = await readFile(new URL('../src/service-worker.js', import.meta.url), 'utf8');

  assert.match(source, /APP_BUILD_ID\s*=\s*__APP_BUILD_ID__/);
  assert.match(source, /APP_BUILT_AT\s*=\s*__APP_BUILT_AT__/);
  assert.match(source, /app-version\.json/);
  assert.match(source, /latestBuildId\s*!==\s*APP_BUILD_ID/);
});

test('vite build emits app-version metadata and the generated service worker', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');

  assert.match(config, /app-version\.json/);
  assert.match(config, /service-worker\.js/);
  assert.match(config, /__APP_BUILD_ID__/);
});

test('native shell removes service workers so Play asset delivery serves packaged content', async () => {
  const hook = await readFile(new URL('../src/hooks/usePWA.ts', import.meta.url), 'utf8');

  assert.match(hook, /if \(isNativeApp\)/);
  assert.match(hook, /registration\.unregister\(\)/);
  assert.match(hook, /native-sw-cleanup-reload/);
});
