import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'public', 'Games', 'Animal Champion');
const generatedGameplay = [
  'Animals/Bat/animal-champion-secondary.webp',
  'Animals/Cheetah/animal-champion-secondary.webp',
  'Animals/Crocodile/animal-champion-primary.webp',
  'Animals/Crocodile/animal-champion-secondary.webp',
  'Animals/Giraffe/animal-champion-secondary.webp',
  'Animals/Goat/animal-champion-secondary.webp',
  'Animals/Gorilla/animal-champion-secondary.webp',
  'Animals/Hippopotamus/animal-champion-secondary.webp',
  'Animals/Octopus/animal-champion-primary.webp',
  'Animals/Octopus/animal-champion-secondary.webp',
  'Animals/Pig/animal-champion-secondary.webp',
  'Animals/Rabbit/animal-champion-secondary.webp',
  'Animals/Shark/animal-champion-secondary.webp',
  'Animals/Snake/animal-champion-secondary.webp',
  'Animals/Tiger/animal-champion-secondary.webp',
  'Animals/Zebra/animal-champion-secondary.webp',
];
const generatedUi = [
  'assets/images/ui/menu-wallpaper.webp',
  'assets/images/ui/thumb.webp',
];
const derivedCatalogThumbnail = path.join(
  repoRoot,
  'public',
  'assets',
  'thumbnails',
  'optimized',
  'animal-champion-128.webp',
);

test('all approved generated originals and their prompt records exist', async () => {
  const promptPath = path.join(gameRoot, 'assets', 'image-generation-prompts.json');
  const ledger = JSON.parse(await readFile(promptPath, 'utf8'));
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.assets.length, 18);
  assert.equal(new Set(ledger.assets.map(({ finalPath }) => finalPath)).size, 18);

  for (const relativePath of [...generatedGameplay, ...generatedUi]) {
    assert.ok((await stat(path.join(gameRoot, relativePath))).size > 0);
    assert.ok(ledger.assets.some(({ finalPath }) => finalPath === relativePath));
  }

  assert.ok((await stat(derivedCatalogThumbnail)).size > 0);
  assert.ok(
    !ledger.assets.some(
      ({ finalPath }) =>
        finalPath === 'assets/thumbnails/optimized/animal-champion-128.webp' ||
        finalPath === 'public/assets/thumbnails/optimized/animal-champion-128.webp',
    ),
  );
});
