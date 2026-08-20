import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyArmor,
  applyHit,
  applySupportEffects,
  clampControlEffect,
  getDreadColossusPhase,
  stepCombat,
} from '../public/Games/DefenderChampion/src/core/combat.js';
import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
import { ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  cellCenter,
} from '../public/Games/DefenderChampion/src/core/grid-geometry.js';
import { createPathMetrics } from '../public/Games/DefenderChampion/src/core/path-geometry.js';
import {
  advanceSimulation,
  createSimulation,
  issueCommand,
} from '../public/Games/DefenderChampion/src/core/simulation.js';

const testRoadCellId = 'r1c4';
const testGrassCellId = 'r0c5';
const testRoadProgress = LEVELS[0].pads.find(({ id }) => id === 'l1-pad-a').pathProgress;

const createCombatEnemy = (id, enemyId, overrides = {}) => {
  const config = ENEMIES[enemyId];
  return {
    id,
    enemyId,
    waveIndex: 0,
    spawnTick: 0,
    pathProgress: testRoadProgress,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    armor: config.armor,
    clusterSize: 1,
    castleDamage: config.castleDamage,
    attackDamage: config.attackDamage,
    attackCooldownTicks: config.attackCooldownTicks,
    attackWindupTicks: config.attackWindupTicks,
    attackTargets: config.attackTargets,
    attackState: {
      targetTowerId: null,
      startedAtTick: null,
      impactAtTick: null,
      readyAtTick: 0,
    },
    laneState: 'moving',
    blockingTowerId: null,
    queueIndex: null,
    laneOffset: 0,
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
  const placement = simulation.level.pads.find((pad) => (
    pad.layer === DEFENDERS[defenderId].placementLayer
  ));
  issueCommand(simulation, { type: 'build', defenderId, padId: placement.id });
  // Combat assertions use the fixed road-range fixture; placement validity is covered separately.
  simulation.towers[0].cellId = DEFENDERS[defenderId].placementLayer === 'road'
    ? testRoadCellId
    : testGrassCellId;
  simulation.towers[0].tier = tier;
  simulation.towers[0].attackCount = attackCount;
  simulation.enemies = enemies;
  return simulation;
};

test('combat resolves a cell-based defender position from the grid center', () => {
  const simulation = createSimulation('level-1', { qa: true });
  const defender = DEFENDERS.ranger;
  const cellId = 'r1c5';
  simulation.towers = [{
    id: 'tower-cell',
    defenderId: defender.id,
    cellId,
    placementLayer: defender.placementLayer,
    combatLayer: defender.combatLayer,
    tier: 0,
    health: defender.maxHealth[0],
    maxHealth: defender.maxHealth[0],
    armor: defender.armor[0],
    engagedEnemyIds: [],
    totalInvested: defender.costs[0],
    nextAttackTick: 0,
    attackCount: 0,
  }];
  simulation.enemies = [createCombatEnemy('enemy-1', 'blight-walker', { speed: 0 })];

  stepCombat(simulation);

  assert.deepEqual(simulation.projectiles[0].launchPosition, cellCenter(cellId));
});

test('every enemy has an immutable role-shaped frontline attack profile', () => {
  const expectedProfiles = {
    'blight-walker': [24, 72, 22],
    skitter: [16, 42, 14],
    swarmkin: [12, 54, 16],
    shellguard: [40, 96, 30],
    hexcaller: [18, 90, 28],
    crusher: [78, 108, 34],
    'mossback-brute': [102, 102, 36],
    'ironhide-warlord': [126, 96, 32],
    'dread-colossus': [160, 114, 40],
  };

  for (const [enemyId, enemy] of Object.entries(ENEMIES)) {
    assert.deepEqual(
      [enemy.attackDamage, enemy.attackCooldownTicks, enemy.attackWindupTicks],
      expectedProfiles[enemyId],
    );
    assert.equal(Number.isInteger(enemy.attackDamage) && enemy.attackDamage > 0, true);
    assert.equal(Number.isInteger(enemy.attackCooldownTicks) && enemy.attackCooldownTicks > 0, true);
    assert.equal(Number.isInteger(enemy.attackWindupTicks) && enemy.attackWindupTicks > 0, true);
    assert.deepEqual(enemy.attackTargets, ['frontline']);
    assert.equal(Object.isFrozen(enemy.attackTargets), true);
  }

  assert.equal(ENEMIES.crusher.attackDamage > ENEMIES['blight-walker'].attackDamage, true);
  for (const bossId of ['mossback-brute', 'ironhide-warlord', 'dread-colossus']) {
    assert.equal(ENEMIES[bossId].attackDamage > ENEMIES.crusher.attackDamage, true, bossId);
  }
});

test('enemy hit and defeat events retain the resolved queue presentation fallback', () => {
  const enemy = createCombatEnemy('enemy-queued', 'blight-walker', {
    displayLaneOffset: 28,
    displayPathProgress: 150,
    displayScale: 0.075,
    health: 1,
    laneState: 'queued',
    queueIndex: 5,
  });
  const simulation = createSimulation('level-1', { qa: true });
  simulation.pathMetrics = createPathMetrics(simulation.level.path);
  simulation.enemies = [enemy];

  applyHit(simulation, enemy, {
    armorPierce: 1,
    damage: 10,
    slow: 0,
    stunSeconds: 0,
  });

  const events = simulation.presentationEvents.filter(({ kind }) => (
    kind === 'enemy-hit' || kind === 'enemy-defeated'
  ));
  assert.equal(events.length, 2);
  for (const { payload } of events) {
    assert.deepEqual({
      displayLaneOffset: payload.displayLaneOffset,
      displayPathProgress: payload.displayPathProgress,
      displayScale: payload.displayScale,
      laneState: payload.laneState,
      queueIndex: payload.queueIndex,
    }, {
      displayLaneOffset: 28,
      displayPathProgress: 150,
      displayScale: 0.075,
      laneState: 'queued',
      queueIndex: 5,
    });
  }
});

test('stepCombat starts and impacts an armored frontline on the exact active ticks', () => {
  const enemy = createCombatEnemy('enemy-1', 'blight-walker', {
    health: 1_000,
    maxHealth: 1_000,
    speed: 0,
  });
  const simulation = createTowerCombat('bladeguard', 0, 0, [enemy]);
  const [tower] = simulation.towers;
  tower.nextAttackTick = Number.MAX_SAFE_INTEGER;

  simulation.tick = 0;
  stepCombat(simulation);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: tower.id,
    startedAtTick: 0,
    impactAtTick: 22,
    readyAtTick: 72,
  });
  assert.equal(tower.health, 420);

  for (let tick = 1; tick < 22; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }
  assert.equal(tower.health, 420);

  simulation.tick = 22;
  stepCombat(simulation);
  assert.equal(tower.health, 398);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 72,
  });
  assert.deepEqual(
    simulation.presentationEvents
      .filter(({ kind }) => kind.startsWith('enemy-attack') || kind.startsWith('defender-'))
      .map(({ kind, tick }) => [kind, tick]),
    [
      ['enemy-attack-start', 0],
      ['defender-hit', 22],
      ['enemy-attack-impact', 22],
    ],
  );
});

test('stepCombat cancels a wind-up when the attacker is stunned on its impact tick', () => {
  const enemy = createCombatEnemy('enemy-1', 'blight-walker', {
    health: 1_000,
    maxHealth: 1_000,
    speed: 0,
  });
  const simulation = createTowerCombat('bladeguard', 0, 0, [enemy]);
  const [tower] = simulation.towers;
  tower.nextAttackTick = Number.MAX_SAFE_INTEGER;

  simulation.tick = 0;
  stepCombat(simulation);
  simulation.tick = ENEMIES['blight-walker'].attackWindupTicks;
  enemy.stunnedUntilTick = simulation.tick + 1;
  stepCombat(simulation);

  assert.equal(tower.health, tower.maxHealth);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: ENEMIES['blight-walker'].attackCooldownTicks,
  });
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'enemy-attack-impact'), false);
});

test('a defeated first frontline grants no refund and releases toward the fallback on the next tick', () => {
  const enemy = createCombatEnemy('enemy-1', 'crusher', {
    attackDamage: 500,
    attackCooldownTicks: 10,
    attackWindupTicks: 0,
    health: 10_000,
    maxHealth: 10_000,
    pathProgress: testRoadProgress,
    speed: 60,
  });
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 1_000;
  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-a' });
  issueCommand(simulation, { type: 'build', defenderId: 'ironwarden', padId: 'l1-pad-c' });
  simulation.towers[1].nextAttackTick = Number.MAX_SAFE_INTEGER;
  simulation.enemies = [enemy];
  const coinsBeforeImpact = simulation.coins;

  simulation.tick = 0;
  stepCombat(simulation);
  const stoppedProgress = enemy.pathProgress;
  assert.equal(simulation.towers.some(({ padId }) => padId === 'l1-pad-a'), false);
  assert.equal(simulation.coins, coinsBeforeImpact);
  assert.equal(enemy.blockingTowerId, null);
  assert.equal(enemy.laneReleasedAtTick, 0);

  simulation.tick = 1;
  stepCombat(simulation);
  assert.equal(enemy.blockingTowerId, simulation.towers[0].id);
  assert.equal(enemy.laneState, 'moving');
  assert.equal(enemy.pathProgress > stoppedProgress, true);
});

test('Bladeguard and Ironwarden prefer attackers at their own gate before their role priority', () => {
  for (const defenderId of ['bladeguard', 'ironwarden']) {
    const attacker = createCombatEnemy('enemy-1', 'blight-walker', {
      armor: 0,
      health: 10_000,
      maxHealth: 10_000,
      pathProgress: testRoadProgress,
      speed: 0,
    });
    const other = createCombatEnemy('enemy-2', 'shellguard', {
      armor: 0.9,
      health: 10_000,
      maxHealth: 10_000,
      pathProgress: testRoadProgress + 50,
      speed: 0,
    });
    const simulation = createTowerCombat(defenderId, 0, 0, [attacker, other]);

    simulation.tick = 0;
    stepCombat(simulation);

    const attack = simulation.presentationEvents.find(({ kind }) => kind === 'tower-attack');
    assert.equal(attack.payload.targetId, attacker.id, defenderId);
    assert.equal(attacker.blockingTowerId, simulation.towers[0].id, defenderId);
    assert.equal(other.blockingTowerId, null, defenderId);
  }
});

test('a blocked Hexcaller keeps its exact active-tick support cadence', () => {
  const source = createCombatEnemy('enemy-1', 'hexcaller', {
    health: 10_000,
    maxHealth: 10_000,
    speed: 0,
  });
  const ally = createCombatEnemy('enemy-2', 'blight-walker', {
    health: 10_000,
    maxHealth: 10_000,
    speed: 0,
  });
  const simulation = createTowerCombat('ironwarden', 0, 0, [source, ally]);
  simulation.towers[0].nextAttackTick = Number.MAX_SAFE_INTEGER;

  simulation.tick = 0;
  stepCombat(simulation);
  assert.equal(source.blockingTowerId, simulation.towers[0].id);
  source.abilityActiveTicks = ENEMIES.hexcaller.cooldownTicks;
  source.nextAbilityActiveTick = ENEMIES.hexcaller.cooldownTicks;

  for (let tick = 1; tick <= 181; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }

  assert.deepEqual(
    simulation.presentationEvents
      .filter(({ kind }) => kind === 'hexcaller-cast')
      .map(({ tick }) => tick),
    [1, 181],
  );
  assert.equal(source.laneState, 'attacking');
  assert.equal(simulation.effects.some(({ sourceId }) => sourceId === source.id), true);
});

test('a blocked Dread Colossus keeps boss thresholds and its summons join the same gate queue', () => {
  const boss = createCombatEnemy('enemy-1', 'dread-colossus', {
    health: 10_000,
    maxHealth: 10_000,
    speed: 0,
  });
  const simulation = createTowerCombat('ironwarden', 0, 0, [boss]);
  simulation.towers[0].nextAttackTick = Number.MAX_SAFE_INTEGER;

  simulation.tick = 0;
  stepCombat(simulation);
  assert.equal(boss.laneState, 'attacking');
  boss.health = 7_400;

  for (let tick = 1; tick <= 61; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }

  const summons = simulation.enemies.filter(({ isSummon }) => isSummon);
  assert.equal(summons.length, ENEMIES['dread-colossus'].summonCount);
  assert.equal(summons.every(({ blockingTowerId }) => blockingTowerId === simulation.towers[0].id), true);
  assert.equal(summons.some(({ laneState }) => laneState === 'queued'), true);
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'dread-summon'), true);
});

test('an enemy cannot hit the castle until the tick after defeating the last blocker', () => {
  const enemy = createCombatEnemy('enemy-1', 'blight-walker', {
    attackDamage: 500,
    attackCooldownTicks: 10,
    attackWindupTicks: 0,
    health: 10_000,
    maxHealth: 10_000,
    pathProgress: 1_218,
    speed: 200_000,
  });
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 1_000;
  issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-g' });
  simulation.enemies = [enemy];

  simulation.tick = 0;
  stepCombat(simulation);
  const stoppedProgress = enemy.pathProgress;
  assert.equal(simulation.towers.length, 0);
  assert.equal(simulation.castleHearts, 3);
  assert.equal(enemy.pathProgress, stoppedProgress);
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'castle-impact'), false);

  simulation.tick = 1;
  stepCombat(simulation);
  assert.equal(simulation.castleHearts, 2);
  assert.equal(simulation.enemies.length, 0);
  assert.equal(simulation.presentationEvents.some(({ kind, tick }) => kind === 'castle-impact' && tick === 1), true);
});

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

test('Rune Artificer uses ordinary armor for normal shots and 35 percent pierce only for mastery projectiles', () => {
  const runShot = (attackCount) => {
    const enemy = createCombatEnemy('enemy-1', 'shellguard', {
      health: 1000,
      maxHealth: 1000,
      pathProgress: testRoadProgress,
      speed: 0,
    });
    const simulation = createTowerCombat('rune-artificer', 2, attackCount, [enemy]);

    simulation.tick = 0;
    stepCombat(simulation);
    const launchedProjectiles = simulation.projectiles.map(({ armorPierce, impactTick }) => ({
      armorPierce,
      impactTick,
    }));
    for (let tick = 1; tick <= 12; tick += 1) {
      simulation.tick = tick;
      stepCombat(simulation);
    }

    return {
      damage: 1000 - enemy.health,
      launchedProjectiles,
    };
  };

  assert.deepEqual(runShot(0), {
    damage: 16,
    launchedProjectiles: [{ armorPierce: 0, impactTick: 4 }],
  });
  assert.deepEqual(runShot(3), {
    damage: 58,
    launchedProjectiles: [
      { armorPierce: 0.35, impactTick: 4 },
      { armorPierce: 0.35, impactTick: 12 },
    ],
  });
});

test('Ironhide rally warns for one active second before applying its combat effects exactly once', () => {
  assert.equal(ENEMIES['ironhide-warlord'].rallyTelegraphTicks, 60);
  const boss = createCombatEnemy('enemy-1', 'ironhide-warlord', {
    abilityActiveTicks: ENEMIES['ironhide-warlord'].cooldownTicks,
    nextAbilityActiveTick: ENEMIES['ironhide-warlord'].cooldownTicks,
    speed: 0,
  });
  const ally = createCombatEnemy('enemy-2', 'blight-walker', { speed: 0 });
  const simulation = createTowerCombat('bladeguard', 0, 0, [boss, ally]);
  simulation.towers = [];

  simulation.tick = 0;
  stepCombat(simulation);
  assert.equal(simulation.effects.some(({ kind }) => kind === 'ironhide-rally-telegraph'), true);
  assert.equal(simulation.effects.some(({ kind }) => kind === 'enemy-speed' || kind === 'enemy-armor'), false);
  assert.equal(simulation.presentationEvents.filter(({ kind }) => kind === 'boss-ability-warning').length, 1);
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'ironhide-rally'), false);

  for (let tick = 1; tick < 60; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }
  assert.equal(simulation.effects.some(({ kind }) => kind === 'enemy-speed' || kind === 'enemy-armor'), false);

  simulation.tick = 60;
  stepCombat(simulation);
  assert.equal(simulation.effects.some(({ kind, targetId }) => kind === 'enemy-speed' && targetId === ally.id), true);
  assert.equal(simulation.effects.some(({ kind, targetId }) => kind === 'enemy-armor' && targetId === ally.id), true);
  const eventKinds = simulation.presentationEvents.map(({ kind }) => kind);
  assert.ok(eventKinds.indexOf('boss-ability-warning') < eventKinds.indexOf('boss-ability-impact'));
  assert.ok(eventKinds.indexOf('boss-ability-impact') < eventKinds.indexOf('ironhide-rally'));

  simulation.tick = 61;
  stepCombat(simulation);
  assert.equal(simulation.presentationEvents.filter(({ kind }) => kind === 'ironhide-rally').length, 1);
});

test('Dread threshold summons warn for one active second before insertion without duplicate packs', () => {
  assert.equal(ENEMIES['dread-colossus'].summonTelegraphTicks, 60);
  const maxHealth = 10_000;
  const boss = createCombatEnemy('enemy-1', 'dread-colossus', {
    health: 7_400,
    maxHealth,
    speed: 0,
  });
  const simulation = createTowerCombat('bladeguard', 0, 0, [boss]);
  simulation.towers = [];

  simulation.tick = 0;
  stepCombat(simulation);
  assert.equal(simulation.enemies.length, 1);
  assert.equal(simulation.effects.some(({ kind }) => kind === 'dread-summon-75-telegraph'), true);
  assert.equal(boss.thresholdFlags.summon75, undefined);
  assert.equal(boss.thresholdFlags.summon75Pending, true);

  for (let tick = 1; tick < 60; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }
  assert.equal(simulation.enemies.length, 1);

  simulation.tick = 60;
  stepCombat(simulation);
  assert.equal(simulation.enemies.filter(({ enemyId }) => enemyId === 'swarmkin').length, 6);
  assert.equal(boss.thresholdFlags.summon75, true);
  assert.equal(boss.thresholdFlags.summon75Pending, undefined);
  const eventKinds = simulation.presentationEvents.map(({ kind }) => kind);
  assert.ok(eventKinds.indexOf('boss-ability-warning') < eventKinds.indexOf('boss-ability-impact'));
  assert.ok(eventKinds.indexOf('boss-ability-impact') < eventKinds.indexOf('dread-summon'));

  simulation.tick = 61;
  stepCombat(simulation);
  assert.equal(simulation.enemies.filter(({ enemyId }) => enemyId === 'swarmkin').length, 6);
  assert.equal(simulation.presentationEvents.filter(({ kind }) => kind === 'dread-summon').length, 1);
});
