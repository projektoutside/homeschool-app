import { GRID, cellCenter, createGridPathMetrics, parseCellId } from './grid-geometry.js';

const ROAD_PAD_FRACTIONS = Object.freeze({ a: 0.18, c: 0.39, e: 0.62, g: 0.84 });
const LEGACY_PLACEMENT_CACHE = new WeakMap();
const MAX_ATTACKERS_PER_GATE = 3;
const MAX_READABLE_ENEMIES = 18;

export const getGridCell = (level, cellId) => (
  level?.cells?.find(({ id }) => id === cellId) ?? null
);

const compareCellsByDistance = (target, first, second) => {
  const firstCenter = cellCenter(first.id);
  const secondCenter = cellCenter(second.id);
  const firstDistance = Math.hypot(firstCenter.x - target.x, firstCenter.y - target.y);
  const secondDistance = Math.hypot(secondCenter.x - target.x, secondCenter.y - target.y);
  if (firstDistance !== secondDistance) return firstDistance - secondDistance;
  const firstCoordinates = parseCellId(first.id);
  const secondCoordinates = parseCellId(second.id);
  return firstCoordinates.row - secondCoordinates.row || firstCoordinates.column - secondCoordinates.column;
};

export const getDeprecatedCellPlacements = (level) => {
  if (!level || typeof level !== 'object') return Object.freeze([]);
  const cached = LEGACY_PLACEMENT_CACHE.get(level);
  if (cached) return cached;

  const records = [];
  const usedGrassCellIds = new Set();
  const grassCells = level.cells?.filter(({ terrain }) => terrain === 'grass') ?? [];
  for (const placement of level.pads ?? []) {
    const letter = placement.id?.split('-').at(-1);
    if (placement.layer === 'road' && Object.hasOwn(ROAD_PAD_FRACTIONS, letter)) {
      const index = Math.round((level.roadCells.length - 1) * ROAD_PAD_FRACTIONS[letter]);
      records.push(Object.freeze({ id: placement.id, cellId: level.roadCells[index] }));
      continue;
    }
    if (placement.layer === 'grass' && Number.isFinite(placement.x) && Number.isFinite(placement.y)) {
      const cell = grassCells
        .filter(({ id }) => !usedGrassCellIds.has(id))
        .sort((first, second) => compareCellsByDistance(placement, first, second))[0];
      if (!cell) continue;
      usedGrassCellIds.add(cell.id);
      records.push(Object.freeze({ id: placement.id, cellId: cell.id }));
    }
  }
  const frozen = Object.freeze(records);
  LEGACY_PLACEMENT_CACHE.set(level, frozen);
  return frozen;
};

export const resolveCellId = (level, requestedCellId) => {
  if (getGridCell(level, requestedCellId)) return requestedCellId;
  return getDeprecatedCellPlacements(level).find(({ id }) => id === requestedCellId)?.cellId ?? null;
};

export const getLegacyPadIdForCell = (level, cellId) => {
  const cell = getGridCell(level, cellId);
  if (!cell) return null;
  const records = getDeprecatedCellPlacements(level)
    .filter((record) => getGridCell(level, record.cellId)?.terrain === cell.terrain);
  if (records.length === 0) return null;
  const target = cellCenter(cellId);
  return records.sort((first, second) => compareCellsByDistance(
    target,
    getGridCell(level, first.cellId),
    getGridCell(level, second.cellId),
  ))[0].id;
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
