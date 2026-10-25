import { MINI_GAMES, isMiniGame, roundCount, createMiniChallenge, validMiniChallenge, initialMiniState, restoreMiniState, miniHint, miniMove } from './mini-games.mjs';
export const SAVE_KEY = 'coin-champ.progress.v2';
export const LEGACY_KEY = 'coin-champ.progress.v1';
export const COINS = Object.freeze({
  penny: { name: 'Penny', plural: 'pennies', value: 1, asset: 'Penny Asset.png', threshold: 32 },
  nickel: { name: 'Nickel', plural: 'nickels', value: 5, asset: 'Nickel Asset.png', threshold: 48 },
  dime: { name: 'Dime', plural: 'dimes', value: 10, asset: 'Dime Asset.png', threshold: 44 },
  quarter: { name: 'Quarter', plural: 'quarters', value: 25, asset: 'Quarter Asset.png', threshold: 44 },
});
export const ORDER = Object.keys(COINS);
export const BIG_FIRST = [...ORDER].reverse();
export const LEVELS = Object.freeze({
  starter: { name: 'Starter', description: 'Meet the coins', max: 40, pile: 5, seconds: 45 },
  explorer: { name: 'Explorer', description: 'Mix & match', max: 150, pile: 9, seconds: 35 },
  master: { name: 'Master', description: 'Think strategically', max: 499, pile: 14, seconds: 30 },
});
export const MODES = Object.freeze({ adventure: 'Adventure', count: 'Count the Coins', make: 'Make the Amount', change: 'Change Maker', ...Object.fromEntries(Object.entries(MINI_GAMES).map(([id, game]) => [id, game.name])) });
export const ROUTE = ['identify', 'count', 'make', 'count', 'change', 'make', 'count', 'change', 'efficient', 'make', 'change', 'efficient'];
export const PRIZES = Object.freeze([
  { id: 'mint', name: 'Mint Lagoon', description: 'A fresh turquoise coin tray', cost: 8, color: '#106c68' },
  { id: 'berry', name: 'Berry Boardwalk', description: 'A juicy berry coin tray', cost: 16, color: '#963a74' },
  { id: 'cosmic', name: 'Cosmic Champ', description: 'A midnight purple coin tray', cost: 28, color: '#453e8b' },
]);
const integer = (value, fallback = 0, max = 10000000) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : fallback;
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const between = (min, max, rng) => min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
export const money = cents => cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;
export const sumCoins = list => list.reduce((sum, id) => sum + (COINS[id]?.value || 0), 0);
export function optimalCoins(total) {
  const result = [];
  for (const id of BIG_FIRST) while (total >= COINS[id].value) { result.push(id); total -= COINS[id].value; }
  return result;
}
export function coinEquation(list) {
  return BIG_FIRST.filter(id => list.includes(id)).map(id => {
    const count = list.filter(item => item === id).length;
    return `${count} ${count === 1 ? COINS[id].name.toLowerCase() : COINS[id].plural}`;
  }).join(' + ');
}
export function createChallenge(mode, difficulty, index, rng = Math.random) {
  if (isMiniGame(mode)) return createMiniChallenge(mode, difficulty, rng, COINS, ORDER);
  const level = LEVELS[difficulty] || LEVELS.starter;
  const kind = mode === 'adventure' ? ROUTE[index % ROUTE.length] : mode;
  const challenge = { kind, target: 0, pile: [], choices: [], price: 0, paid: 0, answerCoin: '', fewest: kind === 'efficient' || (mode === 'make' && difficulty === 'master' && index % 3 === 2) };
  if (kind === 'identify') {
    challenge.answerCoin = pick(ORDER, rng);
    challenge.target = COINS[challenge.answerCoin].value;
    return challenge;
  }
  if (kind === 'count') {
    const allowed = difficulty === 'starter' ? (index < 3 ? ['penny', 'nickel', 'dime'] : ORDER) : ORDER;
    const count = between(3, level.pile, rng);
    challenge.pile = Array.from({ length: count }, () => pick(allowed, rng));
    challenge.target = sumCoins(challenge.pile);
    const options = new Set([challenge.target]);
    for (const delta of [5, -5, 10, -10, 1, -1, 25]) {
      const option = challenge.target + delta;
      if (option > 0 && option <= 999) options.add(option);
      if (options.size === 4) break;
    }
    challenge.choices = [...options];
    for (let i = challenge.choices.length - 1; i > 0; i--) {
      const j = between(0, i, rng);
      [challenge.choices[i], challenge.choices[j]] = [challenge.choices[j], challenge.choices[i]];
    }
  } else if (kind === 'change') {
    challenge.paid = difficulty === 'starter' ? 50 : difficulty === 'explorer' ? 200 : 500;
    challenge.price = between(Math.ceil(challenge.paid / 3), challenge.paid - 1, rng);
    challenge.target = challenge.paid - challenge.price;
  } else {
    challenge.target = between(difficulty === 'starter' ? 6 : 26, level.max, rng);
  }
  return challenge;
}
export function challengeHint(challenge, mini) {
  if (isMiniGame(challenge.kind)) return miniHint(challenge, mini, COINS);
  if (challenge.kind === 'identify') return `A ${COINS[challenge.answerCoin].name.toLowerCase()} is worth ${challenge.target} cents. Look for its name and value.`;
  if (challenge.kind === 'count') return `Count the biggest coins first: ${coinEquation(challenge.pile)}. Add their values together.`;
  const prefix = challenge.kind === 'change' ? `${money(challenge.paid)} − ${money(challenge.price)} = ${money(challenge.target)}. ` : '';
  return `${prefix}One way: ${coinEquation(optimalCoins(challenge.target))}.${challenge.fewest ? ' Start with the biggest coin that fits.' : ''}`;
}
export function validChallenge(c) {
  if (!c || !['identify', 'count', 'make', 'change', 'efficient', ...Object.keys(MINI_GAMES)].includes(c.kind) || !Number.isSafeInteger(c.target) || c.target < 1 || c.target > 999) return false;
  if (isMiniGame(c.kind)) return validMiniChallenge(c, COINS, ORDER);
  if (!Array.isArray(c.pile) || c.pile.length > 14 || !c.pile.every(id => ORDER.includes(id))) return false;
  if (c.kind === 'identify') return ORDER.includes(c.answerCoin) && COINS[c.answerCoin].value === c.target;
  if (c.kind === 'count') return c.pile.length > 0 && sumCoins(c.pile) === c.target && Array.isArray(c.choices) && c.choices.length === 4 && new Set(c.choices).size === 4 && c.choices.includes(c.target) && c.choices.every(n => Number.isSafeInteger(n) && n > 0 && n <= 999);
  if (c.kind === 'change') return Number.isSafeInteger(c.paid) && c.paid <= 500 && Number.isSafeInteger(c.price) && c.price > 0 && c.paid - c.price === c.target;
  return true;
}
export class Session {
  constructor({ mode = 'adventure', difficulty = 'starter', timed = false, start = 0, rng = Math.random, id } = {}) {
    this.mode = Object.hasOwn(MODES, mode) ? mode : 'adventure';
    this.difficulty = Object.hasOwn(LEVELS, difficulty) ? difficulty : 'starter';
    this.timed = timed === true;
    this.id = id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.total = roundCount(this.mode);
    this.index = integer(start, 0, this.total - 1);
    this.startIndex = this.index;
    this.score = 0; this.correct = 0; this.streak = 0; this.bestStreak = 0; this.stars = 0;
    this.rng = rng;
    this.newRound();
  }
  newRound() {
    this.challenge = createChallenge(this.mode, this.difficulty, this.index, this.rng);
    this.selection = []; this.attempts = 0; this.hinted = false; this.phase = 'playing';
    this.remainingMs = LEVELS[this.difficulty].seconds * 1000;
    this.message = ''; this.lastReward = null;
    this.mini = isMiniGame(this.mode) ? initialMiniState() : null;
  }
  addCoin(id) {
    if (isMiniGame(this.mode) || this.phase !== 'playing' || !ORDER.includes(id) || ['count', 'identify'].includes(this.challenge.kind) || this.selection.length >= 32) return false;
    this.selection.push(id); this.message = ''; return true;
  }
  removeCoin(id) {
    if (isMiniGame(this.mode) || this.phase !== 'playing') return false;
    const index = this.selection.lastIndexOf(id);
    if (index < 0) return false;
    this.selection.splice(index, 1); this.message = ''; return true;
  }
  undo() { if (!isMiniGame(this.mode) && this.phase === 'playing') { this.selection.pop(); this.message = ''; } }
  clear() { if (!isMiniGame(this.mode) && this.phase === 'playing') { this.selection = []; this.message = ''; } }
  hint() { if (this.phase === 'playing') { this.hinted = true; this.message = challengeHint(this.challenge, this.mini); } return this.message; }
  playMini(action, value) {
    if (!isMiniGame(this.mode) || this.phase !== 'playing') return null;
    const move = miniMove(this, action, value, COINS);
    if (!move) return null;
    this.message = move.message || '';
    if (move.status === 'complete') return { ...this.completeRound(), addedCoin: move.coin };
    if (move.status === 'wrong') { this.attempts++; this.streak = 0; }
    return { correct: false, pending: move.status === 'pending', addedCoin: move.coin, focus: move.focus };
  }
  answer(value) {
    if (isMiniGame(this.mode) || this.phase !== 'playing') return null;
    const c = this.challenge;
    if (c.kind === 'identify' && !ORDER.includes(value)) return null;
    if (c.kind === 'count' && !c.choices.includes(value)) return null;
    if (!['count', 'identify'].includes(c.kind) && !this.selection.length) { this.message = 'Tap a coin below to build your amount.'; return null; }
    const correct = c.kind === 'identify' ? value === c.answerCoin : c.kind === 'count' ? value === c.target : sumCoins(this.selection) === c.target;
    if (!correct) {
      this.attempts++; this.streak = 0;
      this.message = c.kind === 'identify' ? 'Try another coin. Use Coin guide if you need a clue.' : c.kind === 'count' ? 'Not quite. Group matching coins, then add their values.' : `${money(sumCoins(this.selection))} is ${sumCoins(this.selection) > c.target ? 'too much' : 'not enough'}. Add or remove a coin.`;
      return { correct: false };
    }
    if (c.fewest && this.selection.length !== optimalCoins(c.target).length) {
      this.attempts++; this.streak = 0;
      this.message = `The amount is right! Now use just ${optimalCoins(c.target).length} coins. Trade smaller coins for bigger ones.`;
      return { correct: false };
    }
    return this.completeRound();
  }
  completeRound() {
    if (this.phase !== 'playing') return null;
    this.phase = 'feedback'; this.correct++; this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const stars = this.attempts ? 1 : this.hinted ? 2 : 3;
    const points = 5 + (this.streak === 3 ? 5 : this.streak === 5 ? 10 : 0);
    const tickets = 1 + (this.streak % 3 === 0 ? 1 : 0);
    this.score += points; this.stars += stars;
    this.lastReward = { correct: true, stars, points, tickets, eventId: `${this.id}-round-${this.index}-correct` };
    const c = this.challenge;
    this.message = isMiniGame(c.kind) ? 'You did it! Round complete.' : c.kind === 'identify' ? `That's the ${COINS[c.answerCoin].name.toLowerCase()}! It's worth ${c.target}¢.` : `${money(c.target)}. You nailed it!${c.fewest ? ' And with the fewest coins!' : ''}`;
    return this.lastReward;
  }
  expire() {
    if (this.phase !== 'playing') return false;
    this.phase = 'review'; this.streak = 0; this.remainingMs = 0;
    this.message = `Time for a quick learn. ${challengeHint(this.challenge, this.mini)}`;
    return true;
  }
  advance() {
    if (!['feedback', 'review'].includes(this.phase)) return false;
    if (this.index + 1 >= this.total) this.phase = 'finished';
    else { this.index++; this.newRound(); }
    return true;
  }
  toJSON() { const { rng, ...data } = this; return data; }
  static restore(raw) {
    if (!raw || typeof raw.mode !== 'string' || typeof raw.difficulty !== 'string' || !Object.hasOwn(MODES, raw.mode) || !Object.hasOwn(LEVELS, raw.difficulty) || !validChallenge(raw.challenge)) return null;
    if (isMiniGame(raw.mode) !== isMiniGame(raw.challenge.kind) || (isMiniGame(raw.mode) && raw.mode !== raw.challenge.kind)) return null;
    const total = roundCount(raw.mode);
    if (!Number.isSafeInteger(raw.index) || raw.index < 0 || raw.index >= total || !['playing', 'feedback', 'review', 'finished'].includes(raw.phase) || typeof raw.id !== 'string' || raw.id.length > 100 || !raw.id) return null;
    if (!Array.isArray(raw.selection) || raw.selection.length > 32 || !raw.selection.every(id => ORDER.includes(id))) return null;
    const session = Object.create(Session.prototype);
    Object.assign(session, {
      mode: raw.mode, difficulty: raw.difficulty, id: raw.id, index: raw.index, phase: raw.phase,
      total, rng: Math.random, selection: [...raw.selection],
      lastReward: raw.lastReward && typeof raw.lastReward === 'object' ? {
        points: integer(raw.lastReward.points, 0, 20), tickets: integer(raw.lastReward.tickets, 0, 2), stars: integer(raw.lastReward.stars, 0, 3),
      } : null,
    });
    for (const key of ['score', 'correct', 'streak', 'bestStreak', 'stars', 'attempts', 'startIndex']) session[key] = integer(raw[key]);
    session.remainingMs = Math.max(0, Math.min(LEVELS[raw.difficulty].seconds * 1000, Number(raw.remainingMs) || 0));
    session.timed = raw.timed === true; session.hinted = raw.hinted === true;
    session.message = typeof raw.message === 'string' ? raw.message.slice(0, 500) : '';
    session.challenge = isMiniGame(raw.mode) ? { kind: raw.mode, target: raw.challenge.target, pile: [...raw.challenge.pile], cards: raw.mode === 'memory' ? raw.challenge.cards.map(card => ({ type: card.type, value: card.value, coins: [...card.coins] })) : [], choices: [], price: 0, paid: 0, answerCoin: '', fewest: false } : { ...raw.challenge, fewest: raw.challenge.fewest === true };
    session.mini = isMiniGame(raw.mode) ? restoreMiniState(raw.mini, session.challenge, session.selection, session.phase, COINS) : null;
    if (isMiniGame(raw.mode) && !session.mini) return null;
    return session;
  }
}
export function normalizeProgress(raw = {}, legacy = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  legacy = legacy && typeof legacy === 'object' ? legacy : {};
  const difficulty = raw.difficulty || ({ easy: 'starter', normal: 'explorer', hard: 'master' }[legacy.lastDifficulty]);
  const stamps = {};
  for (const [key, value] of Object.entries(raw.stamps || {})) if (/^(starter|explorer|master)-(?:[0-9]|1[01])$/.test(key)) stamps[key] = integer(value, 0, 3);
  const owned = [...new Set(['sunrise', ...(Array.isArray(raw.owned) ? raw.owned.filter(id => PRIZES.some(prize => prize.id === id)) : [])])];
  return {
    version: 2, difficulty: Object.hasOwn(LEVELS, difficulty) ? difficulty : 'starter',
    bestScore: integer(raw.bestScore, integer(legacy.bestScore)), bestStreak: integer(raw.bestStreak, integer(legacy.bestStreak)),
    tickets: integer(raw.tickets), totalCorrect: integer(raw.totalCorrect), stamps, owned,
    skin: owned.includes(raw.skin) ? raw.skin : 'sunrise',
    sound: typeof raw.sound === 'boolean' ? raw.sound : legacy.soundEnabled !== false,
    timed: typeof raw.timed === 'boolean' ? raw.timed : legacy.timerEnabled === true,
    active: Session.restore(raw.active)?.toJSON() || null,
    lastAward: typeof raw.lastAward === 'string' ? raw.lastAward.slice(0, 160) : '',
  };
}
export function readProgress(storage) {
  const read = key => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
  return normalizeProgress(read(SAVE_KEY), read(LEGACY_KEY));
}
export function writeProgress(storage, progress) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function applyReward(progress, session, reward) {
  if (!reward?.correct || reward.eventId === progress.lastAward) return false;
  progress.lastAward = reward.eventId;
  progress.tickets += reward.tickets; progress.totalCorrect++;
  progress.bestScore = Math.max(progress.bestScore, session.score);
  progress.bestStreak = Math.max(progress.bestStreak, session.bestStreak);
  if (session.mode === 'adventure') {
    const key = `${session.difficulty}-${session.index}`;
    progress.stamps[key] = Math.max(progress.stamps[key] || 0, reward.stars);
  }
  return true;
}
export function buyPrize(progress, id) {
  if (id === 'sunrise' || progress.owned.includes(id)) { progress.skin = id; return true; }
  const prize = PRIZES.find(item => item.id === id);
  if (!prize || progress.tickets < prize.cost) return false;
  progress.tickets -= prize.cost; progress.owned.push(id); progress.skin = id;
  return true;
}
