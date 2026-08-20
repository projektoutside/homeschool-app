export const GRID = Object.freeze({ columns: 9, rows: 12, cellSize: 80, width: 720, height: 960 });

export const toCellId = (row, column) => `r${row}c${column}`;

export const parseCellId = (cellId) => {
  const match = /^r(\d{1,2})c(\d)$/.exec(cellId ?? '');
  if (!match) throw new Error(`Invalid grid cell: ${cellId}`);
  const row = Number(match[1]);
  const column = Number(match[2]);
  if (row >= GRID.rows || column >= GRID.columns) throw new Error(`Grid cell out of bounds: ${cellId}`);
  return Object.freeze({ row, column });
};

export const cellCenter = (cellId) => {
  const { row, column } = parseCellId(cellId);
  return Object.freeze({
    x: (column * GRID.cellSize) + (GRID.cellSize / 2),
    y: (row * GRID.cellSize) + (GRID.cellSize / 2),
  });
};

const cellIdFor = ({ row, column }) => {
  if (!Number.isInteger(row) || !Number.isInteger(column)) {
    throw new Error('Grid waypoint must contain integer row and column values');
  }
  return parseCellId(toCellId(row, column)) && toCellId(row, column);
};

const directionBetween = (fromCellId, toCellId) => {
  const from = parseCellId(fromCellId);
  const to = parseCellId(toCellId);
  if (from.row === to.row && from.column + 1 === to.column) return 'east';
  if (from.row === to.row && from.column - 1 === to.column) return 'west';
  if (from.column === to.column && from.row + 1 === to.row) return 'south';
  if (from.column === to.column && from.row - 1 === to.row) return 'north';
  throw new Error(`Grid cells are not adjacent: ${fromCellId} to ${toCellId}`);
};

const cornerFrame = (first, second) => {
  const directions = new Set([first, second]);
  if (directions.has('north') && directions.has('east')) return 'northEast';
  if (directions.has('east') && directions.has('south')) return 'eastSouth';
  if (directions.has('south') && directions.has('west')) return 'southWest';
  if (directions.has('west') && directions.has('north')) return 'westNorth';
  throw new Error(`Invalid grid corner direction ${first}-${second}`);
};

const capFrame = (direction) => `cap${direction[0].toUpperCase()}${direction.slice(1)}`;

const areOppositeDirections = (first, second) => (
  (first === 'north' && second === 'south')
  || (first === 'south' && second === 'north')
  || (first === 'east' && second === 'west')
  || (first === 'west' && second === 'east')
);

const validateRoadCells = (roadCells) => {
  if (!Array.isArray(roadCells) || roadCells.length < 2) {
    throw new Error('Grid road must contain at least two cells');
  }
  const roadSet = new Set();
  for (const cellId of roadCells) {
    parseCellId(cellId);
    if (roadSet.has(cellId)) throw new Error(`Grid road intersects itself at ${cellId}`);
    roadSet.add(cellId);
  }
  for (let index = 1; index < roadCells.length; index += 1) {
    directionBetween(roadCells[index - 1], roadCells[index]);
  }
  return roadSet;
};

export const expandGridPath = (waypoints) => {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('Grid path must contain at least two waypoints');
  }
  const roadCells = [cellIdFor(waypoints[0])];
  const roadSet = new Set(roadCells);
  for (let index = 1; index < waypoints.length; index += 1) {
    const from = parseCellId(cellIdFor(waypoints[index - 1]));
    const to = parseCellId(cellIdFor(waypoints[index]));
    if (from.row !== to.row && from.column !== to.column) {
      throw new Error(`Diagonal grid path segment ${index - 1}`);
    }
    if (from.row === to.row && from.column === to.column) {
      throw new Error(`Repeated grid waypoint ${index - 1}`);
    }
    const rowStep = Math.sign(to.row - from.row);
    const columnStep = Math.sign(to.column - from.column);
    let row = from.row;
    let column = from.column;
    while (row !== to.row || column !== to.column) {
      row += rowStep;
      column += columnStep;
      const cellId = toCellId(row, column);
      if (roadSet.has(cellId)) throw new Error(`Grid path intersects itself at ${cellId}`);
      roadSet.add(cellId);
      roadCells.push(cellId);
    }
  }
  return Object.freeze(roadCells);
};

export const createTerrainCells = (roadCells) => {
  const roadSet = validateRoadCells(roadCells);
  const cells = [];
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      const id = toCellId(row, column);
      cells.push(Object.freeze({ id, terrain: roadSet.has(id) ? 'road' : 'grass' }));
    }
  }
  return Object.freeze(cells);
};

export const createGridPathMetrics = (roadCells) => {
  validateRoadCells(roadCells);
  const segments = [];
  let total = 0;
  for (let index = 1; index < roadCells.length; index += 1) {
    const start = cellCenter(roadCells[index - 1]);
    const end = cellCenter(roadCells[index]);
    const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    segments.push(Object.freeze({ start, end, length, offset: total }));
    total += length;
  }
  return Object.freeze({ segments: Object.freeze(segments), total });
};

export const sampleGridPathProgress = (metrics, requestedProgress) => {
  const progress = Math.max(0, Math.min(metrics.total, Number(requestedProgress) || 0));
  const segment = metrics.segments.find(({ offset, length }) => progress <= offset + length)
    ?? metrics.segments.at(-1);
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  return Object.freeze({
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio),
  });
};

export const deriveRoadTiles = (roadCells) => {
  validateRoadCells(roadCells);
  return Object.freeze(roadCells.map((cellId, index) => {
    const center = cellCenter(cellId);
    const previousDirection = index > 0 ? directionBetween(cellId, roadCells[index - 1]) : null;
    const nextDirection = index < roadCells.length - 1 ? directionBetween(cellId, roadCells[index + 1]) : null;
    const frame = previousDirection && nextDirection
      ? (areOppositeDirections(previousDirection, nextDirection)
        ? (previousDirection === 'east' || previousDirection === 'west' ? 'horizontal' : 'vertical')
        : cornerFrame(previousDirection, nextDirection))
      : capFrame(previousDirection ?? nextDirection);
    return Object.freeze({
      cellId,
      frame,
      height: GRID.cellSize,
      kind: previousDirection && nextDirection
        ? (areOppositeDirections(previousDirection, nextDirection) ? 'straight' : 'corner')
        : 'cap',
      width: GRID.cellSize,
      x: center.x,
      y: center.y,
    });
  }));
};

export const validateGridLevel = (level) => {
  if (!level || typeof level !== 'object') throw new Error('Grid level must be an object');
  const roadSet = validateRoadCells(level.roadCells);
  const first = parseCellId(level.roadCells[0]);
  const last = parseCellId(level.roadCells.at(-1));
  if (first.row !== 0 || last.row !== GRID.rows - 1) {
    throw new Error(`Grid level ${level.id ?? 'unknown'} must run from top to bottom`);
  }
  if (!Array.isArray(level.cells) || level.cells.length !== GRID.rows * GRID.columns) {
    throw new Error(`Grid level ${level.id ?? 'unknown'} must contain every cell`);
  }
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      const index = (row * GRID.columns) + column;
      const expectedId = toCellId(row, column);
      const cell = level.cells[index];
      if (!cell || cell.id !== expectedId || cell.terrain !== (roadSet.has(expectedId) ? 'road' : 'grass')) {
        throw new Error(`Grid level ${level.id ?? 'unknown'} has invalid terrain at ${expectedId}`);
      }
    }
  }
  return true;
};
