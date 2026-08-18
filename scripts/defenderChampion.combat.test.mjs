import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyArmor,
  applySupportEffects,
  clampControlEffect,
  getDreadColossusPhase,
  stepCombat,
} from '../public/Games/DefenderChampion/src/core/combat.js';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const createCombatEnemy = (id, enemyId, overrides = {}) => {
  const config = ENEMIES[enemyId];
  return {
    id,
    enemyId,
    waveIndex: 0,
    spawnTick: 0,
    pathProgress: 0,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    armor: config.armor,
    clusterSize: 1,
    castleDamage: config.castleDamage,
    nextAbilityTick: config.cooldownTicks,
    abilityActiveTicks: 0,
    nextAbilityActiveTick: config.cooldownTicks,
    thresholdFlags: {},
    ...overrides,
  };
};

const createTowerCombat = (defenderId, tier, attackCount, enemies) => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.nextSpawnIndex = 0;
  simulation.spawnedAllWaves = true;
  simulation.coins = 1000;
  issueCommand(simulation, { type: 'build', defenderId, padId: 'l1-pad-a' });
  simulation.towers[0].tier = tier;
  simulation.towers[0].attackCount = attackCount;
  simulation.enemies = enemies;
  return simulation;
};

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

test('Ironwarden stuns only on each configured Tier 3 mastery attack', () => {
  for (const [tier, attackCount, shouldStun] of [[0, 3, false], [2, 0, false], [2, 3, true]]) {
    const enemy = createCombatEnemy('enemy-1', 'blight-walker', { health: 1000, maxHealth: 1000 });
    const simulation = createTowerCombat('ironwarden', tier, attackCount, [enemy]);
    for (let tick = 0; tick <= DEFENDERS.ironwarden.projectileTicks; tick += 1) {
      simulation.tick = tick;
      stepCombat(simulation);
    }
    assert.equal(
      (enemy.stunnedUntilTick ?? 0) > simulation.tick,
      shouldStun,
      `tier ${tier} attack ${attackCount + 1}`,
    );
  }
});

test('Ranger mastery selects configured distinct targets by fastest priority and numeric ID ties', () => {
  const enemies = [
    createCombatEnemy('enemy-10', 'blight-walker', { speed: 80, health: 1000, maxHealth: 1000 }),
    createCombatEnemy('enemy-2', 'blight-walker', { speed: 80, health: 1000, maxHealth: 1000 }),
    createCombatEnemy('enemy-3', 'blight-walker', { speed: 70, health: 1000, maxHealth: 1000 }),
    createCombatEnemy('enemy-1', 'blight-walker', { speed: 60, health: 1000, maxHealth: 1000 }),
  ];
  const simulation = createTowerCombat('ranger', 2, 4, enemies);

  stepCombat(simulation);

  assert.deepEqual(
    simulation.projectiles.map((projectile) => projectile.targetId),
    ['enemy-2', 'enemy-10', 'enemy-3'],
  );
});

test('boss ability waits for 600 completed active ticks including a stunned interval', () => {
  const boss = createCombatEnemy('enemy-1', 'mossback-brute', {
    speed: 0,
    stunnedUntilTick: 120,
  });
  const simulation = createTowerCombat('bladeguard', 0, 0, [boss]);
  simulation.towers = [];

  for (let tick = 0; tick <= 718; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }
  assert.equal(boss.abilityActiveTicks, 599);
  assert.equal(simulation.effects.some((effect) => effect.kind === 'mossback-telegraph'), false);

  simulation.tick = 719;
  stepCombat(simulation);
  assert.equal(boss.abilityActiveTicks, 600);
  assert.equal(boss.nextAbilityTick, 720);
  assert.equal(simulation.effects.some((effect) => effect.kind === 'mossback-telegraph'), false);

  simulation.tick = 720;
  stepCombat(simulation);
  assert.equal(simulation.effects.some((effect) => effect.kind === 'mossback-telegraph'), true);
});

test('received support heals a stunned enemy while the stunned source cannot cast', () => {
  const recipient = createCombatEnemy('enemy-1', 'blight-walker', {
    health: 3000,
    maxHealth: 6000,
    speed: 0,
    stunnedUntilTick: 20,
  });
  const source = createCombatEnemy('enemy-2', 'hexcaller', {
    speed: 0,
    stunnedUntilTick: 20,
    nextAbilityTick: 10,
  });
  const simulation = createTowerCombat('bladeguard', 0, 0, [recipient, source]);
  simulation.towers = [];
  simulation.tick = 10;
  simulation.effects = [{
    id: 'effect-1',
    sourceId: 'enemy-3',
    targetId: recipient.id,
    kind: 'enemy-healing',
    value: 0.03,
    expiresAtTick: 100,
  }];

  stepCombat(simulation);

  assert.equal(recipient.health, 3003);
  assert.equal(simulation.effects.some((effect) => effect.sourceId === source.id), false);
});

test('terminal cleanup clears effects and every internal effect cache', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.nextSpawnIndex = 0;
  simulation.castleHearts = 1;
  const enemy = createCombatEnemy('enemy-1', 'blight-walker', { pathProgress: 1_000_000 });
  simulation.enemies = [enemy];
  simulation.effects = [{
    id: 'effect-1', sourceId: 'enemy-2', targetId: enemy.id,
    kind: 'enemy-speed', value: 0.2, expiresAtTick: 100,
  }];

  advanceSimulation(simulation, 1);

  assert.equal(simulation.terminal, true);
  assert.deepEqual(simulation.effects, []);
  assert.equal(simulation.activeEffectValues.size, 0);
});
