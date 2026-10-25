---
name: Coin Champ - Coin Carnival
description: Tactile money puzzles on a sunlit miniature boardwalk.
colors:
  world: "#22163e"
  ink: "#322447"
  gold: "#ffce69"
  cream: "#fff7e7"
  mint: "#a8f3d4"
  tray: "#79462d"
  playCanvas: "#fff9ed"
  playMint: "#e7f5ed"
  playInk: "#294e43"
  playHeading: "#285a44"
  question: "#f3fbf5"
  workbench: "#fffdf7"
  bank: "#fff0cc"
  coinBox: "#e6f4e9"
  check: "#24795b"
  ready: "#ffe29a"
  coinQuantity: "#315b43"
  gameSort: "#ffedba"
  gameMemory: "#eadff7"
  gameTreasure: "#d9eee5"
  memoryBack: "#74538d"
  memoryInk: "#60406f"
  timerUrgent: "#993c2e"
typography:
  display:
    fontFamily: "Fredoka, sans-serif"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: "Nunito, sans-serif"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  badge: "8px"
  control: "14px"
  panel: "20px"
spacing:
  compact: "8px"
  normal: "16px"
  generous: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#543510"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
---

## Overview

The Coin Carnival is a delegated design choice, built directly from code rather
than an approved visual comp. The illustrated world carries the menu; tactile
coin trays and clear questions carry play. This is an original interpretation
of the requested references, not a replica.

Reference lessons: Analog Clock's clear progression and rewards; Many Birds'
illustrated world, direct manipulation, and earned shop; Word/Math Puzzle's
skill selection and short problems; Preschool Fun's practice, hints, readable
feedback, and a forgiving pace. Preserve Coin Champ's identity and real coin
values rather than copying another game's assets or mechanics.

## Colors

Plum anchors the menu; gold marks Play and the start countdown. During play,
cream and pale mint reduce visual competition. Green text supplies readable
contrast. The gold coin bank adds coins; the mint dashed coin box holds them.
Earned tray colors remain pale variations with matching borders.

## Typography

Local Fredoka supplies display lettering. Local Nunito supplies body/control
text. Both files are reused from this repository's Many Birds asset library.
Use tabular numerals for money and time. Preserve readable text and controls
before satisfying viewport constraints.

## Layout

The shell uses dynamic viewport height and safe-area padding. Desktop play uses
two columns; portrait puts the question over the coin bench. Short landscape
keeps progress below the header and reorganizes the tray controls. Counting
shows every coin separately. Selected denominations use a coin, a quantity,
and a Take 1 out label, with no ghost coins in the empty box.

Always enter on Main menu. Play starts an adventure; Continue retains the saved
round. Both show 3, 2, 1 for one second each and START! for 600ms. Help and
backgrounding preserve the current fraction of the countdown; Menu cancels it.
The optional round timer starts only after START! Keep prizes, stars, and the
three practice choices on the menu or in native dialogs. Play has one prompt,
one answer area, and no persistent score/streak/reward bar. Retry guidance
replaces the short instruction; success/review adds one explicit Next action.

Normal primary screens have no scrolling at the tested sizes. All four dialogs
also fit 320×568 after their copy/layout adaptation. The native `.dialog-body`
may scroll vertically for expanded help/prizes at very short heights or larger
text. Its title, close control, and Done action remain outside that region.
Below 300 CSS pixels of height, the view provides an accessibility fallback;
that extreme-height fallback and real browser zoom remain unverified. Never
hide required controls or suppress scrollbars to claim a pass.

## Elevation & Depth

The raster environment supplies sculpted gold and warm lighting. Offset, blurred
plum shadows ground the cream workbench and coins. Coin matte cleanup reuses the
previous game's edge-connected algorithm; blob URLs avoid repeating large data
strings during interactive rerenders.

The coins use actual photographic faces, beveled lathed bodies, plain or reeded
edges, and a copper-colored core band on dimes/quarters. A procedural softbox
environment and two lights give the metal controlled reflections. Photographic
face detail uses a small bump contribution; it is not a sculpted or scanned
portrait mesh. Relative diameter and thickness follow the Mint specifications.
One transparent, noninteractive renderer aligns coins with native DOM controls;
the controls, names, quantities, totals, and focus remain in HTML.

The authored motion is a finite 860ms coin tumble from the tapped bank coin or
drag release point into its denomination stack. It has a small physical landing
rebound, followed by rest; no ambient spinning or permanent render loop. Only
new additions animate. Restored saves settle directly. A single base contact
shadow grounds a stack instead of accumulating an opaque shadow for every layer.
On short landscape screens, a small 3D coin remains above each removal label.

Reduced motion changes selection immediately and draws one settled frame.
Help/backgrounding settles motion and cancels frames. WebGL loss reveals the
photographic fallback and leaves all native actions usable; restoration reconciles
the current selection. The renderer caps pixel ratio at 1.5 and reuses model
geometry, materials, textures, and one WebGL context. Photo credits appear in Help.

## Shapes

Coins are circular and retain denomination size differences. Panels have 16–20px
corners, with 12–14px controls. Icons are authored SVG geometry; no emoji icon font.

## Components

- Game room: three large choices at a time, grouped by Fun games versus Coin
  practice. These are meaningful collections, with keyboard-operable switches.
- Coin Sort: one 3D coin on a pedestal, four labeled jars, and visible jar counts.
  Tap and drag both count one move; a fresh tap after a drag remains responsive.
- Memory Match: native card buttons reveal coin bundles or a value. Matched cards
  stay visible. Mismatches wait for an explicit Flip back, avoiding a reading
  deadline. Keyboard focus advances to an actionable card or the Flip back button.
- Treasure Hunt: tap numbered coin islands to collect or return them. The chest
  shows the selected coins and total; Undo and Start over remain accessible.
- New sessions have four rounds and explicit Next feedback. Existing adventure
  and practice lengths remain twelve/eight. All share the existing start countdown,
  hint, optional timer, sound, reward, local-save, and host-exit behavior.

Mini play uses one board below a compact prompt. Short landscape puts the prompt
beside the board. Read-only memory feedback moves the pair summary into the
heading, freeing space for every card and Next. Primary screens have no page
scrolling at the tested sizes. Long Help retains its documented contained scroll.
The on-demand renderer observes real layout containers and resynchronizes after
layout settles; an orientation change settles in-flight coins at their new anchors.
This schedules finite redraws, preserving idle render suppression.

- Gold starts/advances play; teal checks a built amount. Disabled actions retain labels.
- Four coin-bank controls support tap, keyboard, and pointer drag; selected groups
  support removal. Undo and Start over recover mistakes without resetting a run.
- Explicit Next preserves feedback and prevents timed question-replacement races.
- Native dialogs protect focus and pause the optional timer. Backgrounding also
  pauses it. Read aloud is optional and canceled when muted or leaving play.
- Confetti marks correct answers once; reduced-motion preferences disable it.
- Passport stars and prize ownership persist after every meaningful action.

## Do's and Don'ts

- Do use the game world as atmosphere while keeping questions and coins readable.
- Do reorganize around the available height; keep essential play targets at 44px.
- Do preserve guest saves, public route `coin-champ`, and shared points identity.
- Don't add fixed polling render loops, automatic question advancement, or real purchases.
- Don't represent desktop engine/emulation checks as physical-device acceptance.

## Mini game playtest refinements

Coin Sort names the current coin and its value below the 3D model. Memory coin
cards label each denomination separately, preserving the addition challenge.
On narrow phones, twelve cards reflow into three columns when height permits;
shorter screens keep four columns and compact card contents. First flips and
mismatches give a short next action. Treasure shows the amount left or over,
and explains that tapping a chosen coin returns it.

The portrait layout now includes heights from 400px, and short landscape starts
at 450px width, closing the former breakpoint gap. Compact result screens use
an explicit grid so every replay/menu action stays reachable. In short-landscape
feedback, Hint sits beside the feedback bar, and Treasure moves its read-only
total into the prompt while its full map occupies the board. Disabled treasure
tools are omitted in that state; all collected values remain visible on the map.
Hint closes back onto the same keyboard control after rerendering.

Primary play, mismatch, success, review, game room, menu and result states were
checked in Chromium/WebKit at the recorded phone, tablet and desktop viewports,
including 390×500 and 480×320. No new scrolling exception was added; long Help
retains its existing contained scroll, and extreme height/zoom remains a separate
accessibility gate. See `docs/coin-champ-playtest.md` for current evidence and gaps.
