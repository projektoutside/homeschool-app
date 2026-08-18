import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const pipelineUrl = new URL('./optimize-animal-champion-images.py', import.meta.url);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const pipelinePath = fileURLToPath(pipelineUrl);
const pythonPath = process.env.ANIMAL_ASSET_PYTHON
  ?? 'C:\\Users\\Xator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe';

test('Animal Champion imports are explicit, atomic, and source preserving', async () => {
  const source = await readFile(pipelineUrl, 'utf8');

  assert.match(source, /--import-source/);
  assert.match(source, /--output/);
  assert.match(source, /--preset/);
  assert.match(source, /--refresh-manifest/);
  assert.match(source, /--check/);
  assert.match(source, /destination\.exists\(\)/);
  assert.match(source, /temp_path\.replace\(destination\)/);
  assert.doesNotMatch(source, /source_path\.unlink\(\)/);
});

test('Animal Champion pipeline defines every approved output size', async () => {
  const source = await readFile(pipelineUrl, 'utf8');

  assert.match(source, /["']animal["']\s*:\s*\(853,\s*1280\)/);
  assert.match(source, /["']wallpaper["']\s*:\s*\(1536,\s*1024\)/);
  assert.match(source, /["']thumb["']\s*:\s*\(1024,\s*1024\)/);
  assert.match(source, /["']catalog-thumb["']\s*:\s*\(128,\s*128\)/);
});

test('Animal Champion imports preserve a WebP source and refuse an existing destination', async () => {
  const sourcePath = fileURLToPath(new URL('../public/Games/Animal Champion/Animals/Bat/chatgpt-anime.webp', import.meta.url));
  const destinationPath = fileURLToPath(new URL(`../public/assets/thumbnails/optimized/.animal-pipeline-test-${process.pid}.webp`, import.meta.url));
  const temporaryPath = `${destinationPath}.tmp`;
  const sourceBefore = await readFile(sourcePath);

  try {
    const imported = spawnSync(
      pythonPath,
      [pipelinePath, '--import-source', sourcePath, '--output', destinationPath, '--preset', 'catalog-thumb'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal((await stat(destinationPath)).isFile(), true);
    assert.deepEqual(await readFile(sourcePath), sourceBefore);
    assert.equal(existsSync(temporaryPath), false);

    const refused = spawnSync(
      pythonPath,
      [pipelinePath, '--import-source', sourcePath, '--output', destinationPath, '--preset', 'catalog-thumb'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /Refusing to overwrite existing asset/);
    assert.deepEqual(await readFile(sourcePath), sourceBefore);
  } finally {
    await rm(destinationPath, { force: true });
    await rm(temporaryPath, { force: true });
  }
});
