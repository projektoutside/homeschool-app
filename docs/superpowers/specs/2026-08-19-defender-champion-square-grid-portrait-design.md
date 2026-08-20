# Defender Champion Square Grid and Portrait Design

**Status:** Approved in chat on 2026-08-19

**Validation tier:** Tier 3

**Supersedes:** The road geometry, eight authored placement-pad model, circular battlefield-marker presentation, dense enemy projection, and responsive landscape-play rules in the prior Defender Champion specifications. All non-conflicting campaign, economy, roster, combat, accessibility, host, asset, save, and quality requirements remain in force.

## Goal

Rebuild Defender Champion around a clear square battlefield like the supplied reference. Every road segment is one perfect square tile, every road tile can hold a melee defender, and every grass tile can hold a ranged defender. Circular build pads disappear completely. Defender and enemy artwork remains readable during actual play instead of shrinking into dense dots.

The game is portrait-first and portrait-only during active play. It must fit phones, tablets, iPhones, and iPads without stretching square cells, cropping the board, hiding controls, or allowing landscape simulation to continue behind an unusable layout.

## Chosen approach

Use one deterministic 9-column by 12-row grid inside the existing 720 by 960 logical battlefield. Each cell is exactly 80 by 80 world pixels. A level classifies every cell as either `road` or `grass`; all 108 cells are build sites for the matching defender role. The enemy entrance and castle are anchored beyond the first and last road cells so they do not consume buildable grid cells.

Roads are ordered, non-branching sequences of orthogonally adjacent grid cells. Phaser selects one square road-atlas frame per road cell from its predecessor and successor directions. The grass background remains visually rich, while a restrained square grid makes individual grass build zones discoverable. Selection strengthens only compatible square cells.

The deterministic simulation stores grid coordinates rather than authored circular pad IDs. One shared grid-to-screen transform projects terrain, defenders, enemies, health, effects, selection, and pointer hit testing. The runtime limits living enemies to 18; due enemies beyond that limit wait deterministically at the entrance. Difficulty moves to health, armor, speed, abilities, composition, and reinforcement timing rather than unreadable crowd size.

## Alternatives rejected

### Square overlays on the current continuous road

Overlaying build squares on a 112-pixel continuous road would leave corner cells and straight cells with inconsistent usable footprints. The art could still appear stretched, and path ownership would remain ambiguous at bends.

### Free placement snapped to a hidden grid

Free placement would look flexible but would weaken touch accuracy, keyboard navigation, deterministic strategies, and the promise that every visible square is a buildable area. Visible cells are the interaction model.

### Preserve massive waves and improve only the queue renderer

Shrinking or aggregating hundreds of enemies cannot keep individual unit artwork readable. An 18-enemy living cap provides an enforceable visual ceiling while later levels remain difficult through stronger authored enemies.

## Grid and coordinate contract

- The logical battlefield is 720 by 960 world pixels.
- The grid is exactly 9 columns by 12 rows.
- Every cell is exactly 80 by 80 world pixels.
- Cell IDs are stable coordinates in the form `r{row}c{column}`, with zero-based rows and columns.
- Cell centers are derived from coordinates; levels do not duplicate arbitrary display positions.
- A level provides exactly 108 terrain classifications and one ordered road-cell sequence.
- Every road cell appears exactly once in that sequence.
- Consecutive road cells have a Manhattan distance of exactly one. Diagonal steps, gaps, repeated cells, branches, and self-intersections are invalid.
- The first road cell touches the top grid edge. The last road cell touches the bottom grid edge.
- The entrance is rendered immediately beyond the first cell and is not buildable.
- The castle is rendered immediately beyond the last cell and is not buildable.
- Every cell not in the road sequence is grass.
- Decorative props may overlap only the noninteractive visual margin or low-priority background layers. They never reserve, obscure, or intercept a buildable cell.
- Level geometry is immutable after configuration validation.

## Square terrain presentation

Each road cell renders one unstretched square atlas tile. Its frame is determined by its road neighbors:

- one neighbor: directional entrance or castle cap;
- two opposite neighbors: horizontal or vertical straight;
- two perpendicular neighbors: the matching corner.

No road piece is stretched across multiple cells. Straight, corner, and cap pieces occupy the same 80 by 80 world rectangle. Adjacent pieces meet edge to edge without a wide corner, pinched join, transparent seam, or fringe crossing into grass.

Grass cells use the approved grass texture beneath a subtle square-cell treatment. The resting grid is visible enough to communicate buildable areas without overpowering the meadow art. Selecting a defender increases the border and fill contrast of compatible cells. Invalid or occupied cells use a square unavailable treatment.

No circular battlefield interaction geometry remains. Build markers, hover/focus markers, selection, range visualization, target warnings, mastery coverage, and boss danger areas all use grid-aligned square cells or rectangular outlines. This rule does not remove circular shapes intrinsic to character artwork, coins, emblems, or decorative effects that are not interaction markers.

## Placement rules

| Defender | Build terrain | Combat layer |
| --- | --- | --- |
| Bladeguard | road | frontline |
| Ironwarden | road | frontline |
| Ranger | grass | backline |
| Rune Artificer | grass | backline |

- Every road cell accepts either melee defender when it is unoccupied and not temporarily covered by an enemy body.
- Every grass cell accepts either ranged defender when it is unoccupied.
- One defender may occupy a cell.
- No level-authored build-pad allowlist remains.
- A road cell temporarily occupied by an enemy is still a build site, but a purchase there is rejected until the cell clears. This prevents a newly created defender from overlapping or displacing an enemy.
- Enemies already beyond a newly purchased blocker continue toward the castle; the blocker controls only enemies that have not passed its gate.
- Invalid terrain, occupied-cell, enemy-occupied, insufficient-coin, terminal-state, and engaged-sell rejections are atomic. They create no unit, remove no coins, change no upgrade state, and preserve the player's active card or cell selection.
- A successful build deducts the Tier 1 price once and creates the defender centered on the selected cell.
- Selling and upgrading use the existing economy rules. An engaged melee defender cannot be sold.
- A defeated melee defender is removed permanently, awards no refund, and makes its road cell available for a new full-price purchase after enemies clear the cell.

## Input and accessibility

The same cell command serves pointer, touch, keyboard, and QA automation.

1. Select a defender card.
2. Compatible cells receive square highlights.
3. Activate any compatible free cell to build.
4. Activate an occupied cell to open its upgrade and sell panel.

Keyboard navigation moves by grid row and column rather than by an authored pad order. Arrow keys move to the nearest cell in that direction; Home and End move to the first and last cell; Enter or Space activates the focused cell. Tab and Shift+Tab enter and leave the battlefield without trapping focus.

Every cell has an accessible name containing row, column, terrain, compatibility, occupancy, and cost outcome where applicable. Rejections and permanent defender defeat use the existing live-status channel. Touch hit testing uses the actual measured canvas rectangle and the shared uniform transform. The interactive hit box covers the full square cell; it is never a circular or elliptical approximation.

## Melee gates and enemy attacks

A living melee defender creates a whole-lane gate at the center progress of its road cell.

- Enemies approaching from the entrance cannot pass the gate while its defender lives.
- Up to three enemies form the attacking rank at deterministic contact positions on the approach side.
- Other enemies queue in ordered road-cell positions behind the attackers.
- Queue order remains stable by path progress, spawn tick, and numeric entity ID.
- Attackers use the existing deterministic wind-up, impact, recovery, stun, armor, and interruption rules.
- Phaser visibly projects wind-up, lunge or cast motion, impact, defender recoil, health loss, and recovery from simulation events.
- Reduced-motion mode removes travel and shake but preserves pose changes, timing, hit feedback, health updates, and announcements.
- When the defender reaches zero health, it is permanently removed with no refund. Enemy gate ownership is recalculated on the next fixed step.
- A fallback melee defender farther down the road becomes the next whole-lane gate.

Ranger and Rune Artificer attack from grass using tile-derived range. Range visualization highlights reachable road cells as squares. The combat capability model continues to distinguish `frontline` and `backline`, so a later separately approved mage enemy can target grass defenders through the existing wind-up and impact protocol. This design creates the seam but does not add mage art, waves, or balance.

## Enemy population and visual readability

- At most 18 living enemies may exist simultaneously.
- Scheduled enemies beyond the limit enter a deterministic FIFO pending queue.
- A pending enemy spawns when a living slot becomes available and its authored spawn tick has passed.
- A wave and level are not complete until scheduled, pending, living, projectile, and terminal presentation work is resolved.
- Pending enemies do not attack, receive damage, count as projected living sprites, or consume object-pool leases.
- Boss phase summons obey the same cap; excess summons wait in authored order.
- The cap may not be bypassed by 2x speed, pause/resume, restart, visibility changes, or simultaneous defeat events.

Every living enemy receives an individual sprite. There is no aggregate proxy, density scale-down, hidden living body, or tiny queue-dot mode. Queued enemies reserve stable positions along road cells wherever possible. At a blocker, the three attackers render above the defender's resting depth while nonattackers render behind it. Health bars, plates, auras, projectiles, telegraphs, hit labels, and defeat effects use the same body transform.

At the smallest supported portrait layout, regular defenders must retain a visually inspected body height of at least 44 CSS pixels, regular enemies at least 38 CSS pixels, and bosses at least 52 CSS pixels. Tall sprite art may extend beyond a cell while its feet remain anchored within the owning square. No gameplay-density rule may reduce those minimums.

## Ten-level map and balance contract

All ten maps are re-authored as distinct connected grid routes:

- Level 1 uses a long readable S route and teaches one road melee plus one grass ranged purchase.
- Levels 2 and 3 introduce different turn directions and coverage choices while remaining forgiving.
- Levels 4 through 6 introduce the first boss, armor, replacement pressure, and mixed enemy timing.
- Levels 7 through 9 use advanced boss/support abilities, longer coverage tradeoffs, and stronger coordinated groups.
- Level 10 uses the final boss, phase changes, summons, magical pressure, and the strongest mixed formations.

The following remain fixed unless the approved implementation plan explicitly identifies a consistency correction:

- starting coins: 150;
- castle hearts: three;
- defender identity and placement roles;
- purchase and upgrade economy;
- permanent melee defeat and no-refund rule;
- maximum three simultaneous attackers at one gate;
- maximum 18 living enemies.

Waves, enemy statistics, timing, compositions, boss durability, and reference-strategy cell choices may be tuned to restore the campaign after the geometry change.

Acceptance requires:

- a no-build defeat for every level;
- two materially different deterministic mixed-roster victories for every level;
- at least 25% different occupied cells and different highest-spend defenders between each level's two winning fixtures;
- single-defender reinvestment cannot clear Levels 7 or 10;
- every defender is the highest-spend defender in at least one winning campaign fixture;
- accepted victories in Levels 4, 7, and 10 prove permanent melee defeat and a paid replacement;
- no authored winning strategy exceeds three concurrent attackers at one gate;
- all accepted commands are legal under road/grass and occupancy rules;
- Level 10 completes within the existing maximum simulation duration.

## Portrait-only responsive layout

The complete game shell uses `100dvh` with safe-area insets. Active play reserves vertical regions for a compact HUD, the 3:4 battlefield, and the defender/control dock. The battlefield size is the largest uniform 3:4 rectangle that fits both the safe width and the remaining safe height. Width and height are never independently stretched.

- Square cells stay square at every viewport and device-pixel ratio.
- The battlefield remains centered and fully visible.
- HUD values do not overlap or require horizontal scrolling.
- All four defender cards, pause, 1x/2x, and contextual upgrade/sell controls remain available without hiding the board.
- Enabled native controls have at least a 44 by 44 CSS-pixel interactive target.
- Device-pixel ratio is capped at two for predictable GPU and memory use.
- Active play has no document-level horizontal or vertical scrolling; the board and dock resize to fit the safe portrait height.
- Short phones may use a compact two-row control dock, but controls may not cover battlefield cells.
- Tablets enlarge the battlefield within available height rather than stretching it to fill width.

Capacitor/native builds request portrait orientation through the native orientation capability. Supported installed/fullscreen browsers may additionally request `screen.orientation.lock('portrait')` after a user gesture. Because iPhone and iPad Safari do not guarantee programmatic orientation lock, correctness does not depend on that API.

Whenever the viewport is landscape, the battle is fully covered by an accessible `Rotate to portrait` screen. The simulation, fixed-step accumulator, animations, timers, and audio pause. Returning to portrait clears only the orientation pause reason, resets accumulated frame time, restores focus safely, and resumes the exact battle state if no other pause reason remains. The overlay also covers menu and result screens so the product remains consistently portrait-only.

## Data flow and module boundaries

The implementation keeps four independently testable responsibilities:

1. **Grid configuration:** validates level terrain, road order, entrance, castle, and cell identities.
2. **Placement and simulation:** accepts grid commands, owns economy and entities, enforces gates and the living-enemy cap, and emits semantic events.
3. **Projection:** converts immutable presentation snapshots and events into shared grid-based display transforms.
4. **Shell and lifecycle:** owns HUD, defender cards, focus, safe-area sizing, portrait enforcement, pause composition, audio, host messages, and exit behavior.

Phaser remains a presentation consumer, not the combat authority. Animation callbacks cannot spend coins, deal damage, defeat a unit, start a wave, or complete a result. Ordinary mode exposes no QA mutation hooks.

Campaign save data continues to store medals and contiguous level unlocks rather than active battlefield coordinates, so existing trusted progress requires no destructive migration. A battle in progress is not persisted across a full reload. Corrupt-save and untrusted-reward protections remain unchanged.

## Error handling and resilience

- Invalid map geometry fails during configuration validation with a level and cell-specific error.
- Missing essential terrain, defender, enemy, boss, castle, or UI art keeps the existing named Retry/Exit loader flow.
- Optional decorative art failure leaves every build cell usable.
- Pointer coordinates outside the measured battlefield dispatch no command.
- Resize and orientation changes recompute the transform before accepting the next pointer command.
- Storage and audio denial keep the game playable with existing notices and gesture retry behavior.
- Host, visibility, manual, modal, and orientation pause reasons compose independently.
- Restart and terminal teardown clear scheduled and pending spawns, grid focus, selection, presentation events, projectiles, and every object-pool lease before a new battle begins.

## Testing and verification

Implementation follows red-green-refactor TDD. The final change is Tier 3 because it alters touch input, layout, orientation, animation, performance, lifecycle, and every level's balance.

### Automated contracts

- exact 9 by 12 geometry and 80 by 80 square cells;
- 108 unique stable cell IDs per level;
- complete road/grass partition and connected orthogonal road order;
- correct straight, corner, and cap frame selection without stretching;
- every road cell accepts both melee defenders and rejects ranged defenders;
- every grass cell accepts both ranged defenders and rejects melee defenders;
- occupied and enemy-covered cell rejection without economic mutation;
- pointer, touch, keyboard, and accessible cell-command parity;
- square range and danger-cell output with no circular battlefield markers;
- whole-lane gates, three-attacker limit, queue order, fallback blockers, attacks, armor, death, no refund, and repurchase;
- exact 18-living-enemy cap, FIFO pending spawns, boss summons, pause, 2x, restart, and terminal cleanup;
- one sprite per living unit and minimum-scale projection invariants;
- shared transforms for bodies, health, plates, auras, projectiles, telegraphs, hits, and defeats;
- all ten balance acceptance rules and deterministic repeatability;
- save, rewards, host lifecycle, audio, storage denial, exit, loader, payload, and ordinary-mode QA isolation.

### Rendered verification

One owned headed Chromium session verifies ordinary and QA paths with clean console, page-error, failed-request, and bad-response traces. The required portrait matrix includes at least:

- 360 by 640 compact Android-class phone;
- 390 by 844 iPhone-class phone;
- 393 by 852 Android-class phone;
- 768 by 1024 compact tablet;
- 820 by 1180 iPad-class tablet;
- 1024 by 1366 large iPad-class tablet.

Landscape checks at corresponding rotated dimensions verify only the rotate overlay and frozen state. Browser evidence covers Level 1 ordinary play; representative Levels 4, 7, and 10; road and grass placement across corners and edges; permanent defeat and repurchase; boss phases; dense 18-enemy projection; 1x/2x/pause; reduced motion; restart; standalone and iframe exit; host mute and pause; orientation pause; and focus escape.

Performance acceptance retains desktop 60 FPS and mobile 30 FPS gates under the densest authored Level 10 scene. Pools must reuse and reset cleanly. The complete first-load payload remains below 15,000,000 raw bytes.

Physical-device truth is reported accurately. Headed Windows Chromium is physical desktop-browser evidence. Android, iPhone, iPad, Safari, and Capacitor are emulated or code-reviewed unless corresponding physical hardware is actually available.

## Scope boundaries

This change does not add a mage enemy, flying units, new defender classes, branching roads, multiple simultaneous lanes, manual unit movement, revival, healing purchases, permanent campaign upgrades, new raster character strips, multiplayer, or landscape gameplay. A future mage enemy may use the approved backline-targeting seam in a separate design.
