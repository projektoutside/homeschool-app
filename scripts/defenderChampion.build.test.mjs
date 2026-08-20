import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
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

test('committed battlefield bundle is exact-byte reproducible in memory', async () => {
  const bundleUrl = new URL(
    '../public/Games/DefenderChampion/js/app.bundle.js',
    import.meta.url,
  );
  const committedBundle = await readFile(bundleUrl);
  const result = await build({
    bundle: true,
    entryPoints: [fileURLToPath(new URL(
      '../public/Games/DefenderChampion/src/main.js',
      import.meta.url,
    ))],
    format: 'iife',
    logLevel: 'silent',
    minify: true,
    platform: 'browser',
    target: 'es2019',
    write: false,
  });
  assert.equal(result.outputFiles.length, 1);
  const inMemoryBundle = Buffer.from(result.outputFiles[0].contents);
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  assert.equal(
    sha256(committedBundle),
    sha256(inMemoryBundle),
    'committed Defender bundle must exactly match an in-memory production build',
  );
  assert.equal(Buffer.compare(committedBundle, inMemoryBundle), 0);
  await assert.rejects(access(new URL(
    '../public/Games/DefenderChampion/src/core/path-geometry.js',
    import.meta.url,
  )));
});
