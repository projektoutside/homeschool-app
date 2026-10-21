(() => {
  'use strict';

  const TAU = Math.PI * 2;
  function path(ctx, points, width, color, dx = 0, dy = 0) {
    if (points.length < 2) return;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(points[0].x + dx, points[0].y + dy);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + dx, points[i].y + dy);
    ctx.stroke();
  }
  function disc(ctx, x, y, radius, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  function bolt(ctx, x, y, radius) {
    disc(ctx, x, y + .4, radius + .45, '#35473a');
    disc(ctx, x, y, radius, '#d9dfc3');
    ctx.strokeStyle = '#667e71'; ctx.lineWidth = .55;
    ctx.beginPath(); ctx.moveTo(x - radius * .6, y + radius * .35); ctx.lineTo(x + radius * .6, y - radius * .35); ctx.stroke();
  }
  function surface(ctx, from, to, colors) {
    const fill = ctx.createLinearGradient(...from, ...to);
    colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
    return fill;
  }

  class WoodlandRunways {
    constructor(width, height, floorY) {
      this.width = width; this.height = height; this.floorY = floorY;
      this.platforms = null; this.strokes = null; this.strokeCount = -1;
      this.platformLayer = null; this.lineLayer = null;
    }

    layer(existing) {
      const canvas = existing || document.createElement('canvas');
      if (!existing) { canvas.width = this.width * 2; canvas.height = this.height * 2; }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, this.width, this.height);
      return { canvas, ctx };
    }

    drawBeam(ctx, line) {
      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
      const radius = line.radius || 7;
      ctx.save(); ctx.translate(line.x1, line.y1); ctx.rotate(Math.atan2(line.y2 - line.y1, line.x2 - line.x1));
      const points = [{ x: 0, y: 0 }, { x: length, y: 0 }];
      ctx.shadowColor = '#18362f60'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 3;
      path(ctx, points, radius * 2, '#213c37');
      ctx.shadowColor = 'transparent';
      path(ctx, points, radius * 2 - .8, surface(ctx, [0, -radius], [0, radius], ['#d7e2cb', '#7b9690', '#496c66', '#65837b', '#263f3a']));
      path(ctx, points, 1, '#e9edcfb0', 0, -radius + 1.2);
      path(ctx, points, .9, '#1b3738', 0, radius - 1.1);
      path(ctx, points, .65, '#b4c8b480', 0, -1.1);
      for (let x = 15; x < length - 13; x += 17) {
        ctx.strokeStyle = '#d7e0c838'; ctx.lineWidth = .45;
        ctx.beginPath(); ctx.moveTo(x, -radius + 2); ctx.lineTo(x + 4, -radius + 3); ctx.stroke();
      }
      [3, length - 3].forEach(x => {
        ctx.fillStyle = surface(ctx, [0, -radius], [0, radius], ['#f0d99a', '#b19658', '#6b6037']);
        ctx.beginPath(); ctx.roundRect(x - 3.6, -radius + .4, 7.2, radius * 2 - .8, 2); ctx.fill();
        bolt(ctx, x, 0, Math.min(1.75, radius * .28));
      });
      ctx.restore();
    }

    drawPlatforms(ctx, lines) {
      if (this.platforms !== lines) {
        const layer = this.layer(this.platformLayer); this.platformLayer = layer.canvas;
        lines.forEach(line => this.drawBeam(layer.ctx, line));
        this.platforms = lines;
      }
      ctx.drawImage(this.platformLayer, 0, 0, this.width, this.height);
    }

    drawRunway(ctx, points, width, preview = false) {
      if (points.length < 2) return;
      ctx.save(); ctx.globalAlpha = preview ? .85 : 1;
      ctx.shadowColor = '#234a3e65'; ctx.shadowBlur = 3; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      path(ctx, points, width, '#625936');
      ctx.shadowColor = 'transparent';
      path(ctx, points, width - 1.4, '#ae9459');
      path(ctx, points, width - 4, '#dec48b', -.55, -.8);
      path(ctx, points, 1.1, '#fff0be', -1.1, -1.7);
      path(ctx, points, 1.4, '#736b42', .8, 2.6);
      // Small collars describe bent metal without changing the actual collision width.
      let travelled = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
        if (!length) continue;
        const ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
        for (let d = 34 - travelled; d < length; d += 34) {
          const x = a.x + ux * d, y = a.y + uy * d;
          ctx.strokeStyle = '#6b643b90'; ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(x + uy * width * .32, y - ux * width * .32); ctx.lineTo(x - uy * width * .32, y + ux * width * .32); ctx.stroke();
        }
        travelled = (travelled + length) % 34;
      }
      [points[0], points[points.length - 1]].forEach(point => bolt(ctx, point.x, point.y, 1.3));
      ctx.restore();
    }

    drawLines(ctx, strokes, previewPoints, width) {
      if (this.strokes !== strokes || this.strokeCount !== strokes.length) {
        const layer = this.layer(this.lineLayer); this.lineLayer = layer.canvas;
        strokes.forEach(stroke => this.drawRunway(layer.ctx, stroke.points, stroke.width));
        this.strokes = strokes; this.strokeCount = strokes.length;
      }
      ctx.drawImage(this.lineLayer, 0, 0, this.width, this.height);
      if (previewPoints) this.drawRunway(ctx, previewPoints, width, true);
    }

    drawGroundContact(ctx, stone) {
      if (stone.attached) return;
      const height = Math.max(0, this.floorY - stone.y - stone.radius);
      const closeness = Math.max(0, 1 - height / 110);
      if (!closeness) return;
      ctx.save(); ctx.globalAlpha = closeness * .42;
      ctx.translate(stone.x, this.floorY + .5); ctx.scale(1, .22);
      const shadow = ctx.createRadialGradient(0, 0, 1, 0, 0, 23);
      shadow.addColorStop(0, '#233221'); shadow.addColorStop(1, '#23322100');
      disc(ctx, 0, 0, 23, shadow);
      ctx.restore();
    }
  }

  window.WoodlandRunways = WoodlandRunways;
})();
