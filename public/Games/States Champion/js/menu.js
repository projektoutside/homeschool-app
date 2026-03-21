(() => {
  const session = window.StatesChampionSession;

  if (!session) {
    throw new Error("StatesChampionSession must load before menu.js.");
  }

  const { clearRun, clearSummary, createRun, loadProgress } = session;
  const progress = loadProgress();
  const elements = {
    menuBestScore: document.getElementById("menuBestScore"),
    menuBestStreak: document.getElementById("menuBestStreak"),
    menuSessionsPlayed: document.getElementById("menuSessionsPlayed"),
    challengeModeButton: document.getElementById("challengeModeButton"),
    practiceModeButton: document.getElementById("practiceModeButton"),
    knowItAllModeButton: document.getElementById("knowItAllModeButton"),
  };

  function render() {
    elements.menuBestScore.textContent = String(progress.bestOverallScore);
    elements.menuBestStreak.textContent = String(progress.bestStreak);
    elements.menuSessionsPlayed.textContent = String(progress.sessionsPlayed);
  }

  function primeRun(mode) {
    clearRun();
    clearSummary();
    createRun(mode);
  }

  function primeRunSafely(mode) {
    try {
      primeRun(mode);
    } catch (error) {
      console.warn(`States Champion could not pre-save ${mode} mode before navigation.`, error);
    }
  }

  [
    [elements.challengeModeButton, "challenge"],
    [elements.practiceModeButton, "practice"],
    [elements.knowItAllModeButton, "know-it-all"],
  ].forEach(([button, mode]) => {
    button.addEventListener("click", () => {
      primeRunSafely(mode);
    });
  });

  render();
})();
