---
name: cross-device-quality-gate
description: Cross-device validation workflow for this homeschool app. Use for every repository change by default unless the user explicitly opts out, especially when work affects UI, 3D, touch, audio, video, motion sensors, fullscreen, routing, iframe behavior, safe areas, responsive layout, native wrappers, or performance across desktop browsers, Android phones/tablets, iPhone/iPad Safari, and Capacitor shells.
---

# Cross-Device Quality Gate

Treat cross-device compatibility as part of the definition of done for this repository. Do not assume desktop behavior is sufficient unless the user explicitly says to skip broader device coverage.

## Workflow

1. Map the change to risk surfaces before editing.
   Common surfaces: layout, touch vs mouse, keyboard, hover-only UI, audio/video autoplay, motion/orientation permission, fullscreen, iframe embedding, safe areas, visibility lifecycle, route transitions, native shell wrappers, and 3D performance.

2. Choose the smallest complete device matrix.
   Use the baseline matrix in [references/device-matrix.md](references/device-matrix.md) and expand it when the change touches media, sensors, fullscreen, or native-shell behavior.

3. Implement defensively.
   Prefer pointer-safe interactions over desktop-only assumptions.
   Treat iPhone/iPad Safari as the strictest browser for autoplay, inline media, permissions, safe areas, and lifecycle events.
   Keep iframe and standalone behavior aligned when the page can run both ways.
   Preserve reduced-motion and lightweight fallbacks for animation-heavy scenes.

4. Run baseline verification every time.
   Run `npm run check`.
   Run `npm run audit:games` when touching game folders, game catalog registration, or player routing.
   If the change affects visible UI, media, or interaction logic, do at least one desktop smoke pass and one mobile/tablet emulation pass.

5. Run risk-specific verification when applicable.
   For audio/video work, verify mute state, autoplay unlock, focus/visibility recovery, inline playback, and restore behavior.
   For sensor work, verify permission requests, secure-context assumptions, orientation changes, and no-op behavior on unsupported devices.
   For responsive/layout work, verify portrait and landscape plus notch/safe-area constraints.
   For iframe/native-shell work, verify route activation, message passing, and fullscreen/lifecycle differences.

6. Report verification truthfully.
   State what was physically tested.
   State what was only emulated or code-reviewed.
   List exact remaining manual checks when physical devices were not available.

## Default Device Coverage

Use the baseline matrix in [references/device-matrix.md](references/device-matrix.md) unless the affected surface clearly allows a smaller one.

Minimum expectation:
- Desktop browser
- Android phone viewport
- iPhone viewport/Safari-sensitive path
- Tablet viewport

Add native-shell validation when work touches Capacitor, safe areas, fullscreen, sensors, audio session behavior, or route embedding.

## Hard Rules

- Do not sign off a change as fully done without a cross-device note.
- Do not treat "works in Chrome desktop" as a sufficient result for homepage, game, media, or interaction work.
- Do not hide device-specific gaps. Name them explicitly.
- If a feature depends on platform permissions or media policies, inspect those branches directly even when emulation looks clean.
