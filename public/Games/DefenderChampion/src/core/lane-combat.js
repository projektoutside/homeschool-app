import { compareEntitiesById, compareEntityIds } from './entity-id.js';
import { GRID } from './grid-geometry.js';
import { emitPresentationEvent } from './presentation-events.js';
import { MAX_ATTACKERS_PER_GATE, MAX_LIVING_ENEMIES } from './rules.js';

export { MAX_ATTACKERS_PER_GATE, MAX_LIVING_ENEMIES };
const DEFAULT_ATTACK_TARGETS = Object.freeze(['frontline']);
const ATTACKER_OFFSETS = Object.freeze([-40, 40, 0]);
const QUEUE_OFFSETS = Object.freeze([-40, 40]);
const ATTACK_CONTACT_PROGRESS = 28;
const QUEUE_SPACING = 48;
export const QUEUE_PRESENTATION_FOOTPRINT = 80;
export const MAX_QUEUE_OVERLAP_RATIO = 1 / 3;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isLiving = (entity) => entity && entity.health > 0;
const isStunned = (simulation, enemy) => (enemy.stunnedUntilTick ?? 0) > simulation.tick;

const getCellTerrain = (simulation, tower) => simulation.level.cells
  ?.find(({ id }) => id === tower.cellId)?.terrain ?? null;

export const getGateProgress = (level, cellId) => {
  const roadIndex = level?.roadCells?.indexOf(cellId) ?? -1;
  return roadIndex < 0 ? Number.NaN : roadIndex * GRID.cellSize;
};

const createIdleAttackState = (readyAtTick = 0) => ({
  targetTowerId: null,
  startedAtTick: null,
  impactAtTick: null,
  readyAtTick,
});

const clearActiveAttack = (enemy, readyAtTick = enemy.attackState?.readyAtTick ?? 0) => {
  enemy.attackState = createIdleAttackState(readyAtTick);
};

const compareGateCandidates = (first, second) => (
  second.pathProgress - first.pathProgress
  || first.spawnTick - second.spawnTick
  || compareEntityIds(first.id, second.id)
);

export const createQueuePresentationLayout = ({
  gatePathProgress,
  minimumPathProgress = 0,
  queueCount,
} = {}) => {
  const count = Number.isInteger(queueCount) && queueCount > 0 ? queueCount : 0;
  if (count === 0) return Object.freeze([]);
  const gateProgress = Math.max(0, Number(gatePathProgress) || 0);
  const minimumProgress = Math.max(0, Number(minimumPathProgress) || 0);
  const desiredProgress = (index) => (
    gateProgress - ATTACK_CONTACT_PROGRESS - ((index + 1) * QUEUE_SPACING)
  );
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    laneOffset: QUEUE_OFFSETS[index % QUEUE_OFFSETS.length],
    pathProgress: Math.max(minimumProgress, desiredProgress(index)),
    scale: 1,
  })));
};

export const selectAttackersForGate = (enemies, gate, limit) => {
  const count = Number.isInteger(limit) && limit > 0 ? limit : 0;
  return enemies
    .filter((enemy) => isLiving(enemy) && (
      enemy.pathProgress <= gate.pathProgress || enemy.blockingTowerId === gate.towerId
    ))
    .sort(compareGateCandidates)
    .slice(0, count);
};

const getLivingGates = (simulation) => simulation.towers
  .filter((tower) => {
    const pathProgress = getGateProgress(simulation.level, tower.cellId);
    return isLiving(tower)
      && tower.combatLayer === 'frontline'
      && tower.placementLayer === 'road'
      && getCellTerrain(simulation, tower) === 'road'
      && Number.isFinite(pathProgress);
  })
  .map((tower) => ({
    tower,
    towerId: tower.id,
    pathProgress: getGateProgress(simulation.level, tower.cellId),
    attackerIds: [],
    queuedIds: [],
  }))
  .sort((first, second) => (
    first.pathProgress - second.pathProgress
    || compareEntityIds(first.towerId, second.towerId)
  ));

export const getFirstLivingGateProgress = (simulation) => (
  getLivingGates(simulation)[0]?.pathProgress ?? null
);

export const deriveReadableSpawnCapacity = (simulation) => {
  const firstGate = getLivingGates(simulation)[0];
  if (!firstGate) return MAX_LIVING_ENEMIES;
  const completeUpstreamRoadCells = Math.floor(firstGate.pathProgress / GRID.cellSize);
  return Math.max(
    MAX_ATTACKERS_PER_GATE,
    Math.min(MAX_LIVING_ENEMIES, MAX_ATTACKERS_PER_GATE + completeUpstreamRoadCells),
  );
};

const setMoving = (enemy, { preserveOffset = false } = {}) => {
  enemy.laneState = 'moving';
  enemy.blockingTowerId = null;
  enemy.queueIndex = null;
  if (!preserveOffset) enemy.laneOffset = Number(enemy.entranceLaneOffset) || 0;
  enemy.displayPathProgress = enemy.pathProgress;
  enemy.displayLaneOffset = enemy.laneOffset;
  enemy.displayScale = 1;
};

const assignAttackerSlot = (enemy, gate, index) => {
  const targetProgress = Math.max(0, gate.pathProgress - ATTACK_CONTACT_PROGRESS - (index * 2));
  enemy.blockingTowerId = gate.towerId;
  enemy.queueIndex = null;
  enemy.laneOffset = ATTACKER_OFFSETS[index];
  if (enemy.pathProgress >= targetProgress) {
    enemy.pathProgress = targetProgress;
    enemy.laneState = 'attacking';
  } else {
    enemy.laneState = 'moving';
  }
  enemy.displayPathProgress = enemy.pathProgress;
  enemy.displayLaneOffset = enemy.laneOffset;
  enemy.displayScale = 1;
};

const assignQueueSlot = (enemy, gate, queueIndex, displaySlot, minimumPathProgress) => {
  const targetProgress = Math.max(
    minimumPathProgress,
    gate.pathProgress - ATTACK_CONTACT_PROGRESS - ((queueIndex + 1) * QUEUE_SPACING),
  );
  enemy.blockingTowerId = gate.towerId;
  enemy.queueIndex = queueIndex;
  enemy.laneOffset = displaySlot.laneOffset;
  if (enemy.pathProgress >= targetProgress) {
    enemy.pathProgress = targetProgress;
    enemy.laneState = 'queued';
  } else {
    enemy.laneState = 'moving';
  }
  enemy.displayPathProgress = enemy.laneState === 'queued'
    ? displaySlot.pathProgress
    : enemy.pathProgress;
  enemy.displayLaneOffset = displaySlot.laneOffset;
  enemy.displayScale = displaySlot.scale;
};

export const assignLanePositions = (simulation) => {
  const gates = getLivingGates(simulation);
  const candidatesByTowerId = new Map(gates.map(({ towerId }) => [towerId, []]));

  for (const tower of simulation.towers) tower.engagedEnemyIds = [];
  for (const enemy of simulation.enemies) {
    if (!isLiving(enemy)) {
      setMoving(enemy);
      continue;
    }
    if (enemy.laneReleasedAtTick === simulation.tick) {
      setMoving(enemy, { preserveOffset: true });
      continue;
    }
    const reservedGate = gates.find(({ towerId }) => towerId === enemy.blockingTowerId);
    const nextGate = gates.find((candidate) => candidate.pathProgress >= enemy.pathProgress);
    const gate = reservedGate && enemy.pathProgress > reservedGate.pathProgress
      ? reservedGate
      : nextGate ?? reservedGate;
    if (!gate) {
      setMoving(enemy);
      continue;
    }
    candidatesByTowerId.get(gate.towerId).push(enemy);
  }

  for (const [gateIndex, gate] of gates.entries()) {
    const candidates = candidatesByTowerId.get(gate.towerId);
    const attackers = selectAttackersForGate(candidates, gate, MAX_ATTACKERS_PER_GATE);
    const attackerIds = new Set(attackers.map(({ id }) => id));
    const queued = candidates.filter(({ id }) => !attackerIds.has(id)).sort(compareGateCandidates);
    gate.attackerIds = attackers.map(({ id }) => id);
    gate.queuedIds = queued.map(({ id }) => id);
    gate.tower.engagedEnemyIds = [...gate.attackerIds];
    attackers.forEach((enemy, index) => assignAttackerSlot(enemy, gate, index));
    const minimumPathProgress = gateIndex === 0 ? 0 : gates[gateIndex - 1].pathProgress + 1;
    const queuePresentation = createQueuePresentationLayout({
      gatePathProgress: gate.pathProgress,
      minimumPathProgress,
      queueCount: queued.length,
    });
    queued.forEach((enemy, index) => assignQueueSlot(
      enemy,
      gate,
      index,
      queuePresentation[index],
      minimumPathProgress,
    ));
  }

  const currentMaximum = simulation.towers
    .filter(isLiving)
    .reduce((maximum, tower) => Math.max(maximum, tower.engagedEnemyIds.length), 0);
  simulation.maximumConcurrentAttackers = Math.max(
    simulation.maximumConcurrentAttackers ?? 0,
    currentMaximum,
  );

  return {
    gates: gates.map(({ tower, ...gate }) => gate),
  };
};

export const selectEnemyAttackTarget = (simulation, enemy, combatLayer) => {
  const attackTargets = enemy.attackTargets ?? DEFAULT_ATTACK_TARGETS;
  if (!attackTargets.includes(combatLayer)) return null;
  const placementLayer = combatLayer === 'frontline' ? 'road' : 'grass';
  const candidates = simulation.towers
    .filter((tower) => {
      return isLiving(tower)
        && tower.combatLayer === combatLayer
        && tower.placementLayer === placementLayer
        && getCellTerrain(simulation, tower) === placementLayer;
    })
    .sort(compareEntitiesById);
  if (combatLayer === 'frontline') {
    return candidates.find(({ id }) => id === enemy.blockingTowerId) ?? null;
  }
  return candidates[0] ?? null;
};

const defenderDamageAfterArmor = (amount, armor) => {
  if (!(amount > 0)) return 0;
  const reduction = clamp(Number(armor) || 0, 0, 1);
  return Math.max(1, Math.round(amount * (1 - reduction)));
};

export const applyDefenderDamage = (simulation, tower, amount, source = null) => {
  if (!isLiving(tower) || !simulation.towers.some(({ id }) => id === tower.id)) return 0;
  const damage = defenderDamageAfterArmor(amount, tower.armor);
  if (damage === 0) return 0;
  tower.health = Math.max(0, tower.health - damage);
  const sourceId = typeof source === 'string' ? source : source?.id ?? null;

  if (tower.health > 0) {
    emitPresentationEvent(simulation, 'defender-hit', {
      damage,
      remainingHealth: tower.health,
      sourceId,
      towerId: tower.id,
    });
    return damage;
  }

  tower.defeated = true;
  emitPresentationEvent(simulation, 'defender-defeated', {
    damage,
    sourceId,
    towerId: tower.id,
  });
  simulation.towers = simulation.towers.filter(({ id }) => id !== tower.id);
  simulation.effects = simulation.effects.filter(({ targetId }) => targetId !== tower.id);
  simulation.projectiles = simulation.projectiles.filter(
    ({ sourceTowerId }) => sourceTowerId !== tower.id,
  );

  for (const enemy of simulation.enemies) {
    const blockedByTower = enemy.blockingTowerId === tower.id;
    const targetedTower = enemy.attackState?.targetTowerId === tower.id;
    if (!blockedByTower && !targetedTower) continue;
    if (targetedTower) clearActiveAttack(enemy);
    if (blockedByTower) {
      enemy.blockingTowerId = null;
      enemy.queueIndex = null;
      enemy.laneState = 'moving';
      enemy.laneReleasedAtTick = simulation.tick;
    }
  }
  return damage;
};

const isSameValidGateTarget = (simulation, enemy, tower) => (
  isLiving(enemy)
  && enemy.laneState === 'attacking'
  && enemy.blockingTowerId === tower?.id
  && selectEnemyAttackTarget(simulation, enemy, 'frontline')?.id === tower.id
);

const startEnemyAttack = (simulation, enemy, target) => {
  const startedAtTick = simulation.tick;
  const impactAtTick = startedAtTick + Math.max(0, Math.trunc(enemy.attackWindupTicks));
  const readyAtTick = startedAtTick + Math.max(1, Math.trunc(enemy.attackCooldownTicks));
  enemy.attackState = {
    targetTowerId: target.id,
    startedAtTick,
    impactAtTick,
    readyAtTick,
  };
  emitPresentationEvent(simulation, 'enemy-attack-start', {
    enemyId: enemy.enemyId,
    id: enemy.id,
    impactAtTick,
    targetTowerId: target.id,
  });
};

const resolveEnemyImpact = (simulation, enemy) => {
  const attackState = enemy.attackState;
  const tower = simulation.towers.find(({ id }) => id === attackState.targetTowerId);
  if (isStunned(simulation, enemy) || !isSameValidGateTarget(simulation, enemy, tower)) {
    clearActiveAttack(enemy, attackState.readyAtTick);
    return;
  }
  const damage = applyDefenderDamage(simulation, tower, enemy.attackDamage, enemy);
  emitPresentationEvent(simulation, 'enemy-attack-impact', {
    damage,
    enemyId: enemy.enemyId,
    id: enemy.id,
    remainingHealth: tower.health,
    targetTowerId: tower.id,
  });
  clearActiveAttack(enemy, attackState.readyAtTick);
};

export const advanceEnemyAttacks = (simulation) => {
  const enemies = [...simulation.enemies].sort(compareEntitiesById);
  for (const enemy of enemies) {
    const activeAttack = enemy.attackState?.targetTowerId !== null
      && enemy.attackState?.targetTowerId !== undefined;
    if (activeAttack) {
      if (simulation.tick === enemy.attackState.impactAtTick) resolveEnemyImpact(simulation, enemy);
      else if (simulation.tick > enemy.attackState.impactAtTick) clearActiveAttack(enemy);
      continue;
    }
    const readyAtTick = enemy.attackState?.readyAtTick ?? 0;
    if (!isLiving(enemy)
      || enemy.laneState !== 'attacking'
      || isStunned(simulation, enemy)
      || simulation.tick < readyAtTick) continue;
    const target = selectEnemyAttackTarget(simulation, enemy, 'frontline');
    if (!target) continue;
    startEnemyAttack(simulation, enemy, target);
    if (enemy.attackState.impactAtTick === simulation.tick) resolveEnemyImpact(simulation, enemy);
  }
};
