import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test('defender champion is wired into the legacy catalog and single-player points surfaces', async () => {
  let readLegacyContentEntries;
  try {
    ({ readLegacyContentEntries } = await import('./content/source-reader.mjs'));
  } catch {
    assert.fail('expected the content source reader foundation');
  }

  const entries = readLegacyContentEntries({ repoRoot });
  const defenders = entries.filter((entry) => entry.id === 'defender-champion');
  const homeSource = await readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
  const pointsSource = await readFile(new URL('../src/utils/gamePoints.ts', import.meta.url), 'utf8');

  assert.equal(defenders.length, 1, 'expected defender-champion exactly once');
  assert.equal(defenders[0]?.title, 'Defender Champion');
  assert.equal(defenders[0]?.customHtmlPath, '/Games/DefenderChampion/index.html');
  assert.equal(defenders[0]?.thumbnail, '/Games/DefenderChampion/thumb.webp');
  assert.equal(homeSource.match(/'defender-champion'/g)?.length, 1);
  assert.equal(pointsSource.match(/'defender-champion'/g)?.length, 1);
});
