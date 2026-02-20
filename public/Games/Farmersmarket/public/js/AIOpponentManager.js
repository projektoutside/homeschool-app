// Farmers Market Frenzy 3D - AI Opponent Manager
class AIOpponentManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // AI Performance Metrics
        this.customersServed = 0;
        this.totalEarnings = 0;
        this.averageRating = 0;
        this.totalRatings = 0;
        this.currentStreak = 0;
        this.perfectSales = 0;
        
        // AI Behavior Settings
        this.difficulty = 'medium';
        this.reactionTime = 1500; // Base reaction time in ms
        this.accuracyRate = 0.85; // 85% accuracy rate
        this.speedMultiplier = 1.0;
        
        // AI State
        this.isActive = false;
        this.currentCustomer = null;
        this.processingOrder = false;
        this.calculationTimer = null;
        this.paymentTimer = null;
        this.retryTimer = null;

        // Pause/resume state (used for orientation lock + manual pause)
        this.isPaused = false;
        this.activeTimerPhase = null;
        this.activeTimerStartedAt = 0;
        this.activeTimerDuration = 0;
        this.pausedTimerPhase = null;
        this.pausedTimerRemaining = 0;
        
        // Performance tracking
        this.startTime = null;
        this.lastCustomerTime = null;
        
        // Visual elements
        this.domElements = {};
        
        // New properties
        this.patienceInterval = null;   // Interval for visual patience/progress bar
        this.aiPatienceStart = 0;
        this.aiPatienceDuration = 0;
        
        console.log('AI Opponent Manager initialized');
    }
    
    init() {
        try {
            console.log('🤖 Initializing AIOpponentManager...');
            this.cacheDOM();
            this.validateDOMElements();
            this.setupAIDifficulty();
            console.log('✅ AIOpponentManager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ AIOpponentManager initialization failed:', error);
            return false;
        }
    }
    
    validateDOMElements() {
        // Extra validation for critical elements
        const criticalElements = ['aiProgressFill', 'aiProgressBar'];
        const missingCritical = [];
        
        criticalElements.forEach(key => {
            if (!this.domElements[key]) {
                missingCritical.push(key);
                console.warn(`🤖 Critical element missing: ${key}`);
                
                // Try to find it manually
                if (key === 'aiProgressFill') {
                    this.domElements[key] = document.querySelector('#aiProgressBar .ai-progress-fill');
                    if (this.domElements[key]) {
                        console.log(`🤖 ✅ Found ${key} element manually`);
                    }
                }
            }
        });
        
        if (missingCritical.length > 0 && !this.domElements.aiProgressFill) {
            console.error(`🤖 ❌ Missing critical DOM elements: ${missingCritical.join(', ')}`);
            console.log('🤖 This may cause AI patience bar issues');
        }
    }
    
    cacheDOM() {
        this.domElements = {
            // AI Stats Display
            aiCustomersServed: document.getElementById('aiCustomersServed'),
            aiTotalEarnings: document.getElementById('aiTotalEarnings'),
            aiAverageRating: document.getElementById('aiAverageRating'),
            aiCurrentStreak: document.getElementById('aiCurrentStreak'),
            
            // AI Visual Indicators
            aiStatusIndicator: document.getElementById('aiStatusIndicator'),
            aiProgressBar: document.getElementById('aiProgressBar'),
            aiProgressFill: document.querySelector('#aiProgressBar .ai-progress-fill'),
            aiThinkingAnimation: document.getElementById('aiThinkingAnimation'),
            
            // AI Customer Panel
            aiCustomerPanel: document.getElementById('aiCustomerPanel'),
            aiCustomerName: document.getElementById('aiCustomerName'),
            aiCustomerAvatar: document.getElementById('aiCustomerAvatar'),
            aiCustomerPatienceBar: document.getElementById('aiCustomerPatienceBar'),
            aiCustomerPatienceFill: document.getElementById('aiCustomerPatienceFill'),
            aiCustomerPatiencePercentage: document.getElementById('aiCustomerPatiencePercentage'),
            aiOrderItems: document.getElementById('aiOrderItems'),
            aiOrderTotal: document.getElementById('aiOrderTotal'),
            
            // AI Panel Header
            aiPanelTitle: document.getElementById('aiPanelTitle')
        };
        
        // Log missing elements for debugging but don't fail initialization
        const missingElements = [];
        Object.keys(this.domElements).forEach(key => {
            if (!this.domElements[key]) {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn(`AIOpponentManager: Missing DOM elements: ${missingElements.join(', ')}`);
        }
    }
    
    setupAIDifficulty() {
        const difficulties = {
            easy: {
                reactionTime: 6000,         // 6 s base thinking time – slower pace
                accuracyRate: 0.55,
                speedMultiplier: 0.35,      // 35 % speed – even slower handling
                description: "8-year-old learning the ropes"
            },
            medium: {
                reactionTime: 4500,         // 4.5 s – teenage processing speed
                accuracyRate: 0.78,
                speedMultiplier: 0.55,      // 55% speed – decent handling
                description: "14-year-old with some experience"
            },
            hard: {
                reactionTime: 3000,         // 3 s – adult-level quick thinking
                accuracyRate: 0.92,
                speedMultiplier: 0.70,      // 70% speed – skilled handling
                description: "18-year-old math whiz"
            }
        };

        // Character-specific variations
        const characterModifiers = {
            'abby': { 
                reactionTime: 6000, 
                accuracyRate: 0.50, 
                speedMultiplier: 0.40,
                description: "7-year-old just starting out (now a touch quicker)"
            },
            'chase': { 
                reactionTime: 4000, 
                accuracyRate: 0.75, 
                speedMultiplier: 0.60,
                description: "15-year-old getting confident"
            },
            'becky': { 
                reactionTime: 2500, 
                accuracyRate: 0.95, 
                speedMultiplier: 0.75,
                description: "20-year-old business pro"
            },
            'diego': { 
                reactionTime: 5500, 
                accuracyRate: 0.45, 
                speedMultiplier: 0.45,
                description: "9-year-old eager explorer (rushes and makes errors)"
            },
            'luna': { 
                reactionTime: 4200, 
                accuracyRate: 0.70, 
                speedMultiplier: 0.65,
                description: "16-year-old space cadet (zones out sometimes)"
            },
            'max': { 
                reactionTime: 2200, 
                accuracyRate: 0.90, 
                speedMultiplier: 0.85,
                description: "19-year-old competitive code master"
            },
            'bill': { 
                reactionTime: 2800, 
                accuracyRate: 0.25, 
                speedMultiplier: 0.80,
                description: "35-year-old party animal (fast but makes wild errors)"
            },
            'stacy': { 
                reactionTime: 5500, 
                accuracyRate: 0.75, 
                speedMultiplier: 0.45,
                description: "22-year-old fashionista (a bit faster but still accurate)"
            }
        };

        // Apply character-specific modifiers if available; otherwise use difficulty presets
        if (this.selectedCharacter && characterModifiers[this.selectedCharacter.toLowerCase()]) {
            this.aiSettings = { ...characterModifiers[this.selectedCharacter.toLowerCase()] };
            console.log(`🎯 Using character-specific settings for ${this.selectedCharacter}`);
        } else {
            this.aiSettings = { ...difficulties[this.difficulty] };
            console.log(`🎯 Using generic difficulty settings for ${this.difficulty}`);
        }

        // Sync core behaviour variables so the rest of the class uses the updated numbers
        this.reactionTime   = this.aiSettings.reactionTime;
        this.accuracyRate   = this.aiSettings.accuracyRate;
        this.speedMultiplier = this.aiSettings.speedMultiplier;

        console.log(`🤖 AI Setup: ${this.selectedCharacter || 'generic'} - ${this.aiSettings.description}`);
        console.log(`• ReactionTime: ${this.reactionTime}ms  • Accuracy: ${(this.accuracyRate * 100).toFixed(0)}%  • SpeedMultiplier: ${(this.speedMultiplier * 100).toFixed(0)}%`);
    }
    
    getAgeDescription() {
        const ageMap = {
            easy: '8-year-old level',
            medium: '14-year-old level', 
            hard: '20-year-old level'
        };
        return ageMap[this.difficulty] || 'unknown level';
    }
    
    startCompetition() {
        console.log('🏁 Starting AI competition...');
        
        // Ensure clean state for new competition
        this.clearTimers();
        this.stopAIPatienceBar();
        
        // Reset any current customer
        if (this.currentCustomer) {
            console.log('🗑️ Clearing current customer before competition start');
            this.resetAICustomer();
        }
        
        this.isActive = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.processingOrder = false;
        this.currentMistakes = 0;
        this.pausedTimerPhase = null;
        this.pausedTimerRemaining = 0;
        this.clearActiveTimerMeta();
        
        // Reset stats but keep character info
        this.resetStats();
        this.updateAIDisplay();
        
        // Reset status indicator
        this.updateAIStatus('😴 Ready for customers...', 'ready');
        
        // Don't spawn immediately - wait for synchronized spawning
        console.log('✅ AI competition started - waiting for synchronized customer spawning');
    }
    
    stopCompetition() {
        this.isActive = false;
        this.isPaused = false;
        this.pausedTimerPhase = null;
        this.pausedTimerRemaining = 0;
        this.clearTimers();
        this.stopAIPatienceBar();
        
        console.log('AI competition stopped');
    }

    setActiveTimerMeta(phase, durationMs) {
        this.activeTimerPhase = phase;
        this.activeTimerStartedAt = Date.now();
        this.activeTimerDuration = Math.max(0, durationMs || 0);
    }

    clearActiveTimerMeta() {
        this.activeTimerPhase = null;
        this.activeTimerStartedAt = 0;
        this.activeTimerDuration = 0;
    }

    pauseCompetition() {
        if (!this.isActive || this.isPaused) return;

        this.isPaused = true;

        if (this.processingOrder && this.currentCustomer) {
            const elapsed = this.activeTimerStartedAt ? (Date.now() - this.activeTimerStartedAt) : 0;
            const remaining = this.activeTimerDuration > 0
                ? Math.max(250, this.activeTimerDuration - elapsed)
                : 0;

            this.pausedTimerPhase = this.activeTimerPhase || 'calculation';
            this.pausedTimerRemaining = remaining;
        } else {
            this.pausedTimerPhase = null;
            this.pausedTimerRemaining = 0;
        }

        this.clearTimers();
        this.stopAIPatienceBar();
        this.updateAIStatus('⏸️ Paused', 'paused');
    }

    resumeCompetition() {
        if (!this.isActive || !this.isPaused) return;

        this.isPaused = false;

        // If there is no active customer/order, just return to ready state
        if (!this.currentCustomer || !this.processingOrder) {
            this.pausedTimerPhase = null;
            this.pausedTimerRemaining = 0;
            this.updateAIStatus('😴 Ready for customers...', 'ready');
            return;
        }

        // Restart visual patience bar for resumed processing
        const patienceDuration = this.currentCustomer?.patience || 30000;
        this.startAIPatienceBar(patienceDuration);

        const phase = this.pausedTimerPhase || 'calculation';
        const fallbackDuration = phase === 'payment'
            ? this.getAIPaymentTime()
            : (phase === 'retry' ? (this.retryDelay || 1000) : this.getAICalculationTime());
        const resumeDelay = Math.max(250, this.pausedTimerRemaining || fallbackDuration);

        if (phase === 'payment') {
            this.showAIPaymentProcessing();
            this.setActiveTimerMeta('payment', resumeDelay);
            this.paymentTimer = setTimeout(() => {
                this.paymentTimer = null;
                this.clearActiveTimerMeta();
                this.completeAITransaction();
            }, resumeDelay);
        } else if (phase === 'retry') {
            this.showAIError();
            this.scheduleRetryCalculation(resumeDelay);
        } else {
            this.showAIThinking();
            this.setActiveTimerMeta('calculation', resumeDelay);
            this.calculationTimer = setTimeout(() => {
                this.calculationTimer = null;
                this.clearActiveTimerMeta();
                this.completeAICalculation();
            }, resumeDelay);
        }

        this.pausedTimerPhase = null;
        this.pausedTimerRemaining = 0;
    }
    
    resetStats() {
        this.customersServed = 0;
        this.totalEarnings = 0;
        this.averageRating = 0;
        this.totalRatings = 0;
        this.currentStreak = 0;
        this.perfectSales = 0;
    }
    
    spawnAICustomer() {
        if (!this.isActive || this.isPaused || this.processingOrder) {
            console.log('🚫 Cannot spawn AI customer:', {
                isActive: this.isActive,
                isPaused: this.isPaused,
                processingOrder: this.processingOrder
            });
            return false;
        }
        
        console.log(`🤖 Spawning AI customer for ${this.characterName || 'unknown'} (${this.difficulty} difficulty)...`);
        
        // Get next customer from AI line instead of creating new one
        let customer3D = null;
        if (this.gameManager && this.gameManager.sceneManager && typeof this.gameManager.sceneManager.getNextAICustomer === 'function') {
            customer3D = this.gameManager.sceneManager.getNextAICustomer();
        }
        
        if (!customer3D) {
            console.warn('No customer available in AI line');
            return false;
        }
        
        // Generate AI customer data
        this.currentCustomer = this.generateAICustomer();
        this.currentCustomer.customer3D = customer3D; // Use the 3D model from the line
        this.displayAICustomer();
        
        // Move the customer from line to counter position
        if (this.gameManager && this.gameManager.sceneManager && typeof this.gameManager.sceneManager.animateCustomerToCounter === 'function') {
            this.gameManager.sceneManager.animateCustomerToCounter(customer3D, true); // true = AI customer
        }
        
        // Start AI processing with realistic timing
        this.startAIProcessing();
        
        console.log(`✅ AI customer "${this.currentCustomer.name}" moved to counter successfully`);
        
        // Notify GameManager that an AI customer was spawned for timer synchronization
        if (this.gameManager && typeof this.gameManager.onCustomerSpawned === 'function') {
            this.gameManager.onCustomerSpawned(true); // true = AI customer
        }
        
        return true;
    }
    
    // Check if AI can accept a new customer
    canSpawnCustomer() {
        // Check if there are customers available in the AI line
        let customerAvailable = false;
        if (this.gameManager && this.gameManager.sceneManager && typeof this.gameManager.sceneManager.getNextAICustomer === 'function') {
            const nextCustomer = this.gameManager.sceneManager.getNextAICustomer();
            customerAvailable = nextCustomer !== null;
        }
        
        const canSpawn = this.isActive && !this.isPaused && !this.processingOrder && !this.currentCustomer && customerAvailable;
        
        if (!canSpawn) {
            console.log('🚫 Cannot spawn AI customer:', {
                isActive: this.isActive,
                isPaused: this.isPaused,
                processingOrder: this.processingOrder,
                currentCustomer: !!this.currentCustomer,
                customerAvailable: customerAvailable
            });
        } else {
            console.log('✅ Can spawn AI customer - all conditions met');
        }
        
        return canSpawn;
    }
    
    generateAICustomer() {
        // Use same customer generation as player but for AI
        const customer = GameConfig.getRandomCustomer();
        const order = this.generateAIOrder();
        const consolidatedOrder = this.consolidateOrder(order);
        
        // Select random personality and patience using shared logic
        const { personality, patience } = this.getRandomPersonalityData();
        
        return {
            ...customer,
            order: order,
            consolidatedOrder: consolidatedOrder,
            orderTotal: this.calculateOrderTotal(order),
            arrivalTime: Date.now(),
            difficulty: this.difficulty,
            patience: patience, // milliseconds
            personality: personality
        };
    }
    
    generateAIOrder() {
        // Generate realistic orders using GameConfig's generateOrder method
        const order = GameConfig.generateOrder();
        
        // IMPORTANT: Always use the game's global pricing difficulty, NOT the AI's behavioral difficulty
        // The AI character difficulty (this.difficulty) affects behavior speed/accuracy only
        // Pricing should always match the player's selected difficulty
        if (this.gameManager && this.gameManager.getDifficulty) {
            const gamePricingDifficulty = this.gameManager.getDifficulty();
            console.log(`🤖 AI using game's pricing difficulty: ${gamePricingDifficulty} (AI behavior: ${this.difficulty})`);
            
            order.forEach(item => {
                // Ensure we have both basePrice and price properties
                if (!item.basePrice && item.price) {
                    item.basePrice = item.price;
                }
                if (!item.price && item.basePrice) {
                    item.price = item.basePrice;
                }
                
                // CRITICAL: Use game's pricing difficulty, not AI's behavioral difficulty
                item.price = GameConfig.adjustPriceForDifficulty(item.basePrice || item.price || 0, gamePricingDifficulty);
                console.log(`   ${item.name}: $${(item.basePrice || 0).toFixed(2)} → $${item.price.toFixed(2)} (${gamePricingDifficulty} pricing)`);
            });
        } else {
            // Fallback: ensure all items have a price property
            console.warn('⚠️ GameManager.getDifficulty() not available, using base prices');
            order.forEach(item => {
                if (!item.price) {
                    item.price = item.basePrice || 0;
                }
            });
        }
        
        return order;
    }
    
    calculateOrderTotal(order) {
        return GameConfig.calculateOrderTotal(order);
    }

    consolidateOrder(order) {
        if (!Array.isArray(order)) return [];

        const consolidated = {};
        order.forEach(item => {
            if (!item) return;

            const key = `${item.name || 'Unknown Item'}_${item.price || item.basePrice || 0}`;
            if (consolidated[key]) {
                consolidated[key].quantity += item.quantity || 0;
            } else {
                consolidated[key] = { ...item };
            }
        });

        return Object.values(consolidated);
    }
    
    displayAICustomer() {
        if (!this.currentCustomer) return;
        
        // Update AI customer display
        if (this.domElements.aiCustomerName) {
            this.domElements.aiCustomerName.textContent = this.currentCustomer.name;
        }
        
        if (this.domElements.aiCustomerAvatar) {
            const emoji = this.getPatienceEmoji(this.currentCustomer.personality?.name);
            this.domElements.aiCustomerAvatar.textContent = emoji;
        }

        // Initialize visible customer patience meter at full.
        this.setAIPatienceVisual(100);
        
        // Display order items
        this.displayAIOrder();
        
        // Show AI customer panel
        if (this.domElements.aiCustomerPanel) {
            this.domElements.aiCustomerPanel.classList.add('active');
        }
    }
    
    displayAIOrder() {
        if (!this.domElements.aiOrderItems || !this.currentCustomer || !this.currentCustomer.order) {
            console.warn('displayAIOrder: Missing required elements or data');
            return;
        }
        
        const maxOrderSlots = Math.max(1, parseInt(GameConfig.GAME_SETTINGS.ORDER_MAX_ITEMS, 10) || 6);
        const allOrderItems = this.currentCustomer.consolidatedOrder || this.currentCustomer.order || [];
        const visibleOrderItems = allOrderItems.slice(0, maxOrderSlots);

        if (allOrderItems.length > maxOrderSlots) {
            console.warn(`displayAIOrder: order has ${allOrderItems.length} items, truncating to ${maxOrderSlots}`);
        }

        this.domElements.aiOrderItems.innerHTML = '';
        
        for (let slotIndex = 0; slotIndex < maxOrderSlots; slotIndex++) {
            const orderItem = document.createElement('div');
            orderItem.className = 'ai-order-item';
            const item = visibleOrderItems[slotIndex];

            if (item) {
                orderItem.innerHTML = `
                    <span class="item-emoji">${item.emoji || '❓'}</span>
                    <span class="item-name">${item.name || 'Unknown Item'}</span>
                    <span class="item-meta">
                        <span class="item-quantity">×${Math.max(0, parseInt(item.quantity, 10) || 0)}</span>
                        <span class="item-price">${GameConfig.formatMoney(item.price || item.basePrice || 0)}</span>
                    </span>
                `;
            } else {
                orderItem.classList.add('is-empty');
                orderItem.setAttribute('aria-hidden', 'true');
            }

            this.domElements.aiOrderItems.appendChild(orderItem);
        }
    }

    renderAIOrderTotal(total = 0) {
        if (!this.domElements.aiOrderTotal) return;
        this.domElements.aiOrderTotal.innerHTML = `<strong>Total: ${GameConfig.formatMoney(total)}</strong>`;
    }
    
    startAIProcessing() {
        if (!this.currentCustomer || this.isPaused) return;
        
        this.processingOrder = true;
        this.currentMistakes = 0;
        this.showAIThinking();
        
        // AI calculation phase
        const calculationTime = this.getAICalculationTime();
        console.log(`🤖 AI calculation time: ${calculationTime}ms`);
        
        // Start patience bar based on customer-specific patience value
        const patienceDuration = this.currentCustomer?.patience || 30000;
        console.log(`🤖 Starting AI patience bar for ${this.characterName} with duration: ${patienceDuration}ms`);
        this.startAIPatienceBar(patienceDuration);
        
        // Ensure timer actually gets set
        if (this.calculationTimer) {
            clearTimeout(this.calculationTimer);
        }
        this.setActiveTimerMeta('calculation', calculationTime);
        
        this.calculationTimer = setTimeout(() => {
            this.calculationTimer = null;
            this.clearActiveTimerMeta();
            console.log(`🤖 AI calculation timer fired after ${calculationTime}ms`);
            this.completeAICalculation();
        }, calculationTime);
        
        console.log(`🤖 AI calculation timer set for ${calculationTime}ms`);
    }
    
    getAICalculationTime() {
        // Age-appropriate calculation time based on difficulty
        const baseTime = this.reactionTime;
        const variation = Math.random() * (this.difficulty === 'easy' ? 2000 : 1000); // Young kids have more variation
        
        // Order complexity affects different ages differently
        let complexityBonus = 0;
        if (this.currentCustomer && this.currentCustomer.order) {
            const orderLength = this.currentCustomer.order.length;
            if (this.difficulty === 'easy') {
                // 8-year-olds struggle more with multiple items
                complexityBonus = orderLength * 800; // Much longer per item
            } else if (this.difficulty === 'medium') {
                // 14-year-olds handle complexity better but still need time
                complexityBonus = orderLength * 400; // Moderate time per item
            } else {
                // 20-year-olds handle complexity efficiently
                complexityBonus = orderLength * 150; // Quick per item
            }
        }
        
        return (baseTime + variation + complexityBonus) * (1 / this.speedMultiplier);
    }
    
    completeAICalculation() {
        if (this.isPaused) {
            console.log('🤖 ⏸️ Calculation completion skipped while paused');
            return;
        }

        if (!this.currentCustomer) {
            console.log('🤖 ❌ completeAICalculation: No current customer');
            return;
        }
        
        console.log('🤖 ✅ AI completing calculation...');
        
        const isCorrect = Math.random() < this.accuracyRate;
        console.log(`🤖 AI calculation result: ${isCorrect ? 'correct' : 'incorrect'} (accuracy rate: ${this.accuracyRate})`);
        
        if (isCorrect) {
            this.showAISuccess();
            this.processAIPayment();
        } else {
            // Track mistake for star rating calculations
            this.currentMistakes = (this.currentMistakes || 0) + 1;
            console.log(`🤖 AI made mistake #${this.currentMistakes}`);
            this.showAIError();
            
            // Age-appropriate retry delay - younger kids need more time to think
            const retryTime = this.retryDelay || 1000;
            console.log(`🤖 AI will retry in ${retryTime}ms`);
            this.scheduleRetryCalculation(retryTime);
        }
    }

    scheduleRetryCalculation(delayMs) {
        const retryDelay = Math.max(250, delayMs || 1000);

        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }

        this.setActiveTimerMeta('retry', retryDelay);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.clearActiveTimerMeta();
            this.runRetryCalculation();
        }, retryDelay);
    }

    runRetryCalculation() {
        if (this.isPaused) {
            console.log('🤖 ⏸️ Retry skipped while paused');
            return;
        }

        if (!this.currentCustomer) {
            console.log('🤖 ❌ No customer during retry - aborting');
            return;
        }

        console.log('🤖 AI retrying calculation...');

        // Younger kids might make the same mistake again
        if (this.difficulty === 'easy' && Math.random() < 0.3) {
            // 30% chance to make the same mistake again (like an 8-year-old)
            console.log('🤖 AI (easy mode) making same mistake again');
            this.completeAICalculation();
            return;
        }

        // Usually get it right on retry (or at least improve odds)
        const improvedAccuracy = Math.min(0.95, this.accuracyRate + 0.2);
        const retryCorrect = Math.random() < improvedAccuracy;

        console.log(`🤖 AI retry with improved accuracy: ${improvedAccuracy} -> ${retryCorrect ? 'correct' : 'incorrect'}`);

        if (retryCorrect) {
            this.showAISuccess();
            this.processAIPayment();
        } else {
            // Try once more if still wrong
            console.log('🤖 AI still incorrect, trying once more');
            this.completeAICalculation();
        }
    }
    
    processAIPayment() {
        if (this.isPaused) {
            console.log('🤖 ⏸️ Payment processing skipped while paused');
            return;
        }

        if (!this.currentCustomer) {
            console.log('🤖 ❌ processAIPayment: No current customer');
            return;
        }
        
        console.log('🤖 ✅ AI processing payment...');
        
        this.showAIPaymentProcessing();
        
        const paymentTime = this.getAIPaymentTime();
        console.log(`🤖 AI payment time: ${paymentTime}ms`);
        
        // Clear any existing payment timer
        if (this.paymentTimer) {
            clearTimeout(this.paymentTimer);
        }
        this.setActiveTimerMeta('payment', paymentTime);
        
        this.paymentTimer = setTimeout(() => {
            this.paymentTimer = null;
            this.clearActiveTimerMeta();
            console.log(`🤖 AI payment timer fired after ${paymentTime}ms`);
            this.completeAITransaction();
        }, paymentTime);
        
        console.log(`🤖 ✅ Payment timer set for ${paymentTime}ms`);
    }
    
    getAIPaymentTime() {
        // Age-appropriate payment processing time
        let paymentMultiplier;
        if (this.difficulty === 'easy') {
            // 8-year-olds take longer to handle money and count change
            paymentMultiplier = 0.8; // 80% of calculation time
        } else if (this.difficulty === 'medium') {
            // 14-year-olds are faster with money than calculations
            paymentMultiplier = 0.5; // 50% of calculation time
        } else {
            // 20-year-olds are very efficient with payment processing
            paymentMultiplier = 0.3; // 30% of calculation time
        }
        
        return (this.reactionTime * paymentMultiplier) / this.speedMultiplier;
    }
    
    completeAITransaction() {
        if (this.isPaused) {
            console.log('🤖 ⏸️ Transaction completion skipped while paused');
            return;
        }

        if (!this.currentCustomer) return;
        
        // Generate AI performance metrics
        const rating = this.generateAIRating();
        const earnings = this.currentCustomer.orderTotal;
        
        // Update AI stats
        this.customersServed++;
        this.totalEarnings += earnings;
        this.totalRatings += rating;
        this.averageRating = this.totalRatings / this.customersServed;
        
        if (rating >= 4.5) {
            this.currentStreak++;
            this.perfectSales++;
        } else {
            this.currentStreak = 0;
        }
        
        // Show completion
        this.showAICompletion(rating);
        
        // Update displays
        this.updateAIDisplay();
        
        // Reset for next customer
        this.resetAICustomer();
        // Stop visual patience bar
        this.stopAIPatienceBar();
        
        // Don't auto-spawn next customer - let the synchronized system handle it
        console.log('AI customer transaction completed - waiting for next synchronized spawn');
    }
    
    generateAIRating() {
        // New star rating based on mistakes and patience remaining, matching player rules
        const mistakes = this.currentMistakes || 0;

        // Calculate remaining patience percentage
        let remainingPercent = 0;
        if (this.currentCustomer && this.currentCustomer.patience) {
            const elapsed = Date.now() - this.currentCustomer.arrivalTime;
            remainingPercent = Math.max(0, ((this.currentCustomer.patience - elapsed) / this.currentCustomer.patience) * 100);
        }

        let stars;
        if (mistakes === 0 && remainingPercent > 50) {
            stars = 5;
        } else if (mistakes === 0) {
            stars = 4;
        } else if (mistakes === 1) {
            stars = 3;
        } else if (mistakes === 2) {
            stars = 2;
        } else {
            stars = 1;
        }

        return stars;
    }
    
    showAIThinking() {
        // Age-appropriate thinking messages
        let thinkingMessage;
        if (this.difficulty === 'easy') {
            const messages = ['🤔 Counting on fingers...', '🧮 Using mental math...', '🤯 This is tricky...', '📝 Working it out...'];
            thinkingMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if (this.difficulty === 'medium') {
            const messages = ['🤔 Calculating...', '🧠 Thinking through this...', '📊 Adding it up...', '⚡ Working on it...'];
            thinkingMessage = messages[Math.floor(Math.random() * messages.length)];
        } else {
            const messages = ['⚡ Quick calculation...', '🎯 Processing...', '💡 Computing total...', '🚀 Almost done...'];
            thinkingMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        
        this.updateAIStatus(thinkingMessage, 'thinking');
        if (this.domElements.aiThinkingAnimation) {
            this.domElements.aiThinkingAnimation.classList.add('active');
        }
    }
    
    showAISuccess() {
        console.log('🤖 ✅ AI showing success message');
        
        // Age-appropriate success messages
        let successMessage;
        if (this.difficulty === 'easy') {
            const messages = ['✅ I got it!', '🎉 Yay, correct!', '😊 That was hard!', '👍 Finally!'];
            successMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if (this.difficulty === 'medium') {
            const messages = ['✅ Got it right!', '👌 Correct answer!', '💪 Nailed it!', '🎯 Success!'];
            successMessage = messages[Math.floor(Math.random() * messages.length)];
        } else {
            const messages = ['✅ Correct!', '⚡ Done!', '🎯 Perfect!', '💯 Accurate!'];
            successMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        
        this.updateAIStatus(successMessage, 'success');
        
        if (this.domElements.aiOrderTotal && this.currentCustomer) {
            const total = this.currentCustomer.orderTotal || 0;
            this.renderAIOrderTotal(total);
            this.domElements.aiOrderTotal.classList.add('correct');
            console.log(`🤖 ✅ AI order total displayed: ${GameConfig.formatMoney(total)}`);
        }
        
        // Stop thinking animation
        if (this.domElements.aiThinkingAnimation) {
            this.domElements.aiThinkingAnimation.classList.remove('active');
        }
    }
    
    showAIError() {
        // Age-appropriate error messages
        let errorMessage;
        if (this.difficulty === 'easy') {
            const messages = ['❌ Oops, let me try again...', '😅 That\'s not right...', '🤔 Wait, let me recount...', '😬 I made a mistake...'];
            errorMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if (this.difficulty === 'medium') {
            const messages = ['❌ Let me recalculate...', '🔄 Hmm, checking again...', '😐 That doesn\'t seem right...', '🤨 Let me double-check...'];
            errorMessage = messages[Math.floor(Math.random() * messages.length)];
        } else {
            const messages = ['❌ Recalculating...', '🔍 Verifying...', '⚡ Quick recheck...', '🎯 Adjusting...'];
            errorMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        
        this.updateAIStatus(errorMessage, 'error');
    }
    
    showAIPaymentProcessing() {
        // Age-appropriate payment messages
        let paymentMessage;
        if (this.difficulty === 'easy') {
            const messages = ['💰 Counting the money...', '🪙 Making change...', '💵 Handling payment...', '🧮 Figuring out change...'];
            paymentMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if (this.difficulty === 'medium') {
            const messages = ['💰 Processing payment...', '💳 Handling transaction...', '🪙 Calculating change...', '💵 Almost done...'];
            paymentMessage = messages[Math.floor(Math.random() * messages.length)];
        } else {
            const messages = ['💰 Processing...', '⚡ Quick payment...', '💳 Transaction complete...', '🎯 Finalizing...'];
            paymentMessage = messages[Math.floor(Math.random() * messages.length)];
        }
        
        this.updateAIStatus(paymentMessage, 'payment');
    }
    
    showAICompletion(rating) {
        const stars = '⭐'.repeat(Math.floor(rating));
        this.updateAIStatus(`${stars} Customer served!`, 'completed');
    }
    
    updateAIStatus(message, type) {
        if (this.domElements.aiStatusIndicator) {
            this.domElements.aiStatusIndicator.textContent = message;
            this.domElements.aiStatusIndicator.className = `ai-status ${type}`;
        }
    }
    
    resetAICustomer() {
        // Remove AI customer from 3D scene if it exists
        if (this.currentCustomer && this.currentCustomer.customer3D && this.gameManager && this.gameManager.sceneManager) {
            this.gameManager.sceneManager.removeCustomer(this.currentCustomer.customer3D);
        }
        
        // Advance the AI customer line
        if (this.gameManager && this.gameManager.sceneManager && typeof this.gameManager.sceneManager.serveAICustomer === 'function') {
            this.gameManager.sceneManager.serveAICustomer();
        }
        
        this.currentCustomer = null;
        this.processingOrder = false;
        this.pausedTimerPhase = null;
        this.pausedTimerRemaining = 0;
        this.clearTimers();
        
        if (this.domElements.aiCustomerPanel) {
            this.domElements.aiCustomerPanel.classList.remove('active');
        }
        
        if (this.domElements.aiThinkingAnimation) {
            this.domElements.aiThinkingAnimation.classList.remove('active');
        }
        
        if (this.domElements.aiOrderTotal) {
            this.domElements.aiOrderTotal.classList.remove('correct');
        }
        
        // Ensure patience bar stops and resets
        this.stopAIPatienceBar();
    }
    
    clearTimers() {
        if (this.calculationTimer) {
            clearTimeout(this.calculationTimer);
            this.calculationTimer = null;
        }
        
        if (this.paymentTimer) {
            clearTimeout(this.paymentTimer);
            this.paymentTimer = null;
        }

        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }

        this.clearActiveTimerMeta();
    }
    
    updateAIDisplay() {
        // Update all AI statistics displays
        if (this.domElements.aiCustomersServed) {
            this.domElements.aiCustomersServed.textContent = this.customersServed || 0;
        }
        
        if (this.domElements.aiTotalEarnings) {
            this.domElements.aiTotalEarnings.textContent = GameConfig.formatMoney(this.totalEarnings || 0);
        }
        
        if (this.domElements.aiAverageRating) {
            const rating = this.averageRating || 0;
            this.domElements.aiAverageRating.textContent = rating.toFixed(1);
        }
        
        if (this.domElements.aiCurrentStreak) {
            this.domElements.aiCurrentStreak.textContent = this.currentStreak;
        }
    }
    
    // Getter methods for competition scoring
    getCustomersServed() {
        return this.customersServed;
    }
    
    getTotalEarnings() {
        return this.totalEarnings;
    }
    
    getAverageRating() {
        return this.averageRating;
    }
    
    getCurrentStreak() {
        return this.currentStreak;
    }
    
    getPerfectSales() {
        return this.perfectSales;
    }
    
    setDifficulty(difficulty) {
        // Set AI behavioral difficulty (affects speed, accuracy, mistakes)
        // This is SEPARATE from game pricing difficulty
        this.difficulty = difficulty;
        this.setupAIDifficulty();
        console.log(`🤖 AI behavioral difficulty set to: ${difficulty} (pricing uses game's global difficulty)`);
    }

    setCharacterInfo(characterInfo) {
        console.log(`🤖 Setting AI Character to: ${characterInfo.name} (behavioral difficulty: ${characterInfo.difficulty})`);
        
        // CRITICAL: Properly reset AI state when changing characters (for Progressive Play)
        this.resetAIForNewCharacter();
        
        // Store character meta
        this.characterInfo = characterInfo;
        this.characterName = characterInfo.name;
        this.characterDifficulty = characterInfo.difficulty;

        // Keep a lowercase reference for modifier look-ups
        this.selectedCharacter = (characterInfo.name || '').toLowerCase();

        // Update the underlying AI difficulty and behaviour metrics
        this.setDifficulty(characterInfo.difficulty);

        console.log(`🤖 AI Character configured: ${characterInfo.name} (behavioral difficulty: ${characterInfo.difficulty})`);

        // Update any UI elements that show character info
        this.updateCharacterDisplay();
    }
    
    resetAIForNewCharacter() {
        console.log('🔄 Resetting AI opponent for new character...');
        
        // Stop any active timers and processing
        this.clearTimers();
        this.stopAIPatienceBar();
        
        // Reset processing state
        this.processingOrder = false;
        this.currentMistakes = 0;
        
        // Remove current customer if any
        if (this.currentCustomer) {
            console.log('🗑️ Removing current AI customer for character switch');
            this.resetAICustomer();
        }
        
        // Reset stats for new character
        this.resetStats();
        
        // Re-cache DOM elements to ensure they're available
        this.cacheDOM();
        
        // Ensure AI is ready to start fresh
        if (this.isActive) {
            console.log('🔄 AI was active, ensuring it\'s ready for new character');
            this.updateAIDisplay();
        }
        
        // Reset any UI state
        if (this.domElements.aiThinkingAnimation) {
            this.domElements.aiThinkingAnimation.classList.remove('active');
        }
        
        if (this.domElements.aiOrderTotal) {
            this.domElements.aiOrderTotal.classList.remove('correct');
            this.renderAIOrderTotal(0);
        }
        
        // Reset patience visuals to clean state
        this.setAIPatienceVisual(0);
        
        // Reset status indicator
        this.updateAIStatus('😴 Waiting for customers...', 'idle');
        
        console.log('✅ AI opponent reset complete for new character');
    }

    updateCharacterDisplay() {
        // Update character-specific displays if they exist
        const characterNameElement = document.getElementById('aiCharacterName');
        if (characterNameElement && this.characterName) {
            characterNameElement.textContent = this.characterName;
        }
        
        // Update character avatar/emoji based on character
        const characterAvatars = {
            'abby': '👧',
            'chase': '🧑‍🎓', 
            'becky': '👩‍💼',
            'diego': '👦',
            'luna': '🧑‍🚀',
            'max': '🧑‍💻',
            'bill': '🍺',
            'stacy': '💁‍♀️'
        };
        
        const avatarElement = document.getElementById('aiCharacterAvatar');
        if (avatarElement && this.characterName) {
            avatarElement.textContent = characterAvatars[this.characterName] || '🤖';
        }
        
        // Update AI panel title with character name
        if (this.domElements.aiPanelTitle && this.characterName) {
            const characterEmoji = characterAvatars[this.characterName] || '🤖';
            const capitalizedName = this.characterName.charAt(0).toUpperCase() + this.characterName.slice(1);
            this.domElements.aiPanelTitle.textContent = `${characterEmoji} ${capitalizedName}`;
        }
    }
    
    dispose() {
        this.stopCompetition();
        this.clearTimers();
        this.domElements = {};
        console.log('AI Opponent Manager disposed');
    }

    /*
     * Visual Patience / Progress Bar Helpers
     * -------------------------------------
     * These mirror the customer patience bar but are purely cosmetic for the AI.
     */
    hasAIPatienceVisualTargets() {
        return !!(this.domElements.aiProgressFill || this.domElements.aiCustomerPatienceFill);
    }

    applyAIPatienceLevelClass(fillElement, percentLeft) {
        if (!fillElement) return;

        fillElement.classList.remove('high', 'medium', 'low', 'critical');
        if (percentLeft > 75) fillElement.classList.add('high');
        else if (percentLeft > 50) fillElement.classList.add('medium');
        else if (percentLeft > 25) fillElement.classList.add('low');
        else fillElement.classList.add('critical');
    }

    setAIPatienceVisual(percentLeft = 0) {
        const boundedPercent = Math.max(0, Math.min(100, Number(percentLeft) || 0));
        const widthValue = `${boundedPercent}%`;

        const patienceFills = [
            this.domElements.aiProgressFill,
            this.domElements.aiCustomerPatienceFill
        ].filter(Boolean);

        patienceFills.forEach(fillElement => {
            fillElement.style.width = widthValue;
            fillElement.style.display = 'block';
            this.applyAIPatienceLevelClass(fillElement, boundedPercent);
        });

        if (this.domElements.aiCustomerPatiencePercentage) {
            this.domElements.aiCustomerPatiencePercentage.textContent = `${Math.round(boundedPercent)}%`;
        }
    }

    startAIPatienceBar(durationMs = 10000) {
        console.log(`🤖 startAIPatienceBar called with duration: ${durationMs}ms`);

        // Guard element - check if at least one patience fill exists
        if (!this.hasAIPatienceVisualTargets()) {
            console.error('🤖 ❌ No AI patience fill elements found');
            console.log('🤖 Available DOM elements:', Object.keys(this.domElements));

            // Re-cache DOM elements in case they changed during character switch
            this.cacheDOM();

            if (!this.hasAIPatienceVisualTargets()) {
                console.error('🤖 ❌ Still cannot find any AI patience fill element after DOM re-cache');
                return;
            }
            console.log('🤖 ✅ Found AI patience fill element(s) after DOM re-cache');
        }

        // Clear any existing interval
        this.stopAIPatienceBar();

        this.aiPatienceStart = Date.now();
        this.aiPatienceDuration = Math.max(1000, durationMs); // minimum 1 s

        // Reset bars to full and make sure they're visible
        this.setAIPatienceVisual(100);
        console.log('🤖 ✅ Patience bar initialized at 100%');

        // Update every 250 ms like player patience bar
        this.patienceInterval = setInterval(() => {
            const elapsed = Date.now() - this.aiPatienceStart;
            const percentLeft = Math.max(0, 100 - (elapsed / this.aiPatienceDuration) * 100);
            this.setAIPatienceVisual(percentLeft);

            // Debug logging occasionally
            if (elapsed % 2000 < 250) { // log every ~2 seconds
                console.log(`🤖 AI patience: ${percentLeft.toFixed(1)}% (${elapsed}ms elapsed)`);
            }

            // Auto-clear when depleted to keep things tidy
            if (percentLeft <= 0) {
                console.log('🤖 Patience bar depleted, stopping');
                this.stopAIPatienceBar();
            }
        }, 250);
        
        console.log(`🤖 ✅ Patience bar interval started (${this.aiPatienceDuration}ms duration)`);
    }

    stopAIPatienceBar() {
        console.log('🤖 Stopping AI patience bar...');
        
        if (this.patienceInterval) {
            clearInterval(this.patienceInterval);
            this.patienceInterval = null;
            console.log('🤖 ✅ Patience interval cleared');
        }

        this.setAIPatienceVisual(0);
        console.log('🤖 ✅ AI patience visuals reset to 0%');
    }

    /**
     * Helper: pick random personality (mirrors CustomerManager.calculateCustomerPatience)
     */
    getRandomPersonalityData() {
        const basePatience = GameConfig.GAME_SETTINGS.BASE_CUSTOMER_PATIENCE || 45000;
        const personalityTypes = [
            { name: "Very Patient",  multiplier: 1.5, weight: 20, description: "Very understanding and patient" },
            { name: "Patient",       multiplier: 1.2, weight: 25, description: "Generally patient and calm" },
            { name: "Normal",        multiplier: 1.0, weight: 20, description: "Average patience level" },
            { name: "Impatient",     multiplier: 0.8, weight: 25, description: "Gets frustrated quickly" },
            { name: "Very Impatient",multiplier: 0.6, weight: 10, description: "Extremely impatient and rushes" }
        ];
        const totalWeight = personalityTypes.reduce((sum, t) => sum + t.weight, 0);
        let rand = Math.random() * totalWeight;
        let selected = personalityTypes[2];
        for (const type of personalityTypes) {
            if (rand <= type.weight) { selected = type; break; }
            rand -= type.weight;
        }
        // Add ±10% individual variation
        const individualVariation = 0.10;
        let multiplier = selected.multiplier + (Math.random() - 0.5) * individualVariation * 2;
        const patienceMs = Math.max(
            GameConfig.GAME_SETTINGS.MIN_CUSTOMER_PATIENCE || 15000,
            Math.min(GameConfig.GAME_SETTINGS.MAX_CUSTOMER_PATIENCE || 60000, basePatience * multiplier)
        );
        return { personality: selected, patience: patienceMs };
    }

    /**
     * Helper: map personality to emoji (mirrors CustomerManager.getPatienceEmoji)
     */
    getPatienceEmoji(personalityName) {
        const emojiMap = {
            'Very Patient': '😃',
            'Patient': '🙂',
            'Normal': '😐',
            'Impatient': '😠',
            'Very Impatient': '😡'
        };
        return emojiMap[personalityName] || '😐';
    }
}

// Export for global access
window.AIOpponentManager = AIOpponentManager; 
