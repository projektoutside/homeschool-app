export const MINI_GAMES = Object.freeze({
  sort: { name: 'Coin Sort', description: 'Drop each coin into its matching jar.', symbol: 'jars' },
  memory: { name: 'Memory Match', description: 'Flip cards. Match coins with their value.', symbol: 'cards' },
  treasure: { name: 'Treasure Hunt', description: 'Choose coins to fill your treasure chest.', symbol: 'chest' },
});
export const isMiniGame = mode => typeof mode === 'string' && Object.hasOwn(MINI_GAMES, mode);
export const roundCount = mode => mode === 'adventure' ? 12 : isMiniGame(mode) ? 4 : 8;
const sizes = { starter: 0, explorer: 1, master: 2 };
const shuffle = (list, rng) => {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(rng() * (i + 1))); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
const sum = (list, coins) => list.reduce((total, id) => total + coins[id].value, 0);
function bundles(count, coins, order) {
  let all = [[]];
  for (let n = 0; n < count; n++) all = all.flatMap(list => order.map(id => [...list, id]));
  return [...new Map(all.map(list => [sum(list, coins), list])).values()];
}
export function treasureSolution(pile, target, coins, picked = []) {
  const remaining = target - sum(picked.map(i => pile[i]), coins);
  if (remaining < 0) return null;
  const routes = new Map([[0, []]]);
  for (let i = 0; i < pile.length; i++) if (!picked.includes(i)) {
    for (const [value, indices] of [...routes]) {
      const next = value + coins[pile[i]].value;
      if (next <= remaining && !routes.has(next)) routes.set(next, [...indices, i]);
    }
  }
  return routes.get(remaining) || null;
}
export function createMiniChallenge(kind, difficulty, rng, coins, order) {
  const level = sizes[difficulty] ?? 0;
  const c = { kind, target: 1, pile: [], choices: [], price: 0, paid: 0, answerCoin: '', fewest: false, cards: [] };
  if (kind === 'sort') {
    const count = [6, 8, 12][level];
    c.pile = shuffle([...order, ...Array.from({ length: count - order.length }, () => order[Math.min(3, Math.floor(rng() * 4))])], rng);
    c.target = count;
  } else if (kind === 'memory') {
    const pairs = [3, 4, 6][level], choices = shuffle(bundles(level + 1, coins, order), rng).slice(0, pairs);
    c.target = pairs;
    c.cards = shuffle(choices.flatMap(list => ['coins', 'amount'].map(type => ({ type, coins: [...list], value: sum(list, coins) }))), rng);
  } else {
    const pool = bundles(level + 2, coins, order), winning = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    c.target = sum(winning, coins);
    c.pile = shuffle([...winning, ...Array.from({ length: [6, 9, 12][level] - winning.length }, () => order[Math.min(3, Math.floor(rng() * 4))])], rng);
  }
  return c;
}
export function validMiniChallenge(c, coins, order) {
  if (!isMiniGame(c.kind) || !Array.isArray(c.pile) || !c.pile.every(id => order.includes(id))) return false;
  if (c.kind === 'sort') return [6, 8, 12].includes(c.pile.length) && c.target === c.pile.length;
  if (c.kind === 'treasure') return [6, 9, 12].includes(c.pile.length) && c.target <= 100 && !!treasureSolution(c.pile, c.target, coins);
  if (![3, 4, 6].includes(c.target) || !Array.isArray(c.cards) || c.cards.length !== c.target * 2) return false;
  const values = new Map();
  for (const card of c.cards) {
    if (!card || !['coins', 'amount'].includes(card.type) || !Array.isArray(card.coins) || !card.coins.length || card.coins.length > 3 || !card.coins.every(id => order.includes(id)) || card.value !== sum(card.coins, coins)) return false;
    const types = values.get(card.value) || []; types.push(card.type); values.set(card.value, types);
  }
  return values.size === c.target && [...values.values()].every(types => types.length === 2 && types.includes('coins') && types.includes('amount'));
}
export const initialMiniState = () => ({ cursor: 0, open: [], matched: [], picked: [] });
export function restoreMiniState(raw, challenge, selection, phase, coins) {
  if (!raw || !Number.isSafeInteger(raw.cursor) || raw.cursor < 0 || raw.cursor > challenge.pile.length) return null;
  const state = { cursor: raw.cursor };
  for (const field of ['open', 'matched', 'picked']) {
    const list = raw[field], max = field === 'picked' ? challenge.pile.length : challenge.cards?.length || 0;
    if (!Array.isArray(list) || new Set(list).size !== list.length || !list.every(i => Number.isSafeInteger(i) && i >= 0 && i < max)) return null;
    state[field] = [...list];
  }
  if (state.open.length > 2 || state.open.some(i => state.matched.includes(i))) return null;
  let expected = [], complete = false;
  if (challenge.kind === 'sort') { expected = challenge.pile.slice(0, state.cursor); complete = state.cursor === challenge.pile.length; if (state.open.length || state.matched.length || state.picked.length) return null; }
  if (challenge.kind === 'treasure') { expected = state.picked.map(i => challenge.pile[i]); complete = sum(expected, coins) === challenge.target; if (state.cursor || state.open.length || state.matched.length) return null; }
  if (challenge.kind === 'memory') {
    if (state.cursor || state.picked.length) return null;
    const groups = new Map();
    for (const i of state.matched) { const card = challenge.cards[i], list = groups.get(card.value) || []; list.push(card.type); groups.set(card.value, list); }
    if ([...groups.values()].some(types => types.length !== 2 || !types.includes('coins') || !types.includes('amount'))) return null;
    if (state.open.length === 2 && challenge.cards[state.open[0]].value === challenge.cards[state.open[1]].value) return null;
    complete = state.matched.length === challenge.cards.length;
  }
  if (expected.join(',') !== selection.join(',') || (phase === 'feedback' && !complete) || (['playing', 'review'].includes(phase) && complete)) return null;
  return state;
}
export function miniHint(c, state, coins) {
  if (c.kind === 'sort') { const id = c.pile[state?.cursor || 0] || c.pile[0]; return `This is a ${coins[id].name.toLowerCase()}. Put it in the ${coins[id].value}-cent jar.`; }
  if (c.kind === 'memory') {
    const first = c.cards.findIndex((card, i) => card.type === 'coins' && !state?.matched.includes(i));
    if (first < 0) return 'All pairs found. Great remembering!';
    const second = c.cards.findIndex(card => card.type === 'amount' && card.value === c.cards[first].value);
    return `Try cards ${first + 1} and ${second + 1}. Both mean ${c.cards[first].value} cents.`;
  }
  const route = treasureSolution(c.pile, c.target, coins, state?.picked || []);
  if (!route) return `One exact set is map coins ${(treasureSolution(c.pile, c.target, coins) || []).map(i => i + 1).join(', ')}. They make ${c.target} cents.`;
  return route.length ? `One route: choose coin${route.length > 1 ? 's' : ''} ${route.map(i => i + 1).join(', ')} on the map.` : 'Your treasure is just right!';
}
export function miniMove(session, action, value, coins) {
  const c = session.challenge, state = session.mini;
  const pending = extra => ({ status: 'pending', ...extra });
  if (c.kind === 'sort') {
    if (action !== 'sort' || typeof value !== 'string' || !Object.hasOwn(coins, value)) return null;
    const current = c.pile[state.cursor];
    if (value !== current) return { status: 'wrong', message: 'Try another jar. Match the coin with its name and value.' };
    state.cursor++; session.selection = c.pile.slice(0, state.cursor);
    return { status: state.cursor === c.pile.length ? 'complete' : 'pending', coin: current, message: 'Nice sorting! Here comes another coin.' };
  }
  if (c.kind === 'memory') {
    if (action === 'fold' && state.open.length === 2) { state.open = []; return pending({ focus: 'card-' + c.cards.findIndex((_, i) => !state.matched.includes(i)) }); }
    if (action !== 'flip' || !Number.isSafeInteger(value) || !c.cards[value] || state.open.length === 2 || state.open.includes(value) || state.matched.includes(value)) return null;
    state.open.push(value);
    if (state.open.length !== 2) return pending();
    const [a, b] = state.open.map(i => c.cards[i]);
    if (a.value !== b.value || a.type === b.type) return { status: 'wrong', message: 'Different values. Flip them back and try two more.', focus: 'fold-cards' };
    state.matched.push(...state.open); state.open = [];
    return { status: state.matched.length === c.cards.length ? 'complete' : 'pending', message: 'A match! Find another pair.', focus: 'card-' + c.cards.findIndex((_, i) => !state.matched.includes(i)) };
  }
  if (action === 'collect') {
    if (!Number.isSafeInteger(value) || value < 0 || value >= c.pile.length) return null;
    const existing = state.picked.indexOf(value);
    if (existing >= 0) state.picked.splice(existing, 1); else state.picked.push(value);
    session.selection = state.picked.map(i => c.pile[i]);
    const total = sum(session.selection, coins);
    return { status: total === c.target ? 'complete' : total > c.target ? 'wrong' : 'pending', coin: existing < 0 ? c.pile[value] : null, message: total > c.target ? 'A little too much. Tap a chosen coin to return it.' : '' };
  }
  if (action === 'undo' || action === 'clear') { if (action === 'clear') state.picked = []; else state.picked.pop(); session.selection = state.picked.map(i => c.pile[i]); return pending(); }
  return null;
}
