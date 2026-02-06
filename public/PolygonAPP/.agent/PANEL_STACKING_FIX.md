# UI PANEL STACKING - COMPLETE ANALYSIS & FIX

## Current Setup (FINAL):

### CSS (.bottom-center-ui):
```css
position: fixed;
bottom: 24px;          ← Container's BOTTOM edge is 24px from screen bottom
left: 50%;
transform: translateX(-50%);
display: flex;
flex-direction: column; ← Normal column: items stack TOP to BOTTOM
align-items: center;
gap: 32px;             ← 32px space between items
```

### HTML Order:
```html
<div class="bottom-center-ui">
    <!-- 1st child: Game Controls -->
    <div class="game-controls">
        Undo | Redo | Submit
    </div>
    
    <!-- 2nd child: Viewport Controls -->
    <div class="viewport-controls">
        Grid Snap | Zoom | Pan
    </div>
</div>
```

## Visual Layout Explanation:

```
SCREEN TOP
    ↓
    ↓
    ↓ (lots of space)
    ↓
    ↓
  ┌─────────────────────────────────┐
  │  .bottom-center-ui CONTAINER    │ ← Container anchored to bottom: 24px
  │                                  │
  │  ╔═══════════════════════════╗  │ ← 1st child (Game Controls)
  │  ║   Undo | Redo | Submit   ║  │   appears at TOP of flex container
  │  ╚═══════════════════════════╝  │   (further from screen bottom)
  │                                  │
  │          32px GAP                │ ← Clear separation
  │                                  │
  │  ╔═══════════════════════════╗  │ ← 2nd child (Viewport Controls)
  │  ║ Grid | + - | ← ↑ ↓ →     ║  │   appears at BOTTOM of flex container
  │  ╚═══════════════════════════╝  │   (closest to screen bottom)
  │                                  │
  └─────────────────────────────────┘
    ↓ 24px from screen bottom
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREEN BOTTOM
```

## Why This Works:

1. **Container Positioning**:
   - `position: fixed; bottom: 24px` anchors the container's BOTTOM edge 24px from screen bottom
   
2. **Flex Direction `column`**:
   - Items stack from TOP to BOTTOM within the container
   - First child (Game Controls) → Top of container
   - Second child (Viewport Controls) → Bottom of container (nearest to bottom: 24px anchor)
   
3. **Result**:
   - Game Controls appear HIGHER UP on screen (above viewport controls)
   - Viewport Controls appear LOWER DOWN (closer to screen bottom)
   - 32px gap prevents ANY overlap

## Z-Index Layering (Extra Safety):
- Game Controls: `z-index: 2`
- Viewport Controls: `z-index: 1`
- Even if panels somehow touch, game controls will layer on top

## Key Files Modified:
- `index.html` lines 1488-1504: Container CSS with flex-direction: column
- `index.html` lines 1507-1528: Viewport controls CSS with z-index: 1
- `index.html` lines 1607-1622: Game controls CSS with z-index: 2
- `index.html` lines 3414-3433: HTML structure with correct DOM order
- `index.html` lines 1688-1703: Landscape mobile support

## Testing Checklist:
✓ Game Controls (Undo/Redo/Submit) appear ABOVE
✓ Viewport Controls (Grid/Zoom/Pan) appear BELOW  
✓ 32px gap between panels prevents overlap
✓ Z-index ensures game controls layer on top if needed
✓ Works in portrait and landscape orientations
✓ No inline styles overriding the flex layout
