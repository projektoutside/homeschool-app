/* Shared local recognizer for the solo and versus answer pads. */
const WriteMathRecognition = (() => {
  const SIDE = 28;
  const MAX_RASTER_SIDE = 288;
  const MAX_DIGITS = 6; // Hard multiplication can produce six digits.
  const MIN_CONFIDENCE = 0.50;
  const MODEL_URL = new URL('digit-model/model.json', document.currentScript.src).href;
  const raster = document.createElement('canvas');
  const rasterContext = raster.getContext('2d', { willReadFrequently: true });
  const digit = document.createElement('canvas');
  digit.width = digit.height = SIDE;
  const digitContext = digit.getContext('2d', { willReadFrequently: true });
  let modelPromise;

  function load() {
    if (!modelPromise) {
      modelPromise = Promise.resolve().then(() => tf.loadLayersModel(MODEL_URL)).catch(error => {
        modelPromise = null;
        throw error;
      });
    }
    return modelPromise;
  }

  function readInk(canvas) {
    const scale = Math.min(1, MAX_RASTER_SIDE / Math.max(canvas.width, canvas.height));
    const width = Math.max(1, Math.round(canvas.width * scale));
    const height = Math.max(1, Math.round(canvas.height * scale));
    if (raster.width !== width) raster.width = width;
    if (raster.height !== height) raster.height = height;
    rasterContext.clearRect(0, 0, width, height);
    rasterContext.drawImage(canvas, 0, 0, width, height);
    const pixels = rasterContext.getImageData(0, 0, width, height).data;
    const columns = new Float32Array(width);
    let first = width;
    let last = -1;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) columns[x] += pixels[(y * width + x) * 4 + 3] / 255;
      if (columns[x] >= 0.7) {
        first = Math.min(first, x);
        last = x;
      }
    }
    return { pixels, columns, width, height, first, last };
  }

  function bounds(ink, left, right) {
    let top = ink.height;
    let bottom = -1;
    let mass = 0;
    let sumX = 0;
    let sumY = 0;
    for (let y = 0; y < ink.height; y++) {
      for (let x = left; x <= right; x++) {
        const alpha = ink.pixels[(y * ink.width + x) * 4 + 3];
        if (alpha < 24) continue;
        top = Math.min(top, y);
        bottom = y;
        mass += alpha;
        sumX += (x + 0.5) * alpha;
        sumY += (y + 0.5) * alpha;
      }
    }
    if (mass < 8 * 255 || bottom - top < 4) return null;
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1,
      centerX: sumX / mass - left, centerY: sumY / mass - top };
  }

  function normalize(box, size, angle) {
    const scale = size / Math.max(box.width, box.height);
    const width = box.width * scale;
    const height = box.height * scale;
    const x = Math.max(1, Math.min(SIDE - width - 1, SIDE / 2 - box.centerX * scale));
    const y = Math.max(1, Math.min(SIDE - height - 1, SIDE / 2 - box.centerY * scale));
    digitContext.clearRect(0, 0, SIDE, SIDE);
    digitContext.save();
    digitContext.translate(SIDE / 2, SIDE / 2);
    digitContext.rotate(angle);
    digitContext.drawImage(raster, box.x, box.y, box.width, box.height, x - SIDE / 2, y - SIDE / 2, width, height);
    digitContext.restore();
    const pixels = digitContext.getImageData(0, 0, SIDE, SIDE).data;
    const values = new Float32Array(SIDE * SIDE);
    for (let i = 0; i < values.length; i++) values[i] = pixels[i * 4 + 3] / 255;
    return values;
  }

  function groups(ink) {
    const parts = [];
    let start = ink.first;
    for (let x = ink.first + 1; x <= ink.last; x++) {
      if (ink.columns[x] >= 0.7) continue;
      const end = x - 1;
      while (x <= ink.last && ink.columns[x] < 0.7) x++;
      if (x - end < 3) continue;
      const box = bounds(ink, start, end);
      if (box) parts.push(box);
      start = x;
    }
    const last = bounds(ink, start, ink.last);
    if (last) parts.push(last);
    return parts;
  }

  function splitCrowdedDigits(ink, boxes, expectedDigits) {
    if (boxes.length >= expectedDigits || expectedDigits > MAX_DIGITS) return null;
    const result = [...boxes];
    while (result.length < expectedDigits) {
      let best = null;
      for (const [index, box] of result.entries()) {
        if (box.width < box.height * 0.72) continue;
        const minWidth = Math.max(3, Math.round(box.height * 0.15));
        const first = box.x + minWidth;
        const end = box.x + box.width - minWidth;
        for (let x = first; x <= end; x++) {
          const density = ink.columns[x] / box.height;
          if (density > 0.33) continue;
          const imbalance = Math.abs((x - box.x) / box.width - 0.5);
          const cost = density + imbalance * 0.28;
          if (best && cost >= best.cost) continue;
          const left = bounds(ink, box.x, x - 1);
          const right = bounds(ink, x, box.x + box.width - 1);
          if (!left || !right || Math.min(left.height, right.height) < box.height * 0.53) continue;
          best = { index, cost, left, right };
        }
      }
      if (!best) return null;
      result.splice(best.index, 1, best.left, best.right);
    }
    return result;
  }

  async function classify(model, boxes) {
    const views = [[20, 0], [19, -0.12], [22, 0.12]];
    const count = boxes.length * views.length;
    const data = new Float32Array(count * SIDE * SIDE);
    boxes.forEach((box, i) => views.forEach(([size, angle], j) => {
      data.set(normalize(box, size, angle), (i * views.length + j) * SIDE * SIDE);
    }));
    const prediction = tf.tidy(() => model.predict(tf.tensor4d(data, [count, SIDE, SIDE, 1])));
    try {
      const scores = await prediction.data();
      return boxes.map((_, i) => {
        const offset = i * views.length * 10;
        const average = digit => 0.5 * scores[offset + digit]
          + 0.25 * (scores[offset + 10 + digit] + scores[offset + 20 + digit]);
        let digit = 0;
        for (let j = 1; j < 10; j++) if (average(j) > average(digit)) digit = j;
        return { digit, confidence: average(digit) };
      });
    } finally {
      prediction.dispose();
    }
  }

  async function recognize(canvas, expectedDigits = 0) {
    const model = await load();
    const ink = readInk(canvas);
    if (ink.first > ink.last) return '';
    const boxes = groups(ink);
    if (!boxes.length || boxes.length > MAX_DIGITS) return '';
    // The problem suggests how many glyphs to look for. Ink and model
    // scores still determine every digit. Prepare both readings together so
    // simultaneous players never share a raster across an async boundary.
    const split = splitCrowdedDigits(ink, boxes, expectedDigits);
    const readings = await classify(model, split ? [...boxes, ...split] : boxes);
    const predictions = readings.slice(0, boxes.length);
    if (split) {
      const alternative = readings.slice(boxes.length);
      const min = Math.min(...alternative.map(({ confidence }) => confidence));
      const originalMin = Math.min(...predictions.map(({ confidence }) => confidence));
      if (min >= Math.max(0.62, originalMin - 0.18)) {
        return alternative.map(({ digit }) => digit).join('');
      }
    }
    if (predictions.some(({ confidence }) => confidence < MIN_CONFIDENCE)) return '';
    return predictions.map(({ digit }) => digit).join('');
  }

  async function warmup() {
    const model = await load();
    const prediction = tf.tidy(() => model.predict(tf.zeros([1, SIDE, SIDE, 1])));
    try {
      await prediction.data();
    } finally {
      prediction.dispose();
    }
  }

  return { recognize, warmup };
})();
