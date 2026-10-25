# Coin Champ rebuild — 2026-10-24

Coin Champ is now an illustrated Coin Carnival with a twelve-stop adventure,
three skill levels, and focused Count, Make, and Change practice. The public
`coin-champ` identity, URL, four U.S. coin denominations, shared app points, and
exit contract remain intact. This is local work; nothing was pushed or deployed.

## Direction and references

The user delegated design choices and requested a complete replacement for
young students through teens. The chosen code-led direction is a miniature
boardwalk arcade: warm gold, plum, turquoise water, tangible coins, and a small
piggy-bank mascot. Generated art is an environment asset, not a flattened UI.
All controls, questions, feedback, and progress are real HTML.

The five requested reference games were inspected through their local entry
points, menus, source, and relevant interactions. Analog Clock supplied clear
goals, level progression, and rewards. Many Birds supplied an illustrated world,
direct manipulation, and an earned shop. Word/Math Puzzle supplied skill
selection and discrete problems. Preschool Fun supplied guided practice,
forgiving retries, and clear feedback. Their gameplay code and branding were
not replaced or copied into Coin Champ.

## What changed

- Separate, testable money/challenge rules replace the previous large inline script.
- Adventure covers coin recognition, group counting, exact amounts, making
  change, and mathematically minimal coin combinations.
- Starter supports small amounts and coin-value labels; Explorer mixes more
  coins; Master adds amounts up to $4.99 and fewest-coin strategy challenges.
- Tap, pointer drag, keyboard shortcuts, removal, Undo, Clear, hints, and optional
  read aloud give several ways to interact. No numeric keyboard is required.
- A correct answer earns stars and tickets. Explicit Next keeps feedback visible
  and avoids stale automatic-advance callbacks. Errors teach and allow retries.
- Earned tickets buy three cosmetic tray themes. No real purchases or payments.
- The optional elapsed-time countdown pauses under dialogs, in menus, and when
  visibility changes. It is off by default for a fresh player.
- Progress saves after moves/rewards: current question, tray, countdown remainder,
  stars, best scores/streaks, tickets, prize ownership, and settings.
- Existing `coin-champ.progress.v1` records migrate into v2 without deleting v1.
  Invalid data and blocked storage have a playable fallback and an honest save indicator.
- Stable reward IDs and settled-round recovery prevent duplicate credit on reload.
- Host audio messages are accepted only from the parent at the expected origin.
- Local fonts and a 219 KB WebP environment remove new-game CDN dependencies.
  Original denomination assets are preserved, with their existing matte-cleanup
  behavior adapted to blob URLs for reuse during rendering.

## Validation evidence

Validation: Tier 3 | ran `node --test scripts/coinChamp.test.mjs`,
`node --check "public/Games/Coin Champion/game.js"`,
`node --check "public/Games/Coin Champion/coin-art.js"`, `npm run audit:content`,
`git diff --check`, and browser journeys | game/data/input/layout changes.

| Surface | Actual result |
| --- | --- |
| Core rules | 15 tests passed. Generated 2,880 challenges across mode/difficulty combinations; all valid and solvable. Fewest-coin answers matched dynamic programming for every amount 1–500. |
| Chromium play | All 12 adventure stops at all three levels, plus all eight rounds of each practice mode: 60 solved rounds, correct results, no page errors. |
| WebKit mobile emulation | All 12 Master adventure stops, 75 points, 36 stars, 100% solved, no page errors. This covers every challenge kind. |
| Normal layouts | 35 state/viewport combinations: Home, Identify, Count, Make, Change at 1440×900, 390×844, 320×568, 568×320, 844×390, 768×1024, and 1024×768. Zero document overflow, no unintended internal scrolling, and no blocked checked play controls after correction. |
| Receipt fit | Additional 390×844, 430×932, and 320×852 checks: the receipt stays between question and tools without overlap. |
| Dialogs | Help, prizes, passport, and settings fit 320×568 with no scrolling after compact copy/layout adaptation. Close and Done remain available. |
| Touch / pointer / keyboard | A synthetic touch adds one nickel once. Removal works. Keyboard 1 adds a penny, Backspace undoes. Mouse pointer drag adds a quarter once; it does not synthesize a second purchase. Escape restores focus after Help. |
| Timer / failures | Controlled browser clock: 45→40 seconds, Help remains paused through 10 simulated seconds, close resumes to 39, synthetic visibility pause holds, timeout grants no rewards, wrong answers explain recovery, hints remain available. The test waits for the browser's asynchronous dialog-close event. |
| Local recovery | A selected 25¢ tray survives reload. A settled correct round reopens as feedback and cannot be awarded again. Prize ownership/equipped skin survive reload; repeat Equip does not charge again. |
| Blocked browser storage | With the actual `window.localStorage` getter forced to throw, the adventure remained playable and displayed “Saving unavailable · this visit only.” |
| Embedded guest flow | A correct answer added 5 shared app points. Reload and Continue preserved exactly 5; no duplicate credit. Trusted host mute worked, a child-originated sound message was rejected, and Exit returned to `/apps` with points intact. |
| Reduced motion | CSS durations reduce to 0.01ms; answer confetti is skipped. |
| Catalog | 84 entries audited with no blocking errors; generated changes are limited to Coin Champ's description, subjects, and All grade availability. |

Tests use isolated synthetic guests. The user's visible preview retained its
existing 50 app points and starts on the new menu. Test scripts and screenshots
are retained locally under `output/coin-champ/` (ignored by Git).

## Viewport contract and exceptions

The shell uses dynamic viewport units, safe-area padding, flexible tracks, and
bounded coin groups. Portrait stacks the board; short landscape moves progress
into the header and reorganizes tray tools. Required play controls remain
reachable; overflow is not hidden to disguise layout failures.

Expanded `.dialog-body` content may scroll vertically at very short heights or
larger text, while title/close/Done stay outside it. Below 300 CSS pixels of
height there is an accessibility fallback. Those cases are not an all-screen
no-scroll guarantee; real browser zoom and large system text remain unverified.
At the normal tested sizes, primary play has no scrollbars, and all four dialogs
also fit the smallest tested portrait screen.

## Visual review

DEGRADED: single-context (user requested direct execution without delegation).
This is a self-assessment, not independent certification. One visual direction
was produced, inspected, and corrected in a compact-layout revision; the final
receipt spacing and prize copy were also checked directly. No alternate art
candidate was generated.

| Fixed rubric | Initial | Final | Evidence |
| --- | --- | --- | --- |
| Brief/reference fidelity | 8 | 8 | Original carnival world; full money gameplay and earned progression. |
| Composition / proportions | 7 | 8 | Initial tiny-screen overflow and short-landscape overlap corrected. |
| Detail / finish | 8 | 8 | Illustrated environment, existing denomination art, authored SVG controls, local typography. |
| Style consistency | 8 | 8 | Gold/plum world, cream workbench, consistent coin and reward materials. |
| Usability / motion | 6 | 8 | Final fit/hit tests, feedback, pointer/touch/keyboard checks, reduced motion. |

Impeccable's detector ran once. Its three warnings classify offset plum shadows
as dark glow; rendered review retained them as grounded material shadows.
This is not a zero-warning detector claim. Existing root product-document drift
was not rewritten; Coin Champ has scoped product/design records and a sidecar.

## Identity and remaining coverage

Branch/worktree: `codex/coin-champ-adventure` at
`C:/Users/Xator/.codex/worktrees/coin-champ-adventure/Main-Homeschool-app`.
Base: `b8e241b` so the preceding guest and Analog Clock improvements remain available.
Live preview: <http://127.0.0.1:5173/play/coin-champ>.

Reviewed working-file SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `game-core.mjs` | `547EE156458AF389E678CAE80764E9CD34EE041951A8671E1B894561CFCEC01D` |
| `game.js` | `BEA63E82370B85CE718DC1C50FBE78FB2D86ED97A2DA014A46A3E0902F5F700A` |
| `game.css` | `3230CD4631465DF8A9474E3E4739DE5EF52F0F57CDAB915DFEF1F76C78BFB2C1` |
| `coin-carnival.webp` | `9A11804AB9CBBF5F55466EAC3E14E8638E62BFE89BE43DA108158E9E4D361F77` |

CSS was formatted for maintenance after verification; its browser-parsed CSSOM
hash stayed `8961d99a53a31ded03acaf1c510cdca7d51b87d10ceabc65cbc794d519a4bdff`.

Remaining gates, in priority order:

1. Physical Android/iPhone/iPad touch, audible playback/read aloud, safe areas,
   real zoom/large text, and background recovery. The local Lab was recovered
   headlessly for inventory and showed zero connected physical devices; no
   BrowserStack hardware run was performed.
2. Installed Capacitor shell behavior. No APK/IPA was built or installed here.
3. Student playtesting across ages to assess challenge pacing and enjoyment.

Browser emulation and synthetic visibility checks do not satisfy those gates.
No cloud save, multi-tab save reconciliation, or offline-install acceptance is
claimed. The Vite preview remains running; only task-owned test resources are cleaned up.
