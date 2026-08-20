import {
  GRID,
  cellCenter,
  parseCellId,
  toCellId,
} from './core/grid-geometry.js';

const CELL_COLORS = Object.freeze({
  available: 0x8fe36a,
  baseGrass: 0x315a3a,
  baseRoad: 0x826d45,
  danger: 0xff6b61,
  focused: 0xffffff,
  mastery: 0x58d5ff,
  occupied: 0xf2c94c,
  range: 0xffe59a,
  unavailable: 0x6f7d76,
});

const safeCellCoordinates = (cellId) => {
  try {
    return parseCellId(cellId);
  } catch {
    return null;
  }
};

export const resolveCellFromWorldPoint = ({ x, y } = {}) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || y < 0 || x >= GRID.width || y >= GRID.height) return null;
  return toCellId(Math.floor(y / GRID.cellSize), Math.floor(x / GRID.cellSize));
};

export const resolveGridFocusMove = ({ cellId = 'r0c0', key } = {}) => {
  const current = safeCellCoordinates(cellId);
  if (!current) return 'r0c0';
  const offsets = {
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
  };
  const [rowOffset, columnOffset] = offsets[key] ?? [0, 0];
  const row = Math.max(0, Math.min(GRID.rows - 1, current.row + rowOffset));
  const column = Math.max(0, Math.min(GRID.columns - 1, current.column + columnOffset));
  return toCellId(row, column);
};

export const resolveCellVisualState = ({
  danger = false,
  enemyCovered = false,
  focused = false,
  inRange = false,
  masteryCovered = false,
  occupied = false,
  selectedLayer = null,
  terrain = 'grass',
} = {}) => {
  const acceptsBuild = Boolean(selectedLayer && selectedLayer === terrain && !occupied && !enemyCovered);
  let borderAlpha = 0.35;
  let borderColor = terrain === 'road' ? CELL_COLORS.baseRoad : CELL_COLORS.baseGrass;
  let fillAlpha = 0.04;
  let fillColor = borderColor;

  if (selectedLayer) {
    borderAlpha = acceptsBuild ? 0.9 : 0.55;
    borderColor = acceptsBuild ? CELL_COLORS.available : CELL_COLORS.unavailable;
    fillAlpha = acceptsBuild ? 0.18 : 0.1;
    fillColor = borderColor;
  }
  if (inRange) {
    borderAlpha = 0.7;
    borderColor = CELL_COLORS.range;
    fillAlpha = 0.16;
    fillColor = CELL_COLORS.range;
  }
  if (masteryCovered) {
    borderAlpha = 0.82;
    borderColor = CELL_COLORS.mastery;
    fillAlpha = 0.2;
    fillColor = CELL_COLORS.mastery;
  }
  if (occupied) {
    borderAlpha = 0.85;
    borderColor = CELL_COLORS.occupied;
    fillAlpha = 0.22;
    fillColor = CELL_COLORS.occupied;
  }
  if (enemyCovered) {
    borderAlpha = 0.9;
    borderColor = CELL_COLORS.danger;
    fillAlpha = 0.24;
    fillColor = CELL_COLORS.danger;
  }
  if (danger) {
    borderAlpha = 0.95;
    borderColor = CELL_COLORS.danger;
    fillAlpha = 0.28;
    fillColor = CELL_COLORS.danger;
  }
  if (focused) {
    borderAlpha = 1;
    borderColor = CELL_COLORS.focused;
  }

  return Object.freeze({
    acceptsBuild,
    borderAlpha,
    borderColor,
    fillAlpha,
    fillColor,
    focused: Boolean(focused),
    occupied: Boolean(occupied),
    terrain,
  });
};

export const resolveSquareRangeCells = ({
  level,
  originCellId,
  range,
  targetTerrain = null,
} = {}) => {
  if (!Array.isArray(level?.cells) || !safeCellCoordinates(originCellId)) return Object.freeze([]);
  const numericRange = Number(range);
  if (!Number.isFinite(numericRange) || numericRange < 0) return Object.freeze([]);
  const origin = cellCenter(originCellId);
  return Object.freeze(level.cells
    .filter((cell) => !targetTerrain || cell.terrain === targetTerrain)
    .filter((cell) => {
      const center = cellCenter(cell.id);
      return Math.hypot(center.x - origin.x, center.y - origin.y) <= numericRange + 1e-9;
    })
    .map(({ id }) => Object.freeze({ cellId: id, inRange: true })));
};

export const resolveReadableSpriteScale = ({
  authoredScale = 1,
  cssWorldScale = 1,
  frameHeight = 1,
  kind = 'enemy',
} = {}) => {
  const minimumCssHeight = kind === 'defender' ? 44 : kind === 'boss' ? 52 : 38;
  const safeAuthoredScale = Number.isFinite(authoredScale) && authoredScale > 0 ? authoredScale : 1;
  const safeCssWorldScale = Number.isFinite(cssWorldScale) && cssWorldScale > 0 ? cssWorldScale : 1;
  const safeFrameHeight = Number.isFinite(frameHeight) && frameHeight > 0 ? frameHeight : 1;
  return Math.max(safeAuthoredScale, minimumCssHeight / (safeFrameHeight * safeCssWorldScale));
};

export const formatCellAccessibleLabel = ({
  acceptsBuild = false,
  cellId,
  enemyCovered = false,
  occupiedBy = null,
  selectedRole = null,
  terrain = 'grass',
} = {}) => {
  const coordinates = safeCellCoordinates(cellId) ?? { row: 0, column: 0 };
  const prefix = `${terrain === 'road' ? 'Road' : 'Grass'} square row ${coordinates.row + 1} column ${coordinates.column + 1}`;
  if (occupiedBy) return `${prefix}, occupied by ${occupiedBy}`;
  if (enemyCovered) return `${prefix}, blocked by enemies`;
  if (acceptsBuild && selectedRole) return `${prefix}, available for ${selectedRole}`;
  if (selectedRole) return `${prefix}, unavailable for ${selectedRole}`;
  return `${prefix}, available`;
};

export const resolveContainWorldPoint = ({
  bounds,
  clientX,
  clientY,
  worldHeight = GRID.height,
  worldWidth = GRID.width,
} = {}) => {
  if (!(bounds?.width > 0) || !(bounds?.height > 0)
    || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const scale = Math.min(bounds.width / worldWidth, bounds.height / worldHeight);
  if (!(scale > 0)) return null;
  const contentWidth = worldWidth * scale;
  const contentHeight = worldHeight * scale;
  const left = bounds.left + ((bounds.width - contentWidth) / 2);
  const top = bounds.top + ((bounds.height - contentHeight) / 2);
  const x = (clientX - left) / scale;
  const y = (clientY - top) / scale;
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return null;
  return Object.freeze({ scale, x, y });
};

export const projectGridPathProgress = (metrics, requestedProgress, requestedLaneOffset = 0) => {
  const progress = Math.max(0, Math.min(metrics?.total ?? 0, Number(requestedProgress) || 0));
  const segment = metrics?.segments?.find(({ offset, length }) => progress <= offset + length)
    ?? metrics?.segments?.at(-1);
  if (!segment) return Object.freeze({ x: 0, y: 0 });
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  const directionX = (segment.end.x - segment.start.x) / segment.length;
  const directionY = (segment.end.y - segment.start.y) / segment.length;
  const laneOffset = Number(requestedLaneOffset) || 0;
  return Object.freeze({
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio) - (directionY * laneOffset),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio) + (directionX * laneOffset),
  });
};
