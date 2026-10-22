(() => {
  'use strict';
  const S = window.WoodlandVersusSimulation;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const point = (x, y) => ({ x: clamp(x, 22, 338), y: clamp(y, 110, 522) });
  function* permutations(values) {
    if (values.length <= 1) { yield values; return; }
    for (let i = 0; i < values.length; i++) for (const rest of permutations(values.filter((_, j) => j !== i))) yield [values[i], ...rest];
  }
  function* candidates(map, config) {
    const ordered = map.birds.slice().sort((a, b) => a.y - b.y);
    const aims = [...new Set([...ordered.flatMap(p => [-12, 0, 12].map(dx => clamp(p.x + dx, 54, 306))), 180, ...Array.from({ length: 15 }, (_, i) => 54 + i * 18)])];
    for (const delay of [90, 150, 210]) for (const aim of aims) yield { aim, dropFrame: delay, strokes: [] };
    for (const width of [80, 120, 160]) for (const slope of [.25, .5, .8, 1.2]) for (const offset of [22, 32, 12]) {
      const strokes = ordered.map((p, i) => {
        const direction = Math.sign((ordered[i + 1]?.x ?? p.x + 30) - p.x) || 1;
        return [point(p.x - direction * width * .3, p.y + offset - slope * width * .3), point(p.x + direction * width * .7, p.y + offset + slope * width * .7)];
      });
      if (S.ink(strokes) > config.solverInk) continue;
      for (const shift of [0, -16, 16]) yield { aim: clamp(ordered[0].x + shift, 54, 306), dropFrame: Math.ceil((S.ink(strokes) / 120 + 1.2) * 60), strokes };
    }
    for (const order of permutations(ordered)) {
      for (const offset of [22, 32, 12, 42, -12]) for (const side of [-1, 1]) {
        const targets = order.map((p, i) => point(p.x + (i ? 0 : side * 6), p.y + offset));
        if (targets.length > 1 && S.ink([targets]) <= config.solverInk) {
          const base = Math.max(120, Math.ceil((S.ink([targets]) / 120 + 1.2) * 60));
          for (const shift of [0, -16, 16, -32, 32]) for (const delay of [0, 42]) yield { aim: clamp(targets[0].x + shift, 54, 306), dropFrame: base + delay, strokes: [targets] };
        }
        for (const lead of [0, 44, 80]) {
          const first = targets[0], last = targets.at(-1);
          const path = [point(first.x + side * lead, Math.min(first.y - 35, ordered[0].y - 32)), ...targets,
            point(last.x - side * 45, last.y + 30)];
          const strokes = [path];
          if (S.ink(strokes) > config.solverInk) continue;
          const start = clamp(path[0].x, 54, 306), base = Math.max(120, Math.ceil((S.ink(strokes) / 120 + 1.2) * 60));
          for (const shift of [0, -16, 16, -32, 32]) for (const delay of [0, 42]) yield { aim: clamp(start + shift, 54, 306), dropFrame: base + delay, strokes };
        }
      }
    }
    // Independent shelves also cover separated birds where one continuous rail makes a valley.
    for (const width of [70, 110, 160]) for (const slope of [-.35, .35, -.15, .15]) {
      const strokes = ordered.map(p => [point(p.x - width / 2, p.y + 24 - slope * width / 2), point(p.x + width / 2, p.y + 24 + slope * width / 2)]);
      if (S.ink(strokes) > config.solverInk) continue;
      for (const aim of aims) yield { aim, dropFrame: 300, strokes };
    }
  }
  function createSearch(map, config) {
    const iterator = candidates(map, config), pending = [], seeds = new Set(), tried = new Set(); let attempts = 0, done = !reachable(map);
    return { next(budgetMs = 8) {
      const start = performance.now();
      while (!done && performance.now() - start < budgetMs) {
        const candidate = pending.length ? { value: pending.shift(), done: false } : iterator.next();
        if (candidate.done) { done = true; break; }
        const key = JSON.stringify(candidate.value);
        if (tried.has(key)) continue;
        tried.add(key);
        attempts++;
        const result = S.replay(map, config, candidate.value);
        if (result.clear && S.replay(map, { ...config, reducedMotion: true }, candidate.value).clear) { done = true; return { done, attempts, solution: candidate.value, result }; }
        const seedKey = `${result.hits}:${candidate.value.strokes.length}:${Math.round(candidate.value.aim / 40)}`;
        if (result.hits && candidate.value.strokes.length < 4 && !seeds.has(seedKey) && seeds.size < 24) {
          seeds.add(seedKey);
          const details = S.replay(map, config, candidate.value, null, true);
          for (const target of details.remaining) for (const interceptY of [target.y - 35, target.y - 80, target.y - 130]) {
            const p = details.path.filter(p => p.y < target.y - 20).sort((a,b) => Math.abs(a.y - interceptY) - Math.abs(b.y - interceptY))[0];
            if (!p || p.y < 110) continue;
            const direction = Math.sign(target.x - p.x) || 1;
            for (const ahead of [30, 65]) for (const offset of [20, 34]) {
              const stroke = [point(p.x - direction * ahead, p.y + 20), point(target.x + direction * 16, target.y + offset)];
              const strokes = [...candidate.value.strokes, stroke];
              if (S.ink(strokes) <= config.solverInk) pending.push({ ...candidate.value, dropFrame: Math.max(candidate.value.dropFrame, Math.ceil((S.ink(strokes) / 120 + 1.2) * 60)), strokes });
            }
          }
        }
      }
      return { done, attempts };
    } };
  }
  function reachable(map) {
    const rails = map.strokes.map(points => WoodlandPhysics.createStroke(points, 7)), width = 49, height = 83;
    const seen = new Uint8Array(width * height), queue = [];
    const free = (x, y) => rails.every(rail => {
      const b = rail.bounds;
      if (b && (x < b.left - 18.7 || x > b.right + 18.7 || y < b.top - 18.7 || y > b.bottom + 18.7)) return true;
      const p = WoodlandPhysics.nearest(rail, x, y);
      return !p || Math.hypot(x - p.x, y - p.y) > 18.7;
    });
    for (let x = 3; x <= 45; x++) if (free(36 + x * 6, 114)) { queue.push(x); seen[x] = 1; }
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head], x = index % width, y = Math.floor(index / width);
      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        const next = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || seen[next] || !free(36 + nx * 6, 114 + ny * 6)) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    return map.birds.every(bird => queue.some(index => Math.hypot(36 + index % width * 6 - bird.x, 114 + Math.floor(index / width) * 6 - bird.y) <= 34));
  }
  class WoodlandMapChecker {
    constructor() { this.job = null; }
    cancel() { if (this.job) { this.job.cancelled = true; clearTimeout(this.job.startTimer); this.job.worker?.terminate(); this.job.resolve?.({ cancelled: true }); this.job = null; } }
    setPaused(paused) { if (this.job) { this.job.paused = paused; this.job.worker?.postMessage({ type: 'pause', paused }); } }
    check(map, config, onProgress) {
      this.cancel();
      return new Promise(resolve => {
        const job = this.job = { cancelled: false, resolve, paused: false };
        const finish = result => { if (this.job !== job || job.cancelled) return; clearTimeout(job.startTimer); job.worker?.terminate(); this.job = null; resolve(result); };
        const fallback = () => {
          clearTimeout(job.startTimer);
          job.worker?.terminate(); job.worker = null;
          const search = createSearch(map, config); let used = 0;
          const chunk = () => {
            if (job.cancelled || this.job !== job) return;
            if (job.paused) { setTimeout(chunk, 100); return; }
            try {
              const start = performance.now(), result = search.next(7); used += performance.now() - start;
              onProgress(result.attempts);
              if (result.done || used >= 7000) finish(result);
              else setTimeout(chunk, 0);
            } catch (_error) { finish({ error: true }); }
          };
          setTimeout(chunk, 0);
        };
        try {
          if (typeof Worker !== 'function') { fallback(); return; }
          job.worker = new Worker(new URL('versus-solver-worker.js', document.baseURI));
          job.worker.onmessage = event => { if (this.job !== job || job.cancelled) return; clearTimeout(job.startTimer); if (event.data?.type === 'progress') onProgress(event.data.attempts); else finish(event.data || { error: true }); };
          job.worker.onerror = event => { event.preventDefault(); if (this.job === job && !job.cancelled) fallback(); };
          job.worker.postMessage({ type: 'check', map, config });
          job.startTimer = setTimeout(() => { if (this.job === job && !job.cancelled) fallback(); }, 3000);
        } catch (_error) { fallback(); }
      });
    }
  }
  window.WoodlandMapChecker = WoodlandMapChecker;
  window.WoodlandVersusSolver = { candidates, createSearch, reachable };
})();
