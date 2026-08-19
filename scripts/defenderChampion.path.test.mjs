import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  ROAD_WIDTH,
  createPathMetrics,
  derivePathPieces,
  resolvePlacementPoint,
  samplePathProgress,
} from '../public/Games/DefenderChampion/src/core/path-geometry.js';

const identity = ({ x, y }) => ({ x, y });
const projectBattlefieldPoint = ({ x, y }) => ({
  x: x * (720 / 640),
  y: 110 + (y * 1.45),
});

const distanceToSegment = (point, start, end) => {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  const squaredLength = (horizontal ** 2) + (vertical ** 2);
  const progress = squaredLength === 0
    ? 0
    : Math.max(0, Math.min(1, (((point.x - start.x) * horizontal) + ((point.y - start.y) * vertical)) / squaredLength));
  return Math.hypot(point.x - (start.x + (horizontal * progress)), point.y - (start.y + (vertical * progress)));
};

test('all ten routes are orthogonal top-to-bottom roads with typed placements', () => {
  assert.equal(ROAD_WIDTH, 112);
  for (const level of LEVELS) {
    assert.ok(level.path[0].y < level.path.at(-1).y, level.id);
    for (let index = 1; index < level.path.length; index += 1) {
      const before = level.path[index - 1];
      const after = level.path[index];
      assert.notDeepEqual(before, after, `${level.id} repeated point`);
      assert.equal(before.x === after.x || before.y === after.y, true, `${level.id} diagonal segment`);
    }
    assert.equal(level.pads.filter(({ layer }) => layer === 'road').length, 4);
    assert.equal(level.pads.filter(({ layer }) => layer === 'grass').length, 4);
    const metrics = createPathMetrics(level.path);
    for (const pad of level.pads) {
      const point = resolvePlacementPoint(level, pad);
      assert.equal(Number.isFinite(point.x) && Number.isFinite(point.y), true);
      if (pad.layer === 'road') assert.ok(pad.pathProgress > 0 && pad.pathProgress < metrics.total);
    }
    const pieces = derivePathPieces(level.path, identity);
    assert.equal(pieces[0].kind, 'cap');
    assert.equal(pieces.at(-1).kind, 'cap');
    assert.equal(pieces.filter(({ kind }) => kind === 'corner').length, level.path.length - 2);
    assert.equal(pieces.every(({ width }) => width === ROAD_WIDTH), true);
  }
});

test('Level 1 preserves the approved S route and every campaign route stays in the authored bounds', () => {
  assert.deepEqual(LEVELS[0].path, [
    { x: 238, y: 0 }, { x: 238, y: 72 },
    { x: 430, y: 72 }, { x: 430, y: 174 },
    { x: 158, y: 174 }, { x: 158, y: 300 },
    { x: 414, y: 300 }, { x: 414, y: 392 },
    { x: 252, y: 392 }, { x: 252, y: 500 },
    { x: 320, y: 500 },
  ]);
  for (const level of LEVELS) {
    const entrance = level.path[0];
    const castle = level.path.at(-1);
    assert.ok(entrance.x >= 120 && entrance.x <= 520, `${level.id} entrance x`);
    assert.ok(entrance.y >= 0 && entrance.y <= 24, `${level.id} entrance y`);
    assert.ok(castle.x >= 270 && castle.x <= 370, `${level.id} castle x`);
    assert.ok(castle.y >= 492 && castle.y <= 510, `${level.id} castle y`);
    assert.ok(level.path.length - 1 >= 7 && level.path.length - 1 <= 11, `${level.id} segment count`);
  }
});

test('pad letters, layers, and road fractions stay stable across every map', () => {
  for (const [index, level] of LEVELS.entries()) {
    const metrics = createPathMetrics(level.path);
    assert.deepEqual(level.pads.map(({ id }) => id), 'abcdefgh'.split('').map((letter) => `l${index + 1}-pad-${letter}`));
    assert.deepEqual(level.pads.map(({ layer }) => layer), [
      'road', 'grass', 'road', 'grass', 'road', 'grass', 'road', 'grass',
    ]);
    assert.deepEqual(
      level.pads.filter(({ layer }) => layer === 'road').map(({ pathProgress }) => Number((pathProgress / metrics.total).toFixed(2))),
      [0.18, 0.39, 0.62, 0.84],
    );
  }
});

test('path sampling clamps progress and road pieces preserve directional frames and trims', () => {
  const path = [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
  const metrics = createPathMetrics(path);
  assert.deepEqual(samplePathProgress(metrics, -10), { x: 0, y: 0 });
  assert.deepEqual(samplePathProgress(metrics, 50), { x: 0, y: 50 });
  assert.deepEqual(samplePathProgress(metrics, 150), { x: 50, y: 100 });
  assert.deepEqual(samplePathProgress(metrics, 900), { x: 100, y: 100 });
  assert.deepEqual(derivePathPieces(path, identity), [
    { kind: 'cap', frame: 'capSouth', x: 0, y: 0, length: 56, rotation: 0, width: 112 },
    { kind: 'straight', frame: 'vertical', x: 0, y: 50, length: 44, rotation: 0, width: 112 },
    { kind: 'corner', frame: 'northEast', x: 0, y: 100, length: 112, rotation: 0, width: 112 },
    { kind: 'straight', frame: 'horizontal', x: 50, y: 100, length: 44, rotation: 0, width: 112 },
    { kind: 'cap', frame: 'capWest', x: 100, y: 100, length: 56, rotation: 0, width: 112 },
  ]);
});

test('path pieces map every cardinal cap and corner direction to its atlas frame', () => {
  const framesFor = (path) => derivePathPieces(path, identity)
    .filter(({ kind }) => kind !== 'straight')
    .map(({ kind, frame }) => `${kind}:${frame}`);

  assert.deepEqual(framesFor([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }]), [
    'cap:capSouth', 'corner:northEast', 'cap:capWest',
  ]);
  assert.deepEqual(framesFor([{ x: 100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }]), [
    'cap:capWest', 'corner:eastSouth', 'cap:capNorth',
  ]);
  assert.deepEqual(framesFor([{ x: 0, y: 100 }, { x: 0, y: 0 }, { x: -100, y: 0 }]), [
    'cap:capNorth', 'corner:southWest', 'cap:capEast',
  ]);
  assert.deepEqual(framesFor([{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -100 }]), [
    'cap:capEast', 'corner:westNorth', 'cap:capSouth',
  ]);
});

test('path geometry rejects malformed, diagonal, too-short, and U-turn routes', () => {
  assert.throws(() => createPathMetrics(), /Path must contain at least two points/);
  assert.throws(() => createPathMetrics([]), /Path must contain at least two points/);
  assert.throws(() => createPathMetrics([{ x: 0, y: 0 }]), /Path must contain at least two points/);
  assert.throws(() => createPathMetrics([{ x: 0, y: 0 }, { x: 10, y: 10 }]), /Diagonal path segment 0/);
  assert.throws(() => createPathMetrics([{ x: 0, y: 0 }, { x: 0, y: 0 }]), /Empty path segment 0/);
  assert.throws(() => derivePathPieces([{ x: 0, y: 0 }, { x: 10, y: 10 }], identity), /Diagonal path segment 0/);
  assert.throws(() => derivePathPieces([{ x: 0, y: 0 }, { x: 0, y: 56 }], identity), /Projected path segment 0 is too short/);
  assert.throws(() => derivePathPieces([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 0 }], identity), /Invalid corner direction/);
});

test('grass pads retain 104 projected pixels of centerline clearance', () => {
  for (const level of LEVELS) {
    for (const pad of level.pads.filter(({ layer }) => layer === 'grass')) {
      const projectedPad = projectBattlefieldPoint(pad);
      const clearance = Math.min(...level.path.slice(1).map((point, index) => (
        distanceToSegment(projectedPad, projectBattlefieldPoint(level.path[index]), projectBattlefieldPoint(point))
      )));
      assert.ok(clearance >= 104, `${level.id} ${pad.id} has ${clearance.toFixed(3)}px clearance`);
    }
  }
});
