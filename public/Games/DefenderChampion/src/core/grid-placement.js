import { GRID, createGridPathMetrics } from './grid-geometry.js';

const MAX_ATTACKERS_PER_GATE = 3;
const MAX_READABLE_ENEMIES = 18;

export const getGridCell = (level, cellId) => (
  level?.cells?.find(({ id }) => id === cellId) ?? null
);

export const resolveCellId = (level, requestedCellId) => {
  return getGridCell(level, requestedCellId) ? requestedCellId : null;
};

export const isRoadCellEnemyCovered = ({ level, enemies = [], cellId } = {}) => {
  const cell = getGridCell(level, cellId);
  if (cell?.terrain !== 'road') return false;
  const index = level.roadCells.indexOf(cellId);
  if (index < 0) return false;
  const metrics = createGridPathMetrics(level.roadCells);
  const targetProgress = index * GRID.cellSize;
  return enemies.some((enemy) => {
    if (!(enemy?.health > 0)) return false;
    const progress = Math.max(0, Math.min(metrics.total, Number(enemy.pathProgress) || 0));
    return Math.abs(progress - targetProgress) <= GRID.cellSize / 2;
  });
};

const isRoadCellUpstreamCongested = ({ level, enemies = [], cellId } = {}) => {
  const index = level?.roadCells?.indexOf(cellId) ?? -1;
  if (index < 0) return false;
  const metrics = createGridPathMetrics(level.roadCells);
  const upstreamBoundary = (index * GRID.cellSize) - (GRID.cellSize / 2);
  const readableCapacity = Math.min(
    MAX_READABLE_ENEMIES,
    MAX_ATTACKERS_PER_GATE + index,
  );
  const upstreamLivingCount = enemies.filter((enemy) => {
    if (!(enemy?.health > 0)) return false;
    const progress = Math.max(0, Math.min(metrics.total, Number(enemy.pathProgress) || 0));
    return progress < upstreamBoundary;
  }).length;
  return upstreamLivingCount > readableCapacity;
};

export const evaluateCellBuild = ({ level, defender, towers = [], enemies = [], cellId } = {}) => {
  const cell = getGridCell(level, cellId);
  if (!cell) return Object.freeze({ accepted: false, cell: null, reason: 'invalid-cell' });
  if (cell.terrain !== defender?.placementLayer) {
    return Object.freeze({ accepted: false, cell, reason: 'placement-layer-mismatch' });
  }
  if (towers.some((tower) => tower.cellId === cellId)) {
    return Object.freeze({ accepted: false, cell, reason: 'cell-occupied' });
  }
  if (cell.terrain === 'road' && (
    isRoadCellEnemyCovered({ level, enemies, cellId })
    || isRoadCellUpstreamCongested({ level, enemies, cellId })
  )) {
    return Object.freeze({ accepted: false, cell, reason: 'enemy-occupied' });
  }
  return Object.freeze({ accepted: true, cell, reason: null });
};
