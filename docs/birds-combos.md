# Bird combos

Tier 3: app point awards, saved best scores, canvas feedback, sound pitch, pause/resume and compact touch layouts. Preserve the existing woodland art, game physics, star rules, coin economy and original birds.

Plan: add an attempt-local hit chain, connect its points to the existing clear award, protect historical stars, then verify actual collisions, resets, pauses and responsive results in isolated browser saves.

Each distinct bird in a drop adds 10 × its position in the chain: x1 = 10, x2 = 20, x3 = 30. The three-bird bonus totals 60. There is no timer between birds, so planned routes and pauses do not break the chain. Clear the entire flock to bank the bonus alongside the existing 100-point clear and two 25-point bonuses; a three-star three-bird clear totals 210 points. Partial or failed drops do not award points. Retry, level change and trapped-ball recovery reset the chain. Opening the map or shop pauses it.

The existing flock tally gains a compact second line, without adding a new HUD row. Compact desktop spacing applies up to 950px high so the tally remains visible in the live side panel without scrolling the settings column. Canvas popups show each hit's multiplier and points for 1.6 seconds; reduced motion keeps the label stationary. At most three popups exist. Bird sound pitch rises with the multiplier using the existing sound and mute/pause controls. Result stats separate the combo bonus and total awarded points. Best records compare stars first, then points, then time, so an older three-star record survives a lower-star run with the new bonus.

No new page scrolling is introduced. The existing shop/map/product scrolling and small-screen result-content scrolling remain intentional exceptions. Physical browser and native-shell checks remain blocked by device-lab authorization; local WebKit and touch viewports are emulation.

## Verification (2026-10-21)

- `node --test scripts/birdsComboAudio.test.mjs scripts/birdsShop.test.mjs`: five tests pass, including ascending playback pitch with mute/pause/source limits and the unchanged shop economy.
- `scripts/birdsCombo.browser.mjs`: desktop Chromium, Android touch emulation, iPhone WebKit, iPad WebKit and reduced-motion WebKit pass. Each profile completes all 18 reference routes through real production collisions: 90 clears with the expected x1/x2/x3 totals and one award per clear. Additional cases verify duplicate hits, partial failures, edit/retry, trapped-ball recovery, modal/host pause, stationary reduced-motion labels, old three-star records, reloads, live popups, 900px desktop tally visibility, and 320px / 150% text result/shop/map navigation. Report and screenshots: `output/birds-combos/final.json` and adjacent PNGs. `*-live-combo.png` captures real route collisions in isolated synthetic saves.
- The final report's iframe fixture uses the production points bridge and confirms one 210-point event with 60 combo points and x3 metadata. It also checks first-visit instructions and starting play at 320px / 150% text. This verifies local messaging, not authenticated cloud persistence.
- `scripts/birdsShop.browser.mjs` desktop regression passes purchase/refill/reward/save/modal checks after the scoring change. `output/birds-shop/combo-regression.json`.
- `npm run audit:games` passes all 83 entries. `node node_modules/vite/bin/vite.js build` passes; inline scripts parse; `git diff --check` passes. All 11 game source files match the built public copies byte for byte. Combined SHA-256: `975283a96fa61ce0ef91ac13d8a394f14d825e1ff885b0eb126085c54878a977`, matching the final browser report; per-file hashes: `output/birds-combos/source-sha256.json`.

No physical devices or native shells were tested. Audibility, real-device frame pacing and authenticated server persistence remain unverified. The existing user preview and its points/coins were preserved; all simulated hits and rewards ran in separate test contexts.
