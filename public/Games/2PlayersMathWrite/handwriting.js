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
const SUBMIT_DELAY_MS = 900;
let idleTimer = null;
let inkRevision = 0;

function cancelRecognition() {
  clearTimeout(idleTimer);
  idleTimer = null;
  inkRevision++;
}

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
  if (!gameState.running) return;
  cancelRecognition();
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

}

function endDraw(event) {
  if (!drawing) return;
  drawing = false;
  canvas.classList.remove('drawing');
  if (event.type === 'touchcancel') return;
  const status = document.getElementById('canvas-status');
  if (status) status.textContent = 'Waiting for ink...';
  idleTimer = setTimeout(tryAutoSubmit, SUBMIT_DELAY_MS);
}

function clearCanvas() {
  cancelRecognition();
  drawing = false;
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

async function tryAutoSubmit() {
  idleTimer = null;
  const problem = window.currentProblem;
  const revision = inkRevision;
  if (!problem || !gameState.running || drawing) return;
  const status = document.getElementById('canvas-status');
  const current = () => inkRevision === revision && gameState.running && window.currentProblem === problem;
  canvas.classList.add('processing');
  if (status) status.textContent = 'Reading your answer...';
  try {
    const answer = await WriteMathRecognition.recognize(canvas, String(problem.answer).length);
    if (!current()) return;
    if (!answer) {
      if (status) status.textContent = 'Unclear — write again or clear the pad';
      return;
    }
    if (answer === String(problem.answer)) {
      if (status) status.textContent = `Read: ${answer}`;
      showPopup(`Correct! (${answer})`, true);
      window.onAutoCorrect();
    } else {
      showPopup(`Incorrect (I saw: ${answer})`, false);
      clearCanvas();
    }
  } catch (error) {
    if (!current()) return;
    console.error('Handwriting recognition failed', error);
    if (status) status.textContent = 'Recognition unavailable. Draw again to retry.';
  } finally {
    if (inkRevision === revision) canvas.classList.remove('processing');
  }
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('touchcancel', endDraw);

window.clearCanvas = clearCanvas;
window.getHandwritingInput = () => WriteMathRecognition.recognize(canvas);

const modelStatus = document.getElementById('model-status');
let warmupPromise;
window.hm_warmupRecognition = () => {
  if (!warmupPromise) {
    warmupPromise = WriteMathRecognition.warmup().then(() => {
      if (modelStatus) modelStatus.hidden = true;
    }).catch(error => {
      warmupPromise = null;
      if (modelStatus) modelStatus.textContent = 'Handwriting will retry when you draw';
      throw error;
    });
  }
  return warmupPromise;
};
window.hm_warmupRecognition().catch(error => console.warn('Handwriting warmup failed', error));
