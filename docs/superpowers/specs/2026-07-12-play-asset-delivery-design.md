# Play Asset Delivery Design

## Goal

Publish the complete La's Homeschool Hub Android app to Google Play Internal testing without removing learner content, while keeping the base module below Google Play's 500 MB compressed-download limit.

## Delivery model

- Use an install-time Play Asset Delivery pack for the large static game library.
- Google Play installs the base application and asset pack together.
- After installation, learner games and resources remain available offline.
- Keep the existing package ID `com.lashomeschool.hub` and version `1.0` / version code `1` for the first accepted release.
- Keep the browser and GitHub Pages deployments unchanged.

## Bundle boundaries

- Keep the React/Capacitor shell, Android code, icons, configuration, and small boot-critical files in the base module.
- Move large static directories from the built web payload into one install-time asset pack, beginning with games, videos, audio, 3D content, worksheets, and machine-learning model files.
- Generate the pack from the production `dist` output so the web build remains the single source of truth.
- Fail the Android release build if the expected pack payload is missing or if duplicate large payload remains in the base module.

## Runtime resolution

- Add a focused Android/Capacitor resolver that exposes the installed asset-pack files to the WebView under the same logical URLs used by the web application.
- Preserve current iframe, game-launch, worksheet, media, and speech/model paths; avoid rewriting each individual game.
- Keep base-shell assets served by Capacitor's normal local web server.
- Route only paths owned by the asset pack to the installed pack location.
- Return an explicit unavailable/loading response if the asset pack cannot be resolved instead of silently falling back to a network URL.

## Error experience

- Show a simple learner-friendly loading message while the installed asset pack is being resolved.
- If installation is incomplete or corrupted, explain that Google Play must finish downloading or reinstall the app.
- Do not expose filesystem paths or signing information in the UI.

## Release security

- Continue using Google Play App Signing with the private upload key stored outside Git.
- Keep signing passwords encrypted for the current Windows user and out of logs and commits.
- Generate the signed `.aab` through `scripts/Build-AndroidRelease.ps1`.
- Preserve the upload key because every future Play release depends on it.

## Validation

This is a Tier 3 Android-native, routing, media, iframe, and performance change.

- Verify the web build, lint, game audit, and existing authentication tests.
- Verify Gradle assembles a signed release App Bundle.
- Inspect the `.aab` module list and compressed sizes to confirm the large payload is outside `base`.
- Install a locally testable equivalent build on an Android emulator or connected device when available.
- Smoke-test app boot, guest play, game launch, video/audio, worksheets, 3D classroom content, refresh/lifecycle recovery, and offline behavior.
- Upload the bundle to Google Play Internal testing and use Google's validation as the authoritative bundle-size check.
- Clearly state which Android checks were physical, emulated, or code-reviewed.

## Internal testing rollout

- Create release `1.0 Internal Guest Play` with the approved release notes.
- Add testers only after receiving or confirming their Google Account email addresses.
- Preview and roll out the Internal testing release after Google accepts the bundle and required tester access is configured.
- Return the exact opt-in installation URL after rollout.

## Out of scope

- Online-only WebView conversion.
- Removing games or learner resources to reduce size.
- Production-track publication.
- Completing the separate 12-tester, 14-day closed-test requirement for public production access.
