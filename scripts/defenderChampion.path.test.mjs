import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  ROAD_WIDTH,
  createPathMetrics,
  derivePathPieces,
  resolvePlacementPoint,
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
