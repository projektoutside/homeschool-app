// main.js
// Main logic for WriteMath! game

// --- DOM Elements ---
const screens = {
  menu: document.getElementById('main-menu'),
  settings: document.getElementById('settings-modal'),
  game: document.getElementById('game-screen'),
  over: document.getElementById('game-over'),
};

const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const timerSelect = document.getElementById('timer-select');
const livesSelect = document.getElementById('lives-select');
const musicToggle = document.getElementById('music-toggle');
const bgMusic = document.getElementById('bg-music');
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');

const scoreboard = document.getElementById('score');
const timer = document.getElementById('time-left');
const lives = document.getElementById('lives-left');
const problemDiv = document.getElementById('problem');
const feedback = document.getElementById('feedback');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

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
    // Confetti animation (simple)
    feedback.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], { duration: 400 });
  } else if (type === 'wrong') {
    feedback.textContent = 'Oops! Try again.';
    feedback.style.color = '#ff4e50';
    // Shake animation
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
  lives: 3,
  music: false,
};

let gameState = {
  score: 0,
  timeLeft: 60,
  livesLeft: 3,
  running: false,
};

// --- UI Helpers ---
function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screen].classList.remove('hidden');
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

livesSelect.addEventListener('change', () => {
  gameSettings.lives = livesSelect.value === 'unlimited' ? Infinity : parseInt(livesSelect.value);
});

musicToggle.addEventListener('change', () => {
  gameSettings.music = musicToggle.checked;
  if (gameSettings.music) {
    bgMusic.volume = 0.2;
    bgMusic.play();
  } else {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', () => {
  showScreen('menu');
});

// --- Game Logic Placeholders ---
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem() {
  let a, b, op, answer, display;
  const mode = gameSettings.mode === 'random' ? ['add','sub','mul','div'][getRandomInt(0,3)] : gameSettings.mode;
  let min = 1, max = 9;
  if (gameSettings.difficulty === 'medium') { min = 10; max = 99; }
  if (gameSettings.difficulty === 'hard') { min = 100; max = 999; }

  if (mode === 'add') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, max);
    answer = a + b;
    display = `${a} + ${b}`;
  } else if (mode === 'sub') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, a); // ensure non-negative
    answer = a - b;
    display = `${a} - ${b}`;
  } else if (mode === 'mul') {
    a = getRandomInt(min, max);
    b = getRandomInt(min, max);
    answer = a * b;
    display = `${a} × ${b}`;
  } else if (mode === 'div') {
    b = getRandomInt(min, max);
    answer = getRandomInt(min, max);
    a = b * answer; // ensure integer division
    display = `${a} ÷ ${b}`;
  }
  return { a, b, op: mode, answer, display, key: `${mode}:${a}:${b}` };
}

let currentProblem = null;
let timerInterval = null;
window.currentProblem = null; // Expose for handwriting.js
let usedProblems = new Set(); // track problems for current game

function showProblem() {
  // Try to generate a problem not seen in this game session
  let attempt = 0;
  let p = null;
  do {
    p = generateProblem();
    attempt++;
    // To avoid infinite loops when the space is small, break after some attempts
  } while (usedProblems.has(p.key) && attempt < 50);

  // If exhausted unique set, reset tracking to allow new cycle without immediate repeat
  if (usedProblems.has(p.key)) {
    usedProblems.clear();
  }
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
      clearInterval(timerInterval);
      gameState.timeLeft = 0;
      timer.textContent = gameState.timeLeft;
      endGame();
      return;
    }
    timer.textContent = gameState.timeLeft;
  }, 1000);
}

function checkAnswer() {
  // Placeholder: get answer from handwriting input
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
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      feedback.textContent = '';
      showProblem();
    }, 800);
  } else {
    gameState.livesLeft--;
    lives.textContent = gameState.livesLeft === 999 ? '∞' : gameState.livesLeft;
    feedback.textContent = 'Oops! Try again.';
    feedback.style.color = '#ff4e50';
    if (window.wrongSound) window.wrongSound.play();
    if (gameState.livesLeft <= 0) {
      setTimeout(endGame, 800);
    } else {
      setTimeout(() => {
        feedback.textContent = '';
        showProblem();
      }, 800);
    }
  }
}

// --- Updated Submit Flow ---
async function handleSubmit() {
  if (pendingPrediction) return;
  pendingPrediction = true;
  showPredictModal();
  // Wait for prediction
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
  // Use the confirmed digit for answer checking
  let userAnswer = parseInt(pendingDigit);
  if (userAnswer === currentProblem.answer) {
    gameState.score++;
    scoreboard.textContent = gameState.score;
    animateFeedback('correct');
    if (window.correctSound) window.correctSound.play();
    setTimeout(() => {
      feedback.textContent = '';
      showProblem();
    }, 800);
  } else {
    gameState.livesLeft--;
    lives.textContent = gameState.livesLeft === 999 ? '∞' : gameState.livesLeft;
    animateFeedback('wrong');
    if (window.wrongSound) window.wrongSound.play();
    if (gameState.livesLeft <= 0) {
      setTimeout(endGame, 800);
    } else {
      setTimeout(() => {
        feedback.textContent = '';
        showProblem();
      }, 800);
    }
  }
});

confirmNoBtn.addEventListener('click', () => {
  // Let user redraw
  hidePredictModal();
  feedback.textContent = 'Try writing your answer again!';
  feedback.style.color = '#fff';
});

async function endGame() {
  clearInterval(timerInterval);
  gameState.running = false;
  if (window.__idleTimer) { clearTimeout(window.__idleTimer); window.__idleTimer = null; }
  if (window.clearCanvas) window.clearCanvas();
  showScreen('over');
  finalScore.textContent = `Final Score: ${gameState.score}`;
}

// --- Game Logic Placeholders ---
function startGame() {
  // Reset state
  gameState.score = 0;
  gameState.timeLeft = gameSettings.timer;
  gameState.livesLeft = gameSettings.lives === Infinity ? 999 : gameSettings.lives;
  gameState.running = true;
  usedProblems = new Set(); // reset unique tracker per game
  scoreboard.textContent = '0';
  timer.textContent = gameState.timeLeft;
  lives.textContent = gameState.livesLeft === 999 ? '∞' : gameState.livesLeft;
  feedback.textContent = '';
  showScreen('game');
  showProblem();
  startTimer();
}



// Auto-correct callback for handwriting.js
window.onAutoCorrect = (function() {
  let solving = false;
  return function() {
    if (!gameState.running || solving) return;
    solving = true; // lock to prevent duplicates
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
      showProblem();
      solving = false; // unlock after new problem is shown
    }, 800);
  };
})();


// --- Initialization ---
function init() {
  // Set dropdowns to current settings
  modeSelect.value = gameSettings.mode;
  difficultySelect.value = gameSettings.difficulty;
  showScreen('menu');
  timerSelect.value = gameSettings.timer;
  livesSelect.value = gameSettings.lives;
  musicToggle.checked = gameSettings.music;
}

document.addEventListener('DOMContentLoaded', init); 