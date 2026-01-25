# 🕵️💎 The Spy Academy - Escape Room

A fully cross-platform escape room challenge featuring immersive color-based puzzles, 3D graphics, and team-based gameplay. Optimized to work perfectly on **phones, tablets, iPads, and PCs** with complete audio and visual functionality.

![Challenge Preview](data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23000511'/%3E%3Cstop offset='100%25' style='stop-color:%23001122'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23bg)'/%3E%3Ctext x='320' y='140' font-family='serif' font-size='48' fill='%2300ffff' text-anchor='middle'%3ETHE LIGHT CHALLENGE%3C/text%3E%3Ctext x='320' y='200' font-family='sans-serif' font-size='24' fill='%23ffffff' text-anchor='middle'%3EEscape Room Experience%3C/text%3E%3Cpolygon points='320,240 360,280 320,320 280,280' fill='%2300ffff' opacity='0.7'/%3E%3C/svg%3E)

## 🌟 Features

### Cross-Platform Compatibility
- **📱 Mobile Optimized**: Perfect touch controls for phones and tablets
- **🖥️ Desktop Ready**: Full mouse and keyboard support for PCs
- **🍎 iOS Enhanced**: Optimized for iPhone and iPad with gesture handling
- **🤖 Android Compatible**: Smooth performance across Android devices
- **💿 PWA Support**: Installable as a native app on all devices

### Game Features
- **🎯 Team-Based Puzzles**: 2-6 players work together to solve challenges
- **🎨 Color Code Mystery**: Crack hidden sequences using logic and teamwork
- **⏰ Timed Challenges**: Race against the clock for added excitement
- **🎵 Immersive Audio**: Cross-platform sound effects and ambient music
- **💎 3D Graphics**: Stunning Three.js visuals that work everywhere
- **🔊 Volume Controls**: Separate control for music and sound effects

## 🚀 Quick Start

### Option 1: Local Development Server (Recommended)
```bash
# Clone or download the project
cd Escaperoomchallenge

# Start a local server (Python 3)
python -m http.server 8000

# Or with Node.js
npx http-server -p 8000

# Open in browser
http://localhost:8000
```

### Option 2: Direct File Access
Simply open `index.html` in any modern web browser. Note: Some features may be limited without a server.

### Option 3: Deploy to Web
Upload all files to any web hosting service (GitHub Pages, Netlify, Vercel, etc.)

## 📱 Mobile Installation

### iOS (iPhone/iPad)
1. Open in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will install like a native app

### Android
1. Open in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Follow the prompts to install

## 🎮 How to Play

### Setup
1. **Choose Player Count**: Select 2-6 players
2. **Pick Colors**: Each player selects a unique color
3. **Read Instructions**: Learn the challenge rules

### Challenge 1: Color Code Mystery
- Work together to crack a hidden color sequence
- Each guess reveals how many colors are correct
- Use logic and teamwork to solve within the time limit
- No duplicate colors in the secret code

### Controls
- **Desktop**: Click to interact with all elements
- **Mobile/Tablet**: Tap to interact, optimized touch targets
- **All Platforms**: Volume controls accessible via the speaker icon

## 🛠️ Technical Implementation

### Cross-Platform Optimizations

#### Mobile Enhancements
- **Viewport Fixes**: CSS custom properties for mobile browser address bars
- **Touch Optimization**: All interactive elements have 44px minimum touch targets
- **Gesture Handling**: iOS zoom prevention and orientation change support
- **Performance**: Battery optimization through page visibility API

#### Audio System
- **Web Audio API**: Cross-browser audio with fallbacks
- **Mobile Audio**: Proper handling of iOS/Android audio restrictions
- **Graceful Degradation**: Continues working even if audio fails
- **Context Management**: Automatic suspend/resume for battery saving

#### Visual Design
- **Responsive Layout**: Multiple breakpoints for all screen sizes
- **High DPI Support**: Optimized rendering for retina displays
- **Touch Feedback**: Visual and haptic feedback for mobile interactions
- **Orientation Support**: Works in both portrait and landscape modes

#### Progressive Web App
- **Offline Capable**: Service worker caching for offline play
- **Installable**: Native app-like experience on mobile devices
- **Background Sync**: Enhanced mobile functionality
- **App Icons**: Beautiful icons for all platforms

### File Structure
```
Escaperoomchallenge/
├── index.html              # Main application entry point
├── styles.css              # Cross-platform responsive styles
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker for offline support
├── js/
│   ├── soundManager.js     # Cross-platform audio system
│   ├── gameManager.js      # Game state management
│   ├── main.js            # 3D main menu scene
│   └── challenges/
│       └── challenge1.js   # Color code challenge logic
└── README.md              # This file
```

### Dependencies
- **Three.js r128**: 3D graphics and animations
- **Anime.js 3.2.1**: Smooth UI animations
- **Google Fonts**: Cinzel and Orbitron font families

## 🎨 Customization

### Adding New Challenges
1. Create a new file in `js/challenges/`
2. Follow the Challenge1 class structure
3. Update the game flow in `index.html`

### Modifying Colors
Edit the color arrays in the color selection setup functions in `index.html`

### Adjusting Audio
Modify the `SoundManager` class in `js/soundManager.js` to add new sounds or change existing ones

### Styling Changes
Update `styles.css` - all responsive breakpoints are clearly marked

## 🔧 Browser Support

### Minimum Requirements
- **Chrome/Chromium**: Version 80+
- **Safari**: Version 13+
- **Firefox**: Version 75+
- **Edge**: Version 80+

### Features by Platform
| Feature | Desktop | Mobile | Tablet |
|---------|---------|---------|--------|
| 3D Graphics | ✅ | ✅ | ✅ |
| Audio | ✅ | ✅ | ✅ |
| Touch Controls | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |

## 🐛 Troubleshooting

### Audio Issues
- **No Sound**: Tap anywhere to activate audio context (required on mobile)
- **Choppy Audio**: Check volume settings and close other audio apps
- **iOS Silent Mode**: Check the hardware silent switch

### Performance Issues
- **Slow 3D**: Disable hardware acceleration in browser if needed
- **Mobile Lag**: Close other apps to free up memory
- **Touch Response**: Ensure latest browser version

### Installation Issues
- **PWA Won't Install**: Use Safari on iOS or Chrome on Android
- **Service Worker Errors**: Clear browser cache and reload

## 📄 License

This project is open source and available under the MIT License.

## 🙌 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📞 Support

If you encounter any issues or have questions about cross-platform compatibility, please open an issue on the project repository.

---

**Enjoy The Spy Academy! 🕵️💎**

*Built with ❤️ for seamless cross-platform escape room experiences* 