function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderStars(count) {
    return `
        <span class="stars" aria-label="${count} stars">
            ${[0, 1, 2].map((index) => `<span class="${index < count ? 'filled' : ''}">★</span>`).join('')}
        </span>
    `;
}

function renderSettingsModal(state) {
    if (!state.showSettings) return '';
    const settingCard = (key, title, copy, on) => `
        <button class="setting-card" type="button" data-setting-toggle="${key}">
            <span class="setting-copy">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(copy)}</span>
            </span>
            <span class="toggle ${on ? 'on' : ''}" aria-hidden="true"></span>
        </button>
    `;

    return `
        <div class="modal" data-close-modal="settings">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <div class="modal-head">
                    <div>
                        <div class="eyebrow">Settings</div>
                        <h2 class="modal-title" id="settingsTitle">Make it feel right</h2>
                    </div>
                    <button class="icon-btn" type="button" data-close-modal="settings" aria-label="Close settings">✕</button>
                </div>
                <div class="setting-grid">
                    ${settingCard('sound', 'Sound', 'Happy tones and try again tones.', state.profile.settings.sound)}
                    ${settingCard('music', 'Music', 'Soft menu music.', state.profile.settings.music)}
                    ${settingCard('readAloud', 'Read Aloud', 'The game reads each task out loud.', state.profile.settings.readAloud)}
                    ${settingCard('bigText', 'Big Text', 'Larger words on every screen.', state.profile.settings.bigText)}
                </div>
                <div class="menu-actions">
                    <button class="ghost-btn" type="button" data-reset-progress="true">Reset Progress</button>
                    <button class="primary-btn" type="button" data-close-modal="settings">Done</button>
                    <button class="secondary-btn" type="button" data-speak-now="true">Read This Page</button>
                </div>
            </div>
        </div>
    `;
}

function renderShapePickerModal(state) {
    if (!state.showShapePicker) return '';
    return `
        <div class="modal" data-close-modal="shape-picker">
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="shapePickerTitle">
                <div class="modal-head">
                    <div>
                        <div class="eyebrow">Make Shape</div>
                        <h2 class="modal-title" id="shapePickerTitle">Pick a shape</h2>
                    </div>
                    <button class="icon-btn" type="button" data-close-modal="shape-picker" aria-label="Close shape picker">✕</button>
                </div>
                <div class="shape-picker">
                    <div class="shape-grid">
                        ${state.shapeChoices.map((choice) => `
                            <button class="shape-btn" type="button" data-shape-choice="${escapeHtml(choice.type)}">
                                <strong>${escapeHtml(choice.title)}</strong>
                                <span>${escapeHtml(choice.copy)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderMenuScreen(state) {
    const nextMission = state.nextMission ? `${state.nextMission.worldTitle}: ${state.nextMission.title}` : 'Your first mission is ready.';
    return `
        <div class="app-shell screen-menu">
            <div class="top-strip">
                <div class="brand">
                    <div class="brand-bubble">◆</div>
                    <div>
                        <div class="brand-title">Quiz it Polygon!</div>
                        <span class="brand-sub">Mission game for shapes, area, and perimeter.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">World ${state.profile.unlockedWorld + 1} open</span>
                    <span class="stat-chip">${state.profile.stats.missionsCleared} missions done</span>
                    <span class="stat-chip">${state.profile.badges.length} badges</span>
                </div>
            </div>

            <section class="menu-panel">
                <div class="menu-hero">
                    <div>
                        <div class="eyebrow">Make. Fix. Pick. Count. Measure.</div>
                        <h1 class="menu-title">Learn polygons by playing.</h1>
                        <p class="menu-subtitle">Each mission is short, clear, and hands-on. Drag shapes, solve fast tasks, and win stars on your map.</p>
                    </div>
                    <div class="menu-art" aria-hidden="true">
                        <div class="menu-float-shape shape-a"></div>
                        <div class="menu-float-shape shape-b"></div>
                        <div class="menu-float-shape shape-c"></div>
                    </div>
                </div>

                <div class="menu-info-row">
                    <div class="menu-info">
                        <strong>Fast Tasks</strong>
                        <span>3 quick tasks per mission.</span>
                    </div>
                    <div class="menu-info">
                        <strong>Stars</strong>
                        <span>Finish clean to earn 3 stars.</span>
                    </div>
                    <div class="menu-info">
                        <strong>Next Up</strong>
                        <span>${escapeHtml(nextMission)}</span>
                    </div>
                </div>

                <div class="menu-actions">
                    <button class="primary-btn" type="button" data-nav="play">Play</button>
                    <button class="secondary-btn" type="button" data-nav="map">My Map</button>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>

                <div class="menu-footer">
                    <span class="mini-chip">Touch, mouse, and keyboard ready</span>
                    <span class="mini-chip">One local player save</span>
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
}

export function renderMapScreen(state) {
    return `
        <div class="app-shell screen-map">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="menu" aria-label="Back to menu">←</button>
                    <div>
                        <div class="brand-title">My Map</div>
                        <span class="brand-sub">Clear worlds. Win stars. Unlock badges.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Streak ${state.profile.currentStreak}</span>
                    <span class="stat-chip">${state.profile.badges.length} badges</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <section class="screen-card map-panel">
                <div class="badge-row">
                    ${state.profile.badges.length
            ? state.profile.badges.map((badge) => `<span class="badge-pill">${escapeHtml(badge)}</span>`).join('')
            : '<span class="empty-note">Clear a boss mission to win your first badge.</span>'}
                </div>

                <div class="map-grid">
                    ${state.worlds.map((world) => `
                        <section class="map-world ${world.locked ? 'locked' : ''}">
                            <div class="map-world-header">
                                <div>
                                    <div class="eyebrow">${escapeHtml(world.theme)}</div>
                                    <h2 class="map-world-title">${escapeHtml(world.title)}</h2>
                                    <p class="map-world-copy">${escapeHtml(world.copy)}</p>
                                </div>
                                <span class="world-badge">${world.completedStars}/${world.totalStars} ★</span>
                            </div>

                            <div class="mission-list">
                                ${world.missions.map((mission, index) => `
                                    <button
                                        type="button"
                                        class="mission-link ${mission.locked ? 'locked' : ''}"
                                        data-start-mission="${world.id}:${mission.id}"
                                        ${world.locked || mission.locked ? 'disabled' : ''}
                                    >
                                        <span class="mission-link-text">
                                            <strong>${index + 1}. ${escapeHtml(mission.title)}</strong>
                                            <small>${escapeHtml(mission.boss ? 'Boss mission' : mission.short)}</small>
                                        </span>
                                        ${renderStars(mission.stars)}
                                    </button>
                                `).join('')}
                            </div>
                        </section>
                    `).join('')}
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
}

function renderChoiceControls(task, state) {
    return `
        <div class="choice-grid">
            ${task.options.map((option) => `
                <button class="choice-btn ${state.lastWrongChoice === option ? 'is-wrong' : ''}" type="button" data-choice="${escapeHtml(option)}">
                    ${escapeHtml(option)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderNumberControls(task, state) {
    return `
        <div class="number-row">
            <input
                class="number-input"
                id="answerInput"
                type="number"
                inputmode="decimal"
                step="any"
                value="${escapeHtml(state.answerValue || '')}"
                placeholder="${escapeHtml(task.placeholder || 'Type your answer')}"
            >
            <button class="primary-btn" type="button" data-check-number="true">Try</button>
        </div>
    `;
}

function renderTaskControls(task, state) {
    if (task.answerMode === 'choice') {
        return renderChoiceControls(task, state);
    }

    if (task.answerMode === 'number') {
        return renderNumberControls(task, state);
    }

    return `
        <div class="number-row">
            <div class="empty-note" style="flex: 1 1 180px;">Drag the shape on the board until it matches.</div>
            <button class="primary-btn" type="button" data-check-board="true">Try</button>
        </div>
    `;
}

export function renderMissionScreen(state) {
    const world = state.activeWorld;
    const mission = state.activeMission;
    const task = state.activeTask;
    const canEditBoard = task.board?.editable !== false;
    const answerModeClass = task.answerMode ? `answer-${task.answerMode}` : '';
    const nextHintText = state.hintStage === 0
        ? 'Tap Help for a clue.'
        : state.hintStage === 1
            ? task.hintLadder[0]
            : state.hintStage === 2
                ? task.hintLadder[1]
                : task.hintLadder[2];

    const feedbackClass = state.feedback.kind === 'good'
        ? 'good'
        : state.feedback.kind === 'try'
            ? 'try'
            : '';

    const primarySummary = state.boardSummary;

    return `
        <div class="app-shell screen-mission ${answerModeClass}">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="map" aria-label="Back to map">←</button>
                    <div>
                        <div class="brand-title">${escapeHtml(world.title)}</div>
                        <span class="brand-sub">${escapeHtml(mission.title)}</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Task ${state.taskIndex + 1}/3</span>
                    <span class="stat-chip">Hints ${state.maxHintStageUsed}</span>
                    <span class="stat-chip">Tries ${state.mistakes}</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <div class="mission-layout">
                <section class="board-panel">
                    <div class="board-stage">
                        <div id="boardCanvasSlot" class="board-canvas"></div>
                        <div class="board-overlay">
                            <div class="board-note-stack">
                                <div class="board-note">${escapeHtml(task.boardNote || 'Move the shape on the grid.')}</div>
                                ${state.hintStage >= 2 && task.visualNote ? `<div class="board-note">${escapeHtml(task.visualNote)}</div>` : ''}
                            </div>
                            <div class="board-note-stack">
                                <div class="board-note">${escapeHtml(task.modeTitle)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="tool-dock">
                        <button class="tool-btn" type="button" data-open-modal="shape-picker" ${canEditBoard ? '' : 'disabled'}>
                            <span>⬠</span><small>Make Shape</small>
                        </button>
                        <button class="tool-btn active" type="button" data-board-tool="move" ${canEditBoard ? '' : 'disabled'}>
                            <span>✋</span><small>Move</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="undo" ${canEditBoard ? '' : 'disabled'}>
                            <span>↶</span><small>Undo</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="reset" ${canEditBoard ? '' : 'disabled'}>
                            <span>↺</span><small>Reset</small>
                        </button>
                        <button class="tool-btn" type="button" data-use-help="true">
                            <span>💡</span><small>Help</small>
                        </button>
                    </div>
                </section>

                <aside class="mission-card">
                    <div class="mission-head">
                        <div class="eyebrow">${escapeHtml(world.title)} • Mission ${state.missionIndex + 1}</div>
                        <h1 class="mission-title">${escapeHtml(mission.title)}</h1>
                        <p class="mission-copy">${escapeHtml(mission.intro)}</p>
                    </div>

                    <div class="mission-progress">
                        <div class="task-dots">
                            ${[0, 1, 2].map((index) => `
                                <span class="task-dot ${index < state.taskIndex ? 'done' : index === state.taskIndex ? 'live' : ''}"></span>
                            `).join('')}
                        </div>
                        <span class="task-tag">${escapeHtml(task.modeTitle)}</span>
                    </div>

                    <section class="task-card">
                        <div class="task-copy">
                            <h2 class="task-prompt">${escapeHtml(task.prompt)}</h2>
                            <p class="task-help">${escapeHtml(task.shortHelp)}</p>
                        </div>

                        ${renderTaskControls(task, state)}

                        <div class="task-hint-panel">
                            <strong>Help</strong>
                            <p class="task-help">${escapeHtml(nextHintText)}</p>
                        </div>

                        ${state.feedback.message ? `
                            <div class="task-feedback ${feedbackClass}">
                                ${escapeHtml(state.feedback.message)}
                            </div>
                        ` : ''}

                        <div class="task-side-box">
                            <strong>Live Shape</strong>
                            <div data-live-shape>
                            ${primarySummary ? `
                                <div class="live-metrics">
                                    <div class="live-metric">
                                        <strong>Name</strong>
                                        <span>${escapeHtml(primarySummary.analysis.primaryLabel)}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Sides</strong>
                                        <span>${primarySummary.vertices}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Area</strong>
                                        <span>${primarySummary.area.toFixed(primarySummary.area % 1 === 0 ? 0 : 1)}</span>
                                    </div>
                                    <div class="live-metric">
                                        <strong>Around</strong>
                                        <span>${primarySummary.perimeter.toFixed(primarySummary.perimeter % 1 === 0 ? 0 : 1)}</span>
                                    </div>
                                </div>
                            ` : '<div class="empty-note">This task starts with an empty board. Use Make Shape when you are ready.</div>'}
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
            ${renderSettingsModal(state)}
            ${renderShapePickerModal(state)}
        </div>
    `;
}

export function renderResultsScreen(state) {
    return `
        <div class="app-shell result-wrap">
            <section class="result-panel">
                <div class="eyebrow">Mission Clear</div>
                <h1 class="menu-title" style="font-size: clamp(2rem, 5vw, 3.3rem);">${escapeHtml(state.activeMission.title)}</h1>
                <p class="summary-copy">${escapeHtml(state.resultMessage)}</p>

                <div class="summary-stars" aria-label="${state.stars} stars won">
                    ${[0, 1, 2].map((index) => `<span class="summary-star ${index < state.stars ? 'on' : ''}">★</span>`).join('')}
                </div>

                <div class="summary-grid">
                    <div class="summary-box">
                        <strong>Stars</strong>
                        <span>${state.stars}</span>
                    </div>
                    <div class="summary-box">
                        <strong>Tries</strong>
                        <span>${state.mistakes}</span>
                    </div>
                    <div class="summary-box">
                        <strong>Help</strong>
                        <span>${state.maxHintStageUsed}</span>
                    </div>
                </div>

                <div class="menu-actions">
                    <button class="primary-btn" type="button" data-results-action="next">Play Next</button>
                    <button class="secondary-btn" type="button" data-results-action="replay">Play Again</button>
                    <button class="ghost-btn" type="button" data-results-action="map">My Map</button>
                </div>
            </section>
            ${renderSettingsModal(state)}
        </div>
    `;
}
