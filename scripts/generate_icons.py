#!/usr/bin/env python3
"""
Icon Generator Script for La's Homeschool Hub App
Generates all required PWA icon sizes using PIL/Pillow

Requirements: pip install pillow

To customize the icon, edit the ICON_CONFIG dictionary below.
Current design: A colorful graduation cap with "LH" initials
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Icon sizes required for PWA
ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')

# Default icon design - Graduation Cap with "LH" initials
# You can customize the colors and design by editing these values
ICON_CONFIG = {
    'background_color': '#6366f1',    # Indigo-500
    'accent_color': '#fbbf24',        # Amber-400 (cap top)
    'text_color': '#ffffff',          # White text
    'secondary_color': '#818cf8',     # Indigo-400
    'text': 'LH',                     # App initials
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def draw_gradient_background(draw, size, color1, color2):
    """Draw a gradient background"""
    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)
    
    for y in range(size):
        for x in range(size):
            # Calculate gradient ratio
            ratio = (x + y) / (2 * size)
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            draw.point((x, y), fill=(r, g, b))

def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rectangle with rounded corners"""
    x1, y1, x2, y2 = xy
    # Draw main rectangle
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    # Draw corners
    draw.ellipse([x1, y1, x1 + radius * 2, y1 + radius * 2], fill=fill)
    draw.ellipse([x2 - radius * 2, y1, x2, y1 + radius * 2], fill=fill)
    draw.ellipse([x1, y2 - radius * 2, x1 + radius * 2, y2], fill=fill)
    draw.ellipse([x2 - radius * 2, y2 - radius * 2, x2, y2], fill=fill)

def draw_graduation_cap(draw, size, config):
    """Draw a graduation cap icon"""
    center_x = size // 2
    center_y = size // 2
    scale = size / 512
    
    # Cap colors
    white = (255, 255, 255)
    accent = hex_to_rgb(config['accent_color'])
    shadow = (79, 70, 229)  # Darker indigo
    
    # Cap base shadow (ellipse)
    shadow_y = int(center_y + 60 * scale)
    shadow_rx = int(140 * scale)
    shadow_ry = int(40 * scale)
    draw.ellipse(
        [center_x - shadow_rx, shadow_y - shadow_ry,
         center_x + shadow_rx, shadow_y + shadow_ry],
        fill=shadow
    )
    
    # Cap bottom (mortarboard - diamond shape)
    cap_points = [
        (center_x - int(120 * scale), center_y + int(20 * scale)),
        (center_x, center_y - int(60 * scale)),
        (center_x + int(120 * scale), center_y + int(20 * scale)),
        (center_x, center_y + int(60 * scale))
    ]
    draw.polygon(cap_points, fill=white)
    
    # Cap top line
    line_y1 = center_y + int(20 * scale)
    line_y2 = center_y - int(40 * scale)
    line_width = max(3, int(12 * scale))
    draw.line([
        (center_x - int(120 * scale), line_y1),
        (center_x, line_y2),
        (center_x + int(120 * scale), line_y1)
    ], fill=accent, width=line_width)
    
    # Tassel
    tassel_x = center_x + int(100 * scale)
    tassel_y1 = center_y + int(20 * scale)
    tassel_y2 = center_y + int(80 * scale)
    tassel_width = max(2, int(8 * scale))
    draw.line([(tassel_x, tassel_y1), (tassel_x, tassel_y2)], 
              fill=accent, width=tassel_width)
    
    # Tassel end
    tassel_end_r = max(3, int(10 * scale))
    draw.ellipse([
        tassel_x - tassel_end_r, tassel_y2 - tassel_end_r,
        tassel_x + tassel_end_r, tassel_y2 + tassel_end_r
    ], fill=accent)
    
    # Center button
    button_r = max(4, int(15 * scale))
    button_y = center_y - int(40 * scale)
    draw.ellipse([
        center_x - button_r, button_y - button_r,
        center_x + button_r, button_y + button_r
    ], fill=accent)

def draw_sparkles(draw, size, config):
    """Draw decorative sparkles"""
    accent = hex_to_rgb(config['accent_color'])
    positions = [
        (0.15, 0.25, 0.03),
        (0.85, 0.20, 0.04),
        (0.20, 0.75, 0.025),
        (0.80, 0.80, 0.035)
    ]
    
    for x_ratio, y_ratio, r_ratio in positions:
        x = int(size * x_ratio)
        y = int(size * y_ratio)
        r = max(2, int(size * r_ratio))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=accent)

def generate_icon(size, config):
    """Generate a single icon size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background with rounded corners
    bg_color1 = hex_to_rgb(config['background_color'])
    bg_color2 = hex_to_rgb(config['secondary_color'])
    
    # Create background with gradient
    for y in range(size):
        for x in range(size):
            ratio = (x + y) / (2 * size)
            r = int(bg_color1[0] + (bg_color2[0] - bg_color1[0]) * ratio)
            g = int(bg_color1[1] + (bg_color2[1] - bg_color1[1]) * ratio)
            b = int(bg_color1[2] + (bg_color2[2] - bg_color1[2]) * ratio)
            draw.point((x, y), fill=(r, g, b, 255))
    
    # Draw rounded corners mask
    corner_radius = int(size * 0.2)
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    draw_rounded_rect(mask_draw, [0, 0, size, size], corner_radius, 255)
    
    # Apply mask
    img.putalpha(mask)
    
    # Redraw with proper alpha
    final_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final_img.paste(img, (0, 0), img)
    draw = ImageDraw.Draw(final_img)
    
    # Draw graduation cap
    draw_graduation_cap(draw, size, config)
    
    # Draw text (initials)
    text = config['text']
    try:
        # Try to use a nice font, fallback to default
        font_size = int(size * 0.18)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except:
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    text_x = (size - text_width) // 2
    text_y = size // 2 + int(size * 0.15)
    
    text_color = hex_to_rgb(config['text_color'])
    draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    # Draw sparkles
    draw_sparkles(draw, size, config)
    
    return final_img

def main():
    print("🎨 Generating icons for La's Homeschool Hub App...\n")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Generate all icon sizes
    for size in ICON_SIZES:
        try:
            icon = generate_icon(size, ICON_CONFIG)
            filename = f'icon-{size}x{size}.png'
            filepath = os.path.join(OUTPUT_DIR, filename)
            icon.save(filepath, 'PNG', optimize=True)
            print(f"✓ Generated {filename}")
        except Exception as e:
            print(f"✗ Failed to generate icon-{size}x{size}.png: {e}")
    
    # Save SVG source for editing
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{ICON_CONFIG['background_color']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{ICON_CONFIG['secondary_color']};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="102" ry="102" fill="url(#bgGrad)"/>
  <g transform="translate(256, 256)">
    <ellipse cx="0" cy="60" rx="140" ry="40" fill="#4f46e5" opacity="0.3"/>
    <path d="M-120 20 L0 -60 L120 20 L0 60 Z" fill="white" filter="url(#shadow)"/>
    <path d="M-120 20 L0 -40 L120 20" fill="none" stroke="{ICON_CONFIG['accent_color']}" stroke-width="12" stroke-linecap="round"/>
    <line x1="100" y1="20" x2="100" y2="80" stroke="{ICON_CONFIG['accent_color']}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="100" cy="85" r="10" fill="{ICON_CONFIG['accent_color']}"/>
    <circle cx="0" cy="-40" r="15" fill="{ICON_CONFIG['accent_color']}"/>
  </g>
  <text x="256" y="360" font-family="Arial, sans-serif" font-size="92" font-weight="bold" 
        fill="{ICON_CONFIG['text_color']}" text-anchor="middle" filter="url(#shadow)">{ICON_CONFIG['text']}</text>
  <g fill="{ICON_CONFIG['accent_color']}" opacity="0.8">
    <circle cx="77" cy="128" r="15"/>
    <circle cx="435" cy="102" r="20"/>
    <circle cx="102" cy="384" r="13"/>
    <circle cx="410" cy="410" r="18"/>
  </g>
</svg>'''
    
    svg_path = os.path.join(OUTPUT_DIR, 'icon-source.svg')
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    print(f"✓ Created master SVG: icon-source.svg")
    
    print(f"\n🎉 Icon generation complete!")
    print(f"📁 Icons saved to: {OUTPUT_DIR}")
    print(f"\n💡 To customize the icon:")
    print(f"   1. Edit ICON_CONFIG in this script")
    print(f"   2. Run: python scripts/generate_icons.py")
    print(f"   3. Or edit icon-source.svg directly in a vector editor")

if __name__ == '__main__':
    main()