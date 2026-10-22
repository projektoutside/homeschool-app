import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test('defender champion keeps single-player and points metadata in the generated catalog', async () => {
  let readLegacyContentEntries;
  try {
    ({ readLegacyContentEntries } = await import('./content/source-reader.mjs'));
  } catch {
    assert.fail('expected the content source reader foundation');
  }

  const entries = readLegacyContentEntries({ repoRoot });
  const defenders = entries.filter((entry) => entry.id === 'defender-champion');

  assert.equal(defenders.length, 1, 'expected defender-champion exactly once');
  assert.equal(defenders[0]?.title, 'Defender Champion');
  assert.equal(defenders[0]?.customHtmlPath, '/Games/DefenderChampion/index.html');
  assert.equal(defenders[0]?.thumbnail, '/Games/DefenderChampion/thumb.webp');
  assert.equal(defenders[0]?.playerMode, 'single');
  assert.equal(defenders[0]?.appPointsEnabled, true);
});
