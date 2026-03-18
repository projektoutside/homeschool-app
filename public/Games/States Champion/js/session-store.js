(() => {
  const data = window.StatesChampionData;

  if (!data) {
    throw new Error("StatesChampionData must load before StatesChampionSession.");
  }

  const {
    HINT_DURATION_MS,
    HINTS_PER_SESSION,
    MODE_CONFIG,
    STATE_DATABASE,
    STATE_DATABASE_BY_ID,
    STATE_DATABASE_BY_NAME,
    STATE_HINT_DATA,
  } = data;

  const PROGRESS_KEY = "states-champion-progress-v2";
  const RUN_KEY = "states-champion-run-v2";
  const SUMMARY_KEY = "states-champion-summary-v2";
  const CORRECT_TOAST_MS = 1400;
  const memoryStore = new Map();
  const CHALLENGE_MODE = "challenge";
  const PRACTICE_MODE = "practice";
  const KNOW_IT_ALL_MODE = "know-it-all";

  function shuffle(items) {
    const clone = [...items];

    for (let index = clone.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
    }

    return clone;
  }

  function createEmptyProgress() {
    return {
      bestScore: 0,
      bestKnowItAllSolved: 0,
      bestStreak: 0,
      lastMode: "challenge",
      sessionsPlayed: 0,
    };
  }

  function readStorage(areaName, key) {
    try {
      return window[areaName].getItem(key);
    } catch {
      return null;
    }
  }

  function getStorageJson(key, fallback) {
    try {
      const parsed = JSON.parse(readStorage("sessionStorage", key) ?? readStorage("localStorage", key) ?? "null");
      return parsed ?? fallback;
    } catch {
      return memoryStore.has(key) ? structuredClone(memoryStore.get(key)) : fallback;
    }
  }

  function setStorageJson(areaName, key, value) {
    memoryStore.set(key, structuredClone(value));

    try {
      window[areaName].setItem(key, JSON.stringify(value));
    } catch {
      // Keep the in-memory fallback so the current page can continue even if storage is blocked.
    }
  }

  function removeStorageKey(areaName, key) {
    memoryStore.delete(key);

    try {
      window[areaName].removeItem(key);
    } catch {
      // Ignore storage failures; the in-memory fallback is already cleared.
    }
  }

  function buildDeck(lastStateId) {
    const deck = shuffle(STATE_DATABASE.map((state) => state.id));

    if (deck.length > 1 && deck[0] === lastStateId) {
      [deck[0], deck[1]] = [deck[1], deck[0]];
    }

    return deck;
  }

  function buildChoices(correctState) {
    const selected = [];
    const seen = new Set([correctState.id]);
    const preferred = shuffle(correctState.confusionSet.map((name) => STATE_DATABASE_BY_NAME.get(name)).filter(Boolean));
    const sameRegion = shuffle(
      STATE_DATABASE.filter(
        (entry) =>
          entry.region === correctState.region &&
          entry.id !== correctState.id &&
          !correctState.confusionSet.includes(entry.name)
      )
    );
    const allOthers = shuffle(STATE_DATABASE.filter((entry) => entry.id !== correctState.id));

    for (const pool of [preferred, sameRegion, allOthers]) {
      for (const entry of pool) {
        if (!entry || seen.has(entry.id)) {
          continue;
        }

        seen.add(entry.id);
        selected.push(entry.id);

        if (selected.length === 3) {
          return shuffle([correctState.id, ...selected]);
        }
      }
    }

    return shuffle([correctState.id, ...selected]).slice(0, 4);
  }

  function getStateById(id) {
    return STATE_DATABASE_BY_ID.get(id) ?? null;
  }

  function getModeConfig(mode) {
    const modeConfig = MODE_CONFIG[mode];

    if (!modeConfig) {
      throw new Error(`Unknown States Champion mode: ${mode}`);
    }

    return modeConfig;
  }

  function cloneRun(run) {
    return normalizeRun(structuredClone(run));
  }

  function loadProgress() {
    return {
      ...createEmptyProgress(),
      ...getStorageJson(PROGRESS_KEY, createEmptyProgress()),
    };
  }

  function saveProgress(progress) {
    setStorageJson("localStorage", PROGRESS_KEY, progress);
  }

  function loadRun() {
    const run = getStorageJson(RUN_KEY, null);
    return run ? normalizeRun(run) : null;
  }

  function saveRun(run) {
    setStorageJson("sessionStorage", RUN_KEY, run);
  }

  function clearRun() {
    removeStorageKey("sessionStorage", RUN_KEY);
  }

  function loadSummary() {
    return getStorageJson(SUMMARY_KEY, null);
  }

  function saveSummary(summary) {
    setStorageJson("sessionStorage", SUMMARY_KEY, summary);
  }

  function clearSummary() {
    removeStorageKey("sessionStorage", SUMMARY_KEY);
  }

  function normalizeRun(run) {
    const defaults = {
      runtimeMs: 0,
      hintsRemaining: HINTS_PER_SESSION,
      hintActiveUntilMs: 0,
      hintUsedForCurrentState: false,
      solvedStateIds: [],
    };

    return {
      ...defaults,
      ...run,
      hintsRemaining: Number.isFinite(run?.hintsRemaining) ? run.hintsRemaining : defaults.hintsRemaining,
      hintActiveUntilMs: Number.isFinite(run?.hintActiveUntilMs) ? run.hintActiveUntilMs : 0,
      hintUsedForCurrentState: Boolean(run?.hintUsedForCurrentState),
      runtimeMs: Number.isFinite(run?.runtimeMs) ? run.runtimeMs : 0,
      solvedStateIds: Array.isArray(run?.solvedStateIds)
        ? [...new Set(run.solvedStateIds.filter((stateId) => typeof stateId === "string"))]
        : [],
    };
  }

  function createRun(mode) {
    const progress = loadProgress();
    const modeConfig = getModeConfig(mode);
    const run = {
      mode,
      phase: "countdown",
      deck: buildDeck(null),
      activeRoundNumber: 0,
      completedRounds: 0,
      score: 0,
      streak: 0,
      bestStreakInRun: 0,
      correctCount: 0,
      incorrectCount: 0,
      currentStateId: null,
      currentChoiceIds: [],
      selectedChoiceId: null,
      lastStateId: null,
      countdownMsLeft: modeConfig.countdownMs,
      questionTimerMs: modeConfig.questionMs ?? 0,
      revealMsLeft: 0,
      reveal: null,
      runtimeMs: 0,
      hintsRemaining: modeConfig.allowHints ? HINTS_PER_SESSION : 0,
      hintActiveUntilMs: 0,
      hintUsedForCurrentState: false,
      solvedStateIds: [],
    };

    progress.lastMode = mode;
    progress.sessionsPlayed += 1;
    saveProgress(progress);
    clearSummary();
    saveRun(run);
    return run;
  }

  function startQuestionRound(run) {
    const nextRun = structuredClone(run);
    const modeConfig = getModeConfig(nextRun.mode);

    if (nextRun.deck.length === 0) {
      nextRun.deck = buildDeck(nextRun.lastStateId);
    }

    const nextStateId = nextRun.deck.shift();
    const correctState = getStateById(nextStateId);

    nextRun.activeRoundNumber = nextRun.completedRounds + 1;
    nextRun.currentStateId = nextStateId;
    nextRun.currentChoiceIds = buildChoices(correctState);
    nextRun.selectedChoiceId = null;
    nextRun.reveal = null;
    nextRun.lastStateId = nextStateId;
    nextRun.phase = "question";
    nextRun.questionTimerMs = modeConfig.questionMs ?? 0;
    nextRun.hintActiveUntilMs = 0;
    nextRun.hintUsedForCurrentState = false;

    saveRun(nextRun);
    return nextRun;
  }

  function activateHint(run) {
    const nextRun = cloneRun(run);
    if (!getModeConfig(nextRun.mode).allowHints) {
      return nextRun;
    }
    const hintData = nextRun.currentStateId ? STATE_HINT_DATA[nextRun.currentStateId] : null;
    const hasRenderableLayout =
      Boolean(hintData) &&
      hintData.viewMode !== "none" &&
      Array.isArray(hintData.neighbors) &&
      hintData.neighbors.length > 0 &&
      Array.isArray(hintData.clusterBounds) &&
      hintData.clusterBounds[0] > 0 &&
      hintData.clusterBounds[1] > 0 &&
      Array.isArray(hintData.clusterStateIds) &&
      hintData.clusterStateIds.length > 1;

    if (
      nextRun.phase !== "question" ||
      nextRun.hintsRemaining <= 0 ||
      nextRun.hintUsedForCurrentState ||
      nextRun.currentStateId == null ||
      !hasRenderableLayout
    ) {
      return nextRun;
    }

    nextRun.hintsRemaining -= 1;
    nextRun.hintUsedForCurrentState = true;
    nextRun.hintActiveUntilMs = nextRun.runtimeMs + HINT_DURATION_MS;
    saveRun(nextRun);
    return nextRun;
  }

  function answerRun(run, choiceId, options = {}) {
    const { timedOut = false } = options;
    const nextRun = cloneRun(run);
    const modeConfig = getModeConfig(nextRun.mode);
    const correctState = getStateById(nextRun.currentStateId);
    const selectedState = choiceId ? getStateById(choiceId) : null;
    const isCorrect = Boolean(selectedState && selectedState.id === correctState.id);
    const progress = loadProgress();

    if (isCorrect) {
      if (nextRun.mode === KNOW_IT_ALL_MODE && nextRun.currentStateId && !nextRun.solvedStateIds.includes(nextRun.currentStateId)) {
        nextRun.solvedStateIds = [...nextRun.solvedStateIds, nextRun.currentStateId];
        nextRun.score = nextRun.solvedStateIds.length;
      } else {
        nextRun.score += 1;
      }
      nextRun.streak += 1;
      nextRun.correctCount += 1;
      nextRun.bestStreakInRun = Math.max(nextRun.bestStreakInRun, nextRun.streak);
      progress.bestStreak = Math.max(progress.bestStreak, nextRun.bestStreakInRun);
      saveProgress(progress);
    } else {
      nextRun.streak = 0;
      nextRun.incorrectCount += 1;
    }

    nextRun.phase = "reveal";
    nextRun.selectedChoiceId = choiceId;
    nextRun.revealMsLeft = isCorrect
      ? CORRECT_TOAST_MS
      : modeConfig.manualAdvance
        ? 0
        : modeConfig.revealMs;
    nextRun.hintActiveUntilMs = 0;
    nextRun.reveal = {
      isCorrect,
      timedOut,
      selectedName: selectedState?.name ?? null,
      correctName: correctState.name,
      region: correctState.region,
      fact: correctState.funFact,
    };

    saveRun(nextRun);
    return nextRun;
  }

  function getKnowItAllSummaryTitle(score) {
    if (score >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return "You know it all!";
    }

    if (score >= 40) {
      return "So close!";
    }

    if (score >= 25) {
      return "Nice run!";
    }

    return "Keep going!";
  }

  function getKnowItAllSummaryNote(score) {
    if (score >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return "All 50 solved.";
    }

    return `Solved ${score}.`;
  }

  function buildChallengeSummary(run, progress) {
    const modeConfig = getModeConfig(CHALLENGE_MODE);

    return {
      mode: CHALLENGE_MODE,
      againMode: CHALLENGE_MODE,
      secondaryMode: PRACTICE_MODE,
      title: getSummaryTitle(run.score),
      note: getSummaryNote(run.score),
      score: run.score,
      total: modeConfig.rounds,
      accuracy: Math.round((run.correctCount / modeConfig.rounds) * 100),
      bestScore: progress.bestScore,
      bestStreak: progress.bestStreak,
    };
  }

  function buildKnowItAllSummary(run, progress, outcome = "miss") {
    const modeConfig = getModeConfig(KNOW_IT_ALL_MODE);

    return {
      mode: KNOW_IT_ALL_MODE,
      againMode: KNOW_IT_ALL_MODE,
      secondaryMode: PRACTICE_MODE,
      title: outcome === "perfect" ? "You know it all!" : getKnowItAllSummaryTitle(run.score),
      note: outcome === "perfect" ? "All 50 solved." : getKnowItAllSummaryNote(run.score),
      score: run.score,
      total: modeConfig.rounds,
      accuracy: Math.round((run.score / modeConfig.rounds) * 100),
      bestScore: progress.bestKnowItAllSolved,
      bestStreak: progress.bestStreak,
    };
  }

  function finalizeKnowItAllSummary(run, outcome = "miss") {
    const progress = loadProgress();
    progress.bestKnowItAllSolved = Math.max(progress.bestKnowItAllSolved, run.score);
    progress.bestStreak = Math.max(progress.bestStreak, run.bestStreakInRun);
    saveProgress(progress);

    const summary = buildKnowItAllSummary(run, progress, outcome);

    saveSummary(summary);
    clearRun();
    return { kind: "summary", summary };
  }

  function getSummaryTitle(score) {
    if (score === 10) {
      return "Great job!";
    }

    if (score >= 8) {
      return "Nice work!";
    }

    if (score >= 5) {
      return "Good try!";
    }

    return "Keep going!";
  }

  function getSummaryNote(score) {
    if (score === 10) {
      return "All 10 right.";
    }

    if (score >= 8) {
      return "Almost perfect.";
    }

    if (score >= 5) {
      return "Good work.";
    }

    return "Try practice mode.";
  }

  function advanceRun(run) {
    const nextRun = cloneRun(run);

    nextRun.completedRounds = nextRun.activeRoundNumber;

    if (nextRun.mode === CHALLENGE_MODE && nextRun.completedRounds >= getModeConfig(CHALLENGE_MODE).rounds) {
      const progress = loadProgress();
      progress.bestScore = Math.max(progress.bestScore, nextRun.score);
      progress.bestStreak = Math.max(progress.bestStreak, nextRun.bestStreakInRun);
      saveProgress(progress);

      const summary = buildChallengeSummary(nextRun, progress);

      saveSummary(summary);
      clearRun();
      return { kind: "summary", summary };
    }

    if (nextRun.mode === KNOW_IT_ALL_MODE && nextRun.completedRounds >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return finalizeKnowItAllSummary(nextRun, "perfect");
    }

    return { kind: "question", run: startQuestionRound(nextRun) };
  }

  function getRenderableState(run) {
    return {
      currentState: getStateById(run.currentStateId),
      currentChoices: run.currentChoiceIds.map((id) => getStateById(id)).filter(Boolean),
    };
  }

  const namespace = Object.freeze({
    activateHint,
    clearRun,
    clearSummary,
    createRun,
    getRenderableState,
    getStateById,
    loadProgress,
    loadRun,
    loadSummary,
    saveProgress,
    saveRun,
    saveSummary,
    startQuestionRound,
    answerRun,
    advanceRun,
    finalizeKnowItAllSummary,
  });

  Object.defineProperty(window, "StatesChampionSession", {
    value: namespace,
    writable: false,
    configurable: true,
  });
})();
