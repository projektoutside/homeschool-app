# Legacy UI Cleanup Plan

## Goal
Remove all legacy panels that appear in tablet/iPad landscape mode:
1. Left-side "Layers" panel
2. Right-side "Visuals" panel  
3. Any "Learn Polygon Playground" feature remnants

## Items Found to Remove

### 1. HTML Elements
- `layersPanel` div and all its contents
- Any mobile menu toggle buttons (mobileMenuLeft, mobileMenuRight)
- setupMobileMenus() function calls

### 2. CSS Styles
- All `.layer-*` styles
- All `.viz-*` styles  
- `.visualizer-*` styles
- `.resizable-panel` styles related to these panels
- Sidebar width CSS variables
- Any responsive breakpoints that show/hide these panels

### 3. JavaScript Functions
- setupMobileMenus()
- setupResizablePanels() - or at least cleanup references to layersPanel
- toggleMobileSidebar() - cleanup
- Panel resizing logic

### 4. Legacy Features
- "Learn Polygon Playground" button/mode (if exists)
- Any visualizer toggles/controls

## Execution Steps
1. Backup current index.html
2. Remove HTML elements
3. Remove CSS styles
4. Clean up JavaScript
5. Test on tablet landscape/portrait
6. Verify no regressions

## Non-negotiables
- Do NOT break gameplay features
- Do NOT break save/load
- Do NOT break settings
- Keep all game controls intact
