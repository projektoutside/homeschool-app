/**
 * Word Game Controller
 * Core gameplay logic for word unscramble rounds.
 */
class WordGameController {
    constructor(gameState, callbacks = {}) {
        if (!gameState) {
            gameState = { level: 1, timeLimit: 60, score: 0 };
        }

        this.gameState = gameState;
        this.callbacks = callbacks;
        this.currentEquation = null;
        this.score = 0;
        this.currentProblemPoints = 0;
        this.nextQuestionTimeout = null;
        this.numberColorTiers = [
            { name: 'white', points: 3, weight: 35, className: 'number-color-white' },
            { name: 'blue', points: 4, weight: 25, className: 'number-color-blue' },
            { name: 'green', points: 5, weight: 20, className: 'number-color-green' },
            { name: 'orange', points: 7, weight: 15, className: 'number-color-orange' },
            { name: 'red', points: 10, weight: 5, className: 'number-color-red' }
        ];

        // Initialize word puzzle generator
        this.wordGenerator = new WordGenerator();

        this.initTimeLimit();

        this.gameTimer = null;
        this.draggedElement = null;
        this.pendingDragBlock = null;
        this.dragStartPoint = null;
        this.selectedBlock = null;
        this.suppressClickUntil = 0;
        this.instructionResizeObserver = null;
        this.moveHistory = [];
        this.gameEnded = false;

        this.setupGameEventListeners();
        this.setupInstructionPanelObserver();


        // Initialize limits
        this.maxHints = gameState.hintLimit || 3;
        this.hintsUsed = 0;
        this.maxSkips = gameState.skipLimit || 3;
        this.skipsUsed = 0;

        this.updateLimitVisuals();
        this.updateScoreDisplay();
        this.renderColorPointsGuide();
        this.updateCurrentProblemPointsDisplay(0);
    }

    initTimeLimit() {
        const timeLimit = this.gameState.timeLimit;
        if (typeof timeLimit !== 'number' || isNaN(timeLimit) || timeLimit <= 0 || timeLimit > 1000) {
            this.timeRemaining = 60;
            this.gameState.timeLimit = 60;
        } else {
            this.timeRemaining = Math.floor(timeLimit);
            this.gameState.timeLimit = this.timeRemaining;
        }
    }

    setupGameEventListeners() {
        const undoBtn = document.getElementById('undoMove');
        const clearBtn = document.getElementById('clearEquation');
        const hintBtn = document.getElementById('getHint');
        const skipBtn = document.getElementById('skipQuestion');

        this.boundUndo = () => this.undoLastMove();
        this.boundClear = () => this.clearAllSlots();
        this.boundHint = () => this.showHint();
        this.boundSkip = () => this.skipQuestion();

        if (undoBtn) {
            undoBtn.removeEventListener('click', this.boundUndo); // Safety remove
            undoBtn.addEventListener('click', this.boundUndo);
        }
        if (clearBtn) {
            clearBtn.removeEventListener('click', this.boundClear);
            clearBtn.addEventListener('click', this.boundClear);
        }
        if (hintBtn) {
            hintBtn.removeEventListener('click', this.boundHint);
            hintBtn.addEventListener('click', this.boundHint);
            // Ensure button is enabled
            hintBtn.disabled = false;
        }
        if (skipBtn) {
            skipBtn.removeEventListener('click', this.boundSkip);
            skipBtn.addEventListener('click', this.boundSkip);
        }

        this.updateUndoButtonState();
    }

    cleanup() {
        this.stopTimer();
        this.gameEnded = true;
        this.clearSelectedBlock();
        if (this.nextQuestionTimeout) {
            clearTimeout(this.nextQuestionTimeout);
            this.nextQuestionTimeout = null;
        }

        const undoBtn = document.getElementById('undoMove');
        const clearBtn = document.getElementById('clearEquation');
        const hintBtn = document.getElementById('getHint');
        const skipBtn = document.getElementById('skipQuestion');

        undoBtn?.removeEventListener('click', this.boundUndo);
        clearBtn?.removeEventListener('click', this.boundClear);
        hintBtn?.removeEventListener('click', this.boundHint);
        skipBtn?.removeEventListener('click', this.boundSkip);
        if (this.instructionResizeObserver) {
            this.instructionResizeObserver.disconnect();
            this.instructionResizeObserver = null;
        }

        this.clearAllSlots();
    }

    setupInstructionPanelObserver() {
        const panel = document.querySelector('.control-display-panel');
        if (!panel || typeof ResizeObserver === 'undefined') return;

        this.instructionResizeObserver = new ResizeObserver(() => {
            this.fitInstructionPanel();
        });
        this.instructionResizeObserver.observe(panel);
    }

    updateScoreDisplay() {
        const scoreDisplay = document.getElementById('currentScore');
        if (scoreDisplay) {
            scoreDisplay.textContent = this.score;
        }
    }

    updateTimerVisualState(timeDisplayEl = null) {
        const timeDisplay = timeDisplayEl || document.getElementById('timeRemaining');
        if (!timeDisplay) return;

        if (this.timeRemaining <= 30) {
            timeDisplay.style.color = '#ff3b30';
        } else if (this.timeRemaining <= 60) {
            timeDisplay.style.color = '#ffff00';
        } else {
            timeDisplay.style.color = '#45c776';
        }

        timeDisplay.style.animation = '';
    }

    startNewRound() {
        this.moveHistory = [];
        this.gameEnded = false;

        this.updateUndoButtonState();

        const timeDisplay = document.getElementById('timeRemaining');
        if (timeDisplay && !this.gameTimer) {
            this.initTimeLimit();
            timeDisplay.textContent = this.timeRemaining;
            this.updateTimerVisualState(timeDisplay);
        }

        this.generateEquation();
        this.createAnswerBlocks();
        setTimeout(() => this.optimizeEquationLayout(), 100);

        if (this.timeRemaining > 0 && !this.gameTimer) {
            setTimeout(() => {
                if (!this.gameEnded && !this.gameTimer) {
                    this.startTimer();
                }
            }, 50);
        }
    }

    startTimer() {
        if (this.gameTimer) clearInterval(this.gameTimer);

        this.gameTimer = setInterval(() => {
            this.timeRemaining--;

            const timeDisplay = document.getElementById('timeRemaining');
            if (timeDisplay) {
                timeDisplay.textContent = this.timeRemaining;
                this.updateTimerVisualState(timeDisplay);
            }

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    endGame() {
        this.stopTimer();
        this.gameEnded = true;
        // Use the dedicated onGameEnd callback to let GameController handle the persistent UI
        if (this.callbacks.onGameEnd) {
            this.callbacks.onGameEnd(this.score);
        } else {
            // Fallback just in case
            this.showFeedback(false, `Time's up! Final Score: ${this.score}`, '⏰');
        }
    }

    generateEquation() {
        this.currentEquation = this.wordGenerator.generate(this.gameState.level);
    }

    pickNumberColorTier(excludedTierNames = null) {
        const eligibleTiers = this.numberColorTiers.filter((tier) => {
            return !(excludedTierNames && excludedTierNames.has(tier.name));
        });

        const tiersToUse = eligibleTiers.length > 0 ? eligibleTiers : this.numberColorTiers;
        const totalWeight = tiersToUse.reduce((sum, tier) => sum + tier.weight, 0);
        if (totalWeight <= 0) {
            return tiersToUse[0];
        }

        let random = Math.random() * totalWeight;
        for (const tier of tiersToUse) {
            if (random < tier.weight) {
                return tier;
            }
            random -= tier.weight;
        }

        return tiersToUse[0];
    }

    generateRoundColorTierAssignments(blockCount) {
        const assignments = [];
        let redUsed = false;

        for (let index = 0; index < blockCount; index += 1) {
            const excluded = redUsed ? new Set(['red']) : null;
            const tier = this.pickNumberColorTier(excluded);
            assignments.push(tier);
            if (tier.name === 'red') {
                redUsed = true;
            }
        }

        return assignments;
    }

    applyNumberColorTier(block, tierOverride = null) {
        const tier = tierOverride || this.pickNumberColorTier();
        block.classList.add(tier.className);
        block.dataset.colorTier = tier.name;
        block.dataset.colorPoints = String(tier.points);
        return tier;
    }

    calculatePlacedNumberColorPoints() {
        const placedNumberBlocks = document.querySelectorAll('#equationDisplay .answer-block');
        return Array.from(placedNumberBlocks).reduce((total, block) => {
            const points = Number.parseInt(block.dataset.colorPoints, 10);
            return total + (Number.isFinite(points) ? points : 3);
        }, 0);
    }

    renderColorPointsGuide() {
        const legend = document.getElementById('pointsGuideLegend');
        if (!legend) return;

        legend.innerHTML = '';

        this.numberColorTiers.forEach((tier) => {
            const item = document.createElement('div');
            item.className = 'points-guide-item';

            const swatch = document.createElement('span');
            swatch.className = `points-guide-swatch points-guide-swatch-${tier.name}`;
            swatch.setAttribute('aria-hidden', 'true');

            const label = document.createElement('span');
            label.className = 'points-guide-label';
            label.textContent = tier.name.charAt(0).toUpperCase() + tier.name.slice(1);

            const value = document.createElement('span');
            value.className = 'points-guide-value';
            value.textContent = `${tier.points} pts`;

            item.appendChild(swatch);
            item.appendChild(label);
            item.appendChild(value);
            legend.appendChild(item);
        });
    }

    updateCurrentProblemPointsDisplay(points = null) {
        const pointsDisplay = document.getElementById('currentProblemPoints');
        if (!pointsDisplay) return;

        let resolvedPoints = points;
        if (!Number.isFinite(resolvedPoints)) {
            const blocks = document.querySelectorAll('.answer-block[data-color-points]');
            resolvedPoints = Array.from(blocks).reduce((total, block) => {
                const value = Number.parseInt(block.dataset.colorPoints, 10);
                return total + (Number.isFinite(value) ? value : 0);
            }, 0);
        }

        this.currentProblemPoints = Number.isFinite(resolvedPoints) ? resolvedPoints : 0;
        pointsDisplay.textContent = String(this.currentProblemPoints);
    }

    createAnswerBlocks() {
        const container = document.getElementById('answerBlocks');
        if (!container) return;
        container.innerHTML = '';

        const eq = this.currentEquation;
        const answers = [...(eq.scrambledLetters || [])];
        this.shuffleArray(answers);
        this.renderInstructionPanel({
            letters: answers,
            category: eq.category,
            clue: eq.clue
        });

        const roundColorTiers = this.generateRoundColorTierAssignments(answers.length);

        answers.forEach((val, idx) => {
            const block = document.createElement('div');
            block.className = 'answer-block';
            block.textContent = val;
            block.dataset.value = val;
            block.dataset.id = `block-${idx}`;
            this.applyNumberColorTier(block, roundColorTiers[idx] || null);
            this.addDragListeners(block);
            container.appendChild(block);
        });

        const puzzlePoints = roundColorTiers.reduce((sum, tier) => {
            return sum + (tier && Number.isFinite(tier.points) ? tier.points : 0);
        }, 0);
        this.updateCurrentProblemPointsDisplay(puzzlePoints);

        this.updateEquationDisplay();
        this.createOperationBlocks();
    }

    renderInstructionPanel({ letters, category, clue }) {
        const panel = document.querySelector('.instruction-text');
        if (!panel) return;

        panel.innerHTML = '';

        const topLine = document.createElement('div');
        topLine.className = 'instruction-line instruction-meta';

        const lettersLabel = document.createElement('span');
        lettersLabel.className = 'instruction-tag';
        lettersLabel.textContent = 'Letters:';
        topLine.appendChild(lettersLabel);

        const lettersValue = document.createElement('span');
        lettersValue.className = 'instruction-value';
        lettersValue.textContent = ` ${letters.join(' ')} `;
        topLine.appendChild(lettersValue);

        const divider = document.createElement('span');
        divider.className = 'instruction-divider';
        divider.textContent = '|';
        topLine.appendChild(divider);

        const categoryLabel = document.createElement('span');
        categoryLabel.className = 'instruction-tag';
        categoryLabel.textContent = ' Category:';
        topLine.appendChild(categoryLabel);

        const categoryValue = document.createElement('span');
        categoryValue.className = 'instruction-value';
        categoryValue.textContent = ` ${category || 'General'}`;
        topLine.appendChild(categoryValue);

        const clueLine = document.createElement('div');
        clueLine.className = 'instruction-line instruction-clue';

        const clueLabel = document.createElement('span');
        clueLabel.className = 'instruction-tag';
        clueLabel.textContent = 'Clue:';
        clueLine.appendChild(clueLabel);

        const clueValue = document.createElement('span');
        clueValue.className = 'instruction-value';
        clueValue.textContent = ` ${clue || ''}`;
        clueLine.appendChild(clueValue);

        panel.appendChild(topLine);
        panel.appendChild(clueLine);

        this.fitInstructionPanel();
    }

    fitInstructionPanel() {
        const panel = document.querySelector('.control-display-panel');
        if (!panel) return;

        panel.style.setProperty('--instruction-scale', '1');

        const lines = Array.from(panel.querySelectorAll('.instruction-line'));
        if (lines.length === 0) return;

        let scale = 1;
        let guard = 0;
        const minScale = 0.56;
        const needsShrink = () => {
            if (panel.scrollHeight > panel.clientHeight + 1) return true;
            return lines.some((line) => line.scrollWidth > line.clientWidth + 1);
        };

        while (guard < 20 && needsShrink()) {
            scale -= 0.03;
            if (scale < minScale) {
                scale = minScale;
                panel.style.setProperty('--instruction-scale', String(scale));
                break;
            }
            panel.style.setProperty('--instruction-scale', scale.toFixed(2));
            guard += 1;
        }
    }

    createOperationBlocks() {
        const container = document.getElementById('operationBlocks');
        if (!container) return;
        container.innerHTML = '';
        const section = container.closest('.blocks-section');
        if (section) {
            section.style.display = 'none';
        }
    }

    updateEquationDisplay() {
        const display = document.getElementById('equationDisplay');
        if (!display) return;

        const letters = this.currentEquation.letters || [];
        display.innerHTML = '';
        display.setAttribute('data-type', 'word_unscramble');

        letters.forEach((_, index) => {
            const slot = document.createElement('div');
            slot.className = 'equation-slot';
            slot.dataset.position = String(index);
            display.appendChild(slot);
        });

        this.setupSlotClickListeners();
        this.refreshSlotGlow();
    }

    optimizeEquationLayout() {
        // Optimized layout adjustment logic here if needed
    }

    addDragListeners(block) {
        block.addEventListener('mousedown', (e) => this.startDrag(e, block));
        block.addEventListener('touchstart', (e) => this.startDrag(e, block), { passive: false });
        block.addEventListener('click', (e) => this.handleBlockClick(e, block));
    }

    handleBlockClick(e, block, force = false) {
        if (!force && Date.now() < this.suppressClickUntil) return;
        if (this.gameEnded || this.draggedElement) return;

        // Only allow selecting available blocks from answer/operation pools
        if (block.classList.contains('placed')) return;

        if (this.selectedBlock === block) {
            this.clearSelectedBlock();
            return;
        }

        this.setSelectedBlock(block);
    }

    setSelectedBlock(block) {
        if (this.selectedBlock && this.selectedBlock !== block) {
            this.selectedBlock.classList.remove('selected-answer');
        }

        this.selectedBlock = block;
        this.selectedBlock.classList.add('selected-answer');
        this.refreshSlotGlow();
    }

    clearSelectedBlock() {
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove('selected-answer');
        }
        this.selectedBlock = null;
        this.refreshSlotGlow();
    }

    setupSlotClickListeners() {
        const slots = document.querySelectorAll('#equationDisplay .equation-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => this.handleSlotClick(slot));
        });
    }

    handleSlotClick(slot) {
        if (!this.selectedBlock || this.gameEnded) return;
        if (slot.classList.contains('filled')) return;
        if (!this.selectedBlock.classList.contains('answer-block')) return;

        this.placeBlockInSlot(this.selectedBlock, slot);
        this.clearSelectedBlock();
    }

    refreshSlotGlow() {
        const allSlots = document.querySelectorAll('#equationDisplay .equation-slot');
        allSlots.forEach(slot => slot.classList.remove('slot-placement-glow'));

        if (!this.selectedBlock) return;
        document.querySelectorAll('#equationDisplay .equation-slot:not(.filled)').forEach(slot => {
            slot.classList.add('slot-placement-glow');
        });
    }

    startDrag(e, block) {
        e.preventDefault();
        this.dragMoved = false;
        this.pendingDragBlock = block;

        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        this.dragStartPoint = { x: clientX, y: clientY };

        this.moveHandler = (ev) => this.dragMove(ev);
        this.upHandler = (ev) => this.endDrag(ev);

        document.addEventListener('mousemove', this.moveHandler);
        document.addEventListener('touchmove', this.moveHandler, { passive: false });
        document.addEventListener('mouseup', this.upHandler);
        document.addEventListener('touchend', this.upHandler);
    }

    dragMove(e) {
        if (!this.pendingDragBlock && !this.draggedElement) return;
        e.preventDefault();

        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        if (!this.draggedElement) {
            const dx = clientX - (this.dragStartPoint?.x ?? clientX);
            const dy = clientY - (this.dragStartPoint?.y ?? clientY);
            const movedEnough = Math.hypot(dx, dy) > 6;

            if (!movedEnough) return;

            this.beginDragFromPending(clientX, clientY);
            this.dragMoved = true;
            this.clearSelectedBlock();
        }

        const el = this.draggedElement;

        // Simply update position - logic is simpler now that it's always fixed on body
        el.style.left = (clientX - this.dragOffset.x) + 'px';
        el.style.top = (clientY - this.dragOffset.y) + 'px';

        const dropZone = this.getDropZoneUnder(clientX, clientY);
        this.highlightDropZones(dropZone);
    }

    beginDragFromPending(clientX, clientY) {
        const block = this.pendingDragBlock;
        if (!block) return;

        const rect = block.getBoundingClientRect();

        if (block.classList.contains('placed')) {
            const parent = block.parentElement;
            if (parent && parent.classList.contains('equation-slot')) {
                parent.classList.remove('filled');
            }
            block.classList.remove('placed');
        }

        block.style.width = `${rect.width}px`;
        block.style.height = `${rect.height}px`;
        block.style.position = 'fixed';
        block.style.left = `${rect.left}px`;
        block.style.top = `${rect.top}px`;
        block.style.zIndex = '10000';
        block.style.margin = '0';

        document.body.appendChild(block);

        this.draggedElement = block;
        block.classList.add('dragging');

        this.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    endDrag(e) {
        document.removeEventListener('mousemove', this.moveHandler);
        document.removeEventListener('touchmove', this.moveHandler);
        document.removeEventListener('mouseup', this.upHandler);
        document.removeEventListener('touchend', this.upHandler);

        // Treat as regular click/tap if drag never actually started
        if (!this.draggedElement) {
            const tappedBlock = this.pendingDragBlock;
            this.pendingDragBlock = null;
            this.dragStartPoint = null;
            this.dragMoved = false;

            if (tappedBlock) {
                this.handleBlockClick(e, tappedBlock, true);
                this.suppressClickUntil = Date.now() + 140;
            }
            return;
        }

        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);

        const dropZone = this.getDropZoneUnder(clientX, clientY);

        // Remove fixed positioning temporary styles before placing or returning
        // The methods placeBlockInSlot/returnBlock will reset styles appropriately
        this.draggedElement.classList.remove('dragging');
        this.clearDropZoneHighlights();

        if (dropZone && !dropZone.classList.contains('filled')) {
            const isNumberBlock = this.draggedElement.classList.contains('answer-block');
            if (isNumberBlock && dropZone.classList.contains('equation-slot')) {
                this.placeBlockInSlot(this.draggedElement, dropZone);
            } else {
                this.returnBlock(this.draggedElement);
            }
        } else {
            this.returnBlock(this.draggedElement);
        }

        this.draggedElement = null;
        this.pendingDragBlock = null;
        this.dragStartPoint = null;
        this.suppressClickUntil = this.dragMoved ? Date.now() + 120 : 0;
        this.dragMoved = false;
    }

    getDropZoneUnder(x, y) {
        // Temporarily hide dragged element so we can see what's under it
        const el = this.draggedElement;
        const prevDisplay = el.style.display;
        el.style.display = 'none';

        const elementUnder = document.elementFromPoint(x, y);

        el.style.display = prevDisplay;

        if (!elementUnder) return null;

        return elementUnder.closest('.equation-slot');
    }

    highlightDropZones(active) {
        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
        if (active && !active.classList.contains('filled')) {
            active.classList.add('drop-zone');
        }
    }

    clearDropZoneHighlights() {
        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
    }

    placeBlockInSlot(block, slot) {
        this.saveMove(block, slot);

        // Reset fixed positioning and let it flow into slot
        block.style.position = '';
        block.style.left = '';
        block.style.top = '';
        block.style.zIndex = '';
        block.style.width = '100%';
        block.style.height = '100%';
        block.style.margin = '';

        slot.appendChild(block);
        slot.classList.add('filled');
        block.classList.add('placed');

        this.checkEquationComplete();
        this.updateUndoButtonState();
        this.refreshSlotGlow();
    }

    returnBlock(block) {
        // 1. Reset visual styles that might cause large size or offset
        block.style.position = '';
        block.style.left = '';
        block.style.top = '';
        block.style.zIndex = '';
        block.style.transform = ''; // Clear any transforms
        block.style.width = '';     // Clear inline width
        block.style.height = '';    // Clear inline height
        block.style.margin = '';

        // 2. Remove state classes
        block.classList.remove('placed');
        block.classList.remove('dragging');

        // 3. Determine correct container
        const containerId = block.classList.contains('operation-triangle') ? 'operationBlocks' : 'answerBlocks';
        const container = document.getElementById(containerId);

        // 4. Append to container
        container.appendChild(block);

        // 5. Restore original order based on data-id
        this.sortContainer(container);
        this.refreshSlotGlow();
    }

    // Helper to sort blocks back to their original order
    sortContainer(container) {
        const items = Array.from(container.children);
        items.sort((a, b) => {
            const idA = a.dataset.id || '';
            const idB = b.dataset.id || '';

            // Extract numbers if possible "block-1" -> 1
            const numA = parseInt(idA.split('-')[1]) || 0;
            const numB = parseInt(idB.split('-')[1]) || 0;

            return numA - numB;
        });

        // Re-append in correct order
        items.forEach(item => container.appendChild(item));
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    checkEquationComplete() {
        const slots = document.querySelectorAll('#equationDisplay .equation-slot');
        const allFilled = Array.from(slots).every(s => s.classList.contains('filled'));
        if (allFilled) {
            this.validateEquation();
        }
    }

    validateEquation() {
        const slots = document.querySelectorAll('#equationDisplay .equation-slot');
        const values = Array.from(slots).map(s => {
            const child = s.querySelector('.answer-block, .operation-triangle');
            return child ? child.dataset.value : null;
        });

        let correct = false;
        try {
            correct = this.validateWordUnscramble(values);
        } catch (e) {
            console.error("Validation error", e);
        }

        if (correct) this.handleCorrect();
        else this.handleIncorrect();
    }

    validateWordUnscramble(values) {
        if (!Array.isArray(values) || values.length === 0) return false;
        const hasEmpty = values.some((value) => typeof value !== 'string' || value.length === 0);
        if (hasEmpty) return false;

        const answer = values.join('').toUpperCase();
        const target = (this.currentEquation?.word || '').toUpperCase();
        return answer === target;
    }

    handleCorrect() {
        const pointsEarned = this.calculatePlacedNumberColorPoints();
        const oldScore = this.score;
        const newScore = oldScore + pointsEarned;

        this.score = newScore;

        this.showFeedback(true, 'Correct!', '🎉', {
            scoreGain: {
                oldScore,
                pointsEarned,
                newScore
            }
        });

        this.scheduleNextQuestion(800);
    }

    scheduleNextQuestion(delayMs = 0) {
        if (this.nextQuestionTimeout) {
            clearTimeout(this.nextQuestionTimeout);
            this.nextQuestionTimeout = null;
        }

        this.nextQuestionTimeout = setTimeout(() => {
            this.nextQuestionTimeout = null;
            if (this.gameEnded) return;
            // Fallback sync for score display in case feedback animation is interrupted
            this.updateScoreDisplay();
            this.nextQuestion();
        }, delayMs);
    }

    handleIncorrect() {
        this.showFeedback(false, 'Incorrect! New puzzle incoming...', '❌');
        this.scheduleNextQuestion(820);
    }

    showFeedback(success, msg, icon, options = null) {
        if (this.callbacks.showFeedback) {
            this.callbacks.showFeedback(success ? 'Success' : 'Incorrect', msg, icon, options);
        }
    }

    clearSlotsOnly() {
        this.clearSelectedBlock();
        const slots = document.querySelectorAll('.filled');
        slots.forEach(slot => {
            const block = slot.firstElementChild;
            if (block) this.returnBlock(block);
            slot.classList.remove('filled');
        });
        this.moveHistory = [];
        this.updateUndoButtonState();
    }

    clearAllSlots() {
        this.clearSlotsOnly();
    }

    undoLastMove() {
        if (this.moveHistory.length === 0) return;
        const move = this.moveHistory.pop();
        if (move.block && move.block.parentElement === move.toSlot) {
            this.returnBlock(move.block);
            move.toSlot.classList.remove('filled');
        }
        this.updateUndoButtonState();
        this.refreshSlotGlow();
    }

    saveMove(block, slot) {
        this.moveHistory.push({ block, toSlot: slot });
        if (this.moveHistory.length > 10) this.moveHistory.shift();
    }

    updateUndoButtonState() {
        const btn = document.getElementById('undoMove');
        if (btn) btn.disabled = this.moveHistory.length === 0;
    }

    getCorrectSequence() {
        const eq = this.currentEquation;
        if (!eq || !eq.letters) return [];
        return [...eq.letters];
    }

    showHint() {
        console.log('Hint button clicked');

        if (this.hintsUsed >= this.maxHints) {
            this.showFeedback(false, "No hints left!", "🔒");
            return;
        }

        // Find all slots in DOM order
        const slots = document.querySelectorAll('#equationDisplay .equation-slot');
        console.log('Found slots:', slots.length);

        const correctValues = this.getCorrectSequence();
        console.log('Correct sequence:', correctValues);

        if (correctValues.length === 0) {
            console.warn('No correct sequence found for type:', this.currentEquation.type);
            this.showFeedback(false, "Can't hint this level!", "🤔");
            return;
        }

        let hintedCount = 0;
        const firstEmptySlotIndex = Array.from(slots).findIndex((slot) => !slot.classList.contains('filled'));

        if (firstEmptySlotIndex >= 0 && correctValues[firstEmptySlotIndex] !== undefined) {
            this.flashHintInSlot(slots[firstEmptySlotIndex], correctValues[firstEmptySlotIndex]);
            hintedCount = 1;
        }

        console.log('Hinted count:', hintedCount);

        if (hintedCount > 0) {
            this.hintsUsed++;
            this.updateLimitVisuals();

            if (this.hintsUsed >= this.maxHints) {
                const hintBtn = document.getElementById('getHint');
                if (hintBtn) hintBtn.disabled = true;
            }
        }
    }

    flashHintInSlot(slot, value) {
        console.log('Flashing hint:', value, 'in slot', slot);

        // Remove existing hint if any
        const existing = slot.querySelector('.hint-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'hint-overlay';
        overlay.textContent = value;

        slot.appendChild(overlay);

        // Force reflow
        void overlay.offsetWidth;

        // Remove after animation completes
        setTimeout(() => {
            if (overlay.parentElement) overlay.remove();
        }, 3200);
    }

    skipQuestion() {
        if (this.skipsUsed >= this.maxSkips) {
            this.showFeedback(false, "No skips left!", "🔒");
            return;
        }

        this.skipsUsed++;
        this.updateLimitVisuals();

        if (this.skipsUsed >= this.maxSkips) {
            const skipBtn = document.getElementById('skipQuestion');
            if (skipBtn) skipBtn.disabled = true;
        }

        this.nextQuestion();
    }

    updateLimitVisuals() {
        // Update Hint Stars - Start with all filled, then mark 'used' from right to left (or left to right depending on preference, but usually consume from end)
        // Original request: "only one start will be removed... matches corresponding number"
        // Let's render Total stars. And mark the last N as 'used' or empty.
        // Actually, cleaner visual: Render ALL stars.
        // If 3 total, used 1 => Show 2 filled, 1 empty.
        // Logic: i < (max - used) ? filled : used

        const hintContainer = document.getElementById('hintStars');
        if (hintContainer) {
            hintContainer.innerHTML = '';
            // Render stars equal to Max Count
            for (let i = 0; i < this.maxHints; i++) {
                const star = document.createElement('div');
                // Fill the star if index is less than remaining amount
                // Remaining = maxHints - hintsUsed
                // e.g. Max 3, Used 0 => Remaining 3. i=0,1,2 < 3 (Filled)
                // Used 1 => Remaining 2. i=0,1 < 2 (Filled), i=2 (Used)
                const isRemaining = i < (this.maxHints - this.hintsUsed);

                star.className = `limit-star ${isRemaining ? '' : 'used'}`;
                hintContainer.appendChild(star);
            }
        }

        // Update Skip Stars
        const skipContainer = document.getElementById('skipStars');
        if (skipContainer) {
            skipContainer.innerHTML = '';
            for (let i = 0; i < this.maxSkips; i++) {
                const isRemaining = i < (this.maxSkips - this.skipsUsed);
                const starEl = document.createElement('div');
                starEl.className = `limit-star ${isRemaining ? '' : 'used'}`;
                skipContainer.appendChild(starEl);
            }
        }

        // Update Button States
        const hintBtn = document.getElementById('getHint');
        if (hintBtn) hintBtn.disabled = this.hintsUsed >= this.maxHints;

        const skipBtn = document.getElementById('skipQuestion');
        if (skipBtn) skipBtn.disabled = this.skipsUsed >= this.maxSkips;
    }


    nextQuestion() {
        // Logic to generate next equation
        this.startNewRound();
    }
}
