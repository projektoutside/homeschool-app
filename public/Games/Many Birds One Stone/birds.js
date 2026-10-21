(() => {
  'use strict';

  const FRAME_W = 198, FRAME_H = 148, PADDING = 32;
  const CYCLE = [0, 15, 13, 12, 10, 9, 5, 6, 7, 3, 2, 8, 1, 4, 1, 8, 2, 3, 7, 6, 9, 10, 12, 13, 15];
  // Chest anchors measured from the unchanged original sprite sheet.
  const ANCHORS = [[134.3, 97.73], [134.83, 69.97], [140.65, 73.38], [134.97, 78.45],
    [141.95, 73.58], [139.97, 82.36], [140.87, 81.66], [137.54, 83.67],
    [144, 74.95], [140.23, 82.81], [144.65, 81.67], [143.53, 80.64],
    [142.57, 82.77], [141.16, 83.51], [141.02, 81.95], [139.74, 86.44]];
  const FILTERS = ['saturate(0.96) brightness(0.96) contrast(1.08)',
    'hue-rotate(-10deg) saturate(0.88) brightness(0.92) contrast(1.12)',
    'hue-rotate(6deg) saturate(0.8) brightness(0.9) contrast(1.08)'];

  class WoodlandBirds {
    constructor({ reducedMotion = false } = {}) {
      this.reducedMotion = reducedMotion;
      this.loaded = false; this.failed = false; this.strips = []; this.frames = new Map();
      this.image = new Image(); this.image.decoding = 'async';
      this.ready = new Promise(resolve => {
        this.image.addEventListener('load', async () => {
          if (this.image.naturalWidth !== FRAME_W * 16 || this.image.naturalHeight !== FRAME_H) {
            this.failed = true; resolve(false); return;
          }
          try {
            await document.fonts.ready;
            // Safari can replay a filtered Canvas's entire display list when it is drawn again.
            this.strips = await Promise.all(FILTERS.map(filter => {
              const canvas = document.createElement('canvas');
              canvas.width = this.image.naturalWidth; canvas.height = FRAME_H;
              const ctx = canvas.getContext('2d'); ctx.filter = filter; ctx.drawImage(this.image, 0, 0);
              return this.decodeCanvas(canvas);
            }));
            for (let palette = 0; palette < FILTERS.length; palette += 1) {
              const poses = new Map();
              for (let i = 0; i < (this.reducedMotion ? 1 : CYCLE.length); i += 1) {
                for (let step = 0; step < 4; step += 1) {
                  const pose = this.reducedMotion ? { frame: 3, nextFrame: 3, blend: 0 }
                    : { frame: CYCLE[i], nextFrame: CYCLE[(i + 1) % CYCLE.length], blend: step / 4 };
                  const key = this.textureKey(palette, pose).key;
                  poses.set(key, pose);
                }
              }
              const entries = [...poses];
              // Bound decoding work so preparing sprites cannot flood Safari's resource loader.
              for (let start = 0; start < entries.length; start += 4) {
                const batch = await Promise.all(entries.slice(start, start + 4).map(async ([key, pose]) => {
                  const canvas = document.createElement('canvas');
                  canvas.width = FRAME_W + PADDING * 2; canvas.height = FRAME_H + PADDING * 2;
                  this.paintFrame(canvas.getContext('2d'), palette, pose);
                  return [key, await this.decodeCanvas(canvas, true)];
                }));
                for (const [key, image] of batch) this.frames.set(key, image);
              }
            }
            this.strips = [];
            this.loaded = true; resolve(true);
          } catch {
            this.strips = []; this.frames.clear(); this.failed = true; resolve(false);
          }
        });
        this.image.addEventListener('error', () => { this.failed = true; resolve(false); });
      });
      this.image.src = './assets/birds/EnemyBird16-strip.png';
    }

    describe() {
      return { source: 'EnemyBird16-strip.png', loaded: this.loaded, failed: this.failed,
        frames: 16, cycleLength: CYCLE.length, frameRate: 42, interpolationSteps: 4, interpolated: true,
        decodedTextures: this.frames.size };
    }

    async decodeCanvas(canvas, smallFrame = false) {
      // toBlob can wait for idle time indefinitely during an active animation on mobile Chromium.
      const blob = smallFrame ? null : await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!smallFrame && !blob) throw new Error('Bird texture encoding failed');
      const url = smallFrame ? canvas.toDataURL('image/png') : URL.createObjectURL(blob);
      try {
        const image = new Image(); image.decoding = 'async'; image.src = url;
        await image.decode();
        return image;
      } finally {
        if (!smallFrame) URL.revokeObjectURL(url);
        canvas.width = 1; canvas.height = 1;
      }
    }

    pose(bird, elapsed) {
      const orbit = elapsed * bird.speed + bird.phase;
      const vx = Math.cos(orbit) * bird.range * bird.speed;
      const vy = Math.cos(elapsed * bird.speed * 1.42 + bird.phase * 1.8) * bird.bobAmp * bird.speed * 1.42;
      const position = ((elapsed * 42 + bird.index * 2.75) % CYCLE.length + CYCLE.length) % CYCLE.length;
      const phase = position / CYCLE.length * Math.PI * 2;
      const index = Math.floor(position);
      return {
        heading: Math.tanh(vx / 14),
        bank: this.reducedMotion ? 0 : Math.sin(orbit) * .035,
        pitch: this.reducedMotion ? 0 : Math.atan2(vy, Math.abs(vx) + 35) * .08,
        wing: this.reducedMotion ? 0 : Math.sin(phase),
        recovery: this.reducedMotion ? 0 : Math.cos(phase),
        tail: 0,
        frame: this.reducedMotion ? 3 : CYCLE[index],
        nextFrame: this.reducedMotion ? 3 : CYCLE[(index + 1) % CYCLE.length],
        blend: this.reducedMotion ? 0 : position - index,
      };
    }

    textureKey(index, pose) {
      let first = pose.frame, second = pose.nextFrame, blend = Math.round(pose.blend * 4) / 4;
      if (blend === 1) { first = second; blend = 0; }
      if (blend === 0) second = first;
      if (second < first) { [first, second] = [second, first]; blend = 1 - blend; }
      const palette = index % FILTERS.length;
      const key = `${palette}:${first}:${second}:${blend}`;
      return { palette, first, second, blend, key };
    }

    frameTexture(index, pose) {
      return this.frames.get(this.textureKey(index, pose).key);
    }

    paintFrame(paint, index, pose) {
      const { palette, first, second, blend } = this.textureKey(index, pose);
      paint.save();
      const frame = (number, alpha) => {
        const anchor = ANCHORS[number]; paint.globalAlpha = alpha;
        paint.drawImage(this.strips[palette] || this.image, number * FRAME_W, 0, FRAME_W, FRAME_H,
          PADDING + 140 - anchor[0], PADDING + 82 - anchor[1], FRAME_W, FRAME_H);
      };
      frame(first, 1 - blend);
      // Premultiplied addition preserves the shared torso's opacity.
      if (blend > 0) { paint.globalCompositeOperation = 'lighter'; frame(second, blend); }
      paint.restore();
    }

    drawFallback(ctx, bird) {
      ctx.fillStyle = bird.tint[1]; ctx.beginPath(); ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bird.tint[0]; ctx.beginPath(); ctx.ellipse(-4, -4, 9, 8, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = bird.tint[1]; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.quadraticCurveTo(-16, -14, -22, -2); ctx.stroke();
      ctx.fillStyle = '#f7e4a2'; ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(22, 4); ctx.lineTo(13, 8); ctx.closePath(); ctx.fill();
    }

    draw(ctx, bird, elapsed) {
      if (!bird.alive) return;
      const pose = this.pose(bird, elapsed);
      ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(pose.bank + pose.pitch * Math.sign(pose.heading));
      if (pose.heading < 0) ctx.scale(-1, 1);
      const texture = this.frameTexture(bird.index, pose);
      const scale = 60 / FRAME_H;
      if (texture) {
        ctx.drawImage(texture, -FRAME_W * scale * .52 - PADDING * scale,
          -60 * .76 - PADDING * scale, texture.width * scale, texture.height * scale);
      } else if (this.image.complete && this.image.naturalWidth === FRAME_W * 16) {
        const anchor = ANCHORS[pose.frame];
        ctx.drawImage(this.image, pose.frame * FRAME_W, 0, FRAME_W, FRAME_H,
          (140 - anchor[0] - FRAME_W * .52) * scale, (82 - anchor[1]) * scale - 60 * .76,
          FRAME_W * scale, 60);
      } else this.drawFallback(ctx, bird);
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `${bird.tint[0]}2e`;
      ctx.beginPath(); ctx.ellipse(-8, -2, 12, 9, -.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  window.WoodlandBirds = WoodlandBirds;
})();
