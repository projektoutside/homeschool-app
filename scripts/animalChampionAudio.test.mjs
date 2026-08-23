import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';
import {
  ALL_VOICE_CLIPS,
  VOICE_GENERATION_PROFILE,
  VOICE_LIBRARY,
} from '../public/Games/Animal Champion/js/voice-manifest.js';
import {
  AnimalChampionAudio,
  RecentClipSelector,
  selectCorrectPool,
  selectGameOverPool,
} from '../public/Games/Animal Champion/js/audio-system.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = new URL('../public/Games/Animal Champion/', import.meta.url);

test('voice manifest is a complete ElevenLabs Animal Champion MP3 contract', () => {
  assert.deepEqual(VOICE_GENERATION_PROFILE, {
    provider: 'ElevenLabs',
    voiceName: 'Animal Champion',
    language: 'English',
    model: 'Eleven v3',
    speed: 1,
    stability: 0.5,
    similarityBoost: 0.75,
    outputFormat: 'MP3 44.1 kHz (128kbps)',
  });
  assert.equal(ALL_VOICE_CLIPS.length, 179);
  assert.equal(VOICE_LIBRARY.menu.length, 6);
  assert.equal(VOICE_LIBRARY.start.length, 5);
  assert.equal(VOICE_LIBRARY.prompt.length, 24);
  assert.equal(Object.values(VOICE_LIBRARY.correct).flat().length, 27);
  assert.equal(VOICE_LIBRARY.wrong.length, 18);
  assert.equal(VOICE_LIBRARY.timeout.length, 12);
  assert.equal(Object.values(VOICE_LIBRARY.gameOver).flat().length, 12);
  assert.equal(Object.keys(VOICE_LIBRARY.animals).length, 75);

  const animalIds = ANIMAL_DATABASE.map(({ id }) => id).sort();
  assert.deepEqual(Object.keys(VOICE_LIBRARY.animals).sort(), animalIds);

  const ids = ALL_VOICE_CLIPS.map(({ id }) => id);
  const paths = ALL_VOICE_CLIPS.map(({ path }) => path);
  const scripts = ALL_VOICE_CLIPS.map(({ script }) => script);
  assert.equal(new Set(ids).size, ids.length, 'voice IDs must be unique');
  assert.equal(new Set(paths).size, paths.length, 'voice paths must be unique');
  assert.equal(new Set(scripts).size, scripts.length, 'every generated performance must be distinct');
  assert.deepEqual(new Set(ALL_VOICE_CLIPS.map(({ persona }) => persona)), new Set([
    'bubbly-host',
    'curious-naturalist',
    'cheeky-ranger',
    'dramatic-commentator',
    'warm-coach',
    'whimsical-guide',
  ]));
  for (const voice of ALL_VOICE_CLIPS) {
    assert.match(voice.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(voice.path, /^assets\/audio\/voice\/[a-z0-9/-]+\.mp3$/);
    assert.ok(voice.persona.length >= 4);
    assert.match(voice.script, /^\[[^\]]+\] /, `${voice.id} must direct an expressive performance`);
    assert.ok(voice.script.length >= 20 && voice.script.length <= 180, `${voice.id} script length`);
  }
  for (const animal of ANIMAL_DATABASE) {
    assert.match(
      VOICE_LIBRARY.animals[animal.id].script,
      new RegExp(`\\b${animal.name.replace(/\s+/g, '\\s+')}\\b`, 'i'),
      `${animal.name} response must name the revealed animal`,
    );
  }
});

test('all 179 selected voice clips exist and contain MP3 data', async () => {
  await Promise.all(ALL_VOICE_CLIPS.map(async ({ id, path }) => {
    const url = new URL(path, gameRoot);
    const details = await stat(url);
    assert.ok(details.size > 1_000, `${id} must not be an empty placeholder`);
    const bytes = await readFile(url);
    const hasId3 = bytes.subarray(0, 3).toString('ascii') === 'ID3';
    const hasFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    assert.ok(hasId3 || hasFrameSync, `${id} must have a valid MP3 header`);
  }));
});

test('voice ledger records the exact generation script and SHA-256 for every MP3', async () => {
  const ledger = JSON.parse(await readFile(new URL(
    '../public/Games/Animal Champion/assets/audio/voice/voice-ledger.json',
    import.meta.url,
  ), 'utf8'));
  assert.equal(ledger.schemaVersion, 1);
  assert.deepEqual(ledger.profile, VOICE_GENERATION_PROFILE);
  assert.equal(ledger.clipCount, 179);
  assert.deepEqual(ledger.clips.map(({ id }) => id), ALL_VOICE_CLIPS.map(({ id }) => id));
  await Promise.all(ledger.clips.map(async (entry, index) => {
    const expected = ALL_VOICE_CLIPS[index];
    assert.deepEqual(
      { id: entry.id, path: entry.path, persona: entry.persona, script: entry.script },
      expected,
    );
    const bytes = await readFile(new URL(entry.path, gameRoot));
    assert.equal(entry.bytes, bytes.length);
    assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'));
  }));
});

test('recent selector suppresses repeats until the eligible pool is exhausted', () => {
  const clips = Array.from({ length: 4 }, (_, index) => ({ id: `clip-${index}`, path: `${index}.mp3` }));
  const selector = new RecentClipSelector({ random: () => 0, historySize: 3 });
  const firstCycle = Array.from({ length: 4 }, () => selector.pick('prompt', clips).id);
  assert.equal(new Set(firstCycle).size, 4);
  assert.notEqual(selector.pick('prompt', clips).id, firstCycle.at(-1));
});

test('feedback and result pools adapt to speed, streak, and score', () => {
  assert.equal(selectCorrectPool({ streak: 10, remainingMs: 1_000 }), VOICE_LIBRARY.correct.streak10);
  assert.equal(selectCorrectPool({ streak: 5, remainingMs: 1_000 }), VOICE_LIBRARY.correct.streak5);
  assert.equal(selectCorrectPool({ streak: 3, remainingMs: 1_000 }), VOICE_LIBRARY.correct.streak3);
  assert.equal(selectCorrectPool({ streak: 6, remainingMs: 1_000 }), VOICE_LIBRARY.correct.normal);
  assert.equal(selectCorrectPool({ streak: 15, remainingMs: 11_000 }), VOICE_LIBRARY.correct.quick);
  assert.equal(selectCorrectPool({ streak: 2, remainingMs: 11_000 }), VOICE_LIBRARY.correct.quick);
  assert.equal(selectCorrectPool({ streak: 2, remainingMs: 4_000 }), VOICE_LIBRARY.correct.normal);
  assert.equal(selectGameOverPool(10), VOICE_LIBRARY.gameOver.low);
  assert.equal(selectGameOverPool(50), VOICE_LIBRARY.gameOver.mid);
  assert.equal(selectGameOverPool(100), VOICE_LIBRARY.gameOver.high);
});

class FakeAudio {
  static created = [];

  constructor(path) {
    this.src = path;
    this.preload = 'none';
    this.paused = true;
    this.currentTime = 0;
    FakeAudio.created.push(this);
  }

  load() {}

  play() {
    this.paused = false;
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

test('audio sequences play contextual feedback then the matching animal', async () => {
  FakeAudio.created = [];
  const storage = new Map();
  const audio = new AnimalChampionAudio({
    window: {
      Audio: FakeAudio,
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      setTimeout,
      clearTimeout,
    },
    random: () => 0,
  });

  await audio.playFeedback({ outcome: 'correct', animalId: 'octopus', streak: 1, remainingMs: 8_000 });
  assert.equal(FakeAudio.created.length, 2);
  assert.match(FakeAudio.created[0].src, /correct-normal/);
  assert.match(FakeAudio.created[1].src, /animals\/octopus\.mp3$/);

  audio.setEnabled(false);
  assert.equal(audio.enabled, false);
  assert.equal(storage.get('animalChampionSoundEnabled'), 'false');
});

test('disabling narration cancels an active clip and settles its playback promise', async () => {
  class HangingAudio extends FakeAudio {
    play() {
      this.paused = false;
      return Promise.resolve();
    }
  }
  HangingAudio.created = [];
  const audio = new AnimalChampionAudio({
    window: { Audio: HangingAudio, setTimeout, clearTimeout },
    random: () => 0,
  });
  const playback = audio.playPool('prompt', VOICE_LIBRARY.prompt);
  await Promise.resolve();
  const active = FakeAudio.created.at(-1);
  assert.equal(active.paused, false);
  audio.setEnabled(false);
  assert.equal(await playback, false);
  assert.equal(active.paused, true);
});

test('visibility pauses both playback and its watchdog, then resumes them together', async () => {
  class HangingAudio extends FakeAudio {
    play() {
      this.paused = false;
      this.playCount = (this.playCount ?? 0) + 1;
      return Promise.resolve();
    }
  }
  const timers = new Map();
  let nextTimerId = 1;
  const audio = new AnimalChampionAudio({
    window: {
      Audio: HangingAudio,
      setTimeout: (callback) => {
        const id = nextTimerId;
        nextTimerId += 1;
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
    random: () => 0,
  });

  const playback = audio.playPool('prompt', VOICE_LIBRARY.prompt);
  await Promise.resolve();
  const active = FakeAudio.created.at(-1);
  assert.equal(timers.size, 1);

  audio.setVisibilityHidden(true);
  assert.equal(active.paused, true);
  assert.equal(timers.size, 0, 'hidden narration must not expire while the page is paused');

  audio.setVisibilityHidden(false);
  await Promise.resolve();
  assert.equal(active.paused, false);
  assert.equal(active.playCount, 2);
  assert.equal(timers.size, 1, 'resumed narration gets a fresh safety watchdog');

  audio.cancel();
  assert.equal(await playback, false);
  assert.equal(audio.pausedForVisibility, false);
  assert.equal(timers.size, 0);
});

test('audio failures resolve safely so gameplay can never depend on narration', async () => {
  class RejectingAudio extends FakeAudio {
    play() {
      return Promise.reject(new Error('autoplay denied'));
    }
  }
  const audio = new AnimalChampionAudio({
    window: { Audio: RejectingAudio, setTimeout, clearTimeout },
    random: () => 0,
  });
  await assert.doesNotReject(audio.playPool('prompt', VOICE_LIBRARY.prompt));
  await assert.doesNotReject(audio.playFeedback({
    outcome: 'timeout', animalId: 'lion', streak: 0, remainingMs: 0,
  }));
});

test('audio source paths stay within the game root', () => {
  const normalizedRoot = fileURLToPath(gameRoot).toLowerCase();
  for (const { path } of ALL_VOICE_CLIPS) {
    const resolved = fileURLToPath(new URL(path, gameRoot)).toLowerCase();
    assert.ok(resolved.startsWith(normalizedRoot), `${path} escaped ${repoRoot}`);
  }
});
