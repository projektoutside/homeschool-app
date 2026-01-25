/**
 * Math Game Controller
 * Core gameplay logic
 */
class MathGameController {
    constructor(gameState, callbacks = {}) {
        if (!gameState) {
            gameState = { level: 1, timeLimit: 60, score: 0 };
        }
        
        this.gameState = gameState;
        this.callbacks = callbacks;
        this.currentEquation = null;
        this.score = 0;
        
        // Initialize the new professional Math Generator
        this.mathGenerator = new MathGenerator();
        
        this.initTimeLimit();
        
        this.gameTimer = null;
        this.draggedElement = null;
        this.moveHistory = [];
        this.gameEnded = false; 
        
        this.setupGameEventListeners();
        this.updateScoreDisplay();
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

        undoBtn?.addEventListener('click', this.boundUndo);
        clearBtn?.addEventListener('click', this.boundClear);
        hintBtn?.addEventListener('click', this.boundHint);
        skipBtn?.addEventListener('click', this.boundSkip);
        
        this.updateUndoButtonState();
    }

    cleanup() {
        this.stopTimer();
        this.gameEnded = true;
        
        const undoBtn = document.getElementById('undoMove');
        const clearBtn = document.getElementById('clearEquation');
        const hintBtn = document.getElementById('getHint');
        const skipBtn = document.getElementById('skipQuestion');

        undoBtn?.removeEventListener('click', this.boundUndo);
        clearBtn?.removeEventListener('click', this.boundClear);
        hintBtn?.removeEventListener('click', this.boundHint);
        skipBtn?.removeEventListener('click', this.boundSkip);

        this.clearAllSlots();
    }

    updateScoreDisplay() {
        const scoreDisplay = document.getElementById('currentScore');
        if (scoreDisplay) {
            scoreDisplay.textContent = this.score;
        }
    }

    startNewRound() {
        this.stopTimer();
        
        this.moveHistory = [];
        this.gameEnded = false;
        
        this.initTimeLimit();
        
        this.updateUndoButtonState();
        
        const timeDisplay = document.getElementById('timeRemaining');
        if (timeDisplay) {
            timeDisplay.textContent = this.timeRemaining;
        }
        
        this.generateEquation();
        this.createAnswerBlocks();
        setTimeout(() => this.optimizeEquationLayout(), 100);
        
        if (this.timeRemaining > 0) {
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
                
                if (this.timeRemaining <= 10) {
                    timeDisplay.style.color = '#ff6b6b';
                    timeDisplay.style.animation = 'pulse 1s infinite';
                } else {
                    timeDisplay.style.color = '';
                    timeDisplay.style.animation = '';
                }
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
        // Use the professional MathGenerator
        this.currentEquation = this.mathGenerator.generate(this.gameState.level);
    }

    createAnswerBlocks() {
        const container = document.getElementById('answerBlocks');
        if(!container) return;
        container.innerHTML = '';
        
        let answers = [];
        const eq = this.currentEquation;
        
        switch(eq.type) {
            case 'basic_operation': answers = [eq.num1, eq.num2, eq.result]; break;
            case 'comparison': answers = [eq.num1, eq.num2]; break;
            case 'ordering': answers = [...eq.numbers]; break; // Ensure generator provides 'numbers'
            case 'multi_step': answers = eq.steps; break;
            case 'order_operations': answers = [eq.num1, eq.num2, eq.num3, eq.result]; break;
            case 'mixed_operations': answers = [eq.num1, eq.num2, eq.num3, eq.result]; break;
            case 'algebra': answers = [eq.coefficient, eq.constant, eq.result_value, eq.x]; break;
            case 'geometry': answers = eq.shape === 'rectangle' ? [eq.length, eq.width, eq.result] : [eq.radius, eq.result]; break;
            case 'fractions': answers = [eq.num1, eq.num2, eq.resultNum]; break;
            case 'percentage': answers = [eq.whole, eq.percentage, eq.result]; break;
            default: answers = [eq.num1, eq.num2, eq.result];
        }
        
        this.shuffleArray(answers);
        
        answers.forEach((val, idx) => {
            const block = document.createElement('div');
            block.className = 'answer-block';
            block.textContent = val;
            block.dataset.value = val;
            block.dataset.id = `block-${idx}`;
            this.addDragListeners(block);
            container.appendChild(block);
        });
        
        this.updateEquationDisplay();
        this.createOperationBlocks();
    }

    createOperationBlocks() {
        const container = document.getElementById('operationBlocks');
        if(!container) return;
        container.innerHTML = '';
        
        let symbols = [];
        const eq = this.currentEquation;
        
        if(eq.type === 'basic_operation') symbols = [eq.operator, '='];
        else if(eq.type === 'comparison') symbols = [eq.operator];
        else if(eq.type === 'ordering') symbols = [];
        else if(eq.type === 'multi_step') symbols = ['+', '✕', '='];
        else if(eq.type === 'order_operations') symbols = ['+', '✕', '='];
        else if(eq.type === 'mixed_operations') symbols = ['➗', '+', '='];
        else if(eq.type === 'algebra') symbols = ['✕', '+', '='];
        else if(eq.type === 'geometry') symbols = ['✕'];
        else if(eq.type === 'fractions') symbols = ['+', '='];
        else if(eq.type === 'percentage') symbols = [];
        
        if(this.hasEqualsSignInDisplay()) {
            symbols = symbols.filter(s => s !== '=');
        }
        
        this.shuffleArray(symbols);
        
        symbols.forEach((sym, idx) => {
            const tri = document.createElement('div');
            tri.className = 'operation-triangle';
            tri.textContent = sym;
            tri.dataset.value = sym;
            tri.dataset.id = `tri-${idx}`;
            tri.classList.add(this.getOperationClass(sym));
            this.addDragListeners(tri);
            container.appendChild(tri);
        });
    }

    hasEqualsSignInDisplay() {
        const display = document.getElementById('equationDisplay');
        if (!display) return false;
        if (display.innerText.includes('=')) return true;
        const slots = display.querySelectorAll('.filled');
        for (const slot of slots) {
            const el = slot.querySelector('.answer-block, .operation-triangle');
            if (el && el.dataset.value === '=') return true;
        }
        return false;
    }

    getOperationClass(symbol) {
        const map = { '+': 'add-op', '−': 'subtract-op', '✕': 'multiply-op', '➗': 'divide-op', '>': 'comparison-op', '<': 'comparison-op', '=': 'equals-op' };
        return map[symbol] || 'comparison-op';
    }

    updateEquationDisplay() {
        const display = document.getElementById('equationDisplay');
        if(!display) return;
        
        const type = this.currentEquation.type;
        display.innerHTML = '';
        display.setAttribute('data-type', type);

        if (type === 'basic_operation') {
            display.innerHTML = `
                <div class="equation-slot" data-position="0"></div>
                <div class="equation-triangle-slot" data-position="1"></div>
                <div class="equation-slot" data-position="2"></div>
                <div class="equation-triangle-slot" data-position="3"></div>
                <div class="equation-slot" data-position="4"></div>
            `;
        } else if (type === 'geometry') {
             if (this.currentEquation.shape === 'rectangle') {
                 display.innerHTML = `
                    <div class="geometry-label-container"><div class="geometry-label">L:</div><div class="equation-slot" data-position="0"></div></div>
                    <div class="equation-triangle-slot" data-position="1"></div>
                    <div class="geometry-label-container"><div class="geometry-label">W:</div><div class="equation-slot" data-position="2"></div></div>
                    <div class="equation-operator">=</div>
                    <div class="geometry-label-container"><div class="geometry-label">Area:</div><div class="equation-slot" data-position="3"></div></div>
                 `;
             } else {
                 display.innerHTML = `
                    <div class="geometry-label-container"><div class="geometry-label">R:</div><div class="equation-slot" data-position="0"></div></div>
                    <div class="equation-triangle-slot" data-position="1"></div>
                    <div class="equation-operator">R</div>
                    <div class="equation-operator">=</div>
                    <div class="geometry-label-container"><div class="geometry-label">Area:</div><div class="equation-slot" data-position="2"></div></div>
                 `;
             }
        } else if (type === 'fractions') {
            const d = this.currentEquation.den1;
            // Removed the extra division line div to prevent double lines
            const slot = `<div class="fraction-container"><div class="equation-slot fraction-num"></div><div class="fraction-den-label">${d}</div></div>`;
            display.innerHTML = `${slot}<div class="equation-triangle-slot"></div>${slot}<div class="equation-triangle-slot"></div>${slot}`;
        } else if (type === 'comparison') {
            display.innerHTML = `
                <div class="equation-slot" data-position="0"></div>
                <div class="equation-triangle-slot" data-position="1"></div>
                <div class="equation-slot" data-position="2"></div>
            `;
        } else if (type === 'ordering') {
            display.innerHTML = `
                <div class="equation-slot" data-position="0"></div>
                <div class="equation-operator"><</div>
                <div class="equation-slot" data-position="1"></div>
                <div class="equation-operator"><</div>
                <div class="equation-slot" data-position="2"></div>
            `;
        } else {
            // Generic fallback for most types involving 3 slots and operators
            display.innerHTML = `
                <div class="equation-slot" data-position="0"></div>
                <div class="equation-triangle-slot" data-position="1"></div>
                <div class="equation-slot" data-position="2"></div>
            `;
            if (type === 'algebra') {
                display.innerHTML += `
                    <div class="equation-triangle-slot" data-position="3"></div>
                    <div class="equation-slot" data-position="4"></div>
                    <div class="equation-triangle-slot" data-position="5"></div>
                    <div class="equation-slot" data-position="6"></div>
                `;
            } else if (type === 'multi_step') {
                 display.innerHTML = `
                    <div class="equation-operator">(</div>
                    <div class="equation-slot" data-position="0"></div>
                    <div class="equation-triangle-slot" data-position="1"></div>
                    <div class="equation-slot" data-position="2"></div>
                    <div class="equation-operator">)</div>
                    <div class="equation-triangle-slot" data-position="3"></div>
                    <div class="equation-slot" data-position="4"></div>
                    <div class="equation-triangle-slot" data-position="5"></div>
                    <div class="equation-slot" data-position="6"></div>
                `;
            } else if (type === 'mixed_operations') {
                // Ensure 4 number slots for mixed operations
                display.innerHTML = `
                    <div class="equation-slot" data-position="0"></div>
                    <div class="equation-triangle-slot" data-position="1"></div>
                    <div class="equation-slot" data-position="2"></div>
                    <div class="equation-triangle-slot" data-position="3"></div>
                    <div class="equation-slot" data-position="4"></div>
                    <div class="equation-triangle-slot" data-position="5"></div>
                    <div class="equation-slot" data-position="6"></div>
                `;
            } else if (type === 'order_operations') {
                // Ensure correct slots for order of ops
                display.innerHTML = `
                    <div class="equation-slot" data-position="0"></div>
                    <div class="equation-triangle-slot" data-position="1"></div>
                    <div class="equation-slot" data-position="2"></div>
                    <div class="equation-triangle-slot" data-position="3"></div>
                    <div class="equation-slot" data-position="4"></div>
                    <div class="equation-triangle-slot" data-position="5"></div>
                    <div class="equation-slot" data-position="6"></div>
                `;
            }
        }
    }

    optimizeEquationLayout() {
        // Optimized layout adjustment logic here if needed
    }

    addDragListeners(block) {
        block.addEventListener('mousedown', (e) => this.startDrag(e, block));
        block.addEventListener('touchstart', (e) => this.startDrag(e, block), { passive: false });
    }

    startDrag(e, block) {
        e.preventDefault();
        
        // --- KEY FIX: Move block to body IMMEDIATELY ---
        // 1. Calculate current global position
        const rect = block.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // 2. If picking up from a slot, clear the slot's state immediately
        if (block.classList.contains('placed')) {
            const parent = block.parentElement;
            if (parent && (parent.classList.contains('equation-slot') || parent.classList.contains('equation-triangle-slot'))) {
                parent.classList.remove('filled');
            }
            block.classList.remove('placed');
        }
        
        // 3. Reparent to body to escape all container constraints (overflow, transform, etc.)
        // Preserve dimensions visually before moving
        const width = rect.width;
        const height = rect.height;
        
        block.style.width = `${width}px`;
        block.style.height = `${height}px`;
        block.style.position = 'fixed';
        block.style.left = `${rect.left}px`;
        block.style.top = `${rect.top}px`;
        block.style.zIndex = '10000'; // Very high z-index
        block.style.margin = '0';
        
        document.body.appendChild(block);
        
        this.draggedElement = block;
        block.classList.add('dragging');
        
        // 4. Calculate offset relative to the block's new fixed position
        this.dragOffset = { 
            x: clientX - rect.left, 
            y: clientY - rect.top 
        };
        
        this.moveHandler = (ev) => this.dragMove(ev);
        this.upHandler = (ev) => this.endDrag(ev);
        
        document.addEventListener('mousemove', this.moveHandler);
        document.addEventListener('touchmove', this.moveHandler, { passive: false });
        document.addEventListener('mouseup', this.upHandler);
        document.addEventListener('touchend', this.upHandler);
    }

    dragMove(e) {
        if(!this.draggedElement) return;
        e.preventDefault();
        
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        
        const el = this.draggedElement;
        
        // Simply update position - logic is simpler now that it's always fixed on body
        el.style.left = (clientX - this.dragOffset.x) + 'px';
        el.style.top = (clientY - this.dragOffset.y) + 'px';
        
        const dropZone = this.getDropZoneUnder(clientX, clientY);
        this.highlightDropZones(dropZone);
    }

    endDrag(e) {
        if(!this.draggedElement) return;
        
        document.removeEventListener('mousemove', this.moveHandler);
        document.removeEventListener('touchmove', this.moveHandler);
        document.removeEventListener('mouseup', this.upHandler);
        document.removeEventListener('touchend', this.upHandler);
        
        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);
        
        const dropZone = this.getDropZoneUnder(clientX, clientY);
        
        // Remove fixed positioning temporary styles before placing or returning
        // The methods placeBlockInSlot/returnBlock will reset styles appropriately
        this.draggedElement.classList.remove('dragging');
        this.clearDropZoneHighlights();
        
        if(dropZone && !dropZone.classList.contains('filled')) {
            const isTriangle = this.draggedElement.classList.contains('operation-triangle');
            const isTriangleSlot = dropZone.classList.contains('equation-triangle-slot');
            
            // Allow placing triangles in triangle slots AND number blocks in number slots
            const isNumberBlock = this.draggedElement.classList.contains('answer-block');
            const isNumberSlot = dropZone.classList.contains('equation-slot');
            
            if ((isTriangle && isTriangleSlot) || (isNumberBlock && isNumberSlot)) {
                this.placeBlockInSlot(this.draggedElement, dropZone);
            } else {
                this.returnBlock(this.draggedElement);
            }
        } else {
            this.returnBlock(this.draggedElement);
        }
        
        this.draggedElement = null;
    }

    getDropZoneUnder(x, y) {
        // Temporarily hide dragged element so we can see what's under it
        const el = this.draggedElement;
        const prevDisplay = el.style.display;
        el.style.display = 'none';
        
        const elementUnder = document.elementFromPoint(x, y);
        
        el.style.display = prevDisplay;
        
        if (!elementUnder) return null;
        
        return elementUnder.closest('.equation-slot, .equation-triangle-slot');
    }

    highlightDropZones(active) {
        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
        if(active && !active.classList.contains('filled')) {
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
        for(let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i+1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    checkEquationComplete() {
        const slots = document.querySelectorAll('#equationDisplay .equation-slot, #equationDisplay .equation-triangle-slot');
        const allFilled = Array.from(slots).every(s => s.classList.contains('filled'));
        if(allFilled) {
            this.validateEquation();
        }
    }

    validateEquation() {
        const slots = document.querySelectorAll('#equationDisplay .equation-slot, #equationDisplay .equation-triangle-slot');
        const values = Array.from(slots).map(s => {
            const child = s.querySelector('.answer-block, .operation-triangle');
            return child ? child.dataset.value : null;
        });

        let correct = false;
        try {
            const eqType = this.currentEquation.type;
            if (eqType === 'basic_operation') {
                 correct = this.validateBasicOperation(values);
            } else if (eqType === 'comparison') {
                 correct = this.validateComparison(values);
            } else if (eqType === 'ordering') {
                 correct = this.validateOrdering(values);
            } else if (eqType === 'fractions') {
                 correct = this.validateFractions(values);
            } else if (eqType === 'percentage') {
                 correct = this.validatePercentage(values);
            } else if (eqType === 'algebra') {
                 correct = this.validateAlgebra(values);
            } else if (eqType === 'geometry') {
                 correct = this.validateGeometry(values);
            } else if (eqType === 'multi_step' || eqType === 'order_operations' || eqType === 'mixed_operations') {
                 correct = this.validateMultiStep(values);
            } else {
                 correct = true; 
            }
        } catch (e) {
            console.error("Validation error", e);
        }

        if(correct) this.handleCorrect();
        else this.handleIncorrect();
    }
    
    validateBasicOperation(values) {
        const [n1, op, n2, eq, res] = values;
        if(eq !== '=') return false;
        const v1 = parseFloat(n1), v2 = parseFloat(n2), vr = parseFloat(res);
        if(op === '+') return Math.abs(v1+v2 - vr) < 0.001;
        if(op === '−') return Math.abs(v1-v2 - vr) < 0.001;
        if(op === '✕') return Math.abs(v1*v2 - vr) < 0.001;
        if(op === '➗') return Math.abs(v1/v2 - vr) < 0.001;
        return false;
    }

    validateComparison(values) {
        const [n1, op, n2] = values;
        const v1 = parseFloat(n1), v2 = parseFloat(n2);
        if (op === '>') return v1 > v2;
        if (op === '<') return v1 < v2;
        if (op === '=') return Math.abs(v1 - v2) < 0.001;
        return false;
    }

    validateOrdering(values) {
        // Expected: num1 < num2 < num3
        // We only check the numbers since the operators are fixed labels in UI update I made?
        // Wait, updateEquationDisplay uses fixed operators for ordering?
        // Yes: <div class="equation-operator"><</div>
        // So values only contain numbers
        // Actually, validateEquation collects ALL slots. 
        // My updateEquationDisplay for ordering: 
        // slot, operator(<), slot, operator(<), slot.
        // The operators are static HTML elements, not slots.
        // So values array will only contain the NUMBERS from the slots.
        
        // values = [num1, num2, num3]
        if (values.length < 3) return false;
        const [n1, n2, n3] = values.map(parseFloat);
        return n1 < n2 && n2 < n3;
    }

    validateFractions(values) {
        // Structure: num1, op, num2, eq, resultNum
        const [n1, op, n2, eq, res] = values;
        if(eq !== '=') return false;
        const v1 = parseFloat(n1), v2 = parseFloat(n2), vr = parseFloat(res);
        
        if (op === '+') return (v1 + v2) === vr;
        return false;
    }

    validatePercentage(values) {
        // [whole, p, eq, result] based on creating blocks order?
        // createAnswerBlocks order: [whole, percentage, result]
        // Display: slot(whole) % of slot(percentage) = slot(result)?
        // updateEquationDisplay for percentage:
        // slot(0), op(% of), slot(1), op(=), slot(2)
        // Wait, "20% of 50" -> 20 is percentage, 50 is whole.
        // Display logic: `P% of W`
        // So slot 0 is P, slot 1 is W.
        // Values: [P, W, Res]
        
        // However, looking at createAnswerBlocks for percentage:
        // answers = [eq.whole, eq.percentage, eq.result] -> shuffled.
        // user places them.
        
        // We need to validate: (P / 100) * W == Res
        const [p, w, res] = values.map(parseFloat);
        return Math.abs((p / 100) * w - res) < 0.001;
    }

    validateMultiStep(values) {
        // Used for hard/mixed levels.
        // We need to evaluate the expression formed by the blocks.
        // Since we know the structure from updateEquationDisplay, we can check.
        // But simpler: just check if the result matches the intended result?
        // No, user might swap a and b in addition (a+b vs b+a).
        // Best approach: Parse and evaluate.
        // Simplified: The intended numbers are specific.
        // Let's rely on checking against expected values if possible, 
        // OR evaluate the expression constructed by the user.
        
        // Let's use a simple evaluator for the sequence of values
        // values array contains numbers and operators in order.
        // e.g. [a, +, b, x, c, =, res]
        
        // Filter out '=' and everything after
        const equalsIndex = values.indexOf('=');
        if (equalsIndex === -1) return false;
        
        const expressionParts = values.slice(0, equalsIndex);
        const userResult = parseFloat(values[values.length - 1]);
        
        // Basic parser for arithmetic
        // Convert symbols to JS math
        const jsExpression = expressionParts.map(p => {
            if(p === '✕') return '*';
            if(p === '➗') return '/';
            if(p === '−') return '-';
            return p;
        }).join(' ');
        
        try {
            // Note: eval is dangerous in general web, but here inputs are strictly controlled blocks.
            // We can calculate it.
            // Function constructor is slightly safer than direct eval
            const calculated = new Function(`return ${jsExpression}`)();
            return Math.abs(calculated - userResult) < 0.001;
        } catch(e) {
            return false;
        }
    }

    validateAlgebra(values) {
        // Expected structure: [a] [✕] [x] [+] [b] [=] [c]
        // Indices: 0, 2, 4, 6 are numbers. 1, 3, 5 are operators.
        
        const v0 = parseFloat(values[0]); // Coefficient or x
        const v2 = parseFloat(values[2]); // x or Coefficient
        const v4 = parseFloat(values[4]); // Constant
        const v6 = parseFloat(values[6]); // Result
        
        // Check basic structure: (Slot0 * Slot2) + Slot4 = Slot6
        // This covers a*x + b = c and x*a + b = c
        return Math.abs((v0 * v2) + v4 - v6) < 0.001;
    }

    validateGeometry(values) {
        // Rectangle: [L] [op] [W] [=] [Area]
        // Circle: [R] [op] [R] [=] [Area] (Approximated)
        
        // Filter out non-numbers/ops
        const numeric = values.filter(v => !isNaN(parseFloat(v)) && v !== '=').map(parseFloat);
        // Expect 3 numbers: dim1, dim2, area.
        if(numeric.length < 3) return false;
        
        const [d1, d2, area] = numeric;
        
        // Check if d1 * d2 approx area (for rect)
        // For circle: d1(R) * d2(R) * 3.14 approx area?
        // My generator uses integer rounding.
        
        if (this.currentEquation.shape === 'circle') {
             // We provided R and Area. 
             // We need R * R * 3.14 approx Area.
             // But user just provides R and Area?
             // createAnswerBlocks provided: [radius, result] (2 blocks).
             // My display has 2 slots?
             // Geometry display:
             // Radius: [Slot]
             // Area: [Slot]
             // So 2 numbers.
             const [r, a] = numeric;
             return Math.abs(r * r * 3.14 - a) < 1.0; // Allow rounding diff
        } else {
             // Rectangle: L, W, Area. 3 blocks.
             // L * W = Area
             return Math.abs(d1 * d2 - area) < 0.001;
        }
    }

    handleCorrect() {
        this.score += 100 * this.gameState.level;
        this.updateScoreDisplay();
        this.showFeedback(true, 'Correct!', '🎉');
        setTimeout(() => this.nextQuestion(), 800);
    }

    handleIncorrect() {
        this.showFeedback(false, 'Try again!', '🤔');
        setTimeout(() => this.clearSlotsOnly(), 800);
    }

    showFeedback(success, msg, icon) {
        if(this.callbacks.showFeedback) {
            this.callbacks.showFeedback(success ? 'Success' : 'Incorrect', msg, icon);
        }
    }

    nextQuestion() {
        if(this.gameEnded) return;
        this.clearAllSlots();
        this.generateEquation();
        this.createAnswerBlocks();
    }

    clearSlotsOnly() {
        const slots = document.querySelectorAll('.filled');
        slots.forEach(slot => {
            const block = slot.firstElementChild;
            if(block) this.returnBlock(block);
            slot.classList.remove('filled');
        });
        this.moveHistory = [];
        this.updateUndoButtonState();
    }

    clearAllSlots() {
        this.clearSlotsOnly();
    }

    undoLastMove() {
        if(this.moveHistory.length === 0) return;
        const move = this.moveHistory.pop();
        if(move.block && move.block.parentElement === move.toSlot) {
            this.returnBlock(move.block);
            move.toSlot.classList.remove('filled');
        }
        this.updateUndoButtonState();
    }

    saveMove(block, slot) {
        this.moveHistory.push({ block, toSlot: slot });
        if(this.moveHistory.length > 10) this.moveHistory.shift();
    }

    updateUndoButtonState() {
        const btn = document.getElementById('undoMove');
        if(btn) btn.disabled = this.moveHistory.length === 0;
    }
    
    showHint() {
        this.showFeedback(true, "Here's a hint!", "💡");
    }
    
    skipQuestion() {
        this.nextQuestion();
    }
}
