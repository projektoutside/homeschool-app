# HomepageAPP Asset Follow-Ups

This list tracks report-only oversized `HomePageAPP` assets that were intentionally left functional during the phase-one production cleanup.

## Highest Priority

- `HomePageAPP/windy_scene_loop_school_still_hyperreal_clouds_animated.webp` at 43.5 MB
  Replace with a lightweight poster image plus a compressed looping video fallback, or re-export as a substantially smaller animated format with measured decode cost on mobile Safari.

- `HomePageAPP/Images/PROPS/Wings/*.glb` at 11.8 MB to 13.7 MB each
  Re-export with mesh compression, texture atlasing, and KTX2-compressed textures. Validate loader compatibility before changing runtime formats.

## Secondary Priority

- `HomePageAPP/HomePageMusic/LegendarySummonMusic/LegendaryAnimationSummonSound.mp3` at 4.03 MB
- `HomePageAPP/HomePageMusic/HomepageAPP.mp3` at 3.63 MB
- `HomePageAPP/HomePageMusic/HomepageAPP (4).mp3` at 3.56 MB
- `HomePageAPP/HomePageMusic/Default.mp3` at 3.13 MB
- `HomePageAPP/HomePageMusic/HomepageAPP (1).mp3` at 2.88 MB
  Re-encode to a lower bitrate or switch to `ogg` for browser playback if the current pipeline supports it.

## Validation Requirements

- Re-run `npm run audit:assets` after each asset batch.
- Smoke test `HomePageAPP` on desktop, Android phone viewport, iPhone Safari viewport, and tablet viewport.
- For any wing-model optimization, verify idle animation, attachment points, transparency, and memory behavior inside the live homepage scene.
