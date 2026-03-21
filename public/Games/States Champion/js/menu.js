(() => {
  const session = window.StatesChampionSession;

  if (!session) {
    throw new Error("StatesChampionSession must load before menu.js.");
  }

  const { loadProgress, queueLaunch } = session;
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

  function startMode(mode, href) {
    queueLaunch(mode, "menu");
    window.location.href = href;
  }

  [
    [elements.challengeModeButton, "challenge"],
    [elements.practiceModeButton, "practice"],
    [elements.knowItAllModeButton, "know-it-all"],
  ].forEach(([button, mode]) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      startMode(mode, button.getAttribute("href") ?? `./play.html?mode=${mode}`);
    });
  });

  render();
})();
