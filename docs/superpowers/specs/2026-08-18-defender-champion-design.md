# Defender Champion Design

**Status:** Approved in chat on 2026-08-18; written specification pending product-owner review
**Validation tier:** Tier 3

## Goal

Create **Defender Champion**, a polished pure-strategy path-defense game inspired by the supplied reference image. The player places and upgrades four fantasy defenders beside a winding path, defeats escalating enemy waves, protects a three-heart castle, and completes a ten-level campaign culminating in a multi-phase final boss.

The game must be a complete playable product rather than a static mockup. It must include original layered environment art, normalized animated character sprites, four mechanically distinct defenders, six standard enemy roles, three bosses, responsive native controls, local campaign progress, platform integration, deterministic balance tests, and cross-device browser verification.

No educational questions, paid mechanics, advertisements, multiplayer, or permanent power grind interrupt the strategy loop.

## Chosen approach

Build Defender Champion as a standalone Phaser 2D game under `public/Games/DefenderChampion/`. Bundle Phaser and the game source locally with the repository's existing esbuild workflow. Use Phaser for the battlefield, character animation, projectiles, particles, pooling, and pointer interaction; use semantic HTML and CSS for menus, the HUD, shop cards, pause controls, dialogs, and accessibility.

Combat rules, wave progression, economy, targeting, scoring, save validation, and campaign data remain independent of Phaser. They run through a deterministic fixed-step simulation that can be exercised from Node tests and browser QA hooks.

All runtime dependencies and assets are local. Defender Champion does not require a CDN or a runtime network connection after every game asset has been loaded and cached once.

## Alternatives considered

### Custom Canvas 2D engine

A custom renderer would reduce the JavaScript dependency size, but it would require hand-built animation, pooling, scene, camera, loader, and interaction infrastructure. That broadens the defect surface without improving the game fantasy. Rejected.

### DOM-only battlefield

DOM sprites could make basic accessibility simpler, but they are a poor fit for dense moving waves, projectile effects, target selection, particles, and speed changes. Rejected.

### Phaser battlefield with native DOM interface — selected

This approach provides reliable sprite and combat tooling while keeping important text and controls crisp, responsive, keyboard accessible, and testable outside the canvas.

## Current-state evidence

- The repository is a Vite/React/TypeScript and Capacitor shell that launches standalone games from `public/Games/` in same-origin iframes.
- There is no existing Defender Champion runtime or tower-defense implementation to extend under `public/Games/DefenderChampion/`.
- Concurrent uncommitted scaffolding already adds the `defender-champion` source-catalog entry, Single Player classification, points allowlist entry, an esbuild command, a parity expectation of 82, and three focused catalog/simulation/balance tests. The runtime modules and generated-catalog entry are still absent, so this scaffolding is incomplete and currently cannot pass as a whole.
- The existing `scripts/defenderChampionCatalog.test.mjs`, `scripts/defenderChampion.simulation.test.mjs`, and `scripts/defenderChampion.balance.test.mjs` files are preliminary authoritative contracts. Implementation must preserve or strengthen them and make them pass; it must not delete, weaken, or duplicate them.
- Phaser is not currently installed or vendored. The content schema nevertheless recognizes `phaser` as a valid game runtime.
- Existing modular game bundling uses esbuild, and the concurrent scaffolding already defines the intended focused Defender Champion build command.
- The last fully verified generated catalog contained 81 legacy entries, including 13 games, and zero package manifests. The in-progress source/parity contract expects exactly 82 entries with Defender Champion included; the generated output is stale until the new runtime exists and catalog sync succeeds.
- The source catalog, not `src/generated/contentCatalog.ts`, is the editable source of truth.
- The checkout contains unrelated modified and untracked work. Defender Champion must preserve it and stage/commit only explicitly owned files.
- `Many Birds One Stone` is the strongest local reference for fixed-step simulation, Pointer Events, lifecycle handling, sound synchronization, safe areas, points integration, and deterministic QA hooks.
- The supplied image is a visual-direction reference only. Its pixels are not copied into the game.

## Product fantasy and session structure

The player is the commander of a small champion guild defending a bright meadow kingdom from non-gory blight creatures. Every level is a compact tactical puzzle: choose which defenders to deploy, place them on authored build pads, decide which units deserve scarce upgrades, and survive every wave before the castle loses all three hearts.

A level lasts approximately three to four minutes early in the campaign and six to eight minutes late in the campaign. Campaign progress unlocks one level at a time. Upgrades reset between levels, so success depends on current strategy rather than accumulated power.

## Screens and state flow

The game uses explicit screen and battle states:

1. `loading`: load and validate essential configuration and assets with visible progress.
2. `menu`: show **Play**, conditional **Continue**, **Level Select**, **How to Play**, **Settings**, and **Exit**. **Play** opens Level Select. **Continue** appears only after at least one victory and opens the intro for the highest unlocked level that has not been cleared; after all ten levels are cleared, it opens Level 10. It never resumes an interrupted wave.
3. `level-select`: show Levels 1–10, locks, best score, and best medal.
4. `level-intro`: show the map name, new enemy lesson, wave count, and boss warning when applicable.
5. `battle-ready`: allow initial placement before the first wave countdown.
6. `battle-running`: run combat at 1x or 2x speed.
7. `battle-paused`: compose manual, host, visibility, and modal pause reasons without losing state.
8. `victory`: show score, medal, hearts, time, **Next Level**, **Replay**, and **Level Select**.
9. `defeat`: show the failed wave, strategic hint, **Retry**, and **Level Select**.
10. `fatal-content-error`: name failed essential assets and offer **Retry Loading** or **Exit**.

Every transition invalidates stale scene timers and callbacks. A reset or exit cannot be changed later by a previous wave delay, asset callback, projectile, or boss ability.

## Core battle loop

- Every map has one authored path from the spawn gate to the castle and 8–12 legal build pads.
- The player begins every level with 150 coins and three castle hearts.
- Tap or keyboard-select a defender card, then select an empty build pad to deploy it.
- Select a placed defender to inspect its statistics, upgrade it, or sell it.
- Selling refunds 70% of the total coins invested in that defender, rounded down.
- Defenders choose targets automatically according to their role-specific priority.
- Enemies stay on the path and never attack defenders.
- Normal enemies remove one heart if they reach the castle. Crushers and the first two bosses remove two. The final boss removes all three.
- Defeated enemies award coins and in-level score immediately.
- A short visible countdown separates waves. No hidden spawn occurs during a dialog or pause.
- The level ends only after every scheduled enemy has spawned and every living enemy, projectile, and boss summon has resolved.
- Pause, 1x, and 2x controls are always available during active combat. Speed changes affect simulation time, not UI animation or input debounce time.

## Defender roster and upgrades

All four defenders are available from Level 1 so the campaign teaches combinations rather than withholding core strategy.

| Defender | Deploy | Tier 2 | Tier 3 | Role and target priority | Tier 3 mastery |
| --- | ---: | ---: | ---: | --- | --- |
| Bladeguard | 50 | 60 | 90 | Fast, short-range single-target damage; attacks the nearest enemy to the castle | Whirlwind damages every enemy in a small radius after a fixed attack count |
| Ranger | 70 | 85 | 120 | Longest range; prioritizes the fastest enemy in range | Critical-arrow volley fires three high-damage arrows at distinct targets when possible |
| Ironwarden | 120 | 145 | 205 | Medium range; prioritizes armored enemies; slower shield-bash attacks | Rally aura increases nearby defenders' attack speed and shield bash briefly stuns |
| Rune Artificer | 150 | 180 | 255 | Slow explosive bolts; targets the densest valid cluster | Every mastery shot detonates twice and ignores part of enemy armor |

Tier upgrades increase damage and attack utility without changing the unit's core role. Range increases are intentionally modest so upgrades do not erase placement decisions. Defender data is immutable configuration rather than scattered scene constants.

## Enemy roster

| Enemy | Battlefield role | Defining behavior | Castle damage |
| --- | --- | --- | ---: |
| Blight Walker | Baseline | Balanced health and speed | 1 |
| Skitter | Speed check | Fast and fragile | 1 |
| Swarmkin | Area-damage check | Low health and deployed in dense packs | 1 |
| Shellguard | Armor check | Slow with strong physical damage reduction | 1 |
| Hexcaller | Support check | Periodically heals or accelerates nearby enemies | 1 |
| Crusher | Elite check | Very high health, moderate armor, and slow speed | 2 |

Armor reduction is capped at 65%, and every accepted hit deals at least one point of damage. Only the strongest duplicate support aura applies to an enemy. Support movement bonuses are capped at 25%, support healing is capped at 3% of maximum health per simulation second, and slows are capped at 40%. A standard enemy can be stunned for at most 1.5 simulation seconds per effect and then receives two seconds of stun immunity; bosses can be stunned for at most 0.5 seconds and then receive four seconds of immunity. These ceilings prevent permanent control locks.

## Bosses

### Level 4 — Mossback Brute

- First major health spike and a clear lesson in spreading defenders across the route.
- Every ten active simulation seconds, emits a one-second warning ring and then stuns defenders within range for 1.5 simulation seconds.
- Removes two hearts if it reaches the castle.

### Level 7 — Ironhide Warlord

- Uses three breakable armor plates at 75%, 50%, and 25% health. One visible plate breaks at each threshold.
- Provides nearby enemies up to 20% bonus movement speed and 15 percentage points of armor; only the strongest rally applies.
- Becomes temporarily vulnerable after the last armor plate breaks.
- Removes two hearts if it reaches the castle.

### Level 10 — Dread Colossus

- Phase 1, 100%–75% health: steady advance with baseline armor; the transition at 75% summons the first authored Swarmkin pack.
- Phase 2, below 75%–40% health: gains 20% armor and summons the second Swarmkin pack at 50% health.
- Phase 3, below 40% health: the extra armor shatters, movement speed rises by 20% within the global speed cap, and the third Swarmkin pack arrives at 25% health.
- During Phase 3, uses a 1.25-second warning pulse every 12 active simulation seconds, reducing affected defenders' attack speed by 25% for three simulation seconds.
- Removes all three hearts if it reaches the castle.

Boss actions must be telegraphed before their effect, remain readable at phone scale, and clean up completely after victory, defeat, restart, or unload.

## Ten-level campaign and difficulty curve

Each level has authored path waypoints, build pads, wave compositions, spawn timings, par time, and a deterministic threat budget. Difficulty increases through new interactions and composition before relying on raw health inflation.

| Level | Name | Waves | Health scale | Threat index | Main lesson and escalation |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Meadow Watch | 3 | 1.00 | 100 | Forgiving Blight Walker waves; placement and upgrading tutorial |
| 2 | Quickstep Grove | 4 | 1.12 | 135 | Skitters punish weak path coverage |
| 3 | Iron Trail | 4 | 1.25 | 175 | Shellguards require armor breaking and mixed defenders |
| 4 | Brute's Crossing | 5 | 1.38 | 225 | First boss battle against Mossback Brute |
| 5 | Twisting Thicket | 5 | 1.54 | 285 | New winding map, Swarmkin packs, and Hexcaller support |
| 6 | Moonlit Rush | 5 | 1.72 | 350 | Dense mixed waves reward splash damage and upgrade timing |
| 7 | Warlord's March | 6 | 1.92 | 430 | Ironhide Warlord and armored escorts |
| 8 | Fogbound Siege | 6 | 2.14 | 525 | Overlapping elite combinations and restricted reaction windows |
| 9 | The Last Green | 7 | 2.38 | 640 | Crushers and all standard enemy roles in mastery compositions |
| 10 | Champion's Stand | 8 | 2.65 | 800 | Full campaign final stand and three-phase Dread Colossus |

Movement speed scales much less than health and is capped at 1.20 times an archetype's base speed outside explicit abilities. Enemy density, support overlap, armor, path geometry, and wave sequencing carry most late-game difficulty.

Balance acceptance requires at least two authored reference strategies to win each level in deterministic simulation. For a level, the two fixtures must have different highest-spend defender types and differ on at least 25% of occupied build pads. A no-build strategy must lose every level. Across the campaign, every defender must be the highest-spend type in at least one winning fixture, and no single-defender-only fixture may clear Levels 7 or 10.

Base health, damage, range, cooldown, bounty, and exact spawn timing values not fixed above are balancing parameters rather than product invariants. They may be tuned in immutable configuration while preserving the approved roles, level health scales, effect ceilings, economy values, level lengths, and deterministic acceptance fixtures.

## Scoring, medals, and rewards

In-level coins and campaign score are separate values.

Score sources:

- Enemy and boss defeats
- Wave completion
- Remaining castle hearts
- Finishing within the level's authored par time
- Unspent-coin efficiency, capped so hoarding cannot dominate combat performance

Medals:

- Bronze: clear the level with at least one heart.
- Silver: clear with at least two hearts and meet the level's silver score threshold.
- Gold: clear with all three hearts and meet the level's gold score threshold.

Platform points are awarded only for newly crossed medal ranks. Each rank is worth five platform points, for a lifetime maximum of 15 points per level and 150 points for the campaign. A direct first clear at Gold crosses Bronze, Silver, and Gold and therefore emits three five-point events. Stable event IDs use `defender-champion:level-<n>:medal-<rank>`. The improved medal is durably saved before any corresponding platform requests are sent; if that save fails, no platform medal reward is attempted. If durable local storage is unavailable, platform medal rewards are disabled for that session while local play remains available.

## Visual direction

The supplied image defines the visual target:

- Bright storybook fantasy with a polished modern-game finish
- Clean inked silhouettes, soft painted textures, and readable contrast
- Friendly non-gory enemies and expressive defenders
- Vibrant meadow greens, warm sand paths, blue-and-gold castle accents, and restrained magical color effects
- Strong role colors that remain distinguishable without relying on color alone
- No copied screenshot pixels, brand marks, baked UI text, signatures, or watermarks
- No preschool proportions, excessive visual noise, horror, firearms, or graphic violence

All important labels, costs, hearts, scores, buttons, and messages remain native HTML text or deterministic code-native icons. Generated art never carries required text.

## Layered environment assets

Maps are assembled at runtime from separately generated and normalized assets:

- Seamless grass terrain tile and subtle terrain variants
- Transparent dirt-path tile atlas with straights, corners, caps, and connectors
- Transparent prop atlas containing trees, bushes, rocks, flowers, and grass clusters
- Castle idle, impact, damaged, and defeat states
- Build-pad, selection-ring, range-ring, projectile, coin, health, and impact assets
- Foreground shadows and optional atmospheric overlays
- Text-free game thumbnail and title emblem

Enemy, defender, castle, and path pixels are never baked into the grass background. Ten map configurations compose the reusable layers with authored path and prop placement data.

## Sprite production contract

Each character begins with one approved seed frame establishing silhouette, palette, outfit, and proportions. For every action, generate the whole transparent animation strip in one request rather than generating individual frames. Normalize every strip to a fixed frame size with one shared scale and bottom-center anchor, render a preview sheet, and inspect it in engine at actual game scale.

Required actions:

- Four defenders: 4-frame idle, 6-frame attack, and 8-frame mastery action
- Six standard enemies: 6-frame walk and 6-frame defeat
- Hexcaller: additional 8-frame cast action
- Three bosses: 8-frame walk, 8-frame signature ability, and 10-frame defeat
- Castle: idle, impact, damaged, and defeat states

Damage flashes, weapon trails, upgrade auras, rank crests, shadows, and selection rings are layered runtime effects. They do not require independently generated hurt frames and cannot distort character proportions.

Generated masters are converted into optimized WebP runtime strips and JSON metadata. The final normalized runtime image is the project asset; duplicate unoptimized masters are not shipped in `public/`. Every runtime image must remain below the repository's 1.5 MB image warning threshold.

`assets/provenance.json` records, for every generated asset:

- Stable asset ID and runtime path
- Asset purpose and taxonomy
- Reference-image role
- Final generation prompt
- Generation date and tool mode
- Normalization and optimization output
- Visual QA status

## Interface and responsive behavior

The overall interface follows the reference hierarchy:

- Top: level banner, three hearts, wave/time, and score
- Battlefield overlay: shop access and coin balance
- Bottom: four defender cards with costs, plus pause, 1x, and 2x controls
- Selected defender panel: damage, speed, range, mastery progress, upgrade cost, and sell value

The application shell is portrait-first at 9:16. The Phaser battlefield uses a fixed 720 x 960 logical world inside that shell. CSS scales and reflows the shell; combat data never depends on CSS pixels.

- Portrait phone: complete vertical hierarchy with all four compact defender cards visible.
- Tablet and desktop: centered battlefield with supporting panels using available side space.
- Landscape: battlefield remains centered while status and defender controls move into side rails; play is not blocked by a rotate-only message.
- Pointer Events are used once for mouse, pen, and touch. Pointer capture applies only to battlefield gestures.
- `touch-action: none` applies only where battlefield interaction requires it.
- Native controls have at least 44 CSS-pixel targets, visible focus, pressed states, and concise accessible names.
- Keyboard: number keys 1–4 select defenders, Space toggles pause, Tab or arrow keys cycle eligible build pads and placed defenders, and Enter confirms deployment or opens the selected defender panel. Canvas focus is mirrored by a visible range/focus ring and concise live-region text.
- `prefers-reduced-motion` removes camera shake, looping ambient movement, and nonessential particles while preserving telegraphs and state clarity.
- `viewport-fit=cover`, `100dvh`, and safe-area insets apply inside the standalone page and iframe.

The host owns fullscreen. Defender Champion does not call the Fullscreen API.

## Audio design

Audio is additive and never required for progression. Lightweight original Web Audio cues cover UI activation, deployment, upgrades, attacks, impacts, coins, castle damage, boss warnings, victory, and defeat. A restrained procedural fantasy music bed begins only after user interaction and follows the effective music setting.

The game exposes `setAudioMuted`, `setMusicVolume`, and `setSfxVolume`, handles `APP_SOUND_SETTINGS_UPDATE`, unlocks AudioContext only from a pointer or keyboard gesture, and suspends audio during every pause reason. Unsupported or blocked audio produces a silent but fully playable game.

## Runtime architecture

```text
public/Games/DefenderChampion/
  index.html
  thumb.webp
  css/
    game.css
  src/
    main.js
    config/
      defenders.js
      enemies.js
      levels.js
    core/
      simulation.js
      wave-controller.js
      targeting.js
      combat.js
      economy.js
      scoring.js
    scenes/
      BootScene.js
      MenuScene.js
      LevelSelectScene.js
      BattleScene.js
      ResultScene.js
    services/
      save-store.js
      host-bridge.js
      audio.js
      asset-loader.js
    ui/
      hud-controller.js
  js/
    app.bundle.js
  assets/
    environment/
    defenders/
    enemies/
    bosses/
    castle/
    effects/
    metadata/
    provenance.json
```

Responsibilities:

- `config/*`: immutable unit statistics, progression, wave, waypoint, pad, threshold, and medal data.
- `core/*`: deterministic pure game rules with no DOM or Phaser dependency.
- `scenes/*`: render state, connect Phaser input, and manage scene-level presentation.
- `services/save-store.js`: validate, migrate, read, and write local campaign state.
- `services/host-bridge.js`: lifecycle, sound, exit, and platform points integration.
- `services/audio.js`: gesture unlock, procedural cues, music, and pause-safe volume control.
- `services/asset-loader.js`: essential/optional asset classification, retries, and failure reporting.
- `ui/hud-controller.js`: translate battle state into semantic DOM without owning combat rules.

The build emits one local IIFE bundle at `js/app.bundle.js`. The framework-independent `config/*` and `core/*` modules remain directly importable by Node tests.

## Deterministic simulation and data flow

The combat simulation runs at a fixed 60 Hz step. Rendering can interpolate between steps, but targeting, spawn times, damage, cooldowns, abilities, coins, hearts, and score depend only on simulation ticks.

```text
DOM or Phaser input -> validated command -> deterministic simulation state
deterministic state -> Phaser visual projection + DOM HUD projection
terminal state -> score/medal calculation -> validated save -> host reward request
```

Spawn composition is authored. A seeded random source is allowed only where variation is explicitly designed, and the seed is recorded in QA text output. Decorative particles cannot affect combat.

In `?qa=1` mode, the game exposes:

- `window.render_game_to_text()` for a concise deterministic state snapshot
- `window.advanceTime(milliseconds)` for bounded fixed-step advancement
- a safe level-start helper restricted to known level IDs

QA hooks do not bypass scoring or rewards in ordinary launches. Platform rewards are disabled while QA mode is active.

## Persistence

The versioned key `defenderChampion.save.v1` stores only:

- Schema version
- Highest unlocked level
- Best score and medal rank for each level
- Completed tutorial hints
- Reduced-motion preference when it differs from the system setting

Sound remains controlled by the platform when embedded. No permanent unit power, in-level coins, active wave, account identity, or unrelated platform data is stored.

Reads validate every field and discard unknown or invalid values. Writes use a complete validated snapshot. Corrupt data resets to defaults with a non-blocking notice. Storage denial keeps the current session playable but disables durable campaign progress and platform medal rewards.

## Host and catalog integration

- Stable content and points ID: `defender-champion`
- Stable runtime path: `/Games/DefenderChampion/index.html`
- Catalog title: `Defender Champion`
- Category: `strategy`
- Subjects: `Strategy`, `Resource Management`, `Problem Solving`
- Grade levels: `All`
- Thumbnail: `/Games/DefenderChampion/thumb.webp`

Reuse and verify the concurrent source-catalog entry in `src/data/content/math.ts`, Single Player classification in `src/pages/Home.tsx`, points allowlist entry in `src/utils/gamePoints.ts`, esbuild command in `package.json`, parity expectation of 82, and focused Defender Champion tests. Do not add duplicate entries or overwrite those uncommitted changes. Complete the missing runtime, install and pin Phaser through the selected local-bundle approach, regenerate `src/generated/contentCatalog.ts` from source, and prove the verified catalog increases by exactly one from the prior 81-entry baseline to 82. Do not hand-edit generated catalog output.

Load `../shared/lahsPointsBridge.js`, initialize it with the exact game ID, and use stable medal event IDs. Handle `LAHS_HOST_LIFECYCLE` phases `pause`, `resume`, and `prepare-unload`; also handle `document.visibilitychange` directly. When embedded, Exit posts `{ type: 'LAHS_GAME_EXIT_TO_HOME', tab: 'games' }` to the validated same-origin parent. In a standalone launch, Exit uses same-origin browser history when a safe prior page exists; otherwise it navigates to `new URL('../../', window.location.href)`, which resolves to the application root under both root hosting and the GitHub Pages base path.

No `App.tsx`, route, service-worker, backend, database, or experience-manifest change is required for the current legacy-compatible integration.

## Asset loading and offline behavior

Boot loads all required runtime assets through a visible progress screen before the campaign becomes available. This makes asset failure deterministic and ensures a complete successful load has requested the full campaign asset set. Optional ambient overlays can fail without blocking play.

The truthful browser guarantee is **offline after the first complete successful load while the current service-worker cache remains available**. Cold-start offline installation is not claimed. Android continues staging `public/Games/` through the repository's existing asset-pack flow.

## Error handling and cleanup

- Essential asset failure: show its stable asset ID, retry only failed requests, and offer Exit.
- Optional prop or ambient failure: record it, omit the decoration, and continue.
- Save parse or schema failure: restore safe defaults without blocking the menu.
- Storage denial: continue with temporary progress and no platform medal rewards.
- Audio failure: continue silently.
- Platform bridge failure or rejected reward: keep local victory valid and never retry automatically in a loop.
- Invalid command, stale callback, or duplicate pointer action: ignore it without changing simulation state.
- Unexpected scene failure: stop simulation/audio, clear timers, and present a recoverable error surface.
- `prepare-unload`: stop the Phaser loop, destroy scenes and pools, remove listeners, suspend audio, and prevent later callbacks from messaging the host.

## Performance budgets

- Target 60 FPS on ordinary desktop and tablet hardware.
- Maintain a stable 30 FPS or better mobile fallback under the designed maximum wave density.
- Cap renderer device pixel ratio at 2.
- Pool enemies, projectiles, damage numbers, and particles.
- Avoid per-frame object allocation in the combat loop.
- Keep the complete runtime payload loaded by the game at or below 15 MB. Exceeding this budget requires an explicit design revision rather than a silent waiver.
- Keep every individual runtime image below the repository's 1.5 MB warning threshold and below its blocking threshold.
- Keep runtime fonts and dependencies local; prefer system font stacks for HUD text.
- Reduced-motion mode lowers particle counts and removes camera shake without changing combat timing.

Performance failure at the authored maximum density is a release blocker, not a reason to silently remove enemies or change level balance.

## Validation strategy

This work is Tier 3 because it adds responsive UI, canvas gameplay, touch and keyboard interaction, motion, audio, local storage, iframe lifecycle, points integration, catalog routing, many generated assets, and performance-sensitive waves.

### Automated core contracts

- Defender costs, upgrade order, sell refund, cooldowns, target priorities, masteries, and immutable configuration
- Enemy armor, support caps, speed caps, castle damage, bounty, defeat, and path completion
- Boss thresholds, telegraphs, summons, armor phases, enrage, resistance, and cleanup
- Wave scheduling, pause behavior, speed changes, terminal detection, restart, and stale callback rejection
- Coins and score remain separate; score and medals calculate once
- Save validation, migration, corruption recovery, storage denial, and no permanent power persistence
- Stable reward event IDs, first-improvement-only rules, QA-mode reward suppression, and bridge failure behavior
- Every level spawns its full authored roster and reaches victory or defeat without hanging
- No-build fixtures lose every level
- At least two materially distinct authored strategy fixtures win every level
- One defender type cannot be the dominant efficient solution across all ten levels

### Asset contracts

- Every referenced asset exists with deployment-correct casing and a valid decodable signature.
- Every strip has its declared frame count, uniform frame size, transparency, and bottom-center anchor metadata.
- Defender, enemy, boss, castle, path, prop, projectile, effect, and thumbnail inventories contain no duplicate runtime IDs.
- Provenance entries cover every generated runtime image and contain a final prompt and QA status.
- HTML, CSS, metadata, and JavaScript references resolve beneath both root hosting and the GitHub Pages base path.
- Individual files and total payload remain within approved budgets.

### Repository checks

- Focused Defender Champion Node tests and direct JavaScript syntax/import checks
- Defender Champion esbuild bundle
- `npm run sync:content-catalog`
- `npm run audit:content`
- `npm run audit:assets`
- Full `npm run check`
- `git diff --check`
- Complete final diff and working-tree review that distinguishes unrelated pre-existing changes

### Browser and cross-device matrix

- Standalone `/Games/DefenderChampion/index.html`
- Embedded `/play/defender-champion`
- Desktop 1440 x 900 with mouse and keyboard
- Android phone 393 x 852 emulation with touch
- iPhone-sized 390 x 844 Safari-sensitive review path
- Tablet 1024 x 1366 portrait and 1366 x 1024 landscape
- Phone landscape with side-rail controls
- Reduced motion, safe areas, 1x/2x, manual pause, host pause, visibility pause, resume, restart, and exit
- Storage denial, corrupt save, audio denial, optional asset failure, essential asset retry, and points-host unavailability
- Console and network monitoring for uncaught errors, warnings requiring action, and 404s
- Normal-speed manual play of representative Levels 1, 4, 7, and 10
- Deterministically accelerated browser completion of all ten levels and every boss phase
- Screenshot review of menu, level select, early battle, each boss, victory, defeat, portrait, and landscape

Final reporting must separate automated browser emulation, physical-device testing, build inspection, and code review. Physical iPhone/iPad behavior cannot be claimed from the current Windows environment unless a real remote-device path becomes available.

## Acceptance criteria

- Defender Champion is discoverable in the Single Player catalog and launches through both stable standalone and embedded paths.
- Menu, level selection, tutorial, deployment, upgrades, selling, waves, pause, speed controls, victory, defeat, save, and exit form one complete playable flow.
- The campaign contains exactly ten authored levels with strictly increasing threat and the approved boss encounters at Levels 4, 7, and 10.
- The four defenders, six enemy roles, and three bosses behave according to their approved roles and readable telegraphs.
- Three hearts, 150 starting coins, defender costs, upgrade costs, 70% sell refund, medals, and reward caps follow this specification.
- All requested environment layers and sprite actions exist as separate normalized assets with provenance and visual QA.
- Important text and controls are native, readable, focusable, touch-safe, and not baked into images.
- The game remains usable on the approved desktop, phone, tablet, portrait, landscape, standalone, iframe, reduced-motion, and safe-area surfaces.
- All ten deterministic level simulations terminate and satisfy the required viable-strategy checks.
- Runtime and assets load without CDN dependencies, console errors, unresolved paths, or missing essential files.
- Catalog, points, content parity, asset audit, type, lint, test, bundle, production build, and focused browser checks have recorded passing evidence or an explicitly named external physical-device limitation.
- Existing games, routes, saves, rewards, and unrelated dirty work remain unchanged.

## Rollback and safety

- Runtime and generated art are isolated under `public/Games/DefenderChampion/`.
- Integration edits are limited to the package build/dependency wiring, source catalog, generated catalog, Single Player ID list, points allowlist, focused tests, and parity baseline.
- Generated catalog output is recreated deterministically and reviewed rather than hand-edited.
- No existing art is reused without provenance, deleted, renamed, or overwritten.
- No backend, production data, payment, account, deployment, store upload, or ownership change is implied.
- Reverting the new game directory and its narrow registrations restores the previous product behavior.

## Out of scope

- Educational questions or learning-gated attacks
- Multiplayer, online leaderboards, social features, or live events
- Purchases, advertisements, premium currency, loot boxes, or energy beyond the platform's existing launch stamina behavior
- Permanent defender power, campaign grinding, or cloud saves
- Enemies attacking or destroying placed defenders
- Branching or dynamically generated enemy paths
- User-generated maps or a level editor
- Backend reward authority or anti-cheat beyond the existing local/host contract
- Refactoring unrelated games or migrating the repository's future packaged-game architecture
- Cold-start offline installation of every game asset
- Production deployment, app-store publication, or physical-device claims without separate authorization and evidence
