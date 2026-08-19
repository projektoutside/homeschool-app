import { DEFENDERS } from '../config/defenders.js';
import { getLevel } from '../config/levels.js';
import { REFERENCE_STRATEGIES } from '../config/reference-strategies.js';
import { getBuildCost, getSellRefund, getUpgradeCost } from './economy.js';
import { compareEntityIds } from './entity-id.js';
import { createWaveController, spawnScheduledEnemies } from './wave-controller.js';
import { stepCombat } from './combat.js';
import { calculateBattleResult } from './scoring.js';
import {
  emitPresentationEvent,
  snapshotPresentationEvents,
} from './presentation-events.js';

export { clearPresentationEvents } from './presentation-events.js';

const MAX_STRATEGY_TICKS = 60 * 720;
const accepted = () => ({ accepted: true, reason: null });
const rejected = (reason) => ({ accepted: false, reason });

export const createSimulation = (levelId, options = {}) => {
  const level = getLevel(levelId);
  return {
    version: 1,
    levelId,
    level,
    tick: 0,
    timeScale: 1,
    pauseReasons: new Set(),
    coins: level.startingCoins,
    bountyCoinsEarned: 0,
    score: 0,
    castleHearts: level.castleHearts,
    nextEntityId: 1,
    waveIndex: -1,
    spawnedAllWaves: false,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    terminal: false,
    outcome: null,
    qa: options.qa === true,
    seed: options.seed ?? 0,
    waveSchedule: createWaveController(level),
    nextSpawnIndex: 0,
    waveCompletionFlags: {},
    waveStartedFlags: {},
    pathMetrics: null,
    medal: null,
    purchaseHistory: [],
    nextPresentationEventId: 1,
    presentationEvents: [],
  };
};

const findTower = (simulation, towerId) => simulation.towers.find((tower) => tower.id === towerId);

const buildTower = (simulation, command) => {
  const defender = DEFENDERS[command.defenderId];
  if (!defender) return rejected('invalid-defender');
  const placement = simulation.level.pads.find(({ id }) => id === command.padId);
  if (!placement) return rejected('invalid-pad');
  if (placement.layer !== defender.placementLayer) return rejected('placement-layer-mismatch');
  if (simulation.towers.some((tower) => tower.padId === command.padId)) return rejected('pad-occupied');
  const cost = getBuildCost(defender);
  if (simulation.coins < cost) return rejected('insufficient-coins');

  simulation.coins -= cost;
  const tower = {
    id: `tower-${simulation.nextEntityId++}`,
    defenderId: defender.id,
    padId: command.padId,
    placementLayer: defender.placementLayer,
    combatLayer: defender.combatLayer,
    tier: 0,
    health: defender.maxHealth[0],
    maxHealth: defender.maxHealth[0],
    armor: defender.armor[0],
    engagedEnemyIds: [],
    totalInvested: cost,
    nextAttackTick: simulation.tick,
    attackCount: 0,
  };
  simulation.towers.push(tower);
  simulation.purchaseHistory.push({
    tick: simulation.tick,
    type: 'build',
    towerId: tower.id,
    defenderId: tower.defenderId,
    padId: tower.padId,
    cost,
  });
  return accepted();
};

const upgradeTower = (simulation, towerId) => {
  const tower = findTower(simulation, towerId);
  if (!tower) return rejected('missing-tower');
  const defender = DEFENDERS[tower.defenderId];
  const cost = getUpgradeCost(tower, defender);
  if (cost === null) return rejected('max-tier');
  if (simulation.coins < cost) return rejected('insufficient-coins');

  simulation.coins -= cost;
  const previousMaxHealth = tower.maxHealth;
  tower.tier += 1;
  tower.maxHealth = defender.maxHealth[tower.tier];
  tower.health += tower.maxHealth - previousMaxHealth;
  tower.armor = defender.armor[tower.tier];
  tower.totalInvested += cost;
  simulation.purchaseHistory.push({
    tick: simulation.tick,
    type: 'upgrade',
    towerId: tower.id,
    defenderId: tower.defenderId,
    padId: tower.padId,
    tier: tower.tier,
    cost,
  });
  return accepted();
};

const sellTower = (simulation, towerId) => {
  const towerIndex = simulation.towers.findIndex((tower) => tower.id === towerId);
  if (towerIndex === -1) return rejected('missing-tower');
  const tower = simulation.towers[towerIndex];
  if (tower.combatLayer === 'frontline' && tower.engagedEnemyIds.length > 0) {
    return rejected('defender-engaged');
  }
  simulation.towers.splice(towerIndex, 1);
  simulation.coins += getSellRefund(tower);
  return accepted();
};

export const issueCommand = (simulation, command) => {
  if (!command || typeof command.type !== 'string') return rejected('invalid-command');
  if (simulation.terminal) return rejected('battle-terminal');
  switch (command.type) {
    case 'build':
      return buildTower(simulation, command);
    case 'upgrade':
      return upgradeTower(simulation, command.towerId);
    case 'sell':
      return sellTower(simulation, command.towerId);
    case 'set-speed':
      if (command.value !== 1 && command.value !== 2) return rejected('invalid-speed');
      simulation.timeScale = command.value;
      return accepted();
    case 'set-pause-reason':
      if (typeof command.reason !== 'string' || command.reason.length === 0 || typeof command.active !== 'boolean') {
        return rejected('invalid-pause-reason');
      }
      if (command.active) simulation.pauseReasons.add(command.reason);
      else simulation.pauseReasons.delete(command.reason);
      return accepted();
    default:
      return rejected('invalid-command');
  }
};

export const advanceSimulation = (simulation, steps) => {
  const count = Number.isInteger(steps) && steps > 0 ? steps : 0;
  for (let step = 0; step < count; step += 1) {
    if (simulation.terminal || simulation.pauseReasons.size > 0) break;
    spawnScheduledEnemies(simulation);
    stepCombat(simulation);
    if (simulation.castleHearts <= 0) {
      const result = calculateBattleResult(simulation);
      simulation.terminal = true;
      simulation.outcome = result.outcome;
      simulation.score = result.score;
      simulation.medal = result.medal;
      simulation.projectiles = [];
      simulation.effects = [];
      simulation.activeEffectValues = new Map();
      emitPresentationEvent(simulation, 'battle-terminal', { outcome: result.outcome });
    } else if (simulation.spawnedAllWaves && simulation.enemies.length === 0 && simulation.projectiles.length === 0) {
      const result = calculateBattleResult(simulation);
      simulation.terminal = true;
      simulation.outcome = result.outcome;
      simulation.score = result.score;
      simulation.medal = result.medal;
      simulation.effects = [];
      simulation.activeEffectValues = new Map();
      emitPresentationEvent(simulation, 'battle-terminal', { outcome: result.outcome });
    }
    simulation.tick += 1;
  }
  return simulation;
};

const snapshotTower = (tower) => {
  const masteryAttackCount = DEFENDERS[tower.defenderId].masteryAttackCount;
  return {
    id: tower.id,
    defenderId: tower.defenderId,
    padId: tower.padId,
    placementLayer: tower.placementLayer,
    combatLayer: tower.combatLayer,
    tier: tower.tier,
    health: tower.health,
    maxHealth: tower.maxHealth,
    armor: tower.armor,
    engagedEnemyIds: [...tower.engagedEnemyIds],
    totalInvested: tower.totalInvested,
    attackCount: tower.attackCount ?? 0,
    masteryProgress: (tower.attackCount ?? 0) % masteryAttackCount,
    nextAttackTick: tower.nextAttackTick ?? 0,
  };
};

const snapshotEnemy = (enemy) => ({
  id: enemy.id,
  enemyId: enemy.enemyId,
  spawnTick: enemy.spawnTick,
  pathProgress: enemy.pathProgress,
  health: enemy.health,
  speed: enemy.speed,
  armor: enemy.armor,
  clusterSize: enemy.clusterSize,
  castleDamage: enemy.castleDamage,
  maxHealth: enemy.maxHealth,
  waveIndex: enemy.waveIndex,
  nextAbilityTick: enemy.nextAbilityTick,
  abilityActiveTicks: enemy.abilityActiveTicks,
  nextAbilityActiveTick: enemy.nextAbilityActiveTick,
  thresholdFlags: enemy.thresholdFlags ? { ...enemy.thresholdFlags } : {},
  ...(enemy.stunnedUntilTick !== undefined && { stunnedUntilTick: enemy.stunnedUntilTick }),
  ...(enemy.stunImmuneUntilTick !== undefined && { stunImmuneUntilTick: enemy.stunImmuneUntilTick }),
  ...(enemy.vulnerableUntilTick !== undefined && { vulnerableUntilTick: enemy.vulnerableUntilTick }),
  ...(enemy.isSummon !== undefined && { isSummon: enemy.isSummon }),
});

const sortById = (first, second) => compareEntityIds(first.id, second.id);

const getStrategyMetrics = (simulation) => {
  const spendByDefender = {};
  const occupiedPadIds = new Set();
  for (const purchase of simulation.purchaseHistory) {
    spendByDefender[purchase.defenderId] = (spendByDefender[purchase.defenderId] ?? 0) + purchase.cost;
    if (purchase.type === 'build') occupiedPadIds.add(purchase.padId);
  }
  const highestSpendDefenderId = Object.entries(spendByDefender)
    .sort(([firstId, firstSpend], [secondId, secondSpend]) => (
      secondSpend - firstSpend || firstId.localeCompare(secondId)
    ))[0]?.[0] ?? null;
  return {
    purchaseHistory: simulation.purchaseHistory.map((purchase) => ({ ...purchase })),
    spendByDefender,
    highestSpendDefenderId,
    occupiedPadIds: [...occupiedPadIds].sort(),
  };
};

const getNextScheduledWave = (simulation) => {
  for (let waveIndex = 0; waveIndex < simulation.level.waveCount; waveIndex += 1) {
    if (simulation.waveStartedFlags[waveIndex]) continue;
    const firstSpawn = simulation.waveSchedule.find((entry) => entry.waveIndex === waveIndex);
    if (!firstSpawn || firstSpawn.spawnTick <= simulation.tick) return null;
    return { nextWaveIndex: waveIndex, nextWaveStartTick: firstSpawn.spawnTick };
  }
  return null;
};

export const summarizeSimulation = (simulation) => {
  const nextWave = getNextScheduledWave(simulation);
  return {
    ...getStrategyMetrics(simulation),
    version: simulation.version,
    levelId: simulation.levelId,
    tick: simulation.tick,
    timeScale: simulation.timeScale,
    pauseReasons: [...simulation.pauseReasons].sort(),
    coins: simulation.coins,
    score: simulation.score,
    castleHearts: simulation.castleHearts,
    nextEntityId: simulation.nextEntityId,
    nextWaveIndex: nextWave?.nextWaveIndex ?? null,
    nextWaveStartTick: nextWave?.nextWaveStartTick ?? null,
    waveIndex: simulation.waveIndex,
    spawnedAllWaves: simulation.spawnedAllWaves,
    enemies: simulation.enemies.map(snapshotEnemy).sort(sortById),
    towers: simulation.towers.map(snapshotTower).sort(sortById),
    projectiles: simulation.projectiles.map((projectile) => structuredClone(projectile)).sort(sortById),
    effects: simulation.effects.map((effect) => structuredClone(effect)).sort(sortById),
    presentationEvents: snapshotPresentationEvents(simulation),
    terminal: simulation.terminal,
    outcome: simulation.outcome,
    medal: simulation.medal,
    qa: simulation.qa,
    seed: simulation.seed,
  };
};

export const summarizePresentationSimulation = (simulation) => {
  const nextWave = getNextScheduledWave(simulation);
  return {
    version: simulation.version,
    levelId: simulation.levelId,
    tick: simulation.tick,
    timeScale: simulation.timeScale,
    pauseReasons: [...simulation.pauseReasons].sort(),
    coins: simulation.coins,
    score: simulation.score,
    castleHearts: simulation.castleHearts,
    nextEntityId: simulation.nextEntityId,
    nextWaveIndex: nextWave?.nextWaveIndex ?? null,
    nextWaveStartTick: nextWave?.nextWaveStartTick ?? null,
    waveIndex: simulation.waveIndex,
    spawnedAllWaves: simulation.spawnedAllWaves,
    enemies: simulation.enemies.map(snapshotEnemy).sort(sortById),
    towers: simulation.towers.map(snapshotTower).sort(sortById),
    projectiles: simulation.projectiles.map((projectile) => structuredClone(projectile)).sort(sortById),
    effects: simulation.effects
      .filter((effect) => effect.kind.includes('telegraph'))
      .map((effect) => structuredClone(effect))
      .sort(sortById),
    presentationEvents: snapshotPresentationEvents(simulation),
    purchaseHistory: simulation.purchaseHistory.map((purchase) => ({ ...purchase })),
    terminal: simulation.terminal,
    outcome: simulation.outcome,
    medal: simulation.medal,
    qa: simulation.qa,
    seed: simulation.seed,
  };
};

export const runStrategyFixture = (levelId, strategyId) => {
  const strategy = REFERENCE_STRATEGIES[strategyId];
  if (!strategy) throw new Error(`Unknown strategy: ${strategyId}`);
  const level = getLevel(levelId);
  if (!level.referenceStrategies.includes(strategyId)) {
    throw new Error(`Strategy ${strategyId} does not belong to ${levelId}`);
  }

  const simulation = createSimulation(levelId, { qa: true });
  for (let requestedTick = 0; requestedTick < MAX_STRATEGY_TICKS && !simulation.terminal; requestedTick += 1) {
    for (const command of strategy) {
      if (command.tick === simulation.tick) issueCommand(simulation, command);
    }
    advanceSimulation(simulation, 1);
  }
  return summarizeSimulation(simulation);
};
