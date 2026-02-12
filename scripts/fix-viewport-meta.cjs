/**
 * Viewport Meta Tag Fixer Script
 * ================================
 * This script updates all game and worksheet HTML files to include
 * proper viewport meta tags with viewport-fit=cover for mobile devices.
 * 
 * Usage: node scripts/fix-viewport-meta.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Directories to scan
  directories: [
    'public/Games',
    'public/Worksheets'
  ],
  
  // File pattern to match
  filePattern: /index\.html$/,
  
  // The proper viewport meta tag
  viewportMeta: '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0">',
  
  // Additional meta tags to add for mobile optimization
  additionalMetaTags: [
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  ],
  
  // CSS to inject for safe area support
  safeAreaCSS: `
    /* Safe Area Support - Auto-injected */
    :root {
      --safe-area-top: env(safe-area-inset-top, 0px);
      --safe-area-right: env(safe-area-inset-right, 0px);
      --safe-area-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-left: env(safe-area-inset-left, 0px);
    }
    
    html, body {
      /* Prevent overflow beyond viewport */
      max-width: 100vw;
      overflow-x: hidden;
      /* Use dynamic viewport height for mobile */
      min-height: 100dvh;
    }
    
    body {
      /* Respect safe areas */
      padding-top: env(safe-area-inset-top, 0px);
      padding-right: env(safe-area-inset-right, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
      box-sizing: border-box;
    }
  `
};

// Statistics
const stats = {
  scanned: 0,
  updated: 0,
  skipped: 0,
  errors: 0
};

/**
 * Recursively find all HTML files in a directory
 */
function findHtmlFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(fullPath, files);
    } else if (stat.isFile() && CONFIG.filePattern.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Check if file has proper viewport meta tag
 */
function hasProperViewportMeta(content) {
  const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"]*viewport-fit=cover[^"]*["'][^>]*>/i;
  return viewportRegex.test(content);
}

/**
 * Update viewport meta tag in HTML content
 */
function updateViewportMeta(content) {
  // Replace existing viewport meta tag
  const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*>/gi;
  
  if (viewportRegex.test(content)) {
    // Replace existing viewport meta
    content = content.replace(viewportRegex, CONFIG.viewportMeta);
  } else {
    // Add viewport meta after charset meta
    const charsetRegex = /<meta[^>]*charset=[^>]*>/i;
    if (charsetRegex.test(content)) {
      content = content.replace(charsetRegex, match => match + '\n  ' + CONFIG.viewportMeta);
    } else {
      // Add after <head> tag
      const headRegex = /<head>/i;
      content = content.replace(headRegex, '<head>\n  ' + CONFIG.viewportMeta);
    }
  }
  
  return content;
}

/**
 * Add mobile meta tags if missing
 */
function addMobileMetaTags(content) {
  for (const metaTag of CONFIG.additionalMetaTags) {
    const metaName = metaTag.match(/name=["']([^"']+)["']/)[1];
    const metaRegex = new RegExp(`<meta[^>]*name=["']${metaName}["'][^>]*>`, 'i');
    
    if (!metaRegex.test(content)) {
      // Add after viewport meta
      const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*>/i;
      content = content.replace(viewportRegex, match => match + '\n  ' + metaTag);
    }
  }
  
  return content;
}

/**
 * Add safe area CSS if missing
 */
function addSafeAreaCSS(content) {
  // Check if safe area CSS already exists
  if (content.includes('--safe-area-top:')) {
    return content;
  }
  
  // Find the first style tag or create one
  const styleRegex = /<style[^>]*>/i;
  
  if (styleRegex.test(content)) {
    // Add after the first style tag opening
    content = content.replace(styleRegex, match => match + '\n' + CONFIG.safeAreaCSS);
  } else {
    // Add a new style tag in the head
    const headEndRegex = /<\/head>/i;
    const styleTag = `<style>${CONFIG.safeAreaCSS}</style>`;
    content = content.replace(headEndRegex, styleTag + '\n</head>');
  }
  
  return content;
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    stats.scanned++;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Check if already has proper viewport
    if (hasProperViewportMeta(content)) {
      console.log(`  ✓ Already has proper viewport meta`);
      stats.skipped++;
      return;
    }
    
    // Update viewport meta
    content = updateViewportMeta(content);
    modified = true;
    console.log(`  ✓ Updated viewport meta tag`);
    
    // Add mobile meta tags
    content = addMobileMetaTags(content);
    console.log(`  ✓ Added mobile meta tags`);
    
    // Add safe area CSS
    content = addSafeAreaCSS(content);
    console.log(`  ✓ Added safe area CSS`);
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf-8');
    stats.updated++;
    console.log(`  ✓ File saved\n`);
    
  } catch (error) {
    stats.errors++;
    console.error(`  ✗ Error: ${error.message}\n`);
  }
}

/**
 * Main function
 */
function main() {
  console.log('='.repeat(60));
  console.log('Viewport Meta Tag Fixer');
  console.log('='.repeat(60));
  console.log('');
  
  // Find all HTML files
  const allFiles = [];
  for (const dir of CONFIG.directories) {
    const fullDir = path.join(process.cwd(), dir);
    if (fs.existsSync(fullDir)) {
      const files = findHtmlFiles(fullDir);
      allFiles.push(...files);
    } else {
      console.warn(`Directory not found: ${fullDir}`);
    }
  }
  
  console.log(`Found ${allFiles.length} HTML files to process\n`);
  
  // Process each file
  for (const file of allFiles) {
    processFile(file);
  }
  
  // Print summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${stats.scanned}`);
  console.log(`Files updated: ${stats.updated}`);
  console.log(`Files skipped (already correct): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');
  
  if (stats.errors > 0) {
    process.exit(1);
  }
}

// Run main function
main();
