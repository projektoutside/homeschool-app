import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'public', 'Games', 'Animal Champion');
const generatedCatalogPath = path.join(repoRoot, 'src', 'generated', 'contentCatalog.ts');

const readRepoFile = (relativePath) => readFile(path.join(repoRoot, relativePath), 'utf8');

const parseGeneratedLiteral = (source, declaration, terminator) => {
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `Missing generated declaration: ${declaration}`);
  const literalStart = start + declaration.length;
  const literalEnd = source.indexOf(terminator, literalStart);
  assert.notEqual(literalEnd, -1, `Missing generated terminator after: ${declaration}`);
  return JSON.parse(source.slice(literalStart, literalEnd + terminator.length - 1));
};

test('Animal Champion legacy document and every selected asset are launchable', async () => {
  const html = await readFile(path.join(gameRoot, 'index.html'), 'utf8');
  assert.match(html, /href=["'](?:\.\/)?css\/style\.css["']/);
  for (const ref of ['../shared/lahsPointsBridge.js', './js/game.js']) {
    assert.match(html, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  await access(path.resolve(gameRoot, '../shared/lahsPointsBridge.js'));

  const gameSource = await readFile(path.join(gameRoot, 'js', 'game.js'), 'utf8');
  for (const ref of ['./animal-data.js', './game-engine.js']) {
    assert.match(gameSource, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const relativePath of [
    'css/style.css',
    'js/game.js',
    'js/animal-data.js',
    'js/game-engine.js',
    'assets/images/ui/menu-wallpaper.webp',
    'assets/images/ui/thumb.webp',
  ]) {
    await access(path.join(gameRoot, relativePath));
  }

  assert.equal(ANIMAL_DATABASE.length, 50);
  const selectedImages = ANIMAL_DATABASE.flatMap(({ images }) => images);
  assert.equal(selectedImages.length, 100);
  assert.equal(new Set(selectedImages).size, 100);
  for (const relativePath of selectedImages) {
    await access(path.join(gameRoot, relativePath));
  }
});

test('generated catalog registers the exact Animal Champion record and legacy alias when present', async (t) => {
  let catalogSource;
  try {
    catalogSource = await readFile(generatedCatalogPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      t.skip('generated catalog is optional in a clean source checkout');
      return;
    }
    throw error;
  }
  const contentItems = parseGeneratedLiteral(
    catalogSource,
    'export const GENERATED_CONTENT_ITEMS: ContentItem[] = ',
    '];',
  );
  const legacyPaths = parseGeneratedLiteral(
    catalogSource,
    'export const GENERATED_LEGACY_PATHS: Readonly<Record<string, string>> = ',
    '};',
  );

  assert.equal(contentItems.length, 83);
  const animalRecords = contentItems.filter(({ id }) => id === 'animal-champion');
  assert.equal(animalRecords.length, 1);
  assert.deepEqual(animalRecords[0], {
    id: 'animal-champion',
    title: 'Animal Champion',
    description: 'Identify 50 animals in fast visual challenge rounds.',
    type: 'game',
    category: 'science',
    subjects: ['Animals', 'Wildlife', 'Visual Recognition'],
    gradeLevels: ['All'],
    thumbnail: '/assets/thumbnails/optimized/animal-champion-128.webp',
    customHtmlPath: '/Games/Animal Champion/index.html',
    dateAdded: '2026-08-18',
  });
  assert.equal(legacyPaths['/Games/Animal Champion/index.html'], 'animal-champion');
  assert.equal(
    Object.values(legacyPaths).filter((id) => id === 'animal-champion').length,
    1,
  );
});

test('generic module routing launches Animal Champion without a special route', async () => {
  const registrySource = await readRepoFile('src/data/moduleRegistry.ts');

  assert.match(
    registrySource,
    /if \(item\.type === 'game'\)\s*{\s*return { kind: 'play', path: `\/play\/\$\{item\.id\}` };\s*}/,
  );
  assert.doesNotMatch(registrySource, /animal[- ]champion/i);
});
