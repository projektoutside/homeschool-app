import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceEnemyAttacks,
  applyDefenderDamage,
  assignLanePositions,
  createQueuePresentationLayout,
  selectAttackersForGate,
  selectEnemyAttackTarget,
} from '../public/Games/DefenderChampion/src/core/lane-combat.js';
import {
  createPathMetrics,
  samplePathProgress,
} from '../public/Games/DefenderChampion/src/core/path-geometry.js';

const roadPad = (id, pathProgress) => ({ id, layer: 'road', pathProgress });
const grassPad = (id, x, y) => ({ id, layer: 'grass', x, y });

const createTower = ({
  id,
  padId,
  combatLayer = 'frontline',
  health = 100,
  armor = 0,
}) => ({
  id,
  padId,
  placementLayer: combatLayer === 'frontline' ? 'road' : 'grass',
  combatLayer,
  health,
  maxHealth: health,
  armor,
  engagedEnemyIds: [],
});

const createEnemy = ({
  id,
  pathProgress,
  spawnTick = 0,
  attackDamage = 10,
  attackCooldownTicks = 12,
  attackWindupTicks = 3,
  attackTargets = ['frontline'],
}) => ({
  id,
  enemyId: 'test-enemy',
  pathProgress,
  spawnTick,
  health: 20,
  maxHealth: 20,
  attackDamage,
  attackCooldownTicks,
  attackWindupTicks,
  attackTargets,
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
});

const createSimulation = ({ towers, enemies, tick = 0 } = {}) => ({
  tick,
  coins: 75,
  level: {
    pads: [
      roadPad('road-a', 100),
      roadPad('road-b', 200),
      grassPad('grass-a', 32, 48),
    ],
  },
  towers: towers ?? [
    createTower({ id: 'tower-1', padId: 'road-a' }),
    createTower({ id: 'tower-2', padId: 'road-b' }),
  ],
  enemies: enemies ?? [],
  projectiles: [],
  effects: [],
  presentationEvents: [],
  nextPresentationEventId: 1,
});

test('a living road defender stops the whole lane with three attackers and a stable queue', () => {
  const simulation = createSimulation({
    enemies: [
      createEnemy({ id: 'enemy-1', pathProgress: 94, spawnTick: 5 }),
      createEnemy({ id: 'enemy-2', pathProgress: 95, spawnTick: 4 }),
      createEnemy({ id: 'enemy-3', pathProgress: 96, spawnTick: 3 }),
      createEnemy({ id: 'enemy-4', pathProgress: 97, spawnTick: 2 }),
      createEnemy({ id: 'enemy-5', pathProgress: 98, spawnTick: 1 }),
      createEnemy({ id: 'enemy-6', pathProgress: 99, spawnTick: 0 }),
    ],
  });

  const state = assignLanePositions(simulation);
  const [firstGate] = state.gates;

  assert.deepEqual(state.gates.map(({ towerId }) => towerId), ['tower-1', 'tower-2']);
  assert.deepEqual(firstGate.attackerIds, ['enemy-6', 'enemy-5', 'enemy-4']);
  assert.deepEqual(firstGate.queuedIds, ['enemy-3', 'enemy-2', 'enemy-1']);
  assert.equal(simulation.enemies.every((enemy) => enemy.pathProgress <= firstGate.pathProgress), true);
  assert.deepEqual(simulation.towers[0].engagedEnemyIds, ['enemy-6', 'enemy-5', 'enemy-4']);
  assert.deepEqual(
    simulation.enemies.filter(({ laneState }) => laneState === 'attacking').map(({ id }) => id),
    ['enemy-4', 'enemy-5', 'enemy-6'],
  );
  assert.deepEqual(
    simulation.enemies.filter(({ laneState }) => laneState === 'queued').map(({ id, queueIndex }) => ({ id, queueIndex })),
    [
      { id: 'enemy-1', queueIndex: 2 },
      { id: 'enemy-2', queueIndex: 1 },
      { id: 'enemy-3', queueIndex: 0 },
    ],
  );
  assert.equal(simulation.enemies.every(({ blockingTowerId }) => blockingTowerId === 'tower-1'), true);
  assert.equal(simulation.enemies.every(({ laneOffset }) => Number.isFinite(laneOffset)), true);
  assert.equal(simulation.enemies.every(({ laneOffset }) => Math.abs(laneOffset) <= 56), true);
});

test('a 160-enemy gate gets stable unique road-safe presentation slots without entrance collapse', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 200 },
    { x: 200, y: 200 },
  ];
  const metrics = createPathMetrics(path);
  const enemies = Array.from({ length: 160 }, (_, index) => createEnemy({
    id: `enemy-${index + 1}`,
    pathProgress: 259,
    spawnTick: index,
  }));
  const simulation = createSimulation({
    towers: [createTower({ id: 'tower-1', padId: 'road-a' })],
    enemies,
  });
  simulation.level.pads[0].pathProgress = 260;

  const state = assignLanePositions(simulation);
  const gate = state.gates[0];
  const queued = simulation.enemies
    .filter(({ laneState }) => laneState === 'queued')
    .sort((first, second) => first.queueIndex - second.queueIndex);

  assert.equal(gate.attackerIds.length, 3);
  assert.equal(queued.length, 157);
  assert.equal(simulation.enemies.every(({ pathProgress }) => pathProgress < gate.pathProgress), true);
  assert.deepEqual(queued.map(({ id }) => id), gate.queuedIds);
  assert.equal(queued.every(({ displayLaneOffset }) => displayLaneOffset === 0), true);
  assert.equal(queued.every(({ displayScale }) => displayScale > 0 && displayScale <= 1), true);
  assert.equal(queued.every((enemy, index) => (
    index === 0 || enemy.displayPathProgress < queued[index - 1].displayPathProgress
  )), true);
  assert.equal(queued.at(-1).displayPathProgress > 0, true, 'the final sprite does not collapse onto the entrance cap');

  const positions = queued.map(({ displayPathProgress }) => (
    samplePathProgress(metrics, displayPathProgress)
  ));
  assert.equal(new Set(positions.map(({ x, y }) => `${x.toFixed(9)},${y.toFixed(9)}`)).size, queued.length);

  const layout = createQueuePresentationLayout({ gatePathProgress: 260, queueCount: 157 });
  assert.deepEqual(layout, queued.map(({ displayLaneOffset, displayPathProgress, displayScale }) => ({
    laneOffset: displayLaneOffset,
    pathProgress: displayPathProgress,
    scale: displayScale,
  })));
});

test('separate living gates reserve disjoint presentation intervals for their queues', () => {
  const first = createQueuePresentationLayout({ gatePathProgress: 260, queueCount: 24 });
  const second = createQueuePresentationLayout({
    gatePathProgress: 520,
    minimumPathProgress: 261,
    queueCount: 24,
  });
  assert.equal(first.every(({ pathProgress }) => pathProgress < 260), true);
  assert.equal(second.every(({ pathProgress }) => pathProgress > 260 && pathProgress < 520), true);
  assert.equal(new Set([...first, ...second].map(({ pathProgress }) => pathProgress.toFixed(12))).size, 48);
});

test('gate and attacker ties use numeric entity IDs without mutating the candidate list', () => {
  const candidates = [
    createEnemy({ id: 'enemy-10', pathProgress: 90, spawnTick: 4 }),
    createEnemy({ id: 'enemy-2', pathProgress: 90, spawnTick: 4 }),
    createEnemy({ id: 'enemy-1', pathProgress: 90, spawnTick: 4 }),
  ];
  const originalOrder = candidates.map(({ id }) => id);

  assert.deepEqual(
    selectAttackersForGate(candidates, { towerId: 'tower-1', pathProgress: 100 }, 3).map(({ id }) => id),
    ['enemy-1', 'enemy-2', 'enemy-10'],
  );
  assert.deepEqual(candidates.map(({ id }) => id), originalOrder);

  const simulation = createSimulation({
    towers: [
      createTower({ id: 'tower-10', padId: 'road-a' }),
      createTower({ id: 'tower-2', padId: 'road-a' }),
    ],
    enemies: [],
  });
  assert.deepEqual(assignLanePositions(simulation).gates.map(({ towerId }) => towerId), ['tower-2', 'tower-10']);
});

test('an enemy moves toward its reserved contact slot before it may start an attack', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 10 });
  const simulation = createSimulation({
    towers: [createTower({ id: 'tower-1', padId: 'road-a' })],
    enemies: [enemy],
  });

  const state = assignLanePositions(simulation);
  advanceEnemyAttacks(simulation);

  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.equal(enemy.blockingTowerId, 'tower-1');
  assert.equal(enemy.laneState, 'moving');
  assert.equal(enemy.pathProgress, 10);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 0,
  });
});

test('a moving enemy cannot bypass its reserved living gate by overshooting the contact slot', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 10 });
  const simulation = createSimulation({ enemies: [enemy] });
  assignLanePositions(simulation);
  assert.equal(enemy.blockingTowerId, 'tower-1');

  enemy.pathProgress = 105;
  const state = assignLanePositions(simulation);

  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.deepEqual(state.gates[1].attackerIds, []);
  assert.equal(enemy.blockingTowerId, 'tower-1');
  assert.equal(enemy.laneState, 'attacking');
  assert.equal(enemy.pathProgress < 100, true);
});

test('a newly built nearer gate supersedes a farther reservation before the enemy reaches it', () => {
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 100 });
  const fartherTower = createTower({ id: 'tower-2', padId: 'road-b' });
  const simulation = createSimulation({ towers: [fartherTower], enemies: [enemy] });
  assignLanePositions(simulation);
  assert.equal(enemy.blockingTowerId, 'tower-2');

  simulation.level.pads.push(roadPad('road-middle', 150));
  simulation.towers.push(createTower({ id: 'tower-3', padId: 'road-middle' }));
  const state = assignLanePositions(simulation);

  assert.deepEqual(state.gates.map(({ towerId }) => towerId), ['tower-3', 'tower-2']);
  assert.deepEqual(state.gates[0].attackerIds, ['enemy-1']);
  assert.deepEqual(state.gates[1].attackerIds, []);
  assert.equal(enemy.blockingTowerId, 'tower-3');
});

test('enemy attacks use exact active ticks and a stun at impact cancels the same target', () => {
  const tower = createTower({ id: 'tower-1', padId: 'road-a', health: 40, armor: 0.5 });
  const enemy = createEnemy({
    id: 'enemy-1',
    pathProgress: 100,
    attackDamage: 7,
    attackCooldownTicks: 6,
    attackWindupTicks: 2,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 10 });
  assignLanePositions(simulation);

  advanceEnemyAttacks(simulation);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: 'tower-1',
    startedAtTick: 10,
    impactAtTick: 12,
    readyAtTick: 16,
  });
  assert.equal(simulation.presentationEvents.at(-1).kind, 'enemy-attack-start');

  simulation.tick = 11;
  advanceEnemyAttacks(simulation);
  assert.equal(tower.health, 40);

  simulation.tick = 12;
  enemy.stunnedUntilTick = 13;
  advanceEnemyAttacks(simulation);
  assert.equal(tower.health, 40);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 16,
  });
  assert.equal(simulation.presentationEvents.some(({ kind }) => kind === 'enemy-attack-impact'), false);
});

test('a zero-windup attack resolves once in its start tick with stable event order and cooldown', () => {
  const tower = createTower({ id: 'tower-1', padId: 'road-a', health: 10 });
  const enemy = createEnemy({
    id: 'enemy-1', pathProgress: 100, attackDamage: 4, attackCooldownTicks: 6, attackWindupTicks: 0,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 20 });
  assignLanePositions(simulation);

  advanceEnemyAttacks(simulation);
  advanceEnemyAttacks(simulation);

  assert.equal(tower.health, 6);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 26,
  });
  assert.deepEqual(
    simulation.presentationEvents.map(({ kind }) => kind),
    ['enemy-attack-start', 'defender-hit', 'enemy-attack-impact'],
  );
});

test('a valid impact applies defender armor with a minimum of one damage', () => {
  const tower = createTower({ id: 'tower-1', padId: 'road-a', health: 10, armor: 0.99 });
  const enemy = createEnemy({
    id: 'enemy-1', pathProgress: 100, attackDamage: 1, attackCooldownTicks: 6, attackWindupTicks: 1,
  });
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 20 });
  assignLanePositions(simulation);
  advanceEnemyAttacks(simulation);

  simulation.tick = 21;
  advanceEnemyAttacks(simulation);

  assert.equal(tower.health, 9);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 26,
  });
  assert.deepEqual(
    simulation.presentationEvents.map(({ kind }) => kind),
    ['enemy-attack-start', 'defender-hit', 'enemy-attack-impact'],
  );
});

test('permanent defender defeat removes owned combat state without refund or duplicate events', () => {
  const tower = createTower({ id: 'tower-1', padId: 'road-a', health: 3 });
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 82 });
  enemy.laneState = 'attacking';
  enemy.blockingTowerId = tower.id;
  enemy.queueIndex = null;
  enemy.laneOffset = -24;
  enemy.attackState = {
    targetTowerId: tower.id,
    startedAtTick: 4,
    impactAtTick: 6,
    readyAtTick: 16,
  };
  tower.engagedEnemyIds = [enemy.id];
  const simulation = createSimulation({ towers: [tower], enemies: [enemy], tick: 6 });
  simulation.effects = [
    { id: 'effect-1', sourceId: 'tower-2', targetId: tower.id, kind: 'tower-attack-speed' },
    { id: 'effect-2', sourceId: tower.id, targetId: 'enemy-1', kind: 'enemy-slow' },
  ];
  simulation.projectiles = [
    { id: 'projectile-1', sourceTowerId: tower.id, targetId: 'enemy-1' },
    { id: 'projectile-2', sourceTowerId: 'tower-2', targetId: 'enemy-1' },
  ];
  const positionBeforeDefeat = enemy.pathProgress;

  assert.equal(applyDefenderDamage(simulation, tower, 3, enemy), 3);
  assert.equal(applyDefenderDamage(simulation, tower, 3, enemy), 0);

  assert.equal(simulation.coins, 75);
  assert.deepEqual(simulation.towers, []);
  assert.deepEqual(simulation.effects.map(({ id }) => id), ['effect-2']);
  assert.deepEqual(simulation.projectiles.map(({ id }) => id), ['projectile-2']);
  assert.equal(enemy.pathProgress, positionBeforeDefeat);
  assert.equal(enemy.blockingTowerId, null);
  assert.equal(enemy.queueIndex, null);
  assert.equal(enemy.laneState, 'moving');
  assert.equal(enemy.laneReleasedAtTick, 6);
  assert.deepEqual(enemy.attackState, {
    targetTowerId: null,
    startedAtTick: null,
    impactAtTick: null,
    readyAtTick: 16,
  });
  assert.deepEqual(simulation.presentationEvents.map(({ kind }) => kind), ['defender-defeated']);
});

test('a defeated first gate preserves positions this tick and releases toward the fallback gate next tick', () => {
  const firstTower = createTower({ id: 'tower-1', padId: 'road-a', health: 1 });
  const secondTower = createTower({ id: 'tower-2', padId: 'road-b' });
  const enemy = createEnemy({ id: 'enemy-1', pathProgress: 99 });
  const simulation = createSimulation({ towers: [firstTower, secondTower], enemies: [enemy], tick: 30 });
  assignLanePositions(simulation);
  const stoppedProgress = enemy.pathProgress;

  applyDefenderDamage(simulation, firstTower, 1, enemy);
  const sameTickState = assignLanePositions(simulation);
  assert.equal(enemy.pathProgress, stoppedProgress);
  assert.equal(enemy.blockingTowerId, null);
  assert.deepEqual(sameTickState.gates[0].attackerIds, []);

  simulation.tick = 31;
  const nextTickState = assignLanePositions(simulation);
  assert.equal(enemy.pathProgress, stoppedProgress);
  assert.equal(enemy.blockingTowerId, 'tower-2');
  assert.equal(enemy.laneState, 'moving');
  assert.deepEqual(nextTickState.gates[0].attackerIds, ['enemy-1']);
});

test('attack target capabilities allow a future backline enemy without widening ordinary targeting', () => {
  const frontline = createTower({ id: 'tower-1', padId: 'road-a' });
  const backline = createTower({ id: 'tower-2', padId: 'grass-a', combatLayer: 'backline' });
  const ordinary = createEnemy({ id: 'enemy-1', pathProgress: 100, attackTargets: ['frontline'] });
  ordinary.laneState = 'attacking';
  ordinary.blockingTowerId = frontline.id;
  const futureMage = createEnemy({ id: 'enemy-2', pathProgress: 80, attackTargets: ['backline'] });
  const simulation = createSimulation({ towers: [frontline, backline], enemies: [ordinary, futureMage] });

  assert.equal(selectEnemyAttackTarget(simulation, ordinary, 'frontline'), frontline);
  assert.equal(selectEnemyAttackTarget(simulation, ordinary, 'backline'), null);
  assert.equal(selectEnemyAttackTarget(simulation, futureMage, 'frontline'), null);
  assert.equal(selectEnemyAttackTarget(simulation, futureMage, 'backline'), backline);
});

test('a missing attackTargets profile defaults to frontline-only targeting', () => {
  const frontline = createTower({ id: 'tower-1', padId: 'road-a' });
  const backline = createTower({ id: 'tower-2', padId: 'grass-a', combatLayer: 'backline' });
  const productionEnemy = createEnemy({ id: 'enemy-1', pathProgress: 100 });
  delete productionEnemy.attackTargets;
  productionEnemy.laneState = 'attacking';
  productionEnemy.blockingTowerId = frontline.id;
  const simulation = createSimulation({ towers: [frontline, backline], enemies: [productionEnemy] });

  assert.equal(selectEnemyAttackTarget(simulation, productionEnemy, 'frontline'), frontline);
  assert.equal(selectEnemyAttackTarget(simulation, productionEnemy, 'backline'), null);
});
