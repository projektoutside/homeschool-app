(() => {
  const session = window.StatesChampionSession;
  const MODE_LABELS = Object.freeze({
    challenge: "Challenge",
    practice: "Practice",
    "know-it-all": "Know it all!",
  });

  if (!session) {
    throw new Error("StatesChampionSession must load before summary.js.");
  }

  const { clearSummary, createRun, loadSummary } = session;

  function sanitizeMode(mode, fallback = "challenge") {
    return Object.hasOwn(MODE_LABELS, mode) ? mode : fallback;
  }

  function parseNumberParam(params, key, fallback) {
    const value = Number(params.get(key));
    return Number.isNaN(value) ? fallback : value;
  }

  function parseSummaryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const score = parseNumberParam(params, "score", Number.NaN);
    const total = parseNumberParam(params, "total", Number.NaN);
    const accuracy = parseNumberParam(params, "accuracy", 0);
    const bestScore = parseNumberParam(params, "bestScore", score);
    const bestStreak = parseNumberParam(params, "bestStreak", 0);
    const mode = sanitizeMode(params.get("mode"));
    const againMode = sanitizeMode(params.get("againMode"), mode);
    const secondaryMode = sanitizeMode(params.get("secondaryMode"), "practice");
    const title = params.get("title");
    const note = params.get("note");

    if (!title || !note || Number.isNaN(score) || Number.isNaN(total)) {
      return null;
    }

    return {
      title,
      note,
      score,
      total,
      accuracy,
      bestScore,
      bestStreak,
      mode,
      againMode,
      secondaryMode,
    };
  }

  const summary = loadSummary() ?? parseSummaryFromUrl();

  if (!summary) {
    window.location.replace("./index.html");
    return;
  }

  const elements = {
    summaryTitle: document.getElementById("summaryTitle"),
    summaryMessage: document.getElementById("summaryMessage"),
    summaryScore: document.getElementById("summaryScore"),
    summaryAccuracy: document.getElementById("summaryAccuracy"),
    summaryBestScore: document.getElementById("summaryBestScore"),
    summaryBestStreak: document.getElementById("summaryBestStreak"),
    playAgainButton: document.getElementById("playAgainButton"),
    tryPracticeButton: document.getElementById("tryPracticeButton"),
    summaryMenuButton: document.getElementById("summaryMenuButton"),
  };

  function render() {
    elements.summaryTitle.textContent = summary.title;
    elements.summaryMessage.textContent = summary.note;
    elements.summaryScore.textContent = String(summary.score);
    elements.summaryAccuracy.textContent = `${summary.accuracy}%`;
    elements.summaryBestScore.textContent = String(summary.bestScore);
    elements.summaryBestStreak.textContent = String(summary.bestStreak);
  }

  function start(mode) {
    clearSummary();

    try {
      createRun(mode);
    } catch (error) {
      console.warn(`States Champion could not pre-save ${mode} mode before navigation.`, error);
    }

    window.location.href = `./play.html?mode=${mode}&fresh=1`;
  }

  if (summary) {
    elements.playAgainButton.addEventListener("click", () => start(summary.againMode || "challenge"));
    elements.tryPracticeButton.addEventListener("click", () => start(summary.secondaryMode || "practice"));
    elements.summaryMenuButton.addEventListener("click", () => {
      clearSummary();
      window.location.href = "./index.html";
    });

    elements.tryPracticeButton.textContent = MODE_LABELS[summary.secondaryMode] ?? MODE_LABELS.practice;

    render();
  }
})();
