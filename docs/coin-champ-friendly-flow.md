# Coin Champ: a calmer start and play screen

Local follow-up to `2fa94f8`, 2026-10-24, on `codex/coin-champ-adventure`.
Preview: <http://127.0.0.1:5173/play/coin-champ>.
Runtime fingerprint: `2fa94f8+coin-kids:928f96d026d61fad`.
The four changed runtime files served by Vite matched their working-file SHA-256
values; see [recorded evidence](coin-champ-friendly-flow.evidence.json).
This is local verification, with no push, deployment, or provider changes.

## Result

Every opening starts at Main menu. Play and Continue are separate; both show
3, 2, 1 for one second each, then START! for 600ms before play. Help and
background visibility pause the current step. Menu/Escape cancels pending entry.
The optional round timer starts after the intro. Saved progress, round identity,
selected coins, earned rewards, and existing host messages retain their formats.

Play uses a cream/mint table, one prompt and plain instructions. Counting shows
individual coins with values. A gold coin bank adds coins to the labeled coin
box; only selected denominations appear there. Undo, Start over, and Check are
grouped. Retry guidance replaces the instruction, and success/review has Next.
Stars, prizes, practice choices, and settings remain available from the menu.
Earned tray themes still apply to the coin box.

## Checks run

- `node --test scripts/coinChamp.test.mjs scripts/coinChampCountdown.test.mjs`:
  23 passed, including eight new timing, pause, cancellation, and stale-callback tests.
- `node --check` on `game.js` and `start-countdown.mjs`; `git diff --check`: passed.
- `npm run audit:games`: passed, 84 registered entries. No catalog changes.
- Headless Chrome: native browser timer startup; menu-first reload; exact intro
  sequence; Help and synthetic visibility pause; optional round timeout; tap,
  pointer drag, keyboard, removal, Undo, retry, Check, and Next.
- Recovery: active round/coins survive reopening; Continue shows the intro;
  resuming settled success does not duplicate tickets or rewards.
- Playwright WebKit with touch emulation: native intro, wrong-answer retry,
  all eight counting rounds to results, saved progress, selected coins,
  Help/Continue, orientation changes, and canceled intro.
- Same-origin iframe fixture: one correct answer emits one existing five-point
  event; Continue emits no duplicate; Menu returns to Coin Champ's menu; Games
  emits the existing host exit message. The user's actual app preview was
  inspected without playing or changing their save.
- 59 geometry states passed with zero document overflow, offscreen play actions,
  or occluded action centers: seven primary sizes (1440×900, 390×844, 320×568,
  568×320, 844×390, 768×1024, 1024×768), plus selected/wrong/success/timeout,
  practice-choice, and result states. Desktop engines and viewport emulation
  are not physical device results.

All 47 recorded browser behavior assertions passed. No bugs observed in the
final tested scope. The [structured QA ledger](coin-champ-friendly-flow.qa.json)
is intentionally `incomplete` for physical/native acceptance and passes its
consistency validator.

## Defects caught and corrected

The first browser pass found overlapping controls in short landscape and an
obscured Check action at 320×568. Higher-specificity legacy layout rules were
winning over the new layout. The targeted correction restores normal progress
flow, explicit workbench rows, and a single feedback action after a settled round.

An unmocked browser start caught `Illegal invocation`: assigning native
`setTimeout` as an object method changes its receiver. Default scheduler wrappers
now call the browser functions normally. Mocked unit timers alone did not expose
this defect; the native Chrome and WebKit startup checks both passed afterward.

Two test-fixture issues were separated from product defects: a frozen test clock
did not allow the asynchronous native dialog-close event to settle before a
fractional timing assertion; WebKit tap does not necessarily focus a button.
The final flow waits for the actual close event and avoids that focus assumption.
Task-owned CLI sessions expired during long inspection; bounded direct Playwright
runs produced the final result files and closed their own browser contexts.

A final instruction guard also avoids describing a first hint as a wrong answer.
The updated WebKit counting journey rechecked that path and the full eight-round
session. The other behavior/layout evidence is reused across that one-line guard;
its environment, assets, and unaffected paths stayed the same.

## Visual review

Self-assessment, two candidates (initial layout and one targeted correction),
using actual desktop, phone, small portrait, and short landscape captures.

| Dimension | Initial | Final | Evidence |
| --- | --- | --- | --- |
| Brief fidelity | 8 | 8 | Menu first, explicit start gate, simpler prompts and retained carnival identity. |
| Composition | 6 | 8 | Initial overlaps corrected; play and feedback actions fit the tested sizes. |
| Detail and finish | 8 | 8 | Local type, real coin art, consistent labeled controls. |
| Style consistency | 8 | 8 | Illustrated menu with quiet cream/mint play and warm coin controls. |
| Usability and motion | 6 | 8 | One instruction, clear coin box, paused/canceled intro, explicit Next. |

Impeccable's detector ran once: three existing dark-shadow warnings and palette
advisories. The retained menu shadows were reviewed as grounded illustration
styling; the new play palette is documented in the scoped design records.
This is not a zero-warning or independent usability certification.

## Remaining gates and cleanup

1. Physical Android/iPhone/iPad touch, safe areas, audible playback/read aloud,
   browser bfcache/background recovery, real zoom/large text, and installed
   Capacitor behavior. No physical device or APK/IPA session was run.
2. Student playtesting across ages: observe whether new players can begin, answer,
   and return to the menu without coaching; record mis-taps and Help use.

Normal tested primary screens need no scrolling. Native dialog bodies may scroll
for long help/prizes, larger text, or very short heights, preserving title/close
and Done outside the scrolling region. The below-300px and real-zoom fallbacks
remain unverified; no claim that required content may be clipped is intended.

No additional code improvements are supported by an observed final defect.
Cloud/multi-tab reconciliation and real student enjoyment remain outside this
local scope. Synthetic tests used isolated disposable guests and same-origin
fixtures; no real account/provider writes were made. Task-owned test browsers
closed. The existing Vite process and visible app preview remain open. The
primary and Analog Clock checkouts were left clean and unchanged.

Validation: Tier 3 | ran targeted unit/static/catalog and Chromium/WebKit journey
checks | responsive runtime changes; physical/native coverage remains unverified.
