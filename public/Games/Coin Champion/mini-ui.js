import { COINS, ORDER, money, sumCoins } from './game-core.mjs';
import { MINI_GAMES } from './mini-games.mjs';
import { coinFace } from './coin-art.js';

const paths = {
  jars: '<path d="M6 3h12v3l2 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9l2-3Zm0 3h12M4 10h16"/><circle cx="12" cy="16" r="3"/>',
  cards: '<rect x="7" y="3" width="14" height="17" rx="2"/><path d="M4 6H3v15h13v-1M11 9l3-3 3 3-3 4Z"/>',
  chest: '<path d="M3 11h18v9H3Zm0 0V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v3M7 3v8m10-8v8M7 12v8m10-8v8"/><path d="M10 10h4v5h-4Z"/>',
};
export const miniSymbol = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.chest}</svg>`;
const safe = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function renderGameRoom(tab, icon) {
  const games = tab === 'practice' ? [['count', 'Count coins', 'Add up a handful of coins.', 'coins'], ['make', 'Fill the coin box', 'Choose coins to make an amount.', 'target'], ['change', 'Give change', 'Work out the change after a pretend purchase.', 'change']] : Object.entries(MINI_GAMES).map(([id, game]) => [id, game.name, game.description, game.symbol]);
  return `<section class="games-view view" aria-labelledby="games-title"><div class="games-heading"><h1 id="games-title">What shall we play?</h1><p>Pick a game. Take your time.</p></div>
    <div class="game-tabs" role="group" aria-label="Choose a game collection"><button type="button" data-action="game-tab" data-id="fun" data-focus="tab-fun" aria-pressed="${tab === 'fun'}">Fun games</button><button type="button" data-action="game-tab" data-id="practice" data-focus="tab-practice" aria-pressed="${tab === 'practice'}">Coin practice</button></div>
    <div class="game-shelves">${games.map(([id, name, description, symbol]) => `<button type="button" class="game-door game-door-${id}" data-action="start" data-mode="${id}" data-focus="choose-${id}"><span class="game-door-art">${paths[symbol] ? miniSymbol(symbol) : icon(symbol)}</span><strong>${name}</strong><span>${description}</span><span class="game-door-play">Play ${icon('play')}</span></button>`).join('')}</div></section>`;
}
export function miniQuestion(s) {
  if (s.mode === 'sort') return 'Sort each coin into its matching jar. Drag the coin, or tap a jar.';
  if (s.mode === 'memory') return 'Find a coin card and a number card with the same value. Flip two cards at a time.';
  return `Collect exactly ${s.challenge.target} cents. Tap map coins to take them. Tap a chosen coin to return it.`;
}
function sortBoard(s, icon) {
  const current = s.challenge.pile[s.mini.cursor], locked = s.phase !== 'playing';
  return `<section class="mini-board sort-board" aria-label="Coin sorting jars"><div class="sort-pedestal"><span class="mini-status">${s.mini.cursor} of ${s.challenge.pile.length} coins sorted</span>${current ? `<button type="button" class="sort-current" data-action="drag-sort" data-id="${current}" aria-label="Drag ${COINS[current].name.toLowerCase()} to its jar" ${locked ? 'disabled' : ''}>${coinFace(current)}</button><strong class="sort-coin-name">${COINS[current].name} · ${money(COINS[current].value)}</strong>` : `<span class="sort-finished">${icon('check')}</span><strong>All sorted!</strong>`}</div>
    <div class="sorting-jars">${ORDER.map(id => { const count = s.selection.filter(coin => coin === id).length; return `<button type="button" class="sort-bin tray-slot" data-action="sort" data-id="${id}" data-count="${count}" data-focus="jar-${id}" ${locked ? 'disabled' : ''} aria-label="${COINS[id].name} jar, ${COINS[id].value} cents, ${count} sorted"><span class="jar-count">${count}</span><span class="jar-glass">${miniSymbol('jars')}${coinFace(id)}</span><strong>${COINS[id].name}</strong><span>${COINS[id].value}¢</span></button>`; }).join('')}</div></section>`;
}
function memoryBoard(s, icon) {
  const c = s.challenge, state = s.mini, locked = s.phase !== 'playing';
  return `<section class="mini-board memory-board ${locked ? 'settled-memory' : ''}" aria-label="Match coin and value cards"><div class="memory-grid" style="--memory-columns:${c.cards.length === 6 ? 3 : 4}">${c.cards.map((card, i) => {
    const matched = state.matched.includes(i), faceUp = matched || state.open.includes(i);
    const label = matched ? `Matched card ${i + 1}, ${card.value} cents` : faceUp ? card.type === 'amount' ? `Card ${i + 1}, ${card.value} cents` : `Card ${i + 1}, ${card.coins.map(id => `${COINS[id].name}, ${COINS[id].value} ${COINS[id].value === 1 ? 'cent' : 'cents'}`).join(' and ')}` : `Flip card ${i + 1}`;
    return `<button type="button" class="memory-card ${faceUp ? 'face-up' : ''} ${matched ? 'matched' : ''}" data-action="flip-card" data-index="${i}" data-focus="card-${i}" aria-label="${label}" aria-pressed="${faceUp}" ${locked || matched || state.open.length === 2 ? 'disabled' : ''}><span class="card-number">${i + 1}</span>${faceUp ? card.type === 'amount' ? `<strong>${money(card.value)}</strong>` : `<span class="memory-coin-bundle">${card.coins.map(id => `<span class="memory-coin">${coinFace(id)}<small>${money(COINS[id].value)}</small></span>`).join('')}</span>` : `<span class="memory-back">${miniSymbol('cards')}<span>Flip</span></span>`}${matched ? `<span class="matched-mark">${icon('check')}</span>` : ''}</button>`;
  }).join('')}</div>${locked ? '' : `<div class="memory-footer"><span>${state.matched.length / 2} of ${c.target} pairs found</span>${state.open.length === 2 && !locked ? '<button type="button" class="secondary" data-action="fold-cards" data-focus="fold-cards">Flip back</button>' : '<span>Coins + the same value = a match</span>'}</div>`}</section>`;
}
function treasureBoard(s, icon) {
  const total = sumCoins(s.selection), locked = s.phase !== 'playing', remaining = s.challenge.target - total;
  return `<section class="mini-board treasure-board ${locked ? 'settled-treasure' : ''}" aria-label="Treasure coin map"><div class="treasure-map" style="--map-columns:${s.challenge.pile.length === 12 ? 4 : 3}">${s.challenge.pile.map((id, i) => {
    const chosen = s.mini.picked.includes(i);
    return `<button type="button" class="treasure-spot ${chosen ? 'chosen' : ''}" data-action="collect-coin" data-index="${i}" data-id="${id}" data-focus="treasure-${i}" aria-label="${chosen ? 'Return' : 'Collect'} coin ${i + 1}, ${COINS[id].name}, ${COINS[id].value} ${COINS[id].value === 1 ? 'cent' : 'cents'}" aria-pressed="${chosen}" ${locked ? 'disabled' : ''}><span class="map-number">${i + 1}</span>${chosen ? `<span class="treasure-taken">${icon('check')}</span>` : coinFace(id)}<strong>${COINS[id].value}¢</strong></button>`;
  }).join('')}</div><div class="treasure-dock"><div class="treasure-vault ${s.phase === 'feedback' ? 'chest-open' : ''}">${miniSymbol('chest')}<div class="treasure-stacks">${ORDER.filter(id => s.selection.includes(id)).map(id => `<span class="tray-slot" data-id="${id}">${coinFace(id)}<small>${s.selection.filter(coin => coin === id).length}</small></span>`).join('')}</div></div><div class="treasure-total ${remaining < 0 ? 'over-goal' : ''}"><span>Your treasure</span><output>${money(total)}</output><small>${remaining > 0 ? `${money(remaining)} to go` : remaining < 0 ? `${money(-remaining)} too much` : 'Just right!'}</small></div><div class="treasure-tools"><button type="button" class="secondary" data-action="mini-undo" ${locked || !s.selection.length ? 'disabled' : ''}>${icon('undo')}Undo</button><button type="button" class="secondary" data-action="mini-clear" ${locked || !s.selection.length ? 'disabled' : ''}>Start over</button></div></div></section>`;
}
export function renderMiniPlay(s, icon, starRow) {
  const feedback = s.phase === 'feedback' || s.phase === 'review';
  const title = s.mode === 'treasure' ? `Find ${money(s.challenge.target)}` : MINI_GAMES[s.mode].name;
  const guidance = s.mode === 'sort' ? 'Drag the coin, or tap its matching jar.' : s.mode === 'memory' ? s.mini.open.length === 2 ? 'Not a match yet. Tap Flip back.' : s.mini.open.length === 1 ? 'Find this card’s match.' : 'Match a coin card with its value.' : 'Tap a coin. Tap again to return it.';
  const instruction = feedback ? s.phase === 'review' ? 'Take a look. Hint can help.' : s.mode === 'sort' ? 'Every coin has a home.' : s.mode === 'memory' ? 'All pairs found.' : 'Your treasure is just right.' : s.mode === 'memory' && s.mini.open.length ? guidance : s.mode === 'treasure' && sumCoins(s.selection) > s.challenge.target ? 'Tap a chosen coin to put it back.' : s.message && !s.message.startsWith('Hint used.') ? s.message : guidance;
  return `<section class="play-view mini-play view ${feedback ? 'show-feedback' : 'keep-playing'}" aria-label="${MINI_GAMES[s.mode].name}"><div class="journey-bar"><span class="question-number">Round ${s.index + 1} of ${s.total}</span><span class="clock-label" id="round-clock" role="timer">${s.timed ? `${Math.ceil(s.remainingMs / 1000)}s` : 'Take your time'}</span></div>
    <div class="mini-heading"><div><h1>${title}</h1><p>${safe(instruction)}</p>${s.mode === 'memory' && feedback ? `<span class="mini-pair-summary">${s.mini.matched.length / 2} of ${s.challenge.target} pairs found</span>` : ''}${s.mode === 'treasure' && feedback ? `<span class="mini-treasure-summary">Your treasure: ${money(sumCoins(s.selection))}</span>` : ''}</div><div class="question-actions"><button type="button" class="read-button" data-action="speak" aria-label="Read this question aloud">${icon('sound')}</button><button type="button" class="hint-button" data-action="hint" data-focus="hint" ${s.phase === 'feedback' ? 'disabled' : ''}>${icon('bulb')}<span>Hint</span></button></div></div>
    ${s.mode === 'sort' ? sortBoard(s, icon) : s.mode === 'memory' ? memoryBoard(s, icon) : treasureBoard(s, icon)}
    ${feedback ? `<div class="feedback-bar ${s.phase === 'feedback' ? 'win-feedback' : 'review-feedback'}"><p>${s.phase === 'feedback' ? `You did it! ${starRow(s.lastReward?.stars || 0)}` : 'A hint can help. Let’s try the next round.'}</p><button type="button" class="primary next-button" data-action="next" data-focus="next">${s.index + 1 === s.total ? 'All done!' : 'Next'}${icon('next')}</button></div>` : ''}</section>`;
}
