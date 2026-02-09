# La's Homeschool Hub App - PWA Installation Guide

## 🚀 One-Click Install Feature

La's Homeschool Hub App now supports **Progressive Web App (PWA)** technology, allowing users to install the app directly to their device with a single click!

## 📱 Installation Link

Send this link to your customers:
```
https://https://projektoutside.github.io/homeschool-app//install
```

When users visit this link, they'll see:
- A beautiful install card with app information
- A one-click "Install App" button
- Platform-specific instructions for iOS or desktop browsers

## ✨ Features

### 1. **One-Click Install**
- Chrome/Edge: Click "Install App" → App installs instantly
- iOS Safari: Click "Install App" → Shows step-by-step instructions
- Works on all platforms: Windows, macOS, iOS, Android

### 2. **Fullscreen Mode**
- App launches in fullscreen automatically when installed
- No browser UI (address bar, tabs) - just the app
- Distraction-free learning environment for kids

### 3. **Auto-Update Notifications**
- App checks for updates from GitHub automatically
- Users get notified when new updates are available
- One-click to apply updates and get the latest features

### 4. **Offline Support**
- Works without internet connection after first install
- All educational content available offline
- Perfect for travel or areas with poor connectivity

### 5. **Custom App Icon**
- Beautiful graduation cap icon with "LH" initials
- Easy to customize - see "Customizing the Icon" below
- All required sizes generated automatically (72px to 512px)

## 🎨 Customizing the Icon

### Option 1: Edit Python Script (Recommended)
1. Open `scripts/generate_icons.py`
2. Edit the `ICON_CONFIG` dictionary:
```python
ICON_CONFIG = {
    'background_color': '#6366f1',    # Change background color
    'accent_color': '#fbbf24',        # Change cap/tassel color
    'text_color': '#ffffff',          # Change text color
    'secondary_color': '#818cf8',     # Change gradient color
    'text': 'LH',                     # Change initials
}
```
3. Run: `python scripts/generate_icons.py`

### Option 2: Edit SVG Directly
1. Open `public/icons/icon-source.svg` in a vector editor (Figma, Illustrator, Inkscape)
2. Make your changes
3. Export to all required sizes, or use an online converter

### Option 3: Replace PNG Files
1. Create your icon in any image editor
2. Export to these sizes: 72, 96, 128, 144, 152, 192, 384, 512
3. Save to `public/icons/` as `icon-{size}x{size}.png`

## 🔧 Technical Details

### Files Created/Modified

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA manifest with app info |
| `public/service-worker.js` | Offline support & auto-updates |
| `index.html` | Meta tags for PWA |
| `src/hooks/usePWA.ts` | PWA functionality hook |
| `src/components/InstallButton.tsx` | Install button component |
| `src/components/UpdateNotification.tsx` | Update notifications |
| `src/pages/InstallPage.tsx` | Install page at `/install` |
| `public/icons/` | App icons in all sizes |

### Browser Compatibility

- ✅ Chrome (Windows, macOS, Android)
- ✅ Edge (Windows, macOS)
- ✅ Safari (iOS, macOS)
- ✅ Firefox (Windows, macOS, Android)
- ✅ Samsung Internet

## 📋 Testing the Install Flow

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Visit the install page:**
   ```
   http://localhost:5173/install
   ```

3. **Test the install button:**
   - Should show "Install App" button
   - Click to trigger browser install prompt

4. **Test installed app:**
   - After install, app should open from home screen/desktop
   - Should be in fullscreen mode (no browser UI)

5. **Test auto-updates:**
   - The app checks for GitHub updates automatically
   - Make a commit to trigger update notification

## 🌐 Deployment

### For GitHub Pages:
1. Build the project: `npm run build`
2. Ensure `dist/` folder contains all icon files
3. Deploy to GitHub Pages
4. Share the `/install` link with customers

### For Other Hosts:
1. Build the project: `npm run build`
2. Upload `dist/` contents to your web server
3. Ensure HTTPS is enabled (required for PWA)
4. Verify manifest.json is accessible at `/manifest.json`

## 🐛 Troubleshooting

### Icons not showing?
- Run: `python scripts/generate_icons.py`
- Check that `public/icons/` contains all PNG files
- Verify paths in `public/manifest.json`

### Install button not working?
- Ensure you're using HTTPS (required for PWA)
- Check browser console for errors
- Verify service worker is registered

### App not going fullscreen?
- Check that `display: fullscreen` in `manifest.json`
- Some browsers (iOS) don't support fullscreen API
- App should still launch without browser UI

### Updates not checking?
- Verify GitHub repo info in `public/service-worker.js`
- Check browser console for service worker messages
- Ensure internet connection is available

## 📚 Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Quick Start:** Share `https://your-domain.com/install` with customers for one-click installation! 🎉