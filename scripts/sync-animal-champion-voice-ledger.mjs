import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import {
  ALL_VOICE_CLIPS,
  VOICE_GENERATION_PROFILE,
} from '../public/Games/Animal Champion/js/voice-manifest.js';

const gameRoot = new URL('../public/Games/Animal Champion/', import.meta.url);
const ledgerUrl = new URL('assets/audio/voice/voice-ledger.json', gameRoot);
const checkOnly = process.argv.includes('--check');

const clips = await Promise.all(ALL_VOICE_CLIPS.map(async (clip) => {
  const bytes = await readFile(new URL(clip.path, gameRoot));
  return {
    ...clip,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}));

const next = `${JSON.stringify({
  schemaVersion: 1,
  profile: VOICE_GENERATION_PROFILE,
  clipCount: clips.length,
  clips,
}, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(ledgerUrl, 'utf8').catch(() => '');
  if (current !== next) {
    throw new Error('Animal Champion voice ledger is stale. Run node scripts/sync-animal-champion-voice-ledger.mjs.');
  }
  console.log(`Animal Champion voice ledger is current (${clips.length} clips).`);
} else {
  await writeFile(ledgerUrl, next, 'utf8');
  console.log(`Wrote Animal Champion voice ledger (${clips.length} clips).`);
}
