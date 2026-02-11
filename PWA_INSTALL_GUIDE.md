# La's Homeschool Hub — PWA Install & Platform Guide

This guide documents the **current, real implementation** of install behavior in this repo.

It explains:
- what works as true one-tap install,
- what requires manual browser steps,
- what is not supported (or only partially supported),
- how the code is organized,
- and how to test/troubleshoot it.

---

## 1) Current Install Experience (Reality-Based)

### Best experience (true one-tap prompt)
- **Chrome / Edge on Android**
- **Chrome / Edge on Windows/macOS/Linux desktop**

When install criteria are met, users can tap your app install button and get the browser-native install prompt.

### Manual install experience (not one-tap by platform policy)
- **iOS Safari**: user must do **Share → Add to Home Screen**
- **Firefox / Safari desktop**: install method varies by version/device and may require manual menu actions

### Limited / unsupported for app-like install
- **Console browsers (PlayStation/Xbox/Nintendo web browsers)**

The app can often still be browsed, but full native-style PWA install behavior is generally not available.

---

## 2) User-Facing Install Entry Points

### A) Dedicated install route
- URL: `https://projektoutside.github.io/homeschool-app/install`
- Page component: `src/pages/InstallPage.tsx`

What this page includes:
- **Platform status badge** (based on detected capability)
- Install card with app value proposition
- Main install button
- Compatibility note footer

### B) Game viewer install action
- Component: `src/pages/Viewer.tsx`

When viewing game content, users can tap “Install App” from the viewer header. If native prompt isn’t available, it opens platform instructions modal.

---

## 3) Current Install Architecture (Code)

## Core hook (single source of truth)
- `src/hooks/usePWA.ts`

This hook now provides:
- install state (`isInstallable`, `isInstalled`, `isStandalone`)
- install action (`installPrompt()`)
- platform-aware context (`installContext`):
  - `platform`: `ios | android | chromium-desktop | firefox | safari-desktop | console | unknown`
  - `installMethod`: `native-prompt | manual-ios-share | manual-browser-menu | unsupported`
  - `canOneClickInstall`: boolean
- service worker registration + update checks
- fullscreen helpers

> Deprecated hook removed: `src/hooks/usePWAInstall.ts` was deleted in Phase 2 to avoid split install logic.

### Install UI components
- `src/components/InstallButton.tsx`
  - Uses `usePWA()` directly
  - Tries native prompt first when available
  - iOS: can trigger share sheet and then show steps
  - non-native cases: opens detailed platform guidance
- `src/components/PWAInstallModal.tsx`
  - Receives `platform` prop
  - Renders platform-specific instructions for:
    - console
    - firefox
    - safari-desktop
    - generic non-iOS fallback
    - iOS-specific share flow

### Styling
- `src/components/InstallButton.css`
  - install button visuals
  - modal support styles
  - install page styles
  - platform status badge styles (`success`, `info`, `warning`)

---

## 4) Service Worker + Offline Strategy

Service worker file: `public/service-worker.js`

### Implemented behavior
1. **Install/activate lifecycle**
   - caches static shell assets
   - removes old caches on activate

2. **Fetch strategy**
   - **Network-first** for HTML/navigation and mutable live content paths:
     - `/PolygonAPP/`
     - `/Games/`
     - `/Worksheets/`
     - `/MathWorksheetCreator/`
     - `/FinalGraph/`
   - **Stale-while-revalidate** for other static resources (js/css/images)

3. **Important offline fallback fix (Phase 1)**
   - For offline **HTML navigation**, fallback to cached `index.html`
   - For offline **non-HTML live assets**, do **not** return `index.html` (prevents broken asset responses)

4. **Update plumbing**
   - supports `SKIP_WAITING`, update checks, and messaging to app UI

---

## 5) Manifest + PWA Metadata

### Manifest
- File: `public/manifest.json`
- Includes:
  - app name/short name/description
  - `start_url`, `scope`
  - `display: "fullscreen"`
  - icon set from 72 → 512 (including maskable purpose)

### HTML metadata
- File: `index.html`
- Includes:
  - manifest link
  - mobile web app tags
  - Apple web app tags
  - theme color + tile info

---

## 6) Platform Behavior Matrix

| Platform/Browser | One-tap install via app button | Manual path | Notes |
|---|---:|---|---|
| Chrome Android | ✅ | Optional | Best path |
| Edge Android | ✅/⚠️ | Optional | Usually good, browser-version dependent |
| Chrome Desktop | ✅ | Optional | Best desktop path |
| Edge Desktop | ✅ | Optional | Best desktop path |
| Safari iOS | ❌ | Share → Add to Home Screen | Apple policy limitation |
| Safari macOS | ⚠️ | File → Add to Dock (if supported) | Version dependent |
| Firefox (mobile/desktop) | ⚠️ | Browser menu path if available | Inconsistent install UX |
| Console browsers | ❌ | None/limited | Native-style PWA install generally unavailable |

Legend:
- ✅ = supported
- ⚠️ = partial/varies
- ❌ = not supported

---

## 7) Files You Should Know

### Install flow
- `src/hooks/usePWA.ts`
- `src/components/InstallButton.tsx`
- `src/components/PWAInstallModal.tsx`
- `src/pages/InstallPage.tsx`
- `src/pages/Viewer.tsx`

### PWA platform plumbing
- `public/manifest.json`
- `public/service-worker.js`
- `index.html`

### Styling
- `src/components/InstallButton.css`
- `src/components/PWAInstallModal.css`

---

## 8) Local Testing Checklist

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Build production bundle (recommended validation):
   ```bash
   npm run build
   ```

3. Open install page:
   - `http://localhost:5173/install`

4. Verify behavior by platform:
   - Chromium: app button should use native prompt when eligible
   - iOS Safari: guidance should show Share/Add flow
   - Console user-agent simulation (or real device): unsupported/limited messaging

5. Verify game-viewer install action:
   - open any game via `Viewer.tsx` path
   - confirm install button uses same logic and modal guidance

---

## 9) Troubleshooting

### Install prompt never appears on Chrome/Edge
Check:
- HTTPS context (or localhost for dev)
- manifest is reachable and valid
- service worker successfully registered
- app meets installability heuristics (icons, start_url/scope, engagement)

### iOS users say “one-tap doesn’t work”
Expected behavior. iOS Safari does not provide `beforeinstallprompt` one-tap install like Chromium browsers.

### Console users cannot install
Expected behavior. Keep messaging clear and route them to phone/tablet/desktop for install.

### Offline game/worksheet assets behave strangely
Confirm latest `public/service-worker.js` is active and old cache was replaced. Hard refresh / unregister old SW during debug.

---

## 10) Native Wrapper Path (Optional, Recommended for Store Distribution)

If you want app-store presence and more consistent install UX on mobile, use Capacitor.

### Phase 2.5 checklist

#### Prepare web build
- [ ] Keep PWA flow working (`npm run build` passes)
- [ ] Confirm production routing/base path (`/homeschool-app/`)
- [ ] Ensure critical assets are in `dist/`

#### Add Capacitor
- [ ] `npm i @capacitor/core @capacitor/cli`
- [ ] `npx cap init "La's Homeschool Hub" "com.projektoutside.homeschool" --web-dir=dist`
- [ ] `npm i @capacitor/android @capacitor/ios`
- [ ] `npx cap add android` (and iOS on macOS)

#### Sync and run
- [ ] `npm run build && npx cap sync`
- [ ] `npx cap open android`
- [ ] `npx cap open ios` (macOS)

#### Hardening for stores
- [ ] privacy policy + support url
- [ ] signing/package ids
- [ ] kid-safe/parental policy checks
- [ ] store screenshots/metadata

---

## 11) Executive Summary

Your project now has a **best-possible PWA install implementation** for real-world browser constraints:
- one-tap where truly supported,
- clear guided fallback where not,
- explicit console limitation handling,
- and cleaner architecture with one main install hook.

For maximum reach, keep this PWA and optionally add a Capacitor wrapper for iOS/Android store distribution.
