import test from 'node:test';
import assert from 'node:assert/strict';
import { DROP_MS, REST_TILT, dropPose, reconcileCoins } from '../public/Games/Coin Champion/coin-motion.mjs';

test('duplicate denominations keep their individual identities when the last coin is removed', () => {
  let uid = 0; const next = () => ++uid;
  const before = reconcileCoins([], ['penny', 'dime', 'penny'], next);
  const after = reconcileCoins(before, ['penny', 'dime'], next);
  assert.equal(after[0], before[0]); assert.equal(after[1], before[1]); assert.equal(uid, 3);
});
test('rapid additions and undo preserve the logical selection without duplicate visual keys', () => {
  let uid = 0, coins = []; const next = () => ++uid;
  for (let n = 1; n <= 32; n++) coins = reconcileCoins(coins, Array(n).fill('quarter'), next);
  assert.equal(coins.length, 32); assert.equal(new Set(coins.map(c => c.key)).size, 32);
  const first = coins[0]; coins = reconcileCoins(coins, ['quarter'], next);
  assert.equal(coins[0], first); assert.deepEqual(reconcileCoins(coins, [], next), []);
});
test('a changed denomination receives a new visual identity', () => {
  let uid = 0; const next = () => ++uid;
  const first = reconcileCoins([], ['dime'], next), second = reconcileCoins(first, ['nickel'], next);
  assert.notEqual(second[0].key, first[0].key); assert.equal(second[0].id, 'nickel');
});
const from = { x: 100, y: 80, radius: 25 }, to = { x: 250, y: 300, radius: 40, rz: -.05 };
test('a drop begins at the input coin and settles exactly at its destination', () => {
  const start = dropPose(from, to, 0), end = dropPose(from, to, DROP_MS);
  assert.equal(start.x, from.x); assert.equal(start.y, from.y); assert.equal(start.radius, from.radius);
  assert.equal(end.x, to.x); assert.equal(end.y, to.y); assert.equal(end.radius, to.radius); assert(Math.abs(end.rx - REST_TILT.x) < 1e-10); assert(Math.abs(end.ry - REST_TILT.y) < 1e-10); assert.equal(end.done, true);
});
test('out-of-range timestamps cannot produce drift or an unending animation', () => {
  assert.deepEqual(dropPose(from, to, -300), dropPose(from, to, 0));
  assert.deepEqual(dropPose(from, to, DROP_MS * 100), dropPose(from, to, DROP_MS));
});
test('every sampled tumble pose stays finite with a positive bounded radius', () => {
  for (let elapsed = 0; elapsed <= DROP_MS; elapsed += 10) {
    const pose = dropPose(from, to, elapsed);
    for (const key of ['x', 'y', 'rx', 'ry', 'rz', 'radius']) assert(Number.isFinite(pose[key]));
    assert(pose.radius >= from.radius && pose.radius <= to.radius);
    assert.equal(pose.done, elapsed >= DROP_MS);
  }
});
