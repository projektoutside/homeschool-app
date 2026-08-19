# Defender Champion Lane Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Defender Champion's stretched diagonal paths and universal build pads with consistent orthogonal roads, road-blocking melee defenders, grass-based ranged defenders, permanent frontline defeat, and animated enemy attacks across all ten balanced levels.

**Architecture:** Add shared pure path geometry and lane-combat modules beside the existing deterministic 60 Hz simulation. Level data owns typed placements and orthogonal routes; the simulation owns blocker health, queues, attacks, and defeat; Phaser only projects exact snapshots and events using the existing raster inventory. Preserve the host, save, reward, pooling, payload, and accessibility architecture.

**Tech Stack:** Phaser 4.2.1, plain ES modules, Node test runner, esbuild, semantic HTML/CSS, existing WebP atlases, Playwright/headed Chromium QA, React/Capacitor iframe host.

**Spec:** `docs/superpowers/specs/2026-08-19-defender-champion-lane-combat-design.md`

## Global Constraints

- Stable ID and path remain `defender-champion` and `/Games/DefenderChampion/index.html`.
- Preserve the exact deploy and upgrade prices, 150 starting coins, three castle hearts, medal rewards, save schema, and level unlock rules.
- Phaser stays pinned at 4.2.1 and `build:defender-champion` stays minified.
- First-load payload stays at or below 15,000,000 bytes with at least 100,000 bytes of headroom.
- Do not add or replace raster assets. Enemy attacks use existing character textures and gameplay effects.
- Every route is axis-aligned, begins near the top, ends at the castle near the bottom, and renders at exactly 112 world pixels wide.
- Every level has four `road` placements and four `grass` placements.
- Bladeguard and Ironwarden are `road`/`frontline`; Ranger and Rune Artificer are `grass`/`backline`.
- A living road defender blocks the entire lane; at most three enemies attack it concurrently.
- A zero-health melee defender is removed without refund and must be purchased again.
- Existing enemies target `frontline`. Only a synthetic test fixture exercises the future `backline` mage capability.
- Important controls and copy remain semantic HTML/CSS with 44 CSS-pixel targets.
- Preserve and never stage or revert the protected baseline changes in `capacitor.config.json`, `public/Games/Quiz it Polygon!/js/app.bundle.js`, `public/Worksheets/manifest.json`, and `public/manifest.json`.
- Validation is Tier 3. Distinguish physical Windows Chrome, browser emulation, code review, and unavailable physical mobile/Safari/Capacitor evidence.

## File Responsibility Map

### New modules and tests

- `public/Games/DefenderChampion/src/core/path-geometry.js`: validate paths, compute logical metrics, sample progress, derive fixed-width render pieces, and resolve typed placement positions.
- `public/Games/DefenderChampion/src/core/lane-combat.js`: stable gates, front ranks, queues, contact positions, attack lifecycle, defender damage, and backline-capability selection.
- `scripts/defenderChampion.path.test.mjs`: route geometry, road width, atlas-piece topology, and typed-placement contracts.
- `scripts/defenderChampion.lane-combat.test.mjs`: blocker, queue, attack, defeat, and future targeting-capability contracts.

### Existing runtime files

- `public/Games/DefenderChampion/src/config/levels.js`: ten orthogonal routes and four road/four grass placements per level.
- `public/Games/DefenderChampion/src/config/defenders.js`: placement layer, combat layer, health, and armor.
- `public/Games/DefenderChampion/src/config/enemies.js`: attack damage, cooldown, wind-up, and target capabilities.
- `public/Games/DefenderChampion/src/config/reference-strategies.js`: legal typed placements and re-purchase strategies.
- `public/Games/DefenderChampion/src/core/simulation.js`: typed build validation, tower durability state, upgrade health delta, engaged sell rejection, snapshots, and cleanup.
- `public/Games/DefenderChampion/src/core/combat.js`: integrate lane assignment, enemy attack resolution, melee defeat, targeting, movement, and effects.
- `public/Games/DefenderChampion/src/core/targeting.js`: prefer a melee defender's engaged/queued enemies while retaining role priorities.
- `public/Games/DefenderChampion/src/presentation.js`: placement labels, road-piece mapping helpers, attack motion limits, and projection state.
- `public/Games/DefenderChampion/src/scenes/BattleScene.js`: fixed-width path renderer, typed placement markers, health bars, enemy attack tween, recoil, defeat, and teardown.
- `public/Games/DefenderChampion/src/ui/hud-controller.js`: compatible-placement announcements and frontline health/defeat status.
- `public/Games/DefenderChampion/index.html`: role descriptions and live-region copy.
- `public/Games/DefenderChampion/css/game.css`: road/grass role cues and narrow-layout health presentation.
- `public/Games/DefenderChampion/js/app.bundle.js`: generated minified output; never edit manually.

### Existing contracts to strengthen

- `scripts/defenderChampion.config.test.mjs`: immutable layer/health/attack data and ten-level placement invariants.
- `scripts/defenderChampion.combat.test.mjs`: integration with armor, stun, support, boss abilities, and projectiles.
- `scripts/defenderChampion.simulation.test.mjs`: snapshots, commands, terminal cleanup, and deterministic events.
- `scripts/defenderChampion.balance.test.mjs`: ten-level wins/losses, roster diversity, and permanent replacement evidence.
- `scripts/defenderChampion.runtime.test.mjs`: renderer source, accessible copy, pool cleanup, payload, and ordinary/QA separation.
- `scripts/defenderChampion.host.test.mjs`: pause, visibility, iframe unload, sound, and exit regression coverage.

---

### Task 1: Add Shared Path Geometry and Re-author the Ten Maps

**Files:**
- Create: `public/Games/DefenderChampion/src/core/path-geometry.js`
- Create: `scripts/defenderChampion.path.test.mjs`
- Modify: `public/Games/DefenderChampion/src/config/levels.js:1-239`
- Modify: `scripts/defenderChampion.config.test.mjs:1-140`

**Interfaces:**
- Consumes: logical level path points and typed pad records.
- Produces: `ROAD_WIDTH`, `createPathMetrics(path)`, `samplePathProgress(metrics, progress)`, `derivePathPieces(path, projectPoint)`, and `resolvePlacementPoint(level, placement)`.

- [ ] **Step 1: Write the failing path contract**

Create `scripts/defenderChampion.path.test.mjs` with exact invariants:

```js
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
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/defenderChampion.path.test.mjs scripts/defenderChampion.config.test.mjs`

Expected: FAIL because `path-geometry.js`, placement layers, and orthogonal maps do not exist.

- [ ] **Step 3: Implement the pure geometry module**

Create `path-geometry.js` with the stable public shapes:

```js
export const ROAD_WIDTH = 112;

export const createPathMetrics = (path) => {
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

export const resolvePlacementPoint = (level, placement) => {
  if (placement.layer === 'grass') return Object.freeze({ x: placement.x, y: placement.y });
  return samplePathProgress(createPathMetrics(level.path), placement.pathProgress);
};
```

Implement `derivePathPieces` so it returns one trimmed `straight` per segment, one directional `corner` per interior point, and directional `cap` records at the entrance and castle. Each record includes `kind`, `frame`, `x`, `y`, `length`, `rotation`, and `width: ROAD_WIDTH`. Reject a segment whose projected length is not greater than `ROAD_WIDTH / 2`.

- [ ] **Step 4: Replace the ten diagonal routes and pads**

In `levels.js`, preserve names, waves, thresholds, scores, and immutable freezing. Re-author paths in the existing 0–640 by 0–520 logical space. Use the same layer-to-letter convention on every level:

```js
const roadPad = (levelNumber, letter, pathProgress) => ({
  id: `l${levelNumber}-pad-${letter}`,
  layer: 'road',
  pathProgress,
});
const grassPad = (levelNumber, letter, x, y) => ({
  id: `l${levelNumber}-pad-${letter}`,
  layer: 'grass',
  x,
  y,
});
```

Letters `a`, `c`, `e`, and `g` are road slots ordered from entrance to castle. Letters `b`, `d`, `f`, and `h` are grass slots. Level 1 uses this exact S route:

```js
[
  { x: 238, y: 0 }, { x: 238, y: 72 },
  { x: 430, y: 72 }, { x: 430, y: 174 },
  { x: 158, y: 174 }, { x: 158, y: 300 },
  { x: 414, y: 300 }, { x: 414, y: 392 },
  { x: 252, y: 392 }, { x: 252, y: 500 },
  { x: 320, y: 500 },
]
```

Author Levels 2–10 with distinct axis-aligned routes, 7–11 segments, entrances between x 120–520 at y 0–24, and castle endpoints between x 270–370 at y 492–510. Place grass pads at least 64 logical pixels from the centerline and within the playable bounds. Compute road pad progress from each route's metrics at four authored fractions between 0.18 and 0.86.

- [ ] **Step 5: Run GREEN and mutation checks**

Run:

```powershell
node --test scripts/defenderChampion.path.test.mjs scripts/defenderChampion.config.test.mjs
node -e "import('./public/Games/DefenderChampion/src/config/levels.js').then(({LEVELS})=>console.log(LEVELS.map(l=>[l.id,l.path.length,l.pads.map(p=>p.layer)])))"
```

Expected: all focused tests PASS; every printed level has four road and four grass pads.

- [ ] **Step 6: Commit the independently valid map contract**

```powershell
git add docs/superpowers/specs/2026-08-19-defender-champion-lane-combat-design.md docs/superpowers/plans/2026-08-19-defender-champion-lane-combat.md public/Games/DefenderChampion/src/core/path-geometry.js public/Games/DefenderChampion/src/config/levels.js scripts/defenderChampion.path.test.mjs scripts/defenderChampion.config.test.mjs
git diff --cached --check
git commit -m "feat: author Defender Champion road layouts"
```

---

### Task 2: Enforce Placement Layers and Add Frontline Durability

**Files:**
- Modify: `public/Games/DefenderChampion/src/config/defenders.js:1-65`
- Modify: `public/Games/DefenderChampion/src/core/simulation.js:1-250`
- Modify: `scripts/defenderChampion.config.test.mjs`
- Modify: `scripts/defenderChampion.simulation.test.mjs`

**Interfaces:**
- Consumes: typed level placements and `resolvePlacementPoint`.
- Produces: tower fields `placementLayer`, `combatLayer`, `health`, `maxHealth`, `armor`, and `engagedEnemyIds`; rejection reasons `placement-layer-mismatch` and `defender-engaged`.

- [ ] **Step 1: Write failing layer and durability tests**

Add tests that assert this immutable role matrix:

```js
assert.deepEqual(
  Object.fromEntries(Object.values(DEFENDERS).map((defender) => [defender.id, [
    defender.placementLayer,
    defender.combatLayer,
  ]])),
  {
    bladeguard: ['road', 'frontline'],
    ranger: ['grass', 'backline'],
    ironwarden: ['road', 'frontline'],
    'rune-artificer': ['grass', 'backline'],
  },
);
```

Add simulation tests that build Bladeguard on `l1-pad-a`, reject Ranger there, build Ranger on `l1-pad-b`, include health/armor in the snapshot, preserve missing health during upgrade by adding only the max-health delta, and reject selling when `engagedEnemyIds` is non-empty.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs`

Expected: FAIL on missing defender fields and missing layer checks.

- [ ] **Step 3: Add immutable defender durability data**

Add these fields to each record, tuning only numeric durability later:

```js
// Bladeguard
placementLayer: 'road', combatLayer: 'frontline', maxHealth: [420, 560, 720], armor: [0.10, 0.14, 0.18],
// Ranger
placementLayer: 'grass', combatLayer: 'backline', maxHealth: [1, 1, 1], armor: [0, 0, 0],
// Ironwarden
placementLayer: 'road', combatLayer: 'frontline', maxHealth: [850, 1120, 1450], armor: [0.28, 0.34, 0.40],
// Rune Artificer
placementLayer: 'grass', combatLayer: 'backline', maxHealth: [1, 1, 1], armor: [0, 0, 0],
```

The backline value `1` is a valid non-targeted health placeholder for uniform snapshots; current enemies cannot damage it.

- [ ] **Step 4: Enforce compatible builds and health-preserving upgrades**

In `buildTower`, find the placement record once and reject mismatches before charging coins:

```js
const placement = simulation.level.pads.find(({ id }) => id === command.padId);
if (!placement) return rejected('invalid-pad');
if (placement.layer !== defender.placementLayer) return rejected('placement-layer-mismatch');
```

Initialize the produced tower with tier-zero health and armor. In `upgradeTower`, compute `previousMaxHealth`, increase tier, then add `nextMaxHealth - previousMaxHealth` to current health and replace armor. In `sellTower`, reject a frontline tower whose `engagedEnemyIds.length > 0`. Include all fields in full and presentation snapshots.

- [ ] **Step 5: Run GREEN**

Run: `node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.scoring-save.test.mjs`

Expected: all tests PASS and economy/save behavior remains unchanged.

- [ ] **Step 6: Commit**

```powershell
git add public/Games/DefenderChampion/src/config/defenders.js public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs
git diff --cached --check
git commit -m "feat: enforce Defender placement roles"
```

---

### Task 3: Build the Deterministic Whole-Lane Gate and Queue Engine

**Files:**
- Create: `public/Games/DefenderChampion/src/core/lane-combat.js`
- Create: `scripts/defenderChampion.lane-combat.test.mjs`
- Modify: `public/Games/DefenderChampion/src/core/entity-id.js`

**Interfaces:**
- Consumes: simulation towers/enemies, typed road placements, path metrics, and numeric entity ordering.
- Produces: `assignLanePositions(simulation)`, `selectAttackersForGate(enemies, gate, limit)`, `advanceEnemyAttacks(simulation)`, `applyDefenderDamage(simulation, tower, amount, source)`, and `selectEnemyAttackTarget(simulation, enemy, combatLayer)`.

- [ ] **Step 1: Write RED tests for whole-lane semantics**

Create deterministic fixtures with two road towers and six enemies. Assert:

```js
const state = assignLanePositions(simulation);
assert.deepEqual(state.gates.map(({ towerId }) => towerId), ['tower-1', 'tower-2']);
assert.deepEqual(state.gates[0].attackerIds, ['enemy-6', 'enemy-5', 'enemy-4']);
assert.deepEqual(state.gates[0].queuedIds, ['enemy-3', 'enemy-2', 'enemy-1']);
assert.equal(simulation.enemies.every((enemy) => enemy.pathProgress <= firstGate.pathProgress), true);
```

Also assert stable numeric-ID ties, a stunned attacker cannot complete an impact, removing the first tower releases enemies toward the second gate on the next step, and a synthetic enemy with `attackTargets: ['backline']` can select a grass defender while ordinary enemies cannot.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/defenderChampion.lane-combat.test.mjs`

Expected: FAIL because the lane module does not exist.

- [ ] **Step 3: Implement stable gate assignment**

Use road placements and living frontline towers only. Sort gates by `pathProgress`, then numeric tower ID. For each enemy, choose the smallest gate progress that is not behind it. Sort candidates by descending path progress, ascending spawn tick, and numeric entity ID. Assign the first three as attackers and all remaining candidates as queued.

Store only deterministic IDs and numbers on simulation entities:

```js
enemy.laneState = 'moving' | 'attacking' | 'queued';
enemy.blockingTowerId = tower.id | null;
enemy.queueIndex = integer | null;
tower.engagedEnemyIds = attackerIds;
```

Clamp attackers to three contact offsets just before the gate. Clamp queued enemies behind the last contact point using bounded longitudinal spacing and `queueIndex % 3` lateral presentation lanes; lateral values belong in snapshots and do not alter combat distance.

- [ ] **Step 4: Implement attack lifecycle primitives**

An enemy attack state has this exact shape:

```js
enemy.attackState = {
  targetTowerId,
  startedAtTick,
  impactAtTick,
  readyAtTick,
};
```

Start only when the enemy is an attacker, its target is alive, its attack cooldown is ready, and it is not stunned. At impact, revalidate the same target and gate. Apply armor with a minimum of one damage. Clear invalid attacks. Set the next ready tick from active simulation time.

- [ ] **Step 5: Implement permanent defeat and cleanup**

`applyDefenderDamage` emits `defender-hit` for surviving damage and exactly one `defender-defeated` at zero health. Remove the tower, effects targeting that tower, and projectiles sourced by that tower. Do not add coins. Clear every enemy reference to the removed ID so reassignment occurs next tick.

- [ ] **Step 6: Run GREEN and deterministic replay**

Run twice:

```powershell
node --test scripts/defenderChampion.lane-combat.test.mjs
node --test scripts/defenderChampion.lane-combat.test.mjs
```

Expected: byte-for-byte identical TAP assertion order and all tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add public/Games/DefenderChampion/src/core/lane-combat.js public/Games/DefenderChampion/src/core/entity-id.js scripts/defenderChampion.lane-combat.test.mjs
git diff --cached --check
git commit -m "feat: add Defender lane blocking combat"
```

---

### Task 4: Integrate Enemy Attacks with Combat, Targeting, and Boss Rules

**Files:**
- Modify: `public/Games/DefenderChampion/src/config/enemies.js:1-95`
- Modify: `public/Games/DefenderChampion/src/core/combat.js:1-652`
- Modify: `public/Games/DefenderChampion/src/core/targeting.js:1-45`
- Modify: `public/Games/DefenderChampion/src/core/simulation.js`
- Modify: `scripts/defenderChampion.combat.test.mjs`
- Modify: `scripts/defenderChampion.lane-combat.test.mjs`
- Modify: `scripts/defenderChampion.simulation.test.mjs`

**Interfaces:**
- Consumes: lane gate/attack functions and tower durability fields.
- Produces: `enemy-attack-start`, `enemy-attack-impact`, `defender-hit`, and `defender-defeated` presentation events plus complete snapshots.

- [ ] **Step 1: Add failing enemy attack configuration tests**

For every enemy, assert positive integer `attackDamage`, `attackCooldownTicks`, and `attackWindupTicks`, plus deeply frozen `attackTargets: ['frontline']`. Assert each boss damage exceeds Crusher damage and Crusher damage exceeds Blight Walker damage. Extend combat fixtures with the new attack-state fields.

- [ ] **Step 2: Add failing integration tests**

Cover exact active-tick wind-up and impact, armor reduction, stun cancellation, defender removal/no refund, released movement, second fallback gate, melee target preference, boss abilities continuing while blocked, support cadence, summons joining the queue, and castle impact after the last blocker dies.

- [ ] **Step 3: Run RED**

Run:

```powershell
node --test scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.simulation.test.mjs
```

Expected: FAIL on missing attack config and missing combat integration.

- [ ] **Step 4: Add immutable attack profiles**

Add role-shaped starting values, then tune only through Task 7 balance evidence:

```js
'blight-walker': { attackDamage: 18, attackCooldownTicks: 72, attackWindupTicks: 22 },
skitter: { attackDamage: 11, attackCooldownTicks: 42, attackWindupTicks: 14 },
swarmkin: { attackDamage: 8, attackCooldownTicks: 54, attackWindupTicks: 16 },
shellguard: { attackDamage: 28, attackCooldownTicks: 96, attackWindupTicks: 30 },
hexcaller: { attackDamage: 12, attackCooldownTicks: 90, attackWindupTicks: 28 },
crusher: { attackDamage: 62, attackCooldownTicks: 108, attackWindupTicks: 34 },
'mossback-brute': { attackDamage: 78, attackCooldownTicks: 102, attackWindupTicks: 36 },
'ironhide-warlord': { attackDamage: 92, attackCooldownTicks: 96, attackWindupTicks: 32 },
'dread-colossus': { attackDamage: 120, attackCooldownTicks: 114, attackWindupTicks: 40 },
```

Attach `attackTargets: Object.freeze(['frontline'])` to each record.

- [ ] **Step 5: Integrate lane resolution into the fixed step**

In `stepCombat`, keep support, telegraphs, boss thresholds, tower attacks, and projectiles deterministic. Resolve the lane in this order:

1. assign gates/front ranks;
2. advance valid enemy attack states and apply exact impacts;
3. remove defeated towers and rebuild gate assignments when necessary;
4. move unblocked enemies and clamp attackers/queues;
5. resolve castle arrivals and wave completion.

Do not let Phaser animation callbacks mutate simulation health or timing.

- [ ] **Step 6: Prefer a melee defender's gate targets**

Before applying Bladeguard/Ironwarden's existing priority, partition valid in-range targets so enemies whose `blockingTowerId` matches the tower come first, then queued enemies at that gate, then other in-range enemies. Preserve Ranger and Rune Artificer targeting exactly.

- [ ] **Step 7: Extend snapshots and terminal cleanup**

Snapshot enemy lane/attack fields and tower durability/engagement fields. On terminal, restart, or unload, clear attack states, tower engagement, projectiles, effects, and presentation events. Verify no stale impact can fire after defeat or restart.

- [ ] **Step 8: Run GREEN and full deterministic core**

Run:

```powershell
node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.path.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.scoring-save.test.mjs
```

Expected: all focused core tests PASS.

- [ ] **Step 9: Commit**

```powershell
git add public/Games/DefenderChampion/src/config/enemies.js public/Games/DefenderChampion/src/core/combat.js public/Games/DefenderChampion/src/core/targeting.js public/Games/DefenderChampion/src/core/simulation.js scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.simulation.test.mjs
git diff --cached --check
git commit -m "feat: let enemies attack Defender frontlines"
```

---

### Task 5: Render the Consistent Road and Typed Placement Experience

**Files:**
- Modify: `public/Games/DefenderChampion/src/presentation.js:1-220`
- Modify: `public/Games/DefenderChampion/src/scenes/BattleScene.js:1-1134`
- Modify: `public/Games/DefenderChampion/src/ui/hud-controller.js:1-900`
- Modify: `public/Games/DefenderChampion/index.html`
- Modify: `public/Games/DefenderChampion/css/game.css`
- Modify: `scripts/defenderChampion.runtime.test.mjs`
- Modify: `scripts/defenderChampion.host.test.mjs`

**Interfaces:**
- Consumes: path render pieces, resolved placement points, attack/defeat events, and durability snapshots.
- Produces: fixed-width road visuals, compatible marker state, melee health projection, runtime enemy attack motion, reduced-motion fallback, and teardown-safe tweens.

- [ ] **Step 1: Write failing runtime source and helper contracts**

Add pure/helper assertions that the scene imports shared geometry, never renders a rotated horizontal frame for vertical segments, uses all required straight/corner/cap frames, resolves road placement points from progress, filters markers by selected defender layer, and handles all four lane presentation events. Assert role copy contains `Road melee` and `Grass ranged`.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.host.test.mjs`

Expected: FAIL on old stretched path rendering and missing combat presentation.

- [ ] **Step 3: Replace `createMap` road rendering**

Remove the `setDisplaySize(worldLength + 54, 210)` rotated-horizontal implementation. Use `derivePathPieces(this.level.path, toWorldPoint)` and map each piece's `frame`, `rotation`, `length`, and exact `ROAD_WIDTH`. Render straights beneath corner/cap pieces to avoid seam halos. Keep the castle at the final sampled point and place optional props only outside road clearance.

- [ ] **Step 4: Project typed markers and input**

Resolve every pad through `resolvePlacementPoint`. Store `layer` on each marker. A selected defender sets compatible markers visible/bright and incompatible markers dim/inert. Pointer and keyboard dispatch only compatible pad IDs. Announce `Choose a road guard slot` or `Choose a grass ranged slot`; map simulation rejection reasons to concise live-region messages.

- [ ] **Step 5: Add melee health and defeat projection**

Give frontline tower views a pooled health background/fill beneath the character. Redraw only when the rounded health ratio changes. On `defender-hit`, flash and recoil without stealing focus. On `defender-defeated`, stop animations/tweens, play `defeatCrack`, fade/fall the body, announce the permanent defeat, release the view, and reset the pad marker.

- [ ] **Step 6: Add enemy attack motion without new rasters**

On `enemy-attack-start`, stop the walk animation and create a tracked Phaser timeline using the event's wind-up/impact duration. Apply a small backward wind-up and capped forward lunge. On `enemy-attack-impact`, play a shield-bash/explosion burst at the target, then recover to path projection. Use enemy/body scale to cap boss travel. Store timeline/tween references and cancel them on view release, pause teardown, scene shutdown, restart, and unload.

Reduced motion skips positional travel and screen shake but still changes tint/pose, shows impact, updates health, and announces the hit.

- [ ] **Step 7: Update semantic copy and narrow layouts**

Change the four card role labels and How to Play text. Ensure health bars, typed markers, and announcements remain readable at 390 by 844 and 852 by 393. Preserve 44-pixel controls, focus escape, briefing containment, safe areas, and inert screens.

- [ ] **Step 8: Build and run GREEN**

Run:

```powershell
npm run build:defender-champion
node --check public/Games/DefenderChampion/src/core/path-geometry.js
node --check public/Games/DefenderChampion/src/core/lane-combat.js
node --check public/Games/DefenderChampion/src/scenes/BattleScene.js
node --test scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.host.test.mjs
```

Expected: build and focused tests PASS with no hand edits to `app.bundle.js`.

- [ ] **Step 9: Commit**

```powershell
git add public/Games/DefenderChampion/src/presentation.js public/Games/DefenderChampion/src/scenes/BattleScene.js public/Games/DefenderChampion/src/ui/hud-controller.js public/Games/DefenderChampion/index.html public/Games/DefenderChampion/css/game.css public/Games/DefenderChampion/js/app.bundle.js scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.host.test.mjs
git diff --cached --check
git commit -m "feat: present Defender road battles"
```

---

### Task 6: Re-author Strategies and Rebalance Levels 1–10

**Files:**
- Modify: `public/Games/DefenderChampion/src/config/defenders.js`
- Modify: `public/Games/DefenderChampion/src/config/enemies.js`
- Modify: `public/Games/DefenderChampion/src/config/levels.js`
- Modify: `public/Games/DefenderChampion/src/config/reference-strategies.js:1-130`
- Modify: `scripts/defenderChampion.balance.test.mjs`
- Modify: `scripts/defenderChampion.config.test.mjs`

**Interfaces:**
- Consumes: complete deterministic lane combat and typed placement IDs.
- Produces: two accepted mixed-strategy victories per level, permanent replacement fixtures for Levels 4/7/10, no-build defeats, and late mono-roster defeats.

- [ ] **Step 1: Make old strategies fail for the right reason**

Run: `node --test scripts/defenderChampion.balance.test.mjs`

Expected: FAIL because old strategies issue role-incompatible builds or cannot survive the new blocker economy. Record each result rather than weakening thresholds.

- [ ] **Step 2: Strengthen balance evidence**

Extend the strategy runner's report with `frontlineDefeats`, `frontlineRepurchases`, `damageTakenByDefender`, `maxQueueDepth`, and `maxConcurrentAttackers`. Assert Levels 4, 7, and 10 each have at least one winning fixture with a post-defeat road-slot repurchase, and assert `maxConcurrentAttackers <= 3` for every fixture.

- [ ] **Step 3: Rewrite every strategy with legal role slots**

Use `a/c/e/g` for Bladeguard/Ironwarden and `b/d/f/h` for Ranger/Rune Artificer. Each winning fixture begins with one affordable road/grass pairing, upgrades before speculative extra builds, and buys a replacement road defender only after a recorded permanent defeat. Keep the two fixtures' highest-spend defender types different and occupied-pad difference at or above 25%.

- [ ] **Step 4: Tune immutable numbers in the approved order**

Tune one category at a time and rerun the balance suite after each category:

1. enemy `attackDamage`, cooldown, and wind-up;
2. Bladeguard/Ironwarden health and armor;
3. road guard progress and grass-pad coverage;
4. spawn gaps and wave compositions;
5. par and medal score thresholds.

Do not change defender prices, starting coins, hearts, effect ceilings, boss phase thresholds, rewards, or placement roles. Keep Level 1 forgiving; keep boss attacks stronger; preserve mixed-roster need at Levels 7/10.

- [ ] **Step 5: Run the balance suite twice**

```powershell
node --test scripts/defenderChampion.balance.test.mjs
node --test scripts/defenderChampion.balance.test.mjs
```

Expected both times: every no-build fixture loses; all twenty mixed fixtures win; all required mono fixtures lose; roster diversity, pad diversity, permanent replacement, queue, and duration assertions pass with identical metrics.

- [ ] **Step 6: Run all deterministic Defender tests**

Use PowerShell to resolve the test paths before invoking Node:

```powershell
$tests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $tests
```

Expected: all Defender tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add public/Games/DefenderChampion/src/config/defenders.js public/Games/DefenderChampion/src/config/enemies.js public/Games/DefenderChampion/src/config/levels.js public/Games/DefenderChampion/src/config/reference-strategies.js scripts/defenderChampion.balance.test.mjs scripts/defenderChampion.config.test.mjs
git diff --cached --check
git commit -m "balance: tune Defender lane campaign"
```

---

### Task 7: Browser Playtest, Performance, Cross-Device Fixes, and Final Verification

**Files:**
- Modify only when evidence finds a defect: Task 1–6 owned files and their focused tests.
- Regenerate after every runtime fix: `public/Games/DefenderChampion/js/app.bundle.js`
- Create ignored evidence under: `output/defender-champion/qa/lane-combat/`

**Interfaces:**
- Consumes: complete feature and all automated contracts.
- Produces: real rendered evidence, defect regressions, clean final diff, and No Known In-Scope Risk or an exact residual limitation.

- [ ] **Step 1: Run the static and full repository gate**

Run:

```powershell
npm run build:defender-champion
$tests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $tests
npm run check
git diff --check
```

Expected: Defender suite, 82-entry catalog, full repository tests, TypeScript, ESLint, audits, both game builds, Vite build, and whitespace checks PASS. The payload contract reports at most 15,000,000 bytes and at least 100,000 bytes headroom.

- [ ] **Step 2: Start one local server and one headed Chromium session**

Reuse an existing verified task server/session when available. Otherwise start one Vite preview on a free localhost port with a task-specific log, then open one headed Chrome context. Record ownership before launch so cleanup cannot affect unrelated browsers or servers.

- [ ] **Step 3: Prove the ordinary Level 1 user path**

Through real pointer and keyboard UI:

1. enter Level 1;
2. confirm the road is a consistent-width top-to-bottom S with correct corners/caps;
3. confirm Ranger-on-road and Bladeguard-on-grass are rejected without coin loss;
4. build one Bladeguard on road and one Ranger on grass;
5. start waves at 1x;
6. capture an enemy wind-up, impact, health reduction, permanent melee defeat, freed slot, and paid replacement;
7. finish the level and verify one stable result/save/reward path.

Ordinary mode must expose no QA hook. Console errors/warnings, failed requests, and bad responses must be empty.

- [ ] **Step 4: Prove representative boss and queue paths**

Run rendered Levels 4, 7, and 10 using approved strategies. Capture a boss striking a frontline defender, boss ability coexistence while blocked, a permanent repurchase, fallback gate release, and terminal cleanup. Confirm queued enemies remain visually on the road, only three attack, and no enemy bypasses a living blocker.

- [ ] **Step 5: Prove dense projection and pool reuse**

At the highest authored Level 10 queue density, compare simulation living-enemy count with projected sprites and require zero missing. Sample at least 120 rendered frames. Require desktop p95 at or below 16.7 ms, emulated mobile p95 at or below 33.3 ms, bounded pool high-water, acquires exceeding creations after reuse, and every active count returning to zero on restart.

- [ ] **Step 6: Run the exact viewport and interaction matrix**

Verify 1440x900, 393x852, 390x844, 1024x1366, 1366x1024, and 852x393. At each size check no horizontal overflow, compatible placement through pointer/touch, keyboard escape from the battlefield, four defender cards, 44-pixel controls, road visibility, health bars, pause, 1x/2x, and safe vertical scrolling where required.

- [ ] **Step 7: Verify reduced motion, lifecycle, and embedding**

Verify reduced-motion enemy attacks preserve readable wind-up/impact without travel or shake. Verify manual pause, visibility pause where the browser can expose it, host pause/resume, mute, restart, embedded exit/iframe teardown, standalone exit fallback, and storage/audio-denial recovery. State synthetic visibility evidence as synthetic.

- [ ] **Step 8: Review and fix every finding with TDD**

For each issue: add one focused failing regression, witness RED, make the smallest fix, rebuild, rerun the focused test, and replay the exact browser path. Do not accumulate untested browser-only patches.

- [ ] **Step 9: Run the final gate from committed candidate state**

Run:

```powershell
npm run build:defender-champion
$tests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $tests
npm run check
git diff --check
git status --short
```

Review the complete diff for accidental asset changes, generated-bundle drift, weakened assertions, target-layer bypass, stale animation callbacks, accessibility regressions, and any staged protected file.

- [ ] **Step 10: Commit and verify the final state**

Stage only Task 7 fixes and the regenerated Defender bundle:

```powershell
git diff --cached --name-only
git diff --cached --check
git commit -m "fix: finish Defender lane combat QA"
```

Rerun the focused feature tests after commit, confirm the owned server is stopped and its port is free, close only the owned browser session, and confirm `git status --short` contains only the four protected baseline files.

## Plan Self-Review

- Spec coverage: Tasks 1–7 cover road geometry, typed placement, health, permanent defeat, whole-lane blocking, three-enemy front rank, attacks, runtime motion, future targeting seam, balance, accessibility, payload, lifecycle, and cross-device proof.
- Placeholder scan: no deferred implementation markers are present; the future mage is explicitly outside scope and has a concrete synthetic capability test.
- Type consistency: `placementLayer` is `road | grass`; `combatLayer` is `frontline | backline`; `attackTargets` consumes combat layers; all road display positions flow through `resolvePlacementPoint`; gate attacks reference stable tower IDs.
- Safety: no asset generation, dependency change, save migration, catalog change, protected-file edit, deployment, merge, or push is included.
