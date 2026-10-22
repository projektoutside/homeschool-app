(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const steel = ['#243b3b', '#627778', '#d3e1d8', '#839694', '#334b4b'];
  const brass = ['#655027', '#bc9851', '#f1d99b', '#b58b42', '#695027'];
  function gradient(ctx, x1, y1, x2, y2, colors) {
    const fill = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((color, index) => fill.addColorStop(index / (colors.length - 1), color));
    return fill;
  }
  function rounded(ctx, x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  }
  function circle(ctx, x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  function bolt(ctx, x, y, radius = 1.5) {
    circle(ctx, x + .3, y + .5, radius + .6, '#1e3433');
    circle(ctx, x, y, radius, '#c6d2c5');
    ctx.strokeStyle = '#556b65'; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(x - radius * .55, y + radius * .4); ctx.lineTo(x + radius * .55, y - radius * .4); ctx.stroke();
  }

  class WoodlandDropMechanism {
    constructor({ width = 360, radius = 12, reducedMotion = false } = {}) {
      this.width = width;
      this.radius = radius;
      this.reducedMotion = reducedMotion;
      this.rail = null;
      this.stoneTexture = null;
      this.reset(width / 2);
    }

    reset(x) {
      this.x = x;
      this.lastX = x;
      this.angle = 0;
      this.angularVelocity = 0;
      this.wheelAngle = 0;
      this.releaseAge = null;
      this.open = 0;
      this.recoil = 0;
    }

    release() {
      if (this.releaseAge !== null) return;
      this.releaseAge = 0;
      if (this.reducedMotion) this.open = 1;
    }

    update(dt, x) {
      // Fixed-step damped pendulum: movement creates inertia, rest settles completely.
      const step = clamp(dt, 0, 1 / 30);
      const delta = x - this.lastX;
      this.x = x;
      this.lastX = x;
      this.wheelAngle += delta / 5.2;
      if (this.reducedMotion) {
        this.angle = 0;
        this.angularVelocity = 0;
      } else {
        this.angularVelocity = clamp(this.angularVelocity + delta * .045, -2.2, 2.2);
        this.angularVelocity += (-72 * this.angle - 9 * this.angularVelocity) * step;
        this.angle = clamp(this.angle + this.angularVelocity * step, -.18, .18);
      }
      if (this.releaseAge !== null) {
        this.releaseAge += step;
        const t = clamp(this.releaseAge / .18, 0, 1);
        this.open = this.reducedMotion ? 1 : 1 - Math.pow(1 - t, 3);
        this.recoil = this.reducedMotion ? 0 : -Math.sin(this.releaseAge * 24) * Math.exp(-this.releaseAge * 9) * 1.8;
      }
    }

    pose() {
      return {
        x: this.x - Math.sin(this.angle) * 49,
        y: 33,
        carriageX: this.x,
        railY: 17,
        pivotY: 43 + this.recoil,
        stoneY: 43 + this.recoil + Math.cos(this.angle) * 49,
        angle: this.angle,
        open: this.open,
      };
    }

    describe() {
      const pose = this.pose();
      return { carriageX: +this.x.toFixed(2), stoneX: +pose.x.toFixed(2), stoneY: +pose.stoneY.toFixed(2), swing: +this.angle.toFixed(4), jawOpen: +this.open.toFixed(3), releaseAge: this.releaseAge === null ? null : +this.releaseAge.toFixed(3) };
    }

    prepareArtwork() {
      if (this.rail) return;
      this.rail = document.createElement('canvas');
      this.rail.width = this.width * 3; this.rail.height = 120 * 3;
      const ctx = this.rail.getContext('2d'); ctx.scale(3, 3);
      // Fixed gantry: cast shadow, extruded beam, machined running surface, end stops.
      ctx.shadowColor = '#173b3b50'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 4;
      rounded(ctx, 23, 11, this.width - 46, 14, 3, gradient(ctx, 0, 11, 0, 25, steel));
      ctx.shadowColor = 'transparent';
      rounded(ctx, 25, 11, this.width - 50, 2, 1, '#e4e9ce');
      rounded(ctx, 25, 22, this.width - 50, 3, 1, '#203c3a');
      rounded(ctx, 31, 16, this.width - 62, 3, 1, '#1b3233');
      rounded(ctx, 31, 16, this.width - 62, .7, .3, '#cbd8cb');
      for (let x = 36; x < this.width - 32; x += 9) {
        ctx.fillStyle = '#dbe3cf'; ctx.globalAlpha = x % 3 ? .35 : .5;
        ctx.fillRect(x, 23, 1.3, 1.5);
      }
      ctx.globalAlpha = 1;
      [24, this.width - 24].forEach((x) => {
        rounded(ctx, x - 7, 6, 14, 24, 3, gradient(ctx, x - 7, 0, x + 7, 0, brass));
        rounded(ctx, x - 9, 17, 3, 10, 1, '#2a4240');
        rounded(ctx, x + 6, 17, 3, 10, 1, '#2a4240');
        bolt(ctx, x, 10, 1.7); bolt(ctx, x, 25, 1.7);
      });

      this.stoneTexture = document.createElement('canvas');
      this.stoneTexture.width = this.stoneTexture.height = 96;
      const texture = this.stoneTexture.getContext('2d');
      let seed = 301;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 480; i++) {
        const x = random() * 96, y = random() * 96;
        circle(texture, x, y, .25 + random() * 1.1, i % 3 ? '#553b2360' : '#fff0ba80');
      }
      texture.strokeStyle = '#67482550'; texture.lineWidth = .7;
      texture.beginPath(); texture.moveTo(14, 35); texture.bezierCurveTo(32, 24, 39, 46, 62, 41); texture.bezierCurveTo(71, 39, 73, 23, 87, 29); texture.stroke();
      texture.strokeStyle = '#ffedb750'; texture.lineWidth = .6;
      texture.beginPath(); texture.moveTo(14, 34); texture.bezierCurveTo(32, 23, 39, 45, 62, 40); texture.stroke();
    }

    drawWheel(ctx, x, y) {
      circle(ctx, x + .4, y + .8, 6.2, '#142f30');
      circle(ctx, x, y, 5.3, gradient(ctx, x - 5, y - 5, x + 5, y + 5, steel));
      circle(ctx, x, y, 3.6, '#283f3f');
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.wheelAngle);
      ctx.strokeStyle = '#a6b9ac'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(1.3, 0); ctx.lineTo(3.5, 0); ctx.stroke(); }
      ctx.restore(); bolt(ctx, x, y, 1.3);
    }

    drawBehind(ctx) {
      this.prepareArtwork();
      ctx.save();
      ctx.drawImage(this.rail, 0, 0, this.width, 120);
      ctx.translate(this.x, 0);
      // Trolley wheels ride the beam; their rotation follows horizontal travel.
      [-23, 23].forEach(x => this.drawWheel(ctx, x, 20));
      ctx.shadowColor = '#153b3b65'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 3;
      rounded(ctx, -34, 24, 68, 19, 4, gradient(ctx, 0, 24, 0, 43, brass));
      ctx.shadowColor = 'transparent';
      rounded(ctx, -31, 25.5, 62, 1.2, .5, '#f8e3b0');
      rounded(ctx, -22, 31, 44, 9, 2, '#233e3d');
      rounded(ctx, -20, 32, 40, 2, .7, '#6c8077');
      for (let i = -14; i <= 14; i += 4) rounded(ctx, i, 35, 1.2, 3, .5, '#a98d50');
      [-28, 28].forEach(x => bolt(ctx, x, 33, 1.7));
      // The center drum and cable are attached to the moving load, rather than floating.
      circle(ctx, 0, 43, 6, '#223d3c');
      circle(ctx, 0, 42, 4.7, gradient(ctx, -4, 38, 4, 46, brass));
      bolt(ctx, 0, 42, 1.4);
      ctx.translate(0, 43 + this.recoil); ctx.rotate(this.angle);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#183a39'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 20); ctx.stroke();
      ctx.strokeStyle = '#d2d9c6'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-.6, 1); ctx.lineTo(-.6, 20); ctx.stroke();
      ctx.strokeStyle = '#5b736b'; ctx.lineWidth = .7;
      for (let y = 2; y < 19; y += 2.3) { ctx.beginPath(); ctx.moveTo(-1.1, y); ctx.lineTo(1.1, y + 1.2); ctx.stroke(); }
      rounded(ctx, -4, 17, 8, 5, 1, gradient(ctx, -4, 0, 4, 0, brass));
      ctx.shadowColor = '#1f3b3b55'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
      rounded(ctx, -16, 20, 32, 13, 4, gradient(ctx, 0, 20, 0, 33, steel));
      ctx.shadowColor = 'transparent';
      rounded(ctx, -12, 21, 24, 1, .4, '#e2e6c6');
      rounded(ctx, -3, 22, 6, 8, 1, gradient(ctx, -3, 0, 3, 0, brass));
      bolt(ctx, -11, 27, 2); bolt(ctx, 11, 27, 2);
      this.drawJaw(ctx, -1, false); this.drawJaw(ctx, 1, false);
      ctx.restore();
    }

    drawJaw(ctx, side, front) {
      ctx.save(); ctx.translate(side * (11 + (this.radius - 12) * .8), 28); ctx.rotate(-side * this.open * .72); ctx.scale(side, 1);
      // Forged finger with bevelled edges and a rubber contact pad below the stone's equator.
      ctx.beginPath();
      ctx.moveTo(-2, -1); ctx.bezierCurveTo(7, 0, 13, 10, 13, 17);
      ctx.bezierCurveTo(13, 23, 7, 30, -2, 31);
      ctx.lineTo(-3, 27); ctx.bezierCurveTo(3, 26, 8, 21, 8, 17);
      ctx.bezierCurveTo(8, 11, 4, 5, -2, 4); ctx.closePath();
      if (!front) {
        ctx.shadowColor = '#12333070'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
        ctx.fillStyle = gradient(ctx, -3, 0, 13, 0, steel); ctx.fill();
      } else {
        ctx.strokeStyle = '#e3e8cc'; ctx.lineWidth = .65; ctx.stroke();
        rounded(ctx, -3, 26, 7, 5, 1.5, '#253932');
        ctx.strokeStyle = '#889887'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(-1, 27); ctx.lineTo(3, 27); ctx.stroke();
      }
      ctx.restore();
    }

    drawFront(ctx) {
      ctx.save(); ctx.translate(this.x, 43 + this.recoil); ctx.rotate(this.angle);
      this.drawJaw(ctx, -1, true); this.drawJaw(ctx, 1, true);
      ctx.restore();
    }

    drawStone(ctx, stone) {
      this.prepareArtwork();
      const r = stone.radius;
      ctx.save(); ctx.translate(stone.x, stone.y);
      const shade = ctx.createRadialGradient(-r * .37, -r * .48, .3, r * .16, r * .19, r * 1.13);
      const colors = stone.finish === 'steel' ? ['#f0fbff', '#cbdfe7', '#7a9ba5', '#46616c', '#203b43']
        : stone.finish === 'jade' ? ['#daffd1', '#9adba4', '#459a71', '#236147', '#153e35']
        : ['#ffedb4', '#e7c77d', '#bd9450', '#806538', '#354a39'];
      [0, .22, .52, .78, 1].forEach((stop, index) => shade.addColorStop(stop, colors[index]));
      circle(ctx, 0, 0, r, shade);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - .15, 0, TAU); ctx.clip();
      ctx.rotate(stone.rotation || 0);
      ctx.drawImage(this.stoneTexture, -r, -r, r * 2, r * 2);
      ctx.restore();
      const bounce = ctx.createLinearGradient(0, r * .4, 0, r);
      bounce.addColorStop(0, '#8ad2a500'); bounce.addColorStop(1, '#99cc9370');
      circle(ctx, 0, 0, r - .25, bounce);
      ctx.strokeStyle = '#f7e8b3b0'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.arc(0, 0, r - .6, -2.9, -1.2); ctx.stroke();
      if (stone.attached) {
        // Contact shadows anchor the load between the two gripping pads.
        ctx.strokeStyle = '#142d2b90'; ctx.lineWidth = 2.1;
        ctx.beginPath(); ctx.arc(0, 0, r - .7, .45, .9); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r - .7, 2.24, 2.7); ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.WoodlandDropMechanism = WoodlandDropMechanism;
})();
