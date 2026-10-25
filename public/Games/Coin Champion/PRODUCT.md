# Coin Champ

<!-- impeccable:product-schema 1 -->

## Platform

web

## Purpose and users

Explicit: a complete, playful Coin Champ rebuild for students from young children
through teens, inspired by Analog Clock Game, Many Birds One Stone, Word Puzzle,
Math Puzzle, and Preschool Fun. Primary play must fit the available screen.

Observed: this game teaches the existing U.S. penny, nickel, dime, and quarter
values. It runs standalone or inside the homeschool app's game iframe.

## Capabilities

- Twelve-stop adventures at Starter, Explorer, and Master levels.
- Coin identification, counting, exact payment, change, and fewest-coin puzzles.
- Eight-round Count, Make, and Change practice sessions.
- Four-round Coin Sort, Memory Match, and Treasure Hunt mini games, with
  Starter/Explorer/Master difficulty and the same stars, tickets, and app points.
- A main menu on every opening, with separate Play and Continue actions.
- A 3, 2, 1, START! screen before new or continued play.
- Hints, optional read aloud, keyboard/tap/pointer-drag controls, and an optional round timer.
- Stars, a passport, earned tickets, and cosmetic tray prizes. No real purchases.
- Device-local round recovery, settings, prizes, and progress; existing v1 best
  scores and preferences migrate without deleting their original record.
- Existing shared app points and game-exit message contracts remain in use.
- Photographic coin faces on beveled 3D coins, with spinning drops, a short
  landing rebound, and optional landing clinks. Tap, drag, and keyboard share
  the same immediate coin-selection rules.

## Constraints and evidence

Use local assets and relative URLs; no new runtime packages or CDN dependencies.
The app owns authentication and shared points. Coin Champ owns its local save.
One device profile is shared by this game's tabs; account/cloud synchronization
and simultaneous-tab save reconciliation are not implemented here.

The menu keeps the carnival illustration. Play uses a quiet cream/mint table,
one plain-language prompt, individual counting coins, and a clearly labeled
coin box. Reward counters and challenge choices stay off the active play screen.
The start countdown and round timer pause for Help and background visibility;
returning to the menu cancels a pending start.

One on-demand Three.js renderer draws the coins, sleeps when settled, and pauses
for Help/backgrounding. Reduced motion settles immediately. A photographic DOM
fallback preserves the game when WebGL is unavailable or its context is lost.
Coin image credits are in Help and `assets/coins/SOURCES.md`.

More ways to play opens a game room with Fun games and Coin practice collections.
Coin Sort accepts either a jar tap or a coin drag. Memory matches photographic
coins with their total value; mismatches stay visible until Flip back. Treasure
Hunt uses a limited map of coins to reach an exact goal, with return/Undo/reset.
Difficulty increases sorting piles (6/8/12), memory pairs (3/4/6, with larger coin
bundles), and treasure maps (6/9/12). The most recent active game saves after
every move, including revealed/matched memory cards and selected treasure coins.
Continue names that saved game. One active game per browser profile remains the
storage model; this is not independent cloud or simultaneous multi-game saving.

Browser emulation does not prove physical touch, audio, safe areas, native shell
behavior, or student enjoyment. See the project QA report for actual coverage.
