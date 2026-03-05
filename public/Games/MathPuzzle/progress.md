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
