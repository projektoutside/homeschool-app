import test from 'node:test';
import assert from 'node:assert/strict';
import { COINS, ORDER, Session, createChallenge, validChallenge, normalizeProgress, applyReward, challengeHint, sumCoins } from '../public/Games/Coin Champion/game-core.mjs';
import { MINI_GAMES, treasureSolution } from '../public/Games/Coin Champion/mini-games.mjs';
const rngFor = (seed = 11) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function solve(s) {
  let result;
  if (s.mode === 'sort') for (const id of s.challenge.pile) result = s.playMini('sort', id);
  else if (s.mode === 'memory') {
    for (let i = 0; i < s.challenge.cards.length; i++) if (s.challenge.cards[i].type === 'coins') {
      const other = s.challenge.cards.findIndex(c => c.type === 'amount' && c.value === s.challenge.cards[i].value);
      s.playMini('flip', i); result = s.playMini('flip', other);
    }
  } else for (const i of treasureSolution(s.challenge.pile, s.challenge.target, COINS)) result = s.playMini('collect', i);
  return result;
}
test('every new mode and level creates bounded, solvable rounds, even with constant random values', () => {
  for (const difficulty of ['starter', 'explorer', 'master']) for (const mode of Object.keys(MINI_GAMES)) for (const rng of [rngFor(), () => 0, () => .999999]) {
    for (let i = 0; i < 45; i++) assert(validChallenge(createChallenge(mode, difficulty, i, rng)), `${mode}/${difficulty}`);
  }
});
test('all mini games finish four rounds with one reward per round and no adventure-stamp changes', () => {
  for (const mode of Object.keys(MINI_GAMES)) for (const difficulty of ['starter', 'explorer', 'master']) {
    const s = new Session({ mode, difficulty, rng: rngFor() }), p = normalizeProgress();
    for (let i = 0; i < 4; i++) {
      assert.equal(s.index, i); const result = solve(s); assert.equal(result.correct, true);
      assert.equal(applyReward(p, s, result), true); assert.equal(applyReward(p, s, result), false);
      assert.equal(s.playMini('sort', 'penny'), null); assert.equal(s.completeRound(), null);
      const restored = Session.restore(JSON.parse(JSON.stringify(s))); assert(restored); assert.equal(restored.phase, 'feedback');
      assert.equal(s.advance(), true);
    }
    assert.equal(s.phase, 'finished'); assert.equal(p.totalCorrect, 4); assert.deepEqual(p.stamps, {});
  }
});
test('wrong sorting jars do not move the coin and a retry still completes', () => {
  const s = new Session({ mode: 'sort', rng: rngFor() }), id = s.challenge.pile[0];
  const result = s.playMini('sort', ORDER.find(coin => coin !== id));
  assert.equal(result.correct, false); assert.equal(s.mini.cursor, 0); assert.deepEqual(s.selection, []);
  const move = s.playMini('sort', id); assert.equal(move.pending, true); assert.equal(move.addedCoin, id); assert.equal(s.mini.cursor, 1);
  for (const next of s.challenge.pile.slice(1)) s.playMini('sort', next);
  assert.equal(s.lastReward.stars, 1);
});
test('memory mismatches remain visible until Flip back, and cannot accept a third card', () => {
  const s = new Session({ mode: 'memory', rng: rngFor() });
  const a = 0, b = s.challenge.cards.findIndex(c => c.value !== s.challenge.cards[a].value);
  s.playMini('flip', a); s.playMini('flip', b);
  assert.deepEqual(s.mini.open, [a, b]); assert.equal(s.attempts, 1);
  assert.equal(s.playMini('flip', s.challenge.cards.findIndex((_, i) => i !== a && i !== b)), null);
  const restored = Session.restore(JSON.parse(JSON.stringify(s))); assert.deepEqual(restored.mini.open, [a, b]);
  restored.playMini('fold'); assert.deepEqual(restored.mini.open, []); assert.equal(solve(restored).correct, true);
});
test('memory matches persist and hints identify an unmatched coin/value pair', () => {
  const s = new Session({ mode: 'memory', difficulty: 'master', rng: rngFor() });
  const a = 0, b = s.challenge.cards.findIndex((c, i) => i !== a && c.value === s.challenge.cards[a].value);
  s.playMini('flip', a); s.playMini('flip', b);
  const r = Session.restore(JSON.parse(JSON.stringify(s))); assert.equal(r.mini.matched.length, 2);
  const hint = challengeHint(r.challenge, r.mini); assert.match(hint, /Try cards/); assert(!hint.startsWith(`Try cards ${Math.min(a, b) + 1} and ${Math.max(a, b) + 1}.`));
  assert.equal(r.playMini('flip', a), null);
});
test('treasure coins toggle individually and undo/clear restore the available map', () => {
  const s = new Session({ mode: 'treasure', difficulty: 'master', rng: rngFor() });
  const safe = s.challenge.pile.findIndex(id => COINS[id].value !== s.challenge.target);
  s.playMini('collect', safe); assert.deepEqual(s.selection, [s.challenge.pile[safe]]);
  s.playMini('collect', safe); assert.deepEqual(s.selection, []);
  s.playMini('collect', safe); const r = Session.restore(JSON.parse(JSON.stringify(s))); assert.deepEqual(r.mini.picked, [safe]);
  r.playMini('undo'); assert.deepEqual(r.selection, []); r.playMini('collect', safe); r.playMini('clear'); assert.deepEqual(r.mini.picked, []);
  assert.equal(solve(r).correct, true); assert.equal(sumCoins(r.selection), r.challenge.target);
});
test('mini games ignore invalid inputs and cannot be bypassed through free coin-bank operations', () => {
  for (const mode of Object.keys(MINI_GAMES)) {
    const s = new Session({ mode, rng: rngFor() }), before = JSON.stringify(s);
    assert.equal(s.addCoin('quarter'), false); s.removeCoin('penny'); s.undo(); s.clear();
    assert.equal(s.answer(1), null); assert.equal(s.playMini('fake', 0), null);
    assert.equal(s.playMini(mode === 'memory' ? 'flip' : mode === 'sort' ? 'sort' : 'collect', '__proto__'), null);
    assert.equal(JSON.stringify(s), before);
  }
});
test('malformed or contradictory mini-game saves are rejected without corrupting other guest progress', () => {
  for (const mode of Object.keys(MINI_GAMES)) {
    const s = new Session({ mode, rng: rngFor() }), raw = JSON.parse(JSON.stringify(s));
    assert(Session.restore(raw));
    const bad = structuredClone(raw); bad.mini.open = [999]; assert.equal(Session.restore(bad), null);
    const badSelection = structuredClone(raw); badSelection.selection = ['quarter']; assert.equal(Session.restore(badSelection), null);
    const badPhase = structuredClone(raw); badPhase.phase = 'feedback'; assert.equal(Session.restore(badPhase), null);
    const p = normalizeProgress({ tickets: 17, active: bad }); assert.equal(p.tickets, 17); assert.equal(p.active, null);
  }
  const memory = new Session({ mode: 'memory' }).toJSON(); memory.challenge.cards[0].value = -99; assert.equal(Session.restore(memory), null);
});
test('timeouts and hints preserve mini state without awarding partial progress', () => {
  for (const mode of Object.keys(MINI_GAMES)) {
    const s = new Session({ mode, timed: true, rng: rngFor() }); s.hint();
    assert.equal(s.hinted, true); assert.equal(s.expire(), true); assert.equal(s.score, 0);
    assert(Session.restore(JSON.parse(JSON.stringify(s)))); assert.equal(s.playMini('sort', 'penny'), null); assert.equal(s.advance(), true);
    assert.equal(s.phase, 'playing'); assert.equal(s.mini.cursor, 0); assert.deepEqual(s.selection, []);
  }
});
test('malformed saved mode metadata cannot throw while guest progress is recovered', () => {
  const raw = JSON.parse(JSON.stringify(new Session({ mode: 'memory' })));
  for (const value of [null, [], 17, { toString: 'not callable' }]) for (const field of ['mode', 'difficulty']) {
    const malformed = { ...raw, [field]: value };
    assert.equal(Session.restore(malformed), null);
    const p = normalizeProgress({ tickets: 9, active: malformed }); assert.equal(p.tickets, 9); assert.equal(p.active, null);
  }
  const sort = new Session({ mode: 'sort' }); assert.equal(sort.playMini('sort', { toString: 'not callable' }), null);
});
