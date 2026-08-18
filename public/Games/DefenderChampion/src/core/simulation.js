import { DEFENDERS } from '../config/defenders.js';
import { getLevel } from '../config/levels.js';
import { REFERENCE_STRATEGIES } from '../config/reference-strategies.js';
import { getBuildCost, getSellRefund, getUpgradeCost } from './economy.js';
import { createWaveController, spawnScheduledEnemies } from './wave-controller.js';

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
  };
};

const findTower = (simulation, towerId) => simulation.towers.find((tower) => tower.id === towerId);

const buildTower = (simulation, command) => {
  const defender = DEFENDERS[command.defenderId];
  if (!defender) return rejected('invalid-defender');
  if (!simulation.level.pads.some((pad) => pad.id === command.padId)) return rejected('invalid-pad');
  if (simulation.towers.some((tower) => tower.padId === command.padId)) return rejected('pad-occupied');
  const cost = getBuildCost(defender);
  if (simulation.coins < cost) return rejected('insufficient-coins');

  simulation.coins -= cost;
  simulation.towers.push({
    id: `tower-${simulation.nextEntityId++}`,
    defenderId: defender.id,
    padId: command.padId,
    tier: 0,
    totalInvested: cost,
  });
  return accepted();
};

const upgradeTower = (simulation, towerId) => {
  const tower = findTower(simulation, towerId);
  if (!tower) return rejected('missing-tower');
  const cost = getUpgradeCost(tower, DEFENDERS[tower.defenderId]);
  if (cost === null) return rejected('max-tier');
  if (simulation.coins < cost) return rejected('insufficient-coins');

  simulation.coins -= cost;
  tower.tier += 1;
  tower.totalInvested += cost;
  return accepted();
};

const sellTower = (simulation, towerId) => {
  const towerIndex = simulation.towers.findIndex((tower) => tower.id === towerId);
  if (towerIndex === -1) return rejected('missing-tower');
  const [tower] = simulation.towers.splice(towerIndex, 1);
  simulation.coins += getSellRefund(tower);
  return accepted();
};

export const issueCommand = (simulation, command) => {
  if (!command || typeof command.type !== 'string') return rejected('invalid-command');
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
    simulation.tick += 1;
  }
  return simulation;
};

const snapshotTower = (tower) => ({
  id: tower.id,
  defenderId: tower.defenderId,
  padId: tower.padId,
  tier: tower.tier,
  totalInvested: tower.totalInvested,
});

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
});

const sortById = (first, second) => (first.id < second.id ? -1 : first.id > second.id ? 1 : 0);

export const summarizeSimulation = (simulation) => ({
  version: simulation.version,
  levelId: simulation.levelId,
  tick: simulation.tick,
  timeScale: simulation.timeScale,
  pauseReasons: [...simulation.pauseReasons].sort(),
  coins: simulation.coins,
  score: simulation.score,
  castleHearts: simulation.castleHearts,
  nextEntityId: simulation.nextEntityId,
  waveIndex: simulation.waveIndex,
  spawnedAllWaves: simulation.spawnedAllWaves,
  enemies: simulation.enemies.map(snapshotEnemy).sort(sortById),
  towers: simulation.towers.map(snapshotTower).sort(sortById),
  projectiles: simulation.projectiles.map((projectile) => ({ ...projectile })).sort(sortById),
  effects: simulation.effects.map((effect) => ({ ...effect })).sort(sortById),
  terminal: simulation.terminal,
  outcome: simulation.outcome,
  qa: simulation.qa,
  seed: simulation.seed,
});

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
