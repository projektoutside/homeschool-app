import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCatalog } from './content/build-catalog.mjs';
import { readLegacyContentEntries } from './content/source-reader.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

test('generated catalog preserves all 82 legacy entries and route aliases deterministically', async (context) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'homeschool-content-catalog-'));
  context.after(() => rm(tempDir, { recursive: true, force: true }));
  const firstOutput = path.join(tempDir, 'contentCatalog.ts');
  const secondOutput = path.join(tempDir, 'contentCatalog-second.ts');

  const legacy = readLegacyContentEntries({ repoRoot });
  await buildCatalog({ repoRoot, outputFile: firstOutput });
  await buildCatalog({ repoRoot, outputFile: secondOutput });

  const generated = await import(`${pathToFileURL(firstOutput).href}?test=${Date.now()}`);
  const firstText = await readFile(firstOutput, 'utf8');
  const secondText = await readFile(secondOutput, 'utf8');
  let checkedInText;
  try {
    checkedInText = await readFile(path.join(repoRoot, 'src', 'generated', 'contentCatalog.ts'), 'utf8');
  } catch {
    assert.fail('expected a generated content catalog; run npm run sync:content-catalog');
  }
  const sortedLegacy = [...legacy].sort((left, right) => compareText(left.id, right.id));
  const legacyIdsByPath = new Map();
  for (const { customHtmlPath, id } of legacy) {
    if (!customHtmlPath) continue;
    const ids = legacyIdsByPath.get(customHtmlPath) ?? [];
    ids.push(id);
    legacyIdsByPath.set(customHtmlPath, ids);
  }
  const expectedLegacyPaths = Object.fromEntries(
    [...legacyIdsByPath.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([legacyPath, ids]) => [legacyPath, ids.sort()[0]]),
  );

  assert.equal(legacy.length, 82);
  assert.deepEqual(generated.GENERATED_EXPERIENCES, []);
  assert.equal(generated.GENERATED_CONTENT_ITEMS.length, legacy.length);
  assert.deepEqual(
    generated.GENERATED_CONTENT_ITEMS.map(({ id }) => id).sort(),
    legacy.map(({ id }) => id).sort(),
  );
  assert.equal(new Set(generated.GENERATED_CONTENT_ITEMS.map(({ id }) => id)).size, legacy.length);
  assert.deepEqual(generated.GENERATED_CONTENT_ITEMS, sortedLegacy);
  assert.deepEqual(generated.GENERATED_LEGACY_PATHS, expectedLegacyPaths);
  assert.deepEqual(
    generated.GENERATED_CONTENT_ITEMS.filter(({ id }) => id === 'defender-champion'),
    [{
      id: 'defender-champion',
      title: 'Defender Champion',
      description: 'Command four defenders, hold the path, and survive a ten-level pure-strategy campaign.',
      type: 'game',
      category: 'strategy',
      subjects: ['Strategy', 'Resource Management', 'Problem Solving'],
      gradeLevels: ['All'],
      customHtmlPath: '/Games/DefenderChampion/index.html',
      thumbnail: '/Games/DefenderChampion/thumb.webp',
      dateAdded: '2026-08-18',
    }],
  );
  assert.equal(
    generated.GENERATED_LEGACY_PATHS['/Games/DefenderChampion/index.html'],
    'defender-champion',
  );
  for (const [legacyPath, ids] of legacyIdsByPath) {
    assert.ok(legacyPath in generated.GENERATED_LEGACY_PATHS);
    assert.ok(ids.includes(generated.GENERATED_LEGACY_PATHS[legacyPath]));
  }
  assert.equal(firstText, secondText);
  assert.equal(firstText, checkedInText);
});
