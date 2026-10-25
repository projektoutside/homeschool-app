# Coin Champ: three new mini games

Local follow-up to `1796b7b` on `codex/coin-champ-adventure`.
Preview: <http://127.0.0.1:5173/play/coin-champ>.
Runtime fingerprint: `1796b7b+coin-variety:8428ef2e698da4be`.
The seven changed runtime files served by Vite matched their local SHA-256 values.
See [evidence](coin-champ-variety.evidence.json) and the
[structured QA ledger](coin-champ-variety.qa.json). No publication was performed.

## Added behavior

More ways to play opens a game room with three Fun games and the existing Coin
practice collection. Main menu entry, the 3–2–1–START gate, optional timer, hints,
sound, 3D coin rendering, prizes and existing app routes remain available.

| Game | Interaction | Starter / Explorer / Master |
| --- | --- | --- |
| Coin Sort | Drag the current coin into a labeled jar, or tap the matching jar. | 6 / 8 / 12 coins per round |
| Memory Match | Flip a coin-bundle card and a number card with the same value. | 3 / 4 / 6 pairs, using 1 / 2 / 3 coins per bundle |
| Treasure Hunt | Collect an exact amount from a limited map; tap chosen coins to return them. | 6 / 9 / 12 available coins |

Each new session has four rounds and explicit Next feedback. Mistakes permit
retries. Memory mismatches remain visible until Flip back, so there is no reading
deadline. Treasure supports Undo and Start over. The old adventure/practice lengths
remain twelve/eight. Completed mini rounds share existing star/ticket rules and
the `coin-champ` point/exit contracts; partial actions earn no round reward.

The existing v2 save key now carries an additive, validated mini-state object.
Sort cursor/jars, open/matched cards, treasure picks, timer and stable round IDs
save after each move. Classic saves still restore; invalid active metadata is
discarded while other guest progress remains. Continue names the saved game.
The storage model remains one most-recent active session per browser profile,
not independent per-mode bookmarks or cloud synchronization.

## Verification

- `node --test scripts/coinChamp.test.mjs scripts/coinChampCountdown.test.mjs scripts/coinChampMotion.test.mjs scripts/coinChampMiniGames.test.mjs`: **39 passed**.
  Coverage includes generated/solvable puzzles, every mode/level completing four
  rounds, duplicates, retries, memory reveal rules, treasure returns, invalid
  inputs/saves, legacy recovery, timeout and reward identity.
- `node --check` on changed JS modules and `git diff --check`: passed.
- `npm run audit:games`: passed, 84 entries. New modes stay inside Coin Champ.
- Chrome and Playwright WebKit each passed 49 full-flow assertions, completing
  all four rounds of all three new games. They checked classic Count/Make,
  tap/drag, fresh input immediately after dragging, keyboard focus/Flip back,
  saved partial states, settled reward recovery, Help/timer review, and idle GPU
  draw suppression. No uncaught page errors were observed.
- Twelve additional engine assertions checked final compact review/Continue
  behavior and touch sorting with WebGL disabled. Six same-origin iframe checks
  verified partial-no-points, one five-point completion event, reload deduplication,
  local Menu navigation, and the existing outer Games exit message.
- Total: **116 browser assertions**. The responsive matrix covered **34 states**:
  game room and all new play boards at 1440×900, 390×844, 320×568, 568×320,
  844×390, 768×1024 and 1024×768, plus engine review states. No page overflow,
  offscreen play action or occluded enabled action center remained in that scope.

## Findings resolved

The first visual pass exposed stale 3D anchor positions after layout changes.
An isolated diagnostic compared model targets with actual DOM centers. The
renderer now observes layout containers and resynchronizes on a coalesced frame;
orientation changes settle in-flight coins. Corrected centers matched, and both
engines still stopped GPU drawing when idle. Diagnostic introspection was kept
separate from the normal customer playtests.

Compact memory review initially put its pair summary behind cards. The summary
now moves into the heading and the inactive footer is removed, keeping every
card and Next visible. Continue's visible label includes the game name even when
short-landscape layout hides its secondary text. The urgent timer text uses a
6.59:1 contrast against the light play canvas.

An initial automation fixture tried pressing disabled Start over on an empty
treasure map. It was corrected to respect enabled state; the complete journeys
then passed in both engines. A second assertion exposed that the saved game name
was only in hidden secondary text on short screens; the visible label was fixed.
These first failures are not represented as clean first-run passes.

Full-session browser evidence is reused across the later read-only footer/label
and metadata-guard corrections. The changed compact states were rerun in both
engines, and the final malformed-metadata guards have current unit coverage.
The timer color change received a static contrast calculation.

## Visual review and limits

Self-assessment, two visual candidates: initial boards and one alignment/layout
correction. Actual desktop, phone, small portrait and short-landscape captures
were inspected. Fidelity, composition, detail, style and usability are each 8/10
for the corrected tested scope; initial usability was 6/10 because of stale coin
positions. This is not an independent student usability study.

Impeccable's detector ran once: three existing menu-shadow warnings and 34
advisories. The new collection/card colors are documented in the scoped design
records. No zero-warning detector claim is made. Long Help retains accessible
contained scrolling; normal primary screens use no page scrolling.

No bugs observed in the final tested scope. Real Android/iPhone/iPad touch,
audible sound, safe areas, zoom/large text, native/bfcache lifecycle and hardware
frame pacing remain untested. The ledger is intentionally `incomplete` for those
physical/native gates and passes its consistency validator. Prioritize a real
phone/tablet journey covering sort drag, memory mismatch/reopen and treasure
return/Undo, then student playtesting across ages. No further code improvement
is asserted without an observed final defect.

Tests used isolated disposable guests and a local iframe fixture; no real
provider/account writes occurred. Test browsers closed. The user's preview and
guest progress were preserved; Vite remains running. The primary and Analog
Clock checkouts remained clean and unchanged. No push, deployment or merge.

Validation: Tier 3 | ran targeted unit/static/catalog and Chromium/WebKit checks
| new interactive modes, persistence and layout; physical/native gates unverified.
