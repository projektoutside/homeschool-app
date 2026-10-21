(function (root) {
  'use strict';

  function bind(canvas, { enabled = () => true, start, move, end } = {}) {
    let activeId = null;
    let previous = null;
    const view = canvas.ownerDocument.defaultView;

    function position(event) {
      const rect = canvas.getBoundingClientRect();
      const width = canvas.clientWidth || rect.width;
      const height = canvas.clientHeight || rect.height;
      let x = (event.clientX - rect.left) * width / rect.width;
      let y = (event.clientY - rect.top) * height / rect.height;
      if (canvas.closest('.rotate180')) {
        x = width - x;
        y = height - y;
      }
      return { x, y };
    }

    function reset(cancelled = true) {
      if (activeId === null) return;
      const id = activeId;
      activeId = null;
      previous = null;
      if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
      end?.({ cancelled });
    }

    canvas.addEventListener('pointerdown', (event) => {
      if (event.cancelable) event.preventDefault();
      if (activeId !== null || !enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      activeId = event.pointerId;
      previous = position(event);
      // Capture keeps each finger attached to its original canvas across the divider.
      canvas.setPointerCapture?.(activeId);
      start?.(previous);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerId !== activeId) return;
      if (event.cancelable) event.preventDefault();
      if (!enabled() || (event.pointerType === 'mouse' && event.buttons === 0)) {
        reset();
        return;
      }
      const samples = event.getCoalescedEvents?.() || [];
      for (const sample of samples.length ? samples : [event]) {
        const next = position(sample);
        // Break the stroke outside the surface; never join an off-canvas excursion.
        const inside = next.x >= 0 && next.y >= 0 && next.x <= canvas.clientWidth && next.y <= canvas.clientHeight;
        if (inside && previous) move?.(previous, next);
        previous = inside ? next : null;
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      if (event.pointerId === activeId) reset(false);
    });
    for (const name of ['pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(name, (event) => {
        if (event.pointerId === activeId) reset();
      });
    }
    view.addEventListener('blur', () => reset());
    view.addEventListener('resize', () => reset());
    canvas.ownerDocument.addEventListener('visibilitychange', () => {
      if (canvas.ownerDocument.hidden) reset();
    });
    return { reset, get active() { return activeId !== null; } };
  }

  root.WriteMathCanvasInput = { bind };
})(globalThis);
