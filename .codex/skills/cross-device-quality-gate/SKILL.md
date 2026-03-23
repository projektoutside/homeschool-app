---
name: cross-device-quality-gate
description: Cross-device validation workflow for this homeschool app. Use when a task has already been classified as high-risk or device-sensitive validation work, especially for UI, 3D, touch, audio, video, motion sensors, fullscreen, routing, iframe behavior, safe areas, responsive layout, native wrappers, or performance across desktop browsers, Android phones and tablets, iPhone and iPad Safari, and Capacitor shells.
---

# Cross-Device Quality Gate

Treat cross-device compatibility as a `Tier 3` validation path for this repository. Do not invoke this skill for low-risk edits, and do not assume desktop behavior is sufficient once a change reaches device-sensitive scope.

## Workflow

1. Confirm that the task really needs cross-device validation.
   Use this skill after the global validation policy classifies the work as `Tier 3`, or when the changed surface is clearly device-sensitive.

2. Map the change to risk surfaces before editing.
   Common surfaces: layout, touch vs mouse, keyboard, hover-only UI, audio/video autoplay, motion/orientation permission, fullscreen, iframe embedding, safe areas, visibility lifecycle, route transitions, native shell wrappers, and 3D performance.

3. Choose the smallest complete device matrix.
   Use the baseline matrix in [references/device-matrix.md](references/device-matrix.md) and expand it when the change touches media, sensors, fullscreen, or native-shell behavior.

4. Implement defensively.
   Prefer pointer-safe interactions over desktop-only assumptions.
   Treat iPhone/iPad Safari as the strictest browser for autoplay, inline media, permissions, safe areas, and lifecycle events.
   Keep iframe and standalone behavior aligned when the page can run both ways.
   Preserve reduced-motion and lightweight fallbacks for animation-heavy scenes.

5. Run validation only when the risk triggers it.
   Choose the smallest repo check that covers the affected surface.
   Run `npm run check` only when combined lint and production build coverage is the smallest sufficient proof.
   Run `npm run audit:games` when touching game folders, game catalog registration, or player routing.
   If the change affects visible UI, media, or interaction logic, do at least one desktop smoke pass and one mobile/tablet emulation pass.

6. Run risk-specific verification when applicable.
   For audio/video work, verify mute state, autoplay unlock, focus/visibility recovery, inline playback, and restore behavior.
   For sensor work, verify permission requests, secure-context assumptions, orientation changes, and no-op behavior on unsupported devices.
   For responsive/layout work, verify portrait and landscape plus notch/safe-area constraints.
   For iframe/native-shell work, verify route activation, message passing, and fullscreen/lifecycle differences.

7. Report verification truthfully.
   State what was physically tested.
   State what was only emulated or code-reviewed.
   List exact remaining manual checks when physical devices were not available.

## Default Device Coverage

Use the baseline matrix in [references/device-matrix.md](references/device-matrix.md) after the task has escalated into cross-device validation.

Minimum expectation:
- Desktop browser
- Android phone viewport
- iPhone viewport/Safari-sensitive path
- Tablet viewport

Add native-shell validation when work touches Capacitor, safe areas, fullscreen, sensors, audio session behavior, or route embedding.

## Hard Rules

- Do not use this skill for `Tier 0` or `Tier 1` work.
- Do not let repo-wide caution turn into blanket testing; validate only the affected `Tier 3` surfaces.
- Do not sign off a `Tier 3` change as fully done without a cross-device note.
- Do not treat "works in Chrome desktop" as a sufficient result for homepage, game, media, or interaction work.
- Do not hide device-specific gaps. Name them explicitly.
- If a feature depends on platform permissions or media policies, inspect those branches directly even when emulation looks clean.
