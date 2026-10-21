import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const context = { window: {} };
runInNewContext(readFileSync(new URL('../public/Games/Many Birds One Stone/physics.js', import.meta.url), 'utf8'), context);
const physics = context.window.WoodlandPhysics;
const floor = { ax: 10, ay: 626, bx: 350, by: 626, radius: 0, kind: 'floor' };
const body = (overrides = {}) => ({ x: 95, y: 260, vx: 0, vy: 0, radius: 12, ...overrides });

function simulate(stone, colliders, seconds = 6, hz = 60) {
  let stableFrames = 0;
  for (let i = 0; i < seconds * hz; i += 1) {
    stone.supported = false; stone.onFloor = false;
    stone.supportMinX = Infinity; stone.supportMaxX = -Infinity;
    const dt = 1 / hz / 3;
    for (let substep = 0; substep < 3; substep += 1) {
      stone.vy = Math.min(780, stone.vy + 980 * dt);
      stone.x += stone.vx * dt; stone.y += stone.vy * dt;
      physics.solve(stone, colliders, dt);
    }
    assert.ok([stone.x, stone.y, stone.vx, stone.vy].every(Number.isFinite));
    stableFrames = physics.stableSupport(stone) && Math.hypot(stone.vx, stone.vy) < 22 ? stableFrames + 1 : 0;
  }
  return { ...stone, stableFrames };
}

test('connected runway motion is independent of sampling density and drawing direction', () => {
  for (const slope of [.025, .07, .15, .35]) {
    const points = Array.from({ length: 81 }, (_, i) => ({ x: 60 + i * 3, y: 300 + i * 3 * slope }));
    const sparse = [points[0], points.at(-1)];
    const reference = simulate(body(), [physics.createStroke(sparse, 5.5), floor]);
    for (const path of [points, points.slice().reverse(), sparse.slice().reverse()]) {
      const result = simulate(body(), [physics.createStroke(path, 5.5), floor]);
      assert.ok(Math.abs(result.x - reference.x) < 1e-8);
      assert.ok(Math.abs(result.y - reference.y) < 1e-8);
    }
  }
});

test('subpixel pointer noise is removed without removing deliberate corners', () => {
  const points = Array.from({ length: 81 }, (_, i) => ({ x: 60 + i * 3, y: 300 + i * .21 + (i === 0 || i === 80 ? 0 : Math.sin(i) * .3) }));
  assert.equal(physics.createStroke(points, 5.5).segments.length, 1);
  const corner = physics.createStroke([{ x: 60, y: 300 }, { x: 150, y: 350 }, { x: 260, y: 380 }], 5.5);
  assert.equal(corner.segments.length, 2);
  const result = simulate(body(), [corner, floor]);
  assert.ok(result.y > 600, 'the ball traverses the joint and falls to the floor');
});

test('a gentle downhill runway keeps the ball awake and moving', () => {
  const ramp = physics.createStroke([{ x: 60, y: 300 }, { x: 300, y: 306 }], 5.5);
  const result = simulate(body(), [ramp]);
  assert.ok(result.x > 180);
  assert.ok(result.vx > 10);
  assert.equal(result.stableFrames, 0);
});

test('flat supports and genuine valleys can settle, while thin rails stay solid', () => {
  const flat = physics.createStroke([{ x: 60, y: 300 }, { x: 300, y: 300 }], 5.5);
  const result = simulate(body({ vx: 30 }), [flat]);
  assert.ok(Math.abs(result.y - 282.5) < .1);
  assert.ok(result.stableFrames > 60);
  const valley = physics.createStroke([{ x: 60, y: 260 }, { x: 180, y: 350 }, { x: 300, y: 260 }], 5.5);
  const trapped = simulate(body({ x: 175, y: 270 }), [valley]);
  assert.ok(trapped.y < 334);
  assert.ok(trapped.stableFrames > 60, 'opposing slopes support a physically trapped ball');
  const fast = simulate(body({ y: 250, vy: 780 }), [flat], .15);
  assert.ok(fast.y < 283, 'maximum-speed descent cannot tunnel through a thin drawn rail');
});

test('capsule endpoint impulses preserve tangential velocity and never add kinetic energy', () => {
  const collider = { ax: 100, ay: 300, bx: 200, by: 300, radius: 5.5, kind: 'drawn' };
  const stone = body({ x: 90, y: 290, vx: 80, vy: 100 });
  const energy = stone.vx ** 2 + stone.vy ** 2;
  const normal = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
  const tangentBefore = stone.vx * -normal.y + stone.vy * normal.x;
  physics.resolve(stone, collider);
  assert.ok(stone.vx ** 2 + stone.vy ** 2 <= energy + 1e-8);
  assert.ok(Math.abs(stone.vx * -normal.y + stone.vy * normal.x - tangentBefore) < 1e-8);
});

test('empty/duplicate samples and exact-center contacts stay finite', () => {
  for (const points of [[], [{ x: 100, y: 300 }, { x: 100, y: 300 }], [{ x: 60, y: 300 }, { x: 300, y: 300 }]]) {
    const stone = body({ x: 100, y: 300, vy: 50 });
    simulate(stone, [physics.createStroke(points, 5.5), floor], .5);
  }
});

test('rolling drag follows elapsed time rather than sample or frame count', () => {
  const flat = physics.createStroke([{ x: 20, y: 300 }, { x: 340, y: 300 }], 5.5);
  const slow = simulate(body({ x: 100, y: 282.49, vx: 80 }), [flat], .5, 60);
  const fast = simulate(body({ x: 100, y: 282.49, vx: 80 }), [flat], .5, 120);
  assert.ok(Math.abs(slow.vx - fast.vx) < .01);
  assert.ok(Math.abs(slow.x - fast.x) < .2);
});
