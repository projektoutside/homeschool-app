import assert from 'node:assert/strict';
import test from 'node:test';
import { COINS, ORDER, LEVELS, ROUTE, Session, SAVE_KEY, LEGACY_KEY, createChallenge, validChallenge, optimalCoins, sumCoins, normalizeProgress, readProgress, writeProgress, applyReward, buyPrize } from '../public/Games/Coin Champion/game-core.mjs';

function seeded(seed = 1234) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function solve(session) {
  const c = session.challenge;
  if (c.kind === 'identify') return session.answer(c.answerCoin);
  if (c.kind === 'count') return session.answer(c.target);
  for (const id of optimalCoins(c.target)) assert.equal(session.addCoin(id), true);
  return session.answer();
}
test('all difficulty/mode combinations generate valid, solvable challenges', () => {
  const rng = seeded();
  for (const difficulty of Object.keys(LEVELS)) for (const mode of ['adventure', 'count', 'make', 'change']) for (let index = 0; index < 240; index++) {
    const c = createChallenge(mode, difficulty, index, rng);
    assert.ok(validChallenge(c), `${difficulty}/${mode}/${index}`);
    assert.equal(sumCoins(optimalCoins(c.target)), c.target);
    assert.ok(optimalCoins(c.target).length <= 32);
    if (c.kind === 'count') assert.equal(c.choices.filter(value => value === c.target).length, 1);
  }
});
test('fewest-coin solutions match dynamic programming for every playable amount', () => {
  const minimum = [0];
  for (let total = 1; total <= 500; total++) {
    minimum[total] = 1 + Math.min(...ORDER.filter(id => COINS[id].value <= total).map(id => minimum[total - COINS[id].value]));
    assert.equal(optimalCoins(total).length, minimum[total]);
  }
});
test('all twelve adventure stops complete at every difficulty with one reward per stop', () => {
  for (const difficulty of Object.keys(LEVELS)) {
    const s = new Session({ difficulty, rng: seeded(), id: `test-${difficulty}` });
    const p = normalizeProgress();
    for (let i = 0; i < ROUTE.length; i++) {
      assert.equal(s.index, i);
      const result = solve(s);
      assert.equal(result.correct, true);
      assert.equal(applyReward(p, s, result), true);
      assert.equal(applyReward(p, s, result), false);
      assert.equal(s.answer(), null);
      assert.equal(s.advance(), true);
    }
    assert.equal(s.phase, 'finished'); assert.equal(s.stars, 36);
    assert.equal(p.totalCorrect, 12); assert.equal(Object.keys(p.stamps).length, 12);
    assert.equal(s.advance(), false);
  }
});
test('practice modes each finish after eight rounds', () => {
  for (const mode of ['count', 'make', 'change']) {
    const s = new Session({ mode, difficulty: 'master', rng: seeded() });
    for (let i = 0; i < 8; i++) { assert.equal(solve(s).correct, true); s.advance(); }
    assert.equal(s.phase, 'finished'); assert.equal(s.correct, 8);
  }
});
test('equal value with too many coins does not pass a strategy challenge', () => {
  const s = new Session({ mode: 'make', difficulty: 'master', start: 2 });
  s.challenge.target = 10;
  s.addCoin('nickel'); s.addCoin('nickel');
  assert.equal(s.answer().correct, false); assert.equal(s.phase, 'playing');
  s.clear(); s.addCoin('dime');
  assert.equal(s.answer().stars, 1);
});
test('hints cost a star and mistakes reset a streak without blocking retries', () => {
  const s = new Session({ mode: 'count', rng: seeded() });
  s.hint(); assert.equal(solve(s).stars, 2); s.advance();
  const wrong = s.challenge.choices.find(value => value !== s.challenge.target);
  assert.equal(s.answer(wrong).correct, false); assert.equal(s.streak, 0);
  assert.equal(solve(s).stars, 1); assert.equal(s.streak, 1);
});
test('coin tray supports undo, removing one denomination, and a bounded capacity', () => {
  const s = new Session({ mode: 'make' });
  s.addCoin('quarter'); s.addCoin('penny'); s.addCoin('quarter');
  s.removeCoin('quarter'); assert.deepEqual(s.selection, ['quarter', 'penny']);
  s.undo(); assert.deepEqual(s.selection, ['quarter']); s.clear();
  for (let i = 0; i < 32; i++) assert.equal(s.addCoin('penny'), true);
  assert.equal(s.addCoin('penny'), false); assert.equal(s.addCoin('bogus'), false);
});
test('timeouts settle once and allow the next round without awarding points', () => {
  const s = new Session({ timed: true });
  assert.equal(s.expire(), true); assert.equal(s.expire(), false);
  assert.equal(s.answer(s.challenge.answerCoin), null); assert.equal(s.score, 0);
  s.advance(); assert.equal(s.phase, 'playing'); assert.equal(s.index, 1);
});
test('active coin selection, countdown, hints, and event identity survive serialization', () => {
  const s = new Session({ mode: 'change', difficulty: 'master', timed: true, id: 'durable-id' });
  s.addCoin('quarter'); s.addCoin('dime'); s.hint(); s.remainingMs = 12345;
  const restored = Session.restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.selection, s.selection); assert.equal(restored.remainingMs, 12345);
  assert.equal(restored.hinted, true); assert.equal(restored.id, 'durable-id');
  assert.deepEqual(restored.challenge, s.challenge);
});
test('a saved correct answer stays settled after reopening', () => {
  const s = new Session(); const reward = solve(s); const p = normalizeProgress();
  applyReward(p, s, reward); p.active = s.toJSON();
  const restored = normalizeProgress(JSON.parse(JSON.stringify(p)));
  const game = Session.restore(restored.active);
  assert.equal(game.phase, 'feedback'); assert.equal(game.answer(game.challenge.answerCoin), null);
  assert.equal(applyReward(restored, game, reward), false);
});
test('legacy best scores and settings migrate without deleting the old save', () => {
  const old = { bestScore: 2500, bestStreak: 7, lastDifficulty: 'hard', soundEnabled: false, timerEnabled: true };
  const values = new Map([[LEGACY_KEY, JSON.stringify(old)]]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const p = readProgress(storage); assert.equal(p.bestScore, 2500); assert.equal(p.bestStreak, 7);
  assert.equal(p.difficulty, 'master'); assert.equal(p.sound, false); assert.equal(p.timed, true);
  assert.equal(writeProgress(storage, p), true); assert.ok(values.has(SAVE_KEY)); assert.equal(values.get(LEGACY_KEY), JSON.stringify(old));
});
test('corrupt current storage still recovers valid legacy records', () => {
  const p = readProgress({ getItem: key => key === SAVE_KEY ? '{broken' : '{"bestScore":1200}' });
  assert.equal(p.bestScore, 1200);
});
test('blocked storage and malformed data leave a playable fallback', () => {
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
  assert.equal(readProgress(blocked).tickets, 0); assert.equal(writeProgress(blocked, {}), false);
  const p = normalizeProgress({ tickets: -50, difficulty: '__proto__', owned: ['bogus'], skin: 'bogus', stamps: { 'starter-0': 99, invalid: 2 }, active: { kind: 'bad' } });
  assert.equal(p.tickets, 0); assert.equal(p.difficulty, 'starter'); assert.equal(p.skin, 'sunrise'); assert.equal(p.active, null); assert.equal(p.stamps['starter-0'], 3);
});
test('unknown saved properties cannot replace game methods or prototypes', () => {
  const s = new Session({ mode: 'make' });
  const raw = JSON.parse(JSON.stringify(s)); raw.toJSON = 'bad'; raw.__proto__ = { answer: 'bad' };
  const restored = Session.restore(raw); assert.equal(typeof restored.toJSON, 'function'); assert.equal(typeof restored.answer, 'function');
  assert.equal(Session.restore({ ...raw, challenge: { ...raw.challenge, target: -1 } }), null);
});
test('prizes charge tickets once, preserve ownership, and reject insufficient funds', () => {
  const p = normalizeProgress({ tickets: 10 });
  assert.equal(buyPrize(p, 'berry'), false); assert.equal(p.tickets, 10);
  assert.equal(buyPrize(p, 'mint'), true); assert.equal(p.tickets, 2);
  assert.equal(buyPrize(p, 'mint'), true); assert.equal(p.tickets, 2);
  assert.equal(buyPrize(p, 'sunrise'), true); assert.equal(p.skin, 'sunrise');
  assert.equal(normalizeProgress(p).owned.includes('mint'), true);
  assert.equal(buyPrize(p, 'unknown'), false);
});
