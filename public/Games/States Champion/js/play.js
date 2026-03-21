(() => {
  const data = window.StatesChampionData;
  const session = window.StatesChampionSession;

  if (!data || !session) {
    throw new Error("StatesChampionData and StatesChampionSession must load before play.js.");
  }

  const {
    HINT_DURATION_MS,
    MODE_CONFIG,
    STATE_HINT_DATA,
    STATE_PROGRESS_COLORS,
    US_PROGRESS_MAP_DATA,
  } = data;
  const {
    activateHint,
    advanceRun,
    answerRun,
    clearRun,
    clearSummary,
    createRun,
    finalizeKnowItAllSummary,
    getRenderableState,
    loadRun,
    saveRun,
    startQuestionRound,
  } = session;
  const POINTS_GAME_ID = "states-champion";
  const SUPPORTED_MODES = new Set(Object.keys(MODE_CONFIG));
  const MODE_UI_COPY = Object.freeze({
    challenge: Object.freeze({
      badgePrefix: "Round",
    }),
    practice: Object.freeze({
      badgeLabel: "Practice",
    }),
    "know-it-all": Object.freeze({
      badgePrefix: "State",
    }),
  });
  const pointsBridge =
    window.LAHSPointsBridge && typeof window.LAHSPointsBridge.init === "function"
      ? window.LAHSPointsBridge
      : null;

  pointsBridge?.init({ gameId: POINTS_GAME_ID });

  const searchParams = new URLSearchParams(window.location.search);
  const requestedMode = searchParams.get("mode");
  const requestedFreshStart = searchParams.get("fresh") === "1";
  let run = loadRun();

  if (isSupportedMode(requestedMode) && (requestedFreshStart || !run || run.mode !== requestedMode)) {
    run = createRun(requestedMode);

    if (requestedFreshStart) {
      searchParams.delete("fresh");
      const nextSearch = searchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }

  if (!run) {
    window.location.replace("./index.html");
    return;
  }

  const elements = {
    playPage: document.getElementById("playPage"),
    hud: document.querySelector(".hud"),
    countdownLayer: document.getElementById("countdownLayer"),
    countdownModeLabel: document.getElementById("countdownModeLabel"),
    countdownValue: document.getElementById("countdownValue"),
    hudMode: document.getElementById("hudMode"),
    hudRound: document.getElementById("hudRound"),
    hudScore: document.getElementById("hudScore"),
    hudStreak: document.getElementById("hudStreak"),
    hudTimer: document.getElementById("hudTimer"),
    mapButton: document.getElementById("mapButton"),
    backToMenuButton: document.getElementById("backToMenuButton"),
    questionBadge: document.getElementById("questionBadge"),
    challengeHearts: document.getElementById("challengeHearts"),
    answerHelperText: document.getElementById("answerHelperText"),
    roundFeedback: document.getElementById("roundFeedback"),
    hintButton: document.getElementById("hintButton"),
    stateStage: document.querySelector(".state-stage"),
    stateHintLayer: document.getElementById("stateHintLayer"),
    stateImage: document.getElementById("stateImage"),
    stateImageFallback: document.getElementById("stateImageFallback"),
    revealLayer: document.getElementById("revealLayer"),
    successToast: document.getElementById("successToast"),
    revealBanner: document.getElementById("revealBanner"),
    revealTitle: document.getElementById("revealTitle"),
    revealRegion: document.getElementById("revealRegion"),
    revealMessage: document.getElementById("revealMessage"),
    revealFact: document.getElementById("revealFact"),
    nextStateButton: document.getElementById("nextStateButton"),
    revealMenuButton: document.getElementById("revealMenuButton"),
    mapLayer: document.getElementById("mapLayer"),
    closeMapButton: document.getElementById("closeMapButton"),
    mapSolvedCount: document.getElementById("mapSolvedCount"),
    mapRemainingCount: document.getElementById("mapRemainingCount"),
    progressMap: document.getElementById("progressMap"),
    heartSlots: [...document.querySelectorAll("[data-heart-slot]")],
    choiceButtons: [...document.querySelectorAll("[data-choice-slot]")].map((button) => ({
      button,
      label: button.querySelector(".choice-button__text"),
    })),
  };

  const viewState = {
    lastFrameTime: null,
    imageError: false,
    hintRenderKey: "",
    mapOpen: false,
    mapRenderKey: "",
  };

  function getModeConfig() {
    return MODE_CONFIG[run.mode];
  }

  function isSupportedMode(mode) {
    return SUPPORTED_MODES.has(mode);
  }

  function isKnowItAllMode() {
    return run.mode === "know-it-all";
  }

  function isChallengeMode() {
    return run.mode === "challenge";
  }

  function backToMenu() {
    viewState.mapOpen = false;
    clearRun();
    clearSummary();
    window.location.href = "./index.html";
  }

  function buildSummaryHref(summary) {
    const params = new URLSearchParams({
      title: summary.title,
      note: summary.note,
      score: String(summary.score),
      total: String(summary.total),
      accuracy: String(summary.accuracy),
      bestScore: String(summary.bestScore),
      bestStreak: String(summary.bestStreak),
      mode: summary.mode ?? run.mode,
      againMode: summary.againMode ?? summary.mode ?? run.mode,
      secondaryMode: summary.secondaryMode ?? "practice",
    });

    return `./summary.html?${params.toString()}`;
  }

  function buildRevealMessage(reveal) {
    if (reveal.isCorrect) {
      return "Yes!";
    }

    if (reveal.timedOut) {
      return "Time is up.";
    }

    return "Not this one.";
  }

  function awardGamePoints(awards) {
    if (!pointsBridge || !Array.isArray(awards) || awards.length === 0) {
      return;
    }

    awards.forEach((award) => {
      if (!award || award.points <= 0 || !award.eventId) {
        return;
      }

      pointsBridge.awardPoints(award.points, {
        eventId: award.eventId,
        label: award.label ?? null,
        meta: award.meta ?? {},
      });
    });
  }

  function getHintData(stateId = run.currentStateId) {
    return stateId ? STATE_HINT_DATA[stateId] ?? null : null;
  }

  function hasRenderableHintLayout(hintData) {
    return (
      Boolean(hintData) &&
      hintData.viewMode !== "none" &&
      Array.isArray(hintData.neighbors) &&
      hintData.neighbors.length > 0 &&
      Array.isArray(hintData.clusterBounds) &&
      hintData.clusterBounds[0] > 0 &&
      hintData.clusterBounds[1] > 0 &&
      Array.isArray(hintData.clusterStateIds) &&
      hintData.clusterStateIds.length > 1 &&
      hintData.pieces &&
      typeof hintData.pieces === "object"
    );
  }

  function getHintMsLeft() {
    return Math.max(0, (run.hintActiveUntilMs ?? 0) - (run.runtimeMs ?? 0));
  }

  function isHintActive(hintData = getHintData()) {
    return hasRenderableHintLayout(hintData) && run.phase === "question" && getHintMsLeft() > 0;
  }

  function isSuccessToastReveal() {
    return run.phase === "reveal" && Boolean(run.reveal?.isCorrect);
  }

  function clearHintLayer() {
    elements.stateHintLayer.hidden = true;
    elements.stateHintLayer.className = "state-hint-layer";
    elements.stateHintLayer.innerHTML = "";
    elements.stateHintLayer.style.removeProperty("--hint-cycle-ms");
    elements.stateStage.classList.remove("state-stage--hint-active");
    elements.stateImage.classList.remove("state-image--hint-hidden");
    viewState.hintRenderKey = "";
  }

  function closeMapOverlay(options = {}) {
    const { restoreFocus = false } = options;
    viewState.mapOpen = false;
    elements.mapLayer.hidden = true;
    elements.playPage.classList.remove("play-page--map-open");
    if (restoreFocus) {
      focusSoon(elements.playPage);
    }
  }

  function buildProgressMapPaths(stateId, solved) {
    const stateEntry = US_PROGRESS_MAP_DATA.states?.[stateId];
    if (!stateEntry) {
      return "";
    }

    const cssClass = solved ? "progress-map__state progress-map__state--solved" : "progress-map__state progress-map__state--blank";
    const style = solved ? ` style="--state-fill:${STATE_PROGRESS_COLORS[stateId] ?? "#55c3ff"}"` : "";

    return stateEntry.paths
      .map(
        (pathData) =>
          `<path data-state-id="${stateId}" class="${cssClass}"${style} d="${pathData}" fill-rule="evenodd"></path>`
      )
      .join("");
  }

  function buildProgressMapMarkup() {
    const [mapWidth, mapHeight] = US_PROGRESS_MAP_DATA.viewBox ?? [0, 0];
    if (mapWidth <= 0 || mapHeight <= 0) {
      return "";
    }

    const solvedSet = new Set(run.solvedStateIds ?? []);
    const pieces = US_PROGRESS_MAP_DATA.stateIds
      .map((stateId) => {
        const entry = US_PROGRESS_MAP_DATA.states?.[stateId];
        if (!entry) {
          return "";
        }

        const [left, top, width, height] = entry.bounds;
        const isSolved = solvedSet.has(stateId);
        const pieceClass = isSolved
          ? "progress-map__piece progress-map__piece--solved"
          : "progress-map__piece progress-map__piece--blank";

        return `
          <g
            class="${pieceClass}"
            transform="translate(${left} ${top})"
            style="--state-fill:${STATE_PROGRESS_COLORS[stateId] ?? "#55c3ff"}"
          >
            ${buildProgressMapPaths(stateId, isSolved)}
          </g>
        `;
      })
      .join("");

    return `<svg class="progress-map" viewBox="0 0 ${mapWidth} ${mapHeight}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${pieces}</svg>`;
  }

  function renderProgressMap() {
    const modeConfig = getModeConfig();
    const mapEnabled = Boolean(modeConfig.mapEnabled);
    const solvedCount = run.solvedStateIds?.length ?? 0;
    const total = modeConfig.rounds ?? 0;
    const canShowOverlay = mapEnabled && run.phase === "question";

    elements.hud.classList.toggle("hud--know-it-all", mapEnabled);
    elements.mapButton.hidden = !mapEnabled;
    elements.mapButton.disabled = !canShowOverlay;
    elements.mapLayer.hidden = !canShowOverlay || !viewState.mapOpen;
    elements.playPage.classList.toggle("play-page--map-open", canShowOverlay && viewState.mapOpen);

    if (!mapEnabled || !canShowOverlay) {
      viewState.mapOpen = false;
      viewState.mapRenderKey = "";
      return;
    }

    elements.mapSolvedCount.textContent = String(solvedCount);
    elements.mapRemainingCount.textContent = String(Math.max(0, total - solvedCount));

    if (!viewState.mapOpen) {
      return;
    }

    const nextKey = [solvedCount, (run.solvedStateIds ?? []).join(","), ...US_PROGRESS_MAP_DATA.viewBox].join(":");
    if (nextKey === viewState.mapRenderKey) {
      return;
    }

    viewState.mapRenderKey = nextKey;
    elements.progressMap.innerHTML = buildProgressMapMarkup();
  }

  function getHintFramePadding(hintData) {
    const stageWidth = elements.stateStage.clientWidth;
    const stageHeight = elements.stateStage.clientHeight;
    const clusterCount = hintData.clusterStateIds?.length ?? 0;
    const [clusterWidth, clusterHeight] = hintData.clusterBounds ?? [0, 0];
    const crowdedCluster = clusterCount >= 6 || clusterWidth < clusterHeight;
    const ratio = crowdedCluster ? 0.024 : 0.032;
    return Math.max(8, Math.min(stageWidth, stageHeight) * ratio);
  }

  function buildHintPathMarkup(pieceId, piece, variant, delayMs) {
    const pathClass =
      variant === "active"
        ? "state-hint-map__path state-hint-map__path--active"
        : "state-hint-map__path state-hint-map__path--neighbor";

    return (piece.paths ?? [])
      .map(
        (pathData) =>
          `<path data-state-id="${pieceId}" class="${pathClass}" d="${pathData}" fill-rule="evenodd" style="animation-delay:${delayMs}ms"></path>`
      )
      .join("");
  }

  function buildHintMapMarkup(currentStateId, hintData) {
    const [clusterWidth, clusterHeight] = hintData.clusterBounds ?? [0, 0];
    const pieceIds = (hintData.clusterStateIds ?? []).filter((stateId) => hintData.pieces?.[stateId]);

    if (!pieceIds.length || clusterWidth <= 0 || clusterHeight <= 0) {
      return "";
    }

    const framePadding = getHintFramePadding(hintData);
    const activeGradientId = `hintActiveFill-${currentStateId}`;
    const neighborPaths = pieceIds
      .filter((stateId) => stateId !== currentStateId)
      .map((stateId, index) => buildHintPathMarkup(stateId, hintData.pieces[stateId], "neighbor", index * 85))
      .join("");
    const activePaths = hintData.pieces[currentStateId]
      ? buildHintPathMarkup(currentStateId, hintData.pieces[currentStateId], "active", 0)
      : "";

    return `
      <div class="state-hint-map-frame" style="inset:${framePadding}px">
        <svg
          class="state-hint-map"
          width="100%"
          height="100%"
          viewBox="0 0 ${clusterWidth} ${clusterHeight}"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="${activeGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8cff9b"></stop>
              <stop offset="55%" stop-color="#39ef6d"></stop>
              <stop offset="100%" stop-color="#14c95f"></stop>
            </linearGradient>
          </defs>
          <g class="state-hint-map__group state-hint-map__group--neighbors">
            ${neighborPaths}
          </g>
          <g class="state-hint-map__group state-hint-map__group--active">
            ${activePaths.replaceAll('class="state-hint-map__path state-hint-map__path--active"', `class="state-hint-map__path state-hint-map__path--active" fill="url(#${activeGradientId})"`)}
          </g>
        </svg>
      </div>
    `;
  }

  function renderPuzzleHintLayer(currentStateId, hintData) {
    const markup = buildHintMapMarkup(currentStateId, hintData);

    if (!markup) {
      clearHintLayer();
      return;
    }

    elements.stateHintLayer.className = "state-hint-layer state-hint-layer--map is-active";
    elements.stateHintLayer.style.setProperty("--hint-cycle-ms", `${HINT_DURATION_MS}ms`);
    elements.stateHintLayer.innerHTML = markup;
    elements.stateHintLayer.hidden = false;
  }

  function renderHintView(currentState) {
    const hintData = currentState ? getHintData(currentState.id) : null;
    const modeConfig = getModeConfig();
    const hasHintLayout = hasRenderableHintLayout(hintData);
    const hintIsActive = isHintActive(hintData);
    const hintCanBeUsed =
      run.phase === "question" &&
      modeConfig.allowHints &&
      hasHintLayout &&
      run.hintsRemaining > 0 &&
      !run.hintUsedForCurrentState;

    elements.hintButton.hidden = run.phase !== "question" || !modeConfig.allowHints || !hasHintLayout;
    elements.hintButton.disabled = !hintCanBeUsed;
    elements.hintButton.textContent = `Hint · ${Math.max(0, run.hintsRemaining ?? 0)}`;
    elements.hintButton.classList.toggle("is-active", hintIsActive);
    elements.hintButton.setAttribute("aria-pressed", hintIsActive ? "true" : "false");
    elements.stateStage.classList.toggle("state-stage--hint-active", hintIsActive);
    elements.stateImage.classList.toggle("state-image--hint-hidden", hintIsActive);

    if (!hintIsActive || !currentState || !hasHintLayout) {
      clearHintLayer();
      return;
    }

    const nextRenderKey = [
      currentState.id,
      run.hintActiveUntilMs,
      elements.stateStage.clientWidth,
      elements.stateStage.clientHeight,
      hintData.clusterBounds.join(","),
      hintData.clusterStateIds.join(","),
    ].join(":");

    if (nextRenderKey === viewState.hintRenderKey) {
      return;
    }

    viewState.hintRenderKey = nextRenderKey;
    renderPuzzleHintLayer(currentState.id, hintData);
  }

  function advanceFromReveal() {
    const outcome = advanceRun(run);
    awardGamePoints(outcome.awards);

    if (outcome.kind === "summary") {
      window.location.href = buildSummaryHref(outcome.summary);
      return;
    }

    run = outcome.run;
    render();
    focusSoon(elements.playPage);
  }

  function submitChoice(choiceId, options = {}) {
    if (run.phase !== "question") {
      return;
    }

    closeMapOverlay();
    const answerOutcome = answerRun(run, choiceId, options);
    run = answerOutcome.run;
    awardGamePoints(answerOutcome.awards);

    if (isKnowItAllMode() && !run.reveal?.isCorrect) {
      const outcome = finalizeKnowItAllSummary(run, "miss");
      awardGamePoints(outcome.awards);
      window.location.href = buildSummaryHref(outcome.summary);
      return;
    }

    render();

    if (run.reveal?.isCorrect) {
      focusSoon(elements.playPage);
      return;
    }

    if (getModeConfig().manualAdvance) {
      focusSoon(elements.nextStateButton);
    }
  }

  function formatTimer() {
    const modeConfig = getModeConfig();

    if (!modeConfig.timed) {
      return "No timer";
    }

    if (run.phase === "reveal") {
      return "Pause";
    }

    return `${Math.max(0, Math.ceil(run.questionTimerMs / 1000))}s`;
  }

  function getRoundLabel(modeConfig) {
    const roundNumber = Math.max(1, run.activeRoundNumber);
    return modeConfig.rounds ? `${roundNumber} / ${modeConfig.rounds}` : `${roundNumber}`;
  }

  function getQuestionBadge(copy) {
    if (copy.badgeLabel) {
      return copy.badgeLabel;
    }

    return `${copy.badgePrefix} ${Math.max(1, run.activeRoundNumber)}`;
  }

  function renderCountdown() {
    elements.countdownLayer.hidden = run.phase !== "countdown";
    elements.countdownModeLabel.textContent = getModeConfig().label;
    elements.countdownValue.textContent = String(Math.max(1, Math.ceil(run.countdownMsLeft / 1000)));
  }

  function renderChallengeHearts() {
    const showHearts = isChallengeMode();
    elements.challengeHearts.hidden = !showHearts;

    if (!showHearts) {
      return;
    }

    const remainingHearts = Math.max(0, Math.min(elements.heartSlots.length, run.heartsRemaining ?? 0));
    elements.challengeHearts.setAttribute(
      "aria-label",
      `${remainingHearts} of ${elements.heartSlots.length} hearts remaining`
    );

    elements.heartSlots.forEach((heart, index) => {
      heart.classList.toggle("state-hearts__heart--empty", index >= remainingHearts);
    });
  }

  function renderQuestion() {
    const modeConfig = getModeConfig();
    const copy = MODE_UI_COPY[run.mode];
    const { currentState, currentChoices } = getRenderableState(run);
    const showingSuccessToast = isSuccessToastReveal();
    const statusText =
      run.phase === "reveal" && run.reveal
        ? run.reveal.isCorrect
          ? ""
          : buildRevealMessage(run.reveal)
        : "";

    elements.hudMode.textContent = modeConfig.label;
    elements.hudRound.textContent = getRoundLabel(modeConfig);
    elements.hudScore.textContent = String(run.score);
    elements.hudStreak.textContent = String(run.streak);
    elements.hudTimer.textContent = formatTimer();
    elements.questionBadge.textContent = getQuestionBadge(copy);
    elements.answerHelperText.textContent = "Tap a name.";
    elements.roundFeedback.textContent = statusText;
    elements.roundFeedback.hidden = !statusText;
    renderChallengeHearts();
    elements.stateImageFallback.hidden = !viewState.imageError;
    elements.stateImage.style.visibility = viewState.imageError ? "hidden" : "visible";
    elements.revealLayer.hidden = run.phase !== "reveal" || showingSuccessToast;
    elements.successToast.hidden = !showingSuccessToast;

    if (currentState) {
      elements.stateImage.alt = `${currentState.name} silhouette`;
      if (elements.stateImage.getAttribute("src") !== currentState.assetPath) {
        elements.stateImage.setAttribute("src", currentState.assetPath);
      }
    }

    renderHintView(currentState);

    elements.choiceButtons.forEach(({ button, label }, index) => {
      const choice = currentChoices[index];
      const isCorrectChoice = choice?.id === currentState?.id;
      const isSelectedWrong =
        run.phase === "reveal" &&
        run.selectedChoiceId &&
        choice?.id === run.selectedChoiceId &&
        !isCorrectChoice;

      label.textContent = choice?.name ?? "";
      button.dataset.choiceId = choice?.id ?? "";
      button.disabled = run.phase !== "question" || !choice;
      button.classList.toggle("is-correct", run.phase === "reveal" && Boolean(isCorrectChoice));
      button.classList.toggle("is-incorrect", Boolean(isSelectedWrong));
    });
  }

  function renderReveal() {
    if (!run.reveal || run.reveal.isCorrect) {
      return;
    }

    elements.revealBanner.textContent = run.reveal.isCorrect
      ? "Correct!"
      : run.reveal.timedOut
        ? "Time's up"
        : "Not quite";
    elements.revealBanner.classList.toggle("is-warning", !run.reveal.isCorrect);
    elements.revealTitle.textContent = `This is ${run.reveal.correctName}.`;
    elements.revealRegion.textContent = run.reveal.region;
    elements.revealMessage.textContent = buildRevealMessage(run.reveal);
    elements.revealFact.textContent = run.reveal.fact;
    elements.nextStateButton.hidden = !getModeConfig().manualAdvance;
  }

  function render() {
    renderCountdown();
    renderQuestion();
    renderReveal();
    renderProgressMap();
  }

  function update(deltaMs) {
    run.runtimeMs = (run.runtimeMs ?? 0) + deltaMs;

    if (run.phase === "countdown") {
      run.countdownMsLeft = Math.max(0, run.countdownMsLeft - deltaMs);

      if (run.countdownMsLeft === 0) {
        run = startQuestionRound(run);
        render();
        focusSoon(elements.playPage);
      }
    } else if (run.phase === "question" && getModeConfig().timed) {
      run.questionTimerMs = Math.max(0, run.questionTimerMs - deltaMs);

      if (run.questionTimerMs === 0) {
        submitChoice(null, { timedOut: true });
      }
    } else if (run.phase === "reveal" && run.revealMsLeft > 0) {
      run.revealMsLeft = Math.max(0, run.revealMsLeft - deltaMs);

      if (run.revealMsLeft === 0) {
        advanceFromReveal();
      }
    }
  }

  function loop(frameTime) {
    if (viewState.lastFrameTime == null) {
      viewState.lastFrameTime = frameTime;
    }

    const deltaMs = Math.min(120, frameTime - viewState.lastFrameTime);
    viewState.lastFrameTime = frameTime;
    update(deltaMs);
    render();
    window.requestAnimationFrame(loop);
  }

  function focusSoon(element) {
    if (!element) {
      return;
    }

    window.requestAnimationFrame(() => {
      element.focus({ preventScroll: true });
    });
  }

  function bindEvents() {
    function openMapOverlay() {
      if (!getModeConfig().mapEnabled || run.phase !== "question") {
        return;
      }

      viewState.mapOpen = true;
      viewState.mapRenderKey = "";
      render();
      focusSoon(elements.closeMapButton);
    }

    function activateHintPreview() {
      if (run.phase !== "question") {
        return;
      }

      run = activateHint(run);
      render();
      focusSoon(elements.playPage);
    }

    elements.backToMenuButton.addEventListener("click", backToMenu);
    elements.revealMenuButton.addEventListener("click", backToMenu);
    elements.nextStateButton.addEventListener("click", advanceFromReveal);
    elements.mapButton.addEventListener("click", openMapOverlay);
    elements.closeMapButton.addEventListener("click", () => closeMapOverlay({ restoreFocus: true }));
    elements.hintButton.addEventListener("click", activateHintPreview);

    elements.choiceButtons.forEach(({ button }) => {
      button.addEventListener("click", () => {
        const { choiceId } = button.dataset;

        if (choiceId) {
          submitChoice(choiceId);
        }
      });
    });

    elements.stateImage.addEventListener("error", () => {
      viewState.imageError = true;
      render();
    });

    elements.stateImage.addEventListener("load", () => {
      viewState.imageError = false;
      render();
    });

    window.addEventListener("keydown", (event) => {
      if (viewState.mapOpen) {
        if (event.key === "Escape" || event.key === "m" || event.key === "M") {
          event.preventDefault();
          closeMapOverlay({ restoreFocus: true });
        }
        return;
      }

      if (run.phase === "question") {
        if ((event.key === "m" || event.key === "M") && getModeConfig().mapEnabled) {
          event.preventDefault();
          openMapOverlay();
          return;
        }

        if (
          (event.key === "h" || event.key === "H") &&
          !elements.hintButton.hidden &&
          !elements.hintButton.disabled
        ) {
          event.preventDefault();
          activateHintPreview();
          return;
        }

        const numericValue = Number(event.key);

        if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 4) {
          const choice = getRenderableState(run).currentChoices[numericValue - 1];

          if (choice) {
            event.preventDefault();
            submitChoice(choice.id);
            return;
          }
        }
      }

      if (
        event.key === "Enter" &&
        run.phase === "reveal" &&
        getModeConfig().manualAdvance &&
        !run.reveal?.isCorrect
      ) {
        event.preventDefault();
        advanceFromReveal();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        backToMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (isHintActive()) {
        viewState.hintRenderKey = "";
      }
      if (viewState.mapOpen) {
        viewState.mapRenderKey = "";
      }
      render();
    });
  }

  function ensureRunReady() {
    if (run.phase !== "countdown" && !run.currentStateId) {
      run = startQuestionRound(run);
    } else {
      saveRun(run);
    }
  }

  function buildTextState() {
    const { currentState, currentChoices } = getRenderableState(run);
    const hintData = currentState ? getHintData(currentState.id) : null;
    const hintIsActive = isHintActive(hintData);
    const modeConfig = getModeConfig();

    return {
      phase: run.phase,
      mode: run.mode,
      round: run.activeRoundNumber,
      completedRounds: run.completedRounds,
      score: run.score,
      streak: run.streak,
      heartsRemaining: isChallengeMode() ? run.heartsRemaining ?? 0 : null,
      timerSeconds: modeConfig.timed ? Math.ceil(run.questionTimerMs / 1000) : null,
      currentStateAsset: currentState?.assetPath ?? null,
      choices: currentChoices.map((choice, index) => ({
        slot: index + 1,
        name: choice.name,
        selected: choice.id === run.selectedChoiceId,
        isCorrect: run.phase === "reveal" ? choice.id === currentState?.id : undefined,
      })),
      hint: {
        available:
          run.phase === "question" &&
          modeConfig.allowHints &&
          hasRenderableHintLayout(hintData) &&
          run.hintsRemaining > 0 &&
          !run.hintUsedForCurrentState,
        remaining: run.hintsRemaining ?? 0,
        active: hintIsActive,
        secondsLeft: hintIsActive ? Math.ceil(getHintMsLeft() / 1000) : 0,
        neighborsShown: hintIsActive && hasRenderableHintLayout(hintData) ? [...hintData.neighbors] : [],
        contextType: hasRenderableHintLayout(hintData) ? hintData.contextType : null,
        viewMode: hasRenderableHintLayout(hintData) ? hintData.viewMode : "none",
      },
      map: {
        available: Boolean(modeConfig.mapEnabled),
        open: Boolean(viewState.mapOpen),
        solved: run.solvedStateIds?.length ?? 0,
        remaining: Math.max(0, (modeConfig.rounds ?? 0) - (run.solvedStateIds?.length ?? 0)),
      },
      solvedStateIds: [...(run.solvedStateIds ?? [])],
      reveal: run.phase === "reveal" ? run.reveal : null,
    };
  }

  if (run) {
    window.render_game_to_text = () => JSON.stringify(buildTextState());
    window.advanceTime = (ms) => {
      const target = Math.max(0, Number(ms) || 0);
      let remaining = target;

      while (remaining > 0) {
        const slice = Math.min(50, remaining);
        update(slice);
        remaining -= slice;
      }

      render();
      return window.render_game_to_text();
    };

    bindEvents();
    ensureRunReady();
    render();
    window.requestAnimationFrame(loop);
  }
})();
