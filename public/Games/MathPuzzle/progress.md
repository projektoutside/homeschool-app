Original prompt: i want this new thread to be focus on the game app folder called "MathPuzzle". Lets focus on enhancing and upgrading this game. first analyze and understand exactly what type of game im building, then i want you to implement this new feature. I want you to create color boxes that only for the numbers and not for the yellow operation symbols. Create 5 different color boxes, (white, blue, green, orange, red). any numbers that has these colors will be worth the color points:
White - 3 points
Blue - 4 points
green - 5 points
orange - 7 points
red - 10 points

but make sure that the spawn rates are like this:
white - 35%
blue - 25%
green - 20%
orange - 15%
red - 5%

I want you to double check with each edit to ensure that nothing breaks while adding this new feature into the game. I want to make users feel excited when playing but yet still learning. lets focus on making sure spawn percentages and points are working correctly before we move on to the next edits.

## Progress
- Located MathPuzzle at public/Games/MathPuzzle and inspected index.html, GameController.js, MathGameController.js, MathGenerator.js, and styles.css.
- Identified current behavior: number blocks are all orange, symbol blocks are yellow, and scoring is currently fixed at 100 * level per correct answer.

## TODO
- Add weighted number color assignment (white/blue/green/orange/red) to answer block generation only.
- Attach per-tile point metadata and update scoring to sum used number tile points.
- Add CSS color variants for number blocks and preserve yellow symbol styling.
- Validate weighted spawn percentages and score calculation with deterministic checks.
- Run gameplay sanity checks for drag/drop and score UI.
- Implemented weighted number color tiers in MathGameController with exact config:
  - white: 35% / 3 pts
  - blue: 25% / 4 pts
  - green: 20% / 5 pts
  - orange: 15% / 7 pts
  - red: 5% / 10 pts
- Added tile metadata on number blocks only (`data-color-tier`, `data-color-points`) and class assignment (`number-color-*`).
- Updated scoring logic to award points from placed number tiles in the solved equation (`calculatePlacedNumberColorPoints`) instead of fixed level-based points.
- Added CSS color variants for number blocks and kept operation symbols unchanged/yellow.
- Adjusted `.answer-block.placed` styling to preserve each tile's assigned color while placed.

## Validation
- `node --check public/Games/MathPuzzle/js/controllers/MathGameController.js` passed.
- Monte Carlo spawn simulation (200,000 rolls) validated weighted distribution closely:
  - white 35.05%, blue 25.03%, green 19.81%, orange 15.07%, red 5.04%.
- Live browser validation (served via local HTTP):
  - Number tiles had color class + color point metadata.
  - Symbol tiles had no color tier metadata and remained yellow.
  - Solved equation awarded score delta exactly equal to sum of placed number tile color points (expected 10, awarded 10).
  - Click-to-place interaction still worked (filled slots incremented from 0 to 1).

## TODO
- Optional next enhancement: add a small on-screen legend for color-to-point values so players can learn/reward-plan quickly.

## Follow-up Debug (Main App not showing latest MathPuzzle in npm run dev)
- Root-cause analysis found app-level cache behavior, not a MathPuzzle logic issue:
  - `usePWA` registered service worker in dev mode, allowing stale cached game files to persist.
  - `Home.tsx` game prefetch used `cache: 'force-cache'`, reinforcing stale launch docs/assets.
- Applied fixes:
  - `src/hooks/usePWA.ts`: In dev mode, skip SW registration and unregister existing SW registrations.
  - `src/pages/Home.tsx`: Disable game prefetch path in dev mode.
  - `src/pages/GamePlayer.tsx`: Add dev-only cache-busting query param when loading local custom HTML game paths.
- Validation:
  - `npm run build` passes after changes.
  - In dev browser session, service worker registrations become empty after reload.

## Follow-up Gameplay UX + Spawn Safety (current task)
- User-reported behavior: saw 2 red number boxes in a single puzzle and requested spawn check + visible point guide + automatic new problem on wrong answers.
- Implemented in `MathPuzzle`:
  - Added a compact in-game points guide panel showing all number colors and per-color point values.
  - Added live `This puzzle: X pts` display (`#currentProblemPoints`) to show total points available in the current puzzle.
  - Updated answer-color assignment flow to use per-round tier assignments with a **red cap of 1 per puzzle**.
  - Kept weighted tier sampling logic and applied it to round assignment.
  - Changed incorrect-answer flow to automatically load a new puzzle after short feedback delay.
  - Added `scheduleNextQuestion` timeout management to avoid overlapping transitions.
- Files changed:
  - `public/Games/MathPuzzle/index.html`
  - `public/Games/MathPuzzle/css/styles.css`
  - `public/Games/MathPuzzle/js/controllers/MathGameController.js`

## Validation
- `node --check public/Games/MathPuzzle/js/controllers/MathGameController.js` passed.
- `node --check public/Games/MathPuzzle/js/controllers/GameController.js` passed.
- `npm run build` passed.
- Spawn simulation (100,000 rounds each) for updated per-round assignment:
  - 2-number puzzles: red-duplicate rounds = 0; distribution ≈ white 34.94%, blue 25.14%, green 19.97%, orange 15.04%, red 4.91%.
  - 3-number puzzles: red-duplicate rounds = 0; distribution ≈ white 34.94%, blue 25.09%, green 20.04%, orange 15.16%, red 4.77%.
  - 4-number puzzles: red-duplicate rounds = 0; distribution ≈ white 34.99%, blue 25.17%, green 20.07%, orange 15.10%, red 4.68%.

## Follow-up UI placement + professional alignment (current task)
- Moved `This puzzle: X pts` from the legend panel into the header timer box top-right badge area.
- Refined header layout to use right-side game info group (`Score`, `Time`) while preserving left action buttons.
- Reworked the color legend to equal-width responsive tiles (grid-based), so all color/point cells align evenly.
- Added responsive breakpoints for legend and header so the layout adapts cleanly across device widths.

## Validation
- `npm run build` passed.
- Live browser verification (local HTTP server + Playwright):
  - Timer box shows `This puzzle: X pts` badge in top-right.
  - Color legend renders as evenly sized cells with consistent alignment.
  - No functional regressions observed in gameplay start flow.

## Follow-up precision placement + 5-column safety lock (current task)
- User requested exact placement of current puzzle points in the top-right empty header section while keeping score/time centered and unchanged.
- Implemented:
  - Restored centered `Score` + `Time` header layout.
  - Moved `This puzzle: X pts` into a dedicated top-right header badge (`.header-problem-points`).
  - Locked color guide to **exactly 5 equal columns** at all widths (no breakpoint column collapse).
  - Added compact scaling + truncation safeguards so items stay one row and never wrap to a second row.
- Files updated:
  - `public/Games/MathPuzzle/index.html`
  - `public/Games/MathPuzzle/css/styles.css`
  - `public/Games/MathPuzzle/js/controllers/MathGameController.js`

## Validation
- `node --check public/Games/MathPuzzle/js/controllers/MathGameController.js` passed.
- `npm run build` passed.
- Playwright runtime verification at 360px viewport:
  - `pointsGuideLegend` computed `gridTemplateColumns`: `65.25px 65.25px 65.25px 65.25px 65.25px`
  - `itemCount`: 5
  - `uniqueRowCount`: 1 (confirmed no wrap to extra row)

## Follow-up visual refinement (current task)
- Removed border/chip styling from top-right `This puzzle: X pts` display and increased its size for cleaner header consistency.
- Reduced bottom control row height again by tightening:
  - overall panel padding/gap,
  - instruction panel min-height/font/padding,
  - control button size/font,
  - star row/indicator sizing.
- Kept color guide locked at fixed 5-column grid.

## Validation
- `npm run build` passed.
- Playwright runtime check confirmed:
  - top-right points text has no border (`0px none`),
  - points font size is larger (`13.44px` in sampled viewport),
  - color legend remains 5 columns and 1 row,
  - control bar rendered at reduced height (`54.625px` in sampled viewport).

## Follow-up header readability + score/time boxing (current task)
- Increased top-right `This puzzle: X pts` font size again for stronger readability.
- Added bordered boxed styling for both `Score` and `Time` in the header.
- Preserved existing header layout and puzzle-point placement behavior.

## Validation
- `npm run build` passed.
- Playwright runtime check confirmed:
  - top-right points font size now `16.64px` in sampled viewport.
  - `Score` border: `0.8px solid`.
  - `Time` border: `0.8px solid`.
