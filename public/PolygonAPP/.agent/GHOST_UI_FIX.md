# Legacy UI "Ghost" Verification

## 👻 The Issue
User reported seeing legacy "Layers" and "Visualizers" panels blurred in the background when the "New Game" panel opens.

## 🔍 Investigation
1.  **HTML Scan**: Confirmed that the `div` structure for `.sidebar-left` and `.sidebar-right` was already removed from `index.html`.
2.  **JS Scan**: Searched for any code dynamically creating `sidebar` elements. None found (except `game.js` which tried to hide them).
3.  **Visuals**: The "blurred" effect confirms that *if* they are there, they are behind the overlay.

## 🛡️ The Fix (Double Down)
To ensure these elements are absolutely gone, even if a script tries to recreate them or if there's a stubborn cache:

1.  **Nuclear CSS Added**:
    Added a high-specificity style block to `index.html` that forces `display: none !important` on:
    - `.sidebar`, `.sidebar-left`, `.sidebar-right`
    - `.visualizers-panel`, `.layers-panel`
    - Any element with `id` containing "visualizer" or "layers-panel".

2.  **JS Cleanup**:
    Commented out the sidebar references in `js/game.js` so the game logic stops trying to interact with them.

## 🧪 Verification
1.  **Hard Refresh**: Please press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac) to clear the browser cache.
2.  **Check Background**: Open "Play Game". The background behind the modal should be clean (just the game canvas/toolbar), with no sidebars visible.
