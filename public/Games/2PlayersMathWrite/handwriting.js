/**
 * WORLD-CLASS HANDWRITING RECOGNITION ENGINE v2.0
 * Ultra-high accuracy digit recognition with advanced ML and pattern analysis
 * 
 * Features:
 * - Multi-model ensemble with fallback chain
 * - Advanced MNIST-style preprocessing with data augmentation
 * - Sophisticated geometric pattern analysis
 * - Multi-pass recognition with confidence boosting
 * - Optimized for both single and multi-digit numbers
 * - Real-time stroke analysis and temporal features
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION - Tuned for maximum accuracy
  // ============================================================================
  const CONFIG = {
    // Recognition timing
    SUBMIT_DELAY_MS: 600,           // Fast but accurate
    
    // Preprocessing
    MNIST_SIZE: 28,
    PADDING_RATIO: 0.12,            // Border padding
    CONTRAST_BOOST: 0.08,           // Subtle contrast enhancement
    NOISE_THRESHOLD: 20,            // Alpha threshold for noise removal
    
    // Recognition thresholds
    MIN_CONFIDENCE: 0.55,           // Lower threshold for better recall
    HIGH_CONFIDENCE: 0.80,          // High confidence threshold
    VERY_HIGH_CONFIDENCE: 0.92,     // Skip pattern check if CNN is very confident
    AMBIGUITY_THRESHOLD: 0.12,      // Max diff between top 2 for ambiguity
    
    // Stroke analysis
    MIN_STROKE_POINTS: 5,           // Minimum points for valid stroke
    STROKE_WIDTH_BASE: 8,           // Base stroke width at 480px
    
    // Segmentation
    MIN_COMPONENT_SIZE: 10,         // Minimum blob size
    MERGE_DISTANCE: 12,             // Max gap to merge components
    VALLEY_THRESHOLD: 0.12,         // Valley detection sensitivity
    
    // Multi-pass augmentation
    AUGMENTATION_PASSES: 3,         // Number of augmented predictions
    
    // Model URLs - Multiple reliable sources with fallbacks
    CNN_MODEL_URLS: [
      // Primary sources
      'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json',
      'https://cdn.jsdelivr.net/gh/nickovchinnikov/mnist-tfjs@master/model/model.json',
      'https://cdn.jsdelivr.net/gh/niconielsen32/MNIST-TensorFlowJS@main/models/mymodel/model.json',
      // Fallback sources
      'https://cdn.jsdelivr.net/gh/CreativeGP/tensorflowjs-mnist@master/model/model.json',
      'https://cdn.jsdelivr.net/gh/sethjuarez/tfjsmnist@master/model/model.json'
    ]
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const State = {
    canvas: null,
    ctx: null,
    drawing: false,
    lastX: 0,
    lastY: 0,
    
    // Recognition state
    cnnModel: null,
    modelLoading: false,
    modelReady: false,
    modelInputShape: null,
    
    // Stroke tracking
    currentStroke: [],
    allStrokes: [],
    strokeStartTime: 0,
    
    // Active touches for multi-touch
    activeTouches: new Map(),
    
    // Performance tracking
    recognitionCount: 0,
    avgRecognitionTime: 0
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  function init() {
    State.canvas = document.getElementById('handwriting-canvas');
    if (!State.canvas) return;
    
    State.ctx = State.canvas.getContext('2d', { willReadFrequently: true });
    
    // Setup canvas
    resizeCanvasForDPI();
    setupEventListeners();
    
    // Load recognition models
    loadAllModels();
    
    console.log('[Handwriting] World-class recognition engine v2.0 initialized');
  }

  function resizeCanvasForDPI() {
    const canvas = State.canvas;
    const ctx = State.ctx;
    
    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const newW = Math.max(1, Math.round(cssW * scale));
    const newH = Math.max(1, Math.round(cssH * scale));
    
    if (canvas.width !== newW || canvas.height !== newH) {
      // Preserve content during resize
      const prev = document.createElement('canvas');
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext('2d').drawImage(canvas, 0, 0);
      
      canvas.width = newW;
      canvas.height = newH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      
      if (prev.width && prev.height) {
        ctx.drawImage(prev, 0, 0, prev.width / scale, prev.height / scale);
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }

  // ============================================================================
  // MODEL LOADING - Multi-source with intelligent fallback
  // ============================================================================
  async function loadAllModels() {
    const statusDiv = document.getElementById('model-status');
    
    try {
      await loadCNNModel(statusDiv);
    } catch (err) {
      console.error('[Models] All CNN sources failed:', err);
      if (statusDiv) {
        statusDiv.textContent = 'Ready (pattern mode)';
        setTimeout(() => statusDiv.style.display = 'none', 2000);
      }
    }
  }

  async function loadCNNModel(statusDiv) {
    if (State.cnnModel || State.modelLoading) return;
    
    State.modelLoading = true;
    if (statusDiv) statusDiv.textContent = 'Loading ML model...';
    
    for (const url of CONFIG.CNN_MODEL_URLS) {
      try {
        console.log('[CNN] Trying:', url);
        
        // Set timeout for model loading
        const loadPromise = tf.loadLayersModel(url);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        );
        
        State.cnnModel = await Promise.race([loadPromise, timeoutPromise]);
        
        // Detect model input shape
        const inputShape = State.cnnModel.inputs[0].shape;
        State.modelInputShape = inputShape;
        console.log('[CNN] Model input shape:', inputShape);
        
        // Warm up the model with correct input shape
        const warmupShape = inputShape.map((dim, i) => dim === null ? 1 : dim);
        const warmup = tf.zeros(warmupShape);
        
        // Run multiple warmup passes
        for (let i = 0; i < 3; i++) {
          const pred = State.cnnModel.predict(warmup);
          pred.dispose();
        }
        warmup.dispose();
        
        console.log('[CNN] Model loaded and warmed up from:', url);
        State.modelReady = true;
        
        if (statusDiv) {
          statusDiv.textContent = 'ML model ready!';
          setTimeout(() => statusDiv.style.display = 'none', 1500);
        }
        
        State.modelLoading = false;
        return;
      } catch (err) {
        console.warn('[CNN] Failed:', url, err.message);
      }
    }
    
    State.modelLoading = false;
    throw new Error('All CNN model URLs failed');
  }

  // ============================================================================
  // ADVANCED PREPROCESSING PIPELINE
  // ============================================================================
  
  /**
   * Preprocess canvas for CNN with MNIST-style normalization
   */
  function preprocessForCNN(sourceCanvas, augment = false) {
    const size = CONFIG.MNIST_SIZE;
    const padding = Math.floor(size * CONFIG.PADDING_RATIO);
    const innerSize = size - 2 * padding;
    
    // Get tight bounding box
    const bounds = getDrawingBounds(sourceCanvas);
    if (!bounds || bounds.width < 3 || bounds.height < 3) return null;
    
    // Create preprocessing canvas
    const processed = document.createElement('canvas');
    processed.width = size;
    processed.height = size;
    const pctx = processed.getContext('2d');
    
    // White background
    pctx.fillStyle = 'white';
    pctx.fillRect(0, 0, size, size);
    
    // Calculate aspect-preserving scale
    const scale = Math.min(innerSize / bounds.width, innerSize / bounds.height) * 0.85;
    const scaledW = bounds.width * scale;
    const scaledH = bounds.height * scale;
    
    // Center of mass centering (MNIST-style)
    const centerOfMass = computeCenterOfMass(sourceCanvas, bounds);
    
    // Apply augmentation if requested
    let offsetX = size / 2;
    let offsetY = size / 2;
    let rotation = 0;
    let scaleAug = 1.0;
    
    if (augment) {
      // Random small shifts and rotations for robustness
      offsetX += (Math.random() - 0.5) * 3;
      offsetY += (Math.random() - 0.5) * 3;
      rotation = (Math.random() - 0.5) * 0.15; // ~8.5 degrees max
      scaleAug = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
    }
    
    // High quality resampling
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    
    // Apply transformations
    pctx.save();
    pctx.translate(offsetX, offsetY);
    if (rotation !== 0) pctx.rotate(rotation);
    pctx.scale(scaleAug, scaleAug);
    
    // Draw centered on center of mass
    const drawX = -(centerOfMass.x - bounds.x) * scale;
    const drawY = -(centerOfMass.y - bounds.y) * scale;
    
    pctx.drawImage(
      sourceCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      drawX, drawY, scaledW, scaledH
    );
    
    pctx.restore();
    
    // Apply stroke enhancement
    enhanceStrokes(pctx, size, size);
    
    return processed;
  }

  /**
   * Compute center of mass for MNIST-style centering
   */
  function computeCenterOfMass(canvas, bounds) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
    const data = imgData.data;
    
    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;
    
    for (let y = 0; y < bounds.height; y++) {
      for (let x = 0; x < bounds.width; x++) {
        const idx = (y * bounds.width + x) * 4;
        // Use darkness as mass (consider RGB for colored strokes)
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const darkness = (255 - (r + g + b) / 3) * (a / 255);
        
        if (darkness > CONFIG.NOISE_THRESHOLD) {
          totalMass += darkness;
          sumX += x * darkness;
          sumY += y * darkness;
        }
      }
    }
    
    if (totalMass === 0) {
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }
    
    return {
      x: bounds.x + sumX / totalMass,
      y: bounds.y + sumY / totalMass
    };
  }

  /**
   * Enhance strokes for better recognition
   */
  function enhanceStrokes(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const output = new Uint8ClampedArray(data);
    
    // Light dilation and smoothing
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Check 3x3 neighborhood
        let minVal = 255;
        let avgVal = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nidx = ((y + dy) * width + (x + dx)) * 4;
            minVal = Math.min(minVal, data[nidx]);
            avgVal += data[nidx];
            count++;
          }
        }
        avgVal /= count;
        
        // Slight dilation for broken strokes
        if (minVal < 200 && data[idx] > minVal + 30) {
          const newVal = Math.min(data[idx], (minVal + avgVal) / 2 + 20);
          output[idx] = output[idx + 1] = output[idx + 2] = newVal;
        }
      }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0);
  }

  /**
   * Get tight bounding box with smart padding
   */
  function getDrawingBounds(canvas) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const { width, height } = canvas;
    
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasContent = false;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        // Also check for dark pixels (black ink)
        const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 200;
        
        if (alpha > CONFIG.NOISE_THRESHOLD || (alpha > 10 && isDark)) {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (!hasContent) return null;
    
    // Smart padding based on digit size
    const size = Math.max(maxX - minX, maxY - minY);
    const padding = Math.max(2, Math.min(8, Math.floor(size * 0.06)));
    
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(width - minX + padding, maxX - minX + 2 * padding),
      height: Math.min(height - minY + padding, maxY - minY + 2 * padding)
    };
  }

  /**
   * Convert canvas to TensorFlow tensor
   */
  function canvasToTensor(sourceCanvas, augment = false) {
    const processed = preprocessForCNN(sourceCanvas || State.canvas, augment);
    if (!processed) return null;
    
    return tf.tidy(() => {
      // Convert to grayscale
      const img = tf.browser.fromPixels(processed, 1).toFloat();
      
      // Normalize to 0-1
      let normalized = img.div(255.0);
      
      // Invert (MNIST: white digit on black background)
      normalized = tf.scalar(1.0).sub(normalized);
      
      // Light contrast boost
      const boosted = normalized.sub(CONFIG.CONTRAST_BOOST).clipByValue(0, 1);
      
      // Handle different model input shapes
      const inputShape = State.modelInputShape;
      
      if (inputShape && inputShape.length === 4) {
        // Standard [batch, height, width, channels]
        return boosted.expandDims(0);
      } else if (inputShape && inputShape.length === 3) {
        // Some models expect [batch, height, width]
        return boosted.squeeze(-1).expandDims(0);
      } else {
        // Default: [1, 28, 28, 1]
        return boosted.expandDims(0);
      }
    });
  }

  // ============================================================================
  // CNN RECOGNITION - Multi-pass with augmentation
  // ============================================================================
  
  async function recognizeCNN(sourceCanvas) {
    if (!State.cnnModel) {
      await loadCNNModel();
      if (!State.cnnModel) return null;
    }
    
    try {
      // Multi-pass recognition with augmentation for robustness
      const allProbs = [];
      
      // Original (no augmentation) - highest weight
      const input0 = canvasToTensor(sourceCanvas, false);
      if (!input0) return null;
      
      const pred0 = State.cnnModel.predict(input0);
      const probs0 = await pred0.data();
      allProbs.push({ probs: Array.from(probs0), weight: 2.0 });
      tf.dispose([input0, pred0]);
      
      // Augmented passes
      for (let i = 0; i < CONFIG.AUGMENTATION_PASSES; i++) {
        const input = canvasToTensor(sourceCanvas, true);
        if (input) {
          const pred = State.cnnModel.predict(input);
          const probs = await pred.data();
          allProbs.push({ probs: Array.from(probs), weight: 0.8 });
          tf.dispose([input, pred]);
        }
      }
      
      // Weighted average of probabilities
      const finalProbs = new Array(10).fill(0);
      let totalWeight = 0;
      
      for (const { probs, weight } of allProbs) {
        for (let d = 0; d < 10; d++) {
          finalProbs[d] += probs[d] * weight;
        }
        totalWeight += weight;
      }
      
      for (let d = 0; d < 10; d++) {
        finalProbs[d] /= totalWeight;
      }
      
      // Get top predictions
      const results = finalProbs
        .map((conf, digit) => ({ digit, confidence: conf }))
        .sort((a, b) => b.confidence - a.confidence);
      
      const best = results[0];
      const second = results[1];
      
      return {
        digit: best.digit,
        confidence: best.confidence,
        secondChoice: second.digit,
        secondConfidence: second.confidence,
        isAmbiguous: (best.confidence - second.confidence) < CONFIG.AMBIGUITY_THRESHOLD,
        allProbs: finalProbs
      };
    } catch (err) {
      console.error('[CNN] Recognition error:', err);
      return null;
    }
  }

  // ============================================================================
  // ENHANCED PATTERN-BASED RECOGNITION
  // ============================================================================
  
  function recognizeByPattern(sourceCanvas) {
    const canvas = sourceCanvas || State.canvas;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const features = extractGeometricFeatures(imgData, canvas.width, canvas.height);
    if (!features) return null;
    
    // Score each digit with enhanced heuristics
    const scores = [];
    for (let d = 0; d <= 9; d++) {
      const score = computeDigitScore(d, features);
      scores.push({ digit: d, score, features });
    }
    
    scores.sort((a, b) => b.score - a.score);
    
    const best = scores[0];
    const maxPossible = 120; // Approximate max score
    const confidence = Math.min(1, Math.max(0, best.score / maxPossible));
    
    return {
      digit: best.digit,
      confidence,
      secondChoice: scores[1].digit,
      secondConfidence: scores[1].score / maxPossible,
      scores: scores.slice(0, 5)
    };
  }

  /**
   * Extract comprehensive geometric features
   */
  function extractGeometricFeatures(imgData, width, height) {
    const data = imgData.data;
    const pixels = [];
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    // Collect ink pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 200;
        
        if (alpha > CONFIG.NOISE_THRESHOLD || (alpha > 10 && isDark)) {
          pixels.push({ x, y, alpha });
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (pixels.length < CONFIG.MIN_STROKE_POINTS) return null;
    
    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Regional analysis
    const quadrants = { TL: 0, TR: 0, BL: 0, BR: 0 };
    const thirds = { top: 0, mid: 0, bot: 0, left: 0, center: 0, right: 0 };
    const fifths = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 };
    let centerCore = 0;
    let edgePixels = 0;
    
    // Horizontal and vertical projections
    const hProj = new Array(bboxH).fill(0);
    const vProj = new Array(bboxW).fill(0);
    
    pixels.forEach(p => {
      const relX = p.x - minX;
      const relY = p.y - minY;
      const normX = relX / bboxW;
      const normY = relY / bboxH;
      
      // Quadrants
      if (p.x < centerX) {
        if (p.y < centerY) quadrants.TL++;
        else quadrants.BL++;
      } else {
        if (p.y < centerY) quadrants.TR++;
        else quadrants.BR++;
      }
      
      // Horizontal thirds
      if (normY < 0.33) thirds.top++;
      else if (normY < 0.67) thirds.mid++;
      else thirds.bot++;
      
      // Vertical thirds
      if (normX < 0.33) thirds.left++;
      else if (normX < 0.67) thirds.center++;
      else thirds.right++;
      
      // Horizontal fifths
      if (normY < 0.2) fifths.t1++;
      else if (normY < 0.4) fifths.t2++;
      else if (normY < 0.6) fifths.t3++;
      else if (normY < 0.8) fifths.t4++;
      else fifths.t5++;
      
      // Center core
      if (Math.abs(p.x - centerX) < bboxW * 0.18 && 
          Math.abs(p.y - centerY) < bboxH * 0.18) {
        centerCore++;
      }
      
      // Edge detection
      if (relX <= 1 || relX >= bboxW - 2 || relY <= 1 || relY >= bboxH - 2) {
        edgePixels++;
      }
      
      // Projections
      if (relY >= 0 && relY < bboxH) hProj[Math.floor(relY)]++;
      if (relX >= 0 && relX < bboxW) vProj[Math.floor(relX)]++;
    });
    
    const total = pixels.length;
    
    // Detect holes/loops (critical for 0, 6, 8, 9)
    const holes = detectHoles(imgData, width, height, minX, minY, maxX, maxY);
    
    // Aspect ratio
    const aspectRatio = bboxW / bboxH;
    
    // Stroke characteristics
    const verticalStrength = computeVerticalStrength(vProj, bboxW);
    const horizontalStrength = computeHorizontalStrength(hProj, bboxH);
    
    // Curvature analysis
    const curvature = analyzeCurvature(pixels, centerX, centerY);
    
    // Density analysis
    const density = total / (bboxW * bboxH);
    
    // Opening detection (for digits like 3, 5)
    const openings = detectOpenings(hProj, vProj, bboxW, bboxH);
    
    return {
      aspectRatio,
      quadrants: {
        TL: quadrants.TL / total,
        TR: quadrants.TR / total,
        BL: quadrants.BL / total,
        BR: quadrants.BR / total
      },
      thirds: {
        top: thirds.top / total,
        mid: thirds.mid / total,
        bot: thirds.bot / total,
        left: thirds.left / total,
        center: thirds.center / total,
        right: thirds.right / total
      },
      fifths: {
        t1: fifths.t1 / total,
        t2: fifths.t2 / total,
        t3: fifths.t3 / total,
        t4: fifths.t4 / total,
        t5: fifths.t5 / total
      },
      centerCore: centerCore / total,
      edgeRatio: edgePixels / total,
      holes,
      verticalStrength,
      horizontalStrength,
      curvature,
      density,
      openings,
      pixelCount: total,
      bboxW,
      bboxH
    };
  }

  /**
   * Detect enclosed regions (holes) using flood fill
   */
  function detectHoles(imgData, width, height, minX, minY, maxX, maxY) {
    const data = imgData.data;
    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    
    // Create binary grid
    const grid = new Uint8Array(bboxW * bboxH);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 200;
        
        if (alpha > CONFIG.NOISE_THRESHOLD || (alpha > 10 && isDark)) {
          grid[(y - minY) * bboxW + (x - minX)] = 1;
        }
      }
    }
    
    // Flood fill from edges to mark outside
    const outside = new Uint8Array(bboxW * bboxH);
    const stack = [];
    
    // Add edge pixels to stack
    for (let x = 0; x < bboxW; x++) {
      if (!grid[x]) stack.push([x, 0]);
      if (!grid[(bboxH - 1) * bboxW + x]) stack.push([x, bboxH - 1]);
    }
    for (let y = 1; y < bboxH - 1; y++) {
      if (!grid[y * bboxW]) stack.push([0, y]);
      if (!grid[y * bboxW + bboxW - 1]) stack.push([bboxW - 1, y]);
    }
    
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= bboxW || y >= bboxH) continue;
      
      const idx = y * bboxW + x;
      if (outside[idx] || grid[idx]) continue;
      
      outside[idx] = 1;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    // Find and count holes
    let holePixels = 0;
    let holeCount = 0;
    const holeVisited = new Uint8Array(bboxW * bboxH);
    const holeInfo = [];
    
    for (let y = 1; y < bboxH - 1; y++) {
      for (let x = 1; x < bboxW - 1; x++) {
        const idx = y * bboxW + x;
        if (!grid[idx] && !outside[idx] && !holeVisited[idx]) {
          // New hole found
          holeCount++;
          let holeSize = 0;
          let holeSumY = 0;
          
          const holeStack = [[x, y]];
          while (holeStack.length) {
            const [hx, hy] = holeStack.pop();
            if (hx < 0 || hy < 0 || hx >= bboxW || hy >= bboxH) continue;
            
            const hidx = hy * bboxW + hx;
            if (holeVisited[hidx] || grid[hidx] || outside[hidx]) continue;
            
            holeVisited[hidx] = 1;
            holeSize++;
            holeSumY += hy;
            holePixels++;
            holeStack.push([hx + 1, hy], [hx - 1, hy], [hx, hy + 1], [hx, hy - 1]);
          }
          
          if (holeSize > 3) {
            holeInfo.push({
              size: holeSize,
              centerY: holeSumY / holeSize / bboxH // Normalized Y position
            });
          } else {
            holeCount--; // Too small, not a real hole
          }
        }
      }
    }
    
    // Determine hole positions
    let topHole = false, bottomHole = false, midHole = false;
    for (const h of holeInfo) {
      if (h.centerY < 0.35) topHole = true;
      else if (h.centerY > 0.65) bottomHole = true;
      else midHole = true;
    }
    
    return {
      count: holeCount,
      area: holePixels / (bboxW * bboxH),
      topHole,
      bottomHole,
      midHole,
      info: holeInfo
    };
  }

  /**
   * Compute vertical stroke concentration
   */
  function computeVerticalStrength(vProj, width) {
    if (width < 3) return 0;
    
    const max = Math.max(...vProj);
    if (max === 0) return 0;
    
    const threshold = max * 0.4;
    let strongColumns = 0;
    let centerWeight = 0;
    
    for (let i = 0; i < vProj.length; i++) {
      if (vProj[i] > threshold) {
        strongColumns++;
        // Weight by distance from center (more central = higher weight)
        const distFromCenter = Math.abs(i - width / 2) / (width / 2);
        centerWeight += (1 - distFromCenter) * vProj[i];
      }
    }
    
    // Narrower distribution = higher vertical strength
    const concentration = 1 - (strongColumns / width);
    return concentration;
  }

  /**
   * Compute horizontal stroke presence
   */
  function computeHorizontalStrength(hProj, height) {
    if (height < 3) return 0;
    
    const max = Math.max(...hProj);
    if (max === 0) return 0;
    
    // Find strong horizontal strokes (high density rows)
    const threshold = max * 0.5;
    let topStrength = 0, midStrength = 0, botStrength = 0;
    
    const topZone = Math.floor(height * 0.25);
    const botZone = Math.floor(height * 0.75);
    
    for (let i = 0; i < hProj.length; i++) {
      if (hProj[i] > threshold) {
        if (i < topZone) topStrength += hProj[i];
        else if (i > botZone) botStrength += hProj[i];
        else midStrength += hProj[i];
      }
    }
    
    const total = topStrength + midStrength + botStrength;
    if (total === 0) return 0;
    
    return {
      top: topStrength / total,
      mid: midStrength / total,
      bot: botStrength / total,
      total: total / (max * height)
    };
  }

  /**
   * Analyze curvature and symmetry
   */
  function analyzeCurvature(pixels, centerX, centerY) {
    if (pixels.length < 10) return { isRound: false, symmetry: 0.5 };
    
    // Angular distribution
    const angleBins = new Array(12).fill(0);
    pixels.forEach(p => {
      const angle = Math.atan2(p.y - centerY, p.x - centerX);
      const bin = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 12) % 12;
      angleBins[bin]++;
    });
    
    const avgBin = pixels.length / 12;
    const variance = angleBins.reduce((sum, b) => sum + (b - avgBin) ** 2, 0) / 12;
    const isRound = variance < (avgBin * avgBin * 0.6);
    
    // Horizontal symmetry
    let leftPixels = 0, rightPixels = 0;
    pixels.forEach(p => {
      if (p.x < centerX) leftPixels++;
      else rightPixels++;
    });
    const hSymmetry = 1 - Math.abs(leftPixels - rightPixels) / pixels.length;
    
    // Vertical symmetry
    let topPixels = 0, bottomPixels = 0;
    pixels.forEach(p => {
      if (p.y < centerY) topPixels++;
      else bottomPixels++;
    });
    const vSymmetry = 1 - Math.abs(topPixels - bottomPixels) / pixels.length;
    
    return { 
      isRound, 
      symmetry: (hSymmetry + vSymmetry) / 2,
      hSymmetry,
      vSymmetry
    };
  }

  /**
   * Detect openings in the digit shape
   */
  function detectOpenings(hProj, vProj, width, height) {
    const maxH = Math.max(...hProj);
    const maxV = Math.max(...vProj);
    
    // Find gaps in projections (openings)
    const hGaps = [], vGaps = [];
    const hThreshold = maxH * 0.15;
    const vThreshold = maxV * 0.15;
    
    for (let i = 1; i < hProj.length - 1; i++) {
      if (hProj[i] < hThreshold && (hProj[i-1] > hThreshold || hProj[i+1] > hThreshold)) {
        hGaps.push(i / height);
      }
    }
    
    for (let i = 1; i < vProj.length - 1; i++) {
      if (vProj[i] < vThreshold && (vProj[i-1] > vThreshold || vProj[i+1] > vThreshold)) {
        vGaps.push(i / width);
      }
    }
    
    return {
      horizontal: hGaps,
      vertical: vGaps,
      leftOpen: vProj[0] < vThreshold,
      rightOpen: vProj[width - 1] < vThreshold,
      topOpen: hProj[0] < hThreshold,
      bottomOpen: hProj[height - 1] < hThreshold
    };
  }

  /**
   * Enhanced digit scoring with refined heuristics
   */
  function computeDigitScore(digit, f) {
    let score = 0;
    
    switch (digit) {
      case 0:
        // Oval/circular, 1 hole, balanced, hollow center
        if (f.holes.count === 1) score += 45;
        else if (f.holes.count === 0 && f.centerCore < 0.1) score += 15;
        if (f.aspectRatio > 0.55 && f.aspectRatio < 1.4) score += 15;
        if (f.curvature.isRound) score += 20;
        if (f.centerCore < 0.12) score += 15; // Hollow center
        if (f.curvature.symmetry > 0.7) score += 10;
        if (Math.abs(f.quadrants.TL - f.quadrants.BR) < 0.12) score += 10;
        break;
        
      case 1:
        // Narrow, vertical, no holes
        if (f.aspectRatio < 0.45) score += 35;
        else if (f.aspectRatio < 0.6) score += 20;
        if (f.verticalStrength > 0.65) score += 30;
        if (f.holes.count === 0) score += 15;
        if (f.thirds.center > 0.45 || f.thirds.left > 0.55 || f.thirds.right > 0.55) score += 15;
        if (f.density > 0.15) score += 5;
        break;
        
      case 2:
        // Top curve, bottom horizontal, no holes
        if (f.holes.count === 0) score += 20;
        if (f.thirds.bot > 0.38) score += 25;
        if (f.quadrants.TR > 0.22) score += 15;
        if (f.quadrants.BL > 0.22) score += 15;
        if (f.fifths.t5 > 0.25) score += 10; // Bottom heavy
        if (f.aspectRatio > 0.5 && f.aspectRatio < 1.3) score += 10;
        break;
        
      case 3:
        // Two curves on right, no holes
        if (f.holes.count === 0) score += 15;
        if (f.thirds.right > 0.42) score += 30;
        if (f.openings.leftOpen) score += 15;
        if (f.thirds.mid < 0.32 && f.thirds.top > 0.28 && f.thirds.bot > 0.28) score += 20;
        if (f.aspectRatio > 0.5 && f.aspectRatio < 1.2) score += 10;
        break;
        
      case 4:
        // Intersection, no holes, angle shape
        if (f.holes.count === 0) score += 20;
        else if (f.holes.count === 1 && f.holes.area < 0.08) score += 10;
        if (f.quadrants.TL > 0.22) score += 20;
        if (f.thirds.right > 0.32) score += 15;
        if (f.verticalStrength > 0.35) score += 15;
        if (f.horizontalStrength.mid > 0.3) score += 10;
        break;
        
      case 5:
        // Top horizontal, bottom curve, no holes
        if (f.holes.count === 0) score += 20;
        if (f.fifths.t1 > 0.18 && f.quadrants.TL > 0.22) score += 25;
        if (f.thirds.right > 0.3 && f.quadrants.BR > 0.2) score += 20;
        if (f.openings.rightOpen && !f.openings.leftOpen) score += 15;
        if (f.aspectRatio > 0.5 && f.aspectRatio < 1.2) score += 10;
        break;
        
      case 6:
        // One hole in bottom half, curved top tail
        if (f.holes.count === 1 && f.holes.bottomHole) score += 45;
        else if (f.holes.count === 1) score += 30;
        if (f.quadrants.BL > 0.22 && f.quadrants.BR > 0.18) score += 20;
        if (f.thirds.bot > 0.42) score += 15;
        if (f.fifths.t1 > 0.12) score += 10; // Top tail
        break;
        
      case 7:
        // Horizontal top, diagonal, no holes
        if (f.holes.count === 0) score += 20;
        if (f.fifths.t1 > 0.3) score += 30;
        if (f.horizontalStrength.top > 0.4) score += 15;
        if (f.quadrants.TR > 0.28) score += 15;
        if (f.thirds.bot < 0.3) score += 10;
        if (f.aspectRatio > 0.4 && f.aspectRatio < 1.3) score += 10;
        break;
        
      case 8:
        // Two holes, balanced, figure-8
        if (f.holes.count === 2) score += 50;
        else if (f.holes.count === 1 && f.holes.midHole) score += 25;
        if (Math.abs(f.thirds.top - f.thirds.bot) < 0.12) score += 20;
        if (f.curvature.symmetry > 0.72) score += 15;
        if (f.centerCore > 0.08) score += 10;
        if (f.aspectRatio > 0.5 && f.aspectRatio < 1.2) score += 10;
        break;
        
      case 9:
        // One hole in top half, tail going down
        if (f.holes.count === 1 && f.holes.topHole) score += 45;
        else if (f.holes.count === 1) score += 25;
        if (f.thirds.top > 0.42) score += 20;
        if (f.quadrants.TR > 0.22 && f.quadrants.TL > 0.18) score += 15;
        if (f.fifths.t5 > 0.12) score += 10; // Bottom tail
        break;
    }
    
    return score;
  }

  // ============================================================================
  // MULTI-DIGIT RECOGNITION
  // ============================================================================
  
  function segmentDigits(sourceCanvas) {
    const canvas = sourceCanvas || State.canvas;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const components = findConnectedComponents(imgData, canvas.width, canvas.height);
    
    if (components.length === 0) return [];
    
    // Merge close components
    const merged = mergeCloseComponents(components);
    
    // Sort left to right
    merged.sort((a, b) => a.x - b.x);
    
    return merged;
  }

  function findConnectedComponents(imgData, width, height) {
    const data = imgData.data;
    const visited = new Uint8Array(width * height);
    const components = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        
        const pixelIdx = idx * 4;
        const alpha = data[pixelIdx + 3];
        const isDark = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3 < 200;
        
        if (alpha <= CONFIG.NOISE_THRESHOLD && !(alpha > 10 && isDark)) continue;
        
        // Start new component
        const comp = { minX: x, maxX: x, minY: y, maxY: y, pixels: [] };
        const stack = [[x, y]];
        visited[idx] = 1;
        
        while (stack.length) {
          const [cx, cy] = stack.pop();
          comp.pixels.push([cx, cy]);
          comp.minX = Math.min(comp.minX, cx);
          comp.maxX = Math.max(comp.maxX, cx);
          comp.minY = Math.min(comp.minY, cy);
          comp.maxY = Math.max(comp.maxY, cy);
          
          // 8-connected neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = cx + dx, ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
              
              const nidx = ny * width + nx;
              if (visited[nidx]) continue;
              
              const nPixelIdx = nidx * 4;
              const nalpha = data[nPixelIdx + 3];
              const nIsDark = (data[nPixelIdx] + data[nPixelIdx + 1] + data[nPixelIdx + 2]) / 3 < 200;
              
              if (nalpha > CONFIG.NOISE_THRESHOLD || (nalpha > 10 && nIsDark)) {
                visited[nidx] = 1;
                stack.push([nx, ny]);
              }
            }
          }
        }
        
        if (comp.pixels.length >= CONFIG.MIN_COMPONENT_SIZE) {
          comp.x = comp.minX;
          comp.y = comp.minY;
          comp.w = comp.maxX - comp.minX + 1;
          comp.h = comp.maxY - comp.minY + 1;
          components.push(comp);
        }
      }
    }
    
    return components;
  }

  function mergeCloseComponents(components) {
    if (components.length <= 1) return components;
    
    const merged = [];
    const used = new Set();
    
    for (let i = 0; i < components.length; i++) {
      if (used.has(i)) continue;
      
      let current = { ...components[i] };
      used.add(i);
      
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < components.length; j++) {
          if (used.has(j)) continue;
          
          const other = components[j];
          const gapX = Math.max(0, 
            Math.max(current.x, other.x) - 
            Math.min(current.x + current.w, other.x + other.w)
          );
          const gapY = Math.max(0,
            Math.max(current.y, other.y) -
            Math.min(current.y + current.h, other.y + other.h)
          );
          
          if (gapX <= CONFIG.MERGE_DISTANCE && gapY <= CONFIG.MERGE_DISTANCE) {
            const newMinX = Math.min(current.x, other.x);
            const newMinY = Math.min(current.y, other.y);
            const newMaxX = Math.max(current.x + current.w, other.x + other.w);
            const newMaxY = Math.max(current.y + current.h, other.y + other.h);
            
            current.x = newMinX;
            current.y = newMinY;
            current.w = newMaxX - newMinX;
            current.h = newMaxY - newMinY;
            
            used.add(j);
            changed = true;
          }
        }
      }
      
      merged.push(current);
    }
    
    return merged;
  }

  async function recognizeMultiDigit(sourceCanvas, expectedLen) {
    const canvas = sourceCanvas || State.canvas;
    const segments = segmentDigits(canvas);
    
    if (segments.length === 0) return null;
    
    let digitCanvases = [];
    
    if (segments.length === 1) {
      // Single blob - try vertical projection split
      const bounds = segments[0];
      const blobCanvas = document.createElement('canvas');
      blobCanvas.width = bounds.w;
      blobCanvas.height = bounds.h;
      blobCanvas.getContext('2d').drawImage(
        canvas, bounds.x, bounds.y, bounds.w, bounds.h,
        0, 0, bounds.w, bounds.h
      );
      
      if (expectedLen && expectedLen > 1) {
        digitCanvases = await splitByVerticalProjection(blobCanvas, expectedLen);
      } else {
        digitCanvases = [blobCanvas];
      }
    } else {
      // Multiple segments
      for (const seg of segments) {
        const segCanvas = document.createElement('canvas');
        segCanvas.width = seg.w;
        segCanvas.height = seg.h;
        segCanvas.getContext('2d').drawImage(
          canvas, seg.x, seg.y, seg.w, seg.h,
          0, 0, seg.w, seg.h
        );
        digitCanvases.push(segCanvas);
      }
    }
    
    if (digitCanvases.length === 0) return null;
    
    // Recognize each digit
    let result = '';
    let totalConfidence = 0;
    
    for (const dc of digitCanvases) {
      const cnn = await recognizeCNN(dc);
      if (cnn && cnn.confidence > 0.3) {
        result += String(cnn.digit);
        totalConfidence += cnn.confidence;
      } else {
        const pattern = recognizeByPattern(dc);
        if (pattern && pattern.confidence > 0.3) {
          result += String(pattern.digit);
          totalConfidence += pattern.confidence * 0.8;
        } else {
          result += '?';
          totalConfidence += 0.2;
        }
      }
    }
    
    return {
      text: result.replace(/\?/g, ''),
      confidence: digitCanvases.length > 0 ? totalConfidence / digitCanvases.length : 0,
      segments: digitCanvases.length
    };
  }

  async function splitByVerticalProjection(canvas, expectedCount) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Compute vertical projection
    const vProj = new Array(canvas.width).fill(0);
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] > CONFIG.NOISE_THRESHOLD) {
          vProj[x]++;
        }
      }
    }
    
    // Smooth
    const smoothed = vProj.map((v, i) => {
      let sum = v, count = 1;
      if (i > 0) { sum += vProj[i-1]; count++; }
      if (i > 1) { sum += vProj[i-2]; count++; }
      if (i < vProj.length - 1) { sum += vProj[i+1]; count++; }
      if (i < vProj.length - 2) { sum += vProj[i+2]; count++; }
      return sum / count;
    });
    
    // Find valleys
    const maxProj = Math.max(...smoothed);
    const valleys = [];
    
    for (let i = 3; i < smoothed.length - 3; i++) {
      if (smoothed[i] < maxProj * CONFIG.VALLEY_THRESHOLD &&
          smoothed[i] <= smoothed[i-1] && smoothed[i] <= smoothed[i+1] &&
          smoothed[i] <= smoothed[i-2] && smoothed[i] <= smoothed[i+2]) {
        valleys.push({ idx: i, depth: smoothed[i] });
      }
    }
    
    // Keep best valleys
    valleys.sort((a, b) => a.depth - b.depth);
    const splits = valleys
      .slice(0, expectedCount - 1)
      .map(v => v.idx)
      .sort((a, b) => a - b);
    
    // Create segments
    const segments = [];
    let startX = 0;
    
    for (const split of [...splits, canvas.width]) {
      const segWidth = split - startX;
      if (segWidth > 4) {
        const seg = document.createElement('canvas');
        seg.width = segWidth;
        seg.height = canvas.height;
        seg.getContext('2d').drawImage(
          canvas, startX, 0, segWidth, canvas.height,
          0, 0, segWidth, canvas.height
        );
        segments.push(seg);
      }
      startX = split;
    }
    
    return segments;
  }

  // ============================================================================
  // ENSEMBLE RECOGNITION
  // ============================================================================
  
  async function recognizeEnsemble(sourceCanvas, expectedAnswer) {
    const startTime = performance.now();
    const canvas = sourceCanvas || State.canvas;
    const expectedStr = expectedAnswer != null ? String(expectedAnswer) : null;
    const expectedLen = expectedStr ? expectedStr.length : null;
    
    // Run recognizers
    const [cnnResult, patternResult] = await Promise.all([
      recognizeCNN(canvas),
      Promise.resolve(recognizeByPattern(canvas))
    ]);
    
    // Handle multi-digit
    let multiResult = null;
    if (expectedLen && expectedLen > 1) {
      multiResult = await recognizeMultiDigit(canvas, expectedLen);
    }
    
    // Build candidate scores
    const candidates = new Map();
    
    // CNN result (highest weight)
    if (cnnResult) {
      const key = String(cnnResult.digit);
      const cnnWeight = cnnResult.confidence > CONFIG.VERY_HIGH_CONFIDENCE ? 55 : 45;
      candidates.set(key, (candidates.get(key) || 0) + cnnResult.confidence * cnnWeight);
      
      if (cnnResult.isAmbiguous && cnnResult.secondConfidence > 0.2) {
        const key2 = String(cnnResult.secondChoice);
        candidates.set(key2, (candidates.get(key2) || 0) + cnnResult.secondConfidence * 20);
      }
    }
    
    // Pattern result (lower weight but helps with edge cases)
    if (patternResult) {
      const key = String(patternResult.digit);
      // Higher weight if CNN is uncertain
      const patternWeight = (cnnResult && cnnResult.confidence > CONFIG.HIGH_CONFIDENCE) ? 20 : 30;
      candidates.set(key, (candidates.get(key) || 0) + patternResult.confidence * patternWeight);
    }
    
    // Multi-digit result
    if (multiResult && multiResult.text) {
      candidates.set(multiResult.text, (candidates.get(multiResult.text) || 0) + multiResult.confidence * 40);
    }
    
    // Boost candidates matching expected length
    if (expectedLen) {
      for (const [key, score] of candidates) {
        if (key.length === expectedLen) {
          candidates.set(key, score + 20);
        } else {
          candidates.set(key, score - 15);
        }
      }
    }
    
    // Sort by score
    const sorted = Array.from(candidates.entries())
      .map(([text, score]) => ({ text, score }))
      .filter(c => /^\d+$/.test(c.text))
      .sort((a, b) => b.score - a.score);
    
    if (sorted.length === 0) {
      return { text: '', confidence: 0, error: 'No valid candidates' };
    }
    
    const best = sorted[0];
    const normalizedConfidence = Math.min(1, best.score / 100);
    
    // Track performance
    const elapsed = performance.now() - startTime;
    State.recognitionCount++;
    State.avgRecognitionTime = State.avgRecognitionTime * 0.9 + elapsed * 0.1;
    
    return {
      text: best.text,
      confidence: normalizedConfidence,
      allCandidates: sorted.slice(0, 5),
      cnnResult,
      patternResult,
      multiResult,
      recognitionTime: elapsed
    };
  }

  // ============================================================================
  // DRAWING HANDLERS
  // ============================================================================
  
  function setupEventListeners() {
    const canvas = State.canvas;
    
    canvas.addEventListener('mousedown', handleDrawStart);
    canvas.addEventListener('mousemove', handleDrawMove);
    canvas.addEventListener('mouseup', handleDrawEnd);
    canvas.addEventListener('mouseleave', handleDrawEnd);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    
    window.addEventListener('resize', resizeCanvasForDPI);
  }

  function handleDrawStart(e) {
    State.drawing = true;
    const pos = getPointerPos(e);
    State.lastX = pos.x;
    State.lastY = pos.y;
    State.currentStroke = [{ x: pos.x, y: pos.y, t: Date.now() }];
    State.strokeStartTime = Date.now();
    
    updateCanvasState('drawing');
    cancelRecognition();
  }

  function handleDrawMove(e) {
    if (!State.drawing) return;
    e.preventDefault();
    
    const pos = getPointerPos(e);
    drawStroke(pos);
    State.currentStroke.push({ x: pos.x, y: pos.y, t: Date.now() });
    State.lastX = pos.x;
    State.lastY = pos.y;
    
    cancelRecognition();
  }

  function handleDrawEnd() {
    if (!State.drawing) return;
    State.drawing = false;
    
    if (State.currentStroke.length >= CONFIG.MIN_STROKE_POINTS) {
      State.allStrokes.push([...State.currentStroke]);
    }
    State.currentStroke = [];
    
    updateCanvasState('waiting');
    
    if (!isCanvasBlank()) {
      scheduleRecognition();
    }
  }

  function handleTouchStart(e) {
    const rect = State.canvas.getBoundingClientRect();
    
    for (const touch of e.changedTouches) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      State.activeTouches.set(touch.identifier, {
        lastX: x,
        lastY: y,
        stroke: [{ x, y, t: Date.now() }]
      });
    }
    
    State.drawing = true;
    updateCanvasState('drawing');
    cancelRecognition();
  }

  function handleTouchMove(e) {
    if (State.activeTouches.size === 0) return;
    e.preventDefault();
    
    const rect = State.canvas.getBoundingClientRect();
    const ctx = State.ctx;
    
    const scaleStroke = Math.max(4, Math.round(CONFIG.STROKE_WIDTH_BASE * (rect.width / 480)));
    ctx.lineWidth = scaleStroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    
    for (const touch of e.changedTouches) {
      const state = State.activeTouches.get(touch.identifier);
      if (!state) continue;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const distance = Math.sqrt((x - state.lastX) ** 2 + (y - state.lastY) ** 2);
      if (distance > 1.5) {
        const steps = Math.ceil(distance / 1.5);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const ix = state.lastX + (x - state.lastX) * t;
          const iy = state.lastY + (y - state.lastY) * t;
          ctx.beginPath();
          ctx.arc(ix, iy, scaleStroke / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      state.lastX = x;
      state.lastY = y;
      state.stroke.push({ x, y, t: Date.now() });
    }
    
    cancelRecognition();
  }

  function handleTouchEnd(e) {
    for (const touch of e.changedTouches) {
      const state = State.activeTouches.get(touch.identifier);
      if (state && state.stroke.length >= CONFIG.MIN_STROKE_POINTS) {
        State.allStrokes.push(state.stroke);
      }
      State.activeTouches.delete(touch.identifier);
    }
    
    if (State.activeTouches.size === 0) {
      handleDrawEnd();
    }
  }

  function drawStroke(pos) {
    const ctx = State.ctx;
    const rect = State.canvas.getBoundingClientRect();
    
    const scaleStroke = Math.max(4, Math.round(CONFIG.STROKE_WIDTH_BASE * (rect.width / 480)));
    ctx.lineWidth = scaleStroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    
    const distance = Math.sqrt((pos.x - State.lastX) ** 2 + (pos.y - State.lastY) ** 2);
    if (distance > 1.5) {
      const steps = Math.ceil(distance / 1.5);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = State.lastX + (pos.x - State.lastX) * t;
        const y = State.lastY + (pos.y - State.lastY) * t;
        ctx.beginPath();
        ctx.arc(x, y, scaleStroke / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.beginPath();
    ctx.moveTo(State.lastX, State.lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function getPointerPos(e) {
    const rect = State.canvas.getBoundingClientRect();
    const isTouch = !!e.touches;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  // ============================================================================
  // RECOGNITION SCHEDULING
  // ============================================================================
  
  function scheduleRecognition() {
    if (window.__idleTimer) {
      clearTimeout(window.__idleTimer);
    }
    
    window.__idleTimer = setTimeout(async () => {
      window.__idleTimer = null;
      await performRecognition();
    }, CONFIG.SUBMIT_DELAY_MS);
  }

  function cancelRecognition() {
    if (window.__idleTimer) {
      clearTimeout(window.__idleTimer);
      window.__idleTimer = null;
    }
  }

  async function performRecognition() {
    if (!window.currentProblem || isCanvasBlank()) return;
    if (window.gameState && window.gameState.running === false) return;
    
    updateCanvasState('processing');
    
    try {
      const expectedAnswer = window.currentProblem.answer;
      const result = await recognizeEnsemble(State.canvas, expectedAnswer);
      
      const statusDiv = document.getElementById('canvas-status');
      if (statusDiv) {
        statusDiv.textContent = `Detected: ${result.text} (${(result.confidence * 100).toFixed(0)}%)`;
      }
      
      const isCorrect = result.text === String(expectedAnswer);
      
      if (isCorrect) {
        handleCorrectAnswer(result);
      } else if (result.confidence > CONFIG.MIN_CONFIDENCE) {
        handleIncorrectAnswer(result);
      } else {
        handleUnclearInput(result);
      }
      
    } catch (err) {
      console.error('[Recognition] Error:', err);
      updateCanvasState('error');
    }
  }

  function handleCorrectAnswer(result) {
    updateCanvasState('correct');
    showPopup(`Correct! (${result.text})`, true);
    
    if (typeof window.onAutoCorrect === 'function' && !window.__solvingLock) {
      window.__solvingLock = true;
      window.onAutoCorrect();
      setTimeout(() => { window.__solvingLock = false; }, 500);
    }
  }

  function handleIncorrectAnswer(result) {
    updateCanvasState('incorrect');
    showPopup(`Wrong (saw: ${result.text})`, false);
    
    const statusDiv = document.getElementById('canvas-status');
    if (statusDiv) statusDiv.textContent = 'Try again';
    
    clearCanvas();
  }

  function handleUnclearInput(result) {
    updateCanvasState('unclear');
    showPopup('Unclear - draw clearer', false);
    
    const statusDiv = document.getElementById('canvas-status');
    if (statusDiv) statusDiv.textContent = 'Draw more clearly';
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================
  
  function updateCanvasState(state) {
    const canvas = State.canvas;
    const statusDiv = document.getElementById('canvas-status');
    
    canvas.classList.remove('drawing', 'processing', 'pulse-correct', 'pulse-wrong');
    
    switch (state) {
      case 'drawing':
        canvas.classList.add('drawing');
        if (statusDiv) statusDiv.textContent = 'Drawing...';
        break;
      case 'waiting':
        if (statusDiv) statusDiv.textContent = isCanvasBlank() ? 'Draw your answer' : 'Analyzing...';
        break;
      case 'processing':
        canvas.classList.add('processing');
        if (statusDiv) statusDiv.textContent = 'Analyzing...';
        break;
      case 'correct':
        canvas.classList.add('pulse-correct');
        setTimeout(() => canvas.classList.remove('pulse-correct'), 900);
        break;
      case 'incorrect':
        canvas.classList.add('pulse-wrong');
        setTimeout(() => canvas.classList.remove('pulse-wrong'), 900);
        break;
    }
  }

  function showPopup(message, isCorrect) {
    const existing = document.getElementById('answer-popup');
    if (existing) existing.remove();
    
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
      font-size: 1.2rem;
      font-weight: bold;
      font-family: inherit;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: popupIn 0.15s ease-out;
      text-align: center;
      min-width: 160px;
    `;
    
    if (!document.querySelector('#popup-anim-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-anim-styles';
      style.textContent = `
        @keyframes popupIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes popupOut {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (popup.parentNode) {
        popup.style.animation = 'popupOut 0.2s ease-in';
        setTimeout(() => popup.remove(), 200);
      }
    }, isCorrect ? 600 : 800);
  }

  function clearCanvas() {
    State.ctx.clearRect(0, 0, State.canvas.width, State.canvas.height);
    State.allStrokes = [];
    State.currentStroke = [];
    
    updateCanvasState('idle');
    
    const statusDiv = document.getElementById('canvas-status');
    if (statusDiv) statusDiv.textContent = 'Draw your answer';
  }

  function isCanvasBlank() {
    const imgData = State.ctx.getImageData(0, 0, State.canvas.width, State.canvas.height);
    const data = imgData.data;
    
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > CONFIG.NOISE_THRESHOLD) return false;
    }
    return true;
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  window.clearCanvas = clearCanvas;
  window.isCanvasBlank = isCanvasBlank;
  window.recognizeHandwriting = async () => {
    const result = await recognizeEnsemble();
    return result ? result.text : '';
  };
  
  window.getHandwritingInput = async () => {
    const result = await recognizeEnsemble();
    return result ? result.text : '';
  };
  
  // VS mode exports
  window.recognizeDigitML = recognizeCNN;
  window.hm_getDrawingBounds = getDrawingBounds;
  window.hm_canvasToTensor = canvasToTensor;
  window.hm_recognizeDigitMLFromCanvas = recognizeCNN;
  window.hm_segmentDigitBoundingBoxes = segmentDigits;
  window.hm_recognizeMultiDigitFromCanvas = async (canvas, len) => {
    const result = await recognizeMultiDigit(canvas, len);
    return result ? result.text : '';
  };
  
  // Debug exports
  window.testHandwriting = async function() {
    console.log('=== HANDWRITING RECOGNITION TEST v2.0 ===');
    
    if (isCanvasBlank()) {
      console.log('Canvas is blank - draw something first!');
      return null;
    }
    
    const result = await recognizeEnsemble(State.canvas, window.currentProblem?.answer);
    console.log('Recognition result:', result);
    console.log('CNN result:', result.cnnResult);
    console.log('Pattern result:', result.patternResult);
    console.log('All candidates:', result.allCandidates);
    
    return result;
  };
  
  window.testDigitPatterns = function() {
    console.log('=== PATTERN ANALYSIS v2.0 ===');
    
    if (isCanvasBlank()) {
      console.log('Canvas is blank!');
      return null;
    }
    
    const result = recognizeByPattern(State.canvas);
    console.log('Pattern result:', result);
    console.log('Feature details:', result.features);
    
    return result;
  };
  
  window.showRecognitionDebug = function() {
    if (isCanvasBlank()) {
      console.log('Canvas is blank!');
      return;
    }
    
    const bounds = getDrawingBounds(State.canvas);
    console.log('Bounds:', bounds);
    
    const ctx = State.ctx;
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Show center of mass
    const com = computeCenterOfMass(State.canvas, bounds);
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(com.x, com.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    console.log('Center of mass:', com);
  };
  
  console.log('[Handwriting] World-class recognition engine v2.0 ready');

})();
