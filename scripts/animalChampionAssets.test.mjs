import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
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
const dataUrl = new URL('../public/Games/Animal Champion/js/animal-data.js', import.meta.url);
const generatedGameplaySet = new Set(generatedGameplay);
const generatedUiDimensions = new Map([
  ['assets/images/ui/menu-wallpaper.webp', { width: 1536, height: 1024 }],
  ['assets/images/ui/thumb.webp', { width: 1024, height: 1024 }],
]);
let runtimeImportNonce = 0;

const loadRuntimeData = () => import(`${dataUrl.href}?test=${++runtimeImportNonce}`);

const readWebpDimensions = (buffer) => {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP');
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(data + 4, 3),
        height: 1 + buffer.readUIntLE(data + 7, 3),
      };
    }
    if (type === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    if (type === 'VP8L') {
      const bits = buffer.readUInt32LE(data + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('WebP image chunk not found');
};

const assertCaseCorrectPath = async (relativePath) => {
  let current = gameRoot;
  for (const segment of relativePath.split('/')) {
    const entries = await readdir(current);
    assert.ok(entries.includes(segment), `Case-correct path segment missing: ${relativePath}`);
    current = path.join(current, segment);
  }
  return current;
};

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

test('runtime data selects exactly 50 animals and 100 unique images', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const ids = ANIMAL_DATABASE.map(({ id }) => id);
  const names = ANIMAL_DATABASE.map(({ name }) => name);
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);

  assert.equal(ANIMAL_DATABASE.length, 50);
  assert.equal(new Set(ids).size, 50);
  assert.equal(new Set(names).size, 50);
  assert.ok(ANIMAL_DATABASE.every(({ images }) => images.length === 2 && images[0] !== images[1]));
  assert.equal(paths.length, 100);
  assert.equal(new Set(paths).size, 100);
  assert.ok(paths.every((value) => value.endsWith('.webp')));
  assert.ok(paths.every((value) => !value.includes('chatgpt-third') && !value.includes('chatgpt-fourth')));
});

test('runtime records, images, and export are immutable and have only the approved fields', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();

  assert.ok(Object.isFrozen(ANIMAL_DATABASE));
  for (const record of ANIMAL_DATABASE) {
    assert.ok(Object.isFrozen(record));
    assert.ok(Object.isFrozen(record.images));
    assert.deepEqual(Object.keys(record).sort(), ['alt', 'id', 'images', 'name']);
    assert.match(record.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(
      record.alt,
      `${/^[aeiou]/i.test(record.name) ? 'An' : 'A'} ${record.name.toLowerCase()} in its natural habitat`,
    );
  }
});

test('every selected path exists with exact casing and is included in the source manifest', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const manifest = JSON.parse(await readFile(path.join(gameRoot, 'animals-manifest.json'), 'utf8'));
  const manifestPaths = new Set(manifest.flatMap(({ images }) => images));
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);

  for (const relativePath of paths) {
    assert.ok(manifestPaths.has(relativePath), `Manifest does not include ${relativePath}`);
    const exactPath = await assertCaseCorrectPath(relativePath);
    assert.ok((await stat(exactPath)).isFile(), `Selected path is not a file: ${relativePath}`);
  }
});

test('selected images have real WebP signatures, unique SHA-256 content, and the 84/16 source split', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);
  const generatedPaths = paths.filter((relativePath) => generatedGameplaySet.has(relativePath));
  const existingPaths = paths.filter((relativePath) => !generatedGameplaySet.has(relativePath));
  const hashes = [];

  assert.equal(generatedPaths.length, 16);
  assert.equal(new Set(generatedPaths).size, 16);
  assert.equal(existingPaths.length, 84);
  for (const relativePath of paths) {
    const buffer = await readFile(path.join(gameRoot, relativePath));
    const dimensions = readWebpDimensions(buffer);
    assert.ok(dimensions.width > 0 && dimensions.height > 0, `Invalid dimensions: ${relativePath}`);
    hashes.push(createHash('sha256').update(buffer).digest('hex'));
    if (generatedGameplaySet.has(relativePath)) {
      assert.deepEqual(dimensions, { width: 853, height: 1280 }, `Generated dimensions: ${relativePath}`);
    }
  }
  assert.equal(new Set(hashes).size, 100);
});

test('generated gameplay and UI assets have approved dimensions and complete ledger coverage', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);
  const ledger = JSON.parse(
    await readFile(path.join(gameRoot, 'assets', 'image-generation-prompts.json'), 'utf8'),
  );
  const ledgerByPath = new Map(ledger.assets.map((asset) => [asset.finalPath, asset]));

  for (const relativePath of generatedGameplay) {
    assert.ok(paths.includes(relativePath), `Generated gameplay path is not selected: ${relativePath}`);
    const record = ledgerByPath.get(relativePath);
    assert.ok(record, `Generated gameplay path is not in ledger: ${relativePath}`);
    assert.deepEqual({ width: record.width, height: record.height }, { width: 853, height: 1280 });
    assert.deepEqual(
      readWebpDimensions(await readFile(path.join(gameRoot, relativePath))),
      { width: 853, height: 1280 },
    );
  }
  for (const [relativePath, dimensions] of generatedUiDimensions) {
    const record = ledgerByPath.get(relativePath);
    assert.ok(record, `UI path is not in ledger: ${relativePath}`);
    assert.deepEqual({ width: record.width, height: record.height }, dimensions);
    assert.deepEqual(readWebpDimensions(await readFile(path.join(gameRoot, relativePath))), dimensions);
  }
  assert.equal(ledger.assets.length, 18);
  assert.equal(new Set(ledger.assets.map(({ finalPath }) => finalPath)).size, 18);
});
