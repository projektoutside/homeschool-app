import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/Games/2PlayersMathWrite/canvas-input.js', import.meta.url), 'utf8');

class Surface {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, handler) { this.listeners.set(name, [...(this.listeners.get(name) || []), handler]); }
  emit(name, event = {}) { for (const handler of this.listeners.get(name) || []) handler(event); }
}

function setup(rotated = false) {
  const context = {};
  vm.runInNewContext(source, context);
  const view = new Surface();
  const document = new Surface();
  document.defaultView = view;
  const createCanvas = () => {
    const canvas = new Surface();
    Object.assign(canvas, {
      ownerDocument: document, clientWidth: 200, clientHeight: 100,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
      closest: () => rotated ? {} : null,
      setPointerCapture(id) { this.captured = id; },
      hasPointerCapture(id) { return this.captured === id; },
      releasePointerCapture() { this.captured = null; },
    });
    return canvas;
  };
  return { bind: context.WriteMathCanvasInput.bind, createCanvas, view, document };
}
const event = (pointerId, x, y, more = {}) => ({ pointerId, clientX: x + 10, clientY: y + 20, pointerType: 'touch', cancelable: true, preventDefault() {}, ...more });

test('two players retain independent stroke origins and ignore stray fingers', () => {
  const { bind, createCanvas } = setup();
  const a = createCanvas(), b = createCanvas(), strokes = [[], []];
  bind(a, { move: (from, to) => strokes[0].push([from, to]) });
  bind(b, { move: (from, to) => strokes[1].push([from, to]) });
  a.emit('pointerdown', event(1, 20, 30));
  b.emit('pointerdown', event(2, 130, 60));
  a.emit('pointerdown', event(3, 170, 90));
  a.emit('pointermove', event(3, 180, 90));
  a.emit('pointermove', event(2, 140, 65));
  a.emit('pointermove', event(1, 25, 35));
  b.emit('pointermove', event(2, 140, 65));
  assert.equal(strokes[0].length, 1);
  assert.equal(strokes[1].length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(strokes)), [[[{ x: 20, y: 30 }, { x: 25, y: 35 }]], [[{ x: 130, y: 60 }, { x: 140, y: 65 }]]]);
});

test('cancel, lost capture, resize, blur, and hidden page break strokes without submitting', () => {
  for (const cause of ['pointercancel', 'lostpointercapture', 'resize', 'blur', 'hidden']) {
    const { bind, createCanvas, view, document } = setup();
    const canvas = createCanvas(), ends = [], lines = [];
    bind(canvas, { end: (value) => ends.push(value.cancelled), move: (a, b) => lines.push([a, b]) });
    canvas.emit('pointerdown', event(4, 20, 20));
    if (cause === 'resize' || cause === 'blur') view.emit(cause);
    else if (cause === 'hidden') { document.hidden = true; document.emit('visibilitychange'); }
    else canvas.emit(cause, event(4, 50, 50));
    canvas.emit('pointermove', event(4, 100, 50));
    assert.deepEqual(ends, [true], cause);
    assert.equal(lines.length, 0, cause);
    assert.equal(canvas.captured, null, cause);
  }
});

test('rotated player coordinates and coalesced samples stay within that player canvas', () => {
  const { bind, createCanvas } = setup(true);
  const canvas = createCanvas(), lines = [];
  bind(canvas, { move: (a, b) => lines.push([a, b]) });
  canvas.emit('pointerdown', event(8, 20, 30));
  canvas.emit('pointermove', event(8, 30, 40, { getCoalescedEvents: () => [event(8, 25, 35), event(8, 30, 40)] }));
  assert.deepEqual(JSON.parse(JSON.stringify(lines)), [[{ x: 180, y: 70 }, { x: 175, y: 65 }], [{ x: 175, y: 65 }, { x: 170, y: 60 }]]);
});

test('leaving and reentering never creates a connecting line, and released mouse input stops', () => {
  const { bind, createCanvas } = setup();
  const canvas = createCanvas(), lines = [];
  bind(canvas, { move: (a, b) => lines.push([a, b]) });
  canvas.emit('pointerdown', event(1, 10, 10));
  for (const [x, y] of [[-20, 10], [180, 90], [185, 90]]) canvas.emit('pointermove', event(1, x, y));
  assert.equal(lines.length, 1);
  canvas.emit('pointerup', event(1, 185, 90));
  canvas.emit('pointerdown', event(2, 20, 20, { pointerType: 'mouse', button: 0 }));
  canvas.emit('pointermove', event(2, 30, 30, { pointerType: 'mouse', buttons: 0 }));
  assert.equal(lines.length, 1);
});
