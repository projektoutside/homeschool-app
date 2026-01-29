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
  setup: document.getElementById('setup-screen'),
  settings: document.getElementById('settings-modal'),
  game: document.getElementById('game-screen'),
  vs: document.getElementById('vs-screen'),
  over: document.getElementById('game-over'),
};

const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const startBtn = document.getElementById('start-btn');
const singleModeBtn = document.getElementById('single-mode-btn');
const vsModeBtn = document.getElementById('vs-mode-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const timerSelect = document.getElementById('timer-select');
const musicToggle = document.getElementById('music-toggle');
const musicVolume = document.getElementById('music-volume');
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
const problemDiv = document.getElementById('problem');
const feedback = document.getElementById('feedback');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

// VS DOM
const vsExitBtn = document.getElementById('vs-exit');

// Work Area DOM
const workClearBtn = document.getElementById('work-clear-btn');
// Initialize toggle elements (will be accessed dynamically to ensure they exist)
let autoClearToggleGame = null;
let autoClearToggleVS = null;
let singlePlayerWorkClear = null;

// Auto-clear functionality
function autoStageWork(playerOnly = null) {
  console.log('🔥 autoStageWork called with playerOnly:', playerOnly);
  
  // Get toggle elements dynamically to ensure they exist
  if (!autoClearToggleGame) autoClearToggleGame = document.getElementById('auto-clear-toggle-game');
  if (!autoClearToggleVS) autoClearToggleVS = document.getElementById('auto-clear-toggle-vs');
  
  // Check appropriate toggle based on game mode
  const isVSMode = !!playerOnly;
  const toggleToCheck = isVSMode ? autoClearToggleVS : autoClearToggleGame;
  
  console.log('🔍 Debug info:', {
    isVSMode,
    toggleExists: !!toggleToCheck,
    toggleId: toggleToCheck ? toggleToCheck.id : 'null',
    toggleChecked: toggleToCheck ? toggleToCheck.checked : 'N/A',
    singlePlayerWorkClear: !!singlePlayerWorkClear,
    playerWorkClearFunc: playerOnly ? !!playerOnly.workClearFunc : 'N/A'
  });
  
  if (toggleToCheck && toggleToCheck.checked) {
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
  } else if (!toggleToCheck) {
    console.warn('❌ Auto-clear: Toggle element not found');
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
    feedback.textContent = 'Correct! 🎉';
    feedback.style.color = '#4caf50';
    feedback.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], { duration: 400 });
  } else if (type === 'wrong') {
    feedback.textContent = 'Oops! Try again.';
    feedback.style.color = '#ff4e50';
    feedback.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(0)' }
    ], { duration: 300 });
  }
}

// --- State ---
let gameSettings = {
  mode: 'add',
  difficulty: 'easy',
  timer: 60,
  music: true,
  musicVolume: 0.2,
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

// VS state
let vsState = {
  running: false,
  timeLeft: 60,
  p1: { score: 0, problem: null },
  p2: { score: 0, problem: null },
  used1: new Set(),
  used2: new Set(),
  timerInterval: null
};

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
  if (screen === 'menu' || screen === 'setup') {
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

function startCountdown(onComplete) {
  if (countdownActive) return;
  countdownActive = true;
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
        onComplete();
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

let selectedPlayers = 'single';
function updateModeButtons(){
  if (!singleModeBtn || !vsModeBtn) return;
  singleModeBtn.classList.toggle('selected', selectedPlayers==='single');
  vsModeBtn.classList.toggle('selected', selectedPlayers==='vs');
}
if (singleModeBtn) singleModeBtn.addEventListener('click', ()=>{
  selectedPlayers='single';
  updateModeButtons();
  showScreen('setup');
});
if (vsModeBtn) vsModeBtn.addEventListener('click', ()=>{
  selectedPlayers='vs';
  updateModeButtons();
  showScreen('setup');
});

startBtn.addEventListener('click', () => {
  fadeOutMenuMusic();
  startCountdown(() => {
    if (selectedPlayers === 'vs') startVsGame();
    else startGame();
  });
});
restartBtn.addEventListener('click', () => {
  fadeOutMenuMusic();
  startCountdown(() => {
    if (selectedPlayers === 'vs') startVsGame();
    else startGame();
  });
});
menuBtn.addEventListener('click', () => {
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
    feedback.textContent = 'Please write your answer!';
    feedback.style.color = '#fff';
    return;
  }
  let userAnswer = parseInt(userInput);
  if (userAnswer === currentProblem.answer) {
    gameState.score++;
    scoreboard.textContent = gameState.score;
    feedback.textContent = 'Correct! 🎉';
    feedback.style.color = '#4caf50';
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
      feedback.textContent = '';
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (checkAnswer) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
      }, 50);
    }, 800);
  } else {
    feedback.textContent = 'Oops! Try again.';
    feedback.style.color = '#ff4e50';
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
      feedback.textContent = '';
      showProblem();
    }, 800);
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
    animateFeedback('correct');
    // pulse canvas and problem
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-correct'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-correct'), 1800); 
    }
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      feedback.textContent = '';
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (predictModal) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
      }, 50);
    }, 800);
  } else {
    animateFeedback('wrong');
    // pulse canvas for wrong answer
    const spCanvas = document.getElementById('handwriting-canvas');
    if (spCanvas) { 
      spCanvas.classList.remove('drawing', 'processing'); 
      spCanvas.classList.add('pulse-wrong'); 
      setTimeout(()=>spCanvas.classList.remove('pulse-wrong'), 950); 
    }
    if (window.wrongSound) window.wrongSound.play();
    setTimeout(() => {
      feedback.textContent = '';
      showProblem();
    }, 800);
  }
});

confirmNoBtn.addEventListener('click', () => {
  hidePredictModal();
  feedback.textContent = 'Try writing your answer again!';
  feedback.style.color = '#fff';
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
function startVsGame() {
  clearVsWinnerEffects();
  // Reset state
  vsState.running = true;
  vsState.timeLeft = gameSettings.timer;
  vsState.p1.score = 0; vsState.p2.score = 0;
  vsState.used1 = new Set(); vsState.used2 = new Set();
  
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
  p1.timerSpan.textContent = vsState.timeLeft;
  p2.timerSpan.textContent = vsState.timeLeft;
  // Clear canvases
  setupPlayerCanvas(p1, 'p1');
  setupPlayerCanvas(p2, 'p2');
  // Setup work area canvases
  p1.workClearFunc = setupWorkCanvas(p1.workCanvas, 'p1-work');
  p2.workClearFunc = setupWorkCanvas(p2.workCanvas, 'p2-work');
  
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
  startVsTimer();
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
  p1.timerSpan.textContent = vsState.timeLeft;
  p2.timerSpan.textContent = vsState.timeLeft;
  vsState.timerInterval = setInterval(() => {
    vsState.timeLeft--;
    if (vsState.timeLeft <= 0) {
      vsState.timeLeft = 0;
      p1.timerSpan.textContent = vsState.timeLeft;
      p2.timerSpan.textContent = vsState.timeLeft;
      endVsGame();
      return;
    }
    p1.timerSpan.textContent = vsState.timeLeft;
    p2.timerSpan.textContent = vsState.timeLeft;
  }, 1000);
}

function endVsGame(backToMenu = false) {
  clearInterval(vsState.timerInterval);
  vsState.running = false;
  if (backToMenu) {
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
    
    showScreen('over');
    const label = winner === 'tie' ? 'Tie!' : (winner === 'p1' ? 'Player 1 Wins!' : 'Player 2 Wins!');
    finalScore.textContent = `${label}  P1: ${vsState.p1.score}  P2: ${vsState.p2.score}`;
  }, 4000); // Increased from 2600 to 4000 to give more time to celebrate
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
        if (player.feedback){ player.feedback.textContent='Correct! 🎉'; player.feedback.style.color='#4caf50'; }
        // pulse that player's canvas and problem
        if (player.canvas) { player.canvas.classList.add('pulse-correct'); setTimeout(()=>player.canvas.classList.remove('pulse-correct'), 950); }
        // Auto-clear work area for the player who got it correct
        console.log('🎯 CORRECT ANSWER (VS mode) - calling autoStageWork() for player:', player === p1 ? 'Player 1' : 'Player 2');
        autoStageWork(player);
        if (player===p1){ vsState.p1.problem = uniqueProblem(vsState.used1); p1.problemDiv.textContent = vsState.p1.problem.display; }
        else { vsState.p2.problem = uniqueProblem(vsState.used2); p2.problemDiv.textContent = vsState.p2.problem.display; }
      } else {
        if (player.feedback){ player.feedback.textContent= best? `Incorrect (${best})` : 'Unclear — try again'; player.feedback.style.color = best? '#ff4e50' : '#fff'; }
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
    feedback.textContent = 'Auto! 🎉';
    feedback.style.color = '#4caf50';
    feedback.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], { duration: 400 });
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      feedback.textContent = '';
      // Auto-clear work area if enabled (before new problem is shown)
      console.log('🎯 CORRECT ANSWER (onAutoCorrect) - calling autoStageWork() for single player (synchronized)');
      autoStageWork();
      // Small delay to ensure clearing happens before new problem
      setTimeout(() => {
        showProblem();
        solving = false;
      }, 50);
    }, 800);
  };
})();

// --- Initialization ---
function init() {
  modeSelect.value = gameSettings.mode;
  difficultySelect.value = gameSettings.difficulty;
  showScreen('menu');
  timerSelect.value = gameSettings.timer;
  musicToggle.checked = gameSettings.music;
  if (musicVolume) musicVolume.value = Math.round(gameSettings.musicVolume * 100);
  // Default highlight Single Player
  selectedPlayers = 'single';
  updateModeButtons();
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
}

// Test function for auto-clear (call from browser console)
window.testAutoClear = function() {
  console.log('=== AUTO-CLEAR TEST ===');
  console.log('Single player toggle:', document.getElementById('auto-clear-toggle-game'));
  console.log('VS toggle:', document.getElementById('auto-clear-toggle-vs'));
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
    feedback.textContent = 'Correct! 🎉';
    feedback.style.color = '#4caf50';
    autoStageWork(); // This should trigger auto-clear if toggle is checked
    setTimeout(() => {
      feedback.textContent = '';
      showProblem();
    }, 800);
  } else if (vsState.running) {
    console.log('VS mode - simulating p1 correct answer...');
    vsState.p1.score++;
    p1.scoreSpan.textContent = vsState.p1.score;
    if (p1.feedback) { p1.feedback.textContent = 'Correct! 🎉'; p1.feedback.style.color = '#4caf50'; }
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
  const toggle = document.getElementById('auto-clear-toggle-game');
  console.log('Toggle element:', toggle);
  console.log('Toggle checked:', toggle ? toggle.checked : 'Not found');
  
  // Check if singlePlayerWorkClear exists
  console.log('singlePlayerWorkClear:', singlePlayerWorkClear);
  
  // Try calling autoStageWork directly
  console.log('Calling autoStageWork() directly...');
  autoStageWork();
};

document.addEventListener('DOMContentLoaded', init);