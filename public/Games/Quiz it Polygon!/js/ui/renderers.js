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

function renderMissionStatePills(mission) {
    if (!mission.statuses?.length) {
        return '';
    }

    return `
        <span class="mission-state-row">
            ${mission.statuses.map((status) => `
                <span class="mission-state mission-state-${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span>
            `).join('')}
        </span>
    `;
}

function renderWorldSwitchChip(world, isFocused = false) {
    const tag = world.canFocus ? 'button' : 'section';
    const attributes = world.canFocus
        ? `type="button" class="map-world-chip ${isFocused ? 'is-focused' : ''} ${world.isCurrentPath ? 'is-current-path' : ''}" data-focus-world="${escapeHtml(world.id)}" title="${escapeHtml(world.note)}"`
        : `class="map-world-chip is-locked" title="${escapeHtml(world.note)}"`;

    return `
        <${tag} ${attributes}>
            <span class="map-world-chip-top">
                <strong>${escapeHtml(world.title)}</strong>
                <span class="map-world-chip-stars">${world.completedStars}/${world.totalStars} ★</span>
            </span>
            <span class="map-world-chip-meta">
                <span>${world.completedMissions}/${world.totalMissions} missions</span>
                ${world.locked
            ? '<span class="mission-state mission-state-locked">Locked</span>'
            : isFocused
                ? '<span class="mission-state mission-state-next">Showing</span>'
                : world.isCurrentPath
                ? '<span class="mission-state mission-state-next">Current path</span>'
                : '<span class="mission-state mission-state-done">Open</span>'}
            </span>
        </${tag}>
    `;
}

function renderMapMissionCard(worldId, mission, variant = 'ready') {
    const tag = mission.locked ? 'section' : 'button';
    const attrs = mission.locked
        ? `class="map-mission-card ${variant === 'next' ? 'is-next' : ''} is-locked"`
        : `type="button" class="map-mission-card ${variant === 'next' ? 'is-next' : ''}" data-start-mission="${escapeHtml(worldId)}:${escapeHtml(mission.id)}"`;

    return `
        <${tag} ${attrs}>
            <span class="map-mission-card-top">
                <span class="focus-mission-order">${mission.order}</span>
                ${renderMissionStatePills(mission)}
            </span>
            <strong>${escapeHtml(mission.title)}</strong>
            <small>${escapeHtml(mission.short)}</small>
            <span class="map-mission-card-bottom">${renderStars(mission.stars)}</span>
        </${tag}>
    `;
}

function renderMissionReplayChip(worldId, mission) {
    return `
        <button type="button" class="map-mission-chip" data-start-mission="${escapeHtml(worldId)}:${escapeHtml(mission.id)}">
            <span class="map-mission-chip-title">${mission.order}. ${escapeHtml(mission.title)}</span>
            <span class="map-mission-chip-stars">${renderStars(mission.stars)}</span>
        </button>
    `;
}

function renderMissionRoadmapChip(mission) {
    return `
        <div class="map-roadmap-chip ${mission.isNext ? 'is-next' : ''} ${mission.locked ? 'is-locked' : ''}">
            <span class="map-roadmap-order">${mission.order}</span>
            <span class="map-roadmap-copy">
                <strong>${escapeHtml(mission.title)}</strong>
                <small>${escapeHtml(mission.short)}</small>
            </span>
        </div>
    `;
}

export function renderLiveShapeContent({ summary, draftCount }) {
    if (summary) {
        return `
            <div class="live-metrics">
                <div class="live-metric">
                    <strong>Name</strong>
                    <span>${escapeHtml(summary.analysis.primaryLabel)}</span>
                </div>
                <div class="live-metric">
                    <strong>Sides</strong>
                    <span>${summary.vertices}</span>
                </div>
                <div class="live-metric">
                    <strong>Area</strong>
                    <span>${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}</span>
                </div>
                <div class="live-metric">
                    <strong>Around</strong>
                    <span>${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}</span>
                </div>
            </div>
        `;
    }

    if (draftCount) {
        return `<div class="empty-note">${draftCount} point${draftCount === 1 ? '' : 's'} placed. Tap the first point again when you are ready to close the polygon.</div>`;
    }

    return '<div class="empty-note">This task starts with an empty board. Use Plot or Make Shape when you are ready.</div>';
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
                        <span class="brand-sub">Mission game for drawing, fixing, and naming polygons.</span>
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
                        <p class="menu-subtitle">Each mission is short, clear, and hands-on. Plot corner points, fix near-miss polygons, and earn points while your map keeps best-star progress.</p>
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
                        <strong>Points</strong>
                        <span>Clean clears can award up to 150 points.</span>
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
    const focusWorld = state.mapFocusWorld;
    const otherWorlds = state.mapOtherWorlds || [];
    const focusMissions = focusWorld?.missions || [];
    const nextMission = focusMissions.find((mission) => mission.isNext)
        || focusMissions.find((mission) => !mission.locked && !mission.cleared)
        || focusMissions[0]
        || null;
    const readyMissions = focusMissions.filter((mission) => !mission.locked && !mission.cleared && mission.id !== nextMission?.id);
    const clearedMissions = focusMissions.filter((mission) => mission.cleared);
    const lockedMissions = focusMissions.filter((mission) => mission.locked && mission.id !== nextMission?.id);
    const worldSwitcher = focusWorld ? [focusWorld, ...otherWorlds] : otherWorlds;

    return `
        <div class="app-shell screen-map">
            <div class="top-strip">
                <div class="brand">
                    <button class="icon-btn" type="button" data-nav="menu" aria-label="Back to menu">←</button>
                    <div>
                        <div class="brand-title">My Map</div>
                        <span class="brand-sub">Follow the path, replay old wins, and see what unlocks next.</span>
                    </div>
                </div>
                <div class="top-stats">
                    <span class="stat-chip">Streak ${state.mapSummary.currentStreak}</span>
                    <span class="stat-chip">${state.mapSummary.badgeCount} badge${state.mapSummary.badgeCount === 1 ? '' : 's'}</span>
                    <button class="ghost-btn" type="button" data-open-modal="settings">Settings</button>
                </div>
            </div>

            <section class="screen-card map-panel">
                <section class="map-progress-strip">
                    <div class="map-progress-copy">
                        <div class="eyebrow">Next Mission</div>
                        <h2 class="map-progress-title">${escapeHtml(state.mapSummary.nextMissionLabel)}</h2>
                        <p class="map-progress-note">${escapeHtml(state.mapSummary.nextMissionCopy)}</p>
                    </div>
                    <div class="map-progress-stats">
                        <div class="map-stat-card">
                            <strong>Stars</strong>
                            <span>${state.mapSummary.earnedStars}/${state.mapSummary.totalStars}</span>
                        </div>
                        <div class="map-stat-card">
                            <strong>Missions</strong>
                            <span>${state.mapSummary.missionsCleared}/${state.mapSummary.totalMissions}</span>
                        </div>
                        <div class="map-stat-card">
                            <strong>Worlds</strong>
                            <span>${state.mapSummary.worldsCleared}/${state.mapSummary.worldCount}</span>
                        </div>
                    </div>
                </section>

                <div class="map-summary-row">
                    ${state.mapSummary.badges.length
            ? state.mapSummary.badges.map((badge) => `<span class="badge-pill">${escapeHtml(badge)}</span>`).join('')
            : '<span class="empty-note map-empty-note">Clear a boss mission to win your first badge.</span>'}
                </div>

                <div class="map-content">
                    ${focusWorld ? `
                        <section class="map-focus-world">
                            <div class="map-focus-head">
                                <div class="map-focus-copy-block">
                                    <div class="eyebrow">${escapeHtml(focusWorld.theme)}</div>
                                    <h2 class="map-focus-title">${escapeHtml(focusWorld.title)}</h2>
                                </div>
                                <div class="map-focus-meta">
                                    <span class="world-badge">${focusWorld.completedStars}/${focusWorld.totalStars} ★</span>
                                    <span class="map-focus-count">${focusWorld.completedMissions}/${focusWorld.totalMissions} missions</span>
                                </div>
                            </div>

                            <div class="map-focus-hero">
                                <div class="map-focus-hero-copy">
                                    <span class="eyebrow">${escapeHtml(focusWorld.calloutTitle)}</span>
                                    <strong>${escapeHtml(nextMission?.title || focusWorld.title)}</strong>
                                    <span>${escapeHtml(nextMission?.short || focusWorld.calloutCopy)}</span>
                                </div>
                                ${nextMission && !nextMission.locked
            ? `<button type="button" class="primary-btn map-focus-play" data-start-mission="${escapeHtml(focusWorld.id)}:${escapeHtml(nextMission.id)}">${nextMission.cleared ? 'Replay Mission' : 'Play Next'}</button>`
            : '<span class="map-focus-lock">World clear. Replay any mission below.</span>'}
                            </div>

                            ${readyMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Keep Going</strong>
                                        <span>${readyMissions.length} mission${readyMissions.length === 1 ? '' : 's'} ready</span>
                                    </div>
                                    <div class="map-mission-grid">
                                        ${readyMissions.map((mission) => renderMapMissionCard(focusWorld.id, mission, 'ready')).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${clearedMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Replay Wins</strong>
                                        <span>${clearedMissions.length} cleared</span>
                                    </div>
                                    <div class="map-chip-row">
                                        ${clearedMissions.map((mission) => renderMissionReplayChip(focusWorld.id, mission)).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${lockedMissions.length ? `
                                <div class="map-section-block">
                                    <div class="map-section-head">
                                        <strong>Coming Later</strong>
                                        <span>Clear the path to unlock these</span>
                                    </div>
                                    <div class="map-roadmap-row">
                                        ${lockedMissions.map((mission) => renderMissionRoadmapChip(mission)).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </section>

                        <section class="map-world-switcher">
                            <div class="map-section-head">
                                <strong>Worlds</strong>
                                <span>Tap an open world to switch the view.</span>
                            </div>
                            <div class="map-world-chip-row">
                                ${worldSwitcher.map((world) => renderWorldSwitchChip(world, world.id === focusWorld.id)).join('')}
                            </div>
                        </section>
                    ` : '<div class="empty-note map-empty-note">Your map is getting ready. Start a mission and come back to see the path.</div>'}
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

    const boardInstruction = task.proof?.requireDrawnShape
        ? 'Use Plot to place each corner. Tap the first point again to close your polygon.'
        : task.board?.allowShapePicker === false
            ? 'Drag the existing corner points until the polygon matches.'
            : 'Make or move a shape on the board until it matches.';

    return `
        <div class="number-row">
            <div class="empty-note" style="flex: 1 1 180px;">${escapeHtml(boardInstruction)}</div>
            <button class="primary-btn" type="button" data-check-board="true">Try</button>
        </div>
    `;
}

export function renderMissionScreen(state) {
    const world = state.activeWorld;
    const mission = state.activeMission;
    const task = state.activeTask;
    const canEditBoard = task.board?.editable !== false;
    const allowShapePicker = canEditBoard && task.board?.allowShapePicker !== false;
    const allowDraw = canEditBoard && task.board?.allowDraw !== false;
    const taskCount = mission.tasks.length;
    const helperBadges = task.board?.helperBadges || [];
    const answerModeClass = task.answerMode ? `answer-${task.answerMode}` : '';
    const currentHintText = state.currentHintText || task.hintLadder?.[0] || 'Tap Help for a clue.';

    const feedbackClass = state.feedback.kind === 'good'
        ? 'good'
        : state.feedback.kind === 'try'
            ? 'try'
            : '';

    const primarySummary = state.boardSummary;

    return `
        <div class="app-shell screen-mission ${answerModeClass}">
            <div class="mission-layout">
                <section class="board-panel">
                    <div class="board-stage">
                        <div id="boardCanvasSlot" class="board-canvas"></div>
                        <div class="board-overlay">
                            ${state.boardGuideOpen ? `
                                <div class="board-guide-panel">
                                    <div class="board-guide-head">
                                        <strong>Guide</strong>
                                        <button class="board-guide-close" type="button" data-board-guide-toggle="hide" aria-label="Hide guide">−</button>
                                    </div>
                                    <div class="board-note-stack">
                                        <div class="board-note">${escapeHtml(task.boardNote || 'Move the shape on the grid.')}</div>
                                        ${state.hintStage >= 2 && task.visualNote ? `<div class="board-note">${escapeHtml(task.visualNote)}</div>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            <div class="board-note-stack">
                                <div class="board-note board-note-mode">${escapeHtml(task.modeTitle)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="tool-dock">
                        <button class="tool-btn" type="button" data-open-modal="shape-picker" ${allowShapePicker ? '' : 'disabled'}>
                            <span>⬠</span><small>Make</small>
                        </button>
                        <button class="tool-btn ${state.boardMode === 'draw' ? 'active' : ''}" type="button" data-board-tool="draw" ${allowDraw ? '' : 'disabled'}>
                            <span>✎</span><small>Plot</small>
                        </button>
                        <button class="tool-btn ${state.boardMode !== 'draw' ? 'active' : ''}" type="button" data-board-tool="move" ${canEditBoard ? '' : 'disabled'}>
                            <span>✋</span><small>Move</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="undo" ${canEditBoard ? '' : 'disabled'}>
                            <span>↶</span><small>Undo</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="reset" ${canEditBoard ? '' : 'disabled'}>
                            <span>↺</span><small>Reset</small>
                        </button>
                        <button class="tool-btn" type="button" data-board-action="clear-draft" ${allowDraw ? '' : 'disabled'}>
                            <span>⌫</span><small>Clear</small>
                        </button>
                        <button
                            class="tool-btn ${state.helpPanelOpen ? 'active' : ''}"
                            type="button"
                            data-use-help="true"
                            aria-pressed="${state.helpPanelOpen ? 'true' : 'false'}"
                        >
                            <span>💡</span><small>${state.helpPanelOpen ? 'Hide' : 'Help'}</small>
                        </button>
                    </div>
                </section>

                <aside class="mission-card">
                    <div class="mission-toolbar">
                        <div class="mission-toolbar-main">
                            <button class="icon-btn mission-toolbar-back" type="button" data-nav="map" aria-label="Back to map">←</button>
                            <div class="mission-toolbar-copy">
                                <strong>${escapeHtml(world.title)}</strong>
                            </div>
                            <div class="task-dots">
                                ${Array.from({ length: taskCount }, (_, index) => `
                                    <span class="task-dot ${index < state.taskIndex ? 'done' : index === state.taskIndex ? 'live' : ''}"></span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="mission-toolbar-actions">
                            <span class="stat-chip">Task ${state.taskIndex + 1}/${taskCount}</span>
                            <button class="ghost-btn mission-toolbar-settings" type="button" data-open-modal="settings">Settings</button>
                        </div>
                    </div>

                    <section class="task-card">
                        <div class="task-copy">
                            <h2 class="task-prompt">${escapeHtml(task.prompt)}</h2>
                            <p class="task-help">${escapeHtml(task.shortHelp)}</p>
                            ${helperBadges.length ? `
                                <div class="task-tag-row">
                                    ${helperBadges.map((badge) => `<span class="task-tag">${escapeHtml(badge)}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>

                        ${renderTaskControls(task, state)}

                        ${state.helpPanelOpen && state.hintStage > 0 ? `
                            <div class="task-hint-panel">
                                <div class="task-hint-head">
                                    <strong>Help</strong>
                                    ${state.hintStage < 3
            ? '<button class="task-hint-btn" type="button" data-more-help="true">More Help</button>'
            : '<span class="task-hint-cap">Top clue</span>'}
                                </div>
                                <p class="task-help">${escapeHtml(currentHintText)}</p>
                            </div>
                        ` : ''}

                        ${state.feedback.message ? `
                            <div class="task-feedback ${feedbackClass}">
                                ${escapeHtml(state.feedback.message)}
                            </div>
                        ` : ''}

                        <div class="task-side-box">
                            <strong>Live Shape</strong>
                            <div data-live-shape>
                                ${renderLiveShapeContent({
            summary: primarySummary,
            draftCount: state.boardDraftCount
        })}
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
                        <strong>Points</strong>
                        <span>${state.pointsAwarded}</span>
                    </div>
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
