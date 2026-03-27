Original prompt: i want you to focus on the "Cage Pet Rescue" game. Please make this edit to the game, i want you to focus on making this significant change to the game where the user now instead of getting 4 math questions, the user is now only getting ONE math problem question only. so turn the visual display panel at the bottom of the 4 math questions perfectly into one large math question only. the large box should cover the entre area of replacing where the 4 questions were enlarging it to fit perfectly according to the viewers display panel console screen. ensure safety features to ensure rich perfect borders all around all components. and also lets make the "EP" number selection section a little bit larger now since we will have more spacing available as well. lets perfectly balance the visuals of this bottom section in a more neat organize professional way to ensure a easy rich perfect beautiful user friendly experience.

2026-03-20
- Replaced the four-card math deck with a single large `Math Challenge` card in the bottom panel.
- Reduced challenge runtime from four simultaneous problems to one active problem and one timer.
- Enlarged and rebalanced the EP selector panel and strengthened borders/background treatment for the bottom section.
- Live verification completed with Puppeteer at desktop, phone portrait, phone/tablet landscape, and tablet portrait viewports.
- Verified in-browser: first difficulty selection stays free, one correct answer awards one normal EP payout and regenerates one problem, one wrong answer increases stress and regenerates one problem, and Math Wizard solves one visible problem and awards one single-problem payout.
- `npm run audit:games` passed.
- `npm run check` timed out twice in this environment while running the repo-wide lint/build chain, so there is no clean repo-wide pass result from that script in this run.
- Targeted verification passed: `node --check` on `runtime.js`, `constants.js`, and `problem-config.js`, plus `git diff --check` on the edited files.

2026-03-20 follow-up
- Added classroom-style stacked rendering for place-value arithmetic in the bottom math panel so multi-digit and money addition/subtraction style problems line up by column instead of breaking across confusing centered lines.
- Kept plain inline rendering for negatives, algebra, and mixed-expression problems where a stacked worksheet layout would be less clear.
- Added tabular-number styling and compact-landscape safety caps so stacked problems stay aligned and readable inside the bottom card on smaller screens.
- Live browser verification completed for the new stacked formatter in emulated phone portrait and compact landscape layouts. Physical-device testing was not performed in this run.
- Targeted verification passed again: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check` on the edited Cage Pet Rescue files.

2026-03-20 inline safety follow-up
- Added a dedicated `.math-problem-inline` single-row renderer and moved width caps onto stacked-only math problem styles so longer inline expressions use the full bottom problem area before shrinking.
- Added inline font-fit safety logic in `runtime.js` so long mixed-operation expressions shrink within bounded limits and keep protected side margins instead of wrapping into a second row.
- Live browser verification forced the real level 7 template `60 ÷ (6 + 4) = ?` and confirmed it stayed on a single row in desktop, compact portrait, and compact landscape layouts with no wrap and preserved side margins.
- Verification passed in this run: `node --check public/Games/cagepetrescue/src/game/runtime.js`, `git diff --check -- public/Games/cagepetrescue/src/game/runtime.js public/Games/cagepetrescue/styles/components.css`, `npm run audit:games`, and `npm run check`.

2026-03-26 goblin round intro
- Added `newgoblin.glb` round-intro support with a cached GLB load path, per-round skeleton clone, procedural flight pose, three strike beats on the chain, exit cleanup, and a safe fallback that skips the intro if the asset fails to load.
- Added the non-interactive `#goblin-launch-badge` to the top-left player panel and matching styles, plus blue `round-intro` / `round-intro-final` timer states for the intro countdown.
- Generalized the DOM-to-world projection helper so the goblin can launch from the player panel into the 3D scene and target the cage chain attach point.
- Extracted cage/chain/pet shake into a reusable visual-only helper so goblin strikes shake the chain without adding stress or triggering loss logic.
- Re-routed `startGame()` and `transitionToNextPet()` through a shared round-activation path so the goblin intro runs before controls, lock picks, cloud spawning, and lightning resume.
- Added cleanup guards for restart, lose, reset, success, and interrupted transitions so stray goblin roots, intro timers, and legendary jolt loops are removed cleanly.
- Validation passed: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check -- public/Games/cagepetrescue/src/config/constants.js public/Games/cagepetrescue/index.html public/Games/cagepetrescue/styles/components.css public/Games/cagepetrescue/src/game/runtime.js`.
- `npm run audit:games` still fails on pre-existing missing worksheet HTML files outside Cage Pet Rescue under `public/Worksheets/*`; no new Cage Pet Rescue audit errors were introduced by this feature.
- Desktop runtime proof completed for the initial round intro and the lost-pet transition intro. The blue intro timer, lock/control gating, and post-intro resume behavior were observed live, and the earlier skinned-mesh renderer error was fixed by preserving the original GLB skeleton for cloning.
- Emulated responsive spot checks completed for phone portrait, compact landscape, and tablet layouts. The goblin launch badge stayed visible in the top-left utility panel in those viewports, and no new console errors appeared during the final responsive passes.
- Remaining validation gap: a full rescue-to-next-pet intro replay was not completed end to end in this run because the default key inventory starts at zero and the live session repeatedly hit loss flow before finishing the treasure-cloud/key acquisition path needed for a rescue. The rescue transition code path was updated and code-reviewed, but it still needs one live rescue pass.

2026-03-26 goblin perch and glow follow-up
- Reduced the normalized `newgoblin.glb` scale so the intro goblin now reads much closer to the Math Wizard size instead of dominating the chain area.
- Reworked the intro choreography so the goblin flies in, settles onto the chain, and stays perched there for the remaining intro countdown while continuously tugging at the chain instead of peeling away early.
- Added a Math-Wizard-style blue aura stack around the goblin rig with pulsing emissive materials, a tighter point light, and additive spark particles so the GLB itself reads as magically charged during the intro.
- Validation passed: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check -- public/Games/cagepetrescue/src/config/constants.js public/Games/cagepetrescue/src/game/runtime.js`.
- Desktop runtime proof captured the perched glowing goblin with the blue intro timer active and no console errors. Emulated phone portrait and tablet portrait checks confirmed the `Goblin Strike` badge stayed visible and the intro timer still rendered correctly in smaller touch layouts.

2026-03-26 goblin visibility bugfix
- Adjusted the goblin intro after the follow-up regression where the character became too hard to see against the chain.
- Increased the goblin scale, shifted the perch farther off the chain centerline and slightly forward, and toned down the aura overlay so the GLB mesh itself stays readable instead of collapsing into a blue spark.

2026-03-26 persistent goblin pair
- Replaced the one-shot goblin strike with a mirrored two-goblin system that flies in from the `Goblin Strike` badge and then remains attached to the chain for the full active round.
- Reworked the round intro so the blue countdown only covers the fly-in and attach sequence; once the intro ends, the normal gameplay timer resumes while both goblins stay visible and keep tugging at the chain.
- Added continuous mirrored perch animation with restrained blue aura lighting and green eye glow so the goblins read as persistent characters instead of a brief attack effect.
- Preserved gameplay balance by keeping the goblin pair visual-only: no extra stress, no hidden penalties, and no lock-pick behavior changes.
- Added localhost-only debug hooks to force rescue and loss transitions during validation without changing production gameplay.
- Validation notes: desktop runtime proof passed for fresh-round persistence, forced rescue cleanup/re-entry, forced loss cleanup/re-entry, and responsive spot checks on phone portrait and tablet portrait with no new console errors.
- Validation passed: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check -- public/Games/cagepetrescue/src/config/constants.js public/Games/cagepetrescue/src/game/runtime.js`.

2026-03-26 goblin scale and facing follow-up
- Reduced the persistent goblin pair scale again so the silhouettes sit closer to the chain size instead of crowding the cage roof.
- Shifted the goblin chain look target upward and relaxed the perch torso lean so both goblins now read as facing into the chain rather than pitching down toward the pet cage.

2026-03-26 goblin inward-facing size reduction
- Halved the normalized persistent goblin size again so the pair now sits at roughly half the previous scale.
- Removed the goblin model's local 180-degree facing offset so the existing chain-target rotation now makes both goblins face inward toward the chain instead of outward away from it.

2026-03-26 goblin perch height follow-up
- Raised the persistent goblin perch anchor above the cage roof and trimmed the vertical bob amplitudes so the pair no longer dips into the cage bars during idle motion.
- Nudged the chain look target upward to keep the higher perch pose reading cleanly toward the chain after the lift.

2026-03-26 goblin chain cling follow-up
- Moved the persistent goblin pair higher up the chain by shifting the perch reference to an upper chain grip point instead of only lifting the root position above the cage.
- Reworked the cling pose so both goblins keep their arms and legs wrapped around the chain during the active round, with optional foot and toe bones used when the GLB exposes them.
- Tightened the active tug drift and bob values so the limb contact stays visually attached to the chain while the goblins keep pulling.

2026-03-26 goblin hand anchor follow-up
- Added a hand-anchor correction pass so the goblin pair no longer just faces the chain; their hand-bone midpoint is translated onto the chain grip target during settle and active cling motion.
- Kept the higher upper-link perch while enforcing visible hand contact on the center chain through the whole cling loop.

2026-03-26 goblin hand offset tuning
- Shifted the goblin hand anchors slightly forward from the wrist bones so the hands stay on the chain while the bodies sit a touch farther out instead of pressed directly into the center link.

2026-03-26 goblin hand offset retune
- Increased the hand anchor forward offset a little more so the goblins stay hand-linked to the chain while reading slightly farther out from the center link.

2026-03-26 single goblin attacker rework
- Replaced the mirrored cling pair with one persistent goblin that enters from the player panel, orbits the center chain, settles into a viewer-right hover, and remains active for the full round.
- Removed the blocking blue goblin intro pause so the normal round timer and controls begin immediately while the goblin animation runs in parallel.
- Added a five-second strike cadence that drives real chain-stress increases, lighter cage shake, and cleanup-safe recovery/respawn behavior across fresh rounds, rescues, and lost-pet transitions.
- Validation notes: static proof passed, desktop live runtime proof passed, and phone portrait, iPhone-sized portrait, plus tablet portrait emulation all showed the goblin readable on the hover/strike lane with no new console errors beyond normal AudioContext autoplay warnings.

2026-03-26 goblin visual polish follow-up
- Removed the floating aura particles from the single goblin attacker so the silhouette stays clean during hover and strike motion.
- Re-centered the glow shell and point light on the goblin body so the magical aura reads as attached to the mesh instead of drifting beside it.
- Added continuous wing-style arm flapping during hover and strike phases so the goblin feels airborne while still returning to the same right-side hover lane after each attack.
- Validation notes: desktop live browser proof and iPhone-sized portrait emulation both showed the particle-free glow aligned to the goblin with no new console errors beyond the normal AudioContext autoplay warnings.

2026-03-26 character visual upgrade pass
- Replaced the Stress Fairy and Math Wizard Fairy orb effects with a shared procedural fairy rig that adds a readable body silhouette, layered wings, halo, richer local glow, and motion-driven hover/flap behavior while preserving both features' gameplay results.
- Upgraded the goblin GLB presentation with stronger material tuning, an anchored multi-layer aura stack, a rear halo, and more intentional hover/strike body posing without changing its five-second stress attack loop.
- Kept the rendering path mobile-safe by using local emissive materials, bounded aura shells, and small anchored lights instead of full-screen bloom or detached particle clouds.
- Validation notes: desktop live runtime proof covered goblin hover/strike, Stress Fairy activation, and Math Wizard Fairy flow; Android phone, iPhone-sized portrait, and tablet portrait emulation all kept the upgraded silhouettes readable with no new console errors beyond the normal AudioContext autoplay warning.

2026-03-26 goblin fairy video sprite swap
- Replaced the `newgoblin.glb` runtime path with a video-derived transparent sprite system built from `GoblinFairy.mp4`, while keeping the existing single-goblin hover, strike cadence, stress increase, and cleanup behavior intact.
- Exported processed goblin assets under `assets/images/goblinfairy/` as atlas PNGs, transparent review GIFs, and a manifest that drives hover and attack playback from the same cutout source video.
- Removed the old rig/bone-driven goblin pose path in runtime and swapped it for atlas frame playback on a camera-facing transparent plane with anchored glow, eye-light, and hover/strike billboard deformation tuned for the sprite art.
- Validation notes: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check -- public/Games/cagepetrescue/src/game/runtime.js public/Games/cagepetrescue/src/config/constants.js` passed; desktop runtime proof confirmed sprite hover, attack, and stress increases; forced rescue and forced loss both cleared and respawned the goblin cleanly on the next round; phone portrait, iPhone-sized portrait, and tablet emulation all kept the transparent sprite readable with no console errors.
