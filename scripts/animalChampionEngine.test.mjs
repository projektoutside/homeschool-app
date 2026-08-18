import assert from 'node:assert/strict';
import test from 'node:test';
import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';
import {
  ANSWER_WINDOW_MS,
  AnimalChampionEngine,
  FEEDBACK_DELAY_MS,
  MODES,
  OUTCOMES,
  POINTS_PER_CORRECT,
  createPausableDeadline,
  normalizeLeaderboard,
  recordLeaderboardScore,
} from '../public/Games/Animal Champion/js/game-engine.js';

const buildEngine = (options = {}) => new AnimalChampionEngine({
  animals: ANIMAL_DATABASE,
  random: () => 0.25,
  ...options,
});

const answerCorrectly = (engine, round) => {
  assert.equal(engine.activateRound(round.roundId, round.imageOrder[0]), true);
  return engine.submitChoice(round.roundId, round.correctAnimalId);
};

test('exports the gameplay constants consumed by the controller', () => {
  assert.deepEqual(MODES, { CHALLENGER: 'challenger', CONTINUOUS: 'continuous' });
  assert.deepEqual(OUTCOMES, { CORRECT: 'correct', WRONG: 'wrong', TIMEOUT: 'timeout' });
  assert.equal(ANSWER_WINDOW_MS, 15_000);
  assert.equal(FEEDBACK_DELAY_MS, 2_000);
  assert.equal(POINTS_PER_CORRECT, 10);
  assert.ok(Object.isFrozen(MODES));
  assert.ok(Object.isFrozen(OUTCOMES));
});

test('one shuffled deck shows all 50 animals before any repeat and prevents a boundary repeat', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const seen = [];
  for (let index = 0; index < 50; index += 1) {
    const round = engine.beginRound();
    seen.push(round.correctAnimalId);
    answerCorrectly(engine, round);
    engine.finishFeedback();
  }
  assert.equal(new Set(seen).size, 50);
  assert.notEqual(engine.beginRound().correctAnimalId, seen.at(-1));
});

test('start and reset create fresh decks, clear run state, and invalidate old round IDs', () => {
  const engine = buildEngine();
  const firstRun = engine.startRun(MODES.CONTINUOUS);
  const firstRound = engine.beginRound();
  answerCorrectly(engine, firstRound);

  const secondRun = engine.startRun(MODES.CHALLENGER);
  assert.notEqual(secondRun.runId, firstRun.runId);
  assert.deepEqual(
    { phase: secondRun.phase, mode: secondRun.mode, score: secondRun.score, streak: secondRun.streak },
    { phase: 'ready', mode: MODES.CHALLENGER, score: 0, streak: 0 },
  );
  const freshRound = engine.beginRound();
  assert.equal(freshRound.correctAnimalId, firstRound.correctAnimalId);
  assert.deepEqual(engine.submitChoice(firstRound.roundId, firstRound.correctAnimalId), { accepted: false });

  engine.reset();
  assert.deepEqual(
    { phase: engine.getState().phase, mode: engine.getState().mode, score: engine.getState().score },
    { phase: 'idle', mode: null, score: 0 },
  );
  const thirdRun = engine.startRun(MODES.CONTINUOUS);
  assert.notEqual(thirdRun.runId, secondRun.runId);
  assert.equal(engine.beginRound().correctAnimalId, firstRound.correctAnimalId);
});

test('a round has four distinct shuffled choices and accepts only one result', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const round = engine.beginRound();
  assert.equal(round.choiceIds.length, 4);
  assert.equal(new Set(round.choiceIds).size, 4);
  assert.ok(round.choiceIds.includes(round.correctAnimalId));
  engine.activateRound(round.roundId, round.imageOrder[0]);
  const first = engine.submitChoice(round.roundId, round.correctAnimalId);
  const second = engine.submitChoice(round.roundId, round.correctAnimalId);
  assert.deepEqual(
    {
      accepted: first.accepted,
      outcome: first.outcome,
      score: first.score,
      streak: first.streak,
      platformPoints: first.platformPoints,
      endsRun: first.endsRun,
    },
    {
      accepted: true,
      outcome: OUTCOMES.CORRECT,
      score: 10,
      streak: 1,
      platformPoints: 10,
      endsRun: false,
    },
  );
  assert.equal(first.eventId, `${engine.getState().runId}:${round.roundId}:correct`);
  assert.deepEqual(second, { accepted: false });
});

test('stale round IDs and choices outside the current four are rejected without state changes', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const round = engine.beginRound();
  assert.equal(engine.activateRound('stale-round', round.imageOrder[0]), false);
  assert.equal(engine.activateRound(round.roundId, 'Animals/Not/In/The/Round.webp'), false);
  assert.equal(engine.activateRound(round.roundId, round.imageOrder[0]), true);
  const before = engine.getState();
  assert.deepEqual(engine.submitChoice('stale-round', round.correctAnimalId), { accepted: false });
  assert.deepEqual(engine.submitChoice(round.roundId, 'not-a-choice'), { accepted: false });
  assert.deepEqual(engine.getState(), before);
});

test('correct, wrong, and timeout outcomes score and branch correctly in both modes', () => {
  for (const mode of [MODES.CHALLENGER, MODES.CONTINUOUS]) {
    const correctEngine = buildEngine();
    correctEngine.startRun(mode);
    const correctRound = correctEngine.beginRound();
    const correct = answerCorrectly(correctEngine, correctRound);
    assert.deepEqual(
      { score: correct.score, streak: correct.streak, platformPoints: correct.platformPoints, endsRun: correct.endsRun },
      { score: 10, streak: 1, platformPoints: 10, endsRun: false },
    );
    assert.equal(correctEngine.finishFeedback().phase, 'ready');

    const wrongEngine = buildEngine();
    wrongEngine.startRun(mode);
    let round = wrongEngine.beginRound();
    answerCorrectly(wrongEngine, round);
    wrongEngine.finishFeedback();
    round = wrongEngine.beginRound();
    wrongEngine.activateRound(round.roundId, round.imageOrder[0]);
    const wrongId = round.choiceIds.find((id) => id !== round.correctAnimalId);
    const wrong = wrongEngine.submitChoice(round.roundId, wrongId);
    assert.deepEqual(
      {
        outcome: wrong.outcome,
        selectedAnimalId: wrong.selectedAnimalId,
        score: wrong.score,
        streak: wrong.streak,
        platformPoints: wrong.platformPoints,
        eventId: wrong.eventId,
        endsRun: wrong.endsRun,
      },
      {
        outcome: OUTCOMES.WRONG,
        selectedAnimalId: wrongId,
        score: 10,
        streak: 0,
        platformPoints: 0,
        eventId: null,
        endsRun: mode === MODES.CHALLENGER,
      },
    );
    assert.equal(wrongEngine.finishFeedback().phase, mode === MODES.CHALLENGER ? 'game-over' : 'ready');

    const timeoutEngine = buildEngine();
    timeoutEngine.startRun(mode);
    round = timeoutEngine.beginRound();
    answerCorrectly(timeoutEngine, round);
    timeoutEngine.finishFeedback();
    round = timeoutEngine.beginRound();
    timeoutEngine.activateRound(round.roundId, round.imageOrder[0]);
    const timeout = timeoutEngine.timeout(round.roundId);
    assert.deepEqual(
      {
        outcome: timeout.outcome,
        selectedAnimalId: timeout.selectedAnimalId,
        score: timeout.score,
        streak: timeout.streak,
        platformPoints: timeout.platformPoints,
        eventId: timeout.eventId,
        endsRun: timeout.endsRun,
      },
      {
        outcome: OUTCOMES.TIMEOUT,
        selectedAnimalId: null,
        score: 10,
        streak: 0,
        platformPoints: 0,
        eventId: null,
        endsRun: mode === MODES.CHALLENGER,
      },
    );
    assert.deepEqual(timeoutEngine.timeout(round.roundId), { accepted: false });
    assert.equal(timeoutEngine.finishFeedback().phase, mode === MODES.CHALLENGER ? 'game-over' : 'ready');
  }
});

test('correct event IDs are stable, unique by run and round, and cannot award twice', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const firstRound = engine.beginRound();
  const first = answerCorrectly(engine, firstRound);
  assert.deepEqual(engine.timeout(firstRound.roundId), { accepted: false });
  engine.finishFeedback();
  const secondRound = engine.beginRound();
  const second = answerCorrectly(engine, secondRound);
  assert.equal(first.platformPoints, 10);
  assert.equal(second.platformPoints, 10);
  assert.notEqual(first.eventId, second.eventId);
  assert.equal(first.eventId, `${engine.getState().runId}:${firstRound.roundId}:correct`);
  assert.equal(second.eventId, `${engine.getState().runId}:${secondRound.roundId}:correct`);
});

test('image preference alternates first attempts and de-duplicates single-image fallback order', () => {
  const animals = [
    { id: 'a', name: 'A', alt: 'A', images: ['a-primary.webp', 'a-secondary.webp'] },
    { id: 'b', name: 'B', alt: 'B', images: ['b-only.webp', 'b-only.webp'] },
    { id: 'c', name: 'C', alt: 'C', images: ['c-primary.webp', 'c-secondary.webp'] },
    { id: 'd', name: 'D', alt: 'D', images: ['d-primary.webp', 'd-secondary.webp'] },
  ];
  const engine = buildEngine({ animals, random: () => 0 });
  engine.startRun(MODES.CONTINUOUS);
  const first = engine.beginRound();
  assert.deepEqual(first.imageOrder, ['a-primary.webp', 'a-secondary.webp']);
  engine.startRun(MODES.CONTINUOUS);
  const alternate = engine.beginRound();
  assert.equal(alternate.correctAnimalId, 'a');
  assert.deepEqual(alternate.imageOrder, ['a-secondary.webp', 'a-primary.webp']);

  const singleImageEngine = buildEngine({ animals, random: () => 0.5 });
  singleImageEngine.startRun(MODES.CONTINUOUS);
  let round;
  for (let index = 0; index < 4; index += 1) {
    round = singleImageEngine.beginRound();
    if (round.correctAnimalId === 'b') break;
    singleImageEngine.discardBrokenRound(round.roundId);
  }
  assert.equal(round.correctAnimalId, 'b');
  assert.deepEqual(round.imageOrder, ['b-only.webp']);
});

test('broken rounds are discarded only while loading and all-broken exhaustion is recoverable', () => {
  const animals = ['a', 'b', 'c', 'd'].map((id) => ({
    id,
    name: id.toUpperCase(),
    alt: id,
    images: [`${id}-1.webp`, `${id}-2.webp`],
  }));
  const engine = buildEngine({ animals, random: () => 0 });
  engine.startRun(MODES.CONTINUOUS);
  const discarded = [];
  for (let index = 0; index < animals.length; index += 1) {
    const round = engine.beginRound();
    discarded.push(round.correctAnimalId);
    assert.deepEqual(engine.discardBrokenRound('stale-round'), { accepted: false });
    assert.deepEqual(engine.discardBrokenRound(round.roundId), { accepted: true, exhausted: index === animals.length - 1 });
  }
  assert.equal(new Set(discarded).size, 4);
  assert.equal(engine.getState().phase, 'content-error');
  assert.equal(engine.beginRound(), null);

  const recovered = engine.startRun(MODES.CONTINUOUS);
  assert.equal(recovered.phase, 'ready');
  assert.ok(engine.beginRound());
});

test('public snapshots cannot mutate engine state', () => {
  const engine = buildEngine();
  const started = engine.startRun(MODES.CONTINUOUS);
  started.score = 999;
  const round = engine.beginRound();
  round.choiceIds.length = 0;
  round.imageOrder[0] = 'tampered.webp';
  const state = engine.getState();
  state.score = 999;
  state.currentRound.choiceIds.length = 0;
  assert.equal(engine.getState().score, 0);
  assert.equal(engine.getState().currentRound.choiceIds.length, 4);
  assert.notEqual(engine.getState().currentRound.imageOrder[0], 'tampered.webp');
});

test('illegal phase transitions and invalid random outputs are rejected safely', () => {
  assert.throws(() => new AnimalChampionEngine({ animals: ANIMAL_DATABASE.slice(0, 3) }), /At least four animals/);
  assert.throws(() => buildEngine().startRun('survival'), /Invalid game mode/);
  assert.throws(() => buildEngine({ random: () => Number.NaN }).startRun(MODES.CONTINUOUS), /random.*finite/i);
  assert.throws(() => buildEngine({ random: () => 1 }).startRun(MODES.CONTINUOUS), /random.*less than 1/i);

  const engine = buildEngine();
  assert.equal(engine.beginRound(), null);
  assert.equal(engine.finishFeedback(), null);
  engine.startRun(MODES.CONTINUOUS);
  assert.equal(engine.finishFeedback(), null);
  const round = engine.beginRound();
  assert.equal(engine.beginRound(), null);
  assert.deepEqual(engine.timeout(round.roundId), { accepted: false });
  assert.equal(engine.finishFeedback(), null);
  engine.activateRound(round.roundId, round.imageOrder[0]);
  assert.deepEqual(engine.discardBrokenRound(round.roundId), { accepted: false });
  engine.timeout(round.roundId);
  assert.equal(engine.activateRound(round.roundId, round.imageOrder[0]), false);
  assert.equal(engine.finishFeedback().phase, 'ready');
});

test('leaderboard normalization rejects corruption and keeps valid positive integer dated top three', () => {
  const entries = [
    { score: 20, date: '2026-08-18T10:00:00.000Z' },
    { score: 50, date: '2026-08-17T10:00:00.000Z' },
    { score: 30, date: '2026-08-16T10:00:00.000Z' },
    { score: 40, date: '2026-08-15T10:00:00.000Z' },
    { score: 0, date: '2026-08-14T10:00:00.000Z' },
    { score: -1, date: '2026-08-14T10:00:00.000Z' },
    { score: 2.5, date: '2026-08-14T10:00:00.000Z' },
    { score: Number.POSITIVE_INFINITY, date: '2026-08-14T10:00:00.000Z' },
    { score: '100', date: '2026-08-14T10:00:00.000Z' },
    { score: 100, date: 'not-a-date' },
    { score: 90, date: '2026-02-30T10:00:00.000Z' },
    null,
  ];
  assert.deepEqual(normalizeLeaderboard(entries), [
    { score: 50, date: '2026-08-17T10:00:00.000Z' },
    { score: 40, date: '2026-08-15T10:00:00.000Z' },
    { score: 30, date: '2026-08-16T10:00:00.000Z' },
  ]);
  assert.deepEqual(normalizeLeaderboard('{broken json'), []);
  assert.deepEqual(normalizeLeaderboard({ score: 10 }), []);
});

test('recording a leaderboard score ignores zero and returns a normalized top three', () => {
  const raw = [
    { score: 30, date: '2026-08-15T00:00:00.000Z' },
    { score: 10, date: '2026-08-14T00:00:00.000Z' },
  ];
  assert.deepEqual(recordLeaderboardScore(raw, 0, '2026-08-18T00:00:00.000Z'), raw);
  assert.deepEqual(recordLeaderboardScore(raw, 20, '2026-08-18T00:00:00.000Z'), [
    { score: 30, date: '2026-08-15T00:00:00.000Z' },
    { score: 20, date: '2026-08-18T00:00:00.000Z' },
    { score: 10, date: '2026-08-14T00:00:00.000Z' },
  ]);
  assert.deepEqual(recordLeaderboardScore(raw, 40, 'invalid'), raw);
});

test('pausable deadline starts, pauses hidden time, resumes, and expires exactly once', () => {
  let currentTime = 1_000;
  let nextFrameId = 0;
  const frames = new Map();
  const ticks = [];
  let expirations = 0;
  const deadline = createPausableDeadline({
    durationMs: 1_000,
    now: () => currentTime,
    requestFrame: (callback) => {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    },
    cancelFrame: (frameId) => frames.delete(frameId),
    onTick: (remainingMs, ratio) => ticks.push([remainingMs, ratio]),
    onExpire: () => { expirations += 1; },
  });
  const advanceFrame = (elapsedMs) => {
    currentTime += elapsedMs;
    const [frameId, callback] = frames.entries().next().value;
    frames.delete(frameId);
    callback(currentTime);
  };

  deadline.start();
  assert.deepEqual(ticks.at(-1), [1_000, 1]);
  advanceFrame(400);
  assert.deepEqual(ticks.at(-1), [600, 0.6]);
  deadline.pause();
  assert.equal(deadline.getRemainingMs(), 600);
  assert.equal(frames.size, 0);
  currentTime += 5_000;
  deadline.resume();
  assert.equal(deadline.getRemainingMs(), 600);
  advanceFrame(599);
  assert.deepEqual(ticks.at(-1), [1, 0.001]);
  advanceFrame(1);
  assert.deepEqual(ticks.at(-1), [0, 0]);
  assert.equal(expirations, 1);
  assert.equal(frames.size, 0);
  deadline.resume();
  assert.equal(expirations, 1);
});

test('pausable deadline stop cancels work and a later start uses the full duration', () => {
  let currentTime = 0;
  let nextFrameId = 0;
  const frames = new Map();
  let expirations = 0;
  const deadline = createPausableDeadline({
    durationMs: 100,
    now: () => currentTime,
    requestFrame: (callback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => frames.delete(id),
    onTick: () => {},
    onExpire: () => { expirations += 1; },
  });
  deadline.start();
  currentTime = 40;
  deadline.pause();
  assert.equal(deadline.getRemainingMs(), 60);
  deadline.stop();
  assert.equal(frames.size, 0);
  currentTime = 1_000;
  deadline.start();
  assert.equal(deadline.getRemainingMs(), 100);
  const [, callback] = frames.entries().next().value;
  frames.clear();
  currentTime = 1_100;
  callback(currentTime);
  assert.equal(expirations, 1);
});
