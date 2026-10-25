import { COINS, ORDER, BIG_FIRST, LEVELS, MODES, ROUTE, PRIZES, Session, money, sumCoins, optimalCoins, readProgress, writeProgress, applyReward, buyPrize, challengeHint } from './game-core.mjs';
import { StartCountdown } from './start-countdown.mjs';
import { coinFace, prepareCoinArt, refreshCoinArt } from './coin-art.js';
import { CoinScene } from './coin-scene.js';
import { isMiniGame } from './mini-games.mjs';
import { renderGameRoom, renderMiniPlay, miniQuestion } from './mini-ui.js';

const icons = {
  back: '<path d="m14 5-7 7 7 7M7 12h14"/>', next: '<path d="m10 5 7 7-7 7M17 12H3"/>', play: '<path d="m8 4 12 8-12 8Z"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>', muted: '<path d="M3 9h4l5-4v14l-5-4H3Zm13 0 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>', ticket: '<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Zm13 1v2m0 3v2m0 2v1"/>',
  crown: '<path d="m3 6 4 4 5-7 5 7 4-4-2 13H5Zm3 10h12"/>', coins: '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 2 6 4 10 1M3 11v5c0 2 5 4 10 2m8-5c0 2-8 3-8 0s8-3 8 0Zm0 0v5c0 3-8 3-8 0v-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', change: '<path d="M3 7h15l-4-4m7 14H6l4 4M18 7l-4 4M6 17l4-4"/>', flag: '<path d="M5 22V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0"/>',
  book: '<path d="M12 5C8 2 3 3 2 4v16c3-2 7-2 10 0m0-15c4-3 9-2 10-1v16c-3-2-7-2-10 0Z"/>', home: '<path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9"/>', undo: '<path d="M7 4 2 9l5 5M2 9h11a6 6 0 0 1 0 12"/>', close: '<path d="m5 5 14 14m0-14L5 19"/>', check: '<path d="m4 12 5 5L20 6"/>',
  bulb: '<path d="M8 17c0-3-4-4-4-8a8 8 0 0 1 16 0c0 4-4 5-4 8Zm0 3h8m-6 3h4M12 4v5l3 2"/>', shop: '<path d="M3 9h18l-2-6H5Zm0 0v4c3 2 4-1 4-1s2 3 5 0c3 3 5 0 5 0s1 3 4 1V9M5 14v7h14v-7M9 21v-6h6v6"/>', pause: '<path d="M7 4v16M17 4v16"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name] || icons.star}</svg>`;
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { return null; }, setItem() { throw new Error('Unavailable'); } }; }
const progress = readProgress(storage);
let session = Session.restore(progress.active), view = 'home';
let gameTab = 'fun';
let hostMuted = false, hostVolume = 0.75, audio = null, audioUnavailable = false;
let deadline = null, timer = null, savedAt = 0, dialogKind = '', previousFocus = null;
const pauses = new Set(['menu']);
const bridge = window.LAHSPointsBridge;
bridge?.init({ gameId: 'coin-champ' });
const coinScene = new CoinScene({ onLand: () => sound('coin') });
let introStep = '3';
const intro = new StartCountdown({
  onStep: step => { introStep = step; render(); announce(step === 'START!' ? 'Start!' : step); sound(); },
  onComplete: () => {
    if (view !== 'countdown') return;
    pauses.delete('intro'); view = 'play'; render(); startClock();
    $('main').focus({ preventScroll: true }); announce(questionText());
  },
});
function save() {
  progress.active = session && session.phase !== 'finished' ? session.toJSON() : null;
  const saved = writeProgress(storage, progress);
  $('save-status').textContent = saved ? 'Saved on this device' : 'Saving unavailable · this visit only';
  $('save-status').classList.toggle('save-warning', !saved);
}
function announce(message) { $('live').textContent = message; }
function stopVoice() { window.speechSynthesis?.cancel(); }
function sound(kind = 'tap') {
  if (!progress.sound || hostMuted || document.hidden || hostVolume === 0 || audioUnavailable) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { audioUnavailable = true; return; }
    audio ||= new Audio();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const notes = kind === 'win' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'wrong' ? [220, 196] : kind === 'coin' ? [1865, 2794] : [660];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + index * 0.07;
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(hostVolume * 0.12, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + 0.18);
    });
  } catch { audioUnavailable = true; }
}
function speak() {
  if (!progress.sound || hostMuted) return announce('Turn sound on to hear the question.');
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return announce('Read aloud is not available in this browser.');
  stopVoice(); const speech = new SpeechSynthesisUtterance(questionText()); speech.rate = 0.9; window.speechSynthesis.speak(speech);
}
function syncClock() { if (deadline !== null && session) session.remainingMs = Math.max(0, deadline - performance.now()); }
function stopClock() { syncClock(); clearInterval(timer); timer = null; deadline = null; }
function pause(reason) { pauses.add(reason); intro.pause(reason); coinScene.pause(true); stopClock(); paintClock(); save(); }
function resume(reason) { pauses.delete(reason); intro.resume(reason); coinScene.pause(pauses.size > 0); startClock(); paintClock(); }
function paintClock() {
  const element = $('round-clock');
  if (element && session?.timed) { element.textContent = `${pauses.size ? 'Paused · ' : ''}${Math.ceil(session.remainingMs / 1000)}s`; element.classList.toggle('urgent', session.remainingMs < 10000); }
}
function startClock() {
  if (timer || !session?.timed || session.phase !== 'playing' || view !== 'play' || pauses.size || document.hidden) return;
  deadline = performance.now() + session.remainingMs;
  timer = setInterval(() => {
    syncClock(); paintClock();
    if (performance.now() - savedAt > 2000) { savedAt = performance.now(); save(); }
    if (session.remainingMs <= 0) { stopClock(); session.expire(); save(); render(); announce(session.message); }
  }, 100);
}
function updateHeader() {
  const inGame = view !== 'home';
  $('exit-button').innerHTML = `${icon(inGame ? 'home' : 'back')}<span>${inGame ? 'Menu' : window.parent !== window ? 'Games' : 'Menu'}</span>`;
  $('exit-button').setAttribute('aria-label', inGame ? 'Back to main menu' : window.parent !== window ? 'Back to Games' : 'Main menu');
  $('tickets-button').hidden = true;
  $('ticket-count').textContent = progress.tickets;
  $('score-pill').hidden = true;
  $('score-value').textContent = session?.score || 0;
  $('sound-button').innerHTML = icon(progress.sound && !hostMuted ? 'sound' : 'muted');
  $('sound-button').setAttribute('aria-pressed', String(!progress.sound));
  $('sound-button').setAttribute('aria-label', hostMuted ? 'App sound is muted' : progress.sound ? 'Mute sound' : 'Turn sound on');
  $('help-button').innerHTML = `${icon('help')}<span>Help</span>`;
  $('app').dataset.skin = progress.skin;
  $('app').dataset.view = view;
}
function difficultyButtons() {
  const descriptions = { starter: 'Little steps', explorer: 'More coins', master: 'A fun challenge' };
  return `<div class="difficulty-picker" role="group" aria-label="Choose your challenge level">${Object.entries(LEVELS).map(([id, level]) => `
    <button type="button" data-action="level" data-id="${id}" aria-pressed="${progress.difficulty === id}" data-focus="level-${id}">
      <strong>${level.name}</strong><span>${descriptions[id]}</span>
    </button>`).join('')}</div>`;
}
function starRow(count) { return `<span class="stars" aria-label="${count} of 3 stars">${[1, 2, 3].map(n => `<span class="${n <= count ? 'earned' : ''}">${icon('star')}</span>`).join('')}</span>`; }
function renderHome() {
  const active = session && session.phase !== 'finished';
  return `<section class="home-view view" aria-labelledby="home-title">
    <div class="home-story"><h1 id="home-title">COIN<br><span>CHAMP</span></h1><p class="home-tagline">Let’s play with coins!</p></div>
    <div class="home-controls">
      <h2>Main menu</h2>${difficultyButtons()}
      <button class="primary hero-play" type="button" data-action="adventure" data-focus="home-play">${icon('play')}<span>Play!<small>A little coin adventure</small></span>${icon('next')}</button>
      ${active ? `<button class="resume-button secondary" type="button" data-action="resume">Continue ${MODES[session.mode]}<small>${LEVELS[session.difficulty].name} · ${isMiniGame(session.mode) ? 'round' : 'question'} ${session.index + 1}</small></button>` : ''}
      <button class="more-games" type="button" data-action="modes">${icon('coins')}More ways to play</button>
      <div class="home-extras"><button type="button" data-action="passport">${icon('book')}Stars</button><button type="button" data-action="prizes">${icon('shop')}Prizes</button></div>
    </div>
  </section>`;
}
function renderCountdown() {
  return `<section class="countdown-view view" aria-labelledby="countdown-title">
    <h1 id="countdown-title">Ready to play?</h1>
    <div class="countdown-token ${introStep === 'START!' ? 'countdown-start' : ''}" aria-hidden="true"><span id="countdown-value">${introStep}</span></div>
    <p>Take your time. You can do this!</p>
  </section>`;
}
function questionText() {
  if (!session) return 'Welcome to the Coin Carnival.';
  if (isMiniGame(session.mode)) return miniQuestion(session);
  const c = session.challenge;
  if (c.kind === 'identify') return `Find the ${COINS[c.answerCoin].name.toLowerCase()}. Which coin is it?`;
  if (c.kind === 'count') return 'Count the coins. How much is in the stash?';
  if (c.kind === 'change') return `The prize costs ${c.price} cents. You paid ${c.paid} cents. Build the change you should get back.`;
  return `Make ${c.target} cents${c.fewest ? ` using only ${optimalCoins(c.target).length} coins` : ''}.`;
}
function piles() {
  const coins = [...session.challenge.pile].sort((a, b) => COINS[b].value - COINS[a].value);
  const columns = coins.length > 10 ? 7 : Math.min(5, coins.length);
  return `<div class="counting-coins" style="--columns:${columns}" aria-label="Coins to count">${coins.map(id => `
    <div class="counting-coin" data-coin="${id}" aria-label="${COINS[id].name}, ${COINS[id].value} cents">${coinFace(id)}<span>${COINS[id].value}¢</span></div>`).join('')}</div>`;
}
function questionStage() {
  const c = session.challenge;
  const title = c.kind === 'identify' ? `Find the ${COINS[c.answerCoin].name.toLowerCase()}` : c.kind === 'count' ? 'How much money?' : c.kind === 'change' ? 'How much change?' : `Make ${money(c.target)}`;
  let instruction = c.kind === 'identify' ? 'Tap the matching coin.' : c.kind === 'count' ? 'Add the coins. Then tap your answer.' : c.kind === 'change' ? 'Put the change in your coin box.' : c.fewest ? `Try using only ${optimalCoins(c.target).length} coins.` : 'Tap a coin to add it. Then tap Check.';
  if (session.phase === 'playing' && session.message && session.attempts) {
    instruction = c.kind === 'identify' ? 'Try another coin. Tap Hint for a clue.' : c.kind === 'count' ? 'Try again. Add the values on the coins.' : session.selection.length ? session.message : 'Tap a coin to add it. Then tap Check.';
  }
  let stage = '';
  if (c.kind === 'count') stage = piles();
  else if (c.kind === 'change') stage = `<div class="change-story"><div><span>It costs</span><strong>${money(c.price)}</strong></div><div><span>You paid</span><strong>${money(c.paid)}</strong></div></div>`;
  return `<section class="question-stage ${stage ? '' : 'simple-question'}" aria-labelledby="question-title">
    <div class="question-heading"><div><h1 id="question-title">${title}</h1><p>${escape(instruction)}</p></div>
      <div class="question-actions"><button class="read-button" type="button" data-action="speak" aria-label="Read this question aloud">${icon('sound')}</button><button class="hint-button" type="button" data-action="hint" data-focus="hint" ${session.phase === 'feedback' ? 'disabled' : ''}>${icon('bulb')}<span>Hint</span></button></div>
    </div>${stage ? `<div class="stage-content">${stage}</div>` : ''}
  </section>`;
}
function workbench() {
  const s = session, c = s.challenge, locked = s.phase !== 'playing';
  if (c.kind === 'identify') return `<section class="workbench choice-workbench" aria-label="Choose a coin"><h2>Which one is it?</h2><div class="coin-choices">${ORDER.map((id, i) => `
    <button type="button" data-action="answer" data-id="${id}" data-focus="answer-${i}" ${locked ? 'disabled' : ''} aria-label="${COINS[id].name}, ${COINS[id].value} cents">${coinFace(id)}<span>${COINS[id].name}</span><small>${COINS[id].value}¢</small></button>`).join('')}</div></section>`;
  if (c.kind === 'count') return `<section class="workbench choice-workbench" aria-label="Choose the total"><h2>Tap your answer</h2><div class="amount-choices">${c.choices.map((amount, i) => `<button type="button" data-action="answer" data-value="${amount}" data-focus="answer-${i}" ${locked ? 'disabled' : ''}><strong>${money(amount)}</strong></button>`).join('')}</div></section>`;
  return `<section class="workbench money-workbench" aria-label="Build your coin amount">
    <h2>Pick your coins</h2>
    <div class="coin-bank" aria-label="Tap a coin to add it">${ORDER.map(id => `<button type="button" data-action="add" data-id="${id}" data-focus="bank-${id}" ${locked || s.selection.length >= 32 ? 'disabled' : ''} aria-label="Add ${COINS[id].name.toLowerCase()}, ${COINS[id].value} cents">${coinFace(id)}<strong>${COINS[id].value}¢</strong><span>${COINS[id].name}</span></button>`).join('')}</div>
    <div class="tray-heading"><h2>Your coin box</h2><output class="tray-total" aria-label="You have">${money(sumCoins(s.selection))}</output></div>
    <div class="selected-coins ${s.selection.length ? '' : 'empty-box'}" id="coin-drop-zone" aria-label="Your coins. Tap a group to take one out.">${s.selection.length ? ORDER.filter(id => s.selection.includes(id)).map(id => {
      const count = s.selection.filter(coin => coin === id).length;
      return `<button class="tray-slot has-coins" type="button" data-action="remove" data-id="${id}" data-focus="remove-${id}" ${locked ? 'disabled' : ''} aria-label="Take out one ${COINS[id].name.toLowerCase()}, ${count} in the box">${coinFace(id)}<span class="selected-quantity">${count}</span><small class="selected-name">${COINS[id].name}</small><small class="remove-hint">Take 1 out</small></button>`;
    }).join('') : '<p>Your box is empty.<br>Tap a coin above to add it.</p>'}</div>
    <div class="answer-actions"><button class="undo-button" type="button" data-action="undo" data-focus="undo" ${locked || !s.selection.length ? 'disabled' : ''}>${icon('undo')}Undo</button><button class="clear-button" type="button" data-action="clear" data-focus="clear" ${locked || !s.selection.length ? 'disabled' : ''}>Start over</button><button class="primary check-button" type="button" data-action="check" data-focus="check" ${locked ? 'disabled' : ''}>${icon('check')}Check</button></div>
  </section>`;
}
function renderPlay() {
  if (isMiniGame(session.mode)) return renderMiniPlay(session, icon, starRow);
  const s = session, feedback = s.phase === 'feedback' || s.phase === 'review';
  const message = s.phase === 'feedback' ? 'You did it!' : 'Let’s learn together. Tap Hint.';
  return `<section class="play-view view ${feedback ? 'show-feedback' : 'keep-playing'}" aria-label="${MODES[s.mode]}">
    <div class="journey-bar"><span class="question-number">Question ${s.index + 1} of ${s.total}</span><span class="clock-label" id="round-clock" role="timer">${s.timed ? `${Math.ceil(s.remainingMs / 1000)}s` : 'Take your time'}</span></div>
    <div class="arena">${questionStage()}${workbench()}</div>
    ${feedback ? `<div class="feedback-bar ${s.phase === 'feedback' ? 'win-feedback' : 'review-feedback'}"><div><p id="round-feedback">${escape(message)}${s.phase === 'feedback' ? starRow(s.lastReward?.stars || 0) : ''}</p></div><button class="primary next-button" type="button" data-action="next" data-focus="next">${s.index + 1 === s.total ? 'All done!' : 'Next'}${icon('next')}</button></div>` : ''}
  </section>`;
}
function renderResults() {
  const rounds = session.total - session.startIndex, accuracy = Math.round(session.correct / rounds * 100);
  return `<section class="results-view view" aria-labelledby="result-title"><div class="result-medal">${icon('crown')}</div><h1 id="result-title">${session.mode === 'adventure' ? 'Adventure complete!' : 'That’s champ thinking!'}</h1><p>Small coins. Some seriously big skills.</p><div class="result-stats"><div><strong>${session.score}</strong><span>points earned</span></div><div><strong>${session.stars}</strong><span>stars collected</span></div><div><strong>${accuracy}%</strong><span>rounds solved</span></div></div><p class="result-note">${session.correct === rounds ? 'Every stop solved. Take a bow!' : 'Keep exploring. Every retry is another way to learn.'}<br>Your stars, tickets, and best streak are saved.</p><div class="result-actions"><button class="primary" type="button" data-action="again">${icon('play')}Play again</button><button class="secondary" type="button" data-action="prizes">${icon('shop')}Prize booth</button><button class="quiet-button" type="button" data-action="home">${icon('home')}Main menu</button></div></section>`;
}
function render(focusKey) {
  const focused = focusKey || document.activeElement?.dataset.focus;
  updateHeader(); $('main').innerHTML = view === 'home' ? renderHome() : view === 'games' ? renderGameRoom(gameTab, icon) : view === 'countdown' ? renderCountdown() : view === 'results' ? renderResults() : renderPlay(); refreshCoinArt(); paintClock();
  coinScene.sync({ view, selection: session?.selection || [], paused: pauses.size > 0 });
  if (focused) $('main').querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
}
function enterCountdown() {
  stopClock(); stopVoice();
  if ($('game-dialog').open) $('game-dialog').close();
  pauses.delete('dialog'); pauses.delete('menu'); pauses.add('intro');
  view = 'countdown'; save();
  const reasons = [...pauses].filter(reason => reason !== 'intro');
  if (document.hidden && !reasons.includes('visibility')) reasons.push('visibility');
  intro.start(reasons);
  $('main').focus({ preventScroll: true });
}
function newGame(mode = 'adventure', replay = false) {
  cancelDrag();
  intro.cancel(); pauses.delete('intro'); stopClock();
  let start = 0;
  if (mode === 'adventure' && !replay) start = Math.max(0, ROUTE.findIndex((_, i) => !progress.stamps[`${progress.difficulty}-${i}`]));
  session = new Session({ mode, difficulty: progress.difficulty, timed: progress.timed, start });
  enterCountdown();
}
function resumeGame() { if (!session || session.phase === 'finished') return newGame(); enterCountdown(); }
function home() { cancelDrag(); intro.cancel(); pauses.delete('intro'); pause('menu'); stopVoice(); view = 'home'; render(); $('main').focus({ preventScroll: true }); }
function gameRoom() { cancelDrag(); intro.cancel(); pauses.delete('intro'); pause('menu'); stopVoice(); view = 'games'; render(); $('main').focus({ preventScroll: true }); }
function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $('celebration').innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--x:${8 + i * 6.5}%;--delay:${i % 4 * 0.04}s;--turn:${i % 2 ? 170 : -170}deg"></i>`).join('');
}
function answer(value) {
  if (pauses.size || view !== 'play' || !session) return;
  const result = session.answer(value);
  finishAnswer(result);
}
function miniAction(action, value, source) {
  if (pauses.size || view !== 'play' || !session) return;
  const result = session.playMini(action, value);
  if (!result) return;
  if (result.addedCoin && source) coinScene.dropFrom(result.addedCoin, source);
  finishAnswer(result, result.focus);
}
function finishAnswer(result, focusKey) {
  if (result?.correct) {
    stopClock(); applyReward(progress, session, result); save();
    bridge?.awardPoints(result.points, { eventId: result.eventId, label: 'Coin Champ solved challenge', meta: { mode: session.mode, difficulty: session.difficulty, round: session.index + 1, stars: result.stars } });
    sound('win'); celebrate(); render('next');
  } else { sound(result?.pending ? 'tap' : 'wrong'); save(); render(focusKey); }
  announce(session.message);
}
function openDialog(kind) { if ($('game-dialog').open) return; previousFocus = document.activeElement; dialogKind = kind; pause('dialog'); renderDialog(); $('game-dialog').showModal(); }
function renderDialog() {

  if (dialogKind === 'hint') {
    $('game-dialog').innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">A little nudge, champ.</h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close hint">${icon('close')}</button></div><div class="dialog-body"><p class="dialog-intro">${escape(challengeHint(session.challenge, session.mini))}</p></div><button class="primary dialog-done" type="button" data-action="close-dialog">Try it out${icon('next')}</button>`;
    return;
  }
  const title = dialogKind === 'help' ? 'Every coin has a superpower.' : dialogKind === 'passport' ? 'Your adventure passport' : dialogKind === 'prizes' ? 'Welcome to the prize booth' : 'Make it your kind of play';
  let content;
  if (dialogKind === 'help') content = `<div class="coin-guide">${ORDER.map(id => `<div>${coinFace(id)}<strong>${COINS[id].name}</strong><span>${COINS[id].value}¢</span></div>`).join('')}</div><div class="help-copy"><p><strong>Count:</strong> add the value of each coin. Then tap your answer.</p><p><strong>Make:</strong> tap coins to fill your coin box. Tap a coin in the box to take one out. Then tap Check.</p><p><strong>Change:</strong> amount paid − price = change back.</p><p><strong>Shine:</strong> 3 stars first try · 2 with a hint · 1 after a retry.</p><p class="keyboard-help">Keys 1–4: choose · Enter: check · Backspace: undo.</p></div>`;
  else if (dialogKind === 'passport') content = `<p class="dialog-intro">${LEVELS[progress.difficulty].name} · Best run: ${progress.bestScore} points · Best streak: ${progress.bestStreak}. Replay to improve your stamps.</p><div class="passport-grid">${ROUTE.map((kind, i) => `<div class="passport-stop ${progress.stamps[`${progress.difficulty}-${i}`] ? 'stamped' : ''}"><span>${i + 1}</span><strong>${({ identify: 'Meet', count: 'Count', make: 'Make', change: 'Change', efficient: 'Fewest' })[kind]}</strong>${starRow(progress.stamps[`${progress.difficulty}-${i}`] || 0)}</div>`).join('')}</div>`;
  else if (dialogKind === 'prizes') content = `<p class="dialog-intro">${icon('ticket')} <strong>${progress.tickets} tickets to spend</strong></p><div class="prize-list"><button class="prize-item" type="button" data-action="buy" data-id="sunrise"><span class="prize-swatch" style="--swatch:#79462d">${icon('coins')}</span><span><strong>Golden Hour</strong><small>Your original golden tray</small></span><span>${progress.skin === 'sunrise' ? 'Equipped' : 'Equip'}</span></button>${PRIZES.map(prize => `<button class="prize-item" type="button" data-action="buy" data-id="${prize.id}" ${!progress.owned.includes(prize.id) && progress.tickets < prize.cost ? 'disabled' : ''}><span class="prize-swatch" style="--swatch:${prize.color}">${icon(prize.id === 'cosmic' ? 'crown' : 'coins')}</span><span><strong>${prize.name}</strong><small>${prize.description}</small></span><span>${progress.skin === prize.id ? 'Equipped' : progress.owned.includes(prize.id) ? 'Equip' : `${prize.cost} tickets`}</span></button>`).join('')}</div><p class="dialog-footnote">Earned in play. No real money.</p>`;
  else content = `<div class="settings-options"><button type="button" data-action="toggle-timer" aria-pressed="${progress.timed}"><span>${icon('pause')}<strong>Round timer</strong><small>${progress.timed ? 'On for your next game' : 'Off · take all the time you need'}</small></span><span class="switch ${progress.timed ? 'on' : ''}"></span></button><button type="button" data-action="sound" aria-pressed="${progress.sound}"><span>${icon('sound')}<strong>Game sounds</strong><small>${hostMuted ? 'The app’s master mute is on' : 'Soft coin clicks and little celebrations'}</small></span><span class="switch ${progress.sound ? 'on' : ''}"></span></button></div><p class="dialog-footnote">Games save after every move. Your current round can continue after you close the app. The round timer starts after START! It pauses in Help, menus, and the background.</p>`;
  if (dialogKind === 'help' && session && view !== 'home') content += `<button class="secondary guide-read" type="button" data-action="speak">${icon('sound')}Hear the question</button>`;
  if (dialogKind === 'help') content += '<div class="help-copy"><p><strong>Coin Sort:</strong> drag the coin to its jar, or tap the jar.</p><p><strong>Memory:</strong> match coins with their value. Use Flip back after a mismatch.</p><p><strong>Treasure:</strong> tap map coins to reach the goal. Tap a chosen coin to return it.</p><p class="keyboard-help">Every game works with Tab and Enter. Sort: keys 1–4. Memory/treasure: numbered cards or coins.</p></div>';
  if (dialogKind === 'help') content += '<p class="dialog-footnote coin-credit">Coin photographs: United States Mint and Wikimedia Commons contributors. No endorsement implied.</p>';
  $('game-dialog').innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close ${dialogKind}">${icon('close')}</button></div><div class="dialog-body">${content}</div><button class="primary dialog-done" type="button" data-action="close-dialog">${dialogKind === 'help' ? 'Got it. Let’s play!' : 'Done'}${icon('check')}</button>`;
  refreshCoinArt();
}
function closeDialog() { if ($('game-dialog').open) $('game-dialog').close(); }
$('game-dialog').addEventListener('close', () => { if ($('game-dialog').open) return; dialogKind = ''; resume('dialog'); previousFocus?.focus({ preventScroll: true }); });
$('game-dialog').addEventListener('click', event => { if (event.target === $('game-dialog')) closeDialog(); });
function toggleSound() { progress.sound = !progress.sound; if (!progress.sound) { stopVoice(); void audio?.suspend().catch(() => {}); } save(); updateHeader(); if (dialogKind) renderDialog(); }
function exitGame() { if (view !== 'home') return home(); intro.cancel(); pause('menu'); stopVoice(); if (window.parent !== window) window.parent.postMessage({ type: 'LAHS_GAME_EXIT_TO_HOME', source: 'coin-champ', gameId: 'coin-champ', tab: 'games' }, location.origin); else home(); }
let suppressCoinClickUntil = 0;
function addCoin(id, source) {
  if (!session.addCoin(id)) return false;
  const rect = source || document.querySelector(`[data-action="add"][data-id="${id}"] [data-art]`)?.getBoundingClientRect();
  if (rect) coinScene.dropFrom(id, rect);
  sound(); return true;
}
function handleAction(event) {
  const button = event.target.closest('button[data-action]'); if (!button || button.disabled) return;
  const { action, id, mode, value } = button.dataset;
  if (['add', 'sort', 'drag-sort', 'collect-coin'].includes(action) && event.detail !== 0 && performance.now() < suppressCoinClickUntil) return;
  if (action === 'modes') return gameRoom();
  if (action === 'game-tab' && ['fun', 'practice'].includes(id)) { gameTab = id; render(); return; }
  if (action === 'close-dialog') return closeDialog();
  if (action === 'home') return home();
  if (['help', 'passport', 'prizes', 'settings'].includes(action)) return openDialog(action);
  if (action === 'level' && LEVELS[id]) { progress.difficulty = id; save(); render(); return; }
  if (action === 'adventure') return newGame();
  if (action === 'start' && MODES[mode]) return newGame(mode);
  if (action === 'again') return newGame(session.mode, true);
  if (action === 'resume') return resumeGame();
  if (action === 'toggle-timer') { progress.timed = !progress.timed; save(); renderDialog(); return; }
  if (action === 'sound') return toggleSound();
  if (action === 'buy') { if (buyPrize(progress, id)) { sound(); save(); updateHeader(); renderDialog(); } return; }
  if (action === 'speak') return speak();
  if (view !== 'play' || pauses.size || !session) return;
  if (action === 'drag-sort') return announce('Tap the matching jar, or drag this coin into it.');
  if (action === 'sort') return miniAction('sort', id, document.querySelector('.sort-current [data-art]')?.getBoundingClientRect());
  if (action === 'flip-card') return miniAction('flip', Number(button.dataset.index));
  if (action === 'fold-cards') return miniAction('fold');
  if (action === 'collect-coin') return miniAction('collect', Number(button.dataset.index), button.querySelector('[data-art]')?.getBoundingClientRect());
  if (action === 'mini-undo' || action === 'mini-clear') return miniAction(action === 'mini-undo' ? 'undo' : 'clear');
  if (action === 'answer') return answer(id || Number(value));
  if (action === 'check') return answer();
  if (action === 'next') {
    if (!session.advance()) return;
    stopVoice(); if (session.phase === 'finished') view = 'results';
    save(); render(); startClock(); $('main').focus({ preventScroll: true }); announce(view === 'results' ? 'Adventure finished. Your progress is saved.' : questionText()); return;
  }
  if (action === 'add') addCoin(id);
  if (action === 'remove') session.removeCoin(id);
  if (action === 'undo') session.undo();
  if (action === 'clear') session.clear();
  if (action === 'hint') { session.hint(); session.message = 'Hint used. Try your idea, or open the hint again.'; save(); render('hint'); openDialog('hint'); announce(challengeHint(session.challenge, session.mini)); return; }
  save(); render();
}
document.addEventListener('click', handleAction);
$('exit-button').addEventListener('click', exitGame); $('brand-button').addEventListener('click', home); $('tickets-button').addEventListener('click', () => openDialog('prizes')); $('sound-button').addEventListener('click', toggleSound); $('help-button').addEventListener('click', () => openDialog('help')); $('settings-button').addEventListener('click', () => openDialog('settings'));
window.addEventListener('keydown', event => {
  if ($('game-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.key === 'Escape' && ['play', 'countdown', 'games'].includes(view)) { event.preventDefault(); home(); return; }
  if (view !== 'play' || pauses.size || session?.phase !== 'playing') return;
  if (isMiniGame(session.mode)) {
    if (session.mode === 'sort' && /^[1-4]$/.test(event.key)) { event.preventDefault(); miniAction('sort', ORDER[Number(event.key) - 1], document.querySelector('.sort-current [data-art]')?.getBoundingClientRect()); }
    else if (session.mode !== 'sort' && /^[0-9]$/.test(event.key)) { event.preventDefault(); const index = event.key === '0' ? 9 : Number(event.key) - 1; miniAction(session.mode === 'memory' ? 'flip' : 'collect', index, document.querySelector(`[data-action="collect-coin"][data-index="${index}"] [data-art]`)?.getBoundingClientRect()); }
    else if (event.key === 'Backspace') { event.preventDefault(); miniAction(session.mode === 'memory' ? 'fold' : 'undo'); }
    return;
  }
  if (/^[1-4]$/.test(event.key)) {
    event.preventDefault(); const index = Number(event.key) - 1;
    if (session.challenge.kind === 'identify') answer(ORDER[index]); else if (session.challenge.kind === 'count') answer(session.challenge.choices[index]); else { addCoin(ORDER[index]); save(); render(); }
  } else if (event.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); answer(); }
  else if (event.key === 'Backspace') { event.preventDefault(); session.undo(); save(); render(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause('visibility'); stopVoice(); void audio?.suspend().catch(() => {}); } else resume('visibility'); });
window.addEventListener('pagehide', event => { pause('visibility'); stopVoice(); if (!event.persisted) coinScene.dispose(); }); window.addEventListener('pageshow', event => { if (event.persisted) home(); if (!document.hidden) resume('visibility'); });
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'APP_SOUND_SETTINGS_UPDATE') return;
  const payload = event.data.payload || {};
  if (typeof payload.muted === 'boolean') hostMuted = payload.muted;
  if (typeof payload.sfxVolume === 'number' && Number.isFinite(payload.sfxVolume)) hostVolume = Math.max(0, Math.min(1, payload.sfxVolume));
  if (hostMuted || hostVolume === 0) { stopVoice(); void audio?.suspend().catch(() => {}); } updateHeader();
});
let drag = null;
function cancelDrag() { drag?.ghost?.remove(); drag = null; }
document.addEventListener('pointerdown', event => {
  suppressCoinClickUntil = 0;
  const button = event.target.closest('[data-action="add"], [data-action="drag-sort"]'); if (!button || button.disabled || event.button !== 0 || pauses.size || view !== 'play') return;
  drag = { id: button.dataset.id, kind: button.dataset.action, pointer: event.pointerId, x: event.clientX, y: event.clientY, ghost: null };
  button.setPointerCapture?.(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointer) return;
  if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 9) { drag.ghost = document.createElement('div'); drag.ghost.className = 'drag-coin'; drag.ghost.innerHTML = coinFace(drag.id); document.body.append(drag.ghost); }
  if (drag.ghost) { drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`; }
});
function endDrag(event, cancel = false) {
  if (!drag || event.pointerId !== drag.pointer) return;
  if (drag.ghost) {
    suppressCoinClickUntil = performance.now() + 400; const zone = $('coin-drop-zone')?.getBoundingClientRect();
    const source = { x: event.clientX - 24, y: event.clientY - 24, width: 48, height: 48 };
    if (!cancel && !pauses.size && view === 'play') {
      if (drag.kind === 'drag-sort' && drag.id === session?.challenge.pile[session.mini?.cursor]) { const jar = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-action="sort"]'); if (jar) miniAction('sort', jar.dataset.id, source); }
      else if (drag.kind === 'add' && zone && event.clientX >= zone.left && event.clientX <= zone.right && event.clientY >= zone.top && event.clientY <= zone.bottom && addCoin(drag.id, source)) { save(); render(); announce(`${COINS[drag.id].name} added.`); }
    }
    drag.ghost.remove();
  }
  drag = null;
}
document.addEventListener('pointerup', event => endDrag(event)); document.addEventListener('pointercancel', event => endDrag(event, true));
save(); render(); void prepareCoinArt();
