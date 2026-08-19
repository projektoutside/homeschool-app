import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);

test('defender champion pins Phaser and bundles its local entry', () => {
  assert.equal(packageJson.dependencies?.phaser, '4.2.1');
  assert.equal(
    packageJson.scripts?.['build:defender-champion'],
    'esbuild "public/Games/DefenderChampion/src/main.js" --bundle --minify --format=iife --platform=browser --target=es2019 --outfile="public/Games/DefenderChampion/js/app.bundle.js"',
  );
  assert.match(packageJson.scripts?.build ?? '', /npm run build:defender-champion/);
});
