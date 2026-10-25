import assert from 'node:assert/strict';
import test from 'node:test';
import { StartCountdown } from '../public/Games/Coin Champion/start-countdown.mjs';

function fixture() {
  let now = 0, id = 0, completions = 0;
  const tasks = new Map(), steps = [];
  const countdown = new StartCountdown({
    onStep: step => steps.push(step), onComplete: () => completions++, now: () => now,
    schedule: (callback, duration) => { const key = ++id; tasks.set(key, { callback, at: now + duration }); return key; },
    unschedule: key => tasks.delete(key),
  });
  function tick(duration) {
    const end = now + duration;
    for (;;) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [key, task] = next; now = task.at; tasks.delete(key); task.callback();
    }
    now = end;
  }
  return { countdown, tick, tasks, steps, completions: () => completions };
}
test('shows 3, 2, 1 and START before entering gameplay exactly once', () => {
  const f = fixture(); f.countdown.start();
  assert.deepEqual(f.steps, ['3']); f.tick(1000); assert.deepEqual(f.steps, ['3', '2']);
  f.tick(1000); assert.equal(f.steps.at(-1), '1'); f.tick(1000); assert.equal(f.steps.at(-1), 'START!');
  f.tick(599); assert.equal(f.completions(), 0); f.tick(1); assert.equal(f.completions(), 1);
  f.tick(10000); assert.equal(f.completions(), 1);
});
test('preserves the visible fraction of a step while backgrounded', () => {
  const f = fixture(); f.countdown.start(); f.tick(730); f.countdown.pause('visibility');
  f.tick(10000); assert.deepEqual(f.steps, ['3']); f.countdown.resume('visibility');
  f.tick(269); assert.deepEqual(f.steps, ['3']); f.tick(1); assert.equal(f.steps.at(-1), '2');
});
test('closing help cannot resume a countdown still paused by visibility', () => {
  const f = fixture(); f.countdown.start(); f.countdown.pause('dialog'); f.countdown.pause('visibility');
  f.countdown.resume('dialog'); f.tick(5000); assert.deepEqual(f.steps, ['3']);
  f.countdown.resume('visibility'); f.tick(3600); assert.equal(f.completions(), 1);
});
test('returning to the menu cancels every pending start', () => {
  const f = fixture(); f.countdown.start(); const pending = [...f.tasks.values()][0].callback;
  f.tick(500); f.countdown.cancel(); pending(); f.tick(10000);
  assert.deepEqual(f.steps, ['3']); assert.equal(f.completions(), 0); assert.equal(f.tasks.size, 0);
});
test('a stale callback cannot advance a newly started game', () => {
  const f = fixture(); f.countdown.start(); const pending = [...f.tasks.values()][0].callback;
  f.tick(500); f.countdown.start(); pending(); assert.deepEqual(f.steps, ['3', '3']);
  f.tick(3600); assert.deepEqual(f.steps, ['3', '3', '2', '1', 'START!']); assert.equal(f.completions(), 1);
});
test('resuming a canceled countdown does not enter play', () => {
  const f = fixture(); f.countdown.start(); f.countdown.pause('dialog'); f.countdown.cancel();
  f.countdown.resume('dialog'); f.tick(10000); assert.equal(f.completions(), 0);
});
test('a countdown started in the background waits for the game to be visible', () => {
  const f = fixture(); f.countdown.start(['visibility']); f.tick(10000);
  assert.deepEqual(f.steps, ['3']); assert.equal(f.tasks.size, 0);
  f.countdown.resume('visibility'); f.tick(3600); assert.equal(f.completions(), 1);
});
test('canceling from a step callback leaves no delayed action behind', () => {
  const f = fixture(); f.countdown.onStep = () => f.countdown.cancel();
  f.countdown.start(); f.tick(10000); assert.equal(f.tasks.size, 0); assert.equal(f.completions(), 0);
});
