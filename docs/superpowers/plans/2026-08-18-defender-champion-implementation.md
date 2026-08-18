# Defender Champion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Defender Champion pure-strategy path-defense campaign as a complete standalone and embedded browser game with original layered art, deterministic Levels 1–10, three bosses, local progress, platform rewards, and Tier 3 cross-device proof.

**Architecture:** Keep combat, economy, scoring, campaign configuration, and save validation in framework-independent ES modules driven by a fixed 60 Hz simulation. Bundle pinned Phaser 4.2.1 locally with esbuild for battlefield projection while semantic HTML/CSS owns menus, the HUD, shop cards, dialogs, and accessible controls. Reuse the repository's existing iframe lifecycle, sound, points, catalog, GitHub Pages, and Android asset-pack contracts.

**Tech Stack:** Phaser 4.2.1 installed with an exact version, esbuild, plain ES modules, semantic HTML/CSS, Web Audio, Node test runner, built-in image generation, the installed sprite-pipeline scripts, Playwright browser QA, Vite, and the existing React/Capacitor host.

**Spec:** docs/superpowers/specs/2026-08-18-defender-champion-design.md

**Canonical-plan note:** This file is the approved-spec execution plan. It supersedes the earlier uncommitted draft at docs/superpowers/plans/2026-08-18-defender-champion.md without modifying or deleting that concurrent file.

## Global Constraints

- Stable game ID: defender-champion.
- Stable runtime path: /Games/DefenderChampion/index.html.
- Preserve the concurrent uncommitted catalog entry, Single Player entry, points allowlist entry, build command, 82-entry parity expectation, and three Defender Champion tests; strengthen them instead of duplicating or weakening them.
- Preserve every unrelated dirty file and hunk. Before each commit, inspect the staged diff and include only task-owned files or safely isolated task-owned hunks.
- Use Phaser 4.2.1 exactly. Do not load Phaser, fonts, art, audio, or any other dependency from a CDN.
- The game is pure strategy: no questions, purchases, advertisements, multiplayer, permanent unit power, or enemies attacking defenders.
- Every level starts with exactly three castle hearts and 150 coins.
- Deploy/upgrade costs are Bladeguard 50/60/90, Ranger 70/85/120, Ironwarden 120/145/205, and Rune Artificer 150/180/255.
- Selling refunds floor(total invested times 0.70).
- The campaign contains exactly ten authored single-path levels. Bosses occur at Levels 4, 7, and 10.
- Combat runs at a deterministic fixed 60 Hz. The 2x control advances two fixed steps per normal wall-clock step.
- Standard armor reduction is capped at 65%; slow is capped at 40%; support speed is capped at 25%; support healing is capped at 3% maximum health per simulation second.
- The Dread Colossus phases are 100–75%, below 75–40%, and below 40% health.
- The full runtime payload must not exceed 15 MB. Every runtime raster must remain below 1.5 MB. Device pixel ratio is capped at 2.
- Important text and controls remain native HTML/CSS. Touch targets are at least 44 CSS pixels.
- Runtime art must be original, text-free, non-gory, normalized, optimized to WebP, and covered by assets/provenance.json.
- Platform medal rewards are five points per newly crossed rank, saved before reward requests, capped at 15 points per level and disabled in QA mode or without durable storage.
- The truthful browser promise is offline after the first complete successful load while the service-worker cache remains available; do not claim cold-start offline installation.
- Do not hand-edit src/generated/contentCatalog.ts. Regenerate it from the source catalog.
- Final evidence must distinguish automated checks, browser emulation, build inspection, code review, and unavailable physical iPhone/iPad testing.

## Current Starting State

- The design spec is committed at dd4deae.
- package.json already has build:defender-champion and calls it from build, but Phaser is not installed and public/Games/DefenderChampion/ does not exist.
- src/data/content/math.ts, src/pages/Home.tsx, and src/utils/gamePoints.ts already contain uncommitted Defender Champion wiring.
- scripts/content-parity.test.mjs already expects 82 entries.
- scripts/defenderChampionCatalog.test.mjs, scripts/defenderChampion.simulation.test.mjs, and scripts/defenderChampion.balance.test.mjs already exist as uncommitted red contracts.
- src/generated/contentCatalog.ts does not yet contain Defender Champion.
- The working tree contains unrelated foundation, authentication, Android, and Animal Champion work. Never reset, overwrite, stage wholesale, or revert those changes.

## File Responsibility Map

### Existing shared files

- package.json: exact Phaser dependency, focused build command, and root build wiring.
- package-lock.json: exact reproducible Phaser resolution while preserving existing workspace lock changes.
- src/data/content/math.ts: one static Defender Champion content item.
- src/pages/Home.tsx: Single Player classification only.
- src/utils/gamePoints.ts: platform points allowlist only.
- scripts/content-parity.test.mjs: 82-entry baseline.
- src/generated/contentCatalog.ts: generator output only.

### New game runtime

- public/Games/DefenderChampion/index.html: semantic shell, DOM screens, HUD, and local scripts.
- public/Games/DefenderChampion/css/game.css: responsive portrait/landscape layout, safe areas, focus, and reduced motion.
- public/Games/DefenderChampion/src/main.js: boot composition, Phaser configuration, DOM wiring, and teardown.
- public/Games/DefenderChampion/src/config/defenders.js: immutable defender and upgrade data.
- public/Games/DefenderChampion/src/config/enemies.js: immutable enemies, bosses, effect ceilings, and bounties.
- public/Games/DefenderChampion/src/config/levels.js: ten level records, paths, pads, waves, thresholds, and reference-strategy IDs.
- public/Games/DefenderChampion/src/config/reference-strategies.js: deterministic build/upgrade command fixtures.
- public/Games/DefenderChampion/src/core/simulation.js: public deterministic simulation facade.
- public/Games/DefenderChampion/src/core/wave-controller.js: tick-based authored spawning.
- public/Games/DefenderChampion/src/core/targeting.js: stable role-based target selection.
- public/Games/DefenderChampion/src/core/combat.js: damage, armor, effects, abilities, projectiles, and defeats.
- public/Games/DefenderChampion/src/core/economy.js: coins, build, upgrade, and sell rules.
- public/Games/DefenderChampion/src/core/scoring.js: score, par bonus, medals, and crossed medal ranks.
- public/Games/DefenderChampion/src/scenes/BootScene.js: asset preload and essential failure state.
- public/Games/DefenderChampion/src/scenes/MenuScene.js: title/menu presentation state.
- public/Games/DefenderChampion/src/scenes/LevelSelectScene.js: campaign selection projection.
- public/Games/DefenderChampion/src/scenes/BattleScene.js: simulation projection, input, animation, pooling, and effects.
- public/Games/DefenderChampion/src/scenes/ResultScene.js: victory/defeat projection.
- public/Games/DefenderChampion/src/services/save-store.js: versioned validation and durable-write capability.
- public/Games/DefenderChampion/src/services/host-bridge.js: lifecycle, sound, points, embedded/standalone exit, and cleanup.
- public/Games/DefenderChampion/src/services/audio.js: gesture-unlocked procedural music/SFX.
- public/Games/DefenderChampion/src/services/asset-loader.js: runtime manifest, required/optional classification, and retries.
- public/Games/DefenderChampion/src/ui/hud-controller.js: semantic DOM projection and accessible command dispatch.
- public/Games/DefenderChampion/js/app.bundle.js: generated local IIFE; never edit manually.

### New assets and tooling

- public/Games/DefenderChampion/assets/manifest.json: exact runtime load records and frame metadata.
- public/Games/DefenderChampion/assets/provenance.json: final prompt, tool mode, source role, optimization, and QA status for every generated raster.
- public/Games/DefenderChampion/assets/environment/: terrain, path, props, gameplay atlas, and title emblem.
- public/Games/DefenderChampion/assets/defenders/: twelve action strips and metadata.
- public/Games/DefenderChampion/assets/enemies/: thirteen action strips and metadata.
- public/Games/DefenderChampion/assets/bosses/: nine action strips and metadata.
- public/Games/DefenderChampion/assets/castle/: castle state strip and metadata.
- public/Games/DefenderChampion/thumb.webp: catalog thumbnail.
- scripts/optimize-defender-champion-images.py: deterministic PNG-to-WebP conversion and size gate.

### New tests

- scripts/defenderChampion.build.test.mjs: dependency/build/runtime entry contracts.
- scripts/defenderChampion.config.test.mjs: exact campaign/economy/effect constants.
- scripts/defenderChampion.combat.test.mjs: targeting, damage, support, control, and bosses.
- scripts/defenderChampion.scoring-save.test.mjs: score, medals, persistence, and reward crossings.
- scripts/defenderChampion.host.test.mjs: lifecycle, sound, QA suppression, and exit fallback.
- scripts/defenderChampion.assets.test.mjs: manifest, frame, provenance, casing, signature, and file-size contracts.
- scripts/defenderChampion.runtime.test.mjs: semantic DOM, local script, safe-area, and QA-hook contracts.

---

### Task 1: Reconcile the Existing Scaffold and Pin Phaser

**Files:**
- Create: scripts/defenderChampion.build.test.mjs
- Modify: package.json
- Modify: package-lock.json
- Verify without duplicating: src/data/content/math.ts
- Verify without duplicating: src/pages/Home.tsx
- Verify without duplicating: src/utils/gamePoints.ts
- Verify without duplicating: scripts/content-parity.test.mjs
- Verify without weakening: scripts/defenderChampionCatalog.test.mjs

**Interfaces:**
- Consumes: approved ID/path and concurrent scaffold.
- Produces: exact Phaser 4.2.1 resolution and build:defender-champion contract.

- [ ] **Step 1: Capture the live safety baseline**

Run:

    git status --short
    git diff -- package.json package-lock.json src/data/content/math.ts src/pages/Home.tsx src/utils/gamePoints.ts scripts/content-parity.test.mjs
    npm view phaser version --json

Expected: Phaser registry version reports 4.2.1; the diff shows one Defender catalog item, one Single Player ID, one points ID, build wiring, and parity 82. Record any drift before editing.

- [ ] **Step 2: Write the failing build contract**

Create scripts/defenderChampion.build.test.mjs:

    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import test from 'node:test';

    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );

    test('defender champion pins Phaser and bundles its local entry', () => {
      assert.equal(packageJson.dependencies?.phaser, '4.2.1');
      assert.equal(
        packageJson.scripts?.['build:defender-champion'],
        'esbuild "public/Games/DefenderChampion/src/main.js" --bundle --format=iife --platform=browser --target=es2019 --outfile="public/Games/DefenderChampion/js/app.bundle.js"',
      );
      assert.match(packageJson.scripts?.build ?? '', /npm run build:defender-champion/);
    });

- [ ] **Step 3: Run the focused red check**

Run:

    node --test scripts/defenderChampion.build.test.mjs scripts/defenderChampionCatalog.test.mjs

Expected: build contract fails because dependencies.phaser is absent; catalog contract passes unless the concurrent scaffold has drifted.

- [ ] **Step 4: Install the exact dependency without changing the selected build shape**

Run:

    npm install --save-exact phaser@4.2.1

Then inspect package.json and package-lock.json. Preserve every pre-existing workspace, script, dependency, and lockfile change. The resulting dependency entry must be exactly:

    "phaser": "4.2.1"

- [ ] **Step 5: Run focused green checks**

Run:

    node --test scripts/defenderChampion.build.test.mjs scripts/defenderChampionCatalog.test.mjs scripts/content-parity.test.mjs

Expected: build and catalog contracts pass. Content parity may still fail only if generated catalog output is stale; record that expected integration failure for Task 12 rather than hand-editing generated output.

- [ ] **Step 6: Commit only safely isolatable Task 1 changes**

Run:

    git add scripts/defenderChampion.build.test.mjs
    git add -p package.json package-lock.json
    git diff --cached --check
    git diff --cached --name-status

Only commit when the staged package hunks contain Phaser/Defender wiring and no unrelated foundation changes:

    git commit -m "build: pin Defender Champion runtime"

If the lockfile hunk cannot be safely isolated from pre-existing work, leave that shared file unstaged and record it for the final working-tree handoff.

### Task 2: Lock Configuration and Command Contracts

**Files:**
- Create: public/Games/DefenderChampion/src/config/defenders.js
- Create: public/Games/DefenderChampion/src/config/enemies.js
- Create: public/Games/DefenderChampion/src/config/levels.js
- Create: public/Games/DefenderChampion/src/config/reference-strategies.js
- Create: scripts/defenderChampion.config.test.mjs
- Extend: scripts/defenderChampion.simulation.test.mjs

**Interfaces:**
- Consumes: exact constants from the approved spec.
- Produces: DEFENDERS, ENEMIES, LEVELS, REFERENCE_STRATEGIES, getLevel(levelId), and validated command IDs.

- [ ] **Step 1: Write exact failing configuration tests**

Create scripts/defenderChampion.config.test.mjs:

    import assert from 'node:assert/strict';
    import test from 'node:test';
    import { DEFENDERS } from '../public/Games/DefenderChampion/src/config/defenders.js';
    import { EFFECT_LIMITS, ENEMIES } from '../public/Games/DefenderChampion/src/config/enemies.js';
    import { LEVELS } from '../public/Games/DefenderChampion/src/config/levels.js';

    test('defender economy matches the approved contract', () => {
      assert.deepEqual(
        Object.fromEntries(Object.entries(DEFENDERS).map(([id, value]) => [id, value.costs])),
        {
          bladeguard: [50, 60, 90],
          ranger: [70, 85, 120],
          ironwarden: [120, 145, 205],
          'rune-artificer': [150, 180, 255],
        },
      );
    });

    test('campaign and effect ceilings are exact', () => {
      assert.equal(LEVELS.length, 10);
      assert.deepEqual(LEVELS.map((level) => level.waveCount), [3, 4, 4, 5, 5, 5, 6, 6, 7, 8]);
      assert.deepEqual(LEVELS.map((level) => level.startingCoins), Array(10).fill(150));
      assert.deepEqual(LEVELS.map((level) => level.castleHearts), Array(10).fill(3));
      assert.deepEqual(EFFECT_LIMITS, {
        armorReductionMax: 0.65,
        slowMax: 0.40,
        supportSpeedMax: 0.25,
        supportHealingPerSecondMax: 0.03,
        standardStunSecondsMax: 1.5,
        standardStunImmunitySeconds: 2,
        bossStunSecondsMax: 0.5,
        bossStunImmunitySeconds: 4,
      });
      assert.equal(ENEMIES['dread-colossus'].castleDamage, 3);
    });

- [ ] **Step 2: Run the red configuration test**

Run:

    node --test scripts/defenderChampion.config.test.mjs

Expected: FAIL because the configuration modules do not exist.

- [ ] **Step 3: Implement immutable defender and enemy records**

Use frozen records with these exact IDs and role priorities:

    export const DEFENDERS = Object.freeze({
      bladeguard: Object.freeze({
        id: 'bladeguard',
        costs: Object.freeze([50, 60, 90]),
        targetPriority: 'closest-to-castle',
        mastery: 'whirlwind',
      }),
      ranger: Object.freeze({
        id: 'ranger',
        costs: Object.freeze([70, 85, 120]),
        targetPriority: 'fastest',
        mastery: 'critical-volley',
      }),
      ironwarden: Object.freeze({
        id: 'ironwarden',
        costs: Object.freeze([120, 145, 205]),
        targetPriority: 'highest-armor',
        mastery: 'rally-bash',
      }),
      'rune-artificer': Object.freeze({
        id: 'rune-artificer',
        costs: Object.freeze([150, 180, 255]),
        targetPriority: 'densest-cluster',
        mastery: 'double-detonation',
      }),
    });

Define ENEMIES with IDs blight-walker, skitter, swarmkin, shellguard, hexcaller, crusher, mossback-brute, ironhide-warlord, and dread-colossus. Put tunable health, speed, bounty, armor, and cooldown numbers in this file only. Put every approved cap in EFFECT_LIMITS.

- [ ] **Step 4: Implement the ten immutable level shells**

LEVELS must contain the approved IDs, names, wave counts, health scales, and threat indices:

    const LEVEL_META = [
      ['level-1', 'Meadow Watch', 3, 1.00, 100],
      ['level-2', 'Quickstep Grove', 4, 1.12, 135],
      ['level-3', 'Iron Trail', 4, 1.25, 175],
      ['level-4', "Brute's Crossing", 5, 1.38, 225],
      ['level-5', 'Twisting Thicket', 5, 1.54, 285],
      ['level-6', 'Moonlit Rush', 5, 1.72, 350],
      ['level-7', "Warlord's March", 6, 1.92, 430],
      ['level-8', 'Fogbound Siege', 6, 2.14, 525],
      ['level-9', 'The Last Green', 7, 2.38, 640],
      ['level-10', "Champion's Stand", 8, 2.65, 800],
    ];

Each record must include castleHearts: 3, startingCoins: 150, a single waypoint path, 8–12 unique pad IDs, exactly waveCount wave arrays, silverScore, goldScore, parSeconds, and exactly two referenceStrategies. Use explicit spawn groups shaped as:

    {
      enemyId: 'blight-walker',
      count: 6,
      intervalTicks: 84,
      delayTicks: 0,
    }

Export getLevel(levelId) from levels.js. It must return the matching immutable record and throw a stable `Unknown level: ${levelId}` error for an invalid ID.

- [ ] **Step 5: Seed two structurally different strategy records per level**

REFERENCE_STRATEGIES maps each strategy ID to tick-scheduled commands:

    export const REFERENCE_STRATEGIES = Object.freeze({
      'level-1-balanced': Object.freeze([
        { tick: 0, type: 'build', defenderId: 'bladeguard', padId: 'l1-pad-a' },
        { tick: 0, type: 'build', defenderId: 'ranger', padId: 'l1-pad-b' },
      ]),
      'level-1-artillery': Object.freeze([
        { tick: 0, type: 'build', defenderId: 'rune-artificer', padId: 'l1-pad-c' },
      ]),
    });

Add two records for every level. The pair for a level must use different highest-spend defender types and differ on at least 25% of occupied pad IDs.

- [ ] **Step 6: Run configuration tests**

Run:

    node --test scripts/defenderChampion.config.test.mjs

Expected: PASS.

- [ ] **Step 7: Commit the immutable configuration slice**

Run:

    git add public/Games/DefenderChampion/src/config scripts/defenderChampion.config.test.mjs
    git diff --cached --check
    git commit -m "feat: define Defender Champion campaign data"

### Task 3: Build the Fixed-Step Simulation, Economy, and Targeting

**Files:**
- Create: public/Games/DefenderChampion/src/core/simulation.js
- Create: public/Games/DefenderChampion/src/core/wave-controller.js
- Create: public/Games/DefenderChampion/src/core/targeting.js
- Create: public/Games/DefenderChampion/src/core/economy.js
- Extend: scripts/defenderChampion.simulation.test.mjs

**Interfaces:**
- Consumes: DEFENDERS, ENEMIES, getLevel(levelId), and REFERENCE_STRATEGIES.
- Produces: createSimulation(levelId, options), issueCommand(simulation, command), advanceSimulation(simulation, steps), summarizeSimulation(simulation), and runStrategyFixture(levelId, strategyId).

- [ ] **Step 1: Extend the red simulation contracts**

Add tests that assert:

    const simulation = createSimulation('level-1', { qa: true, seed: 7 });
    assert.deepEqual(issueCommand(simulation, {
      type: 'build',
      defenderId: 'bladeguard',
      padId: 'l1-pad-a',
    }), { accepted: true, reason: null });

    assert.deepEqual(issueCommand(simulation, {
      type: 'build',
      defenderId: 'ranger',
      padId: 'l1-pad-a',
    }), { accepted: false, reason: 'pad-occupied' });

Also assert invalid defender, invalid pad, insufficient coins, max tier, missing tower, and duplicate sell commands return stable rejected reason strings without mutating the summary.

- [ ] **Step 2: Run the red simulation suite**

Run:

    node --test scripts/defenderChampion.simulation.test.mjs

Expected: FAIL because simulation.js is absent.

- [ ] **Step 3: Implement the public simulation state and facade**

createSimulation returns one mutable internal state owned by the core:

    {
      version: 1,
      levelId: 'level-1',
      tick: 0,
      timeScale: 1,
      pauseReasons: new Set(),
      coins: 150,
      score: 0,
      castleHearts: 3,
      nextEntityId: 1,
      waveIndex: -1,
      spawnedAllWaves: false,
      enemies: [],
      towers: [],
      projectiles: [],
      effects: [],
      terminal: false,
      outcome: null,
      qa: true,
      seed: 7,
    }

Do not expose mutable arrays from summarizeSimulation. Return sorted plain snapshots so repeated runs with the same seed and commands stringify identically.

- [ ] **Step 4: Implement build, upgrade, sell, pause, and speed commands**

issueCommand accepts:

    { type: 'build', defenderId, padId }
    { type: 'upgrade', towerId }
    { type: 'sell', towerId }
    { type: 'set-speed', value: 1 | 2 }
    { type: 'set-pause-reason', reason, active }

Use floor(totalInvested * 0.70) for sell refunds. Pause reasons compose; simulation advances only when the set is empty. Speed two causes the wall-clock adapter to request two fixed steps, never a larger variable delta.

- [ ] **Step 5: Implement authored wave spawning, deterministic targeting, and strategy fixtures**

wave-controller.js schedules integer spawn ticks and never uses wall-clock timestamps. targeting.js applies stable tie-breakers in this order: role metric, path progress descending, spawn tick ascending, entity ID ascending.

Export runStrategyFixture(levelId, strategyId) from simulation.js. It must create a QA simulation, apply the referenced commands on their exact integer ticks, advance no more than 60 * 720 fixed steps, and return summarizeSimulation. Reject an unknown or cross-level strategy ID before advancing. Combat fixtures may remain non-terminal until Task 4, but command timing and repeated summaries must already be deterministic.

- [ ] **Step 6: Run focused simulation tests**

Run:

    node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs

Expected: PASS for command, economy, wave, pause, and deterministic snapshot contracts. Combat victory fixtures remain for Task 4.

- [ ] **Step 7: Commit the deterministic simulation foundation**

Run:

    git add public/Games/DefenderChampion/src/core scripts/defenderChampion.simulation.test.mjs
    git diff --cached --check
    git commit -m "feat: add Defender Champion simulation core"

### Task 4: Implement Combat, Support Effects, Boss Phases, and Balance

**Files:**
- Create: public/Games/DefenderChampion/src/core/combat.js
- Create: public/Games/DefenderChampion/src/core/scoring.js
- Create: scripts/defenderChampion.combat.test.mjs
- Extend: public/Games/DefenderChampion/src/core/simulation.js
- Extend: public/Games/DefenderChampion/src/config/levels.js
- Extend: public/Games/DefenderChampion/src/config/reference-strategies.js
- Strengthen: scripts/defenderChampion.balance.test.mjs

**Interfaces:**
- Consumes: fixed-step state, target IDs, effect limits, authored waves, and strategy commands.
- Produces: applyHit, applySupportEffects, stepCombat, calculateBattleResult, and passing ten-level strategy fixtures.

- [ ] **Step 1: Write failing combat and boss contracts**

Create scripts/defenderChampion.combat.test.mjs with exact assertions:

    import assert from 'node:assert/strict';
    import test from 'node:test';
    import {
      applyArmor,
      clampControlEffect,
      getDreadColossusPhase,
    } from '../public/Games/DefenderChampion/src/core/combat.js';

    test('armor and control effects respect hard ceilings', () => {
      assert.equal(applyArmor(100, 0.90), 35);
      assert.equal(applyArmor(1, 0.65), 1);
      assert.deepEqual(clampControlEffect('standard', { stunSeconds: 9, slow: 0.9 }), {
        stunSeconds: 1.5,
        slow: 0.40,
      });
      assert.deepEqual(clampControlEffect('boss', { stunSeconds: 9, slow: 0.9 }), {
        stunSeconds: 0.5,
        slow: 0.40,
      });
    });

    test('Dread Colossus exposes three exact phases', () => {
      assert.equal(getDreadColossusPhase(1.00), 1);
      assert.equal(getDreadColossusPhase(0.75), 2);
      assert.equal(getDreadColossusPhase(0.40), 3);
      assert.equal(getDreadColossusPhase(0.01), 3);
    });

- [ ] **Step 2: Run the red combat suite**

Run:

    node --test scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.balance.test.mjs

Expected: FAIL because combat.js and full winning fixtures are absent.

- [ ] **Step 3: Implement damage, projectiles, defeats, and support**

Use integer or fixed-decimal simulation values. applyArmor must cap reduction before rounding and guarantee one damage for accepted positive hits. Hexcaller selects one support mode per cooldown; duplicate auras use the strongest value, never addition. Record active effects with integer expiresAtTick values.

- [ ] **Step 4: Implement the three boss contracts**

- Mossback Brute: one-second telegraph and 1.5-second defender stun every ten active seconds; two-heart leak.
- Ironhide Warlord: armor plates break at 75%, 50%, and 25%; strongest rally grants at most 20% speed and 15 armor percentage points; two-heart leak.
- Dread Colossus: Phase 1 at 100–75%; Phase 2 below 75–40% with 20% armor; Phase 3 below 40% removes that armor and adds 20% speed. Summon packs at 75%, 50%, and 25%. Phase 3 pulse telegraphs for 1.25 seconds every 12 active seconds and applies a 25% defender attack-speed reduction for three seconds; three-heart leak.

Threshold events must carry stable once-only flags in simulation state.

- [ ] **Step 5: Complete and tune all authored waves**

Use the approved health scales and threat indices as immutable campaign anchors. Tune base stats, group counts, integer spawn intervals, bounties, defender damage/cooldowns, thresholds, and reference commands until:

- every no-build run terminates in defeat;
- both reference strategies per level terminate in victory;
- strategy pairs have different highest-spend defender types and at least 25% different occupied pads;
- every defender is highest-spend in at least one winning fixture;
- single-defender-only fixtures fail Levels 7 and 10;
- representative runtimes remain within the approved three-to-eight-minute ranges at 1x.

- [ ] **Step 6: Strengthen the balance test with objective diversity checks**

Add:

    assert.notEqual(first.highestSpendDefenderId, second.highestSpendDefenderId);
    assert.ok(first.padDifferenceRatio >= 0.25);

Aggregate all strategy summaries and assert the set of highestSpendDefenderId values equals:

    new Set(['bladeguard', 'ranger', 'ironwarden', 'rune-artificer'])

- [ ] **Step 7: Run all core and balance checks**

Run:

    node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.balance.test.mjs

Expected: PASS with deterministic completion for all ten levels.

- [ ] **Step 8: Commit the playable headless campaign**

Run:

    git add public/Games/DefenderChampion/src/config public/Games/DefenderChampion/src/core scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.balance.test.mjs
    git diff --cached --check
    git commit -m "feat: complete Defender Champion campaign balance"

### Task 5: Implement Scoring, Saves, Rewards, Lifecycle, Exit, and Audio

**Files:**
- Create: public/Games/DefenderChampion/src/services/save-store.js
- Create: public/Games/DefenderChampion/src/services/host-bridge.js
- Create: public/Games/DefenderChampion/src/services/audio.js
- Create: scripts/defenderChampion.scoring-save.test.mjs
- Create: scripts/defenderChampion.host.test.mjs
- Extend: public/Games/DefenderChampion/src/core/scoring.js

**Interfaces:**
- Consumes: terminal simulation summary and host messages.
- Produces: calculateBattleResult, getCrossedMedalRanks, createDefaultSaveState, sanitizeSaveState, createSaveStore, createHostBridge, and createAudioController.

- [ ] **Step 1: Write failing scoring and persistence tests**

Create scripts/defenderChampion.scoring-save.test.mjs:

    import assert from 'node:assert/strict';
    import test from 'node:test';
    import {
      getCrossedMedalRanks,
    } from '../public/Games/DefenderChampion/src/core/scoring.js';
    import {
      sanitizeSaveState,
    } from '../public/Games/DefenderChampion/src/services/save-store.js';

    test('medal crossings are bounded and cumulative', () => {
      assert.deepEqual(getCrossedMedalRanks('none', 'gold'), ['bronze', 'silver', 'gold']);
      assert.deepEqual(getCrossedMedalRanks('silver', 'gold'), ['gold']);
      assert.deepEqual(getCrossedMedalRanks('gold', 'silver'), []);
    });

    test('save data excludes active combat and clamps campaign progress', () => {
      const value = sanitizeSaveState({
        version: 1,
        highestUnlockedLevel: 99,
        levels: { 'level-1': { bestScore: 500, medal: 'gold' } },
        activeWave: 7,
        coins: 9999,
      });
      assert.equal(value.highestUnlockedLevel, 10);
      assert.equal('activeWave' in value, false);
      assert.equal('coins' in value, false);
    });

- [ ] **Step 2: Write failing host behavior tests**

Create scripts/defenderChampion.host.test.mjs around injected window/document/storage doubles. Assert:

- QA mode never calls awardPoints.
- embedded exit posts LAHS_GAME_EXIT_TO_HOME with tab games.
- standalone exit uses safe same-origin history when available.
- standalone direct exit resolves new URL('../../', location.href).
- pause reasons host, visibility, manual, and modal compose independently.
- prepare-unload removes listeners and blocks later reward calls.
- storage denial marks rewardsDisabled true.

- [ ] **Step 3: Run the red service suites**

Run:

    node --test scripts/defenderChampion.scoring-save.test.mjs scripts/defenderChampion.host.test.mjs

Expected: FAIL because service modules are absent.

- [ ] **Step 4: Implement versioned save behavior**

Use key defenderChampion.save.v1 and shape:

    {
      version: 1,
      highestUnlockedLevel: 1,
      levels: {},
      tutorialHints: {},
      reducedMotionOverride: null,
    }

Persist the improved medal before requesting five points for each newly crossed rank. If persistence fails, return rewardsDisabled: true and send no reward event.

- [ ] **Step 5: Implement host and audio adapters**

host-bridge.js owns message validation, same-origin target resolution, lifecycle composition, APP_SOUND_SETTINGS_UPDATE, points initialization, and exit fallback. audio.js exposes setAudioMuted, setMusicVolume, and setSfxVolume; creates AudioContext only on pointer/keyboard activation; and suspends while any pause reason is active.

- [ ] **Step 6: Run green service tests**

Run:

    node --test scripts/defenderChampion.scoring-save.test.mjs scripts/defenderChampion.host.test.mjs

Expected: PASS.

- [ ] **Step 7: Commit the nonvisual services**

Run:

    git add public/Games/DefenderChampion/src/services public/Games/DefenderChampion/src/core/scoring.js scripts/defenderChampion.scoring-save.test.mjs scripts/defenderChampion.host.test.mjs
    git diff --cached --check
    git commit -m "feat: add Defender Champion campaign services"

### Task 6: Build the Semantic Shell, Menus, and Local Phaser Boot

**Files:**
- Create: public/Games/DefenderChampion/index.html
- Create: public/Games/DefenderChampion/css/game.css
- Create: public/Games/DefenderChampion/src/main.js
- Create: public/Games/DefenderChampion/src/scenes/BootScene.js
- Create: public/Games/DefenderChampion/src/scenes/MenuScene.js
- Create: public/Games/DefenderChampion/src/scenes/LevelSelectScene.js
- Create: public/Games/DefenderChampion/src/scenes/BattleScene.js
- Create: public/Games/DefenderChampion/src/scenes/ResultScene.js
- Create: public/Games/DefenderChampion/src/ui/hud-controller.js
- Create: scripts/defenderChampion.runtime.test.mjs

**Interfaces:**
- Consumes: Phaser 4.2.1, save store, host bridge, and level configuration.
- Produces: semantic screens, local bundle entry, createHudController, and scene transitions.

- [ ] **Step 1: Write the failing runtime shell test**

The test reads index.html, game.css, and main.js and asserts:

    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
    assert.match(html, /id="defender-dock"/);
    assert.match(html, /id="battlefield"/);
    assert.match(html, /src="\.\/js\/app\.bundle\.js"/);
    assert.match(html, /src="\.\.\/shared\/lahsPointsBridge\.js"/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.match(css, /env\(safe-area-inset-top\)/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /min-(?:width|height):\s*44px/);

- [ ] **Step 2: Run the red runtime test**

Run:

    node --test scripts/defenderChampion.runtime.test.mjs

Expected: FAIL because the shell files do not exist.

- [ ] **Step 3: Create the semantic DOM skeleton**

index.html must contain:

    <main id="game-shell" data-screen="loading">
      <section id="menu-screen" aria-labelledby="game-title"></section>
      <section id="level-select-screen" aria-label="Level selection" hidden></section>
      <section id="battle-screen" aria-label="Defender Champion battlefield" hidden>
        <header id="battle-hud"></header>
        <div id="battlefield" tabindex="0" aria-label="Defense map"></div>
        <nav id="defender-dock" aria-label="Defenders"></nav>
      </section>
      <section id="result-screen" aria-live="polite" hidden></section>
      <div id="status-announcer" class="sr-only" aria-live="polite"></div>
    </main>

Load only relative local CSS, ../shared/lahsPointsBridge.js, and ./js/app.bundle.js.

- [ ] **Step 4: Implement the menu and level selection behavior**

- Play opens Level Select.
- Continue is hidden until at least one victory.
- Continue opens the highest unlocked uncleared level; after all clears it opens Level 10.
- Level Select shows locks, best score, and medal.
- How to Play explains build, upgrade, sell, hearts, pause, and speed controls.
- Settings exposes effective music/SFX and reduced-motion controls without overriding embedded host sound.
- Exit uses host-bridge behavior.

- [ ] **Step 5: Configure Phaser from the local package**

main.js imports Phaser from phaser and creates a transparent game mounted in #battlefield with logical width 720, height 960, DPR cap 2, and scenes BootScene, MenuScene, LevelSelectScene, BattleScene, and ResultScene. Create BattleScene as a minimal navigable shell that can enter and leave the battle screen without running the simulation; Task 7 replaces that shell with the real projection. Do not load a second Phaser script in index.html.

- [ ] **Step 6: Build and run runtime checks**

Run:

    npm run build:defender-champion
    node --test scripts/defenderChampion.build.test.mjs scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.host.test.mjs

Expected: PASS and js/app.bundle.js exists.

- [ ] **Step 7: Commit the navigable browser shell**

Run:

    git add public/Games/DefenderChampion/index.html public/Games/DefenderChampion/css public/Games/DefenderChampion/src/main.js public/Games/DefenderChampion/src/scenes public/Games/DefenderChampion/src/ui scripts/defenderChampion.runtime.test.mjs public/Games/DefenderChampion/js/app.bundle.js
    git diff --cached --check
    git commit -m "feat: add Defender Champion browser shell"

### Task 7: Project the Simulation into the Battle Scene and HUD

**Files:**
- Extend: public/Games/DefenderChampion/src/scenes/BattleScene.js
- Extend: public/Games/DefenderChampion/src/ui/hud-controller.js
- Extend: public/Games/DefenderChampion/src/main.js
- Extend: scripts/defenderChampion.runtime.test.mjs

**Interfaces:**
- Consumes: simulation facade, DOM command controls, asset IDs, and scene services.
- Produces: fixed-step render projection, pointer/keyboard commands, pools, render_game_to_text, advanceTime, and __defenderChampion.startLevel.

- [ ] **Step 1: Add failing QA-hook and input contracts**

Assert source and bundle behavior exposes these functions only when ?qa=1:

    window.render_game_to_text()
    window.advanceTime(milliseconds)
    window.__defenderChampion.startLevel(levelId)

Assert ordinary mode does not expose advanceTime and that host reward calls are disabled in QA mode.

- [ ] **Step 2: Run the red runtime suite**

Run:

    node --test scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.host.test.mjs

Expected: FAIL because BattleScene and QA adapters are incomplete.

- [ ] **Step 3: Implement the fixed-step wall-clock adapter**

Accumulate elapsed milliseconds, cap catch-up at five normal frames, and execute 60 Hz steps. At speed 2, execute twice the fixed simulation steps per accepted wall-clock interval. Reset the accumulator after every resume to prevent background-tab bursts.

- [ ] **Step 4: Implement projection and pooling**

Maintain maps from simulation entity IDs to Phaser sprites. Pool enemy sprites, projectiles, damage labels, telegraphs, and particles. Rendering reads snapshots; it never mutates combat state directly. Destroy or return projections when IDs disappear.

- [ ] **Step 5: Implement accessible pointer and keyboard commands**

- Pointer: select defender card, tap empty pad to build, tap tower to open panel.
- Keyboard: 1–4 selects defender, Tab/arrow cycles valid pads/towers, Enter confirms, Space toggles manual pause.
- Mirror canvas focus with a visible focus/range ring and #status-announcer text.
- Set touch-action: none only on #battlefield.
- Reject rapid duplicate commands through simulation command results, not DOM timing guesses.

- [ ] **Step 6: Implement HUD projection**

Render level title, hearts, wave/time, score, coins, four cards, upgrade/sell panel, pause, 1x, and 2x from one snapshot. Do not duplicate combat calculations in the HUD.

- [ ] **Step 7: Build and run all headless/runtime tests**

Run:

    npm run build:defender-champion
    node --test scripts/defenderChampion*.test.mjs

Expected: all implemented contracts pass; asset tests are added in Task 8.

- [ ] **Step 8: Commit the interactive debug-art battle**

Run:

    git add public/Games/DefenderChampion/src/scenes/BattleScene.js public/Games/DefenderChampion/src/ui/hud-controller.js public/Games/DefenderChampion/src/main.js scripts/defenderChampion.runtime.test.mjs public/Games/DefenderChampion/js/app.bundle.js
    git diff --cached --check
    git commit -m "feat: connect Defender Champion battle UI"

Debug geometric textures are allowed only in ?qa=1. Ordinary mode must continue to require the approved asset manifest added next.

### Task 8: Add Asset Contracts, Optimization, Environment Layers, Castle, and Thumbnail

**Files:**
- Create: scripts/optimize-defender-champion-images.py
- Create: scripts/defenderChampion.assets.test.mjs
- Create: public/Games/DefenderChampion/assets/manifest.json
- Create: public/Games/DefenderChampion/assets/provenance.json
- Create: public/Games/DefenderChampion/assets/environment/grass.webp
- Create: public/Games/DefenderChampion/assets/environment/path-atlas.webp
- Create: public/Games/DefenderChampion/assets/environment/props-atlas.webp
- Create: public/Games/DefenderChampion/assets/environment/gameplay-atlas.webp
- Create: public/Games/DefenderChampion/assets/environment/title-emblem.webp
- Create: public/Games/DefenderChampion/assets/castle/castle-states.webp
- Create: public/Games/DefenderChampion/assets/metadata/environment.json
- Create: public/Games/DefenderChampion/assets/metadata/castle.json
- Create: public/Games/DefenderChampion/thumb.webp

**Interfaces:**
- Consumes: built-in imagegen outputs and the supplied reference as visual direction.
- Produces: loadable text-free WebP layers, exact metadata, complete provenance, and asset size/signature gates.

- [ ] **Step 1: Write the failing asset contract**

Create scripts/defenderChampion.assets.test.mjs. It must read manifest.json and provenance.json, then assert every manifest path:

- is relative and case-correct under public/Games/DefenderChampion;
- exists and is nonzero;
- starts with a RIFF WebP signature;
- is less than 1,500,000 bytes;
- has one unique ID;
- has provenance with finalPrompt, toolMode, generatedAt, optimization, and qaStatus: approved;
- has positive frameWidth/frameHeight/frameCount when animated.

Also assert total manifest file bytes are at most 15,000,000.

- [ ] **Step 2: Run the red asset test**

Run:

    node --test scripts/defenderChampion.assets.test.mjs

Expected: FAIL because asset files and manifests do not exist.

- [ ] **Step 3: Implement deterministic WebP optimization**

scripts/optimize-defender-champion-images.py must use Pillow, preserve alpha, emit lossless WebP for atlases with sharp inked edges, emit quality 90 method 6 WebP for opaque terrain/thumbnail art, and fail when output is at least 1,500,000 bytes. It must accept exact --input, --output, and --mode values and never overwrite the input.

- [ ] **Step 4: Preserve and inspect the visual reference**

Copy the supplied file C:/Users/Xator/AppData/Local/Temp/codex-clipboard-db347651-199e-4b9d-a75e-fc68196ba6a1.png to output/defender-champion/reference.png for task-local use. Inspect it with view_image. It is a style/composition reference, not an edit target and not a shipped asset.

- [ ] **Step 5: Generate the seven environment deliverables with built-in imagegen**

Use one call per deliverable and no CLI fallback. Prompts:

Grass:

    Use case: stylized-concept
    Asset type: seamless top-down game terrain
    Primary request: original bright storybook fantasy meadow grass texture
    Style/medium: polished hand-painted 2D game art with clean inked micro-details
    Composition: seamless square tile, uniform top-down camera, no focal object
    Palette: fresh lime and spring greens with restrained yellow highlights
    Constraints: no path, trees, rocks, characters, castle, text, logo, border, signature, or watermark

Path atlas:

    Use case: stylized-concept
    Asset type: transparent 4x4 top-down path tile atlas
    Primary request: sixteen aligned warm sand path tiles containing straight, corner, cap, and connector variants
    Style/medium: polished storybook 2D game art matching a bright meadow
    Composition: exact 4x4 equal grid, every path centered on cell edges, transparent background
    Constraints: no grass backdrop, props, characters, text, labels, signature, or watermark

Prop atlas:

    Use case: stylized-concept
    Asset type: transparent 4x4 environment prop atlas
    Primary request: sixteen separate top-down meadow props: four trees, four bushes, two rocks, two white flowers, two grass clusters, and two small banners
    Style/medium: polished storybook 2D game art with clean outlines and soft painted texture
    Composition: exact 4x4 equal grid, one centered prop per cell, consistent scale and light
    Constraints: transparent background, no overlap, text, labels, path, castle, signature, or watermark

Gameplay atlas:

    Use case: stylized-concept
    Asset type: transparent 4x4 gameplay icon atlas
    Primary request: build pad, selected build pad, range marker, gold coin, full heart, empty heart, arrow, rune bolt, shield bash, explosion, stun stars, slow rune, heal sparkle, boss warning, victory burst, defeat crack
    Style/medium: polished readable fantasy strategy-game icons with clean outlines
    Composition: exact 4x4 equal grid, one centered object per cell
    Constraints: transparent background, no words, letters, numbers, signature, or watermark

Title emblem:

    Use case: logo-brand
    Asset type: transparent game title emblem without typography
    Primary request: original blue shield protecting a small white castle beneath a gold champion crown, framed by two green leaves
    Style/medium: premium storybook fantasy game emblem, crisp silhouette, polished painted finish
    Composition: centered square emblem with safe transparent margin
    Constraints: no text, letters, initials, characters, signature, or watermark

Castle states:

    Use case: stylized-concept
    Asset type: transparent horizontal four-frame castle state strip
    Primary request: the same friendly white stone castle with blue roof and gold shield shown as pristine idle, impact recoil, visibly damaged, and defeated but non-gory
    Style/medium: polished storybook 2D game sprite, clean outline, soft painted texture
    Composition: exact four equal horizontal slots, fixed bottom-center anchor and identical scale
    Constraints: transparent background, no scenery, smoke covering silhouette, text, signature, or watermark

Thumbnail:

    Use case: stylized-concept
    Asset type: square game catalog thumbnail
    Primary request: original blue-and-gold castle shield defended by four tiny fantasy champion silhouettes against a winding meadow path
    Style/medium: premium bright storybook strategy-game key art
    Composition: centered readable square icon with safe crop margin
    Constraints: no text, letters, numbers, copied characters, signature, or watermark

- [ ] **Step 6: Inspect, optimize, and register each output**

Inspect every generated output with view_image. Reject malformed grids, text, watermarks, copied composition, unclear alpha, or inconsistent lighting. Copy the accepted concrete tool output to output/defender-champion/raw using a stable asset filename, optimize it into its exact public WebP path, and write exact frame metadata. Record the complete final prompt and built-in tool mode in provenance.json.

- [ ] **Step 7: Run asset and visual-layer checks**

Run:

    node --test scripts/defenderChampion.assets.test.mjs
    npm run audit:assets

Expected: PASS for current manifest entries, every image below 1.5 MB, and no blocking asset warning.

- [ ] **Step 8: Commit the environment art gate**

Run:

    git add scripts/optimize-defender-champion-images.py scripts/defenderChampion.assets.test.mjs public/Games/DefenderChampion/assets public/Games/DefenderChampion/thumb.webp
    git diff --cached --check
    git commit -m "feat: add Defender Champion environment art"

### Task 9: Generate and Normalize the Four Defender Animation Sets

**Files:**
- Create: public/Games/DefenderChampion/assets/defenders/bladeguard-idle.webp
- Create: public/Games/DefenderChampion/assets/defenders/bladeguard-attack.webp
- Create: public/Games/DefenderChampion/assets/defenders/bladeguard-mastery.webp
- Create: public/Games/DefenderChampion/assets/defenders/ranger-idle.webp
- Create: public/Games/DefenderChampion/assets/defenders/ranger-attack.webp
- Create: public/Games/DefenderChampion/assets/defenders/ranger-mastery.webp
- Create: public/Games/DefenderChampion/assets/defenders/ironwarden-idle.webp
- Create: public/Games/DefenderChampion/assets/defenders/ironwarden-attack.webp
- Create: public/Games/DefenderChampion/assets/defenders/ironwarden-mastery.webp
- Create: public/Games/DefenderChampion/assets/defenders/rune-artificer-idle.webp
- Create: public/Games/DefenderChampion/assets/defenders/rune-artificer-attack.webp
- Create: public/Games/DefenderChampion/assets/defenders/rune-artificer-mastery.webp
- Create: public/Games/DefenderChampion/assets/metadata/defenders.json
- Extend: public/Games/DefenderChampion/assets/manifest.json
- Extend: public/Games/DefenderChampion/assets/provenance.json

**Interfaces:**
- Consumes: approved reference direction, sprite-pipeline scripts, and fixed defender IDs.
- Produces: twelve normalized bottom-center action strips: idle 4, attack 6, mastery 8.

- [ ] **Step 1: Read the installed imagegen and sprite-pipeline skills**

Use built-in image generation. Do not use CLI fallback. Use the installed build_sprite_edit_canvas.py, normalize_sprite_strip.py, and render_sprite_preview_sheet.py scripts rather than generating action frames independently.

- [ ] **Step 2: Generate and approve one seed per defender**

Use output/defender-champion/reference.png as a style reference and one built-in call per seed. Shared prompt:

    Use case: stylized-concept
    Asset type: transparent top-down three-quarter game character seed
    Primary request: one original [ROLE BRIEF] for Defender Champion
    Style/medium: premium bright storybook fantasy 2D game sprite, clean dark outline, soft painted texture, readable at 96 pixels
    Composition: full body, facing upper-left toward the enemy path, centered, feet on one shared baseline
    Lighting: soft daylight from upper-left
    Constraints: transparent background, one character only, no scenery, text, logo, signature, watermark, extra limbs, cropped weapon, or copied reference pixels

Use these exact role briefs:

| ID | Role brief |
| --- | --- |
| bladeguard | agile youthful champion in green-and-cream leather armor with short silver sword and round blue shield |
| ranger | focused green-hooded longbow champion with brown leather gear and a clear wooden bow |
| ironwarden | sturdy cobalt-and-silver armored guardian with broad shield, short sword, and blue plume |
| rune-artificer | clever cobalt-hooded fantasy artificer with a brass-and-wood rune launcher that reads as magical equipment rather than a firearm |

Inspect each seed at full size and at 96-pixel game scale. Approve only stable anatomy, role readability, safe weapon silhouette, correct facing, and distinct palettes.

- [ ] **Step 3: Generate complete strips from each approved seed**

For every defender, create one edit canvas and one built-in edit call per action. Exact action prompts:

Idle:

    Create one transparent horizontal four-frame animation strip of this exact character performing a subtle breathing idle. Preserve the same character, facing, palette, silhouette, outfit proportions, weapon, scale, and bottom-center anchor. Exact four equal slots. No scenery, labels, poster composition, signature, or watermark.

Attack:

    Create one transparent horizontal six-frame animation strip of this exact character performing one readable role-appropriate attack with anticipation, strike or release, and recovery. Preserve the same character, facing, palette, silhouette, outfit proportions, weapon, scale, and bottom-center anchor. Exact six equal slots. No scenery, labels, poster composition, signature, or watermark.

Mastery:

    Create one transparent horizontal eight-frame animation strip of this exact character performing the approved mastery ability with a strong readable wind-up, effect release, and return to idle. Preserve the same character, facing, palette, silhouette, outfit proportions, weapon, scale, and bottom-center anchor. Exact eight equal slots. Keep magical effects close to the character. No scenery, labels, poster composition, signature, or watermark.

- [ ] **Step 4: Normalize, preview, and optimize**

Normalize every raw strip to one shared frame size and bottom-center anchor. Render preview sheets. Inspect proportions, anchor stability, weapon continuity, frame count, action readability, transparency, and loop return. Convert accepted strips to the exact WebP paths above and write metadata with frameCount, frameWidth, frameHeight, anchorX: 0.5, anchorY: 1.

- [ ] **Step 5: Record tier visuals without multiplying character strips**

Register the same normalized character strips for all tiers. Define Tier 2 and Tier 3 armor trim, weapon glow, rank crest, aura, and mastery effects as layered gameplay-atlas frames in metadata. Do not recolor character pixels at runtime in a way that obscures role colors.

- [ ] **Step 6: Run defender asset contracts**

Run:

    node --test scripts/defenderChampion.assets.test.mjs
    npm run audit:assets

Expected: PASS with twelve defender strips, exact frame counts, complete provenance, and size compliance.

- [ ] **Step 7: Commit the approved defender sprite gate**

Run:

    git add public/Games/DefenderChampion/assets/defenders public/Games/DefenderChampion/assets/metadata/defenders.json public/Games/DefenderChampion/assets/manifest.json public/Games/DefenderChampion/assets/provenance.json
    git diff --cached --check
    git commit -m "feat: add Defender Champion sprites"

### Task 10: Generate and Normalize Enemies and Bosses

**Files:**
- Create: public/Games/DefenderChampion/assets/enemies/blight-walker-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/blight-walker-defeat.webp
- Create: public/Games/DefenderChampion/assets/enemies/skitter-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/skitter-defeat.webp
- Create: public/Games/DefenderChampion/assets/enemies/swarmkin-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/swarmkin-defeat.webp
- Create: public/Games/DefenderChampion/assets/enemies/shellguard-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/shellguard-defeat.webp
- Create: public/Games/DefenderChampion/assets/enemies/hexcaller-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/hexcaller-defeat.webp
- Create: public/Games/DefenderChampion/assets/enemies/hexcaller-cast.webp
- Create: public/Games/DefenderChampion/assets/enemies/crusher-walk.webp
- Create: public/Games/DefenderChampion/assets/enemies/crusher-defeat.webp
- Create: public/Games/DefenderChampion/assets/bosses/mossback-brute-walk.webp
- Create: public/Games/DefenderChampion/assets/bosses/mossback-brute-ability.webp
- Create: public/Games/DefenderChampion/assets/bosses/mossback-brute-defeat.webp
- Create: public/Games/DefenderChampion/assets/bosses/ironhide-warlord-walk.webp
- Create: public/Games/DefenderChampion/assets/bosses/ironhide-warlord-ability.webp
- Create: public/Games/DefenderChampion/assets/bosses/ironhide-warlord-defeat.webp
- Create: public/Games/DefenderChampion/assets/bosses/dread-colossus-walk.webp
- Create: public/Games/DefenderChampion/assets/bosses/dread-colossus-ability.webp
- Create: public/Games/DefenderChampion/assets/bosses/dread-colossus-defeat.webp
- Create: public/Games/DefenderChampion/assets/metadata/enemies.json
- Create: public/Games/DefenderChampion/assets/metadata/bosses.json
- Extend: public/Games/DefenderChampion/assets/manifest.json
- Extend: public/Games/DefenderChampion/assets/provenance.json

**Interfaces:**
- Consumes: approved art direction and sprite-pipeline.
- Produces: standard walk 6/defeat 6, Hexcaller cast 8, and boss walk 8/ability 8/defeat 10 strips.

- [ ] **Step 1: Generate and approve one seed per enemy**

Use the same seed prompt structure, upper-left facing, shared lighting, transparency, and baseline as Task 9. Exact briefs:

| ID | Role brief |
| --- | --- |
| blight-walker | small moss-green blight humanoid with purple tunic, expressive face, and simple boots |
| skitter | lean yellow-green blight runner with swept-back leaf shapes and light orange gear |
| swarmkin | tiny bright-green leaf goblin with oversized readable head and compact limbs |
| shellguard | squat dark-green blight guard enclosed in layered bark-and-stone armor |
| hexcaller | slender olive-green support creature in a purple hood carrying a crooked glowing seed staff |
| crusher | hulking moss-and-stone elite with massive shoulders, heavy feet, and no weapon |
| mossback-brute | giant ancient moss-covered brute with root plates and a readable slam silhouette |
| ironhide-warlord | imposing blight commander with three visible iron-bark armor plates and a banner crest |
| dread-colossus | enormous final blight titan with blue-green rune cracks, crown-like horns, and three visually readable phase accents |

Reject horror, gore, exposed wounds, copied screenshot characters, unclear silhouettes, extra limbs, weapons that read as firearms, text, signatures, or watermarks.

- [ ] **Step 2: Generate standard action strips**

For each standard enemy, generate one six-frame walk strip and one six-frame non-gory defeat strip in separate edit calls. For Hexcaller, generate one additional eight-frame cast strip with wind-up, staff pulse, and recovery. Preserve exact seed identity, upper-left facing, shared scale, and bottom-center anchor.

- [ ] **Step 3: Generate boss action strips**

For each boss, generate separate walk 8, signature ability 8, and defeat 10 strips. Ability actions are:

- Mossback Brute: raises both arms, shows a close warning glow, and slams the ground.
- Ironhide Warlord: plants its stance, raises its crest, and emits a compact rally pulse.
- Dread Colossus: gathers runes, releases a telegraphed suppression pulse, and returns to forward motion.

No ability effect may extend outside its frame cell or hide the character silhouette.

- [ ] **Step 4: Normalize, preview, optimize, and register**

Use one shared standard-enemy frame size and a separate shared boss frame size. Keep bottom-center anchors fixed. Render preview sheets and inspect every loop at game scale. Optimize to exact WebP paths, write metadata, and add complete provenance.

- [ ] **Step 5: Run complete asset contracts**

Run:

    node --test scripts/defenderChampion.assets.test.mjs
    npm run audit:assets

Expected: PASS for the complete 41-raster runtime inventory (34 character action strips plus seven environment, castle, and thumbnail assets), all provenance entries, individual size limits, and total 15 MB budget.

- [ ] **Step 6: Commit enemy and boss art**

Run:

    git add public/Games/DefenderChampion/assets/enemies public/Games/DefenderChampion/assets/bosses public/Games/DefenderChampion/assets/metadata/enemies.json public/Games/DefenderChampion/assets/metadata/bosses.json public/Games/DefenderChampion/assets/manifest.json public/Games/DefenderChampion/assets/provenance.json
    git diff --cached --check
    git commit -m "feat: add Defender Champion enemy art"

### Task 11: Integrate Final Art, Animation, Audio, Responsive Layout, and Performance

**Files:**
- Create: public/Games/DefenderChampion/src/services/asset-loader.js
- Extend: public/Games/DefenderChampion/src/scenes/BootScene.js
- Extend: public/Games/DefenderChampion/src/scenes/BattleScene.js
- Extend: public/Games/DefenderChampion/src/scenes/MenuScene.js
- Extend: public/Games/DefenderChampion/src/scenes/LevelSelectScene.js
- Extend: public/Games/DefenderChampion/src/scenes/ResultScene.js
- Extend: public/Games/DefenderChampion/src/services/audio.js
- Extend: public/Games/DefenderChampion/src/ui/hud-controller.js
- Extend: public/Games/DefenderChampion/css/game.css
- Extend: scripts/defenderChampion.runtime.test.mjs
- Extend: scripts/defenderChampion.assets.test.mjs

**Interfaces:**
- Consumes: complete manifest/provenance, simulation snapshots, action metadata, and host settings.
- Produces: ordinary-mode final visuals, retries, responsive reflow, reduced motion, and measured entity pooling.

- [ ] **Step 1: Add failing integration contracts**

Assert:

- BootScene loads manifest.json before individual files.
- every required asset ID is referenced by a scene or asset-loader map;
- optional ambient assets are the only optional records;
- ordinary mode never creates debug textures;
- reduced-motion state reaches BattleScene and lowers particle/camera motion without changing fixed-step results;
- landscape CSS defines side rails and has no rotate-only blocker;
- asset loader exposes retryFailedEssentialAssets.

- [ ] **Step 2: Run red runtime/asset integration tests**

Run:

    node --test scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.assets.test.mjs

Expected: FAIL until final art mappings and loader behavior are wired.

- [ ] **Step 3: Implement required/optional loading and retry**

Boot displays percent progress and the current stable asset ID. Essential failure stops menu transition and offers Retry Loading/Exit. Retry requests only failed essential IDs. Optional ambient failure logs one nonfatal record and continues.

- [ ] **Step 4: Map every simulation visual state**

- defenders: idle, attack, and mastery strips plus tier trim/aura;
- enemies: walk, defeat, Hexcaller cast;
- bosses: walk, ability, defeat, armor plates, phase accents, and telegraphs;
- environment: grass, path atlas, props, build pads, castle states, projectiles, and effects;
- results: title emblem and victory/defeat atlas frames.

No ordinary-mode fallback may silently replace a missing required character with a geometric placeholder.

- [ ] **Step 5: Complete responsive and accessible reflow**

Verify CSS breakpoints for portrait phone, tablet portrait, tablet landscape, desktop, and phone landscape. Preserve all four defender cards, 44-pixel controls, safe areas, focus rings, live announcements, color-independent state icons, and no horizontal page scrolling.

- [ ] **Step 6: Complete procedural audio and pause behavior**

Create the approved Web Audio cues and restrained fantasy bed after gesture unlock. Confirm host mute/music/SFX settings, manual/host/visibility/modal pause, and prepare-unload all suspend or destroy audio correctly.

- [ ] **Step 7: Measure and enforce runtime performance**

At the Level 10 maximum authored density:

- pool rather than allocate enemies/projectiles/particles every frame;
- cap DPR at 2;
- keep catch-up at five frames;
- target 60 FPS on desktop/tablet;
- retain stable 30+ FPS mobile emulation fallback;
- keep complete runtime manifest bytes at or below 15,000,000.

Record measurements in output/defender-champion/qa/performance.json.

- [ ] **Step 8: Run the integrated game checks**

Run:

    npm run build:defender-champion
    node --test scripts/defenderChampion*.test.mjs
    npm run audit:assets

Expected: PASS.

- [ ] **Step 9: Commit final game integration**

Run:

    git add public/Games/DefenderChampion scripts/defenderChampion.runtime.test.mjs scripts/defenderChampion.assets.test.mjs
    git diff --cached --check
    git commit -m "feat: finish Defender Champion presentation"

### Task 12: Complete Catalog Generation, Full Repository Gate, and Cross-Device Playtest

**Files:**
- Verify/modify only if missing: package.json
- Verify/modify only if missing: package-lock.json
- Verify/modify only if missing: src/data/content/math.ts
- Verify/modify only if missing: src/pages/Home.tsx
- Verify/modify only if missing: src/utils/gamePoints.ts
- Verify/modify only if stale: scripts/content-parity.test.mjs
- Regenerate: src/generated/contentCatalog.ts
- Create QA evidence under: output/defender-champion/qa/

**Interfaces:**
- Consumes: complete game, source catalog, host routes, QA hooks, and production build.
- Produces: 82-entry generated catalog, clean focused/full checks, standalone/embedded evidence, and explicit remaining physical-device truth.

- [ ] **Step 1: Reconcile rather than duplicate shared integration**

Confirm exactly one defender-champion entry/ID exists in each source surface and that all paths match /Games/DefenderChampion/index.html and /Games/DefenderChampion/thumb.webp. Confirm package.json pins Phaser 4.2.1 and root build calls build:defender-champion once.

- [ ] **Step 2: Regenerate and verify the catalog**

Run:

    npm run sync:content-catalog
    node --test scripts/defenderChampionCatalog.test.mjs scripts/content-parity.test.mjs
    npm run audit:content

Expected: 82 content entries, Defender Champion present exactly once, generated catalog current, and no missing runtime/thumbnail reference.

- [ ] **Step 3: Run the focused and full repository gates**

Run:

    npm run build:defender-champion
    node --test scripts/defenderChampion*.test.mjs
    npm run check
    git diff --check

Expected: all commands pass. Do not accept a passing Vite build as a substitute for the browser playtest.

- [ ] **Step 4: Start one task-owned development server**

Run:

    npm run dev -- --port 4178 --strictPort

Keep this one server alive for the browser matrix. Do not launch duplicate servers or close unrelated user processes.

- [ ] **Step 5: Use the installed Playwright skill for standalone and embedded paths**

Verify:

- http://127.0.0.1:4178/Games/DefenderChampion/index.html
- http://127.0.0.1:4178/play/defender-champion

Capture console errors, page errors, failed requests, and 404s. Exercise menu, Continue rule, Level Select, How to Play, Settings, Exit fallback, build/upgrade/sell, 1x/2x, pause, restart, victory, defeat, and save reload.

- [ ] **Step 6: Run the exact viewport/input matrix**

- Desktop 1440 x 900: mouse, keyboard, focus order, and both launch paths.
- Android 393 x 852: touch, safe areas, portrait, visibility pause/resume.
- iPhone-sized 390 x 844: Safari-sensitive viewport review, safe areas, and touch.
- Tablet 1024 x 1366: portrait composition.
- Tablet 1366 x 1024: landscape side rails.
- Phone landscape 852 x 393: no clipping, no horizontal scroll, all four cards usable.
- Reduced motion: no camera shake or ambient loops; combat timing unchanged.
- Storage denial/corrupt save: playable temporary campaign and no platform reward.
- Audio denial/host mute: silent complete play.
- Essential asset failure: named Retry/Exit; optional ambient failure: continue.

- [ ] **Step 7: Prove every level and boss**

Play Levels 1, 4, 7, and 10 manually at normal speed. With ?qa=1 and rewards disabled, deterministically accelerate complete runs through all ten levels. Record render_game_to_text snapshots proving all waves terminate, each boss enters every approved phase, medal results calculate once, and restart clears previous entities/timers.

Save screenshots for menu, level select, early battle, each boss, victory, defeat, portrait, tablet, and landscape under output/defender-champion/qa/screenshots/.

- [ ] **Step 8: Review final diff, staging, and workspace safety**

Run:

    git status --short
    git diff --stat
    git diff --check
    git diff -- src/data/content/math.ts src/pages/Home.tsx src/utils/gamePoints.ts package.json package-lock.json scripts/content-parity.test.mjs src/generated/contentCatalog.ts

Confirm no unrelated user changes were overwritten. Stage shared files with git add -p so only Defender-specific hunks enter a commit. If a shared hunk cannot be safely isolated, leave it uncommitted and name it in the handoff.

- [ ] **Step 9: Commit safely isolatable final registration output**

Run:

    git add -p package.json package-lock.json src/data/content/math.ts src/pages/Home.tsx src/utils/gamePoints.ts scripts/content-parity.test.mjs src/generated/contentCatalog.ts
    git diff --cached --check
    git diff --cached --name-status

Commit only if the staged state is self-contained and contains no unrelated work:

    git commit -m "feat: register Defender Champion"

- [ ] **Step 10: Stop only the task-owned server and report evidence**

Stop the port 4178 process created in Step 4. Report automated checks, emulated browser checks, build inspection, code review, payload/performance results, commit IDs, and exact remaining physical-device limitations. Do not claim physical iPhone/iPad validation from Windows emulation.
