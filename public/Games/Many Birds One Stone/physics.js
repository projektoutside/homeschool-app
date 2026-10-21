(() => {
  'use strict';

  function nearestSegment(segment, x, y) {
    const dx = segment.bx - segment.ax, dy = segment.by - segment.ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((x - segment.ax) * dx + (y - segment.ay) * dy) / lengthSquared)) : 0;
    const length = Math.sqrt(lengthSquared) || 1;
    return { x: segment.ax + dx * t, y: segment.ay + dy * t, tx: dx / length, ty: dy / length };
  }

  function simplify(points, tolerance = .5) {
    if (points.length < 3) return points.slice();
    const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]];
    while (stack.length) {
      const [start, end] = stack.pop();
      const a = points[start], b = points[end];
      let farthest = -1, maxDistance = tolerance * tolerance;
      for (let i = start + 1; i < end; i += 1) {
        const p = nearestSegment({ ax: a.x, ay: a.y, bx: b.x, by: b.y }, points[i].x, points[i].y);
        const distance = (p.x - points[i].x) ** 2 + (p.y - points[i].y) ** 2;
        if (distance > maxDistance) { maxDistance = distance; farthest = i; }
      }
      if (farthest !== -1) { keep.add(farthest); stack.push([start, farthest], [farthest, end]); }
    }
    return [...keep].sort((a, b) => a - b).map(index => points[index]);
  }

  function createStroke(points, radius) {
    // Canonical direction makes identical forward/backward gestures solve identically.
    const first = points[0], last = points[points.length - 1];
    const canonical = first && last && (first.x > last.x || (first.x === last.x && first.y > last.y))
      ? points.slice().reverse() : points;
    const path = simplify(canonical), segments = [];
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1], b = path[i];
      if (Math.hypot(a.x - b.x, a.y - b.y) < .001) continue;
      segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
    return { segments, radius, kind: 'drawn' };
  }

  function nearest(collider, x, y) {
    let closest = null, best = Infinity;
    for (const segment of collider.segments || [collider]) {
      const point = nearestSegment(segment, x, y);
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (distance < best) { best = distance; closest = point; }
    }
    return closest;
  }

  function resolve(stone, collider) {
    const point = nearest(collider, stone.x, stone.y);
    if (!point) return null;
    let dx = stone.x - point.x, dy = stone.y - point.y, distance = Math.hypot(dx, dy);
    const separation = stone.radius + collider.radius;
    if (distance > separation + .15) return null;
    if (distance < .0001) {
      dx = -point.ty; dy = point.tx;
      if (stone.vx * dx + stone.vy * dy > 0) { dx = -dx; dy = -dy; }
      distance = 1;
    }
    const nx = dx / distance, ny = dy / distance;
    const normalVelocity = stone.vx * nx + stone.vy * ny;
    if (distance < separation) {
      stone.x += nx * (separation - distance + .01);
      stone.y += ny * (separation - distance + .01);
      if (normalVelocity < 0) {
        const restitution = normalVelocity > -60 ? 0 : collider.kind === 'drawn' ? .32 : collider.kind === 'floor' ? .16 : .24;
        // An impulse along the radial normal preserves the true orthogonal tangent at caps/joints.
        stone.vx -= nx * normalVelocity * (1 + restitution);
        stone.vy -= ny * normalVelocity * (1 + restitution);
      }
    }
    return { nx, ny, normalVelocity, kind: collider.kind };
  }

  function solve(stone, colliders, dt) {
    const contacts = [];
    let support = null;
    // One nearest feature per connected stroke avoids repeated impulses at every sampled joint.
    for (let pass = 0; pass < 3; pass += 1) {
      for (const collider of colliders) {
        const contact = resolve(stone, collider);
        if (!contact) continue;
        contacts.push(contact);
        if (contact.ny <= .1) {
          stone.supportMinX = Math.min(stone.supportMinX, contact.nx);
          stone.supportMaxX = Math.max(stone.supportMaxX, contact.nx);
        }
        if (contact.ny < -.35 && contact.kind !== 'wall') {
          stone.supported = true;
          if (contact.kind === 'floor') stone.onFloor = true;
          if (!support || contact.ny < support.ny) support = contact;
        }
      }
    }
    if (support) {
      const tx = -support.ny, ty = support.nx;
      const speed = stone.vx * tx + stone.vy * ty;
      const drag = support.kind === 'floor' ? 14 : support.kind === 'drawn' ? 1.4 : 2.5;
      const reduction = speed * (1 - Math.exp(-drag * dt));
      stone.vx -= tx * reduction; stone.vy -= ty * reduction;
    }
    return contacts;
  }

  function stableSupport(stone) {
    return stone.supported && stone.supportMinX <= .01 && stone.supportMaxX >= -.01;
  }

  window.WoodlandPhysics = { createStroke, nearest, resolve, solve, stableSupport };
})();
