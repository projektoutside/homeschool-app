# Defender Champion Square Grid and Portrait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Defender Champion's circular eight-pad battlefield with a fully buildable 9 by 12 square grid, readable capped enemy combat, and a portrait-only responsive experience across phones and tablets.

**Architecture:** Add a deterministic grid model beside the fixed-step simulation, migrate build and lane ownership from pad IDs to cell IDs, and keep Phaser as a projection-only consumer of immutable snapshots and semantic events. A dedicated portrait controller composes orientation with existing host, visibility, manual, and modal pause reasons; balance is re-authored only after the new geometry and combat contracts are stable.

**Tech Stack:** JavaScript ES modules, Phaser 4.2.1, DOM/CSS, Node's built-in test runner, esbuild, Vite, Playwright/headed Chromium, Capacitor-compatible browser APIs.

**Spec:** `docs/superpowers/specs/2026-08-19-defender-champion-square-grid-portrait-design.md`

## Global Constraints

- Preserve the protected pre-existing modifications in `capacitor.config.json`, `public/Games/Quiz it Polygon!/js/app.bundle.js`, `public/Worksheets/manifest.json`, and `public/manifest.json`; never stage, revert, regenerate, or edit them.
- Keep Phaser at exactly 4.2.1 and add no runtime dependency.
- Keep the logical battlefield at exactly 720 by 960 with 9 columns, 12 rows, and 80 by 80 world-pixel cells.
- Every road cell is a melee build site; every grass cell is a ranged build site; one defender occupies one cell.
- No circular battlefield build, focus, selection, range, mastery, or danger marker may remain.
- Keep maximum living enemies at 18 and maximum simultaneous attackers per melee gate at three.
- Keep starting coins at 150, castle hearts at three, existing defender prices/roles, permanent melee defeat, and no-refund replacement.
- Preserve medals, contiguous unlocks, reward trust, audio/storage resilience, host lifecycle, ordinary-mode QA isolation, and the raw 15,000,000-byte first-load cap.
- Active gameplay is portrait-only. Landscape must display an accessible rotate overlay and compose a real pause reason.
- Use red-green-refactor TDD for every task. Do not change production behavior before witnessing the corresponding focused test fail.
- Classify execution as Tier 3 and use `.codex/skills/cross-device-quality-gate/SKILL.md`, `game-studio:phaser-2d-game`, and `game-studio:game-playtest` during implementation and final verification.

## File Structure

### New focused modules

- `public/Games/DefenderChampion/src/core/grid-geometry.js` — grid constants, cell IDs, route expansion, terrain generation, validation, path sampling, and square road-tile frame derivation.
- `public/Games/DefenderChampion/src/core/grid-placement.js` — pure build-cell compatibility, occupancy, and enemy-cover evaluation.
- `public/Games/DefenderChampion/src/grid-presentation.js` — pure square-cell display state, cell hit testing, tile-based range output, accessible labels, and readable sprite-scale contracts.
- `public/Games/DefenderChampion/src/ui/orientation-controller.js` — portrait detection, best-effort browser/native locking, rotate-overlay state, and cleanup.
- `scripts/defenderChampion.grid.test.mjs` — all ten map, terrain, geometry, tile-frame, and build-surface contracts.
- `scripts/defenderChampion.orientation.test.mjs` — executable portrait controller, pause composition, cleanup, and shell contracts.

### Existing modules changed

- `public/Games/DefenderChampion/src/config/levels.js` — ten grid routes, 108 cells per level, and wave/balance tuning.
- `public/Games/DefenderChampion/src/config/reference-strategies.js` — cell-based commands and twenty legal mixed-roster strategies.
- `public/Games/DefenderChampion/src/config/enemies.js` — only evidence-backed difficulty tuning required by the grid campaign.
- `public/Games/DefenderChampion/src/core/simulation.js` — `cellId` command/entity/snapshot schema, pending spawns, and terminal cleanup.
- `public/Games/DefenderChampion/src/core/wave-controller.js` — 18-living cap and deterministic FIFO pending queue.
- `public/Games/DefenderChampion/src/core/lane-combat.js` — cell-derived gates, fixed readable attacker/queue positions, and no density scaling.
- `public/Games/DefenderChampion/src/core/combat.js` — cell positions, capped Dread summons, and unchanged deterministic damage authority.
- `public/Games/DefenderChampion/src/presentation.js` — remove pad/ring helpers and retain combat motion, pooling, and shared unit transforms.
- `public/Games/DefenderChampion/src/scenes/BattleScene.js` — square terrain/cell rendering, full-cell input, fixed-scale unit art, and grid QA evidence.
- `public/Games/DefenderChampion/src/ui/hud-controller.js` — cell wording, grid focus, compact portrait dock, and rotate overlay integration.
- `public/Games/DefenderChampion/src/services/host-bridge.js` — add the `orientation` pause reason and setter.
- `public/Games/DefenderChampion/src/runtime-lifecycle.js` — destroy the portrait controller and preserve bfcache behavior.
- `public/Games/DefenderChampion/src/main.js` — create and connect the portrait controller.
- `public/Games/DefenderChampion/index.html` — square-grid instructions and semantic rotate screen.
- `public/Games/DefenderChampion/css/game.css` — no-scroll portrait sizing, safe areas, compact dock, and landscape cover.
- `public/Games/DefenderChampion/js/app.bundle.js` — generated only by `npm run build:defender-champion`.
- Existing `scripts/defenderChampion.*.test.mjs` suites — replace pad/path expectations with cell/grid, cap, visual, orientation, and balance expectations.

### Removed after all consumers migrate

- `public/Games/DefenderChampion/src/core/path-geometry.js` — superseded by `grid-geometry.js`.
- `scripts/defenderChampion.path.test.mjs` — superseded by `defenderChampion.grid.test.mjs`.

---

### Task 1: Deterministic Grid Geometry and Ten Map Definitions

**Files:**
- Create: `public/Games/DefenderChampion/src/core/grid-geometry.js`
- Create: `scripts/defenderChampion.grid.test.mjs`
- Modify: `public/Games/DefenderChampion/src/config/levels.js`

**Interfaces:**
- Produces: `GRID = { columns: 9, rows: 12, cellSize: 80, width: 720, height: 960 }`.
- Produces: `toCellId(row, column): string`, `parseCellId(cellId): { row, column }`, `cellCenter(cellId): { x, y }`.
- Produces: `expandGridPath(waypoints): readonly string[]`, `createTerrainCells(roadCells): readonly GridCell[]`, `validateGridLevel(level): true`.
- Produces: `createGridPathMetrics(roadCells)`, `sampleGridPathProgress(metrics, progress)`, and `deriveRoadTiles(roadCells)` for later core and Phaser tasks.
- Consumes: no new interfaces.

- [ ] **Step 1: Write the failing grid geometry tests**

Create `scripts/defenderChampion.grid.test.mjs` with executable contracts:

```js
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
```

- [ ] **Step 2: Run the new suite and witness RED**

Run:

```powershell
node --test scripts/defenderChampion.grid.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `core/grid-geometry.js`.

- [ ] **Step 3: Implement the pure grid module**

Create `grid-geometry.js` around these exact constants and signatures:

```js
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
```

Implement `expandGridPath` by walking one row or column at a time, rejecting diagonal, repeated, out-of-bounds, and self-intersecting cells. Implement `createTerrainCells` by enumerating rows then columns and assigning `terrain: roadSet.has(id) ? 'road' : 'grass'`. Implement metrics from adjacent cell centers, clamp sampling to `[0, total]`, and derive `horizontal`, `vertical`, four corner, and four cap frames solely from neighboring cell directions.

- [ ] **Step 4: Add all ten approved grid routes to level configuration**

Add immutable `roadCells` and `cells` to each level using these exact waypoint sets:

```js
const GRID_WAYPOINTS = Object.freeze({
  'level-1': [[0,4],[2,4],[2,7],[4,7],[4,2],[7,2],[7,6],[9,6],[9,4],[11,4]],
  'level-2': [[0,1],[2,1],[2,5],[4,5],[4,8],[6,8],[6,3],[8,3],[8,7],[10,7],[10,4],[11,4]],
  'level-3': [[0,7],[1,7],[1,3],[3,3],[3,0],[5,0],[5,5],[7,5],[7,8],[9,8],[9,4],[11,4]],
  'level-4': [[0,2],[2,2],[2,6],[3,6],[3,3],[5,3],[5,7],[7,7],[7,5],[10,5],[10,4],[11,4]],
  'level-5': [[0,6],[2,6],[2,2],[4,2],[4,7],[6,7],[6,1],[8,1],[8,6],[10,6],[10,4],[11,4]],
  'level-6': [[0,4],[1,4],[1,8],[3,8],[3,5],[5,5],[5,1],[7,1],[7,7],[9,7],[9,3],[11,3]],
  'level-7': [[0,5],[2,5],[2,1],[4,1],[4,6],[6,6],[6,8],[8,8],[8,3],[10,3],[10,4],[11,4]],
  'level-8': [[0,1],[2,1],[2,6],[4,6],[4,3],[6,3],[6,8],[8,8],[8,5],[10,5],[10,4],[11,4]],
  'level-9': [[0,7],[2,7],[2,3],[4,3],[4,6],[6,6],[6,2],[8,2],[8,8],[10,8],[10,4],[11,4]],
  'level-10': [[0,2],[2,2],[2,7],[4,7],[4,4],[6,4],[6,8],[8,8],[8,1],[10,1],[10,4],[11,4]],
});
const waypoints = (levelId) => GRID_WAYPOINTS[levelId]
  .map(([row, column]) => ({ row, column }));
```

During Task 1 only, retain existing `path` and `pads` properties unchanged as a migration bridge so the old battle renderer stays runnable. Mark their removal in Task 5; do not add any new consumer of those fields.

- [ ] **Step 5: Run grid and existing configuration tests GREEN**

Run:

```powershell
node --test scripts/defenderChampion.grid.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.path.test.mjs
```

Expected: PASS with all level objects deeply frozen and the new grid contracts green.

- [ ] **Step 6: Commit the grid foundation**

```powershell
git add public/Games/DefenderChampion/src/core/grid-geometry.js public/Games/DefenderChampion/src/config/levels.js scripts/defenderChampion.grid.test.mjs
git commit -m "feat: add Defender Champion square maps"
```

### Task 2: Cell-Based Placement and Simulation Schema

**Files:**
- Create: `public/Games/DefenderChampion/src/core/grid-placement.js`
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `public/Games/DefenderChampion/src/core/combat.js`
- Modify: `public/Games/DefenderChampion/src/presentation.js`
- Modify: `public/Games/DefenderChampion/src/services/asset-loader.js`
- Modify: `scripts/defenderChampion.simulation.test.mjs`
- Modify: `scripts/defenderChampion.combat.test.mjs`

**Interfaces:**
- Consumes: `GRID`, `cellCenter`, `createGridPathMetrics`, and level `cells`/`roadCells` from Task 1.
- Produces: `getGridCell(level, cellId)`, `isRoadCellEnemyCovered({ level, enemies, cellId })`, and `evaluateCellBuild({ level, defender, towers, enemies, cellId })`.
- Produces: build command `{ type: 'build', defenderId, cellId }`; tower and purchase snapshots use `cellId`.
- Produces: deterministic strategy metric `occupiedCellIds: readonly string[]`.

- [ ] **Step 1: Add RED placement contracts**

Add tests that iterate all 108 cells and both defenders for each terrain on fresh simulations:

```js
test('every free road and grass cell accepts exactly its matching defenders', () => {
  for (const level of LEVELS) {
    for (const cell of level.cells) {
      for (const defenderId of ['bladeguard', 'ironwarden', 'ranger', 'rune-artificer']) {
        const simulation = createSimulation(level.id, { qa: true });
        simulation.coins = 10_000;
        const result = issueCommand(simulation, { type: 'build', defenderId, cellId: cell.id });
        const expected = DEFENDERS[defenderId].placementLayer === cell.terrain;
        assert.equal(result.accepted, expected, `${level.id} ${cell.id} ${defenderId}`);
        assert.equal(simulation.coins < 10_000, expected);
      }
    }
  }
});

test('an enemy-covered road cell rejects atomically until it clears', () => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.enemies.push({ id: 'enemy-1', health: 10, pathProgress: 160 });
  const cellId = simulation.level.roadCells[2];
  assert.deepEqual(issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId }), {
    accepted: false,
    reason: 'enemy-occupied',
  });
  assert.equal(simulation.coins, 150);
  simulation.enemies[0].pathProgress = 241;
  assert.equal(issueCommand(simulation, { type: 'build', defenderId: 'bladeguard', cellId }).accepted, true);
});
```

- [ ] **Step 2: Run focused tests and witness RED**

```powershell
node --test --test-name-pattern="every free road|enemy-covered road" scripts/defenderChampion.simulation.test.mjs
```

Expected: FAIL because `cellId` commands are not recognized.

- [ ] **Step 3: Implement pure placement evaluation**

Create `grid-placement.js` with a single authoritative result shape:

```js
export const evaluateCellBuild = ({ level, defender, towers = [], enemies = [], cellId } = {}) => {
  const cell = level?.cells?.find(({ id }) => id === cellId) ?? null;
  if (!cell) return Object.freeze({ accepted: false, cell: null, reason: 'invalid-cell' });
  if (cell.terrain !== defender?.placementLayer) {
    return Object.freeze({ accepted: false, cell, reason: 'placement-layer-mismatch' });
  }
  if (towers.some((tower) => tower.cellId === cellId)) {
    return Object.freeze({ accepted: false, cell, reason: 'cell-occupied' });
  }
  if (cell.terrain === 'road' && isRoadCellEnemyCovered({ level, enemies, cellId })) {
    return Object.freeze({ accepted: false, cell, reason: 'enemy-occupied' });
  }
  return Object.freeze({ accepted: true, cell, reason: null });
};
```

Define enemy coverage as a living enemy whose clamped path progress lies within 40 world pixels of the road cell's `index * GRID.cellSize` progress.

- [ ] **Step 4: Migrate simulation entities and snapshots to `cellId`**

Change new builds, upgrades, purchases, summaries, fixture metrics, and tower-position lookup to `cellId`. Update rejection copy exactly:

```js
const rejectionMessages = {
  'invalid-cell': 'Choose a square on the battlefield.',
  'cell-occupied': 'That square already has a defender.',
  'enemy-occupied': 'Enemies must clear that road square before you can build there.',
  'placement-layer-mismatch': selectedLayer === 'road'
    ? 'Choose a road square for this melee defender.'
    : 'Choose a grass square for this ranged defender.',
};
```

Keep a narrow legacy adapter for existing `padId` reference fixtures until Tasks 7 and 8 rewrite all strategies. Map road letters `a/c/e/g` to the road cells at rounded fractions `0.18/0.39/0.62/0.84`. Map grass letters `b/d/f/h` to four unique grass cells whose centers are nearest to the old authored grass coordinates, breaking equal distances by row then column. Store the resulting translation as deprecated `{ id, cellId }` records. Translate the old command immediately to a cell ID and never expose `padId` in new snapshots.

- [ ] **Step 5: Run placement, combat, and snapshot tests GREEN**

```powershell
node --test scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.config.test.mjs
```

Expected: PASS; new snapshots contain `cellId` and no newly built tower depends on arbitrary x/y placement.

- [ ] **Step 6: Commit cell-based simulation placement**

```powershell
git add public/Games/DefenderChampion/src/core/grid-placement.js public/Games/DefenderChampion/src/core/simulation.js public/Games/DefenderChampion/src/core/combat.js public/Games/DefenderChampion/src/presentation.js scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs
git commit -m "feat: build Defender units on grid cells"
```

### Task 3: Capped Scheduled and Boss Spawning

**Files:**
- Modify: `public/Games/DefenderChampion/src/core/wave-controller.js`
- Modify: `public/Games/DefenderChampion/src/core/combat.js`
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `scripts/defenderChampion.simulation.test.mjs`
- Modify: `scripts/defenderChampion.combat.test.mjs`

**Interfaces:**
- Produces: `MAX_LIVING_ENEMIES = 18`.
- Produces: `enqueueEnemySpawn(simulation, request)` and `flushPendingEnemySpawns(simulation)`.
- Produces: snapshot fields `pendingSpawnCount`, `livingEnemyCap`, and `maximumLivingEnemies`.
- Consumes: existing enemy configuration and semantic presentation events.

- [ ] **Step 1: Write RED cap, FIFO, pause, summon, and cleanup tests**

```js
test('scheduled enemies never exceed 18 living and preserve FIFO order', () => {
  const simulation = createSimulation('level-10', { qa: true });
  simulation.waveSchedule = Array.from({ length: 30 }, (_, index) => ({
    enemyId: index % 2 ? 'skitter' : 'swarmkin', spawnTick: 0, waveIndex: 0,
  }));
  advanceSimulation(simulation, 1);
  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.pendingSpawns.length, 12);
  const firstPending = simulation.pendingSpawns[0];
  simulation.enemies.shift();
  advanceSimulation(simulation, 1);
  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.enemies.at(-1).enemyId, firstPending.enemyId);
});

test('Dread summons wait behind the same living cap', () => {
  const boss = createCombatEnemy('enemy-1', 'dread-colossus', {
    health: 7_400,
    maxHealth: 10_000,
    speed: 0,
  });
  const fillers = Array.from({ length: 17 }, (_, index) => createCombatEnemy(
    `enemy-${index + 2}`,
    'blight-walker',
    { health: 10_000, maxHealth: 10_000, speed: 0 },
  ));
  const simulation = createTowerCombat('bladeguard', 0, 0, [boss, ...fillers]);
  simulation.towers = [];
  simulation.pendingSpawns = [];
  simulation.tick = 0;
  stepCombat(simulation);
  for (let tick = 1; tick <= 60; tick += 1) {
    simulation.tick = tick;
    stepCombat(simulation);
  }
  assert.equal(simulation.enemies.length, 18);
  assert.equal(simulation.pendingSpawns.length, 6);
  assert.deepEqual(
    simulation.pendingSpawns.map(({ enemyId, isSummon }) => ({ enemyId, isSummon })),
    Array.from({ length: 6 }, () => ({ enemyId: 'swarmkin', isSummon: true })),
  );
});
```

- [ ] **Step 2: Run the focused tests and witness RED**

```powershell
node --test --test-name-pattern="never exceed 18|summons wait" scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs
```

Expected: FAIL because schedule and Dread code push directly into `simulation.enemies`.

- [ ] **Step 3: Centralize enemy creation and pending FIFO behavior**

Use this state and request contract:

```js
// simulation state
pendingSpawns: [],
nextSpawnSequence: 1,

// request
{
  enemyId,
  isSummon: false,
  pathProgress: 0,
  requestedTick: simulation.tick,
  sequence: simulation.nextSpawnSequence++,
  waveIndex,
}
```

`spawnScheduledEnemies` moves every schedule entry with `spawnTick <= simulation.tick` into the pending queue, then flushes while living count is below 18. `summonDreadPack` enqueues six `swarmkin` requests instead of pushing entities. Set `spawnedAllWaves` only when the schedule index is exhausted and `pendingSpawns.length === 0`.

- [ ] **Step 4: Make pause, terminal, restart, and snapshots cap-safe**

Paused ticks do not enqueue or flush. Terminal completion requires `spawnedAllWaves`, no pending requests, no living enemies, and no projectiles. Restart creates a new empty pending queue; teardown clears it. Summary cloning must not leak mutable request references. Update `maximumLivingEnemies` after each flush with `Math.max(previousMaximum, simulation.enemies.length)` and include it in deterministic summaries.

- [ ] **Step 5: Run cap and full simulation/combat suites GREEN**

```powershell
node --test scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.lane-combat.test.mjs
```

Expected: PASS with maximum observed living count exactly 18 in the stress fixture.

- [ ] **Step 6: Commit capped spawning**

```powershell
git add public/Games/DefenderChampion/src/core/wave-controller.js public/Games/DefenderChampion/src/core/combat.js public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs
git commit -m "feat: cap Defender enemy population"
```

### Task 4: Grid-Derived Gates, Queues, and Fixed Unit Scale

**Files:**
- Modify: `public/Games/DefenderChampion/src/core/lane-combat.js`
- Modify: `public/Games/DefenderChampion/src/core/combat.js`
- Modify: `public/Games/DefenderChampion/src/core/wave-controller.js`
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `scripts/defenderChampion.lane-combat.test.mjs`
- Modify: `scripts/defenderChampion.combat.test.mjs`

**Interfaces:**
- Consumes: tower `cellId`, `GRID.cellSize`, grid metrics, and the Task 3 spawn queue.
- Produces: `getGateProgress(level, cellId): number` and `deriveReadableSpawnCapacity(simulation): number`.
- Produces: enemy display positions with `displayScale: 1`; density never changes body scale.
- Produces: deterministic summary high-water field `maximumConcurrentAttackers`.

- [ ] **Step 1: Replace the 160-body density fixture with RED 18-body grid fixtures**

```js
const createGridLaneFixture = ({ gateCellId, enemyCount }) => {
  const simulation = createSimulation('level-1', { qa: true });
  simulation.waveSchedule = [];
  simulation.pendingSpawns = [];
  simulation.spawnedAllWaves = true;
  simulation.coins = 10_000;
  assert.equal(issueCommand(simulation, {
    type: 'build', defenderId: 'bladeguard', cellId: gateCellId,
  }).accepted, true);
  const gateProgress = simulation.level.roadCells.indexOf(gateCellId) * 80;
  simulation.enemies = Array.from({ length: enemyCount }, (_, index) => createEnemy({
    id: `enemy-${index + 20}`,
    pathProgress: Math.max(0, gateProgress - 1),
    spawnTick: index,
  }));
  simulation.pathMetrics = createGridPathMetrics(simulation.level.roadCells);
  return simulation;
};

test('a road-cell defender owns one whole-lane grid gate with three attackers', () => {
  const gateCellId = LEVELS[0].roadCells[20];
  const simulation = createGridLaneFixture({ gateCellId, enemyCount: 18 });
  const state = assignLanePositions(simulation);
  assert.equal(state.gates[0].pathProgress, 20 * 80);
  assert.equal(state.gates[0].attackerIds.length, 3);
  assert.equal(state.gates[0].queuedIds.length, 15);
  assert.equal(simulation.enemies.every(({ displayScale }) => displayScale === 1), true);
  assert.equal(new Set(simulation.enemies.map(({ displayPathProgress }) => displayPathProgress)).size, 18);
});

test('an early gate backpressures new spawns before queue art overlaps', () => {
  const gateCellId = LEVELS[0].roadCells[2];
  const simulation = createGridLaneFixture({ gateCellId, enemyCount: 3 });
  assert.equal(deriveReadableSpawnCapacity(simulation), 5);
});
```

- [ ] **Step 2: Run lane tests and witness RED**

```powershell
node --test --test-name-pattern="road-cell defender|early gate backpressures" scripts/defenderChampion.lane-combat.test.mjs
```

Expected: FAIL because gates still look up `padId`, road width is 112, and dense queues reduce `displayScale`.

- [ ] **Step 3: Derive gates and lane slots from grid progress**

Use fixed constants:

```js
const MAX_ATTACKERS_PER_GATE = 3;
const ATTACKER_OFFSETS = Object.freeze([-22, 0, 22]);
const ATTACK_CONTACT_PROGRESS = 28;
const QUEUE_SPACING = 48;
```

Find gates from living frontline towers whose `cellId` is a road cell. Gate progress is `roadIndex * 80`. Keep stable attacker ordering, deterministic wind-up/impact, fallback gates, stun behavior, and next-tick release. Assign every enemy `displayScale = 1`; queue positions step backward by 48 progress and use bounded offsets without leaving the 80-pixel road footprint. After every lane assignment, update `simulation.maximumConcurrentAttackers` from the largest living tower `engagedEnemyIds.length` and include it in deterministic and presentation summaries.

- [ ] **Step 4: Backpressure pending spawns when an early gate lacks readable road space**

`deriveReadableSpawnCapacity` returns 18 when no gate exists. With a gate, it returns `Math.min(18, 3 + completeUpstreamRoadCells)`, never below three. `flushPendingEnemySpawns` honors the smaller of 18 and this readable capacity. Existing living enemies are never deleted when the player builds a new early gate; only additional spawns wait.

- [ ] **Step 5: Run lane, combat, and simulation suites GREEN**

```powershell
node --test scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.simulation.test.mjs
```

Expected: PASS; no fixture contains density-driven `displayScale < 1`, no enemy crosses a living gate, no spawn order changes, and the existing synthetic `attackTargets: ['backline']` enemy still selects a living grass defender without adding a mage to campaign data.

- [ ] **Step 6: Commit grid lane combat**

```powershell
git add public/Games/DefenderChampion/src/core/lane-combat.js public/Games/DefenderChampion/src/core/combat.js public/Games/DefenderChampion/src/core/wave-controller.js public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.combat.test.mjs
git commit -m "feat: align Defender combat to square roads"
```

### Task 5: Square Phaser Battlefield, Input, and Visible Unit Art

**Files:**
- Create: `public/Games/DefenderChampion/src/grid-presentation.js`
- Modify: `public/Games/DefenderChampion/src/scenes/BattleScene.js`
- Modify: `public/Games/DefenderChampion/src/config/levels.js`
- Modify: `public/Games/DefenderChampion/src/presentation.js`
- Modify: `public/Games/DefenderChampion/src/ui/hud-controller.js`
- Modify: `public/Games/DefenderChampion/index.html`
- Modify: `scripts/defenderChampion.runtime.test.mjs`
- Modify: `scripts/defenderChampion.build.test.mjs`
- Modify: `scripts/defenderChampion.config.test.mjs`
- Delete: `public/Games/DefenderChampion/src/core/path-geometry.js`
- Delete: `scripts/defenderChampion.path.test.mjs`

**Interfaces:**
- Consumes: grid cells, road tiles, `cellId` snapshots, and fixed display scale from Tasks 1–4.
- Produces: `resolveCellFromWorldPoint(point)`, `resolveCellVisualState(input)`, `resolveSquareRangeCells(input)`, `resolveGridFocusMove(input)`, `resolveReadableSpriteScale(input)`, and `formatCellAccessibleLabel(input)`.
- Produces: QA text with 108 cell records, road-tile rectangles, one visual per living unit, and no circular marker record.

- [ ] **Step 1: Add RED pure-presentation and BattleScene contracts**

```js
test('world points and keyboard moves resolve exact square cells', async () => {
  const grid = await import('../public/Games/DefenderChampion/src/grid-presentation.js');
  assert.equal(grid.resolveCellFromWorldPoint({ x: 0, y: 0 }), 'r0c0');
  assert.equal(grid.resolveCellFromWorldPoint({ x: 719.99, y: 959.99 }), 'r11c8');
  assert.equal(grid.resolveGridFocusMove({ cellId: 'r4c4', key: 'ArrowRight' }), 'r4c5');
  assert.equal(grid.resolveGridFocusMove({ cellId: 'r4c4', key: 'ArrowDown' }), 'r5c4');
});

test('range and danger presentation returns square cell IDs, never radii', async () => {
  const { resolveSquareRangeCells } = await import('../public/Games/DefenderChampion/src/grid-presentation.js');
  const result = resolveSquareRangeCells({ originCellId: 'r6c4', range: 160, targetTerrain: 'road', level: LEVELS[0] });
  assert.equal(result.every((entry) => typeof entry.cellId === 'string'), true);
  assert.equal(result.every((entry) => !('radius' in entry)), true);
});

test('BattleScene source contains no circular battlefield drawing primitive', async () => {
  const source = await readGameFile('src/scenes/BattleScene.js');
  assert.doesNotMatch(source, /strokeEllipse|fillCircle|strokeCircle|rangeRing|padSprites|POINTER_HIT_RADIUS/);
});
```

- [ ] **Step 2: Run runtime tests and witness RED**

```powershell
node --test --test-name-pattern="exact square cells|never radii|no circular battlefield" scripts/defenderChampion.runtime.test.mjs
```

Expected: FAIL because the pure module is missing and BattleScene still uses pad images and `strokeEllipse`.

- [ ] **Step 3: Implement pure grid presentation helpers**

`resolveCellVisualState` returns this exact shape:

```js
{
  acceptsBuild: Boolean(selectedLayer && selectedLayer === terrain && !occupied && !enemyCovered),
  borderAlpha,
  borderColor,
  fillAlpha,
  fillColor,
  focused,
  occupied,
  terrain,
}
```

`resolveSquareRangeCells` compares world-space cell centers to the configured numeric range and returns `{ cellId, inRange: true }` only for requested terrain. `resolveReadableSpriteScale` uses metadata frame height and current CSS world scale to enforce 44 CSS pixels for defenders, 38 CSS pixels for standard enemies, and 52 CSS pixels for bosses without population-based input.

- [ ] **Step 4: Replace road pieces and circular pads with 108 square cells**

In `BattleScene.createBattlefield`:

```js
this.cellViews = new Map();
for (const cell of this.level.cells) {
  const center = cellCenter(cell.id);
  const view = this.createCellView(cell, center);
  view.setSize(80, 80).setInteractive();
  this.cellViews.set(cell.id, view);
}
for (const tile of deriveRoadTiles(this.level.roadCells)) {
  this.add.image(tile.x, tile.y, 'environment-path-atlas', PATH_FRAME[tile.frame])
    .setDisplaySize(80, 80)
    .setDepth(1);
}
```

Grass uses the approved base texture plus restrained rectangular grid graphics. Cell borders, focus, compatibility, unavailable state, range, mastery coverage, and boss warnings use `fillRect`/`strokeRect` aligned to cell bounds. Remove gameplay-atlas build-pad/range-marker usage from the battlefield.

- [ ] **Step 5: Migrate pointer, touch, keyboard, tower selection, and announcements**

Pointer conversion must recompute the actual canvas rectangle after `focus({ preventScroll: true })`, map through one uniform contain transform, and resolve one cell by `floor(world / 80)`. Keyboard focus tracks `focusedCellId`, not an array index. Build dispatch is `{ type: 'build', defenderId, cellId }`. Use labels such as `Road square row 5 column 8, available for Road melee` and `Grass square row 7 column 4, occupied by Ranger`.

- [ ] **Step 6: Keep individual art readable and pools bounded**

Create defender pools for at most 108 occupied cells and enemy pools for 18 living enemies plus terminal defeat transients. Delete queue-density cues and density scale logic. Apply one shared body transform to body, health, plates, aura, projectile launch/target, telegraph, hit label, and defeat effect. Assert one active enemy view per living snapshot and no missing view at cap.

- [ ] **Step 7: Remove the presentation migration bridge**

Remove BattleScene and presentation use of `level.path`, `level.pads`, path projection imports, `path-geometry.js`, and `defenderChampion.path.test.mjs`. Strip the deprecated level `path` field and old gameplay-atlas build-pad/range-marker keys; update the asset usage description to projectiles/effects only. Retain only the temporary `pads: [{ id, cellId }]` strategy translation table and core `padId` adapter until Task 8 converts the final reference strategies. Search must return no obsolete presentation result:

```powershell
rg -n "level\.path|level\.pads|padSprites|path-geometry|strokeEllipse|fillCircle|strokeCircle" public/Games/DefenderChampion/src/scenes public/Games/DefenderChampion/src/presentation.js public/Games/DefenderChampion/src/grid-presentation.js
```

Expected: no matches.

- [ ] **Step 8: Run runtime, build, core, and syntax gates GREEN**

```powershell
node --test scripts/defenderChampion.grid.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.combat.test.mjs
npm run build:defender-champion
Get-ChildItem public/Games/DefenderChampion/src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Expected: PASS; generated bundle contains the new cell presentation and ordinary mode still exposes no QA hook.

- [ ] **Step 9: Commit the square battlefield**

```powershell
git add public/Games/DefenderChampion/src public/Games/DefenderChampion/index.html public/Games/DefenderChampion/js/app.bundle.js scripts/defenderChampion.grid.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.build.test.mjs scripts/defenderChampion.path.test.mjs
git commit -m "feat: render Defender Champion square battlefield"
```

### Task 6: Portrait-Only Shell and Orientation Lifecycle

**Files:**
- Create: `public/Games/DefenderChampion/src/ui/orientation-controller.js`
- Create: `scripts/defenderChampion.orientation.test.mjs`
- Modify: `public/Games/DefenderChampion/src/main.js`
- Modify: `public/Games/DefenderChampion/src/phaser-entry.js`
- Modify: `public/Games/DefenderChampion/src/runtime-lifecycle.js`
- Modify: `public/Games/DefenderChampion/src/services/host-bridge.js`
- Modify: `public/Games/DefenderChampion/src/ui/hud-controller.js`
- Modify: `public/Games/DefenderChampion/index.html`
- Modify: `public/Games/DefenderChampion/css/game.css`
- Modify: `scripts/defenderChampion.host.test.mjs`
- Modify: `scripts/defenderChampion.runtime.test.mjs`

**Interfaces:**
- Produces: `createOrientationController({ windowRef, documentRef, hostBridge }): { start, stop, requestPortraitLock, getState }`.
- Produces: `hostBridge.setOrientationPaused(active)` and ordered pause reason `orientation`.
- Consumes: existing host pause callback, audio controller, HUD, and runtime teardown.

- [ ] **Step 1: Add RED orientation and portrait-shell tests**

```js
test('landscape covers the product and composes orientation pause', () => {
  const fixture = createOrientationFixture({ width: 844, height: 390 });
  const controller = createOrientationController(fixture);
  controller.start();
  assert.equal(fixture.overlay.hidden, false);
  assert.deepEqual(fixture.hostBridge.calls, [true]);
  fixture.resizeTo(390, 844);
  assert.equal(fixture.overlay.hidden, true);
  assert.deepEqual(fixture.hostBridge.calls, [true, false]);
  controller.stop();
  assert.equal(fixture.listenerCount(), 0);
});

test('portrait CSS uses a definite safe-height 3 by 4 battlefield without document scrolling', async () => {
  const [html, css] = await Promise.all([readGameFile('index.html'), readGameFile('css/game.css')]);
  assert.match(html, /id="portrait-lock-screen"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(css, /#battlefield[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(css, /#battle-screen[\s\S]*height:\s*calc\(100dvh/);
});
```

- [ ] **Step 2: Run orientation and host tests and witness RED**

```powershell
node --test scripts/defenderChampion.orientation.test.mjs scripts/defenderChampion.host.test.mjs
```

Expected: FAIL because no portrait controller or orientation pause reason exists.

- [ ] **Step 3: Implement orientation controller and host pause composition**

```js
export const createOrientationController = ({ windowRef, documentRef, hostBridge } = {}) => {
  const overlay = documentRef.getElementById('portrait-lock-screen');
  const shell = documentRef.getElementById('game-shell');
  let returnFocus = null;
  let portrait = true;
  const sync = () => {
    const wasPortrait = portrait;
    portrait = windowRef.innerHeight >= windowRef.innerWidth;
    if (!portrait && wasPortrait) returnFocus = documentRef.activeElement;
    overlay.hidden = portrait;
    shell.inert = !portrait;
    documentRef.documentElement.dataset.orientation = portrait ? 'portrait' : 'landscape';
    hostBridge.setOrientationPaused(!portrait);
    if (!portrait && wasPortrait) overlay.focus();
    else if (portrait && !wasPortrait && returnFocus?.isConnected) returnFocus.focus();
  };
  const requestPortraitLock = async () => {
    try { await windowRef.screen?.orientation?.lock?.('portrait'); return true; }
    catch { return false; }
  };
  return Object.freeze({
    start() { windowRef.addEventListener('resize', sync); windowRef.addEventListener('orientationchange', sync); sync(); },
    stop() { windowRef.removeEventListener('resize', sync); windowRef.removeEventListener('orientationchange', sync); },
    requestPortraitLock,
    getState: () => ({ portrait }),
  });
};
```

Add `orientation` to the host bridge pause order and expose `setOrientationPaused`. Construct and start the controller before creating Phaser so the initial landscape state exists. In `phaser-entry.js` preBoot, sleep the game loop when `hostBridge.getPauseState().paused` is already true. Update the main pause callback to sleep/wake the loop as well as pause/resume active scenes, ensuring a landscape-at-load Boot scene cannot advance. Request lock after the first pointer/keyboard gesture without treating API rejection as an error. Stop the controller from runtime teardown.

- [ ] **Step 4: Add the semantic rotate overlay and no-scroll portrait layout**

Add:

```html
<section id="portrait-lock-screen" role="dialog" aria-modal="true" aria-labelledby="portrait-lock-title" tabindex="-1" hidden>
  <div class="storybook-card portrait-lock-card">
    <p class="eyebrow">Portrait mission</p>
    <h2 id="portrait-lock-title">Rotate your device</h2>
    <p>Defender Champion plays in portrait so every square and unit stays visible.</p>
  </div>
</section>
```

Place the rotate section immediately after `</main>` so making `#game-shell` inert cannot disable the dialog. Trap Tab and Shift+Tab on the dialog while landscape. CSS must set the active battle shell to the safe `100dvh` height, compute the largest contained 3:4 battlefield after HUD/dock reservations, keep all enabled controls at least 44 CSS pixels, use a compact two-row dock at 360 by 640, and cover all screens in landscape. No active-battle document scroll is permitted.

- [ ] **Step 5: Run orientation, host, runtime, CSS, and bundle gates GREEN**

```powershell
node --test scripts/defenderChampion.orientation.test.mjs scripts/defenderChampion.host.test.mjs scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.build.test.mjs
npm run build:defender-champion
```

Expected: PASS; pause state survives host+orientation overlap and clears only the orientation reason when portrait returns.

- [ ] **Step 6: Commit portrait-only behavior**

```powershell
git add public/Games/DefenderChampion/src/ui/orientation-controller.js public/Games/DefenderChampion/src/main.js public/Games/DefenderChampion/src/phaser-entry.js public/Games/DefenderChampion/src/runtime-lifecycle.js public/Games/DefenderChampion/src/services/host-bridge.js public/Games/DefenderChampion/src/ui/hud-controller.js public/Games/DefenderChampion/index.html public/Games/DefenderChampion/css/game.css public/Games/DefenderChampion/js/app.bundle.js scripts/defenderChampion.orientation.test.mjs scripts/defenderChampion.host.test.mjs scripts/defenderChampion.runtime.test.mjs
git commit -m "feat: lock Defender Champion to portrait"
```

### Task 7: Levels 1–6 Grid Strategies and Balance

**Files:**
- Modify: `public/Games/DefenderChampion/src/config/reference-strategies.js`
- Modify: `public/Games/DefenderChampion/src/config/levels.js`
- Modify: `public/Games/DefenderChampion/src/config/enemies.js` only if mixed strategies cannot meet the approved assertions through wave/strategy changes
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `scripts/defenderChampion.balance.test.mjs`
- Modify: `scripts/defenderChampion.config.test.mjs`
- Modify: `scripts/defenderChampion.simulation.test.mjs`

**Interfaces:**
- Consumes: `{ type: 'build', defenderId, cellId }` and the final grid maps.
- Produces: legal `level-1` through `level-6` balanced/artillery strategies and exact deterministic evidence metrics.
- Produces: `issueStrategyCommand(simulation, command, towerRefs)` for stable cell-based build references and upgrades.

- [ ] **Step 1: Strengthen balance tests before changing strategies**

For Levels 1–6, require no-build defeat, two victories, cell legality, different highest-spend defenders, at least 25% occupied-cell difference, maximum 18 living, maximum three attackers, and permanent defeat+repurchase in Level 4:

```js
const occupiedDifference = (first, second) => {
  const union = new Set([...first.occupiedCellIds, ...second.occupiedCellIds]);
  const shared = first.occupiedCellIds.filter((id) => second.occupiedCellIds.includes(id)).length;
  return union.size === 0 ? 0 : (union.size - shared) / union.size;
};

for (const level of LEVELS.slice(0, 6)) {
  const balanced = runStrategyFixture(level.id, `${level.id}-balanced`);
  const artillery = runStrategyFixture(level.id, `${level.id}-artillery`);
  assert.equal(balanced.outcome, 'victory', `${level.id} balanced`);
  assert.equal(artillery.outcome, 'victory', `${level.id} artillery`);
  assert.notEqual(balanced.highestSpendDefenderId, artillery.highestSpendDefenderId);
  assert.ok(occupiedDifference(balanced, artillery) >= 0.25);
}
```

- [ ] **Step 2: Run Levels 1–6 balance and witness RED**

```powershell
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
```

Expected: FAIL because old strategies use removed pad IDs and old path timing.

- [ ] **Step 3: Re-author the twelve Levels 1–6 strategy arrays**

Use a cell command helper:

```js
const build = (tick, ref, defenderId, cellId) => Object.freeze({
  tick, type: 'build', ref, defenderId, cellId,
});
const upgrade = (tick, ref) => Object.freeze({ tick, type: 'upgrade-ref', ref });

const EARLY_CELL_BLUEPRINTS = Object.freeze({
  'level-1': { roads: ['r2c6','r4c3','r7c5','r9c5'], grass: ['r1c6','r3c3','r6c5','r8c5'] },
  'level-2': { roads: ['r2c4','r6c8','r8c5','r10c6'], grass: ['r1c4','r7c8','r7c5','r9c6'] },
  'level-3': { roads: ['r1c3','r5c1','r7c8','r9c5'], grass: ['r1c2','r4c1','r6c8','r8c5'] },
  'level-4': { roads: ['r2c4','r4c3','r7c7','r9c5'], grass: ['r1c4','r4c2','r7c8','r9c4'] },
  'level-5': { roads: ['r2c2','r6c7','r8c2','r9c6'], grass: ['r2c1','r6c8','r7c2','r9c5'] },
  'level-6': { roads: ['r1c8','r5c3','r7c6','r9c4'], grass: ['r0c8','r4c3','r6c6','r8c4'] },
});
```

Implement `issueStrategyCommand` so an accepted build stores the living tower found at `command.cellId` under `command.ref`; an `upgrade-ref` resolves that tower and dispatches the ordinary `{ type: 'upgrade', towerId }` command. A same-reference replacement overwrites the defeated tower reference. Retain the current strategy ticks as the first deterministic candidate. Start balanced fixtures with blueprint index 0 and artillery fixtures with index 1; use indices 2 and 3 for reinforcements and replacement coverage. Each early strategy includes at least one road melee and one grass ranged build. Level 1's first two commands teach `r2c6` followed by `r1c6`. Use only cells present in that level and never issue two builds to one living-occupied cell. If diagnostics require a different cell, change the blueprint and its exact test expectation together.

- [ ] **Step 4: Tune only approved early-level variables**

Run fixture diagnostics after each change. First adjust command ticks and cells, then wave intervals/delays/compositions, then health scale or individual standard-enemy health/speed if both strategies still fail. Do not change prices, starting coins, hearts, roles, the 18 cap, or gate attacker limit. Record exact final outcome, tick, hearts, score, highest spender, occupied cells, maximum living, and maximum attackers in test expectations.

- [ ] **Step 5: Prove Levels 1–6 twice and run relevant core suites**

```powershell
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs
```

Expected: both balance passes produce byte-for-byte equal evidence metrics; Level 4 includes a paid same-cell replacement after permanent defeat.

- [ ] **Step 6: Commit early campaign balance**

```powershell
git add public/Games/DefenderChampion/src/config/reference-strategies.js public/Games/DefenderChampion/src/config/levels.js public/Games/DefenderChampion/src/config/enemies.js public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.balance.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs
git commit -m "balance: tune Defender square-grid opening"
```

### Task 8: Levels 7–10 Boss Strategies and Adversarial Balance

**Files:**
- Modify: `public/Games/DefenderChampion/src/config/reference-strategies.js`
- Modify: `public/Games/DefenderChampion/src/config/levels.js`
- Modify: `public/Games/DefenderChampion/src/config/enemies.js` only for evidence-backed late-level tuning
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `scripts/defenderChampion.balance.test.mjs`
- Modify: `scripts/defenderChampion.combat.test.mjs`
- Modify: `scripts/defenderChampion.simulation.test.mjs`

**Interfaces:**
- Consumes: final cell commands, capped spawning, gate combat, and boss seams.
- Produces: legal Level 7–10 mixed strategies, all eight late mono losses, and exact boss/cap evidence.

- [ ] **Step 1: Add RED late-game and mono-roster assertions**

```js
for (const level of LEVELS.slice(6)) {
  for (const strategyId of level.referenceStrategies) {
    const result = runStrategyFixture(level.id, strategyId);
    assert.equal(result.outcome, 'victory', strategyId);
    assert.ok(result.maximumLivingEnemies <= 18, strategyId);
    assert.ok(result.maximumConcurrentAttackers <= 3, strategyId);
  }
}
for (const levelId of ['level-7', 'level-10']) {
  for (const defenderId of Object.keys(DEFENDERS)) {
    const result = runMonoRosterFixture(levelId, defenderId);
    assert.equal(result.outcome, 'defeat', `${levelId} ${defenderId}`);
    assert.ok(result.purchaseHistory.filter(({ tick }) => tick > 0).length >= 3);
  }
}
```

- [ ] **Step 2: Run late balance and witness RED**

```powershell
node --test --test-name-pattern="Levels 7-10 square-grid campaign|mono reinvestment" scripts/defenderChampion.balance.test.mjs
```

Expected: FAIL on missing/illegal cell commands or changed late-level outcomes.

- [ ] **Step 3: Re-author eight late mixed strategies**

Begin from these exact valid grid candidates:

```js
const LATE_CELL_BLUEPRINTS = Object.freeze({
  'level-7': { roads: ['r2c2','r4c6','r8c7','r9c3'], grass: ['r1c2','r4c7','r7c7','r9c2'] },
  'level-8': { roads: ['r2c4','r5c3','r7c8','r9c5'], grass: ['r1c4','r5c2','r7c7','r9c4'] },
  'level-9': { roads: ['r2c4','r6c5','r8c6','r10c6'], grass: ['r1c4','r5c5','r7c6','r9c6'] },
  'level-10': { roads: ['r2c6','r6c5','r8c4','r10c1'], grass: ['r1c6','r5c5','r7c4','r10c0'] },
});
```

Retain the current strategy ticks as the first deterministic candidate. Balanced fixtures start at blueprint index 0 and artillery fixtures at index 1; indices 2 and 3 are reinforcements. Each strategy deploys both terrain roles, uses legal unoccupied cells, and accounts for permanent replacement. Level 7 and Level 10 balanced fixtures include one accepted same-cell melee repurchase after an observed defeat; artillery fixtures win through a materially different cell footprint and highest-spend defender. If diagnostics require a different cell, change the blueprint and its exact test expectation together.

- [ ] **Step 4: Tune late waves and boss pressure without raising visual density**

Keep every authored group count but allow its excess to wait in the FIFO queue. Tune in this order and stop when every assertion passes: strategy cells/ticks; wave interval/delay/composition; level health scale; then boss health, armor, attack damage/cadence, or support timing. Preserve exact 75/50/25 boss thresholds, rally/summon telegraphs, plate mechanics, terminal event preservation, and the 18-living cap.

- [ ] **Step 5: Run two full balance passes and all deterministic core suites**

```powershell
node --test scripts/defenderChampion.balance.test.mjs
node --test scripts/defenderChampion.balance.test.mjs
node --test scripts/defenderChampion.grid.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.simulation.test.mjs
```

Expected: 20 of 20 mixed wins, 10 of 10 no-build losses, all eight Level 7/10 mono losses, Level 4/7/10 replacement evidence, maximum living 18, maximum attackers three, and identical second-pass metrics.

- [ ] **Step 6: Remove the final legacy strategy adapter and commit**

Delete old `padId` command translation and the deprecated `level.pads` translation tables, then assert no source/config/test reference remains:

```powershell
rg -n "padId|l[0-9]+-pad-|placement slot|guard slot" public/Games/DefenderChampion/src scripts -g "defenderChampion*.test.mjs"
```

Expected: no production matches and no obsolete test fixture matches.

```powershell
git add public/Games/DefenderChampion/src/config public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.balance.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.simulation.test.mjs
git commit -m "balance: tune Defender square-grid finale"
```

### Task 9: Tier 3 Browser, Device, Performance, and Repository Verification

**Files:**
- Modify if a RED regression requires a fix: files already owned by Tasks 1–8
- Modify: `public/Games/DefenderChampion/js/app.bundle.js`
- Modify: `scripts/defenderChampion.runtime.test.mjs`
- Modify: `scripts/defenderChampion.host.test.mjs`
- Modify: `scripts/defenderChampion.build.test.mjs`
- Create: `.superpowers/sdd/2026-08-19-defender-champion-square-grid/task-9-report.md` (ignored evidence report)

**Interfaces:**
- Consumes: the complete approved spec and all Task 1–8 contracts.
- Produces: final bundle, exact payload ledger, browser evidence, cleanup proof, and No Known In-Scope Risk or an explicit limitation.

- [ ] **Step 1: Run the complete static and automated preflight**

```powershell
npm run build:defender-champion
$defenderTests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $defenderTests
npm run audit:games
npm run audit:assets
npm run typecheck
npm run lint
git diff --check
```

Expected: all Defender tests, typecheck, ESLint, and audits pass. Asset audit may report only the already-known report-only warnings. Record the exact test counts and durations. The full repository build runs in an isolated exact-commit verifier in Step 10 so it cannot overwrite the four protected primary-worktree files.

- [ ] **Step 2: Start one owned server and one headed Chromium session**

Use the game-playtest skill. Reuse one session, capture console/page/request failures, and do not create duplicate servers or tabs. Verify ordinary mode first so QA-only behavior cannot hide product defects.

- [ ] **Step 3: Verify ordinary Level 1 end to end**

On a 390 by 844 portrait viewport:

- confirm all road pieces are 1:1 square tiles with clean corners/caps;
- confirm 108 square interaction cells and no circle marker/range ring;
- reject Ranger-on-road and Bladeguard-on-grass without coin/focus mutation;
- build melee and ranged units on different square cells;
- confirm full idle/attack/mastery art is visibly readable;
- run 1x and 2x, pause/resume, win, save, Continue, replay, and exit;
- confirm ordinary `window.__defenderChampion` is absent.

- [ ] **Step 4: Verify representative combat and all ten levels**

Use ordinary interaction for Levels 4, 7, and 10 placements and QA acceleration only after the real commands are accepted. Capture enemy wind-up/impact, defender health loss, permanent death, no refund, same-cell repurchase, fallback gate, boss telegraphs, 75/50/25 thresholds, summons waiting at the cap, terminal decisive events, and pool teardown. Run all ten deterministic rendered victories and a separate no-build defeat.

- [ ] **Step 5: Verify the exact portrait matrix and landscape lock**

Test 360x640, 390x844, 393x852, 768x1024, 820x1180, and 1024x1366. At each portrait size assert:

- no document scroll or horizontal overflow;
- square cell width equals height within 0.5 CSS pixels;
- board, HUD, four cards, pause, 1x/2x, and contextual actions are visible;
- every enabled native control is at least 44 by 44 CSS pixels;
- edge/corner cell touch placement works;
- defender body is at least 44 CSS pixels, standard enemy 38 CSS pixels, and boss 52 CSS pixels;
- reduced motion preserves attack and hit communication.

Rotate each representative size. Assert the overlay covers every screen, the tick and audio state freeze, focus stays in the rotate dialog, and returning to portrait clears only `orientation` while preserving host/manual/modal reasons.

- [ ] **Step 6: Verify dense Level 10 performance and payload**

At the exact observed 18-living peak, require 18 living snapshots, 18 enemy views, zero missing views, fixed body scale, bounded/reused pools, and a complete reset to zero after restart. Sample 120 real frames: desktop p95 must meet 60 FPS and mobile emulation p95 must meet 30 FPS. Build a raw first-load ledger from every requested runtime file and require total bytes `< 15_000_000`.

- [ ] **Step 7: Verify resilience and host paths**

Exercise essential asset failure Retry/Exit, optional asset failure playability, storage denial, corrupt save, AudioContext denial, host mute, host pause, synthetic visibility pause, bfcache, iframe exit/teardown, standalone safe-history exit, and no-referrer fallback. Fresh ordinary and QA runs must have zero console warnings/errors, page errors, failed requests, or bad responses.

- [ ] **Step 8: Fix every reproduced in-scope defect with a new RED test**

For each browser finding: add the smallest executable regression, witness RED, apply the narrow fix, rerun the focused test, rebuild, and replay the exact browser path. Do not weaken geometry, balance, cap, scale, orientation, or accessibility assertions.

- [ ] **Step 9: Commit final QA fixes and review primary-worktree scope**

```powershell
npm run build:defender-champion
$defenderTests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $defenderTests
git diff --check
git add -- public/Games/DefenderChampion 'scripts/defenderChampion*.test.mjs'
git diff --cached --check
git commit -m "test: finish Defender square-grid QA"
```

If browser QA required no tracked fix, do not create an empty commit; use the Task 8 commit as the verification candidate. Review the full branch diff from `e25ed51`. Confirm the generated Defender bundle matches source and the primary worktree contains only the four protected unstaged files.

- [ ] **Step 10: Run the exact-commit repository gate in an isolated verifier and clean up**

Create a disposable Git worktree at the candidate commit outside the primary worktree, attach the existing `node_modules` through a Windows directory junction, run the full gate, then remove only that verified worktree and junction:

```powershell
$verifyRoot = Join-Path (Split-Path $PWD -Parent) 'defender-square-grid-verify'
if (Test-Path -LiteralPath $verifyRoot) { throw "Verifier path already exists: $verifyRoot" }
git worktree add --detach $verifyRoot HEAD
if ($LASTEXITCODE -ne 0) { throw 'Failed to create exact-commit verifier worktree' }
try {
  cmd /c mklink /J "$verifyRoot\node_modules" "$PWD\node_modules"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to create verifier node_modules junction' }
  Push-Location $verifyRoot
  try {
    npm run check
    if ($LASTEXITCODE -ne 0) { throw 'Exact-commit npm run check failed' }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath "$verifyRoot\node_modules") {
    Remove-Item -LiteralPath "$verifyRoot\node_modules" -Force
  }
  git worktree remove --force $verifyRoot
  git worktree prune
}
```

Expected: repository tests, typecheck, ESLint, 82-entry game audit, asset audit, Quiz/Defender builds, TypeScript, and Vite all pass at the exact candidate commit. Then close the owned browser/server, prove its port has no listener, run `git status --short`, and confirm only the four protected primary-worktree paths remain. Record physical truth: headed Windows Chromium is physical desktop evidence; phone/tablet/touch/reduced-motion remain emulated unless actual devices were used; Safari and Capacitor remain code-reviewed unless physically exercised.

## Completion Criteria

- The complete branch implements every requirement in the approved spec with no legacy pad/path interaction model.
- Every free road and grass cell is buildable by its matching role.
- No circular battlefield interaction marker remains.
- Unit artwork stays individually visible at the approved minimum sizes.
- Living enemies never exceed 18, queue backpressure is deterministic, and no living enemy lacks a view.
- All ten levels meet the full mixed-win, no-build, mono-loss, repurchase, boss, cap, and determinism contract.
- Active play is fully contained in portrait; landscape always pauses behind the rotate overlay.
- The complete first-load payload remains below 15,000,000 raw bytes.
- Focused, full Defender, repository, audit, build, browser, performance, lifecycle, and cleanup gates have recorded passing evidence.
