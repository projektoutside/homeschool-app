(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const PALETTES = [
    { back: '#627f78', light: '#a5b9a2', dark: '#283f3b', chest: '#c77b48', belly: '#e8d7b4', feather: '#4e6863', edge: '#b4bfaa' },
    { back: '#8a8460', light: '#c3bc89', dark: '#403e30', chest: '#c7a55f', belly: '#eee0b8', feather: '#686c51', edge: '#c3c6a0' },
    { back: '#718b99', light: '#b1c3c4', dark: '#30414b', chest: '#ad8363', belly: '#dedaca', feather: '#4f6877', edge: '#b4c5c9' },
  ];
  function ellipse(ctx, x, y, rx, ry, angle, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TAU); ctx.fill();
  }
  function gradient(ctx, x1, y1, x2, y2, colors) {
    const fill = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
    return fill;
  }
  const FEATHER = new Path2D('M0 0 C-2.8 3 -3.3 12 -1.2 21 Q-.2 24 1 21 C3 12 2.7 4 0 0Z');

  class WoodlandBirds {
    constructor({ reducedMotion = false } = {}) { this.reducedMotion = reducedMotion; }

    pose(bird, elapsed) {
      const orbit = elapsed * bird.speed + bird.phase;
      const vx = Math.cos(orbit) * bird.range * bird.speed;
      const vy = Math.cos(elapsed * bird.speed * 1.42 + bird.phase * 1.8) * bird.bobAmp * bird.speed * 1.42;
      const heading = Math.tanh(vx / 14);
      const phase = elapsed * TAU * (3.8 + bird.index * .23) + bird.phase * 2.1;
      const stroke = Math.sin(phase) + .16 * Math.sin(phase * 2);
      return {
        heading,
        bank: this.reducedMotion ? 0 : Math.sin(orbit) * .095,
        pitch: this.reducedMotion ? 0 : Math.atan2(vy, Math.abs(vx) + 35) * .2,
        wing: this.reducedMotion ? -.25 : stroke,
        recovery: this.reducedMotion ? 0 : Math.cos(phase),
        tail: this.reducedMotion ? 0 : Math.sin(phase - .5) * .055,
      };
    }

    wing(ctx, palette, pose, far) {
      const heading = pose.heading;
      const lift = far ? pose.wing * .86 : pose.wing;
      const reach = 22 + (1 - Math.abs(lift)) * 5;
      const tipY = -8 - lift * 29;
      const tipX = (-9 - reach * .35) * heading + (far ? 7 : -3);
      const elbowX = -5 * heading + (far ? 4 : -2);
      const elbowY = -9 - lift * 11;
      ctx.save();
      if (far) ctx.globalAlpha = .86;
      ctx.fillStyle = gradient(ctx, 0, -22, 0, 18, [palette.light, palette.back, palette.dark]);
      ctx.beginPath(); ctx.moveTo(3 * heading, -5);
      ctx.quadraticCurveTo(elbowX + 5, elbowY - 6, tipX, tipY - 3);
      ctx.quadraticCurveTo(tipX - 5, tipY + 7, -10 * heading, 3);
      ctx.quadraticCurveTo(-2, 2, 3 * heading, -5); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = elbowX + (tipX - elbowX) * t;
        const y = elbowY + (tipY - elbowY) * t;
        const length = 11 + t * 8;
        const angle = -.35 * heading + (t - .5) * .75 * heading + lift * heading * .24;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.scale((far ? .82 : 1) * (1.15 - t * .35), (length / 23) * (.86 + pose.recovery * .1));
        ctx.fillStyle = i % 2 ? palette.feather : palette.back; ctx.fill(FEATHER);
        ctx.strokeStyle = palette.edge; ctx.lineWidth = .45; ctx.globalAlpha *= .55; ctx.stroke(FEATHER);
        ctx.strokeStyle = palette.dark; ctx.lineWidth = .45; ctx.globalAlpha *= .6;
        ctx.beginPath(); ctx.moveTo(0, 3); ctx.quadraticCurveTo(.5, 10, .1, 20); ctx.stroke();
        ctx.restore();
      }
      // Short overlapping coverts soften the shoulder above the long primaries.
      for (let i = 0; i < 5; i++) {
        const t = i / 6;
        ellipse(ctx, elbowX + (tipX - elbowX) * t, elbowY + (tipY - elbowY) * t + 2,
          3.1, 5, -.3 * heading, i % 2 ? palette.back : palette.feather);
      }
      ctx.strokeStyle = palette.light; ctx.lineWidth = 1.1; ctx.globalAlpha *= .65;
      ctx.beginPath(); ctx.moveTo(2 * heading, -5); ctx.quadraticCurveTo(elbowX, elbowY - 3, tipX, tipY - 2); ctx.stroke();
      ctx.restore();
    }

    draw(ctx, bird, elapsed) {
      if (!bird.alive) return;
      const palette = PALETTES[bird.index % PALETTES.length];
      const pose = this.pose(bird, elapsed);
      const h = pose.heading;
      ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(pose.bank + pose.pitch * h);
      this.wing(ctx, palette, pose, true);
      // The tail fans through the turn instead of snapping to a mirrored frame.
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.translate(-11 * h, 2); ctx.rotate(Math.PI / 2 * h + (i - 2) * .12 + pose.tail);
        ctx.scale(.82, .84 + Math.abs(i - 2) * .035); ctx.fillStyle = i % 2 ? palette.dark : palette.feather; ctx.fill(FEATHER);
        ctx.strokeStyle = palette.edge; ctx.lineWidth = .4; ctx.stroke(FEATHER); ctx.restore();
      }
      const bodyWidth = 12 + 3 * Math.abs(h);
      ellipse(ctx, 0, 0, bodyWidth, 9.7, -.12 * h, gradient(ctx, -4, -11, 4, 11, [palette.light, palette.back, palette.dark]));
      ellipse(ctx, 4 * h, 3, 10.5, 7.2, -.15 * h, gradient(ctx, 0, -2, 0, 10, [palette.chest, palette.belly]));
      ctx.strokeStyle = palette.belly; ctx.lineWidth = .45; ctx.globalAlpha = .3;
      for (let i = 0; i < 7; i++) {
        const x = -7 + i * 2.2; const y = 4 + Math.sin(i * 1.9) * 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1.5, y + 1.3, x + 3, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Folded feet stay tucked beneath the belly during flight.
      ctx.strokeStyle = '#66533c'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2 * h, 8); ctx.lineTo(-6 * h, 11); ctx.lineTo(-9 * h, 10); ctx.stroke();
      this.wing(ctx, palette, pose, false);
      const headX = 11 * h;
      ellipse(ctx, headX, -5.5, 7.6, 6.9, -.1 * h, gradient(ctx, headX - 2, -13, headX + 2, 1, [palette.light, palette.back, palette.dark]));
      ellipse(ctx, headX + 2 * h, -2, 5.3, 4.1, 0, palette.chest);
      ctx.fillStyle = '#423f31'; ctx.beginPath(); ctx.moveTo(headX + 6 * h, -5); ctx.lineTo(headX + 14 * h, -2.7); ctx.lineTo(headX + 6 * h, -1.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d5c99e'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(headX + 6 * h, -4.7); ctx.lineTo(headX + 13 * h, -2.8); ctx.stroke();
      const eyeX = headX + 3.2 * h;
      ellipse(ctx, eyeX, -6.6, 2.1, 2.2, 0, '#b8b69b');
      ellipse(ctx, eyeX, -6.6, 1.65, 1.8, 0, '#142b28');
      ellipse(ctx, eyeX - .45, -7.2, .55, .6, 0, '#fff5d6');
      ctx.strokeStyle = palette.light; ctx.lineWidth = .65; ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.moveTo(headX - 3 * h, -10); ctx.quadraticCurveTo(headX + 1 * h, -12, headX + 5 * h, -9); ctx.stroke();
      ctx.restore();
    }
  }
  window.WoodlandBirds = WoodlandBirds;
})();
