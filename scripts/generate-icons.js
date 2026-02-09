#!/usr/bin/env node
/**
 * Icon Generator Script for La's Homeschool Hub App
 * Generates all required PWA icon sizes from a base SVG template
 * 
 * To customize the icon, edit the svgTemplate below.
 * Current design: A colorful graduation cap with "LH" initials
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Icon sizes required for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// Default icon design - Graduation Cap with "LH" initials
// You can customize the colors and design by editing these values
const ICON_CONFIG = {
  backgroundColor: '#6366f1',  // Indigo-500
  accentColor: '#fbbf24',      // Amber-400 (cap top)
  textColor: '#ffffff',        // White text
  secondaryColor: '#818cf8',   // Indigo-400 (shadow/details)
  text: 'LH',                  // App initials
};

/**
 * Generate an SVG template for the icon
 * This creates a scalable vector graphic that renders at any size
 */
function generateSVG(size, config) {
  const scale = size / 512; // Base scale on 512x512 canvas
  const center = size / 2;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient for background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${config.backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${config.secondaryColor};stop-opacity:1" />
    </linearGradient>
    
    <!-- Shadow filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background circle with gradient -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="url(#bgGrad)"/>
  
  <!-- Graduation Cap -->
  <g transform="translate(${center}, ${center}) scale(${scale})">
    <!-- Cap base/shadow -->
    <ellipse cx="0" cy="60" rx="140" ry="40" fill="#4f46e5" opacity="0.3"/>
    
    <!-- Cap bottom (mortarboard) -->
    <path d="M-120 20 L0 -60 L120 20 L0 60 Z" fill="white" filter="url(#shadow)"/>
    
    <!-- Cap top -->
    <path d="M-120 20 L0 -40 L120 20" fill="none" stroke="${config.accentColor}" stroke-width="12" stroke-linecap="round"/>
    
    <!-- Tassel -->
    <line x1="100" y1="20" x2="100" y2="80" stroke="${config.accentColor}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="100" cy="85" r="10" fill="${config.accentColor}"/>
    
    <!-- Center button -->
    <circle cx="0" cy="-40" r="15" fill="${config.accentColor}"/>
  </g>
  
  <!-- App Initials Text -->
  <text x="${center}" y="${center + size * 0.35}" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.18}" 
        font-weight="bold" 
        fill="${config.textColor}" 
        text-anchor="middle"
        filter="url(#shadow)">${config.text}</text>
  
  <!-- Decorative stars/sparkles -->
  <g fill="${config.accentColor}" opacity="0.8">
    <circle cx="${size * 0.15}" cy="${size * 0.25}" r="${size * 0.03}"/>
    <circle cx="${size * 0.85}" cy="${size * 0.2}" r="${size * 0.04}"/>
    <circle cx="${size * 0.2}" cy="${size * 0.75}" r="${size * 0.025}"/>
    <circle cx="${size * 0.8}" cy="${size * 0.8}" r="${size * 0.035}"/>
  </g>
</svg>`;
}

/**
 * Convert SVG to PNG using canvas
 */
async function svgToPng(svgString, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Parse SVG and draw to canvas
  const img = await loadImage(Buffer.from(svgString));
  ctx.drawImage(img, 0, 0, size, size);
  
  return canvas.toBuffer('image/png');
}

/**
 * Load image from buffer
 */
function loadImage(buffer) {
  return new Promise((resolve, reject) => {
    const img = new (require('canvas').Image)();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = buffer;
  });
}

/**
 * Main generation function
 */
async function generateIcons() {
  console.log('🎨 Generating icons for La\'s Homeschool Hub App...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Generate SVG source (master file for easy editing)
  const masterSVG = generateSVG(512, ICON_CONFIG);
  const masterPath = path.join(OUTPUT_DIR, 'icon-source.svg');
  fs.writeFileSync(masterPath, masterSVG);
  console.log(`✓ Created master SVG: icon-source.svg (Edit this to customize)`);
  
  // Generate all PNG sizes
  for (const size of ICON_SIZES) {
    try {
      const svg = generateSVG(size, ICON_CONFIG);
      const pngBuffer = await svgToPng(svg, size);
      const filename = `icon-${size}x${size}.png`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), pngBuffer);
      console.log(`✓ Generated ${filename}`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('\n🎉 Icon generation complete!');
  console.log(`📁 Icons saved to: ${OUTPUT_DIR}`);
  console.log('\n💡 To customize the icon:');
  console.log('   1. Edit ICON_CONFIG in this script');
  console.log('   2. Run: node scripts/generate-icons.js');
  console.log('   3. Or edit icon-source.svg directly in a vector editor');
}

// Check if canvas is installed
try {
  require('canvas');
} catch (e) {
  console.error('❌ Error: The "canvas" package is required.');
  console.error('   Please install it by running:');
  console.error('   npm install canvas');
  process.exit(1);
}

// Run generation
generateIcons().catch(console.error);