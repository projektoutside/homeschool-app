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

  const PROGRESS_KEY = "states-champion-progress-v3";
  const RUN_KEY = "states-champion-run-v3";
  const SUMMARY_KEY = "states-champion-summary-v3";
  const LAUNCH_KEY = "states-champion-launch-v1";
  const CORRECT_TOAST_MS = 1400;
  const CHALLENGE_HEARTS = 3;
  const CHALLENGE_CORRECT_POINTS = 10;
  const KNOW_IT_ALL_CORRECT_POINTS = 10;
  const KNOW_IT_ALL_PERFECT_POINTS = 1500;
  const memoryStore = new Map();
  const CHALLENGE_MODE = "challenge";
  const PRACTICE_MODE = "practice";
  const KNOW_IT_ALL_MODE = "know-it-all";
  const RESUMABLE_PHASES = new Set(["countdown", "question", "reveal"]);

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
      bestChallengeScore: 0,
      bestKnowItAllScore: 0,
      bestOverallScore: 0,
      bestStreak: 0,
      lastMode: "challenge",
      sessionsPlayed: 0,
    };
  }

  function createRunId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

  function getScopedStorageJson(areaName, key, fallback) {
    try {
      const parsed = JSON.parse(readStorage(areaName, key) ?? "null");
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
    const run = getScopedStorageJson("sessionStorage", RUN_KEY, null);
    return run ? normalizeRun(run) : null;
  }

  function saveRun(run) {
    setStorageJson("sessionStorage", RUN_KEY, run);
  }

  function clearRun() {
    removeStorageKey("sessionStorage", RUN_KEY);
  }

  function loadSummary() {
    return getScopedStorageJson("sessionStorage", SUMMARY_KEY, null);
  }

  function saveSummary(summary) {
    setStorageJson("sessionStorage", SUMMARY_KEY, summary);
  }

  function clearSummary() {
    removeStorageKey("sessionStorage", SUMMARY_KEY);
  }

  function normalizeLaunchIntent(intent) {
    if (!intent || typeof intent !== "object") {
      return null;
    }

    const mode = typeof intent.mode === "string" ? intent.mode : "";
    const source = typeof intent.source === "string" && intent.source ? intent.source : null;

    if (!Object.hasOwn(MODE_CONFIG, mode) || !source) {
      return null;
    }

    return {
      requestId: typeof intent.requestId === "string" && intent.requestId ? intent.requestId : createRunId(),
      mode,
      source,
      createdAtMs: Number.isFinite(intent.createdAtMs) ? intent.createdAtMs : Date.now(),
    };
  }

  function loadLaunch() {
    return normalizeLaunchIntent(getScopedStorageJson("sessionStorage", LAUNCH_KEY, null));
  }

  function saveLaunch(intent) {
    setStorageJson("sessionStorage", LAUNCH_KEY, intent);
  }

  function clearLaunch() {
    removeStorageKey("sessionStorage", LAUNCH_KEY);
  }

  function normalizeRun(run) {
    const defaults = {
      runId: createRunId(),
      runtimeMs: 0,
      hintsRemaining: HINTS_PER_SESSION,
      hintActiveUntilMs: 0,
      hintUsedForCurrentState: false,
      solvedStateIds: [],
      heartsRemaining: CHALLENGE_HEARTS,
      awardSequence: 0,
    };

    return {
      ...defaults,
      ...run,
      runId: typeof run?.runId === "string" && run.runId ? run.runId : defaults.runId,
      hintsRemaining: Number.isFinite(run?.hintsRemaining) ? run.hintsRemaining : defaults.hintsRemaining,
      hintActiveUntilMs: Number.isFinite(run?.hintActiveUntilMs) ? run.hintActiveUntilMs : 0,
      hintUsedForCurrentState: Boolean(run?.hintUsedForCurrentState),
      runtimeMs: Number.isFinite(run?.runtimeMs) ? run.runtimeMs : 0,
      heartsRemaining: Number.isFinite(run?.heartsRemaining)
        ? Math.max(0, Math.min(CHALLENGE_HEARTS, Math.round(run.heartsRemaining)))
        : defaults.heartsRemaining,
      awardSequence: Number.isFinite(run?.awardSequence) ? Math.max(0, Math.round(run.awardSequence)) : 0,
      solvedStateIds: Array.isArray(run?.solvedStateIds)
        ? [...new Set(run.solvedStateIds.filter((stateId) => typeof stateId === "string"))]
        : [],
    };
  }

  function createRun(mode) {
    const progress = loadProgress();
    const modeConfig = getModeConfig(mode);
    const run = {
      runId: createRunId(),
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
      heartsRemaining: mode === CHALLENGE_MODE ? CHALLENGE_HEARTS : 0,
      awardSequence: 0,
    };

    progress.lastMode = mode;
    progress.sessionsPlayed += 1;
    saveProgress(progress);
    clearSummary();
    saveRun(run);
    return run;
  }

  function queueLaunch(mode, source) {
    getModeConfig(mode);

    const launchIntent = {
      requestId: createRunId(),
      mode,
      source,
      createdAtMs: Date.now(),
    };

    clearLaunch();
    clearSummary();
    saveLaunch(launchIntent);
    return launchIntent;
  }

  function consumeLaunch(mode) {
    const launchIntent = loadLaunch();

    if (!launchIntent || launchIntent.mode !== mode) {
      return null;
    }

    clearLaunch();
    return launchIntent;
  }

  function resolvePlayEntry(mode) {
    if (!Object.hasOwn(MODE_CONFIG, mode)) {
      return {
        kind: "redirect",
        href: "./index.html",
      };
    }

    const queuedLaunch = consumeLaunch(mode);

    if (queuedLaunch) {
      return {
        kind: "run",
        run: createRun(mode),
        launchState: {
          requestId: queuedLaunch.requestId,
          source: queuedLaunch.source,
          strategy: "queued-launch",
        },
      };
    }

    const existingRun = loadRun();

    if (existingRun && existingRun.mode === mode && RESUMABLE_PHASES.has(existingRun.phase)) {
      return {
        kind: "run",
        run: existingRun,
        launchState: {
          requestId: null,
          source: "resume",
          strategy: "resume-run",
        },
      };
    }

    return {
      kind: "run",
      run: createRun(mode),
      launchState: {
        requestId: null,
        source: "direct",
        strategy: "direct-entry",
      },
    };
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

  function pushAward(run, awards, category, points, label, meta = {}) {
    const normalizedPoints = Math.max(0, Math.round(Number(points) || 0));
    if (!normalizedPoints) {
      return;
    }

    const eventId = `${run.runId}:${category}:${run.awardSequence}`;
    run.awardSequence += 1;
    awards.push({
      eventId,
      points: normalizedPoints,
      label,
      meta: {
        mode: run.mode,
        ...meta,
      },
    });
  }

  function updateBestStreak(progress, run) {
    progress.bestStreak = Math.max(progress.bestStreak, run.bestStreakInRun);
  }

  function updateOverallBestScores(progress) {
    progress.bestOverallScore = Math.max(progress.bestChallengeScore, progress.bestKnowItAllScore);
  }

  function cashOutChallengeStreak(run, awards, reason) {
    if (run.mode !== CHALLENGE_MODE || run.streak <= 0) {
      return 0;
    }

    const comboStreak = run.streak;
    const comboPoints = comboStreak * CHALLENGE_CORRECT_POINTS;
    run.score += comboPoints;
    pushAward(run, awards, "challenge-combo", comboPoints, "Combo Cashout", {
      comboStreak,
      reason,
    });
    run.streak = 0;
    return comboPoints;
  }

  function answerRun(run, choiceId, options = {}) {
    const { timedOut = false } = options;
    const nextRun = cloneRun(run);
    const modeConfig = getModeConfig(nextRun.mode);
    const correctState = getStateById(nextRun.currentStateId);
    const selectedState = choiceId ? getStateById(choiceId) : null;
    const isCorrect = Boolean(selectedState && selectedState.id === correctState.id);
    const progress = loadProgress();
    const awards = [];

    if (isCorrect) {
      if (nextRun.mode === KNOW_IT_ALL_MODE) {
        if (nextRun.currentStateId && !nextRun.solvedStateIds.includes(nextRun.currentStateId)) {
          nextRun.solvedStateIds = [...nextRun.solvedStateIds, nextRun.currentStateId];
        }
        nextRun.score += KNOW_IT_ALL_CORRECT_POINTS;
        pushAward(nextRun, awards, "know-it-all-correct", KNOW_IT_ALL_CORRECT_POINTS, "Correct Answer", {
          stateId: nextRun.currentStateId,
          round: nextRun.activeRoundNumber,
        });
      } else if (nextRun.mode === CHALLENGE_MODE) {
        nextRun.score += CHALLENGE_CORRECT_POINTS;
        pushAward(nextRun, awards, "challenge-correct", CHALLENGE_CORRECT_POINTS, "Correct Answer", {
          stateId: nextRun.currentStateId,
          round: nextRun.activeRoundNumber,
        });
      } else {
        nextRun.score += 1;
      }
      nextRun.streak += 1;
      nextRun.correctCount += 1;
      nextRun.bestStreakInRun = Math.max(nextRun.bestStreakInRun, nextRun.streak);
      updateBestStreak(progress, nextRun);
      saveProgress(progress);
    } else {
      if (nextRun.mode === CHALLENGE_MODE) {
        cashOutChallengeStreak(nextRun, awards, timedOut ? "timeout" : "wrong-answer");
        nextRun.heartsRemaining = Math.max(0, nextRun.heartsRemaining - 1);
      } else {
        nextRun.streak = 0;
      }
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
    return { run: nextRun, awards };
  }

  function getKnowItAllSummaryTitle(correctCount) {
    if (correctCount >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return "You know it all!";
    }

    if (correctCount >= 40) {
      return "So close!";
    }

    if (correctCount >= 25) {
      return "Nice run!";
    }

    return "Keep going!";
  }

  function getKnowItAllSummaryNote(correctCount) {
    if (correctCount >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return "All 50 solved.";
    }

    return `Solved ${correctCount}.`;
  }

  function buildChallengeSummary(run, progress) {
    const totalAnswers = Math.max(1, run.correctCount + run.incorrectCount);

    return {
      mode: CHALLENGE_MODE,
      againMode: CHALLENGE_MODE,
      secondaryMode: PRACTICE_MODE,
      title: getChallengeSummaryTitle(run.score),
      note: getChallengeSummaryNote(run),
      score: run.score,
      total: totalAnswers,
      accuracy: Math.round((run.correctCount / totalAnswers) * 100),
      bestScore: progress.bestChallengeScore,
      bestStreak: progress.bestStreak,
    };
  }

  function buildKnowItAllSummary(run, progress, outcome = "miss") {
    const modeConfig = getModeConfig(KNOW_IT_ALL_MODE);
    const solvedCount = run.correctCount;

    return {
      mode: KNOW_IT_ALL_MODE,
      againMode: KNOW_IT_ALL_MODE,
      secondaryMode: PRACTICE_MODE,
      title: outcome === "perfect" ? "You know it all!" : getKnowItAllSummaryTitle(solvedCount),
      note: outcome === "perfect" ? "All 50 solved." : getKnowItAllSummaryNote(solvedCount),
      score: run.score,
      total: modeConfig.rounds,
      accuracy: Math.round((solvedCount / modeConfig.rounds) * 100),
      bestScore: progress.bestKnowItAllScore,
      bestStreak: progress.bestStreak,
    };
  }

  function finalizeKnowItAllSummary(run, outcome = "miss") {
    const nextRun = cloneRun(run);
    const progress = loadProgress();
    const awards = [];

    if (outcome === "perfect" && nextRun.score < KNOW_IT_ALL_PERFECT_POINTS) {
      const perfectBonus = KNOW_IT_ALL_PERFECT_POINTS - nextRun.score;
      nextRun.score = KNOW_IT_ALL_PERFECT_POINTS;
      pushAward(nextRun, awards, "know-it-all-perfect", perfectBonus, "Perfect Map Bonus", {
        solvedCount: nextRun.correctCount,
      });
    }

    progress.bestKnowItAllScore = Math.max(progress.bestKnowItAllScore, nextRun.score);
    updateBestStreak(progress, nextRun);
    updateOverallBestScores(progress);
    saveProgress(progress);

    const summary = buildKnowItAllSummary(nextRun, progress, outcome);

    saveSummary(summary);
    clearRun();
    return { kind: "summary", summary, awards };
  }

  function getChallengeSummaryTitle(score) {
    if (score >= 150) {
      return "Great job!";
    }

    if (score >= 90) {
      return "Nice work!";
    }

    if (score >= 40) {
      return "Good try!";
    }

    return "Keep going!";
  }

  function getChallengeSummaryNote(run) {
    if (run.correctCount >= 1) {
      return `You got ${run.correctCount} right before the hearts ran out.`;
    }

    return "Try practice mode.";
  }

  function advanceRun(run) {
    const nextRun = cloneRun(run);
    const awards = [];

    nextRun.completedRounds = nextRun.activeRoundNumber;

    if (nextRun.mode === CHALLENGE_MODE && nextRun.heartsRemaining <= 0) {
      const progress = loadProgress();
      cashOutChallengeStreak(nextRun, awards, "run-end");
      progress.bestChallengeScore = Math.max(progress.bestChallengeScore, nextRun.score);
      updateBestStreak(progress, nextRun);
      updateOverallBestScores(progress);
      saveProgress(progress);

      const summary = buildChallengeSummary(nextRun, progress);

      saveSummary(summary);
      clearRun();
      return { kind: "summary", summary, awards };
    }

    if (nextRun.mode === KNOW_IT_ALL_MODE && nextRun.completedRounds >= getModeConfig(KNOW_IT_ALL_MODE).rounds) {
      return finalizeKnowItAllSummary(nextRun, "perfect");
    }

    return { kind: "question", run: startQuestionRound(nextRun), awards };
  }

  function getRenderableState(run) {
    return {
      currentState: getStateById(run.currentStateId),
      currentChoices: run.currentChoiceIds.map((id) => getStateById(id)).filter(Boolean),
    };
  }

  const namespace = Object.freeze({
    activateHint,
    clearLaunch,
    clearRun,
    clearSummary,
    consumeLaunch,
    createRun,
    queueLaunch,
    resolvePlayEntry,
    getRenderableState,
    getStateById,
    loadLaunch,
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
