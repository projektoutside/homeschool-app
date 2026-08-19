export const ROAD_WIDTH = 112;

const cardinalDirection = (from, to) => {
  if (to.x > from.x) return 'east';
  if (to.x < from.x) return 'west';
  if (to.y > from.y) return 'south';
  return 'north';
};

const cornerFrame = (first, second) => {
  const directions = new Set([first, second]);
  if (directions.has('north') && directions.has('east')) return 'northEast';
  if (directions.has('east') && directions.has('south')) return 'eastSouth';
  if (directions.has('south') && directions.has('west')) return 'southWest';
  if (directions.has('west') && directions.has('north')) return 'westNorth';
  throw new Error(`Invalid corner direction ${first}-${second}`);
};

const capFrame = (direction) => `cap${direction[0].toUpperCase()}${direction.slice(1)}`;

export const createPathMetrics = (path) => {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('Path must contain at least two points');
  }
  const segments = [];
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    if (start.x !== end.x && start.y !== end.y) throw new Error(`Diagonal path segment ${index - 1}`);
    const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    if (length <= 0) throw new Error(`Empty path segment ${index - 1}`);
    segments.push(Object.freeze({ start, end, length, offset: total }));
    total += length;
  }
  return Object.freeze({ segments: Object.freeze(segments), total });
};

export const samplePathProgress = (metrics, requestedProgress) => {
  const progress = Math.max(0, Math.min(metrics.total, Number(requestedProgress) || 0));
  const segment = metrics.segments.find(({ offset, length }) => progress <= offset + length)
    ?? metrics.segments.at(-1);
  const ratio = segment.length === 0 ? 1 : (progress - segment.offset) / segment.length;
  return Object.freeze({
    x: segment.start.x + ((segment.end.x - segment.start.x) * ratio),
    y: segment.start.y + ((segment.end.y - segment.start.y) * ratio),
  });
};

export const derivePathPieces = (path, projectPoint) => {
  createPathMetrics(path);
  const projected = path.map((point) => Object.freeze(projectPoint(point)));
  const trim = ROAD_WIDTH / 4;
  const entranceDirection = cardinalDirection(projected[0], projected[1]);
  const castleDirection = cardinalDirection(projected.at(-1), projected.at(-2));
  const pieces = [Object.freeze({
    kind: 'cap',
    frame: capFrame(entranceDirection),
    x: projected[0].x,
    y: projected[0].y,
    length: ROAD_WIDTH / 2,
    rotation: 0,
    width: ROAD_WIDTH,
  })];

  for (let index = 1; index < projected.length; index += 1) {
    const start = projected[index - 1];
    const end = projected[index];
    const horizontal = end.x - start.x;
    const vertical = end.y - start.y;
    const length = Math.hypot(horizontal, vertical);
    if (length <= ROAD_WIDTH / 2) throw new Error(`Projected path segment ${index - 1} is too short`);
    const unitX = horizontal / length;
    const unitY = vertical / length;
    const trimmedStart = { x: start.x + (unitX * trim), y: start.y + (unitY * trim) };
    const trimmedEnd = { x: end.x - (unitX * trim), y: end.y - (unitY * trim) };
    pieces.push(Object.freeze({
      kind: 'straight',
      frame: horizontal === 0 ? 'vertical' : 'horizontal',
      x: (trimmedStart.x + trimmedEnd.x) / 2,
      y: (trimmedStart.y + trimmedEnd.y) / 2,
      length: length - (ROAD_WIDTH / 2),
      rotation: 0,
      width: ROAD_WIDTH,
    }));
    if (index < projected.length - 1) {
      const point = projected[index];
      pieces.push(Object.freeze({
        kind: 'corner',
        frame: cornerFrame(
          cardinalDirection(point, projected[index - 1]),
          cardinalDirection(point, projected[index + 1]),
        ),
        x: point.x,
        y: point.y,
        length: ROAD_WIDTH,
        rotation: 0,
        width: ROAD_WIDTH,
      }));
    }
  }
  pieces.push(Object.freeze({
    kind: 'cap',
    frame: capFrame(castleDirection),
    x: projected.at(-1).x,
    y: projected.at(-1).y,
    length: ROAD_WIDTH / 2,
    rotation: 0,
    width: ROAD_WIDTH,
  }));
  return Object.freeze(pieces);
};

export const resolvePlacementPoint = (level, placement) => {
  if (placement.layer === 'grass') return Object.freeze({ x: placement.x, y: placement.y });
  return samplePathProgress(createPathMetrics(level.path), placement.pathProgress);
};
