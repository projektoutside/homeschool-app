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
  if (key === 'Home') return 'r0c0';
  if (key === 'End') return toCellId(GRID.rows - 1, GRID.columns - 1);
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
  actionState = null,
  danger = false,
  enemyCovered = false,
  focused = false,
  inRange = false,
  masteryCovered = false,
  occupied = false,
  selectedLayer = null,
  terrain = 'grass',
} = {}) => {
  const compatible = selectedLayer ? selectedLayer === terrain : null;
  const acceptsBuild = actionState
    ? Boolean(actionState.acceptsBuild)
    : Boolean(compatible && !occupied && !enemyCovered);
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
    compatible,
    danger: Boolean(danger),
    enemyCovered: Boolean(enemyCovered),
    focused: Boolean(focused),
    occupied: Boolean(occupied),
    terrain,
  });
};

export const resolveCellActionState = ({
  coins = 0,
  cost = null,
  enemyCovered = false,
  occupiedBy = null,
  selectedLayer = null,
  selectedName = null,
  selectedRole = null,
  terminal = false,
  terrain = 'grass',
} = {}) => {
  const numericCoins = Math.max(0, Number(coins) || 0);
  const numericCost = Number.isFinite(Number(cost)) ? Math.max(0, Number(cost)) : null;
  const compatible = selectedLayer ? selectedLayer === terrain : null;
  const costDescription = selectedName && numericCost !== null
    ? `${selectedName} costs ${numericCost} coins`
    : null;
  let actionable = false;
  let acceptsBuild = false;
  let description = 'available';
  let reason = null;

  if (terminal) {
    reason = 'terminal';
    description = 'battle ended';
  } else if (occupiedBy) {
    actionable = true;
    reason = 'occupied';
    description = `occupied by ${occupiedBy}, select to upgrade or sell`;
  } else if (enemyCovered) {
    reason = 'enemy-occupied';
    description = `blocked by enemies${costDescription ? `, ${costDescription}` : ''}`;
  } else if (selectedLayer && !compatible) {
    reason = 'placement-layer-mismatch';
    description = `unavailable for ${selectedRole}, requires ${selectedLayer} terrain${costDescription ? `, ${costDescription}` : ''}`;
  } else if (selectedLayer && numericCost !== null && numericCoins < numericCost) {
    reason = 'insufficient-coins';
    description = `${costDescription}, insufficient funds (${numericCoins} coins available)`;
  } else if (selectedLayer) {
    actionable = true;
    acceptsBuild = true;
    description = `available for ${selectedRole}${costDescription ? `, ${costDescription}` : ''}`;
  }

  return Object.freeze({
    acceptsBuild,
    actionable,
    compatible,
    description,
    disabled: !actionable,
    reason,
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
  actionState = null,
  cellId,
  danger = false,
  enemyCovered = false,
  occupiedBy = null,
  selectedRole = null,
  terrain = 'grass',
} = {}) => {
  const coordinates = safeCellCoordinates(cellId) ?? { row: 0, column: 0 };
  const prefix = `${terrain === 'road' ? 'Road' : 'Grass'} square row ${coordinates.row + 1} column ${coordinates.column + 1}`;
  const suffix = danger ? ', danger telegraph' : '';
  if (actionState?.description) return `${prefix}, ${actionState.description}${suffix}`;
  if (occupiedBy) return `${prefix}, occupied by ${occupiedBy}${suffix}`;
  if (enemyCovered) return `${prefix}, blocked by enemies${suffix}`;
  if (acceptsBuild && selectedRole) return `${prefix}, available for ${selectedRole}${suffix}`;
  if (selectedRole) return `${prefix}, unavailable for ${selectedRole}${suffix}`;
  return `${prefix}, available${suffix}`;
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

export const MAX_ENEMY_BODY_OVERLAP_RATIO = 1 / 3;

const clampNumber = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const resolveBodyOverlapRatio = (first, second) => {
  if (!first || !second || !(first.width > 0) || !(first.height > 0)
    || !(second.width > 0) || !(second.height > 0)) return 0;
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return (width * height) / Math.min(first.width * first.height, second.width * second.height);
};

export const resolveContainedBodyProjection = ({
  bodyHeight = 1,
  bodyWidth = 1,
  bottomInset = 0,
  position = { x: 0, y: 0 },
  worldHeight = GRID.height,
  worldWidth = GRID.width,
} = {}) => {
  const width = Math.min(worldWidth, Math.max(1, Number(bodyWidth) || 1));
  const height = Math.min(worldHeight, Math.max(1, Number(bodyHeight) || 1));
  const safeBottomInset = Math.max(0, Number(bottomInset) || 0);
  const halfWidth = width / 2;
  const x = clampNumber(Number(position.x) || 0, halfWidth, worldWidth - halfWidth);
  const bodyBottom = clampNumber(
    (Number(position.y) || 0) - safeBottomInset,
    height,
    worldHeight,
  );
  const y = bodyBottom + safeBottomInset;
  return Object.freeze({
    bodyRect: Object.freeze({
      bottom: bodyBottom,
      height,
      left: x - halfWidth,
      right: x + halfWidth,
      top: bodyBottom - height,
      width,
    }),
    position: Object.freeze({ x, y }),
  });
};

export const resolveReadableEnemyLayout = ({
  entries = [],
  maximumOverlapRatio = MAX_ENEMY_BODY_OVERLAP_RATIO,
  metrics,
  progressStep = 2,
} = {}) => {
  if (!Array.isArray(entries) || entries.length === 0) return Object.freeze([]);
  const totalProgress = Math.max(0, Number(metrics?.total) || 0);
  const safeOverlapRatio = clampNumber(Number(maximumOverlapRatio) || 0, 0, 1);
  const safeProgressStep = Math.max(0.5, Number(progressStep) || 2);
  const stateRank = (entry) => (
    entry.laneState === 'attacking' ? 0 : entry.laneState === 'queued' ? 1 : 2
  );
  const ordered = entries.map((entry, index) => ({ entry, index })).sort((first, second) => (
    stateRank(first.entry) - stateRank(second.entry)
    || ((Number(first.entry.gatePathProgress) || 0) - (Number(second.entry.gatePathProgress) || 0))
    || ((Number(first.entry.queueIndex) || 0) - (Number(second.entry.queueIndex) || 0))
    || ((Number(first.entry.pathProgress) || 0) - (Number(second.entry.pathProgress) || 0))
    || first.index - second.index
  ));
  const placed = [];
  const lastQueuedProgressByGate = new Map();

  for (const { entry, index } of ordered) {
    const laneState = entry.laneState ?? null;
    const laneAware = laneState === 'attacking' || laneState === 'queued' || laneState === 'moving';
    const authoritativeProgress = clampNumber(
      Number(entry.authoritativePathProgress ?? entry.pathProgress) || 0,
      0,
      totalProgress,
    );
    const gateProgress = clampNumber(Number(entry.gatePathProgress) || 0, 0, totalProgress);
    const queueKey = laneState === 'queued' ? String(gateProgress) : null;
    const previousQueuedProgress = queueKey === null
      ? null
      : lastQueuedProgressByGate.get(queueKey) ?? null;
    const maximumTruthfulProgress = laneState === 'attacking'
      ? authoritativeProgress
      : laneState === 'queued'
        ? Math.min(
          authoritativeProgress,
          Math.max(0, gateProgress - 1),
          previousQueuedProgress === null
            ? totalProgress
            : Math.max(0, previousQueuedProgress - safeProgressStep),
        )
        : laneState === 'moving'
          ? authoritativeProgress
          : totalProgress;
    const initialProgress = clampNumber(
      Number(entry.pathProgress) || 0,
      0,
      maximumTruthfulProgress,
    );
    const maximumLaneOffset = Math.max(0, Number(entry.maximumLaneOffset) || 0);
    const requestedLaneOffset = clampNumber(
      Number(entry.laneOffset) || 0,
      -maximumLaneOffset,
      maximumLaneOffset,
    );
    const laneOffsets = [...new Set([
      requestedLaneOffset,
      ...Array.from({ length: 9 }, (_, offsetIndex) => (
        -maximumLaneOffset + ((maximumLaneOffset * offsetIndex) / 4)
      )),
    ].map((value) => Number(value.toFixed(6))))];
    const searchSteps = Math.ceil(totalProgress / safeProgressStep) + 1;
    let resolved = null;

    if (laneState === 'attacking') {
      const containment = resolveContainedBodyProjection({
        bodyHeight: entry.bodyHeight,
        bodyWidth: entry.bodyWidth,
        bottomInset: entry.bottomInset,
        position: projectGridPathProgress(metrics, initialProgress, requestedLaneOffset),
      });
      resolved = Object.freeze({
        bodyRect: containment.bodyRect,
        id: entry.id,
        laneOffset: requestedLaneOffset,
        pathProgress: initialProgress,
        position: containment.position,
        sourceIndex: index,
      });
    }

    for (let stepIndex = 0; stepIndex < searchSteps && !resolved; stepIndex += 1) {
      const distance = stepIndex * safeProgressStep;
      const candidateProgress = stepIndex === 0
        ? [initialProgress]
        : laneAware
          ? [initialProgress - distance >= 0 ? initialProgress - distance : null]
            .filter((value) => value !== null)
          : [
            initialProgress + distance <= totalProgress ? initialProgress + distance : null,
            initialProgress - distance >= 0 ? initialProgress - distance : null,
          ].filter((value) => value !== null);
      for (const pathProgress of candidateProgress) {
        for (const laneOffset of laneOffsets) {
          const containment = resolveContainedBodyProjection({
            bodyHeight: entry.bodyHeight,
            bodyWidth: entry.bodyWidth,
            bottomInset: entry.bottomInset,
            position: projectGridPathProgress(metrics, pathProgress, laneOffset),
          });
          if (placed.every(({ bodyRect }) => (
            resolveBodyOverlapRatio(containment.bodyRect, bodyRect) <= safeOverlapRatio + 1e-9
          ))) {
            resolved = Object.freeze({
              bodyRect: containment.bodyRect,
              id: entry.id,
              laneOffset,
              pathProgress,
              position: containment.position,
              sourceIndex: index,
            });
            break;
          }
        }
        if (resolved) break;
      }
    }

    if (!resolved) {
      const laneOffset = laneOffsets[0] ?? 0;
      const fallbackProgress = laneAware ? Math.max(0, maximumTruthfulProgress) : totalProgress;
      const containment = resolveContainedBodyProjection({
        bodyHeight: entry.bodyHeight,
        bodyWidth: entry.bodyWidth,
        bottomInset: entry.bottomInset,
        position: projectGridPathProgress(metrics, fallbackProgress, laneOffset),
      });
      resolved = Object.freeze({
        bodyRect: containment.bodyRect,
        id: entry.id,
        laneOffset,
        pathProgress: fallbackProgress,
        position: containment.position,
        sourceIndex: index,
      });
    }
    placed.push(resolved);
    if (queueKey !== null) lastQueuedProgressByGate.set(queueKey, resolved.pathProgress);
  }

  return Object.freeze(placed.sort((first, second) => first.sourceIndex - second.sourceIndex));
};
