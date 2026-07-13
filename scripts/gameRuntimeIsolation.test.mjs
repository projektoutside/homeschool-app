import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('root PWA only removes its own obsolete caches', async () => {
  const worker = await read('src/service-worker.js');

  assert.match(worker, /name\.startsWith\('homeschool-hub-'\)/);
});

test('Spy Academy only removes obsolete Spy Academy caches', async () => {
  const worker = await read('public/Games/SpyAcademy/sw.js');

  assert.match(worker, /cacheName\.startsWith\('spy-academy-'\)/);
});

test('Farmers Market cleanup cannot unregister or delete other app runtimes', async () => {
  const page = await read('public/Games/Farmersmarket/index.html');

  assert.match(page, /registration\.scope\.includes\('\/Games\/Farmersmarket\/'\)/);
  assert.match(page, /cacheKey\.startsWith\('farmers-market-'\)/);
});
