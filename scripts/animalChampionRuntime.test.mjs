import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const REQUIRED_IDS = [
  'menuReveal',
  'menuPanel',
  'modeChallenger',
  'modeContinuous',
  'startButton',
  'countdownScreen',
  'countdownValue',
  'gameScreen',
  'scoreValue',
  'streakValue',
  'newGameButton',
  'animalBackdrop',
  'animalImage',
  'timerBar',
  'timerRegion',
  'choiceGrid',
  'feedback',
  'gameOverScreen',
  'finalScore',
  'leaderboard',
  'playAgainButton',
  'mainMenuButton',
  'errorScreen',
  'errorMessage',
  'retryButton',
  'errorMenuButton',
];

const CONTROL_IDS = [
  'menuReveal',
  'modeChallenger',
  'modeContinuous',
  'startButton',
  'newGameButton',
  'playAgainButton',
  'mainMenuButton',
  'retryButton',
  'errorMenuButton',
];

const HIDDEN_IDS = [
  'menuPanel',
  'countdownScreen',
  'gameScreen',
  'gameOverScreen',
  'errorScreen',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function openingTagById(html, id) {
  const match = html.match(new RegExp(`<([a-z][\\w-]*)\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, 'i'));
  assert.ok(match, `expected an opening tag with id="${id}"`);
  return { name: match[1].toLowerCase(), source: match[0] };
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, 'i'))?.[1] ?? null;
}

function cssRule(css, selector) {
  const match = css.match(new RegExp(`(?:^|})\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)}`, 'm'));
  assert.ok(match, `expected CSS rule for ${selector}`);
  return match[1];
}

function mediaBlock(css, header) {
  const marker = `@media ${header}`;
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `expected ${marker}`);
  const openingBrace = css.indexOf('{', markerIndex + marker.length);
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`unclosed ${marker}`);
}

test('Animal Champion shell has the exact stable semantic contract', async () => {
  const html = await read('public/Games/Animal Champion/index.html');

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);

  for (const id of REQUIRED_IDS) {
    const matches = html.match(new RegExp(`\\bid="${escapeRegExp(id)}"`, 'g')) ?? [];
    assert.equal(matches.length, 1, `expected id="${id}" exactly once`);
  }

  for (const id of CONTROL_IDS) {
    const tag = openingTagById(html, id);
    assert.equal(tag.name, 'button', `expected ${id} to be a native button`);
    assert.equal(attribute(tag.source, 'type'), 'button', `expected ${id} to declare type="button"`);
  }

  for (const id of HIDDEN_IDS) {
    assert.match(openingTagById(html, id).source, /\shidden(?:\s|>)/i, `expected ${id} to start hidden`);
  }

  assert.match(openingTagById(html, 'feedback').source, /\baria-live="polite"/i);
  assert.match(openingTagById(html, 'timerRegion').source, /\brole="progressbar"/i);

  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => match[1]);
  assert.equal(scripts.length, 1, 'expected one script dependency');
  assert.deepEqual(scripts.map((tag) => attribute(tag, 'src')), ['../shared/lahsPointsBridge.js']);

  const links = [...html.matchAll(/<link\b([^>]*)>/gi)].map((match) => match[1]);
  assert.equal(links.length, 1, 'expected one link dependency');
  assert.equal(attribute(links[0], 'rel'), 'stylesheet');
  assert.equal(attribute(links[0], 'href'), 'css/style.css');

  assert.doesNotMatch(html, /<(?:audio|input|textarea)\b/i);
  assert.doesNotMatch(html, /\b(?:microphone|speech|fullscreen|requestFullscreen|webkitRequestFullscreen|settings?)\b/i);
  assert.doesNotMatch(html, /\b(?:src|href)="https?:\/\//i);
});

test('Animal Champion theme locks safe areas, media treatment, and responsive geometry', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  const sides = ['top', 'right', 'bottom', 'left'];

  for (const side of sides) {
    assert.match(css, new RegExp(`--safe-${side}:\\s*env\\(safe-area-inset-${side},\\s*0px\\)`));
  }

  const screenRule = cssRule(css, '.screen');
  for (const side of sides) {
    assert.match(screenRule, new RegExp(`padding-${side}:\\s*max\\([^;]*(?:var\\(--safe-${side}\\)|env\\(safe-area-inset-${side}\\))`));
  }

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(cssRule(css, '.animal-stage'), /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(cssRule(css, '#animalBackdrop'), /object-fit:\s*cover/);
  assert.match(cssRule(css, '#animalBackdrop'), /filter:\s*blur\(/);
  assert.match(cssRule(css, '#animalImage'), /object-fit:\s*contain/);

  const gameRule = cssRule(css, '.screen--game');
  assert.match(gameRule, /grid-template-rows:\s*repeat\(5,\s*auto\)/);
  assert.doesNotMatch(gameRule, /minmax\(0,\s*1fr\)/);
  assert.match(cssRule(css, '.animal-stage'), /grid-row:\s*2\s*\/\s*6/);

  const landscape = mediaBlock(css, '(orientation: landscape) and (max-height: 540px) and (min-width: 650px)');
  assert.match(landscape, /grid-template-rows:\s*repeat\(5,\s*auto\)/);
  assert.match(landscape, /grid-row:\s*1\s*\/\s*6/);

  const choiceRule = cssRule(css, '.choice-grid button');
  assert.doesNotMatch(choiceRule, /text-overflow:\s*ellipsis/);
  assert.doesNotMatch(css, /padding-right:\s*(?:5\.5|4\.6)rem/);
  const narrowPhone = mediaBlock(css, '(max-width: 420px)');
  assert.match(narrowPhone, /\.choice-grid button\[data-result\]/);
  assert.match(narrowPhone, /min-height:\s*64px/);

  assert.doesNotMatch(css, /https?:\/\//i);
});

test('Animal Champion uses emerald primary actions and robust forced colors', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  const primary = cssRule(css, '.primary-action');
  const primaryHover = cssRule(css, '.primary-action:hover');

  assert.match(primary, /background:[^;]*var\(--emerald-400\)/);
  assert.doesNotMatch(primary.match(/background:[^;]*/)?.[0] ?? '', /var\(--gold-(?:300|500)\)/);
  assert.match(primary, /box-shadow:[^;]*rgb\(49\s+215\s+155\s*\/\s*\d+%\)/);
  assert.match(primaryHover, /background:[^;]*var\(--emerald-400\)/);
  assert.match(primaryHover, /box-shadow:[^;]*rgb\(49\s+215\s+155\s*\/\s*\d+%\)/);

  const forcedColors = mediaBlock(css, '(forced-colors: active)');
  for (const systemColor of ['Canvas', 'CanvasText', 'ButtonFace', 'ButtonText', 'Highlight', 'HighlightText']) {
    assert.match(forcedColors, new RegExp(`\\b${systemColor}\\b`));
  }
  for (const selector of ['.eyebrow', '.menu-hero__intro', '.trail-mark', '.primary-action']) {
    assert.match(forcedColors, new RegExp(escapeRegExp(selector)));
  }
  const forcedPrimary = cssRule(
    forcedColors,
    '.primary-action,\n  .primary-action:hover,\n  .mode-toggle button[aria-pressed="true"]',
  );
  assert.match(forcedPrimary, /color:\s*ButtonText/);
  assert.match(forcedPrimary, /background:\s*ButtonFace/);
  assert.doesNotMatch(forcedPrimary, /color:\s*HighlightText/);
  assert.doesNotMatch(forcedPrimary, /background:\s*Highlight/);
  assert.match(forcedColors, /forced-color-adjust:\s*auto/);
  assert.match(forcedColors, /opacity:\s*1/);
  assert.match(forcedColors, /filter:\s*none/);
  assert.match(forcedColors, /text-shadow:\s*none/);
  assert.match(forcedColors, /box-shadow:\s*none/);
});
