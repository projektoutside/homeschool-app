# Coin Champ playtest and fixes

Local follow-up to `d1f0aa4` on `codex/coin-champ-adventure`.
Preview: <http://127.0.0.1:5173/play/coin-champ>. No publication performed.
The final served-source fingerprint and results are in
[the evidence record](coin-champ-playtest.evidence.json).

## Confirmed problems fixed

| Observation | Result |
| --- | --- |
| At 390×500, the header overflowed horizontally by 82px; at 480×320, jars/cards/map actions escaped the screen. | Closed the shared portrait/landscape breakpoint gap; normal primary states fit without concealing scrollbars or shrinking touch targets below 44px. |
| Hint rerendered its trigger before remembering keyboard focus. | Hint now restores focus to the visible Hint button. |
| Coin Sort showed an unlabelled coin; Master memory coins were too small to identify reliably. | Sort shows its name/value; memory labels each coin value and reflows twelve cards on narrow phones. |
| Treasure repeated its goal without showing how much remained or explaining return clearly. | Visible remaining/overshoot amounts, return guidance and exact-match confirmation. |
| Small completion screens overlapped Main menu, including WebKit at 320×568. | Compact result grid retains all three replay/prize/menu actions. |
| Short landscape feedback let memory instructions enter the round bar and the treasure dock overlap the map. | Reorganized prompt, Hint and Next; the read-only treasure total moves beside the complete map. |

Gameplay, reward rules, storage format, routing, assets and host message contracts
remain unchanged. No dependencies or remote services were added.

## Play and verification

The isolated browser player completed **36 rounds in Chromium and 36 in WebKit**:
all four rounds of Sort, Memory and Treasure at Starter, Explorer and Master.
It used ordinary visible controls. Memory learned values only after flipping
cards; Treasure used displayed coin values. It did not solve customer journeys
by reading hidden challenge data or invoking session methods.

The playthroughs covered wrong jars, drag/tap, explicit Flip back, keyboard focus,
treasure overshoot/return/Undo/reset, partial-save reopening, one reward per round,
settled-save reopening and results. They recorded **264 layout states** across
1440×900, 393×852, 390×844, 320×568, 390×500, 390×400, 480×320, 568×320, 844×390,
768×1024 and 1024×768. No final page overflow, offscreen action or card-content
spill was observed in those checks.

Screenshot inspection additionally exposed the short-landscape feedback
overlaps. After that final, read-only layout correction, **72 focused states**
passed in both engines, covering every mini game's success/review at six sizes.
Those deterministic fixtures resumed generated saved rounds; they are layout
regressions, separate from the visible-control full playthroughs. The focused
checks include heading rows, action corners and treasure map/dock separation.
Full-session evidence is reused across this final locked-state layout change;
input, persistence and reward logic did not change afterward.

Eight additional checks per engine passed for emulated touch without WebGL,
reduced motion, repeated card taps, Hint focus, timer pause, timeout review and
Next recovery. Screenshots of desktop/phone/compact cards, jars, treasure,
success and review were inspected. No uncaught browser errors were observed.

- `node --test scripts/coinChamp.test.mjs scripts/coinChampCountdown.test.mjs scripts/coinChampMotion.test.mjs scripts/coinChampMiniGames.test.mjs`: **39 passed**.
- `npm run audit:games`: **84 entries passed**.
- `node --check` on the changed JS modules and `git diff --check`: passed.
- Browser drivers and screenshots: task-owned `output/coin-playtest/` (ignored).
- Impeccable detector scanned the changed CSS once: 0 anti-pattern findings and
  78 palette/radius advisories. Unsupported output flags also produced warnings;
  this is not a clean-detector or independent design-review claim.

Initial automation also tried clearing an already empty treasure map and assumed
an arbitrary coin must be below the goal. Those fixture errors were corrected.
Timer checks now wait for the actual dialog close event rather than racing it.
First UI failures and corrective scope are retained in the evidence notes; no
clean first-run claim is made.

## Boundaries and handoff

All testing was local and used isolated disposable saves. The user's side-panel
preview remains open; their Treasure Hunt Starter round 1 and 65 shared points
were still present at handoff inspection. No real guest game actions were used
to test scoring. Task-owned browsers closed; the existing Vite server remains.

Device Lab inventory/workspace tools both returned `fetch failed`. No physical
Android/iPhone/iPad, native shell, safe-area, audible-sound, true browser zoom,
hardware frame pacing or student enjoyment proof is claimed. Existing long Help
scrolling and extreme-height accessibility fallback remain distinct from the
normal no-scroll primary screens tested here. No Supabase/provider or production
verification occurred.

No bugs observed in the final tested scope. Next priorities are a physical phone
journey (drag, card mismatch and treasure Undo) and a short student observation
session; the latter should confirm children can choose a game and recover a
mistake without adult explanation. These are evidence gaps, not added features.

Validation: Tier 3 | ran targeted unit/static/catalog and Chromium/WebKit checks
| interactive play, local recovery and responsive layout; physical gates untested.
