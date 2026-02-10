// main.js
// Main logic for WriteMath! game

// ============================================================================
// CANVAS TAB SWITCHING SYSTEM
// Allows switching between Answer and Work canvases via tabs
// ============================================================================
(function setupCanvasTabSystem() {
  'use strict';
  
  // Store canvas resize functions for calling when tabs switch
  window.canvasResizeFuncs = window.canvasResizeFuncs || {};
  
  /**
   * Initialize tab switching for a set of tabs
   * @param {HTMLElement} container - The container with .canvas-tabs
   * @param {string} prefix - Optional prefix for panel IDs (e.g., 'sp', 'p1', 'p2')
   */
  function initTabSwitching(container, prefix = '') {
    if (!container) return;
    
    const tabs = container.querySelectorAll('.canvas-tab');
    const panels = container.querySelectorAll('.canvas-panel');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetTab = tab.dataset.tab; // 'answer' or 'work'
        
        // Remove active from all tabs in this container
        tabs.forEach(t => t.classList.remove('active'));
        // Add active to clicked tab
        tab.classList.add('active');
        
        // Hide all panels, show target panel
        panels.forEach(panel => {
          panel.classList.remove('active');
          if (panel.id.includes(`-panel-${targetTab}`) || panel.id === `${prefix}-panel-${targetTab}`) {
            panel.classList.add('active');
          }
        });
        
        // NO RESIZE NEEDED: With the new CSS (visibility: hidden + position: absolute),
        // the canvases maintain their dimensions even when hidden.
        // Triggering resize here was causing layout thrashing and visual glitches.
        
        console.log(`[TabSystem] Switched to ${targetTab} tab${prefix ? ` for ${prefix}` : ''}`);
      });
      
      // Prevent touch events from propagating to canvas
      tab.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
    });
  }
  
  // Initialize tabs when DOM is ready
  function initAllTabs() {
    // Single player tabs
    const spContainer = document.querySelector('.tabbed-canvas-container');
    if (spContainer) {
      initTabSwitching(spContainer, 'sp');
      console.log('[TabSystem] Single player tabs initialized');
    }
    
    // VS mode tabs - Player 1
    const p1Container = document.querySelector('#player1 .player-tabbed-canvas');
    if (p1Container) {
      initTabSwitching(p1Container, 'p1');
      console.log('[TabSystem] Player 1 tabs initialized');
    }
    
    // VS mode tabs - Player 2
    const p2Container = document.querySelector('#player2 .player-tabbed-canvas');
    if (p2Container) {
      initTabSwitching(p2Container, 'p2');
      console.log('[TabSystem] Player 2 tabs initialized');
    }
  }
  
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllTabs);
  } else {
    initAllTabs();
  }
  
  // Expose for manual initialization if needed
  window.initCanvasTabs = initAllTabs;
  
  /**
   * Reset tabs to Answer tab for a specific container or all containers
   * @param {string} prefix - Optional: 'sp', 'p1', or 'p2' to reset specific player
   */
  window.resetCanvasTab = function(prefix) {
    const containers = [];
    
    if (!prefix || prefix === 'sp') {
      const sp = document.querySelector('.tabbed-canvas-container');
      if (sp) containers.push(sp);
    }
    if (!prefix || prefix === 'p1') {
      const p1 = document.querySelector('#player1 .player-tabbed-canvas');
      if (p1) containers.push(p1);
    }
    if (!prefix || prefix === 'p2') {
      const p2 = document.querySelector('#player2 .player-tabbed-canvas');
      if (p2) containers.push(p2);
    }
    
    containers.forEach(container => {
      const tabs = container.querySelectorAll('.canvas-tab');
      const panels = container.querySelectorAll('.canvas-panel');
      
      // Reset to answer tab
      tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === 'answer');
      });
      
      panels.forEach(p => {
        p.classList.toggle('active', p.id.includes('-panel-answer'));
      });
    });
  };
  
  console.log('[TabSystem] Canvas tab system loaded');
})();

// ============================================================================
// MULTI-TOUCH & GESTURE PREVENTION SYSTEM
// Prevents pinch-zoom and other gestures while allowing two-player drawing
// ============================================================================
(function setupMultiTouchPrevention() {
  'use strict';
  
  // Prevent all zoom gestures on the document
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // Prevent pinch zoom on touchmove when multiple touches detected
  document.addEventListener('touchmove', function(e) {
    // If there are 2+ touches and they're NOT both on canvases, prevent zoom
    if (e.touches.length >= 2) {
      // Check if touches are on different game canvases (VS mode)
      const touch1Target = e.touches[0].target;
      const touch2Target = e.touches[1].target;
      
      const isCanvas1 = touch1Target.tagName === 'CANVAS';
      const isCanvas2 = touch2Target.tagName === 'CANVAS';
      
      // If both touches are on canvases (could be same or different), allow it
      // But prevent default zoom behavior
      if (isCanvas1 || isCanvas2) {
        // Don't prevent default here - let the canvas handlers manage it
        // But mark the event as handled
        e.stopPropagation();
      } else {
        // Neither touch is on a canvas - prevent zoom
        e.preventDefault();
      }
    }
  }, { passive: false });
  
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  
  // Prevent context menu on long press
  document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'CANVAS') {
      e.preventDefault();
    }
  });
  
  // Fix for iOS Safari - prevent bouncing/overscroll
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.tagName !== 'CANVAS' && !e.target.closest('.modal-content')) {
      // Allow scrolling in modals but prevent elsewhere
      const isScrollable = e.target.closest('.screen');
      if (!isScrollable || isScrollable.scrollHeight <= isScrollable.clientHeight) {
        // Not scrollable or doesn't need scroll - prevent overscroll
      }
    }
  }, { passive: true });
  
  console.log('[MultiTouch] Gesture prevention system initialized');
})();

// --- DOM Elements ---
const screens = {
  menu: document.getElementById('main-menu'),
  lineupTutorial: document.getElementById('lineup-tutorial-screen'),
  setup: document.getElementById('setup-screen'),
  aiSelect: document.getElementById('ai-select-screen'),
  settings: document.getElementById('settings-modal'),
  game: document.getElementById('game-screen'),
  vs: document.getElementById('vs-screen'),
  over: document.getElementById('game-over'),
};

const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const lineupTutorialBackBtn = document.getElementById('lineup-tutorial-back-btn');
const lineupTutorialContinueBtn = document.getElementById('lineup-tutorial-continue-btn');
const setupBackBtn = document.getElementById('setup-back-btn');
const startBtn = document.getElementById('start-btn');
const aiSetupBackBtn = document.getElementById('ai-setup-back-btn');
const aiSetupContinueBtn = document.getElementById('ai-setup-continue-btn');
const setupActionsDefault = document.getElementById('setup-actions-default');
const setupActionsAi = document.getElementById('setup-actions-ai');
const singleModeBtn = document.getElementById('single-mode-btn');
const vsModeBtn = document.getElementById('vs-mode-btn');
const vsAiModeBtn = document.getElementById('vs-ai-mode-btn');
const lineupModeBtn = document.getElementById('lineup-mode-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const timerSelect = document.getElementById('timer-select');
const vsEndModeSelect = document.getElementById('vs-end-mode-select');
const firstToTargetInput = document.getElementById('first-to-target');
const firstToTargetRow = document.getElementById('first-to-target-row');
const vsEndModeHelp = document.getElementById('vs-end-mode-help');
const musicToggle = document.getElementById('music-toggle');
const musicVolume = document.getElementById('music-volume');
const autoClearToggleSettings = document.getElementById('auto-clear-toggle-settings');
const lineupTimerInputs = {
  tom: document.getElementById('lineup-timer-tom'),
  sam: document.getElementById('lineup-timer-sam'),
  jack: document.getElementById('lineup-timer-jack'),
  edison: document.getElementById('lineup-timer-edison'),
  ariel: document.getElementById('lineup-timer-ariel')
};
const lineupFirstToInputs = {
  tom: document.getElementById('lineup-firstto-tom'),
  sam: document.getElementById('lineup-firstto-sam'),
  jack: document.getElementById('lineup-firstto-jack'),
  edison: document.getElementById('lineup-firstto-edison'),
  ariel: document.getElementById('lineup-firstto-ariel')
};
const lineupTimeSettingsGroup = document.getElementById('lineup-time-settings-group');
const lineupFirstToSettingsGroup = document.getElementById('lineup-firstto-settings-group');
const menuMusic = document.getElementById('menu-music');
const bgMusic = document.getElementById('bg-music');
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const countdownOverlay = document.getElementById('countdown-overlay');
const vsWinnerOverlay = document.getElementById('vs-winner-overlay');
const vsWinnerTitle = document.getElementById('vs-winner-title');
const vsWinnerSubtitle = document.getElementById('vs-winner-subtitle');
const vsWinnerScore = document.getElementById('vs-winner-score');
const vsWinnerCrown = document.getElementById('vs-winner-crown');
const vsConfettiTop = document.getElementById('vs-confetti-top');
const vsConfettiBottom = document.getElementById('vs-confetti-bottom');
const p1Result = document.getElementById('p1-result');
const p2Result = document.getElementById('p2-result');
const p1Confetti = document.getElementById('p1-confetti');
const p2Confetti = document.getElementById('p2-confetti');
const player1El = document.getElementById('player1');
const player2El = document.getElementById('player2');
const player1Badge = document.getElementById('p1-badge');
const player2Badge = document.getElementById('p2-badge');

const backgroundTracks = [
  'Music/Background1.mp3',
  'Music/Background2.mp3',
  'Music/Background3.mp3',
  'Music/Background4.mp3',
  'Music/Background5.mp3'
];
let lastBackgroundTrackIndex = -1;

const scoreboard = document.getElementById('score');
const timer = document.getElementById('time-left');
const timerUnit = document.getElementById('time-unit');
const problemDiv = document.getElementById('problem');
const feedback = document.getElementById('feedback');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

// VS DOM
const vsExitBtn = document.getElementById('vs-exit');
const aiBackBtn = document.getElementById('ai-back-btn');
const aiStartBtn = document.getElementById('ai-start-btn');
const aiCards = Array.from(document.querySelectorAll('.ai-card'));

// Work Area DOM
const workClearBtn = document.getElementById('work-clear-btn');
let singlePlayerWorkClear = null;

// Auto-clear functionality
function autoStageWork(playerOnly = null) {
  console.log('🔥 autoStageWork called with playerOnly:', playerOnly);

  // Auto Clear toggle now lives in Settings only.
  // Keep feature ON by default if toggle element is unavailable for any reason.
  const autoClearEnabled = autoClearToggleSettings ? autoClearToggleSettings.checked : true;
  
  console.log('🔍 Debug info:', {
    toggleExists: !!autoClearToggleSettings,
    toggleId: autoClearToggleSettings ? autoClearToggleSettings.id : 'null',
    toggleChecked: autoClearToggleSettings ? autoClearToggleSettings.checked : 'N/A',
    autoClearEnabled,
    singlePlayerWorkClear: !!singlePlayerWorkClear,
    playerWorkClearFunc: playerOnly ? !!playerOnly.workClearFunc : 'N/A'
  });
  
  if (autoClearEnabled) {
    console.log('✅ Toggle is checked - proceeding with auto-clear');
    
    // Single player mode
    if (!playerOnly) {
      if (singlePlayerWorkClear && singlePlayerWorkClear.clear) {
        console.log('🧹 Clearing single player work area');
        try {
          singlePlayerWorkClear.clear();
          console.log('✅ Single player work area cleared successfully');
        } catch (error) {
          console.error('❌ Error clearing single player work area:', error);
        }
      } else {
        console.error('❌ singlePlayerWorkClear not properly initialized:', {
          exists: !!singlePlayerWorkClear,
          hasClearMethod: singlePlayerWorkClear ? !!singlePlayerWorkClear.clear : false
        });
      }
    }
    // VS mode - clear specific player only
    else if (playerOnly) {
      if (playerOnly.workClearFunc && playerOnly.workClearFunc.clear) {
        console.log('🧹 Clearing VS player work area for', playerOnly === p1 ? 'Player 1' : 'Player 2');
        try {
          playerOnly.workClearFunc.clear();
          console.log('✅ VS player work area cleared successfully');
        } catch (error) {
          console.error('❌ Error clearing VS player work area:', error);
        }
      } else {
        console.error('❌ Player workClearFunc not properly initialized:', {
          player: playerOnly === p1 ? 'Player 1' : 'Player 2',
          funcExists: !!playerOnly.workClearFunc,
          hasClearMethod: playerOnly.workClearFunc ? !!playerOnly.workClearFunc.clear : false
        });
      }
    }
  } else {
    console.log('⏸️ Auto-clear: Disabled (toggle unchecked)');
  }
}
const p1 = {
  canvas: document.getElementById('p1-canvas'),
  workCanvas: document.getElementById('p1-work-canvas'),
  workClearBtn: document.getElementById('p1-work-clear-btn'),
  status: document.getElementById('p1-canvas-status'),
  clearBtn: null,
  feedback: document.getElementById('p1-feedback'),
  problemDiv: document.getElementById('p1-problem'),
  scoreSpan: document.getElementById('p1-score'),
  timerSpan: document.getElementById('p1-time-left'),
  timerUnitSpan: document.getElementById('p1-time-unit'),
  workClearFunc: null
};
const p2 = {
  canvas: document.getElementById('p2-canvas'),
  workCanvas: document.getElementById('p2-work-canvas'),
  workClearBtn: document.getElementById('p2-work-clear-btn'),
  status: document.getElementById('p2-canvas-status'),
  clearBtn: null,
  feedback: document.getElementById('p2-feedback'),
  problemDiv: document.getElementById('p2-problem'),
  scoreSpan: document.getElementById('p2-score'),
  timerSpan: document.getElementById('p2-time-left'),
  timerUnitSpan: document.getElementById('p2-time-unit'),
  workClearFunc: null
};

// --- Prediction Modal Logic ---
const predictModal = document.getElementById('predict-modal');
const predictSpinner = document.getElementById('predict-spinner');
const predictResult = document.getElementById('predict-result');
const predictedDigitDiv = document.getElementById('predicted-digit');
const confirmYesBtn = document.getElementById('confirm-predict-yes');
const confirmNoBtn = document.getElementById('confirm-predict-no');

let pendingPrediction = false;
let pendingDigit = null;

const feedbackTimers = new WeakMap();

function showFeedbackPopup(target, message, color = '#fff', options = {}) {
  if (!target) return 0;

  const {
    fadeInMs = 180,
    visibleMs = 780,
    fadeOutMs = 480,
    clearOnFinish = true
  } = options;

  const existing = feedbackTimers.get(target);
  if (existing) {
    if (existing.hideTimer) clearTimeout(existing.hideTimer);
    if (existing.clearTimer) clearTimeout(existing.clearTimer);
  }

  target.style.transition = `opacity ${fadeInMs}ms ease`;
  target.style.opacity = '0';
  target.textContent = message;
  target.style.color = color;

  requestAnimationFrame(() => {
    target.style.opacity = '1';
  });

  const hideTimer = setTimeout(() => {
    target.style.transition = `opacity ${fadeOutMs}ms ease`;
    target.style.opacity = '0';
  }, visibleMs);

  const clearTimer = setTimeout(() => {
    if (clearOnFinish) target.textContent = '';
  }, visibleMs + fadeOutMs + 30);

  feedbackTimers.set(target, { hideTimer, clearTimer });

  return visibleMs + fadeOutMs + 30;
}

function clearFeedbackPopup(target, immediate = false) {
  if (!target) return;
  const existing = feedbackTimers.get(target);
  if (existing) {
    if (existing.hideTimer) clearTimeout(existing.hideTimer);
    if (existing.clearTimer) clearTimeout(existing.clearTimer);
  }

  if (immediate) {
    target.style.opacity = '0';
    target.textContent = '';
    return;
  }

  target.style.transition = 'opacity 320ms ease';
  target.style.opacity = '0';
  setTimeout(() => {
    if (target.style.opacity === '0') target.textContent = '';
  }, 340);
}

function showPredictModal() {
  predictModal.classList.remove('hidden');
  predictSpinner.classList.remove('hidden');
  predictResult.classList.add('hidden');
}

function showPredictResult(digit) {
  predictSpinner.classList.add('hidden');
  predictResult.classList.remove('hidden');
  predictedDigitDiv.textContent = digit;
}

function hidePredictModal() {
  predictModal.classList.add('hidden');
  predictSpinner.classList.add('hidden');
  predictResult.classList.add('hidden');
}

// Animate feedback
function animateFeedback(type) {
  if (type === 'correct') {
    return showFeedbackPopup(feedback, 'Correct! 🎉', '#4caf50', { visibleMs: 640, fadeOutMs: 460 });
  } else if (type === 'wrong') {
    return showFeedbackPopup(feedback, 'Oops! Try again.', '#ff4e50', { visibleMs: 640, fadeOutMs: 460 });
  }
  return 0;
}

// --- State ---
let gameSettings = {
  mode: 'add',
  difficulty: 'easy',
  timer: 60,
  vsEndMode: 'time',
  firstToTarget: 10,
  music: true,
  musicVolume: 0.2,
  autoClearWork: true,
  lineupTimers: {
    tom: 75,
    sam: 70,
    jack: 65,
    edison: 60,
    ariel: 55
  },
  lineupFirstToTargets: {
    tom: 10,
    sam: 12,
    jack: 14,
    edison: 16,
    ariel: 18
  }
};

let gameState = {
  score: 0,
  timeLeft: 60,
  running: false,
};

let countdownTimer = null;
let countdownActive = false;
let menuFadeTimer = null;
let bgFadeTimer = null;
let gameplayStartPending = false;
let handwritingWarmupPromise = null;
const HANDWRITING_WARMUP_TIMEOUT_MS = 3200;

// Fullscreen startup/back-button handling
const FULLSCREEN_HISTORY_TAG = '__writemath_fullscreen__';
let fullscreenHistoryPushed = false;
let fullscreenInteractionHandler = null;

// VS state
let vsState = {
  running: false,
  timeLeft: 60,
  endMode: 'time',
  firstToTarget: 10,
  p1: { score: 0, problem: null },
  p2: { score: 0, problem: null },
  used1: new Set(),
  used2: new Set(),
  timerInterval: null,
  aiProfile: null,
  isVsAi: false
};

const lineupState = {
  order: ['tom', 'sam', 'jack', 'edison', 'ariel'],
  active: false,
  awaitingNext: false,
  currentIndex: 0,
  wins: 0
};

function resetLineupState() {
  lineupState.active = false;
  lineupState.awaitingNext = false;
  lineupState.currentIndex = 0;
  lineupState.wins = 0;
}

function getCurrentLineupAiId() {
  return lineupState.order[lineupState.currentIndex] || null;
}

function startLineupChallenge() {
  resetLineupState();
  lineupState.active = true;
  restartBtn.textContent = 'Restart';
  startNextLineupMatch();
}

function startNextLineupMatch() {
  lineupState.awaitingNext = false;
  const aiId = getCurrentLineupAiId();
  const profile = aiId ? aiProfiles[aiId] : null;
  if (!profile) {
    resetLineupState();
    showScreen('over');
    finalScore.textContent = 'King of The Hill could not continue (invalid AI profile).';
    return;
  }

  const vsOptions = { aiProfile: profile };
  if (gameSettings.vsEndMode === 'time') {
    vsOptions.timerOverride = getLineupTimerForAi(aiId);
  } else {
    vsOptions.firstToOverride = getLineupFirstToForAi(aiId);
  }
  startVsGame(vsOptions);

  const roundText = `King of The Hill: Round ${lineupState.currentIndex + 1}/${lineupState.order.length} vs ${profile.name}`;
  if (p1.feedback) {
    showFeedbackPopup(p1.feedback, roundText, '#f9d423', { visibleMs: 1150, fadeOutMs: 520 });
  }
}

// --- UI Helpers ---
function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screen].classList.remove('hidden');
  handleScreenMusic(screen);
}

function safePlayAudio(audio) {
  if (!audio) return;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((error) => {
      console.warn('[Audio] Playback prevented:', error);
    });
  }
}

function stopAudio(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function fadeOutAudio(audio, duration = 900, onComplete) {
  if (!audio) return null;
  const startVolume = audio.volume;
  if (startVolume <= 0.001) {
    stopAudio(audio);
    if (typeof onComplete === 'function') onComplete();
    return null;
  }
  const steps = Math.max(1, Math.floor(duration / 50));
  let currentStep = 0;
  const timer = setInterval(() => {
    currentStep += 1;
    const nextVolume = Math.max(0, startVolume * (1 - currentStep / steps));
    audio.volume = nextVolume;
    if (currentStep >= steps || nextVolume <= 0.001) {
      clearInterval(timer);
      stopAudio(audio);
      audio.volume = gameSettings.musicVolume;
      if (typeof onComplete === 'function') onComplete();
    }
  }, 50);
  return timer;
}

function pickRandomBackgroundTrack() {
  if (!backgroundTracks.length) return null;
  let nextIndex = lastBackgroundTrackIndex;
  while (backgroundTracks.length > 1 && nextIndex === lastBackgroundTrackIndex) {
    nextIndex = Math.floor(Math.random() * backgroundTracks.length);
  }
  if (nextIndex === lastBackgroundTrackIndex && backgroundTracks.length === 1) {
    nextIndex = 0;
  }
  lastBackgroundTrackIndex = nextIndex;
  return backgroundTracks[nextIndex];
}

function playMenuMusic() {
  if (!menuMusic || !gameSettings.music) return;
  fadeOutBackgroundMusic(500);
  menuMusic.volume = gameSettings.musicVolume;
  safePlayAudio(menuMusic);
}

function playRandomBackgroundMusic() {
  if (!bgMusic || !gameSettings.music) return;
  fadeOutMenuMusic(500);
  const track = pickRandomBackgroundTrack();
  if (!track) return;
  if (bgMusic.src.indexOf(track) === -1) {
    bgMusic.src = track;
  }
  bgMusic.loop = false;
  bgMusic.volume = gameSettings.musicVolume;
  safePlayAudio(bgMusic);
}

function updateMusicVolume(value) {
  const normalized = Math.min(1, Math.max(0, value));
  gameSettings.musicVolume = normalized;
  if (menuMusic) menuMusic.volume = normalized;
  if (bgMusic) bgMusic.volume = normalized;
}

function stopAllMusic() {
  fadeOutMenuMusic(400);
  fadeOutBackgroundMusic(400);
}

function handleScreenMusic(screen) {
  if (!gameSettings.music) {
    stopAllMusic();
    return;
  }
  if (screen === 'menu' || screen === 'lineupTutorial' || screen === 'setup' || screen === 'aiSelect') {
    playMenuMusic();
  } else if (screen === 'game' || screen === 'vs') {
    playRandomBackgroundMusic();
  } else {
    stopAllMusic();
  }
}

function showCountdownOverlay(text) {
  if (!countdownOverlay) return;
  countdownOverlay.textContent = text;
  countdownOverlay.classList.remove('hidden');
}

function hideCountdownOverlay() {
  if (!countdownOverlay) return;
  countdownOverlay.classList.add('hidden');
}

function warmupHandwritingDetection() {
  if (handwritingWarmupPromise) return handwritingWarmupPromise;

  const warmupTask = (async () => {
    if (typeof window.hm_warmupRecognition === 'function') {
      return window.hm_warmupRecognition();
    }
    return false;
  })();

  const timeoutTask = new Promise(resolve => {
    setTimeout(() => resolve('timeout'), HANDWRITING_WARMUP_TIMEOUT_MS);
  });

  handwritingWarmupPromise = Promise.race([warmupTask, timeoutTask])
    .catch((err) => {
      console.warn('[Warmup] Handwriting warmup failed:', err);
      return false;
    });

  return handwritingWarmupPromise;
}

function beginGameplayAfterCountdown(startFn, warmupPromise) {
  if (gameplayStartPending) return;
  gameplayStartPending = true;

  (async () => {
    try {
      await (warmupPromise || warmupHandwritingDetection());
    } finally {
      gameplayStartPending = false;
      if (typeof startFn === 'function') startFn();
    }
  })();
}

function centerVsDividerInViewport() {
  const vsScreen = screens && screens.vs;
  if (!vsScreen || vsScreen.classList.contains('hidden')) return;

  const board = vsScreen.querySelector('.vs-board');
  const divider = vsScreen.querySelector('.center-divider');
  if (!board || !divider) return;

  // Reset before measuring so we don't accumulate offsets.
  board.style.transform = 'translateY(0px)';

  const dividerRect = divider.getBoundingClientRect();
  const viewportCenterY = window.innerHeight / 2;
  const dividerCenterY = dividerRect.top + dividerRect.height / 2;
  let delta = Math.round(viewportCenterY - dividerCenterY);

  // Clamp to keep layout stable while still ensuring visual centering.
  const maxShift = Math.round(window.innerHeight * 0.12);
  if (delta > maxShift) delta = maxShift;
  if (delta < -maxShift) delta = -maxShift;

  board.style.transform = `translateY(${delta}px)`;
}

function scheduleVsCenterAlignment() {
  // Run multiple passes to handle dynamic viewport/safe-area settling on mobile.
  requestAnimationFrame(() => {
    requestAnimationFrame(centerVsDividerInViewport);
  });
  setTimeout(centerVsDividerInViewport, 120);
  setTimeout(centerVsDividerInViewport, 320);
}

function startCountdown(onComplete) {
  if (countdownActive) return;
  countdownActive = true;
  // Begin recognition warmup during countdown so first detection is ready at start.
  const warmupPromise = warmupHandwritingDetection();
  const steps = ['3', '2', '1', 'Go!'];
  let index = 0;
  clearInterval(countdownTimer);
  showCountdownOverlay(steps[index]);
  countdownTimer = setInterval(() => {
    index += 1;
    if (index >= steps.length) {
      clearInterval(countdownTimer);
      hideCountdownOverlay();
      countdownActive = false;
      if (typeof onComplete === 'function') {
        onComplete(warmupPromise);
      }
      return;
    }
    showCountdownOverlay(steps[index]);
  }, 850);
}

function fadeOutMenuMusic(duration = 900) {
  if (!menuMusic) return;
  clearInterval(menuFadeTimer);
  menuFadeTimer = fadeOutAudio(menuMusic, duration);
}

function fadeOutBackgroundMusic(duration = 900) {
  if (!bgMusic) return;
  clearInterval(bgFadeTimer);
  bgFadeTimer = fadeOutAudio(bgMusic, duration);
}

function registerBackgroundLoop() {
  if (!bgMusic) return;
  bgMusic.addEventListener('ended', () => {
    if (!gameSettings.music) return;
    playRandomBackgroundMusic();
  });
}

function isFullscreenActive() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function hasFullscreenMarker(state) {
  return !!(state && state[FULLSCREEN_HISTORY_TAG]);
}

function markFullscreenHistoryState() {
  if (fullscreenHistoryPushed) return;
  const nextState = {
    ...(history.state || {}),
    [FULLSCREEN_HISTORY_TAG]: true
  };
  history.pushState(nextState, '', window.location.href);
  fullscreenHistoryPushed = true;
}

function clearFullscreenMarkerFromCurrentState() {
  const currentState = history.state || {};
  if (!hasFullscreenMarker(currentState)) return;
  const nextState = { ...currentState };
  delete nextState[FULLSCREEN_HISTORY_TAG];
  history.replaceState(nextState, '', window.location.href);
}

async function requestAppFullscreen() {
  try {
    if (!document.documentElement || isFullscreenActive()) return;
    const root = document.documentElement;
    const requestFn = root.requestFullscreen
      || root.webkitRequestFullscreen
      || root.msRequestFullscreen;
    if (typeof requestFn !== 'function') return;
    await requestFn.call(root);
  } catch (err) {
    // Most browsers require user gesture; we'll retry on first interaction.
    console.debug('[Fullscreen] requestFullscreen blocked/deferred:', err);
  }
}

async function exitAppFullscreen() {
  try {
    if (!isFullscreenActive()) return;
    const exitFn = document.exitFullscreen
      || document.webkitExitFullscreen
      || document.msExitFullscreen;
    if (typeof exitFn !== 'function') return;
    await exitFn.call(document);
  } catch (err) {
    console.warn('[Fullscreen] exitFullscreen failed:', err);
  }
}

function addFullscreenInteractionListeners() {
  if (fullscreenInteractionHandler) return;
  fullscreenInteractionHandler = () => {
    // User requested: whenever user interacts and app is not fullscreen, go fullscreen.
    if (!isFullscreenActive()) {
      requestAppFullscreen();
    }
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, fullscreenInteractionHandler, { capture: true, passive: false });
  });
}

function setupFullscreenExperience() {
  // Try immediately (works in some app contexts), then retry on first interaction.
  requestAppFullscreen();

  // Keep listening until fullscreen has successfully entered at least once.
  addFullscreenInteractionListeners();

  const onFullscreenChange = () => {
    if (isFullscreenActive()) {
      markFullscreenHistoryState();
    } else {
      clearFullscreenMarkerFromCurrentState();
      fullscreenHistoryPushed = false;
    }
  };

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // Keep one history marker while fullscreen is active so device back exits fullscreen first.
  window.addEventListener('popstate', () => {
    // If user presses device back while fullscreen, use that action to leave fullscreen.
    if (isFullscreenActive()) {
      exitAppFullscreen();
    }
  });
}

// --- Event Listeners ---
modeSelect.addEventListener('change', () => {
  gameSettings.mode = modeSelect.value;
});
difficultySelect.addEventListener('change', () => {
  gameSettings.difficulty = difficultySelect.value;
});

settingsBtn.addEventListener('click', () => {
  screens.settings.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  screens.settings.classList.add('hidden');
});

timerSelect.addEventListener('change', () => {
  gameSettings.timer = parseInt(timerSelect.value);
});

if (vsEndModeSelect) {
  vsEndModeSelect.addEventListener('change', () => {
    gameSettings.vsEndMode = vsEndModeSelect.value === 'first-to' ? 'first-to' : 'time';
    updateVsEndModeUi();
  });
}

if (firstToTargetInput) {
  const syncFirstToTarget = () => {
    const nextValue = clampFirstToTarget(firstToTargetInput.value);
    gameSettings.firstToTarget = nextValue;
    firstToTargetInput.value = String(nextValue);
  };

  firstToTargetInput.addEventListener('change', syncFirstToTarget);
  firstToTargetInput.addEventListener('blur', syncFirstToTarget);
}


musicToggle.addEventListener('change', () => {
  gameSettings.music = musicToggle.checked;
  if (gameSettings.music) {
    const activeScreen = Object.entries(screens).find(([, element]) => !element.classList.contains('hidden'));
    const screenKey = activeScreen ? activeScreen[0] : 'menu';
    handleScreenMusic(screenKey);
  } else {
    stopAllMusic();
  }
});

if (musicVolume) {
  musicVolume.addEventListener('input', () => {
    const normalized = parseInt(musicVolume.value, 10) / 100;
    updateMusicVolume(normalized);
  });
}

if (autoClearToggleSettings) {
  autoClearToggleSettings.addEventListener('change', () => {
    gameSettings.autoClearWork = autoClearToggleSettings.checked;
  });
}

let selectedPlayers = 'single';
let selectedAiId = null;
const lineupOrder = ['tom', 'sam', 'jack', 'edison', 'ariel'];

function thinkRangeFromSpeed(speed) {
  const clamped = Math.max(25, Math.min(100, speed));
  const minDelay = Math.round(140 + (100 - clamped) * 14);
  const maxDelay = minDelay + Math.round(220 + (100 - clamped) * 6);
  return [minDelay, maxDelay];
}

function strokeDelayFromSpeed(speed) {
  const clamped = Math.max(25, Math.min(100, speed));
  return Math.max(2, Math.round(16 - clamped * 0.12));
}

function clampAiTier(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, parsed));
}

function scaleDelayRange(range, factor) {
  if (!Array.isArray(range) || range.length < 2) return [500, 900];
  const min = Math.max(50, Math.round(Number(range[0]) * factor));
  const maxRaw = Math.max(Number(range[1]), Number(range[0]));
  const max = Math.max(min + 40, Math.round(maxRaw * factor));
  return [min, max];
}

function randomDelayFromRange(range, fallback = 600) {
  if (!Array.isArray(range) || range.length < 2) return fallback;
  const min = Math.max(0, Math.round(Number(range[0])));
  const max = Math.max(min, Math.round(Number(range[1])));
  if (max <= min) return min;
  return getRandomInt(min, max);
}

function updateSetupActionsForMode() {
  const isVsAiSetup = selectedPlayers === 'vs-ai';
  if (setupActionsDefault) setupActionsDefault.classList.toggle('hidden', isVsAiSetup);
  if (setupActionsAi) setupActionsAi.classList.toggle('hidden', !isVsAiSetup);
}

function createAiProfile(config) {
  const accuracy = Math.max(0.45, Math.min(0.99, Number(config.accuracy) || 0.7));
  const neatness = Math.max(0, Math.min(1, (accuracy - 0.45) / 0.54));
  const lerp = (a, b, t) => a + (b - a) * t;
  const tier = clampAiTier(config.tier);
  const tierThinkFactorMap = {
    1: 1.34,
    2: 1.2,
    3: 1.06,
    4: 0.94,
    5: 0.84
  };
  const tierStrokeFactorMap = {
    1: 1.38,
    2: 1.22,
    3: 1.06,
    4: 0.94,
    5: 0.84
  };
  const openingPauseBaseByTier = {
    1: [3400, 4300],
    2: [2900, 3800],
    3: [2300, 3100],
    4: [1700, 2400],
    5: [1300, 1900]
  };
  const problemPauseBaseByTier = {
    1: [1200, 1850],
    2: [1020, 1550],
    3: [840, 1260],
    4: [620, 980],
    5: [480, 760]
  };
  const regroupPauseBaseByTier = {
    1: [900, 1320],
    2: [760, 1120],
    3: [640, 940],
    4: [500, 760],
    5: [380, 620]
  };

  const thinkFactor = Number.isFinite(config.thinkFactor)
    ? Number(config.thinkFactor)
    : (tierThinkFactorMap[tier] || 1);
  const handwritingPaceFactor = Number.isFinite(config.handwritingPaceFactor)
    ? Number(config.handwritingPaceFactor)
    : (tierStrokeFactorMap[tier] || 1);

  const baseThinkRange = config.thinkRange || thinkRangeFromSpeed(config.speed);
  const thinkRange = scaleDelayRange(baseThinkRange, thinkFactor);
  const strokeDelay = Number.isFinite(config.strokeDelay) ? config.strokeDelay : strokeDelayFromSpeed(config.speed);
  const jitter = Number.isFinite(config.jitter) ? config.jitter : lerp(0.22, 0.025, neatness);
  const smoothness = Number.isFinite(config.smoothness) ? config.smoothness : lerp(0.82, 1.68, neatness);
  const lineWidthJitter = Number.isFinite(config.lineWidthJitter) ? config.lineWidthJitter : lerp(0.22, 0.03, neatness);
  const placementJitter = Number.isFinite(config.placementJitter) ? config.placementJitter : lerp(0.16, 0.02, neatness);
  const openingPauseRange = scaleDelayRange(
    config.openingPauseRange || openingPauseBaseByTier[tier] || openingPauseBaseByTier[3],
    thinkFactor
  );
  const problemPauseRange = scaleDelayRange(
    config.problemPauseRange || problemPauseBaseByTier[tier] || problemPauseBaseByTier[3],
    thinkFactor
  );
  const regroupPauseRange = scaleDelayRange(
    config.regroupPauseRange || regroupPauseBaseByTier[tier] || regroupPauseBaseByTier[3],
    thinkFactor
  );

  return {
    ...config,
    tier,
    accuracy,
    thinkRange,
    strokeDelay,
    thinkFactor,
    handwritingPaceFactor,
    openingPauseRange,
    problemPauseRange,
    regroupPauseRange,
    jitter,
    smoothness,
    lineWidthJitter,
    placementJitter
  };
}

const aiProfiles = {
  tom: createAiProfile({
    id: 'tom',
    name: 'Tom',
    tier: 1,
    difficulty: 'easy',
    accuracy: 0.58,
    speed: 45,
    jitter: 0.19,
    smoothness: 0.9,
    lineWidthJitter: 0.18,
    placementJitter: 0.12
  }),
  sam: createAiProfile({
    id: 'sam',
    name: 'Sam',
    tier: 2,
    difficulty: 'medium',
    accuracy: 0.74,
    speed: 63,
    jitter: 0.1,
    smoothness: 1.1,
    lineWidthJitter: 0.1,
    placementJitter: 0.07
  }),
  jack: createAiProfile({
    id: 'jack',
    name: 'Jack',
    tier: 3,
    difficulty: 'hard',
    accuracy: 0.84,
    speed: 75,
    jitter: 0.06,
    smoothness: 1.25,
    lineWidthJitter: 0.06,
    placementJitter: 0.04
  }),
  edison: createAiProfile({
    id: 'edison',
    name: 'Edison',
    tier: 4,
    difficulty: 'expert',
    accuracy: 0.9,
    speed: 85,
    jitter: 0.045,
    smoothness: 1.38,
    lineWidthJitter: 0.045,
    placementJitter: 0.03
  }),
  ariel: createAiProfile({
    id: 'ariel',
    name: 'Ariel',
    tier: 5,
    difficulty: 'master',
    accuracy: 0.95,
    speed: 90,
    jitter: 0.035,
    smoothness: 1.46,
    lineWidthJitter: 0.04,
    placementJitter: 0.025
  })
};

function clampLineupTimer(value) {
  const fallback = 60;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(15, Math.min(300, parsed));
}

function clampFirstToTarget(value) {
  const fallback = 10;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(5, Math.min(50, parsed));
}

function clampLineupFirstToTarget(value) {
  return clampFirstToTarget(value);
}

function populateNumericSelect(selectEl, min, max) {
  if (!selectEl) return;
  const existingValue = Number.parseInt(selectEl.value, 10);
  selectEl.innerHTML = '';
  for (let n = min; n <= max; n++) {
    const option = document.createElement('option');
    option.value = String(n);
    option.textContent = String(n);
    selectEl.appendChild(option);
  }
  if (Number.isFinite(existingValue) && existingValue >= min && existingValue <= max) {
    selectEl.value = String(existingValue);
  }
}

function updateVsEndModeUi() {
  const isFirstTo = gameSettings.vsEndMode === 'first-to';
  if (firstToTargetRow) {
    firstToTargetRow.classList.toggle('hidden', !isFirstTo);
  }
  if (lineupTimeSettingsGroup) {
    lineupTimeSettingsGroup.classList.toggle('hidden', isFirstTo);
  }
  if (lineupFirstToSettingsGroup) {
    lineupFirstToSettingsGroup.classList.toggle('hidden', !isFirstTo);
  }
  if (firstToTargetInput) {
    firstToTargetInput.value = String(clampFirstToTarget(gameSettings.firstToTarget));
  }
}

function updateVsHudByMode() {
  const isFirstTo = vsState.endMode === 'first-to';
  const p1DisplayValue = isFirstTo
    ? Math.max(0, vsState.firstToTarget - vsState.p1.score)
    : vsState.timeLeft;
  const p2DisplayValue = isFirstTo
    ? Math.max(0, vsState.firstToTarget - vsState.p2.score)
    : vsState.timeLeft;
  const unitLabel = isFirstTo ? '' : 's';

  if (p1.timerSpan) p1.timerSpan.textContent = String(p1DisplayValue);
  if (p2.timerSpan) p2.timerSpan.textContent = String(p2DisplayValue);
  if (p1.timerUnitSpan) p1.timerUnitSpan.textContent = unitLabel;
  if (p2.timerUnitSpan) p2.timerUnitSpan.textContent = unitLabel;
}

function hasFirstToWinner() {
  if (!vsState.running || vsState.endMode !== 'first-to') return false;
  if (vsState.p1.score >= vsState.firstToTarget) return true;
  if (vsState.p2.score >= vsState.firstToTarget) return true;
  return false;
}

function checkFirstToWinnerAndEnd() {
  if (!hasFirstToWinner()) return false;
  endVsGame();
  return true;
}

function syncLineupTimerInputs() {
  Object.entries(lineupTimerInputs).forEach(([id, input]) => {
    if (!input) return;
    const value = clampLineupTimer(gameSettings.lineupTimers[id]);
    gameSettings.lineupTimers[id] = value;
    input.value = String(value);
    input.addEventListener('change', () => {
      const nextValue = clampLineupTimer(input.value);
      gameSettings.lineupTimers[id] = nextValue;
      input.value = String(nextValue);
    });
  });
}

function syncLineupFirstToInputs() {
  Object.entries(lineupFirstToInputs).forEach(([id, input]) => {
    if (!input) return;
    populateNumericSelect(input, 5, 50);
    const value = clampLineupFirstToTarget(gameSettings.lineupFirstToTargets[id]);
    gameSettings.lineupFirstToTargets[id] = value;
    input.value = String(value);
    input.addEventListener('change', () => {
      const nextValue = clampLineupFirstToTarget(input.value);
      gameSettings.lineupFirstToTargets[id] = nextValue;
      input.value = String(nextValue);
    });
  });
}

function getLineupTimerForAi(aiId) {
  return clampLineupTimer(gameSettings.lineupTimers[aiId]);
}

function getLineupFirstToForAi(aiId) {
  return clampLineupFirstToTarget(gameSettings.lineupFirstToTargets[aiId]);
}

function updateAiCardStats() {
  aiCards.forEach(card => {
    const profile = aiProfiles[card.dataset.ai];
    if (!profile) return;
    const accuracyEl = card.querySelector('.ai-accuracy');
    const speedEl = card.querySelector('.ai-speed');
    if (accuracyEl) accuracyEl.textContent = `${Math.round(profile.accuracy * 100)}%`;
    if (speedEl) speedEl.textContent = `${Math.round(profile.speed)}`;
  });
}

const aiState = {
  active: false,
  busy: false,
  profile: null,
  thinkingTimer: null,
  openingPauseDone: false
};

function queueAiTurnWithPause(pauseRange, statusMessage) {
  if (!aiState.active || !vsState.running || !aiState.profile) return;
  const delay = randomDelayFromRange(pauseRange, 650);
  if (p2.status && statusMessage) p2.status.textContent = statusMessage;
  if (aiState.thinkingTimer) clearTimeout(aiState.thinkingTimer);
  aiState.thinkingTimer = setTimeout(() => {
    scheduleAiTurn();
  }, delay);
}

// VS Exit Footer reveal-on-intent behavior
let vsExitHideTimer = null;
let lastVsTouchY = null;
let vsExitArmTimer = null;
let vsExitSafetyArmed = false;

const VS_EXIT_ARM_MS = 3200;

function isVsScreenActive() {
  return !!(screens.vs && !screens.vs.classList.contains('hidden'));
}

function hideVsExitFooter() {
  if (!screens.vs) return;
  screens.vs.classList.remove('show-exit-footer');
  if (vsExitHideTimer) {
    clearTimeout(vsExitHideTimer);
    vsExitHideTimer = null;
  }
  if (vsExitArmTimer) {
    clearTimeout(vsExitArmTimer);
    vsExitArmTimer = null;
  }
  vsExitSafetyArmed = false;
}

function showVsExitFooter(durationMs = 1600) {
  if (!isVsScreenActive()) return;
  if (!vsExitSafetyArmed) return;
  screens.vs.classList.add('show-exit-footer');
  if (vsExitHideTimer) clearTimeout(vsExitHideTimer);
  vsExitHideTimer = setTimeout(() => {
    if (isVsScreenActive()) {
      screens.vs.classList.remove('show-exit-footer');
      vsExitSafetyArmed = false;
    }
  }, durationMs);
}

function armVsExitSafety() {
  if (!isVsScreenActive()) return;
  vsExitSafetyArmed = true;
  if (vsExitArmTimer) clearTimeout(vsExitArmTimer);
  vsExitArmTimer = setTimeout(() => {
    vsExitSafetyArmed = false;
    if (isVsScreenActive()) screens.vs.classList.remove('show-exit-footer');
  }, VS_EXIT_ARM_MS);
}

function isVsCanvasInteractionTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (target.tagName === 'CANVAS') return true;
  if (target.closest('.player-canvas-container')) return true;
  if (target.closest('.player-tabbed-canvas')) return true;
  if (target.closest('.canvas-tabs')) return true;
  if (target.closest('.canvas-panel')) return true;
  return false;
}

function isNearBottom(clientY) {
  const triggerBand = Math.max(76, Math.round(window.innerHeight * 0.14));
  return clientY >= (window.innerHeight - triggerBand);
}

function setupVsExitIntentReveal() {
  window.addEventListener('pointermove', (event) => {
    if (!isVsScreenActive()) return;
    if (isNearBottom(event.clientY)) {
      showVsExitFooter();
    }
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (!isVsScreenActive()) return;
    const target = event.target;
    if (!isVsCanvasInteractionTarget(target) && !target.closest('.vs-footer')) {
      armVsExitSafety();
    }
    if (isNearBottom(event.clientY)) {
      showVsExitFooter(2200);
    }
  }, { passive: true });

  window.addEventListener('touchstart', (event) => {
    if (!isVsScreenActive()) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const target = event.target;
    if (!isVsCanvasInteractionTarget(target) && !target.closest('.vs-footer')) {
      armVsExitSafety();
    }
    lastVsTouchY = touch.clientY;
    if (isNearBottom(touch.clientY)) {
      showVsExitFooter(2200);
    }
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!isVsScreenActive()) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const dy = lastVsTouchY == null ? 0 : touch.clientY - lastVsTouchY;
    lastVsTouchY = touch.clientY;

    // Intentional downward slide into bottom trigger zone.
    if (dy > 10 && isNearBottom(touch.clientY)) {
      showVsExitFooter(2200);
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    lastVsTouchY = null;
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (!isVsScreenActive()) return;
    if (event.key === 'Escape') {
      armVsExitSafety();
      showVsExitFooter(2600);
    }
  });
}

function updateModeButtons(){
  if (!singleModeBtn || !vsModeBtn) return;
  singleModeBtn.classList.toggle('selected', selectedPlayers==='single');
  vsModeBtn.classList.toggle('selected', selectedPlayers==='vs');
  if (vsAiModeBtn) vsAiModeBtn.classList.toggle('selected', selectedPlayers==='vs-ai');
  if (lineupModeBtn) lineupModeBtn.classList.toggle('selected', selectedPlayers==='lineup');
}
if (singleModeBtn) singleModeBtn.addEventListener('click', ()=>{
  resetLineupState();
  selectedPlayers='single';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('setup');
});
if (vsModeBtn) vsModeBtn.addEventListener('click', ()=>{
  resetLineupState();
  selectedPlayers='vs';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('setup');
});
if (vsAiModeBtn) vsAiModeBtn.addEventListener('click', ()=>{
  resetLineupState();
  selectedPlayers='vs-ai';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('setup');
});
if (lineupModeBtn) lineupModeBtn.addEventListener('click', () => {
  resetLineupState();
  selectedPlayers = 'lineup';
  selectedAiId = null;
  aiCards.forEach(card => card.classList.remove('selected'));
  if (aiStartBtn) aiStartBtn.disabled = true;
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('lineupTutorial');
});

if (lineupTutorialBackBtn) lineupTutorialBackBtn.addEventListener('click', () => {
  resetLineupState();
  selectedPlayers = 'single';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('menu');
});

if (lineupTutorialContinueBtn) lineupTutorialContinueBtn.addEventListener('click', () => {
  if (selectedPlayers !== 'lineup') selectedPlayers = 'lineup';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('setup');
});

if (setupBackBtn) setupBackBtn.addEventListener('click', () => {
  resetLineupState();
  selectedPlayers = 'single';
  updateModeButtons();
  updateSetupActionsForMode();
  showScreen('menu');
});

if (aiBackBtn) aiBackBtn.addEventListener('click', () => {
  selectedAiId = null;
  aiCards.forEach(card => card.classList.remove('selected'));
  if (aiStartBtn) aiStartBtn.disabled = true;
  if (selectedPlayers === 'vs-ai') {
    updateSetupActionsForMode();
    showScreen('setup');
  } else {
    resetLineupState();
    showScreen('menu');
  }
});

if (aiSetupBackBtn) aiSetupBackBtn.addEventListener('click', () => {
  selectedAiId = null;
  aiCards.forEach(card => card.classList.remove('selected'));
  if (aiStartBtn) aiStartBtn.disabled = true;
  resetLineupState();
  showScreen('menu');
});

if (aiSetupContinueBtn) aiSetupContinueBtn.addEventListener('click', () => {
  selectedAiId = null;
  aiCards.forEach(card => card.classList.remove('selected'));
  if (aiStartBtn) aiStartBtn.disabled = true;
  showScreen('aiSelect');
});

aiCards.forEach(card => {
  card.addEventListener('click', () => {
    aiCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    card.classList.remove('selection-burst');
    // force reflow so repeat clicks still retrigger animation
    void card.offsetWidth;
    card.classList.add('selection-burst');
    setTimeout(() => card.classList.remove('selection-burst'), 560);
    selectedAiId = card.dataset.ai;
    if (aiStartBtn) aiStartBtn.disabled = false;
  });
});

if (aiStartBtn) aiStartBtn.addEventListener('click', () => {
  if (!selectedAiId || !aiProfiles[selectedAiId]) return;
  fadeOutMenuMusic();
  startCountdown((warmupPromise) => {
    beginGameplayAfterCountdown(() => {
      startVsAiGame();
    }, warmupPromise);
  });
});

startBtn.addEventListener('click', () => {
  fadeOutMenuMusic();
  startCountdown((warmupPromise) => {
    beginGameplayAfterCountdown(() => {
      if (selectedPlayers === 'vs') startVsGame();
      else if (selectedPlayers === 'vs-ai') startVsAiGame();
      else if (selectedPlayers === 'lineup') startLineupChallenge();
      else startGame();
    }, warmupPromise);
  });
});
restartBtn.addEventListener('click', () => {
  fadeOutMenuMusic();
  startCountdown((warmupPromise) => {
    beginGameplayAfterCountdown(() => {
      if (selectedPlayers === 'vs') startVsGame();
      else if (selectedPlayers === 'vs-ai') startVsAiGame();
      else if (selectedPlayers === 'lineup') {
        if (lineupState.active && lineupState.awaitingNext) {
          startNextLineupMatch();
        } else {
          startLineupChallenge();
        }
      }
      else startGame();
    }, warmupPromise);
  });
});
menuBtn.addEventListener('click', () => {
  resetLineupState();
  showScreen('menu');
});
if (vsExitBtn) vsExitBtn.addEventListener('click', () => { endVsGame(true); });

// --- Game Logic Placeholders ---
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(modeOverride) {
  let a, b, op, answer, display;
  const baseMode = (modeOverride || gameSettings.mode) === 'random' ? ['add','sub','mul','div'][getRandomInt(0,3)] : (modeOverride || gameSettings.mode);
  let min = 1, max = 9;
  if (gameSettings.difficulty === 'medium') { min = 10; max = 99; }
  if (gameSettings.difficulty === 'hard') { min = 100; max = 999; }

  if (baseMode === 'add') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, max);
    answer = a + b;
    display = `${a} + ${b}`;
  } else if (baseMode === 'sub') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, a);
    answer = a - b;
    display = `${a} - ${b}`;
  } else if (baseMode === 'mul') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, max);
    answer = a * b;
    display = `${a} × ${b}`;
  } else if (baseMode === 'div') {
    b = getRandomInt(min, max);
    answer = getRandomInt(min, max);
    a = b * answer;
    display = `${a} ÷ ${b}`;
  }
  return { a, b, op: baseMode, answer, display, key: `${baseMode}:${a}:${b}` };
}

let currentProblem = null;
let timerInterval = null;
window.currentProblem = null; // Expose for handwriting.js
let usedProblems = new Set(); // track problems for current game

function showProblem() {
  let attempt = 0;
  let p = null;
  do {
    p = generateProblem();
    attempt++;
  } while (usedProblems.has(p.key) && attempt < 50);
  if (usedProblems.has(p.key)) usedProblems.clear();
  usedProblems.add(p.key);
  currentProblem = p;
  window.currentProblem = currentProblem;
  problemDiv.textContent = currentProblem.display;
  if (window.clearCanvas) window.clearCanvas();
}

function startTimer() {
  clearInterval(timerInterval);
  timer.textContent = gameState.timeLeft;
  timerInterval = setInterval(() => {
    gameState.timeLeft--;
    if (gameState.timeLeft <= 0) {
      gameState.timeLeft = 0;
      timer.textContent = gameState.timeLeft;
      endGame();
      return;
    }
    timer.textContent = gameState.timeLeft;
  }, 1000);
}

function checkAnswer() {
  let userInput = window.getHandwritingInput();
  if (!userInput) {
    showFeedbackPopup(feedback, 'Please write your answer!', '#fff', { visibleMs: 560, fadeOutMs: 420 });
    return;
  }
  let userAnswer = parseInt(userInput);
  if (userAnswer === currentProblem.answer) {
    gameState.score++;
    scoreboard.textContent = gameState.score;
    const popupMs = showFeedbackPopup(feedback, 'Correct! 🎉', '#4caf50', { visibleMs: 620, fadeOutMs: 460 });
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-correct'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-correct'), 1800); 
    }
    const problemEl = document.getElementById('problem');
    if (problemEl) { problemEl.classList.add('pulse-correct'); setTimeout(()=>problemEl.classList.remove('pulse-correct'), 950); }
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (checkAnswer) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
      }, 50);
    }, popupMs || 800);
  } else {
    const popupMs = showFeedbackPopup(feedback, 'Oops! Try again.', '#ff4e50', { visibleMs: 620, fadeOutMs: 460 });
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-wrong'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-wrong'), 950); 
    }
    const problemEl = document.getElementById('problem');
    if (problemEl) { problemEl.classList.add('pulse-wrong'); setTimeout(()=>problemEl.classList.remove('pulse-wrong'), 950); }
    if (window.wrongSound) window.wrongSound.play();
    setTimeout(() => {
      showProblem();
    }, popupMs || 800);
  }
}

// --- Updated Submit Flow ---
async function handleSubmit() {
  if (pendingPrediction) return;
  pendingPrediction = true;
  showPredictModal();
  let digit = '';
  if (window.recognizeHandwriting) {
    digit = await window.recognizeHandwriting();
  }
  pendingDigit = digit;
  showPredictResult(digit);
  pendingPrediction = false;
}

confirmYesBtn.addEventListener('click', () => {
  hidePredictModal();
  let userAnswer = parseInt(pendingDigit);
  if (userAnswer === currentProblem.answer) {
    gameState.score++;
    scoreboard.textContent = gameState.score;
    const popupMs = animateFeedback('correct');
    // pulse canvas and problem
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-correct'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-correct'), 1800); 
    }
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (predictModal) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
      }, 50);
    }, popupMs || 800);
  } else {
    const popupMs = animateFeedback('wrong');
    // pulse canvas for wrong answer
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-wrong'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-wrong'), 950); 
    }
    if (window.wrongSound) window.wrongSound.play();
    setTimeout(() => {
      showProblem();
    }, popupMs || 800);
  }
});

confirmNoBtn.addEventListener('click', () => {
  hidePredictModal();
  showFeedbackPopup(feedback, 'Try writing your answer again!', '#fff', { visibleMs: 640, fadeOutMs: 420 });
});

function endGame() {
  clearInterval(timerInterval);
  gameState.running = false;
  if (window.__idleTimer) { clearTimeout(window.__idleTimer); window.__idleTimer = null; }
  if (window.clearCanvas) window.clearCanvas();
  fadeOutBackgroundMusic(800);
  showScreen('over');
  finalScore.textContent = `Final Score: ${gameState.score}`;
}

// --- Game Logic Placeholders ---
function startGame() {
  gameState.score = 0;
  gameState.timeLeft = gameSettings.timer;
  gameState.running = true;
  usedProblems = new Set();
  scoreboard.textContent = '0';
  timer.textContent = gameState.timeLeft;
  if (timerUnit) timerUnit.textContent = 's';
  feedback.textContent = '';
  
  // Reset to Answer tab
  if (window.resetCanvasTab) window.resetCanvasTab('sp');
  
  // Setup single player work canvas
  const workCanvas = document.getElementById('work-canvas');
  console.log('🏁 Setting up single player work canvas:', !!workCanvas);
  if (workCanvas) {
    singlePlayerWorkClear = setupWorkCanvas(workCanvas, 'single-work');
    console.log('🧹 singlePlayerWorkClear created:', !!singlePlayerWorkClear);
    
    // Add clear button event listener for single player (remove any existing listeners first)
    if (workClearBtn && singlePlayerWorkClear) {
      console.log('🔘 Setting up manual clear button');
      // Remove existing event listener to prevent duplicates
      workClearBtn.replaceWith(workClearBtn.cloneNode(true));
      const newWorkClearBtn = document.getElementById('work-clear-btn');
      newWorkClearBtn.addEventListener('click', () => {
        console.log('🔘 Manual clear button clicked');
        singlePlayerWorkClear.clear();
      });
    }
  } else {
    console.error('❌ Work canvas element not found!');
  }
  showScreen('game');
  showProblem();
  startTimer();
}

// ------ VS MODE ------
function startVsGame(options = {}) {
  clearVsWinnerEffects();
  stopAiOpponent();
  hideVsExitFooter();
  const roundTimer = Number.isFinite(options.timerOverride)
    ? clampLineupTimer(options.timerOverride)
    : gameSettings.timer;
  const isFirstTo = gameSettings.vsEndMode === 'first-to';
  // Reset state
  vsState.running = true;
  vsState.endMode = isFirstTo ? 'first-to' : 'time';
  const firstToSource = Number.isFinite(Number.parseInt(options.firstToOverride, 10))
    ? options.firstToOverride
    : gameSettings.firstToTarget;
  vsState.firstToTarget = clampFirstToTarget(firstToSource);
  vsState.timeLeft = isFirstTo ? vsState.firstToTarget : roundTimer;
  vsState.p1.score = 0; vsState.p2.score = 0;
  vsState.used1 = new Set(); vsState.used2 = new Set();
  vsState.aiProfile = options.aiProfile || null;
  vsState.isVsAi = !!vsState.aiProfile;
  
  // Reset tabs to Answer for both players
  if (window.resetCanvasTab) {
    window.resetCanvasTab('p1');
    window.resetCanvasTab('p2');
  }
  
  // Problems
  vsState.p1.problem = uniqueProblem(vsState.used1);
  vsState.p2.problem = uniqueProblem(vsState.used2);
  p1.problemDiv.textContent = vsState.p1.problem.display;
  p2.problemDiv.textContent = vsState.p2.problem.display;
  p1.scoreSpan.textContent = '0';
  p2.scoreSpan.textContent = '0';
  updateVsHudByMode();
  // Clear canvases
  setupPlayerCanvas(p1, 'p1');
  setupPlayerCanvas(p2, 'p2');
  // Setup work area canvases
  p1.workClearFunc = setupWorkCanvas(p1.workCanvas, 'p1-work');
  p2.workClearFunc = setupWorkCanvas(p2.workCanvas, 'p2-work');

  // Disable AI canvas input if VS AI
  if (vsState.isVsAi) {
    if (p2.canvas) p2.canvas.style.pointerEvents = 'none';
    if (p2.workCanvas) p2.workCanvas.style.pointerEvents = 'none';
    if (p2.status && vsState.aiProfile) p2.status.textContent = `${vsState.aiProfile.name} is thinking...`;
  } else {
    if (p2.canvas) p2.canvas.style.pointerEvents = 'auto';
    if (p2.workCanvas) p2.workCanvas.style.pointerEvents = 'auto';
  }
  
  // Add clear button event listeners for VS mode (prevent duplicates)
  if (p1.workClearBtn && p1.workClearFunc) {
    p1.workClearBtn.replaceWith(p1.workClearBtn.cloneNode(true));
    p1.workClearBtn = document.getElementById('p1-work-clear-btn');
    p1.workClearBtn.addEventListener('click', () => p1.workClearFunc.clear());
  }
  if (p2.workClearBtn && p2.workClearFunc) {
    p2.workClearBtn.replaceWith(p2.workClearBtn.cloneNode(true));
    p2.workClearBtn = document.getElementById('p2-work-clear-btn');
    p2.workClearBtn.addEventListener('click', () => p2.workClearFunc.clear());
  }
  clearPlayerCanvas(p1);
  clearPlayerCanvas(p2);
  showScreen('vs');
  scheduleVsCenterAlignment();
  if (vsState.endMode === 'time') {
    startVsTimer();
  } else {
    clearInterval(vsState.timerInterval);
    updateVsHudByMode();
  }
  if (vsState.isVsAi && vsState.aiProfile) {
    initAiOpponent(vsState.aiProfile);
  }
}

function uniqueProblem(setRef) {
  let attempt = 0, p = null;
  do { p = generateProblem(); attempt++; } while (setRef.has(p.key) && attempt < 50);
  if (setRef.has(p.key)) setRef.clear();
  setRef.add(p.key);
  return p;
}

function startVsTimer() {
  clearInterval(vsState.timerInterval);
  if (vsState.endMode !== 'time') {
    updateVsHudByMode();
    return;
  }
  updateVsHudByMode();
  vsState.timerInterval = setInterval(() => {
    vsState.timeLeft--;
    if (vsState.timeLeft <= 0) {
      vsState.timeLeft = 0;
      updateVsHudByMode();
      endVsGame();
      return;
    }
    updateVsHudByMode();
  }, 1000);
}

function endVsGame(backToMenu = false) {
  clearInterval(vsState.timerInterval);
  vsState.running = false;
  stopAiOpponent();
  hideVsExitFooter();
  if (backToMenu) {
    resetLineupState();
    restartBtn.textContent = 'Restart';
    fadeOutBackgroundMusic(600);
    showScreen('menu');
    return;
  }
  fadeOutBackgroundMusic(800);
  const winner = vsState.p1.score === vsState.p2.score ? 'tie' : (vsState.p1.score > vsState.p2.score ? 'p1' : 'p2');
  showVsWinnerReveal(winner);
  
  // Extend the reveal time slightly to enjoy the new effects
  setTimeout(() => {
    // Hide the winner overlay before showing game over screen
    if (vsWinnerOverlay) {
      vsWinnerOverlay.classList.remove('active');
      setTimeout(() => vsWinnerOverlay.classList.add('hidden'), 500); // Wait for fade out
    }
    
    if (selectedPlayers === 'lineup' && lineupState.active) {
      const currentAi = vsState.aiProfile ? vsState.aiProfile.name : 'AI';
      if (winner === 'p1') {
        lineupState.wins += 1;
        lineupState.currentIndex += 1;

        if (lineupState.currentIndex >= lineupState.order.length) {
          lineupState.active = false;
          lineupState.awaitingNext = false;
          restartBtn.textContent = 'Restart';
          showScreen('over');
          finalScore.textContent = `🏆 King of The Hill Complete! You defeated all ${lineupState.order.length} AI opponents in a row.`;
        } else {
          const nextAi = aiProfiles[getCurrentLineupAiId()];
          lineupState.awaitingNext = true;
          restartBtn.textContent = 'Next Round';
          showScreen('over');
          finalScore.textContent = `Round cleared! ${currentAi} defeated. Next up: ${nextAi ? nextAi.name : 'Unknown'} (${lineupState.currentIndex + 1}/${lineupState.order.length}).`;
        }
      } else {
        lineupState.active = false;
        lineupState.awaitingNext = false;
        restartBtn.textContent = 'Restart';
        showScreen('over');
        finalScore.textContent = `Challenge ended on ${currentAi}. Wins in a row: ${lineupState.wins}/${lineupState.order.length}.`;
      }
      return;
    }

    restartBtn.textContent = 'Restart';
    showScreen('over');
    const aiLabel = vsState.isVsAi && vsState.aiProfile ? `${vsState.aiProfile.name} Wins!` : 'Player 2 Wins!';
    const label = winner === 'tie' ? 'Tie!' : (winner === 'p1' ? 'Player 1 Wins!' : aiLabel);
    finalScore.textContent = `${label}  P1: ${vsState.p1.score}  P2: ${vsState.p2.score}`;
  }, 4000); // Increased from 2600 to 4000 to give more time to celebrate
}

function startVsAiGame() {
  const profile = selectedAiId ? aiProfiles[selectedAiId] : aiProfiles.tom;
  const vsOptions = { aiProfile: profile };
  if (gameSettings.vsEndMode === 'first-to' && profile && profile.id) {
    vsOptions.firstToOverride = getLineupFirstToForAi(profile.id);
  }
  startVsGame(vsOptions);
}

function stopAiOpponent() {
  aiState.active = false;
  aiState.busy = false;
  aiState.openingPauseDone = false;
  if (aiState.thinkingTimer) {
    clearTimeout(aiState.thinkingTimer);
    aiState.thinkingTimer = null;
  }
}

function initAiOpponent(profile) {
  aiState.active = true;
  aiState.profile = profile;
  aiState.busy = false;
  aiState.openingPauseDone = false;
  queueAiTurnWithPause(
    profile.openingPauseRange,
    `${profile.name} is getting ready...`
  );
}

function scheduleAiTurn() {
  if (!aiState.active || !vsState.running || !aiState.profile) return;
  const [minDelay, maxDelay] = aiState.profile.thinkRange;
  const delay = getRandomInt(minDelay, maxDelay);
  if (p2.status) {
    const prefix = aiState.openingPauseDone ? '' : 'Focused • ';
    p2.status.textContent = `${prefix}${aiState.profile.name} is thinking...`;
  }
  aiState.openingPauseDone = true;
  if (aiState.thinkingTimer) clearTimeout(aiState.thinkingTimer);
  aiState.thinkingTimer = setTimeout(() => {
    aiTakeTurn();
  }, delay);
}

function generateAiWrongAnswer(answer) {
  const answerStr = String(answer);
  const len = answerStr.length;
  if (len === 1) {
    let candidate = getRandomInt(0, 9);
    if (candidate === answer) candidate = (candidate + 1) % 10;
    return String(candidate);
  }
  const offset = getRandomInt(1, 9);
  const sign = Math.random() < 0.5 ? -1 : 1;
  let wrong = Math.max(0, answer + sign * offset);
  const padded = String(wrong).padStart(len, '0');
  return padded.length > len ? padded.slice(0, len) : padded;
}

const aiDigitStrokes = {
  '0': [
    [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]
  ],
  '1': [
    [[0.5, 0.2], [0.5, 0.85]]
  ],
  '2': [
    [[0.2, 0.3], [0.75, 0.3], [0.8, 0.5], [0.25, 0.8], [0.8, 0.8]]
  ],
  '3': [
    [[0.2, 0.25], [0.7, 0.25], [0.55, 0.5], [0.7, 0.75], [0.2, 0.75]]
  ],
  '4': [
    [[0.75, 0.2], [0.75, 0.85]],
    [[0.2, 0.55], [0.8, 0.55]],
    [[0.2, 0.55], [0.6, 0.2]]
  ],
  '5': [
    [[0.8, 0.25], [0.25, 0.25], [0.25, 0.5], [0.7, 0.5], [0.8, 0.8], [0.25, 0.8]]
  ],
  '6': [
    [[0.75, 0.25], [0.35, 0.25], [0.25, 0.55], [0.45, 0.8], [0.75, 0.65], [0.45, 0.55]]
  ],
  '7': [
    [[0.2, 0.25], [0.8, 0.25], [0.45, 0.85]]
  ],
  '8': [
    [[0.5, 0.25], [0.75, 0.4], [0.5, 0.55], [0.25, 0.4], [0.5, 0.25]],
    [[0.5, 0.55], [0.75, 0.7], [0.5, 0.85], [0.25, 0.7], [0.5, 0.55]]
  ],
  '9': [
    [[0.75, 0.55], [0.55, 0.25], [0.25, 0.4], [0.55, 0.55], [0.75, 0.55], [0.75, 0.85]]
  ]
};

function getAiCanvasRect(canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}

function jitterPoint(x, y, jitter, width, height) {
  return {
    x: x + (Math.random() - 0.5) * jitter * width,
    y: y + (Math.random() - 0.5) * jitter * height
  };
}

function deriveAiHandwritingStyle(profile) {
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  const accuracy = clamp(Number(profile && profile.accuracy) || 0.7, 0.45, 0.99);
  const neatness = clamp((accuracy - 0.45) / 0.54, 0, 1);

  const baseJitter = Number(profile && profile.jitter);
  const baseSmoothness = Number(profile && profile.smoothness);
  const baseLineWidthJitter = Number(profile && profile.lineWidthJitter);
  const basePlacementJitter = Number(profile && profile.placementJitter);

  return {
    neatness,
    jitter: (Number.isFinite(baseJitter) ? baseJitter : lerp(0.22, 0.03, neatness)) * lerp(1.4, 0.46, neatness),
    smoothness: (Number.isFinite(baseSmoothness) ? baseSmoothness : lerp(0.84, 1.7, neatness)) * lerp(0.85, 1.26, neatness),
    lineWidthJitter: (Number.isFinite(baseLineWidthJitter) ? baseLineWidthJitter : lerp(0.2, 0.03, neatness)) * lerp(1.5, 0.42, neatness),
    placementJitter: (Number.isFinite(basePlacementJitter) ? basePlacementJitter : lerp(0.16, 0.02, neatness)) * lerp(1.35, 0.38, neatness),
    baselineJitter: lerp(0.12, 0.025, neatness),
    slantBase: lerp(-0.045, 0.07, neatness),
    slantVariance: lerp(0.16, 0.035, neatness),
    strokePressure: lerp(0.1, 0.3, neatness),
    segmentStepBias: lerp(1.18, 0.82, neatness),
    strokeDelayScale: lerp(1.07, 0.91, neatness)
  };
}

async function drawAiHandwriting(answerStr, profile) {
  if (!p2.canvas || !profile) return;
  const canvas = p2.canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  clearPlayerCanvas(p2);

  const { width, height } = getAiCanvasRect(canvas);
  const digitCount = answerStr.length;
  const maxWidth = width * 0.72;
  const spacing = width * 0.04;
  const digitWidth = Math.min(width * 0.18, (maxWidth - spacing * (digitCount - 1)) / digitCount);
  const digitHeight = height * 0.6;
  const startX = (width - (digitWidth * digitCount + spacing * (digitCount - 1))) / 2;
  const startY = height * 0.2;

  const style = deriveAiHandwritingStyle(profile);
  const smoothness = style.smoothness || 1;
  const placementJitter = style.placementJitter || 0;
  const lineWidthJitter = style.lineWidthJitter || 0;
  const speed = Math.max(25, Math.min(100, Number(profile && profile.speed) || 60));
  const speedNorm = (speed - 25) / 75;
  const speedBoost = 1.24 - speedNorm * 0.55;
  const paceFactor = Number(profile && profile.handwritingPaceFactor) || 1;
  const effectiveStrokeDelay = Math.max(2, Math.round((profile.strokeDelay || 10) * style.strokeDelayScale * speedBoost * paceFactor));
  const baseLineWidth = Math.max(3, Math.round(7 * (width / 480)));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';

  for (let i = 0; i < digitCount; i++) {
    if (!aiState.active || !vsState.running) return;
    const digit = answerStr[i];
    const strokes = aiDigitStrokes[digit] || aiDigitStrokes['0'];
    const offsetX = (Math.random() - 0.5) * placementJitter * digitWidth * 2;
    const offsetY = ((Math.random() - 0.5) * placementJitter + (Math.random() - 0.5) * style.baselineJitter) * digitHeight * 2;
    const baseX = startX + i * (digitWidth + spacing) + offsetX;
    const baseY = startY + offsetY;
    const slant = style.slantBase + (Math.random() - 0.5) * style.slantVariance;
    const slantTan = Math.tan(slant);

    for (const stroke of strokes) {
      if (!aiState.active || !vsState.running) return;
      let lastPoint = null;
      ctx.lineWidth = Math.max(2, baseLineWidth * (1 + (Math.random() - 0.5) * lineWidthJitter * 2));
      const strokeLen = Math.max(1, stroke.length - 1);
      for (let pointIndex = 0; pointIndex < stroke.length; pointIndex++) {
        const point = stroke[pointIndex];
        const centeredX = (point[0] - 0.5) * digitWidth;
        const centeredY = (point[1] - 0.5) * digitHeight;
        const rawX = baseX + digitWidth * 0.5 + centeredX + centeredY * slantTan;
        const rawY = baseY + digitHeight * 0.5 + centeredY;
        const jittered = jitterPoint(rawX, rawY, style.jitter, digitWidth, digitHeight);

        if (lastPoint) {
          const dx = jittered.x - lastPoint.x;
          const dy = jittered.y - lastPoint.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const stepSize = Math.max(1.8, (6 / smoothness) * style.segmentStepBias);
          const steps = Math.max(3, Math.ceil(dist / stepSize));
          for (let s = 1; s <= steps; s++) {
            if (!aiState.active || !vsState.running) return;
            const t = s / steps;
            const x = lastPoint.x + dx * t;
            const y = lastPoint.y + dy * t;
            const strokeProgress = (pointIndex - 1 + t) / strokeLen;
            const pressure = 0.92 + Math.sin(strokeProgress * Math.PI) * style.strokePressure;
            const widthVariance = 1 + (Math.random() - 0.5) * lineWidthJitter;
            ctx.lineWidth = Math.max(2, baseLineWidth * pressure * widthVariance);
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            await new Promise(resolve => setTimeout(resolve, effectiveStrokeDelay));
          }
        } else {
          ctx.lineWidth = Math.max(2, baseLineWidth * (0.9 + Math.random() * 0.18));
          ctx.beginPath();
          ctx.arc(jittered.x, jittered.y, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        lastPoint = jittered;
      }
    }
  }
}

async function aiTakeTurn() {
  if (!aiState.active || aiState.busy || !vsState.running || !aiState.profile) return;
  aiState.busy = true;
  const profile = aiState.profile;
  const problem = vsState.p2.problem;
  if (!problem) {
    aiState.busy = false;
    scheduleAiTurn();
    return;
  }
  const correct = Math.random() < profile.accuracy;
  const answerStr = correct ? String(problem.answer) : generateAiWrongAnswer(problem.answer);
  if (p2.status) p2.status.textContent = `${profile.name} is writing...`;
  await drawAiHandwriting(answerStr, profile);
  if (!aiState.active || !vsState.running) {
    aiState.busy = false;
    return;
  }

  if (correct) {
    vsState.p2.score++;
    p2.scoreSpan.textContent = vsState.p2.score;
    updateVsHudByMode();
    var aiPopupMs = 0;
    if (p2.feedback) {
      aiPopupMs = showFeedbackPopup(p2.feedback, `${profile.name} got it!`, '#4caf50', { visibleMs: 540, fadeOutMs: 420 });
    }
    if (p2.canvas) {
      p2.canvas.classList.add('pulse-correct');
      setTimeout(() => p2.canvas.classList.remove('pulse-correct'), 950);
    }
    autoStageWork(p2);

    if (checkFirstToWinnerAndEnd()) {
      aiState.busy = false;
      return;
    }
  } else {
    var aiPopupMs = 0;
    if (p2.feedback) {
      aiPopupMs = showFeedbackPopup(p2.feedback, `${profile.name} wrote ${answerStr}`, '#ff4e50', { visibleMs: 580, fadeOutMs: 440 });
    }
    if (p2.canvas) {
      p2.canvas.classList.add('pulse-wrong');
      setTimeout(() => p2.canvas.classList.remove('pulse-wrong'), 950);
    }
  }

  const wasCorrect = correct;
  setTimeout(() => {
    if (!vsState.running || !aiState.active) return;
    if (wasCorrect) {
      vsState.p2.problem = uniqueProblem(vsState.used2);
      p2.problemDiv.textContent = vsState.p2.problem.display;
    }
    clearPlayerCanvas(p2);
    aiState.busy = false;
    if (wasCorrect) {
      queueAiTurnWithPause(
        profile.problemPauseRange,
        `${profile.name} is reading the next problem...`
      );
    } else {
      queueAiTurnWithPause(
        profile.regroupPauseRange,
        `${profile.name} is rechecking...`
      );
    }
  }, aiPopupMs || 760);
}

function clearVsWinnerEffects() {
  if (player1El) player1El.classList.remove('vs-winner', 'vs-runnerup', 'vs-tie');
  if (player2El) player2El.classList.remove('vs-winner', 'vs-runnerup', 'vs-tie');
  if (player1Badge) player1Badge.textContent = 'Player 1';
  if (player2Badge) player2Badge.textContent = 'Player 2';
  
  // Clear new overlay elements
  const p1Section = document.getElementById('vs-result-p1');
  const p2Section = document.getElementById('vs-result-p2');
  if (p1Section) p1Section.classList.remove('winner', 'loser', 'tie');
  if (p2Section) p2Section.classList.remove('winner', 'loser', 'tie');

  // Clear confetti
  const p1ConfettiArea = document.getElementById('p1-confetti-area');
  const p2ConfettiArea = document.getElementById('p2-confetti-area');
  if (p1ConfettiArea) p1ConfettiArea.innerHTML = '';
  if (p2ConfettiArea) p2ConfettiArea.innerHTML = '';

  if (vsWinnerOverlay) {
    vsWinnerOverlay.classList.add('hidden');
    vsWinnerOverlay.classList.remove('active');
  }
}

function showVsWinnerReveal(winner) {
  clearVsWinnerEffects();
  if (!vsWinnerOverlay) return;

  const p1Section = document.getElementById('vs-result-p1');
  const p2Section = document.getElementById('vs-result-p2');
  
  const p1Title = document.getElementById('p1-result-title');
  const p2Title = document.getElementById('p2-result-title');
  
  const p1Msg = document.getElementById('p1-result-message');
  const p2Msg = document.getElementById('p2-result-message');
  
  const p1Score = document.getElementById('p1-final-score');
  const p2Score = document.getElementById('p2-final-score');
  
  const p1Icon = document.getElementById('p1-result-icon');
  const p2Icon = document.getElementById('p2-result-icon');

  const p1ConfettiArea = document.getElementById('p1-confetti-area');
  const p2ConfettiArea = document.getElementById('p2-confetti-area');

  // Set scores
  if (p1Score) p1Score.textContent = `Score: ${vsState.p1.score}`;
  if (p2Score) p2Score.textContent = `Score: ${vsState.p2.score}`;

  if (winner === 'p1') {
    // Player 1 Wins
    p1Section.classList.add('winner');
    p2Section.classList.add('loser');
    
    if (p1Title) p1Title.textContent = 'WINNER!';
    if (p2Title) p2Title.textContent = 'Nice Try';
    
    if (p1Msg) p1Msg.textContent = 'You are the champion!';
    if (p2Msg) p2Msg.textContent = 'Better luck next time!';
    
    if (p1Icon) p1Icon.textContent = '👑';
    if (p2Icon) p2Icon.textContent = '👏'; // Clapping hands or medal?

    // Add confetti to P1
    addConfetti(p1ConfettiArea);

  } else if (winner === 'p2') {
    // Player 2 Wins
    p2Section.classList.add('winner');
    p1Section.classList.add('loser');
    
    if (p2Title) p2Title.textContent = 'WINNER!';
    if (p1Title) p1Title.textContent = 'Nice Try';
    
    if (p2Msg) p2Msg.textContent = 'You are the champion!';
    if (p1Msg) p1Msg.textContent = 'Better luck next time!';
    
    if (p2Icon) p2Icon.textContent = '👑';
    if (p1Icon) p1Icon.textContent = '👏';

    // Add confetti to P2
    addConfetti(p2ConfettiArea);

  } else {
    // Tie
    p1Section.classList.add('tie');
    p2Section.classList.add('tie');
    
    if (p1Title) p1Title.textContent = 'TIE GAME!';
    if (p2Title) p2Title.textContent = 'TIE GAME!';
    
    if (p1Msg) p1Msg.textContent = 'Great match!';
    if (p2Msg) p2Msg.textContent = 'Great match!';
    
    if (p1Icon) p1Icon.textContent = '🤝';
    if (p2Icon) p2Icon.textContent = '🤝';
    
    addConfetti(p1ConfettiArea, 15); // Less confetti for tie
    addConfetti(p2ConfettiArea, 15);
  }

  vsWinnerOverlay.classList.remove('hidden');
  // Force reflow
  void vsWinnerOverlay.offsetWidth;
  vsWinnerOverlay.classList.add('active');
}

function addConfetti(container, count = 40) {
  if (!container) return;
  const colors = ['#ff4e50', '#f9d423', '#2196f3', '#4caf50', '#ff7ae3'];
  
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.classList.add('vs-confetti-particle');
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 1 + 's';
    el.style.width = (Math.random() * 10 + 5) + 'px';
    el.style.height = (Math.random() * 10 + 5) + 'px';
    container.appendChild(el);
  }
}

function setupPlayerCanvas(player, id) {
  const canvas = player.canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let drawing = false; let lastX = 0, lastY = 0;
  const SUBMIT_DELAY_MS = 800; // Reduced for faster response
  let idleTimer = null;

  // Track touches specific to THIS canvas only
  const canvasTouches = new Map(); // touchId -> { lastX, lastY }

  function resize() {
    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const newW = Math.max(1, Math.round(cssW * scale));
    const newH = Math.max(1, Math.round(cssH * scale));
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW; canvas.height = newH; ctx.setTransform(scale,0,0,scale,0,0);
      ctx.lineCap='round'; ctx.lineJoin='round';
    }
  }
  resize();
  window.addEventListener('resize', resize);

  function getPos(touch){
    const rect = canvas.getBoundingClientRect();
    let x = touch.clientX - rect.left;
    let y = touch.clientY - rect.top;
    
    // Check if this canvas is rotated 180 degrees (Player 2)
    const canvasContainer = canvas.closest('.player-canvas-container');
    if (canvasContainer && canvasContainer.classList.contains('rotate180')) {
      // Adjust coordinates for 180-degree rotation
      x = rect.width - x;
      y = rect.height - y;
    }
    
    return { x, y };
  }

  function isBlank(){
    const blank = document.createElement('canvas');
    blank.width = canvas.width; blank.height = canvas.height;
    return ctx.getImageData(0,0,canvas.width,canvas.height).data.toString()===blank.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.toString();
  }

  function clear(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas.classList.remove('drawing','processing');
    if (player.status) player.status.textContent='Draw your answer';
  }
  player.clear = clear;
  player.isBlank = isBlank;

  // Mouse events (for desktop)
  function startDraw(e){
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    // Handle rotation for Player 2
    const canvasContainer = canvas.closest('.player-canvas-container');
    if (canvasContainer && canvasContainer.classList.contains('rotate180')) {
      lastX = rect.width - lastX;
      lastY = rect.height - lastY;
    }
    
    canvas.classList.add('drawing'); canvas.classList.remove('processing');
    if (player.status) player.status.textContent='Drawing...';
  }
  
  function draw(e){
    if(!drawing) return; 
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Handle rotation for Player 2
    const canvasContainer = canvas.closest('.player-canvas-container');
    if (canvasContainer && canvasContainer.classList.contains('rotate180')) {
      x = rect.width - x;
      y = rect.height - y;
    }
    
    const base = 8;
    const scaleStroke = Math.max(4, Math.round(base * (rect.width / 480)));
    ctx.lineWidth = scaleStroke; ctx.strokeStyle='#000'; ctx.fillStyle='#000';
    
    const distance = Math.sqrt((x-lastX)**2+(y-lastY)**2);
    if (distance>1.5){ 
      const steps=Math.ceil(distance/1.5); 
      for(let i=0;i<=steps;i++){ 
        const t=i/steps; 
        const ix=lastX+(x-lastX)*t; 
        const iy=lastY+(y-lastY)*t; 
        ctx.beginPath(); ctx.arc(ix,iy,scaleStroke/2,0,Math.PI*2); ctx.fill(); 
      }
    }
    ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); 
    lastX=x; lastY=y;
    
    if (idleTimer) { clearTimeout(idleTimer); idleTimer=null; }
  }
  
  function endDraw(){
    drawing=false; canvas.classList.remove('drawing');
    if (player.status){ 
      if (!isBlank()) player.status.textContent='Analyzing...'; 
      else player.status.textContent='Draw your answer'; 
    }
    if (!isBlank()) { 
      if (idleTimer) clearTimeout(idleTimer); 
      idleTimer=setTimeout(()=>autoRecognize(), SUBMIT_DELAY_MS); 
    }
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  
  // ============================================================================
  // MULTI-TOUCH HANDLING - Isolated per canvas for VS mode
  // ============================================================================
  
  function touchStart(e){
    // Prevent default to stop zoom/scroll
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const canvasContainer = canvas.closest('.player-canvas-container');
    const isRotated = canvasContainer && canvasContainer.classList.contains('rotate180');
    
    // Process each new touch
    for (const touch of e.changedTouches) {
      // Check if this touch started on THIS canvas
      if (touch.target === canvas) {
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;
        
        // Adjust for rotation (Player 2)
        if (isRotated) {
          x = rect.width - x;
          y = rect.height - y;
        }
        
        // Store this touch for this canvas
        canvasTouches.set(touch.identifier, { lastX: x, lastY: y });
        drawing = true;
      }
    }
    
    if (canvasTouches.size > 0) {
      canvas.classList.add('drawing'); 
      canvas.classList.remove('processing');
      if (player.status) player.status.textContent='Drawing...';
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    }
  }
  
  function touchMove(e){
    // Only process if we have touches on this canvas
    if (canvasTouches.size === 0) return;
    
    // CRITICAL: Prevent default to stop ALL browser gestures
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const canvasContainer = canvas.closest('.player-canvas-container');
    const isRotated = canvasContainer && canvasContainer.classList.contains('rotate180');
    
    const base = 8;
    const scaleStroke = Math.max(4, Math.round(base * (rect.width / 480)));
    ctx.lineWidth = scaleStroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    
    // Process each touch that belongs to this canvas
    for (const touch of e.changedTouches) {
      const state = canvasTouches.get(touch.identifier);
      if (!state) continue; // This touch doesn't belong to this canvas
      
      let x = touch.clientX - rect.left;
      let y = touch.clientY - rect.top;
      
      // Adjust for rotation (Player 2)
      if (isRotated) {
        x = rect.width - x;
        y = rect.height - y;
      }
      
      // Draw smooth line
      const dist = Math.sqrt((x - state.lastX) ** 2 + (y - state.lastY) ** 2);
      if (dist > 1.5) {
        const steps = Math.ceil(dist / 1.5);
        for (let i = 0; i <= steps; i++) {
          const f = i / steps;
          const ix = state.lastX + (x - state.lastX) * f;
          const iy = state.lastY + (y - state.lastY) * f;
          ctx.beginPath();
          ctx.arc(ix, iy, scaleStroke / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // Update last position for this touch
      state.lastX = x;
      state.lastY = y;
    }
    
    // Reset idle timer while drawing
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  }
  
  function touchEnd(e){
    e.preventDefault();
    e.stopPropagation();
    
    // Remove ended touches from our tracking
    for (const touch of e.changedTouches) {
      canvasTouches.delete(touch.identifier);
    }
    
    // If all touches on this canvas are done, trigger end draw
    if (canvasTouches.size === 0 && drawing) {
      endDraw();
    }
  }
  
  // Use capture phase to ensure we get events before other handlers
  canvas.addEventListener('touchstart', touchStart, { passive: false, capture: true });
  canvas.addEventListener('touchmove', touchMove, { passive: false, capture: true });
  canvas.addEventListener('touchend', touchEnd, { passive: false, capture: true });
  canvas.addEventListener('touchcancel', touchEnd, { passive: false, capture: true });

  async function autoRecognize(){
    if (!vsState.running || isBlank()) return;
    canvas.classList.add('processing'); canvas.classList.remove('drawing');
    if (player.status) player.status.textContent='🔬 Analyzing...';

    const expectedProblem = (player===p1? vsState.p1.problem: vsState.p2.problem);
    const expectedStr = String(expectedProblem.answer);
    const expectedLen = expectedStr.length;

    try {
      // Build a cropped, tight canvas around drawing to improve accuracy
      const bounds = (window.hm_getDrawingBounds? window.hm_getDrawingBounds(canvas) : null);
      let src = canvas;
      if (bounds && bounds.width>4 && bounds.height>4){
        const sub = document.createElement('canvas'); sub.width=bounds.width; sub.height=bounds.height;
        sub.getContext('2d').drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0,0, bounds.width, bounds.height);
        src = sub;
      }

      // Run multi recognizers
      const [multi, mlSingle] = await Promise.all([
        window.hm_recognizeMultiDigitFromCanvas ? window.hm_recognizeMultiDigitFromCanvas(src, expectedLen) : '',
        window.hm_recognizeDigitMLFromCanvas ? window.hm_recognizeDigitMLFromCanvas(src) : null
      ]);
      const mlDigit = mlSingle? mlSingle.digit : null;

      const raw = [];
      if (multi) raw.push(String(multi));
      if (mlDigit!=null) raw.push(String(mlDigit));

      const uniq = Array.from(new Set(raw));
      // Simple scoring: prefer exact match and expected length
      let best = '';
      if (uniq.includes(expectedStr)) best = expectedStr; else best = uniq.find(c=>c.length===expectedLen) || uniq[0] || '';

      const correct = best === expectedStr;
      if (correct) {
        if (player===p1) { vsState.p1.score++; p1.scoreSpan.textContent = vsState.p1.score; }
        else { vsState.p2.score++; p2.scoreSpan.textContent = vsState.p2.score; }
        updateVsHudByMode();
        if (player.feedback) {
          showFeedbackPopup(player.feedback, 'Correct! 🎉', '#4caf50', { visibleMs: 540, fadeOutMs: 420 });
        }
        // pulse that player's canvas and problem
        if (player.canvas) { player.canvas.classList.add('pulse-correct'); setTimeout(()=>player.canvas.classList.remove('pulse-correct'), 950); }
        // Auto-clear work area for the player who got it correct
        console.log('🎯 CORRECT ANSWER (VS mode) - calling autoStageWork() for player:', player === p1 ? 'Player 1' : 'Player 2');
        autoStageWork(player);

        if (checkFirstToWinnerAndEnd()) {
          clear();
          return;
        }

        if (player===p1){ vsState.p1.problem = uniqueProblem(vsState.used1); p1.problemDiv.textContent = vsState.p1.problem.display; }
        else { vsState.p2.problem = uniqueProblem(vsState.used2); p2.problemDiv.textContent = vsState.p2.problem.display; }
      } else {
        if (player.feedback) {
          showFeedbackPopup(
            player.feedback,
            best ? `Incorrect (${best})` : 'Unclear — try again',
            best ? '#ff4e50' : '#fff',
            { visibleMs: 580, fadeOutMs: 440 }
          );
        }
        if (player.canvas) { player.canvas.classList.add('pulse-wrong'); setTimeout(()=>player.canvas.classList.remove('pulse-wrong'), 950); }
      }
      clear();
    } catch(err){
      console.error('VS recognize error', err);
      if (player.status) player.status.textContent='⚠️ Recognition error';
    } finally {
      canvas.classList.remove('processing');
    }
  }
}

function setupWorkCanvas(canvas, label) {
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let drawing = false; 
  let lastX = 0, lastY = 0;
  
  // Track touches specific to THIS canvas only
  const canvasTouches = new Map();

  function resize() {
    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const newW = Math.max(1, Math.round(cssW * scale));
    const newH = Math.max(1, Math.round(cssH * scale));
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW; canvas.height = newH; ctx.setTransform(scale,0,0,scale,0,0);
      ctx.lineCap='round'; ctx.lineJoin='round';
    }
  }
  resize();
  window.addEventListener('resize', resize);

  function startDraw(e){
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    // Handle rotation for Player 2
    const canvasContainer = canvas.closest('.player-canvas-container');
    if (canvasContainer && canvasContainer.classList.contains('rotate180')) {
      lastX = rect.width - lastX;
      lastY = rect.height - lastY;
    }
  }
  
  function draw(e){
    if(!drawing) return; 
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Handle rotation for Player 2
    const canvasContainer = canvas.closest('.player-canvas-container');
    if (canvasContainer && canvasContainer.classList.contains('rotate180')) {
      x = rect.width - x;
      y = rect.height - y;
    }
    
    const base = 8;
    const scaleStroke = Math.max(4, Math.round(base * (rect.width / 480)));
    ctx.lineWidth = scaleStroke; 
    ctx.strokeStyle='#000'; 
    ctx.fillStyle='#000';
    
    const distance = Math.sqrt((x-lastX)**2+(y-lastY)**2);
    if (distance>1.5){ 
      const steps=Math.ceil(distance/1.5); 
      for(let i=0;i<=steps;i++){ 
        const t=i/steps; 
        const ix=lastX+(x-lastX)*t; 
        const iy=lastY+(y-lastY)*t; 
        ctx.beginPath(); 
        ctx.arc(ix,iy,scaleStroke/2,0,Math.PI*2); 
        ctx.fill(); 
      }
    }
    ctx.beginPath(); 
    ctx.moveTo(lastX,lastY); 
    ctx.lineTo(x,y); 
    ctx.stroke(); 
    lastX=x; 
    lastY=y;
  }
  
  function endDraw(){
    drawing=false;
  }

  function clearWork(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Mouse events
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  
  // ============================================================================
  // MULTI-TOUCH HANDLING - Isolated per canvas
  // ============================================================================
  
  function touchStart(e){
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const canvasContainer = canvas.closest('.player-canvas-container');
    const isRotated = canvasContainer && canvasContainer.classList.contains('rotate180');
    
    for (const touch of e.changedTouches) {
      if (touch.target === canvas) {
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;
        
        if (isRotated) {
          x = rect.width - x;
          y = rect.height - y;
        }
        
        canvasTouches.set(touch.identifier, { lastX: x, lastY: y });
        drawing = true;
      }
    }
  }
  
  function touchMove(e){
    if (canvasTouches.size === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const canvasContainer = canvas.closest('.player-canvas-container');
    const isRotated = canvasContainer && canvasContainer.classList.contains('rotate180');
    
    const base = 8;
    const scaleStroke = Math.max(4, Math.round(base * (rect.width / 480)));
    ctx.lineWidth = scaleStroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    
    for (const touch of e.changedTouches) {
      const state = canvasTouches.get(touch.identifier);
      if (!state) continue;
      
      let x = touch.clientX - rect.left;
      let y = touch.clientY - rect.top;
      
      if (isRotated) {
        x = rect.width - x;
        y = rect.height - y;
      }
      
      const dist = Math.sqrt((x - state.lastX) ** 2 + (y - state.lastY) ** 2);
      if (dist > 1.5) {
        const steps = Math.ceil(dist / 1.5);
        for (let i = 0; i <= steps; i++) {
          const f = i / steps;
          const ix = state.lastX + (x - state.lastX) * f;
          const iy = state.lastY + (y - state.lastY) * f;
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
    }
  }
  
  function touchEnd(e){
    e.preventDefault();
    e.stopPropagation();
    
    for (const touch of e.changedTouches) {
      canvasTouches.delete(touch.identifier);
    }
    
    if (canvasTouches.size === 0) {
      endDraw();
    }
  }
  
  canvas.addEventListener('touchstart', touchStart, { passive: false, capture: true });
  canvas.addEventListener('touchmove', touchMove, { passive: false, capture: true });
  canvas.addEventListener('touchend', touchEnd, { passive: false, capture: true });
  canvas.addEventListener('touchcancel', touchEnd, { passive: false, capture: true });
  
  // Store resize function globally for tab switching to call
  if (canvas.id) {
    window.canvasResizeFuncs = window.canvasResizeFuncs || {};
    window.canvasResizeFuncs[canvas.id] = resize;
    console.log(`[WorkCanvas] Stored resize function for ${canvas.id}`);
  }
  
  return { clear: clearWork, resize: resize };
}

function clearPlayerCanvas(player){ if (player && player.clear) player.clear(); }

// Auto-correct callback for handwriting.js (single-player only)
window.onAutoCorrect = (function() {
  let solving = false;
  return function() {
    if (!gameState.running || solving) return;
    solving = true;
    gameState.score++;
    scoreboard.textContent = gameState.score;
    const popupMs = showFeedbackPopup(feedback, 'Auto! 🎉', '#4caf50', { visibleMs: 620, fadeOutMs: 460 });
    feedback.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], { duration: 400 });
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (onAutoCorrect) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
        solving = false;
      }, 50);
    }, popupMs || 800);
  };
})();

// --- Initialization ---
function init() {
  setupFullscreenExperience();
  setupVsExitIntentReveal();
  modeSelect.value = gameSettings.mode;
  difficultySelect.value = gameSettings.difficulty;
  showScreen('menu');
  timerSelect.value = gameSettings.timer;
  if (vsEndModeSelect) vsEndModeSelect.value = gameSettings.vsEndMode;
  if (firstToTargetInput) populateNumericSelect(firstToTargetInput, 5, 50);
  gameSettings.firstToTarget = clampFirstToTarget(gameSettings.firstToTarget);
  if (firstToTargetInput) firstToTargetInput.value = String(gameSettings.firstToTarget);
  updateVsEndModeUi();
  musicToggle.checked = gameSettings.music;
  if (musicVolume) musicVolume.value = Math.round(gameSettings.musicVolume * 100);
  if (autoClearToggleSettings) autoClearToggleSettings.checked = gameSettings.autoClearWork;
  // Default highlight Single Player
  selectedPlayers = 'single';
  updateModeButtons();
  updateSetupActionsForMode();
  updateAiCardStats();
  syncLineupTimerInputs();
  syncLineupFirstToInputs();
  registerBackgroundLoop();
  updateMusicVolume(gameSettings.musicVolume);
  playMenuMusic();
  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, function onFirstInteraction() {
      document.removeEventListener(eventName, onFirstInteraction);
      if (screens.menu && !screens.menu.classList.contains('hidden')) {
        playMenuMusic();
      } else if (screens.game && !screens.game.classList.contains('hidden')) {
        playRandomBackgroundMusic();
      }
    }, { once: true });
  });

  // Keep VS split center aligned to the physical viewport center.
  window.addEventListener('resize', () => {
    if (screens.vs && !screens.vs.classList.contains('hidden')) {
      scheduleVsCenterAlignment();
    }
  });
  window.addEventListener('orientationchange', () => {
    if (screens.vs && !screens.vs.classList.contains('hidden')) {
      scheduleVsCenterAlignment();
    }
  });
  window.addEventListener('viewportUpdate', () => {
    if (screens.vs && !screens.vs.classList.contains('hidden')) {
      scheduleVsCenterAlignment();
    }
  });
}

// Test function for auto-clear (call from browser console)
window.testAutoClear = function() {
  console.log('=== AUTO-CLEAR TEST ===');
  console.log('Settings toggle:', document.getElementById('auto-clear-toggle-settings'));
  console.log('singlePlayerWorkClear:', singlePlayerWorkClear);
  console.log('p1.workClearFunc:', p1.workClearFunc);
  console.log('p2.workClearFunc:', p2.workClearFunc);
  
  // Test auto-clear function directly
  console.log('Testing single player auto-clear...');
  autoStageWork();
  
  console.log('Testing VS mode auto-clear for p1...');
  autoStageWork(p1);
};

// Test function to simulate correct answer (call from browser console)
window.simulateCorrectAnswer = function() {
  console.log('=== SIMULATING CORRECT ANSWER ===');
  if (gameState.running) {
    console.log('Single player mode - simulating correct answer...');
    gameState.score++;
    scoreboard.textContent = gameState.score;
    const popupMs = showFeedbackPopup(feedback, 'Correct! 🎉', '#4caf50', { visibleMs: 620, fadeOutMs: 460 });
    autoStageWork(); // This should trigger auto-clear if toggle is checked
    setTimeout(() => {
      showProblem();
    }, popupMs || 800);
  } else if (vsState.running) {
    console.log('VS mode - simulating p1 correct answer...');
    vsState.p1.score++;
    p1.scoreSpan.textContent = vsState.p1.score;
    if (p1.feedback) {
      showFeedbackPopup(p1.feedback, 'Correct! 🎉', '#4caf50', { visibleMs: 540, fadeOutMs: 420 });
    }
    autoStageWork(p1); // This should trigger auto-clear for p1 if toggle is checked
    vsState.p1.problem = uniqueProblem(vsState.used1);
    p1.problemDiv.textContent = vsState.p1.problem.display;
  } else {
    console.log('No game running. Start a game first.');
  }
};

// Direct test for auto-clear functionality
window.testAutoClearDirect = function() {
  console.log('=== DIRECT AUTO-CLEAR TEST ===');
  
  // First check if toggle is checked
  const toggle = document.getElementById('auto-clear-toggle-settings');
  console.log('Toggle element:', toggle);
  console.log('Toggle checked:', toggle ? toggle.checked : 'Not found');
  
  // Check if singlePlayerWorkClear exists
  console.log('singlePlayerWorkClear:', singlePlayerWorkClear);
  
  // Try calling autoStageWork directly
  console.log('Calling autoStageWork() directly...');
  autoStageWork();
};

document.addEventListener('DOMContentLoaded', init);