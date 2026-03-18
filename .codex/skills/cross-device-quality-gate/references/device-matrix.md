# Device Matrix

Use this matrix to decide what to verify for changes in this repository.

## Baseline Matrix

- Desktop browser: Chrome or Edge, approximately `1440x900`
- Android phone portrait: Chrome, approximately `393x852`
- iPhone portrait: Safari-sensitive emulation, approximately `390x844`
- Tablet portrait: approximately `1024x1366`
- Tablet landscape: approximately `1366x1024`

If the feature is orientation-sensitive, also check phone landscape.

## Escalation Triggers

Add deeper checks when the change touches any of these:

- Audio or video:
  Verify autoplay unlock, mute, volume restore, `playsInline`, focus/visibility recovery, and background/foreground transitions.
- Motion/orientation sensors:
  Verify permission request timing, secure-context requirements, unsupported-device fallback, and recalibration after orientation changes.
- Fullscreen, safe areas, or shell embedding:
  Verify iPhone notch/safe-area behavior, Android system bars, iframe vs standalone layout, and Capacitor wrapper behavior.
- 3D or animation-heavy scenes:
  Verify reduced-motion behavior, lightweight/mobile path, frame stability, and no hidden desktop-only assumptions.
- Touch interaction:
  Verify pointer/touch parity, no hover-only blockers, and gesture behavior under mobile Safari.

## Reporting Standard

For every task, report these three things:

1. What was physically tested
2. What was emulated or code-reviewed only
3. What manual checks remain, if any
