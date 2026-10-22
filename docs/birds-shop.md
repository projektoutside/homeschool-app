# Woodland workshop

Tier 3: local economy persistence, modal focus and pause, touch layouts, and equipment that changes ink and collision geometry.

The workshop extends the existing cream, forest-green, brass woodland world using Fredoka and Nunito. It is an Operate surface: a clear wallet, useful supplies, real ball material previews, and legible purchase states. A native modal protects a paused game; its product list intentionally scrolls while its close, wallet and return controls remain visible. No page overflow or new illustration dependency.

Implementation plan: add a bounded, additive economy save; connect clears, purchases, consumables and frozen attempt loadouts; build the shop; verify transactions, migration, responsive controls and every level with the larger ball.

Coins are local to this game, separate from app points. A new save starts with 60 coins. Historical clears grant 60 per completed level plus 15 per earned star once. Each future clear grants 15, first clears add 60, and each improved star adds 15. The per-level reward ledger and wallet save together. A failed purchase save grants no item and spends no coins. Storage is local/offline, not an account-synchronized or tamper-proof economy.

Ink bottles cost 30, restore the current meter without removing paths, and are usable only before dropping with ink missing. Bag limit: 9. Permanent capacity tiers cost 120/240/420 for +15/+30/+50%. The Boulder ball costs 240 and has actual radius 14 versus 12. Two additional right rail tips in levels 9 and 13 were shortened to x292, leaving 31 pixels for its 28-pixel diameter, while preserving their slope and reference routes. Finishes and a firefly trail are optional cosmetic unlocks. Purchases select owned equipment, which applies only on a fresh attempt; retries with preserved lines and trapped-ball recovery retain the current attempt's loadout. Original equipment remains selectable free.

Physical device coverage remains blocked by the device lab's authorization gate; local browser emulation does not establish physical iPhone/iPad performance or native shell behavior.

## Local verification (2026-10-21)

- `node --test scripts/birdsShop.test.mjs scripts/birdsCampaign.test.mjs scripts/birdsPhysics.test.mjs`: 18 passing tests. After the final malformed-value guards, the four economy tests passed again, as did the browser storage/migration suite using nested malformed values.
- `scripts/birdsShop.browser.mjs`: desktop Chromium, Android touch emulation, iPhone WebKit and iPad WebKit all pass rewards, duplicate taps, purchases, refills, ownership, reload persistence, airborne loadout preservation, modal pause, keyboard focus, small-screen/text-zoom results, and result-to-shop/map navigation. Reports: `output/birds-shop/accepted.json` and `storage-final.json`. These are isolated synthetic saves, not purchases in the user's live preview.
- `scripts/birdsRolling.browser.mjs` with `BIRDS_ROLLING_RADIUS=14`: 810 fixed-platform drops across all 18 levels in desktop Chromium and phone/tablet WebKit reach the floor; connected/noisy/overlapping strokes and trapped-ball recovery pass. Report: `output/birds-rolling/boulder-final.json`.
- Campaign balance and tolerance checks pass all 18 reference routes and all 144 drawing/aim perturbations. Full 18-level control-driven playthroughs pass desktop, Android touch, iPhone WebKit and iPad WebKit. The iPhone playthrough was repeated after the final small-screen modal changes. Reports: `shop-balance-final.json`, `shop-final-chromium.json`, `shop-final-webkit.json`, and `shop-accepted-iphone.json` under `output/birds-campaign-design`.
- Level-map regressions pass small-phone, keyboard/live unlock, and iframe pause/responsive checks. Report: `output/birds-level-map/shop-regression.json`.
- `npm run audit:games`: 83 content entries pass. `node node_modules/vite/bin/vite.js build`: passes. Inline scripts parse and `git diff --check` passes.
- All 11 game source files match their built public copies byte for byte. Final combined source/build SHA-256: `5d431e7385aecca312301ccd81b7e7645ae623075146b8bfc222a2bab6980067`; per-file hashes are retained in `output/birds-shop/source-sha256.json`. UI reports preceded only the final defensive malformed-value guard in the economy model; that final model is covered by the unit and storage-final checks.

The mobile shop shares the existing top toolbar to preserve playfield size. On small phones, results use the available viewport with contained content scrolling; their action buttons stay above gameplay controls. Short desktop windows intentionally scroll the settings column rather than the whole page. The native shop's wallet/close/return controls stay pinned while products scroll. Real-browser viewport and WebKit engine checks are emulation, not physical hardware or Capacitor certification.
