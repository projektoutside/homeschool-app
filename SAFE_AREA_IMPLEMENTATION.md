# Safe Area Implementation Guide

## Overview

This document describes the safe area implementation that ensures all games, worksheets, and tools in the Homeschool App stay within the visible screen area on mobile devices, respecting notches, home indicators, and device edges.

## Problem Solved

Previously, games and content would extend beyond the screen on mobile devices, cutting off buttons and UI elements. This was caused by:

1. **Missing `viewport-fit=cover`** in viewport meta tags
2. **Using `100vh` instead of `100dvh`** (dynamic viewport height)
3. **Not accounting for safe area insets** (`env(safe-area-inset-*)`)
4. **Fullscreen modes removing all padding** without safe area consideration

## Solution Implemented

### 1. Centralized Safe Area CSS (`src/styles/safe-area.css`)

A comprehensive CSS file providing:
- CSS custom properties for safe area insets
- Utility classes for safe area containers
- Fullscreen safe area handling
- Overflow prevention utilities

**Key Classes:**
- `.safe-area-container` - Container with safe area padding
- `.safe-area-fullscreen` - Fullscreen mode respecting safe areas
- `.safe-area-game` - Game container with safe areas
- `.safe-area-worksheet` - Worksheet container with safe areas

### 2. JavaScript Viewport Safety Utility (`public/js/viewport-safety.js`)

Runtime viewport monitoring and adjustments:
- Detects safe area insets dynamically
- Monitors viewport changes (resize, orientation, fullscreen)
- Automatically adjusts fixed elements
- Prevents iframe overflow

**Usage:**
```javascript
// Initialize
ViewportSafety.init();

// Enable debug mode (visual safe area indicators)
ViewportSafety.enableDebug();

// Get current safe area insets
const insets = ViewportSafety.getSafeAreaInsets();
```

### 3. Updated Main App Components

#### GamePlayer.css
- Changed `100vh` to `100dvh` for accurate mobile sizing
- Added `box-sizing: border-box` to include padding in height
- Constrained iframe to parent container

#### HTMLViewer.css
- Fullscreen mode now keeps safe area padding (no more `padding: 0 !important`)
- Constrained iframe max dimensions to safe area bounds
- Exit button positioned within safe areas

#### Viewer.css
- Added safe area padding to `.viewer-page`
- Constrained game viewport to safe area dimensions
- Fullscreen controls respect safe areas

### 4. Batch-Updated Game & Worksheet Files

The script `scripts/fix-viewport-meta.cjs` updated 63 files with:
- Proper viewport meta tag with `viewport-fit=cover`
- Mobile web app meta tags
- Safe area CSS variables
- Body padding for safe areas

## CSS Custom Properties Available

All components now have access to these CSS variables:

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  
  --viewport-height: 100vh;
  --viewport-height-dynamic: 100dvh;
  
  --edge-gap: 12px; /* Desktop */
  --edge-gap-mobile: 8px; /* Mobile */
}
```

## Usage Examples

### For New Games/Tools

Add to your HTML `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```

Add to your CSS:
```css
html, body {
  min-height: 100dvh;
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  padding-top: env(safe-area-inset-top, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  box-sizing: border-box;
}
```

### For Fixed Position Elements

```css
.my-fixed-button {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 0px);
  right: env(safe-area-inset-right, 0px);
  /* Add breathing room */
  margin: 12px;
}
```

### For Fullscreen Mode

```css
.my-fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  /* Keep safe areas! */
  padding-top: env(safe-area-inset-top, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  box-sizing: border-box;
}
```

## Debugging

### Enable Visual Safe Area Indicators

Add to URL: `?debug-safe-areas=true`

Or in JavaScript:
```javascript
ViewportSafety.enableDebug();
```

This will show colored borders indicating safe area boundaries.

### Check Viewport Dimensions

```javascript
const dims = ViewportSafety.getViewportDimensions();
console.log(dims);
// { width, height, availableWidth, availableHeight }
```

## Browser Support

- **iOS Safari 11+**: Full support (safe area insets introduced)
- **Chrome Android**: Full support
- **Modern browsers**: Full support
- **Older browsers**: Graceful degradation (fallback to 0px)

## Testing Checklist

When testing on mobile devices:

- [ ] Content doesn't go under notch/dynamic island
- [ ] Bottom controls are above home indicator
- [ ] Fullscreen mode keeps content visible
- [ ] Landscape orientation works correctly
- [ ] No horizontal scrolling
- [ ] All buttons are reachable
- [ ] Works on iPhone with notch
- [ ] Works on iPhone without notch
- [ ] Works on Android devices

## Files Modified

### Core System Files
- `src/styles/safe-area.css` (new)
- `public/js/viewport-safety.js` (new)
- `src/pages/GamePlayer.css`
- `src/pages/HTMLViewer.css`
- `src/pages/Viewer.css`

### Game Files (6 files)
- All games in `public/Games/*/index.html`

### Worksheet Files (63 files)
- All worksheets in `public/Worksheets/*/index.html`

## Future Maintenance

### Adding New Games/Worksheets

Run the viewport fixer script:
```bash
node scripts/fix-viewport-meta.cjs
```

### Updating Safe Area Values

The CSS `env()` function automatically adapts to device safe areas. No manual updates needed.

### Browser Changes

If new viewport units are introduced (e.g., `100svh`, `100lvh`), update `src/styles/safe-area.css`.

## Troubleshooting

### Content Still Overflowing

1. Check if element has `position: fixed` with `bottom: 0` (should use `env(safe-area-inset-bottom)`)
2. Verify `box-sizing: border-box` is set
3. Check for hardcoded `height: 100vh` (should be `100dvh`)

### Safe Areas Not Working

1. Verify viewport meta tag includes `viewport-fit=cover`
2. Check if CSS is being loaded
3. Test on actual device (simulators may not show safe areas)

### Fullscreen Issues

1. Ensure fullscreen element has `padding: env(safe-area-inset-*)`
2. Don't use `padding: 0 !important` in fullscreen
3. Check z-index layering

## References

- [CSS env() function](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [viewport-fit descriptor](https://developer.mozilla.org/en-US/docs/Web/CSS/@viewport/viewport-fit)
- [iOS Safe Area Layout Guide](https://developer.apple.com/documentation/uikit/uiview/positioning_content_relative_to_the_safe_area)
