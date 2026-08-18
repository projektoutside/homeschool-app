import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyArmor,
  applySupportEffects,
  clampControlEffect,
  getDreadColossusPhase,
} from '../public/Games/DefenderChampion/src/core/combat.js';

test('armor and control effects respect hard ceilings', () => {
  assert.equal(applyArmor(100, 0.90), 35);
  assert.equal(applyArmor(1, 0.65), 1);
  assert.deepEqual(clampControlEffect('standard', { stunSeconds: 9, slow: 0.9 }), {
    stunSeconds: 1.5,
    slow: 0.40,
  });
  assert.deepEqual(clampControlEffect('boss', { stunSeconds: 9, slow: 0.9 }), {
    stunSeconds: 0.5,
    slow: 0.40,
  });
});

test('duplicate support uses the strongest aura and heals at most once per tick', () => {
  const simulation = {
    tick: 10,
    activeEffectValues: new Map([
      ['enemy-1\u0000enemy-speed', 0.20],
      ['enemy-1\u0000enemy-healing', 0.03],
    ]),
  };
  const enemy = { id: 'enemy-1', health: 3000, maxHealth: 6000 };

  assert.deepEqual(applySupportEffects(simulation, enemy), {
    speedBonus: 0.20,
    armorBonus: 0,
  });
  applySupportEffects(simulation, enemy);

  assert.equal(enemy.health, 3003);
});

test('Dread Colossus exposes three exact phases', () => {
  assert.equal(getDreadColossusPhase(1.00), 1);
  assert.equal(getDreadColossusPhase(0.75), 2);
  assert.equal(getDreadColossusPhase(0.40), 3);
  assert.equal(getDreadColossusPhase(0.01), 3);
});
