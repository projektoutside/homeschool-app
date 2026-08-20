import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';
import {
  GRID, cellCenter, createGridPathMetrics, deriveRoadTiles,
  expandGridPath, parseCellId, sampleGridPathProgress, toCellId,
  validateGridLevel,
} from '../public/Games/DefenderChampion/src/core/grid-geometry.js';

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
    assert.equal(level.cells.length, 108, level.id);
    assert.equal(new Set(level.cells.map(({ id }) => id)).size, 108, level.id);
    assert.equal(level.cells.filter(({ terrain }) => terrain === 'road').length, level.roadCells.length);
    assert.equal(level.cells.filter(({ terrain }) => terrain === 'grass').length, 108 - level.roadCells.length);
    assert.equal(parseCellId(level.roadCells[0]).row, 0);
    assert.equal(parseCellId(level.roadCells.at(-1)).row, 11);
  }
});

test('grid progress samples cell centers and every road tile is exactly square', () => {
  const road = expandGridPath([{ row: 0, column: 1 }, { row: 2, column: 1 }, { row: 2, column: 3 }]);
  const metrics = createGridPathMetrics(road);
  assert.equal(metrics.total, 320);
  assert.deepEqual(sampleGridPathProgress(metrics, 0), { x: 120, y: 40 });
  assert.deepEqual(sampleGridPathProgress(metrics, 160), { x: 120, y: 200 });
  assert.deepEqual(sampleGridPathProgress(metrics, 320), { x: 280, y: 200 });
  assert.equal(deriveRoadTiles(road).every(({ width, height }) => width === 80 && height === 80), true);
});
