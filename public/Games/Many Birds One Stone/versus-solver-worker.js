'use strict';
self.window = self;
importScripts('drop-mechanism.js', 'physics.js', 'versus-simulation.js', 'versus-solver.js');
let paused = false;
self.onmessage = event => {
  if (event.data.type === 'pause') { paused = event.data.paused; return; }
  if (event.data.type !== 'check') return;
  const search = WoodlandVersusSolver.createSearch(event.data.map, event.data.config); let used = 0;
  const chunk = () => {
    if (paused) { setTimeout(chunk, 100); return; }
    try {
      const start = performance.now(), result = search.next(15); used += performance.now() - start;
      if (result.done || used >= 7000) self.postMessage({ type: 'result', ...result });
      else { self.postMessage({ type: 'progress', attempts: result.attempts }); setTimeout(chunk, 0); }
    } catch (_error) { self.postMessage({ type: 'result', error: true }); }
  };
  chunk();
};
