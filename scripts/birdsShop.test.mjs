import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const sandbox = { window: {}, structuredClone };
vm.runInNewContext(await readFile('public/Games/Many Birds One Stone/shop.js', 'utf8'), sandbox);
const e = sandbox.window.WoodlandEconomy;
test('historical stars grant coins once and preserve purchases on reload', () => {
  const stats = { 1: { stars: 2 }, 7: { points: 150 } };
  const fresh = e.normalize(null, stats);
  assert.equal(fresh.coins, 255);
  const purchase = e.transact(fresh, 'tank');
  assert.equal(purchase.next.coins, 135);
  assert.equal(e.normalize(purchase.next, stats).coins, 135);
  assert.equal(e.loadout(purchase.next).inkMultiplier, 1.15);
});
test('clear and improvement rewards have a bounded per-level ledger', () => {
  let wallet = e.normalize(null);
  const first = e.reward(wallet, 1, 2); assert.equal(first.earned, 105);
  const replay = e.reward(first.next, 1, 2); assert.equal(replay.earned, 15);
  const improvement = e.reward(replay.next, 1, 3); assert.equal(improvement.earned, 30);
  assert.equal(e.reward(improvement.next, 1, 1).earned, 15);
  assert.equal(improvement.next.ledger[0], 3);
  assert.equal(wallet.coins, 60, 'model operations leave input unchanged');
});
test('insufficient funds, tank limits, inventory limits and owned equipment', () => {
  let wallet = e.normalize(null); assert.ok(e.transact(wallet, 'boulder').error);
  wallet.coins = 4000;
  for (let i = 0; i < 3; i++) wallet = e.transact(wallet, 'tank').next;
  assert.ok(e.transact(wallet, 'tank').error); assert.equal(e.loadout(wallet).inkMultiplier, 1.5);
  for (let i = 0; i < 9; i++) wallet = e.transact(wallet, 'bottle').next;
  assert.ok(e.transact(wallet, 'bottle').error);
  wallet = e.transact(wallet, 'boulder').next;
  assert.equal(e.loadout(wallet).radius, 14);
  const coins = wallet.coins;
  wallet = e.transact(wallet, 'standard').next;
  wallet = e.transact(wallet, 'boulder').next;
  assert.equal(wallet.coins, coins, 'owned equipment never costs again');
  assert.ok(e.transact(wallet, '__proto__').error);
});
test('malformed saves cannot equip unowned items or produce negative wallets', () => {
  const wallet = e.normalize({ version: 1, coins: -50, tank: 100, bottles: Infinity, owned: ['__proto__', 'jade', 'jade', 'bottle'], ball: 'boulder', finish: 'steel', trail: true, ledger: { 0: 99 } });
  assert.equal(wallet.coins, 0); assert.equal(wallet.tank, 3); assert.equal(wallet.bottles, 0);
  assert.equal(wallet.owned.join(), 'jade'); assert.equal(wallet.ball, 'standard');
  assert.equal(wallet.finish, 'brass'); assert.equal(wallet.trail, false);
  assert.equal(wallet.ledger[0], 3);
  const corrupt = e.normalize({ version: 1, coins: { toString: {} }, owned: [{ toString: {} }] }, null);
  assert.equal(corrupt.coins, 0); assert.equal(corrupt.owned.length, 0);
});
