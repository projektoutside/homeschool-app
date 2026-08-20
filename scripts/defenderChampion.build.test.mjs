import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
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

test('built battlefield bundle projects square cells without the obsolete path module', async () => {
  const bundle = await readFile(new URL(
    '../public/Games/DefenderChampion/js/app.bundle.js',
    import.meta.url,
  ), 'utf8');
  assert.match(bundle, /square row/);
  assert.match(bundle, /BattleScene square road tiles/);
  assert.match(bundle, /BattleScene projectiles and effects, plus ResultScene art/);
  assert.match(bundle, /cellViews/);
  assert.doesNotMatch(bundle, /padSprites|path-geometry/);
  await assert.rejects(access(new URL(
    '../public/Games/DefenderChampion/src/core/path-geometry.js',
    import.meta.url,
  )));
});
