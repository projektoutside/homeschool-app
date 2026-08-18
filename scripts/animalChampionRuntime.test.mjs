import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Animal Champion shell uses semantic controls and preserves zoom', async () => {
  const html = await read('public/Games/Animal Champion/index.html');
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
  assert.match(html, /<button[^>]+id="menuReveal"/);
  assert.match(html, /id="feedback"[^>]+aria-live="polite"/);
  assert.match(html, /id="timerRegion"[^>]+role="progressbar"/);
  assert.match(html, /\.\.\/shared\/lahsPointsBridge\.js/);
  assert.doesNotMatch(html, /<audio|googleapis|gstatic|microphone|speech/i);
});

test('Animal Champion CSS covers safe areas, reduced motion, and touch sizing', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /filter:\s*blur/);
});
