(() => {
  'use strict';
  const STEP = 1 / 60;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dropCache = new Map();
  function dropPose(solution, reducedMotion = false) {
    const key = `${solution.aim}:${solution.dropFrame}:${reducedMotion}`;
    if (!dropCache.has(key)) {
      const claw = new WoodlandDropMechanism({ reducedMotion });
      for (let frame = 0; frame < solution.dropFrame; frame++) claw.update(STEP, solution.aim);
      if (dropCache.size > 4000) dropCache.clear();
      dropCache.set(key, claw.pose());
    }
    return dropCache.get(key);
  }
  const world = [
    { ax: 10, ay: 96, bx: 10, by: 664, radius: 10, kind: 'wall' },
    { ax: 350, ay: 96, bx: 350, by: 664, radius: 10, kind: 'wall' },
    { ax: 10, ay: 626, bx: 350, by: 626, radius: 0, kind: 'floor' },
  ];
  function birdPositions(birds, elapsed) {
    birds.forEach(bird => {
      if (!bird.alive) return;
      bird.prevX = bird.x;
      bird.x = clamp(bird.baseX + Math.sin(elapsed * bird.speed + bird.phase) * bird.range, 42, 318);
      bird.facing = Math.cos(elapsed * bird.speed + bird.phase) >= 0 ? 1 : -1;
      bird.y = bird.laneY + Math.sin(elapsed * bird.speed * 1.42 + bird.phase * 1.8) * bird.bobAmp;
    });
  }
  function birdsFor(map) {
    return map.birds.map((p, index) => ({ index, baseX: p.x, laneY: p.y, x: p.x, y: p.y, range: 6, speed: 1.25 + index * .1, phase: 0, bobAmp: 2, bodyRadius: 11, alive: true }));
  }
  function hit(stone, bird) { bird.alive = false; stone.vx *= .95; stone.vy = Math.min(stone.vy, 180); }
  // Used by both live VS play and the checker, including all three collision substeps.
  function integrate(stone, colliders, birds, dt, onHit = bird => hit(stone, bird), onContacts = null) {
    stone.onFloor = false; stone.supported = false; stone.supportMinX = Infinity; stone.supportMaxX = -Infinity;
    const sub = dt / 3;
    for (let i = 0; i < 3; i++) {
      stone.vy += 980 * sub; stone.vx = clamp(stone.vx, -540, 540); stone.vy = clamp(stone.vy, -200, 780);
      stone.x += stone.vx * sub; stone.y += stone.vy * sub;
      const contacts = WoodlandPhysics.solve(stone, colliders, sub);
      if (onContacts) onContacts(contacts);
      for (const bird of birds) if (bird.alive && Math.hypot(stone.x - bird.x, stone.y - bird.y) <= stone.radius + bird.bodyRadius + 3) onHit(bird);
      if (stone.y > 696 || stone.x < -50 || stone.x > 410) return 'escaped';
    }
    return null;
  }
  function ink(strokes) { return strokes.reduce((total, points) => total + points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0), 0); }
  function validSolution(config, s) {
    return s && Number.isFinite(s.aim) && s.aim >= 54 && s.aim <= 306 && Number.isInteger(s.dropFrame) && s.dropFrame >= 48 && s.dropFrame <= 900
      && Array.isArray(s.strokes) && s.strokes.length <= 12 && s.strokes.every(stroke => Array.isArray(stroke) && stroke.length >= 2 && stroke.length <= 150 && stroke.every((p, i) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 22 && p.x <= 338 && p.y >= 110 && p.y <= 522 && (!i || Math.hypot(p.x - stroke[i-1].x, p.y - stroke[i-1].y) >= 4)))
      && ink(s.strokes) <= config.solverInk + .01;
  }
  function collidersFor(map, strokes) {
    return [...world.map(c => ({ ...c })), ...map.strokes.map(points => WoodlandPhysics.createStroke(points, 7)), ...strokes.map(points => WoodlandPhysics.createStroke(points, 5.5))];
  }
  function replay(map, config, solution, prepared = null, trace = false) {
    if (!validSolution(config, solution)) return { clear: false };
    const birds = birdsFor(map), colliders = prepared || collidersFor(map, solution.strokes);
    const pose = dropPose(solution, Boolean(config.reducedMotion));
    const stone = { x: pose.x, y: pose.stoneY, vx: 0, vy: 14, radius: 12, sleepMs: 0, supported: false, onFloor: false };
    const path = [];
    const maxFrames = Math.min(1200, config.seconds ? config.seconds * 60 - solution.dropFrame : 1200);
    for (let frame = 1; frame <= maxFrames; frame++) {
      birdPositions(birds, (solution.dropFrame + frame) * STEP);
      if (integrate(stone, colliders, birds, STEP) === 'escaped') break;
      if (trace && frame % 4 === 0) path.push({ x: stone.x, y: stone.y });
      if (birds.every(b => !b.alive)) return { clear: true, hits: birds.length, elapsedMs: (solution.dropFrame + frame) * 1000 / 60, inkUsed: ink(solution.strokes), flightFrames: frame };
      if (WoodlandPhysics.keepRolling(stone, colliders, STEP) === 'trapped') break;
      if (stone.onFloor && Math.hypot(stone.vx, stone.vy) < 22 && WoodlandPhysics.stableSupport(stone)) stone.sleepMs += STEP * 1000;
      else stone.sleepMs = 0;
      if (stone.sleepMs >= 420) break;
    }
    return { clear: false, hits: birds.filter(b => !b.alive).length, ...(trace ? { path, remaining: birds.filter(b => b.alive).map(b => ({ x: b.baseX, y: b.laneY })) } : {}) };
  }
  window.WoodlandVersusSimulation = { revision: 'vs-simulation-v1', STEP, birdPositions, birdsFor, integrate, ink, validSolution, collidersFor, replay };
})();
