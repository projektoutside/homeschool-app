import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  GRID, cellCenter, createGridPathMetrics, deriveRoadTiles,
  expandGridPath, parseCellId, sampleGridPathProgress, toCellId,
  validateGridLevel,
} from '../public/Games/DefenderChampion/src/core/grid-geometry.js';

const APPROVED_ROADS = Object.freeze({
  'level-1': 'r0c4 r1c4 r2c4 r2c5 r2c6 r2c7 r3c7 r4c7 r4c6 r4c5 r4c4 r4c3 r4c2 r5c2 r6c2 r7c2 r7c3 r7c4 r7c5 r7c6 r8c6 r9c6 r9c5 r9c4 r10c4 r11c4'.split(' '),
  'level-2': 'r0c1 r1c1 r2c1 r2c2 r2c3 r2c4 r2c5 r3c5 r4c5 r4c6 r4c7 r4c8 r5c8 r6c8 r6c7 r6c6 r6c5 r6c4 r6c3 r7c3 r8c3 r8c4 r8c5 r8c6 r8c7 r9c7 r10c7 r10c6 r10c5 r10c4 r11c4'.split(' '),
  'level-3': 'r0c7 r1c7 r1c6 r1c5 r1c4 r1c3 r2c3 r3c3 r3c2 r3c1 r3c0 r4c0 r5c0 r5c1 r5c2 r5c3 r5c4 r5c5 r6c5 r7c5 r7c6 r7c7 r7c8 r8c8 r9c8 r9c7 r9c6 r9c5 r9c4 r10c4 r11c4'.split(' '),
  'level-4': 'r0c2 r1c2 r2c2 r2c3 r2c4 r2c5 r2c6 r3c6 r3c5 r3c4 r3c3 r4c3 r5c3 r5c4 r5c5 r5c6 r5c7 r6c7 r7c7 r7c6 r7c5 r8c5 r9c5 r10c5 r10c4 r11c4'.split(' '),
  'level-5': 'r0c6 r1c6 r2c6 r2c5 r2c4 r2c3 r2c2 r3c2 r4c2 r4c3 r4c4 r4c5 r4c6 r4c7 r5c7 r6c7 r6c6 r6c5 r6c4 r6c3 r6c2 r6c1 r7c1 r8c1 r8c2 r8c3 r8c4 r8c5 r8c6 r9c6 r10c6 r10c5 r10c4 r11c4'.split(' '),
  'level-6': 'r0c4 r1c4 r1c5 r1c6 r1c7 r1c8 r2c8 r3c8 r3c7 r3c6 r3c5 r4c5 r5c5 r5c4 r5c3 r5c2 r5c1 r6c1 r7c1 r7c2 r7c3 r7c4 r7c5 r7c6 r7c7 r8c7 r9c7 r9c6 r9c5 r9c4 r9c3 r10c3 r11c3'.split(' '),
  'level-7': 'r0c5 r1c5 r2c5 r2c4 r2c3 r2c2 r2c1 r3c1 r4c1 r4c2 r4c3 r4c4 r4c5 r4c6 r5c6 r6c6 r6c7 r6c8 r7c8 r8c8 r8c7 r8c6 r8c5 r8c4 r8c3 r9c3 r10c3 r10c4 r11c4'.split(' '),
  'level-8': 'r0c1 r1c1 r2c1 r2c2 r2c3 r2c4 r2c5 r2c6 r3c6 r4c6 r4c5 r4c4 r4c3 r5c3 r6c3 r6c4 r6c5 r6c6 r6c7 r6c8 r7c8 r8c8 r8c7 r8c6 r8c5 r9c5 r10c5 r10c4 r11c4'.split(' '),
  'level-9': 'r0c7 r1c7 r2c7 r2c6 r2c5 r2c4 r2c3 r3c3 r4c3 r4c4 r4c5 r4c6 r5c6 r6c6 r6c5 r6c4 r6c3 r6c2 r7c2 r8c2 r8c3 r8c4 r8c5 r8c6 r8c7 r8c8 r9c8 r10c8 r10c7 r10c6 r10c5 r10c4 r11c4'.split(' '),
  'level-10': 'r0c2 r1c2 r2c2 r2c3 r2c4 r2c5 r2c6 r2c7 r3c7 r4c7 r4c6 r4c5 r4c4 r5c4 r6c4 r6c5 r6c6 r6c7 r6c8 r7c8 r8c8 r8c7 r8c6 r8c5 r8c4 r8c3 r8c2 r8c1 r9c1 r10c1 r10c2 r10c3 r10c4 r11c4'.split(' '),
});

test('the battlefield is a complete 9 by 12 square grid', () => {
  assert.deepEqual(GRID, { columns: 9, rows: 12, cellSize: 80, width: 720, height: 960 });
  assert.equal(toCellId(11, 8), 'r11c8');
  assert.deepEqual(parseCellId('r11c8'), { row: 11, column: 8 });
  assert.deepEqual(cellCenter('r0c0'), { x: 40, y: 40 });
  assert.deepEqual(cellCenter('r11c8'), { x: 680, y: 920 });
});

test('all ten levels partition 108 buildable cells around one simple road', () => {
  assert.equal(LEVELS.length, 10);
  for (const level of LEVELS) {
    assert.equal(validateGridLevel(level), true, level.id);
    assert.deepEqual(level.roadCells, APPROVED_ROADS[level.id], level.id);
    assert.equal(level.cells.length, 108, level.id);
    assert.equal(new Set(level.cells.map(({ id }) => id)).size, 108, level.id);
    assert.equal(level.cells.filter(({ terrain }) => terrain === 'road').length, level.roadCells.length);
    assert.equal(level.cells.filter(({ terrain }) => terrain === 'grass').length, 108 - level.roadCells.length);
    assert.equal(parseCellId(level.roadCells[0]).row, 0);
    assert.equal(parseCellId(level.roadCells.at(-1)).row, 11);
  }
});

test('grid progress clamps to literal road cell centers and every road tile is exactly square', () => {
  const road = ['r0c1', 'r1c1', 'r2c1', 'r2c2', 'r2c3'];
  const metrics = createGridPathMetrics(road);
  assert.equal(metrics.total, 320);
  assert.deepEqual(sampleGridPathProgress(metrics, -80), { x: 120, y: 40 });
  assert.deepEqual(sampleGridPathProgress(metrics, 0), { x: 120, y: 40 });
  assert.deepEqual(sampleGridPathProgress(metrics, 160), { x: 120, y: 200 });
  assert.deepEqual(sampleGridPathProgress(metrics, 320), { x: 280, y: 200 });
  assert.deepEqual(sampleGridPathProgress(metrics, 400), { x: 280, y: 200 });
  assert.equal(deriveRoadTiles(road).every(({ width, height }) => width === 80 && height === 80), true);
});

test('grid paths reject diagonal routes', () => {
  assert.throws(() => expandGridPath([{ row: 0, column: 0 }, { row: 1, column: 1 }]), /Diagonal grid path segment 0/);
});

test('grid paths reject repeated waypoints', () => {
  assert.throws(() => expandGridPath([{ row: 0, column: 0 }, { row: 0, column: 0 }]), /Repeated grid waypoint 0/);
});

test('grid paths reject out-of-bounds waypoints', () => {
  assert.throws(() => expandGridPath([{ row: 0, column: 0 }, { row: 12, column: 0 }]), /Grid cell out of bounds: r12c0/);
});

test('grid paths reject self-intersecting routes', () => {
  assert.throws(() => expandGridPath([
    { row: 0, column: 0 }, { row: 0, column: 2 }, { row: 1, column: 2 },
    { row: 1, column: 0 }, { row: 0, column: 0 },
  ]), /Grid path intersects itself at r0c0/);
});

test('grid level validation rejects reordered terrain cells', () => {
  const level = LEVELS[0];
  const reorderedCells = level.cells.map((cell) => ({ ...cell }));
  [reorderedCells[0], reorderedCells[1]] = [reorderedCells[1], reorderedCells[0]];
  assert.throws(
    () => validateGridLevel({ ...level, cells: reorderedCells }),
    /Grid level level-1 has invalid terrain at r0c0/,
  );
});

test('grid level validation rejects an incorrect terrain type', () => {
  const level = LEVELS[0];
  const wrongTerrainCells = level.cells.map((cell) => (
    cell.id === 'r0c0' ? { ...cell, terrain: 'road' } : { ...cell }
  ));
  assert.throws(
    () => validateGridLevel({ ...level, cells: wrongTerrainCells }),
    /Grid level level-1 has invalid terrain at r0c0/,
  );
});

test('road tiles derive every cap, straight, and corner frame from literal neighboring cells', () => {
  const tileFrames = (road) => deriveRoadTiles(road).map(({ kind, frame }) => `${kind}:${frame}`);
  assert.deepEqual(tileFrames(['r1c0', 'r1c1', 'r1c2']), [
    'cap:capEast', 'straight:horizontal', 'cap:capWest',
  ]);
  assert.deepEqual(tileFrames(['r0c1', 'r1c1', 'r2c1']), [
    'cap:capSouth', 'straight:vertical', 'cap:capNorth',
  ]);
  assert.deepEqual(tileFrames(['r0c1', 'r1c1', 'r1c2']), [
    'cap:capSouth', 'corner:northEast', 'cap:capWest',
  ]);
  assert.deepEqual(tileFrames(['r1c2', 'r1c1', 'r2c1']), [
    'cap:capWest', 'corner:eastSouth', 'cap:capNorth',
  ]);
  assert.deepEqual(tileFrames(['r2c1', 'r1c1', 'r1c0']), [
    'cap:capNorth', 'corner:southWest', 'cap:capEast',
  ]);
  assert.deepEqual(tileFrames(['r1c0', 'r1c1', 'r0c1']), [
    'cap:capEast', 'corner:westNorth', 'cap:capSouth',
  ]);
});
