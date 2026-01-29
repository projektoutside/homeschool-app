// handwriting.js
// Handwriting input for WriteMath!

const canvas = document.getElementById('handwriting-canvas');
// Use willReadFrequently for better performance when doing many getImageData calls
const ctx = canvas.getContext('2d', { willReadFrequently: true });

function resizeCanvasForDPI() {
  const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  const newW = Math.max(1, Math.round(cssW * scale));
  const newH = Math.max(1, Math.round(cssH * scale));
  if (canvas.width !== newW || canvas.height !== newH) {
    // Save current content to avoid losing strokes on orientation change
    const prev = document.createElement('canvas');
    prev.width = canvas.width;
    prev.height = canvas.height;
    const pctx = prev.getContext('2d');
    pctx.drawImage(canvas, 0, 0);

    canvas.width = newW;
    canvas.height = newH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0); // draw in CSS pixels

    // Redraw previous content scaled into new canvas
    if (prev.width && prev.height) {
      // Draw using CSS coordinate space thanks to transform
      ctx.drawImage(prev, 0, 0, prev.width / scale, prev.height / scale);
    }

    // Reapply stroke settings as resizing resets context state
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
}

window.addEventListener('resize', () => {
  const wasDrawing = drawing;
  resizeCanvasForDPI();
  if (!wasDrawing) {
    // keep visual clean when resizing
    // optional: could redraw a cached image if needed
  }
});

document.addEventListener('DOMContentLoaded', resizeCanvasForDPI);
let drawing = false;
let lastX = 0, lastY = 0;
let lastTime = 0;
let currentWidth = 8;

// === Parameters ===
const SUBMIT_DELAY_MS = 900; // Snappier recognition for "Pro" feel

// === Popup Notifications ===
function showPopup(message, isCorrect = true) {
  // Remove any existing popup
  const existingPopup = document.getElementById('answer-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create new popup
  const popup = document.createElement('div');
  popup.id = 'answer-popup';
  popup.textContent = message;
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${isCorrect ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)'};
    color: ${isCorrect ? '#4CAF50' : '#f44336'};
    border: 2px solid ${isCorrect ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 15px 30px;
    border-radius: 20px;
    font-size: 1.3rem;
    font-weight: bold;
    font-family: 'Fredoka One', cursive;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: ghostlyPopupIn 0.15s ease-out;
    text-align: center;
    min-width: 180px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.2);
  `;

  // Add CSS animation if not already present
  if (!document.querySelector('#popup-styles')) {
    const style = document.createElement('style');
    style.id = 'popup-styles';
    style.textContent = `
      @keyframes ghostlyPopupIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9) translateY(-10px);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1) translateY(0);
        }
      }
      @keyframes ghostlyPopupOut {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1) translateY(0);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.95) translateY(5px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(popup);

  // Auto-remove popup after delay (much faster)
  setTimeout(() => {
    if (popup && popup.parentNode) {
      popup.style.animation = 'ghostlyPopupOut 0.2s ease-in';
      setTimeout(() => {
        if (popup && popup.parentNode) {
          popup.remove();
        }
      }, 200);
    }
  }, isCorrect ? 800 : 1000); // Much faster display times
}

// === Advanced CNN Digit Recognition (TensorFlow.js) ===
// Pre-trained digit CNN model URLs (try primary then fallbacks)
const CNN_MODEL_URLS = [
  // CDN-hosted pre-trained MNIST models (avoid 404 & CORS issues)
  // CreativeGP repo via jsDelivr (stable)
  'https://cdn.jsdelivr.net/gh/CreativeGP/tensorflowjs-mnist@master/model/model.json',
  // Hsu-Hui demo via jsDelivr
  'https://cdn.jsdelivr.net/gh/Hsu-Hui/tfjs-MNIST-demo@main/model/model.json',
  // Seth Juarez workshop via jsDelivr
  'https://cdn.jsdelivr.net/gh/sethjuarez/tfjsmnist@master/model/model.json'
];
let cnnModel = null;

async function loadCnnModel() {
  if (cnnModel) return;
  modelLoading = true;
  const statusDiv = document.getElementById('model-status');
  if (statusDiv) statusDiv.textContent = '🧠 Loading ML model...';
  let lastError = null;
  for (const url of CNN_MODEL_URLS) {
    try {
      console.log('[CNN] Attempting to load model from', url);
      cnnModel = await tf.loadLayersModel(url);
      console.log('[CNN] Model loaded from', url);
      break;
    } catch (err) {
      console.warn('[CNN] Failed to load model from', url, err.message || err);
      lastError = err;
    }
  }
  if (!cnnModel) {
    modelLoading = false;
    const msg = '⚠️ ML model load failed';
    if (statusDiv) statusDiv.textContent = msg;
    throw lastError || new Error('All model URLs failed');
  }

  if (statusDiv) statusDiv.textContent = '✅ ML model ready!';
  setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 2000);
  modelLoading = false;
}

// Module-scoped reusable offscreen canvas for preprocessing
const __prepCanvas = document.createElement('canvas');
const __prepCtx = __prepCanvas.getContext('2d', { willReadFrequently: true });
__prepCanvas.width = 28; __prepCanvas.height = 28;

// Enhanced pre-processing for super accurate digit recognition
function canvasToTensor(srcCanvas) {
  const sourceCanvas = srcCanvas || canvas;

  // Reset target canvas
  __prepCtx.clearRect(0, 0, 28, 28);
  __prepCtx.fillStyle = 'white';
  __prepCtx.fillRect(0, 0, 28, 28);

  // Get bounding box first
  const bounds = getDrawingBounds(sourceCanvas);

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    // 1. Crop to bounding box
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bounds.width;
    cropCanvas.height = bounds.height;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(sourceCanvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);

    // 2. Calculate Center of Mass of the cropped digit
    const { comX, comY, totalMass } = getCenterOfMass(cropCtx, bounds.width, bounds.height);

    // 3. Scale to fit in 20x20 box (preserving aspect ratio)
    const maxDim = Math.max(bounds.width, bounds.height);
    const scale = Math.min(20 / maxDim, 1);
    const scaledW = bounds.width * scale;
    const scaledH = bounds.height * scale;

    // 4. Center based on Center of Mass in the 28x28 target
    // We want the COM to be at (14, 14) ideally.
    // First, draw scaled image to temp canvas
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledW;
    scaledCanvas.height = scaledH;
    const sCtx = scaledCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(cropCanvas, 0, 0, scaledW, scaledH);

    // Calculate effective COM on scaled image
    const effComX = comX * scale;
    const effComY = comY * scale;

    // Shift so effCom is at center (14, 14) of target
    let destX = 14 - effComX;
    let destY = 14 - effComY;

    // Clamp to ensure we don't clip too much (optional safety)
    // But MNIST relies on COM centering even if it clips edges slightly.

    __prepCtx.imageSmoothingEnabled = true;
    __prepCtx.imageSmoothingQuality = 'high';
    __prepCtx.drawImage(scaledCanvas, destX, destY);
  } else {
    __prepCtx.imageSmoothingEnabled = true;
    __prepCtx.imageSmoothingQuality = 'high';
    __prepCtx.drawImage(sourceCanvas, 0, 0, 28, 28);
  }

  const tensor = tf.tidy(() => {
    const img = tf.browser.fromPixels(__prepCanvas, 1).toFloat().div(255.0);
    const inverted = tf.scalar(1.0).sub(img);
    // Increased contrast boosting for faint lines
    const boosted = inverted.sub(0.05).mul(1.2).clipByValue(0, 1);
    return boosted.expandDims(0); // shape [1, 28, 28, 1]
  });

  return tensor;
}

// Helper: Calculate Center of Mass
function getCenterOfMass(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 0) {
        sumX += x * alpha;
        sumY += y * alpha;
        totalMass += alpha;
      }
    }
  }

  if (totalMass === 0) return { comX: w / 2, comY: h / 2, totalMass: 0 };
  return { comX: sumX / totalMass, comY: sumY / totalMass, totalMass };
}

function getDrawingBounds(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasContent = false;

  // Scan for drawn pixels (alpha > threshold)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 25) { // Lower threshold for better detection
        hasContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasContent) return null;

  // Add smart padding based on drawing size
  const padding = Math.max(3, Math.min(8, Math.floor((maxX - minX + maxY - minY) / 20)));

  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(width - (minX - padding), maxX - minX + 2 * padding),
    height: Math.min(height - (minY - padding), maxY - minY + 2 * padding)
  };
}

async function recognizeDigitML(srcCanvas) {
  await loadCnnModel();
  const input = canvasToTensor(srcCanvas);
  const prediction = cnnModel.predict(input);
  const probs = prediction.dataSync();
  const digit = probs.indexOf(Math.max(...probs));
  const confidence = probs[digit];
  tf.dispose([input, prediction]);
  return { digit, confidence };
}
// === OCR (Tesseract.js) Integration ===
let ocrWorker = null;
let ocrReady = false;

async function initOCR() {
  if (ocrReady) return;
  if (typeof Tesseract === 'undefined') {
    console.warn('Tesseract.js not loaded - skipping OCR initialization');
    return;
  }
  ocrWorker = await Tesseract.createWorker({
    logger: m => console.log('[OCR]', m.status, (m.progress * 100).toFixed(0) + '%')
  });
  // Newer Tesseract.js versions have workers pre-loaded; load() is deprecated.
  if (typeof ocrWorker.load === 'function') {
    await ocrWorker.load();
  }
  if (typeof ocrWorker.loadLanguage === 'function') {
    await ocrWorker.loadLanguage('eng');
  }
  await ocrWorker.initialize('eng');
  // Limit recognition strictly to digits for higher accuracy & speed
  await ocrWorker.setParameters({ tessedit_char_whitelist: '0123456789' });
  ocrReady = true;
  console.log('✅ OCR engine ready!');
}

// Recognize digits using OCR; returns a string containing only the detected digits (may be empty)
async function recognizeWithOCR(expectedLen = null) {
  try {
    await initOCR();
    if (!ocrReady) return '';

    // For max-accuracy: denoise + contrast before OCR
    const prep = document.createElement('canvas');
    prep.width = canvas.width;
    prep.height = canvas.height;
    const pctx = prep.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(canvas, 0, 0);
    const id = pctx.getImageData(0, 0, prep.width, prep.height);
    const d = id.data;
    // Adaptive threshold with slight dilation
    let minA = 255, maxA = 0;
    for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a < minA) minA = a; if (a > maxA) maxA = a; }
    const thr = Math.max(20, minA + (maxA - minA) * 0.25);
    for (let y = 0; y < prep.height; y++) {
      for (let x = 0; x < prep.width; x++) {
        const idx = (y * prep.width + x) * 4;
        const a = d[idx + 3];
        const on = a > thr ? 0 : 255; // black ink on white
        d[idx] = d[idx + 1] = d[idx + 2] = on;
        d[idx + 3] = 255;
      }
    }
    pctx.putImageData(id, 0, 0);

    // Crop to bounding box to remove borders
    const ctxMain = pctx;
    const imgData = ctxMain.getImageData(0, 0, prep.width, prep.height);
    let minX = prep.width, minY = prep.height, maxX = 0, maxY = 0;
    for (let y = 0; y < prep.height; y++) {
      for (let x = 0; x < prep.width; x++) {
        const a = imgData.data[(y * prep.width + x) * 4]; // after binarize, use R channel
        if (a < 200) { // black
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    let targetCanvas = prep;
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w > 4 && h > 4) {
      const cropped = document.createElement('canvas');
      cropped.width = w;
      cropped.height = h;
      const cc = cropped.getContext('2d', { willReadFrequently: true });
      cc.drawImage(prep, minX, minY, w, h, 0, 0, w, h);
      targetCanvas = cropped;
    }

    const dataURL = targetCanvas.toDataURL('image/png');
    const { data: { text } } = await ocrWorker.recognize(dataURL);
    const digitsOnly = text.replace(/[^0-9]/g, '').trim();
    if (expectedLen && digitsOnly.length !== expectedLen) return '';
    console.log('[OCR] Raw text:', text, '=> Digits:', digitsOnly);
    return digitsOnly;
  } catch (err) {
    console.error('OCR recognition error:', err);
    return '';
  }
}

// Precise pointer positioning handling borders and padding
function getPointerPos(e) {
  // If it's a mouse event, offsetX/Y is the most accurate (relative to padding-box)
  if (!e.touches) {
    return { x: e.offsetX, y: e.offsetY };
  }

  // For touch events, we must manually calculate relative to the element
  const rect = canvas.getBoundingClientRect();

  // Important: getBoundingClientRect includes the border.
  // The canvas internal coordinates start inside the border.
  const style = window.getComputedStyle(canvas);
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;

  const touch = e.touches[0];
  const clientX = touch.clientX;
  const clientY = touch.clientY;

  // Subtract rect position AND border width to match internal coordinate system
  return {
    x: clientX - rect.left - borderLeft,
    y: clientY - rect.top - borderTop
  };
}

function startDraw(e) {
  drawing = true;
  const pos = getPointerPos(e);
  lastX = pos.x;
  lastY = pos.y;
  lastTime = Date.now();
  currentWidth = 8; // Reset width


  // Add visual feedback - drawing state
  canvas.classList.add('drawing');
  canvas.classList.remove('processing');

  // Update status
  const statusDiv = document.getElementById('canvas-status');
  if (statusDiv) {
    statusDiv.innerHTML = '✏️ Drawing...';
  }
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPointerPos(e);

  // === Advanced Variable-Width Inking (Simulated Pressure) ===

  // Calculate speed
  const currentTime = Date.now();
  const timeDelta = currentTime - (lastTime || currentTime);
  const dist = Math.sqrt((pos.x - lastX) ** 2 + (pos.y - lastY) ** 2);
  const speed = timeDelta > 0 ? dist / timeDelta : 0; // px/ms

  // Map speed to width: faster = thinner, slower = thicker
  // Base width scales with canvas size
  const rect = canvas.getBoundingClientRect();
  const baseSize = Math.max(4, Math.round(8 * (rect.width / 480)));

  // Dynamic width calculation
  // Speed typically ranges 0.1 to 5.0+
  // We want width to range from baseSize * 0.5 to baseSize * 1.2
  const minWidth = baseSize * 0.4;
  const maxWidth = baseSize * 1.4;

  // Smooth the speed factor
  const targetWidth = Math.max(minWidth, Math.min(maxWidth, baseSize - (speed * 1.5)));

  // Smooth transition from previous width
  currentWidth = currentWidth * 0.6 + targetWidth * 0.4; // simple low-pass filter

  // Draw using quadratic curves for smoothness
  ctx.lineWidth = currentWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';

  // To make it look like a continuous stroke with variable width, 
  // we actually need to draw many small segments or use a specialized brush.
  // Standard canvas stroke() has constant width per path.
  // Workaround: Draw individual segments with varying width.

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);

  // Quadratic Bezier for smoother curves than lines
  // Use midpoint as control point? No, standard trick is:
  // mid = (p1 + p2) / 2
  // draw quad from last_mid to new_mid using p1 as control

  // For now, linear segments with variable width is a massive upgrade over loops of circles.
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  // Circle cap at the end to smooth joints
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, currentWidth / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Fill the start gap too
  ctx.beginPath();
  ctx.arc(lastX, lastY, currentWidth / 2, 0, Math.PI * 2);
  ctx.fill();

  lastX = pos.x;
  lastY = pos.y;
  lastTime = currentTime;

  // User is still drawing – cancel any pending recognition until they stop
  if (window.__idleTimer) {
    clearTimeout(window.__idleTimer);
    window.__idleTimer = null;
  }
}

function endDraw() {
  drawing = false;

  // Remove drawing state when user stops drawing
  canvas.classList.remove('drawing');

  // Update status
  const statusDiv = document.getElementById('canvas-status');
  if (statusDiv && !isCanvasBlank()) {
    statusDiv.innerHTML = '⏳ Waiting...';
  } else if (statusDiv && isCanvasBlank()) {
    statusDiv.innerHTML = '✏️ Draw your answer above';
  }

  // Schedule recognition after idle delay
  if (!isCanvasBlank()) {
    if (window.__idleTimer) clearTimeout(window.__idleTimer);
    window.__idleTimer = setTimeout(tryAutoSubmit, SUBMIT_DELAY_MS);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Remove all visual feedback states when clearing
  canvas.classList.remove('drawing', 'processing');

  // Reset status
  const statusDiv = document.getElementById('canvas-status');
  if (statusDiv) {
    statusDiv.innerHTML = '✏️ Draw your answer above';
  }
}

const clearCanvasButton = document.getElementById('clear-canvas');
if (clearCanvasButton) {
  clearCanvasButton.addEventListener('click', clearCanvas);
}

// Helper: check if canvas is empty
function isCanvasBlank() {
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data.toString() ===
    blank.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.toString();
}

// On stroke end, auto-recognize and auto-submit if correct
async function tryAutoSubmit() {
  window.__idleTimer = null;
  if (!window.currentProblem || isCanvasBlank() || (window.gameState && window.gameState.running === false)) return;
  try {
    canvas.classList.add('processing');
    canvas.classList.remove('drawing');
    const statusDiv = document.getElementById('canvas-status');
    if (statusDiv) statusDiv.innerHTML = '🔬 Analyzing...';

    const expectedAnswer = window.currentProblem.answer;
    const expectedStr = String(expectedAnswer);
    const expectedLen = expectedStr.length;

    // Run recognizers in parallel
    const [patternDigit, ml, multiStr, ocrStr] = await Promise.all([
      recognizeHandwriting(),              // pattern-only single digit (or null)
      recognizeDigitML(),                  // {digit, confidence}
      recognizeMultiDigit(expectedLen),    // multi-digit string
      recognizeWithOCR(expectedLen)        // OCR string (digits only)
    ]);

    const mlDigit = ml ? ml.digit : null;
    const mlConf = ml ? ml.confidence : 0;

    // Build candidate list as strings for unified scoring
    const rawCandidates = [];
    if (patternDigit != null) rawCandidates.push(String(patternDigit));
    if (mlDigit != null) rawCandidates.push(String(mlDigit));
    if (multiStr) rawCandidates.push(String(multiStr));
    if (ocrStr) rawCandidates.push(String(ocrStr));

    // Always include a segmented-ML rebuild when expectedLen > 1 and multiStr missing
    if (expectedLen > 1 && !multiStr) {
      // naive width-based split as last resort
      const alt = await recognizeMultiDigit(expectedLen);
      if (alt) rawCandidates.push(String(alt));
    }

    // Deduplicate
    const candidates = Array.from(new Set(rawCandidates)).filter(s => /^\d{1,3}$/.test(s));
    if (candidates.length === 0) {
      canvas.classList.remove('processing');
      if (statusDiv) statusDiv.innerHTML = '❌ Unrecognized — draw clearer';
      showPopup('Couldn\'t read that. Try again.', false);
      return;
    }

    // Answer-aware scoring
    function editDistance(a, b) {
      const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[a.length][b.length];
    }

    const scores = candidates.map(c => {
      let score = 0;
      if (c.length === expectedLen) score += 2.0; else score -= 1.5;
      const dist = editDistance(c, expectedStr);
      score += Math.max(0, 3.0 - dist); // closer strings get higher score

      // Boost if matches OCR or multi-digit result
      if (ocrStr && c === ocrStr) score += 1.5;
      if (multiStr && c === multiStr) score += 1.2;

      // If single-digit and equals ML digit, boost by ML confidence
      // Increased trust in ML model after Center of Mass enhancement
      if (c.length === 1 && mlDigit != null && parseInt(c) === mlDigit) {
        score += 3.5 * Math.min(1, Math.max(0, mlConf));
      }

      // Penalize improbable shapes detected by pattern when it disagrees strongly
      if (patternDigit != null && c.length === 1 && parseInt(c) !== patternDigit) {
        score -= 0.8;
      }

      return { cand: c, score, dist };
    }).sort((a, b) => b.score - a.score);

    const best = scores[0];
    const status = document.getElementById('canvas-status');
    if (status) {
      const confText = mlDigit != null ? ` ML:${mlDigit} ${(mlConf * 100).toFixed(0)}%` : '';
      status.innerHTML = `🔍 Best: <strong>${best.cand}</strong> (score ${best.score.toFixed(2)})${confText}`;
    }

    const isCorrect = best.cand === expectedStr;

    if (isCorrect) {
      canvas.classList.remove('processing');
      // Stop if game ended during processing
      if (window.gameState && window.gameState.running === false) {
        canvas.classList.remove('processing');
        return;
      }
      showPopup(`Correct! (${best.cand})`, true);
      if (typeof window.onAutoCorrect === 'function') {
        if (!window.__solvingLock) {
          window.__solvingLock = true;
          window.onAutoCorrect();
          setTimeout(() => { window.__solvingLock = false; }, 500);
        }
      }
      return;
    }

    // If game ended during processing, stop
    if (window.gameState && window.gameState.running === false) {
      canvas.classList.remove('processing');
      return;
    }
    canvas.classList.remove('processing');
    showPopup(`Incorrect (I saw: ${best.cand})`, false);
    if (statusDiv) statusDiv.innerHTML = '❌ Incorrect! Try again';
    clearCanvas();
  } catch (err) {
    console.error('Recognition error:', err);
    const statusDiv = document.getElementById('canvas-status');
    if (statusDiv) statusDiv.innerHTML = '⚠️ Recognition error';
  }
}

// === Utility: Connected-component segmentation to find individual digit blobs ===
function segmentDigitBoundingBoxes(srcCtx, width, height) {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const alpha = imgData.data;
  const visited = new Uint8Array(width * height);
  const boxes = [];
  const threshold = 20;

  const stack = [];
  const push = (x, y) => { stack.push(x, y); };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const a = alpha[idx * 4 + 3];
      if (a <= threshold) continue;

      // start new component
      let minX = x, maxX = x, minY = y, maxY = y;
      push(x, y);
      visited[idx] = 1;
      while (stack.length) {
        const cy = stack.pop();
        const cx = stack.pop();
        // explore 4-neighbours
        const neighbours = [
          [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]
        ];
        for (const [nx, ny] of neighbours) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;
          const na = alpha[nIdx * 4 + 3];
          if (na > threshold) {
            visited[nIdx] = 1;
            push(nx, ny);
            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
          }
        }
      }

      // ignore tiny noise blobs
      const blobW = maxX - minX + 1;
      const blobH = maxY - minY + 1;
      if (blobW < 4 || blobH < 4) continue;

      // add small padding of 2px
      boxes.push({
        x: Math.max(0, minX - 2),
        y: Math.max(0, minY - 2),
        w: Math.min(width - minX + 2, blobW + 4),
        h: Math.min(height - minY + 2, blobH + 4)
      });
    }
  }

  // sort left-to-right
  boxes.sort((a, b) => a.x - b.x);
  return boxes;
}

// Attempt to recognize multi-digit numbers
async function recognizeMultiDigit(expectedLen) {
  const tempCtx = canvas.getContext('2d');
  // Segment blobs
  const boxes = segmentDigitBoundingBoxes(tempCtx, canvas.width, canvas.height);
  if (boxes.length === 0) return '';
  if (boxes.length === 1) {
    // Single blob – might still contain multiple digits stuck together.
    const b = boxes[0];
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = b.w;
    blobCanvas.height = b.h;
    const bctx = blobCanvas.getContext('2d', { willReadFrequently: true });
    bctx.drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);

    // Try vertical projection split inside this blob
    const colInk = new Array(b.w).fill(0);
    const imgD = bctx.getImageData(0, 0, b.w, b.h);
    for (let x = 0; x < b.w; x++) {
      let sum = 0;
      for (let y = 0; y < b.h; y++) {
        const a = imgD.data[(y * b.w + x) * 4 + 3];
        if (a > 20) sum++;
      }
      colInk[x] = sum;
    }

    // ===== Improved valley-based split detection =====
    const smoothed = colInk.map((v, i) => {
      const prev = colInk[Math.max(0, i - 1)];
      const next = colInk[Math.min(colInk.length - 1, i + 1)];
      return (prev + v + next) / 3;
    });
    const globalMax = Math.max(...smoothed);

    // HEURISTIC 1: Aspect Ratio Force Split
    // If the blob is wide (w > 1.2 * h), it is likely multiple digits.
    const aspectRatio = b.w / b.h;
    let forceSplit = false;
    if (aspectRatio > 1.2 && expectedLen > 1) {
      forceSplit = true;
    }

    let candidateSplits = [];
    // Increased threshold from 0.18 to 0.45 to detect valleys even with connector lines
    const splitThreshold = 0.45;

    for (let i = 2; i < smoothed.length - 2; i++) {
      const curr = smoothed[i];
      // Local minimum check
      if (curr < globalMax * splitThreshold &&
        smoothed[i - 1] >= curr && smoothed[i + 1] >= curr) {
        candidateSplits.push({ idx: i, val: curr });
      }
    }

    // Sort deepest valleys first (lowest ink density)
    candidateSplits.sort((a, b) => a.val - b.val);

    // Filter close splits (keep only robust ones)
    const robustSplits = [];
    candidateSplits.forEach(s => {
      if (!robustSplits.some(r => Math.abs(r.idx - s.idx) < 10)) {
        robustSplits.push(s);
      }
    });

    // If we expect N digits, we ideally want N-1 splits
    const targetSplits = expectedLen ? expectedLen - 1 : Math.round(aspectRatio);
    const desiredSplits = Math.max(targetSplits, robustSplits.length > 0 ? 1 : 0);

    let splits = robustSplits.slice(0, desiredSplits).map(o => o.idx).sort((a, b) => a - b);

    if (splits.length === 0) {
      // It looks like a single blob.
      // BUT if it is WIDE, we MUST force split it even if no valleys found.
      if (forceSplit && expectedLen > 1) {
        // Naive split based on width
        const segmentW = b.w / expectedLen;
        for (let k = 1; k < expectedLen; k++) {
          splits.push(Math.floor(k * segmentW));
        }
      } else {
        // Truly single digit
        const { digit } = await recognizeDigitML(blobCanvas);
        return digit.toString();
      }
    }

    // Build segment boxes within blob
    const subResults = [];
    let startX = 0;
    for (const s of splits) {
      subResults.push([startX, s]);
      startX = s;
    }
    subResults.push([startX, b.w]);

    let composite = '';
    for (const [sx, ex] of subResults) {
      const segW = ex - sx;
      // Skip tiny slivers
      if (segW < 5) continue;

      const segCanvas = document.createElement('canvas');
      segCanvas.width = segW;
      segCanvas.height = b.h;
      // Padding to help recognition of chopped edges
      const subBW = segW + 8;
      const subBH = b.h + 8;
      const finalSeg = document.createElement('canvas');
      finalSeg.width = subBW;
      finalSeg.height = subBH;
      const fctx = finalSeg.getContext('2d', { willReadFrequently: true });
      fctx.fillStyle = 'white';
      fctx.fillRect(0, 0, subBW, subBH);
      fctx.drawImage(blobCanvas, sx, 0, segW, b.h, 4, 4, segW, b.h);

      const { digit } = await recognizeDigitML(finalSeg);
      composite += digit.toString();
    }
    return composite;
  }

  let result = '';
  for (const box of boxes) {
    const sub = document.createElement('canvas');
    sub.width = box.w;
    sub.height = box.h;
    const sctx = sub.getContext('2d');
    sctx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const { digit } = await recognizeDigitML(sub);
    result += digit.toString();
  }
  if (expectedLen && result.length !== expectedLen) {
    // Fallback: split the blob/canvas into equal sections
    // Use union of all boxes if available to focus on the drawing area
    let bounds = null;
    if (boxes.length > 0) {
      const minX = Math.min(...boxes.map(box => box.x));
      const minY = Math.min(...boxes.map(box => box.y));
      const maxX = Math.max(...boxes.map(box => box.x + box.w));
      const maxY = Math.max(...boxes.map(box => box.y + box.h));
      bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    const baseW = bounds ? bounds.w : canvas.width;
    const baseH = bounds ? bounds.h : canvas.height;
    const baseX = bounds ? bounds.x : 0;
    const evenWidth = Math.floor(baseW / expectedLen);
    let evenResult = '';
    for (let i = 0; i < expectedLen; i++) {
      const subC = document.createElement('canvas');
      subC.width = evenWidth;
      subC.height = baseH;
      const scx = subC.getContext('2d');
      scx.drawImage(canvas, baseX + i * evenWidth, 0, evenWidth, baseH, 0, 0, evenWidth, baseH);
      const { digit } = await recognizeDigitML(subC);
      evenResult += digit.toString();
    }
    return evenResult;
  }
  return result;
}

// Recognize a specific section of the canvas
async function recognizeSection(x, y, width, height) {
  // Create a temporary canvas for this section
  const temp = document.createElement('canvas');
  temp.width = width;
  temp.height = height;
  const tctx = temp.getContext('2d', { willReadFrequently: true });

  // Draw the section
  tctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  // Analyze this section using pattern recognition
  const imgData = tctx.getImageData(0, 0, width, height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let pixels = [];

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2];
      if (r < 200 || g < 200 || b < 200) {
        pixels.push({ x: px, y: py });
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }

  if (pixels.length < 5) return Math.floor(Math.random() * 10);

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const aspect = w / h;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Simplified pattern matching for sections
  let topHalf = 0, bottomHalf = 0, leftHalf = 0, rightHalf = 0;

  pixels.forEach(p => {
    if (p.y < centerY) topHalf++; else bottomHalf++;
    if (p.x < centerX) leftHalf++; else rightHalf++;
  });

  const topRatio = topHalf / pixels.length;
  const bottomRatio = bottomHalf / pixels.length;
  const leftRatio = leftHalf / pixels.length;
  const rightRatio = rightHalf / pixels.length;

  // Basic pattern matching for sections
  if (aspect < 0.4) return 1;
  if (aspect > 1.5 && topRatio > 0.6) return 7;
  if (bottomRatio > 0.6) return 2;
  if (topRatio > 0.6) return 3;
  if (leftRatio > 0.6) return 4;
  if (rightRatio > 0.6) return 9;
  if (Math.abs(topRatio - bottomRatio) < 0.2) return 8;

  return Math.floor(Math.random() * 10);
}

// Mouse events
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);

// Touch events
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('touchcancel', endDraw);

// --- Offline Pattern-Based Digit Recognition ---
let digitModel = 'pattern-based'; // Always use pattern-based recognition
let modelLoading = false;

// Initialize the recognition system
async function loadModel() {
  if (modelLoading) return;
  modelLoading = true;

  const statusDiv = document.getElementById('model-status');

  console.log('Initializing pattern-based recognition...');
  if (statusDiv) statusDiv.textContent = '🧠 Loading handwriting model...';

  // Simulate brief loading time
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Pattern-based recognition ready!');
  if (statusDiv) statusDiv.textContent = '✅ Handwriting ready!';

  setTimeout(() => {
    if (statusDiv) statusDiv.style.display = 'none';
  }, 2000);

  modelLoading = false;
}

// Initialize when page loads
loadModel();

// Enhanced pattern-based digit recognition with better bad handwriting support
function recognizeDigitByPattern() {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Find all drawn pixels and bounding box
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let pixels = [];

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2];
      if (r < 200 || g < 200 || b < 200) { // not white
        pixels.push({ x, y });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (pixels.length < 20) return null; // Return null for insufficient drawing

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const aspect = width / height;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Advanced shape analysis with more precise measurements
  let topHalf = 0, bottomHalf = 0, leftHalf = 0, rightHalf = 0;
  let topLeft = 0, topRight = 0, bottomLeft = 0, bottomRight = 0;
  let center = 0, topThird = 0, middleThird = 0, bottomThird = 0;
  let leftThird = 0, middleThirdV = 0, rightThird = 0;

  // Enhanced gap and loop detection
  let topGaps = 0, bottomGaps = 0, leftGaps = 0, rightGaps = 0;
  let centerGaps = 0, edgePixels = 0;

  pixels.forEach(p => {
    // Basic divisions
    if (p.y < centerY) topHalf++; else bottomHalf++;
    if (p.x < centerX) leftHalf++; else rightHalf++;

    // Quarters
    if (p.x < centerX && p.y < centerY) topLeft++;
    else if (p.x >= centerX && p.y < centerY) topRight++;
    else if (p.x < centerX && p.y >= centerY) bottomLeft++;
    else bottomRight++;

    // Thirds
    if (p.y < minY + height / 3) topThird++;
    else if (p.y < minY + 2 * height / 3) middleThird++;
    else bottomThird++;

    if (p.x < minX + width / 3) leftThird++;
    else if (p.x < minX + 2 * width / 3) middleThirdV++;
    else rightThird++;

    // Center detection (tighter for better loop detection)
    if (Math.abs(p.x - centerX) < width * 0.2 && Math.abs(p.y - centerY) < height * 0.2) {
      center++;
    }

    // Edge detection
    if (p.x === minX || p.x === maxX || p.y === minY || p.y === maxY) {
      edgePixels++;
    }
  });

  // Calculate comprehensive ratios
  const topRatio = topHalf / pixels.length;
  const bottomRatio = bottomHalf / pixels.length;
  const leftRatio = leftHalf / pixels.length;
  const rightRatio = rightHalf / pixels.length;
  const centerRatio = center / pixels.length;
  const topThirdRatio = topThird / pixels.length;
  const middleThirdRatio = middleThird / pixels.length;
  const bottomThirdRatio = bottomThird / pixels.length;
  const leftThirdRatio = leftThird / pixels.length;
  const rightThirdRatio = rightThird / pixels.length;
  const edgeRatio = edgePixels / pixels.length;

  // Advanced shape classification
  const isCircular = aspect > 0.7 && aspect < 1.4;
  const isVertical = aspect < 0.6;
  const isHorizontal = aspect > 1.5;
  const isSquarish = aspect > 0.8 && aspect < 1.2;
  const hasLoops = centerRatio < 0.3 && edgeRatio > 0.3;
  const isSolid = centerRatio > 0.25;

  console.log('Enhanced recognition analysis:', {
    aspect: aspect.toFixed(2),
    topRatio: topRatio.toFixed(2),
    bottomRatio: bottomRatio.toFixed(2),
    leftRatio: leftRatio.toFixed(2),
    rightRatio: rightRatio.toFixed(2),
    centerRatio: centerRatio.toFixed(2),
    edgeRatio: edgeRatio.toFixed(2),
    isCircular, isVertical, isHorizontal, isSquarish, hasLoops, isSolid
  });

  // Precise digit detection with enhanced logic
  let candidates = [];

  // DIGIT 0: Oval/circular with clear center gap
  if (isCircular && centerRatio < 0.2 && hasLoops &&
    topLeft > 0.1 * pixels.length && topRight > 0.1 * pixels.length &&
    bottomLeft > 0.1 * pixels.length && bottomRight > 0.1 * pixels.length) {
    candidates.push({ digit: 0, confidence: 0.95 });
  }

  // DIGIT 1: Vertical line, very narrow
  if (isVertical && (leftThirdRatio > 0.4 || rightThirdRatio > 0.4 || middleThirdV > 0.4)) {
    candidates.push({ digit: 1, confidence: 0.95 });
  }

  // DIGIT 2: Bottom-heavy, curved, not circular
  if (bottomRatio > 0.6 && topRatio > 0.2 && !hasLoops && edgeRatio > 0.4) {
    candidates.push({ digit: 2, confidence: 0.9 });
  }

  // DIGIT 3: Two curves, top and bottom heavy, gap in middle
  if (topThirdRatio > 0.3 && bottomThirdRatio > 0.3 && middleThirdRatio < 0.4 &&
    rightRatio > 0.4 && !hasLoops) {
    candidates.push({ digit: 3, confidence: 0.85 });
  }

  // DIGIT 4: Left-heavy with right stroke, angular
  if (leftRatio > 0.6 && rightRatio > 0.2 && !isCircular && topRatio > 0.3) {
    candidates.push({ digit: 4, confidence: 0.85 });
  }

  // DIGIT 5: Top-heavy with bottom curve
  if (topThirdRatio > 0.4 && bottomThirdRatio > 0.25 && rightRatio > 0.3 &&
    leftRatio > 0.3 && !hasLoops) {
    candidates.push({ digit: 5, confidence: 0.8 });
  }

  // DIGIT 6: Left-heavy with bottom loop
  if (leftRatio > 0.5 && bottomRatio > 0.4 && isCircular && centerRatio < 0.25) {
    candidates.push({ digit: 6, confidence: 0.85 });
  }

  // DIGIT 7: Horizontal top stroke with diagonal (very strict)
  if (isHorizontal && topRatio > 0.7 && bottomRatio < 0.2 && leftRatio < 0.3) {
    candidates.push({ digit: 7, confidence: 0.8 });
  }

  // DIGIT 8: Two loops, balanced, solid center, very specific detection
  if (isSquarish && centerRatio > 0.1 && centerRatio < 0.4 &&
    Math.abs(topRatio - bottomRatio) < 0.25 &&
    Math.abs(leftRatio - rightRatio) < 0.25 &&
    topLeft > 0.15 * pixels.length && topRight > 0.15 * pixels.length &&
    bottomLeft > 0.15 * pixels.length && bottomRight > 0.15 * pixels.length) {
    candidates.push({ digit: 8, confidence: 0.95 });
  }

  // DIGIT 9: Top loop with bottom stroke - very specific
  if (isCircular && topRatio > 0.5 && rightRatio > 0.4 &&
    topRight > 0.2 * pixels.length && centerRatio < 0.3 &&
    bottomLeft < 0.15 * pixels.length) {
    candidates.push({ digit: 9, confidence: 0.85 });
  }

  // Enhanced 8 vs 9 distinction
  if (isSquarish && centerRatio > 0.15) {
    // If it has significant center content and is balanced, it's likely 8
    if (Math.abs(topRatio - bottomRatio) < 0.2) {
      candidates.push({ digit: 8, confidence: 0.9 });
    }
  }

  // Select best candidate with higher confidence threshold
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.confidence - a.confidence);
    console.log('Recognition candidates:', candidates);

    // Higher confidence threshold for better accuracy
    if (candidates[0].confidence >= 0.8) {
      return candidates[0].digit;
    }
  }

  // Stricter fallback logic
  if (isVertical && pixels.length > 30) return 1;
  if (isCircular && centerRatio < 0.2 && pixels.length > 50) return 0;
  if (isSquarish && centerRatio > 0.2 && Math.abs(topRatio - bottomRatio) < 0.2) return 8;
  if (bottomRatio > 0.65 && !isCircular && pixels.length > 40) return 2;
  if (leftRatio > 0.65 && !isCircular && pixels.length > 40) return 4;
  if (isHorizontal && topRatio > 0.7 && pixels.length > 40) return 7;

  // If we can't confidently recognize anything, return null
  console.log('⚠️ Could not confidently recognize digit');
  return null;
}

// Recognize digit from canvas
async function recognizeHandwriting() {
  try {
    await loadModel();
    if (!digitModel) {
      console.error('Recognition system not available');
      return Math.floor(Math.random() * 10);
    }

    const digit = recognizeDigitByPattern();
    console.log('Pattern-based recognition result:', digit);
    return digit;
  } catch (error) {
    console.error('Error in recognizeHandwriting:', error);
    return Math.floor(Math.random() * 10);
  }
}

// Exported for main.js to call on submit
window.getHandwritingInput = async function () {
  try {
    if (!digitModel) {
      console.log('Model not loaded, trying to load...');
      await loadModel();
      if (!digitModel) {
        console.error('Model still not available');
        return '';
      }
    }

    // Try multi-digit recognition first
    const multiDigitResult = await recognizeMultiDigit();
    if (multiDigitResult) {
      console.log('getHandwritingInput result:', multiDigitResult);
      return multiDigitResult;
    }

    // Fallback to single digit
    const singleDigit = await recognizeHandwriting();
    console.log('getHandwritingInput fallback result:', singleDigit);
    return singleDigit.toString();
  } catch (error) {
    console.error('Error in getHandwritingInput:', error);
    return '';
  }
};

// Enhanced test function with detailed analysis
window.testHandwriting = async function () {
  console.log('=== HANDWRITING RECOGNITION TEST ===');
  console.log('Current problem:', window.currentProblem);

  if (isCanvasBlank()) {
    console.log('❌ Canvas is blank - draw something first!');
    return;
  }

  // Test single digit recognition
  console.log('\n--- Single Digit Recognition ---');
  const singleResult = await recognizeHandwriting();
  console.log('✅ Single digit result:', singleResult);

  // Test multi-digit recognition
  console.log('\n--- Multi-Digit Recognition ---');
  const multiResult = await recognizeMultiDigit();
  console.log('✅ Multi-digit result:', multiResult);

  // Show what would happen in the game
  const correctAnswer = window.currentProblem ? window.currentProblem.answer : 'unknown';
  console.log('\n--- Game Logic Test ---');
  console.log('Correct answer:', correctAnswer);
  console.log('Single digit match:', parseInt(singleResult) === correctAnswer);
  console.log('Multi-digit match:', parseInt(multiResult) === correctAnswer);

  return {
    single: singleResult,
    multi: multiResult,
    correct: correctAnswer,
    singleMatch: parseInt(singleResult) === correctAnswer,
    multiMatch: parseInt(multiResult) === correctAnswer
  };
};

// Test specific digit patterns
window.testDigitPatterns = function () {
  console.log('=== DIGIT PATTERN ANALYSIS ===');

  if (isCanvasBlank()) {
    console.log('❌ Canvas is blank - draw something first!');
    return;
  }

  // Get detailed analysis
  const result = recognizeDigitByPattern();
  console.log('Final recognition result:', result);

  return result;
};

// Visual feedback for debugging
window.showRecognitionDebug = function () {
  if (isCanvasBlank()) {
    console.log('❌ Canvas is blank - draw something first!');
    return;
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let pixels = [];

  // Find pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2];
      if (r < 200 || g < 200 || b < 200) {
        pixels.push({ x, y });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  console.log('=== VISUAL ANALYSIS ===');
  console.log('Bounding box:', { minX, minY, maxX, maxY, width, height });
  console.log('Total pixels:', pixels.length);
  console.log('Aspect ratio:', (width / height).toFixed(2));

  // Draw bounding box for visual debugging
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(minX, minY, width, height);

  // Draw center lines
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, minY);
  ctx.lineTo(centerX, maxY);
  ctx.moveTo(minX, centerY);
  ctx.lineTo(maxX, centerY);
  ctx.stroke();

  console.log('✅ Visual debug overlay added to canvas');
};

// Expose functions for debugging
window.recognizeHandwriting = recognizeHandwriting;
window.recognizeMultiDigit = recognizeMultiDigit;
window.isCanvasBlank = isCanvasBlank;

// Allow main.js to clear the canvas
window.clearCanvas = clearCanvas;

// VS mode exports (compatibility with 2PlayersMathWrite main.js)
window.recognizeDigitML = recognizeDigitML;
window.hm_getDrawingBounds = getDrawingBounds;
window.hm_canvasToTensor = canvasToTensor;
window.hm_recognizeDigitMLFromCanvas = recognizeDigitML;
window.hm_segmentDigitBoundingBoxes = (sourceCanvas) => {
  const ctxSource = sourceCanvas.getContext('2d', { willReadFrequently: true });
  return segmentDigitBoundingBoxes(ctxSource, sourceCanvas.width, sourceCanvas.height);
};
window.hm_recognizeMultiDigitFromCanvas = async (sourceCanvas, len) => {
  const ctxSource = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const boxes = segmentDigitBoundingBoxes(ctxSource, sourceCanvas.width, sourceCanvas.height);
  if (boxes.length === 0) return '';

  if (boxes.length === 1) {
    const b = boxes[0];
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = b.w;
    blobCanvas.height = b.h;
    const bctx = blobCanvas.getContext('2d', { willReadFrequently: true });
    bctx.drawImage(sourceCanvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);

    const colInk = new Array(b.w).fill(0);
    const imgD = bctx.getImageData(0, 0, b.w, b.h);
    for (let x = 0; x < b.w; x++) {
      let sum = 0;
      for (let y = 0; y < b.h; y++) {
        const a = imgD.data[(y * b.w + x) * 4 + 3];
        if (a > 20) sum++;
      }
      colInk[x] = sum;
    }

    const smoothed = colInk.map((v, i) => {
      const prev = colInk[Math.max(0, i - 1)];
      const next = colInk[Math.min(colInk.length - 1, i + 1)];
      return (prev + v + next) / 3;
    });
    const globalMax = Math.max(...smoothed);

    const aspectRatio = b.w / b.h;
    let forceSplit = false;
    if (aspectRatio > 1.2 && len > 1) {
      forceSplit = true;
    }

    let candidateSplits = [];
    const splitThreshold = 0.45;
    for (let i = 2; i < smoothed.length - 2; i++) {
      const curr = smoothed[i];
      if (curr < globalMax * splitThreshold && smoothed[i - 1] >= curr && smoothed[i + 1] >= curr) {
        candidateSplits.push({ idx: i, val: curr });
      }
    }

    candidateSplits.sort((a, b) => a.val - b.val);
    const robustSplits = [];
    candidateSplits.forEach(s => {
      if (!robustSplits.some(r => Math.abs(r.idx - s.idx) < 10)) {
        robustSplits.push(s);
      }
    });

    const targetSplits = len ? len - 1 : Math.round(aspectRatio);
    const desiredSplits = Math.max(targetSplits, robustSplits.length > 0 ? 1 : 0);
    let splits = robustSplits.slice(0, desiredSplits).map(o => o.idx).sort((a, b) => a - b);

    if (splits.length === 0) {
      if (forceSplit && len > 1) {
        const segmentW = b.w / len;
        for (let k = 1; k < len; k++) {
          splits.push(Math.floor(k * segmentW));
        }
      } else {
        const { digit } = await recognizeDigitML(blobCanvas);
        return digit.toString();
      }
    }

    const subResults = [];
    let startX = 0;
    for (const s of splits) {
      subResults.push([startX, s]);
      startX = s;
    }
    subResults.push([startX, b.w]);

    let composite = '';
    for (const [sx, ex] of subResults) {
      const segW = ex - sx;
      if (segW < 5) continue;

      const subBW = segW + 8;
      const subBH = b.h + 8;
      const finalSeg = document.createElement('canvas');
      finalSeg.width = subBW;
      finalSeg.height = subBH;
      const fctx = finalSeg.getContext('2d', { willReadFrequently: true });
      fctx.fillStyle = 'white';
      fctx.fillRect(0, 0, subBW, subBH);
      fctx.drawImage(blobCanvas, sx, 0, segW, b.h, 4, 4, segW, b.h);

      const { digit } = await recognizeDigitML(finalSeg);
      composite += digit.toString();
    }
    return composite;
  }

  let result = '';
  for (const box of boxes) {
    const sub = document.createElement('canvas');
    sub.width = box.w;
    sub.height = box.h;
    const sctx = sub.getContext('2d');
    sctx.drawImage(sourceCanvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const { digit } = await recognizeDigitML(sub);
    result += digit.toString();
  }
  if (len && result.length !== len) {
    let bounds = null;
    if (boxes.length > 0) {
      const minX = Math.min(...boxes.map(box => box.x));
      const minY = Math.min(...boxes.map(box => box.y));
      const maxX = Math.max(...boxes.map(box => box.x + box.w));
      const maxY = Math.max(...boxes.map(box => box.y + box.h));
      bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    const baseW = bounds ? bounds.w : sourceCanvas.width;
    const baseH = bounds ? bounds.h : sourceCanvas.height;
    const baseX = bounds ? bounds.x : 0;
    const evenWidth = Math.floor(baseW / len);
    let evenResult = '';
    for (let i = 0; i < len; i++) {
      const subC = document.createElement('canvas');
      subC.width = evenWidth;
      subC.height = baseH;
      const scx = subC.getContext('2d');
      scx.drawImage(sourceCanvas, baseX + i * evenWidth, 0, evenWidth, baseH, 0, 0, evenWidth, baseH);
      const { digit } = await recognizeDigitML(subC);
      evenResult += digit.toString();
    }
    return evenResult;
  }
  return result;
};