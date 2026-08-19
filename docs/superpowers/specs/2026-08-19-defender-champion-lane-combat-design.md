# Defender Champion Lane Combat Design

**Status:** Approved in chat on 2026-08-19
**Validation tier:** Tier 3
**Supersedes:** The path, build-pad, and "enemies never attack defenders" rules in `docs/superpowers/specs/2026-08-18-defender-champion-design.md`. All non-conflicting campaign, economy, accessibility, host, asset, and quality requirements remain in force.

## Goal

Make Defender Champion read and play like the supplied path-defense reference: one consistently sized sand road winds from the top of the meadow to the castle, melee defenders stand directly on that road and hold the entire lane, ranged defenders deploy on grass, and enemies visibly attack and permanently defeat blocking melee defenders.

The term **ranged** is authoritative. The user's earlier word "aerial" referred to Ranger and Rune Artificer, not flying units. No flying defender roster is added.

## Chosen approach

Keep the deterministic fixed-step simulation and Phaser projection. Re-author all ten routes as axis-aligned top-to-bottom polylines and render them from the existing path atlas with one 112-world-pixel width. Replace the undifferentiated pad model with typed `road` and `grass` placements while preserving eight authored placement choices per level.

Bladeguard and Ironwarden become durable road blockers. A living blocker stops the whole lane at its guard progress. Up to three enemies form the attacking front rank; remaining enemies queue behind them. Enemies use deterministic wind-up and impact timing, while Phaser produces a readable attack animation from existing sprites through wind-up, lunge, strike effect, defender recoil, and recovery. This avoids adding raster strips to a runtime with only about 253 KB of payload headroom.

Ranger and Rune Artificer remain grounded ranged defenders on grass. Existing enemies target road defenders only. The data model nevertheless exposes defender combat layers and enemy target capabilities so a later mage enemy can attack grass-based ranged defenders without replacing the lane system. The mage itself is not part of this change.

## Alternatives rejected

### Dedicated enemy attack strips

Nine additional enemy-family action strips would offer bespoke motion but would exceed the 15,000,000-byte first-load budget unless approved existing art were recompressed or removed. Runtime combat motion uses the already approved sprites and effects instead.

### Continuous free placement

Allowing placement at every road or grass pixel would require collision sampling, ambiguous touch hit areas, and substantially larger balance coverage. Authored placement points provide exact legal positions, accessible keyboard navigation, deterministic strategies, and clean enemy queues.

### Cosmetic gates without defender health

A temporary visual stop would not satisfy enemies attacking and permanently defeating melee defenders. Frontline health, damage, attack cadence, defeat, and repurchase are simulation rules rather than scene-only effects.

## Map and road contract

- The battlefield remains a 720 by 960 Phaser world.
- Level path coordinates remain in the existing logical coordinate space and are projected through the current battlefield transform.
- Every route begins near the top edge and ends at the castle near the bottom edge.
- Every adjacent path point shares either its x coordinate or its y coordinate. Diagonal segments are invalid.
- Every segment is long enough to contain its two endpoint pieces without reversing or collapsing.
- The rendered road width is exactly 112 world pixels for straights, corners, and caps on every level.
- Horizontal segments use the horizontal atlas frame, vertical segments use the vertical frame, turns use the matching directional corner, and the entrance/castle ends use directional caps.
- Segment bodies are trimmed beneath corner and cap pieces so no road section becomes wider at a join.
- Level 1 uses the reference's long, readable S-shaped route. Levels 2–10 use distinct orthogonal routes with the same width and progressively more demanding guard/ranged relationships.
- The castle is anchored to the final path point. Props and grass placements maintain clear road and castle silhouettes.
- Each level has exactly eight placements: four `road` guard slots and four `grass` ranged slots.
- Road slots store `pathProgress`; their display point is derived from the shared path sampler. Grass slots store logical x/y coordinates.
- Placement markers are subdued by default and become strongly legible only for the currently selected compatible role. Illegal placements never dispatch a build command.

## Defender placement and durability

Defender configuration gains immutable `placementLayer`, `maxHealth`, and `armor` data.

| Defender | Placement | Combat layer | Durability role |
| --- | --- | --- | --- |
| Bladeguard | road | frontline | Lower-cost balanced blocker |
| Ironwarden | road | frontline | Expensive high-health, high-armor blocker |
| Ranger | grass | backline | Long-range physical damage |
| Rune Artificer | grass | backline | Shorter-range magical splash damage |

- A build is accepted only when defender and placement layers match.
- A road defender starts at full health. Its health and maximum health are included in deterministic snapshots.
- Upgrading adds the tier's maximum-health increase to current health; it does not erase existing missing health.
- A road defender at zero health is removed immediately, emits one defeat event, clears effects that target it, frees its slot, and gives no refund.
- Replacing a defeated defender is a fresh purchase at the normal Tier 1 price.
- An engaged road defender cannot be sold. This prevents escaping a lethal hit for a refund. Ranged and unengaged road defenders retain the existing 70% sell rule.
- Existing defender attack and mastery strips remain authoritative. Melee target selection favors enemies participating in or queued at that defender's gate before using the existing role priority.

Base health, tier health increases, armor, and enemy damage are balancing values. They may be tuned without changing the approved layer, permanent-defeat, or whole-lane rules.

## Whole-lane blocking and queues

- Each living road defender defines a gate at its placement's `pathProgress`.
- For an advancing enemy, the next living gate ahead is the first gate it can encounter. An enemy cannot move beyond that gate while its defender survives.
- The leading three enemies at a gate form a stable front rank ordered by path progress, spawn tick, and numeric entity ID.
- Front-rank enemies occupy deterministic contact offsets and may attack. All remaining enemies occupy deterministic queued offsets behind them and cannot attack until promoted.
- Queue spacing and lateral offsets remain bounded within the 112-pixel road. Dense waves may overlap slightly but must never leave the road or hide the blocker.
- A blocker stops the entire lane regardless of enemy count. Multiple road defenders form fallback gates: the first encountered gate holds until defeat, then enemies advance toward the next.
- Stunned enemies neither advance nor complete attacks. A stunned defender remains a physical blocker but cannot attack.
- Boss abilities, support effects, armor plates, summons, and castle damage continue to use active simulation time.
- If a blocker dies during an impact, all enemies reassess gates on the next fixed step. Stable iteration prevents a same-tick double hit or skipped defender.

## Enemy attacks

Enemy configuration gains immutable frontline attack data:

- `attackDamage`: damage before defender armor.
- `attackCooldownTicks`: active-time delay between attack starts.
- `attackWindupTicks`: active-time delay from warning to impact.
- `attackTargets`: initially `['frontline']` for every current enemy.

Standard enemies have role-appropriate values: Skitters attack quickly, Shellguards slowly, Hexcallers weakly, and Crushers heavily. Mossback Brute, Ironhide Warlord, and Dread Colossus hit materially harder than standard units. The exact values remain balance parameters.

At attack start the simulation records the target tower and emits `enemy-attack-start`. At the exact impact tick it revalidates the attacker, target, stun state, and gate relationship before applying armor-reduced damage and emitting `enemy-attack-impact`. Interrupted or invalid attacks are cancelled rather than redirected mid-swing.

Phaser projects each attack as:

1. stop the walk loop and show a brief wind-up;
2. move the body toward the defender with an enemy-specific scale and boss-safe travel cap;
3. trigger the existing slash/bash/magic impact art at the simulation impact event;
4. flash and recoil the defender while updating its health bar;
5. recover the enemy to its deterministic path-projected position and resume walking or waiting.

Reduced-motion mode removes travel and shake but retains timing, pose change, impact flash, health update, and accessible status text. Animation completion cannot apply damage; the simulation event is the sole authority.

## Future mage seam

The current roster remains unchanged. The new interfaces make the later unit additive:

- Defenders declare `combatLayer: 'frontline' | 'backline'`.
- Enemies declare `attackTargets: readonly CombatLayer[]`.
- Lane contact attacks require `frontline` capability.
- A later mage may declare `attackTargets: ['backline']`, select a grass defender in spell range, and use the same wind-up/impact event protocol with a projectile or spell projection.
- Tests include a synthetic backline-capable enemy fixture proving the capability seam, but no mage waves, art, name, balance, or campaign lesson ship in this change.

## UI and accessibility

- Defender cards say `Road melee` or `Grass ranged` rather than ambiguous range-only roles.
- Selecting a melee card highlights only road guard slots; selecting a ranged card highlights only grass slots.
- Pointer, touch, keyboard, and screen-reader announcements all identify placement type and rejection reason.
- Road markers and health bars remain legible at phone scale without covering the path.
- A defeated defender announces its name and that the road slot is available for repurchase.
- Focus order, 44 CSS-pixel targets, modal containment, pause composition, safe areas, host sound, exit, and QA-only hook rules remain unchanged.

## Balance acceptance

The lane system changes path time, enemy density, coin loss, and defender value, so all ten levels and reference strategies must be re-authored and replayed.

- The original deploy and upgrade prices remain unchanged.
- Starting coins remain 150 and castle hearts remain three.
- Every level has two deterministic mixed-roster victories with different highest-spend defenders and at least 25% different occupied placements.
- A no-build strategy loses every level.
- Single-defender reinvestment cannot clear Levels 7 or 10.
- Every defender is the highest-spend unit in at least one winning campaign fixture.
- At least one accepted victory in Levels 4, 7, and 10 replaces a permanently defeated melee defender.
- Bosses remain stronger frontline attackers than standard enemies without making unavoidable melee death the only outcome.
- Level 1 visibly teaches one road melee and one grass ranged placement.
- A late-level dense queue must project every living enemy, keep pools bounded and reusable, and meet the existing desktop 60 FPS and mobile 30 FPS gates.

## Testing and verification

Implementation follows red-green-refactor TDD.

Automated contracts cover:

- orthogonal top-to-bottom paths, exact 112-pixel road width, atlas piece selection, and eight typed placements per level;
- placement compatibility and accessible rejection reasons;
- defender health, upgrade health delta, engaged-sell rejection, permanent defeat, slot reuse, and no refund;
- full-lane stop, three-enemy front rank, stable queue ordering, fallback gates, stun interruption, and castle resume;
- enemy wind-up/impact timing, armor, boss damage ordering, presentation events, and synthetic backline targeting capability;
- snapshots, terminal cleanup, restarts, pools, payload, host lifecycle, save/reward behavior, and all prior campaign contracts;
- two winning strategies and required losing fixtures across all ten levels.

Tier 3 browser verification covers ordinary and QA modes, Level 1 end-to-end play, representative Levels 4/7/10, melee purchase/death/repurchase, enemy attack motion, road/grass rejection, keyboard and touch placement, pause/visibility/restart cleanup, reduced motion, iframe and standalone behavior, dense queue performance, clean console/network output, and responsive portrait/landscape layouts.

Physical-device truth must be stated accurately. Desktop headed Chrome is physical Windows browser evidence; phone/tablet matrices are emulated unless real Android, iPhone, iPad, Safari, or Capacitor hardware is available.

## Scope boundaries

This change does not add flying units, a mage enemy, new enemy raster strips, a second lane, branching paths, manual unit movement, player-controlled attacks, revivals, healing purchases, or permanent campaign upgrades. Those ideas require separate approved designs.
