// Farmers Market Frenzy 3D - Customer Manager
class CustomerManager {
    constructor(gameManager, sceneManager) {
        this.gameManager = gameManager;
        this.sceneManager = sceneManager;
        
        // Current customer state
        this.currentCustomer = null;
        this.patienceTimer = null;
        this.currentState = 'idle'; // idle, ordering, calculating, paying, reviewing, leaving
        
        // Customer spawning
        this.spawnTimer = null;
        
        // DOM element cache
        this.domElements = {};
        
        // Statistics
        this.totalCustomersServed = 0;
        this.customerSatisfaction = [];
        
        // Performance tracking
        this.lastPatienceUpdate = 0;

        // Customer panel transition guards (prevents stale hide callbacks)
        this.customerPanelHideHandler = null;
        this.customerPanelHideFallbackTimer = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.cacheDOM();
        console.log('✅ CustomerManager initialized');
    }
    
    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
        console.log('✅ CustomerManager: 3D scene manager connected');
    }
    
    cacheDOM() {
        // Cache all DOM elements with comprehensive null checking
        this.domElements = {
            customerPanel: document.getElementById('customerPanel'),
            customerAvatar: document.getElementById('customerAvatar'),
            customerName: document.getElementById('customerName'),
            patienceFill: document.getElementById('patienceFill'),
            patienceBar: document.getElementById('patienceBar'),
            patienceBarContainer: document.querySelector('.patience-bar'),
            patiencePercentage: document.getElementById('patiencePercentage'),
            patienceText: document.querySelector('.patience-text'),
            patienceStatus: document.getElementById('patienceStatus'),
            statusIcon: document.getElementById('statusIcon'),
            statusText: document.getElementById('statusText'),
            patienceIndicators: document.querySelectorAll('.patience-indicators .indicator'), // These don't exist in new design
            orderItems: document.getElementById('orderItems'),
            submitBtn: document.getElementById('submitBtn'),
            submitTotalInlineLabel: document.getElementById('submitTotalInlineLabel')
        };
        
        // Validate critical elements and provide better error handling
        const criticalElements = ['customerPanel', 'patienceFill', 'patienceBar', 'orderItems'];
        const missingElements = [];
        
        criticalElements.forEach(key => {
            if (!this.domElements[key]) {
                missingElements.push(key);
                console.error(`CustomerManager: Critical DOM element '${key}' not found`);
            }
        });
        
        if (missingElements.length > 0) {
            throw new Error(`CustomerManager: Missing critical DOM elements: ${missingElements.join(', ')}`);
        }
    }
    
    // Note: Patience guide panel was removed during UI cleanup
    // This method is kept for compatibility but no longer performs any actions
    
    startCustomerSpawning() {
        const spawnInterval = GameConfig.GAME_SETTINGS.CUSTOMER_SPAWN_INTERVAL;
        console.log(`🔄 Starting customer spawning timer (interval: ${spawnInterval}ms)`);
        
        this.spawnTimer = setInterval(() => {
            console.log('⏰ Spawn timer tick - checking if can spawn customer');
            if (this.canSpawnCustomer()) {
                console.log('✅ Can spawn customer - spawning now');
                this.spawnNextCustomer();
            }
        }, spawnInterval);
    }
    
    stopCustomerSpawning() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
    }
    
    canSpawnCustomer() {
        // Recovery guard: stale states can block future spawns if a previous customer
        // was cleared asynchronously but state did not return to idle.
        if (!this.currentCustomer && this.currentState !== 'idle') {
            console.warn(`⚠️ Recovering stale customer state "${this.currentState}" -> "idle"`);
            this.currentState = 'idle';
        }

        // Check if there are customers available in the line
        let customerAvailable = false;
        if (this.sceneManager && typeof this.sceneManager.getNextPlayerCustomer === 'function') {
            const nextCustomer = this.sceneManager.getNextPlayerCustomer();
            customerAvailable = nextCustomer !== null;
        }
        
        const canSpawn = this.currentCustomer === null && 
                        this.currentState === 'idle' &&
                        this.gameManager.isGameActive() &&
                        customerAvailable;
        
        if (!canSpawn) {
            console.log('🚫 Cannot spawn customer:', {
                currentCustomer: this.currentCustomer?.name || 'none',
                currentState: this.currentState,
                gameActive: this.gameManager.isGameActive(),
                customerAvailable: customerAvailable
            });
        } else {
            console.log('✅ Can spawn customer - all conditions met');
        }
        
        return canSpawn;
    }
    
    spawnNextCustomer() {
        try {
            console.log(`🆕 Spawning new customer (Total served so far: ${this.totalCustomersServed})`);
            
            // CRITICAL: Ensure completely clean state before spawning
            if (this.currentCustomer) {
                console.warn('Previous customer still exists - removing first');
                this.removeCurrentCustomer();
            }
            
            // Force stop any lingering timers
            this.stopPatienceTimer();
            
            // Ensure clean state
            this.currentState = 'idle';
            console.log('🧹 State cleaned for new customer spawn');
            
            // Get next customer from line instead of creating new one
            let customer3D = null;
            if (this.sceneManager && typeof this.sceneManager.getNextPlayerCustomer === 'function') {
                customer3D = this.sceneManager.getNextPlayerCustomer();
            }
            
            if (!customer3D) {
                console.warn('No customer available in player line');
                return;
            }
            
            // Generate customer data
            const customer = GameConfig.getRandomCustomer();
            const order = this.generateOrderWithDifficultyPricing();
            
            if (!order || order.length === 0) {
                console.warn('Failed to generate order for customer');
                return;
            }
            
            // Calculate patience values and get personality info
            const patienceData = this.calculateCustomerPatience();
            
            // Create customer object with personality info
            this.currentCustomer = {
                ...customer,
                order: order,
                orderTotal: this.calculateOrderTotal(order),
                arrivalTime: Date.now(),
                patience: patienceData.patience,
                maxPatience: patienceData.patience, // Same value for consistent calculations
                currentPatience: 100, // Start with 100% patience for zap damage system
                personality: patienceData.personality,
                patienceMultiplier: patienceData.patienceMultiplier,
                // Track mistakes for star rating calculations
                mistakes: 0,
                model: customer3D // Use the 3D model from the line
            };
            
            // Store the consolidated order for display purposes
            this.currentCustomer.consolidatedOrder = this.consolidateOrder(order);
            
            console.log(`👤 ${this.currentCustomer.name} | 😊 ${this.currentCustomer.personality.name} | ⏱️ ${(this.currentCustomer.patience/1000).toFixed(1)}s | 💰 ${GameConfig.formatMoney(this.currentCustomer.orderTotal)}`);
            
            // Move the customer from line to counter position
            if (this.sceneManager && typeof this.sceneManager.animateCustomerToCounter === 'function') {
                this.sceneManager.animateCustomerToCounter(customer3D, false); // false = player customer
            }
            
            // Start customer interaction
            this.startCustomerOrder();
            
            console.log(`✅ Customer ${this.currentCustomer.name} moved to counter successfully`);
            
            // Notify GameManager that a customer was spawned for timer synchronization
            if (this.gameManager && typeof this.gameManager.onCustomerSpawned === 'function') {
                this.gameManager.onCustomerSpawned(false); // false = player customer
            }
            
            // Debug pricing breakdown
            this.logOrderBreakdown();
            
        } catch (error) {
            console.error('❌ Error spawning customer:', error);
        }
    }
    
    logOrderBreakdown() {
        if (!this.currentCustomer) return;
        
        console.log('=== ORDER PRICING BREAKDOWN ===');
        let debugTotal = 0;
        this.currentCustomer.order.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            debugTotal += itemTotal;
            console.log(`Item ${index + 1}: ${item.emoji} ${item.name} | Price: ${GameConfig.formatMoney(item.price)} | Qty: ${item.quantity} | Subtotal: ${GameConfig.formatMoney(itemTotal)}`);
        });
        console.log(`Calculated Total: ${GameConfig.formatMoney(debugTotal)}`);
        console.log(`Expected Total: ${GameConfig.formatMoney(this.currentCustomer.orderTotal)}`);
        console.log(`Match: ${Math.abs(debugTotal - this.currentCustomer.orderTotal) < 0.01 ? '✅ YES' : '❌ NO'}`);
        console.log('================================');
    }
    
    calculateCustomerPatience() {
        const basePatience = GameConfig.GAME_SETTINGS.BASE_CUSTOMER_PATIENCE;
        
        // Define customer personality types with more balanced weights for better variety
        const personalityTypes = [
            { name: "Very Patient", multiplier: 1.5, weight: 20, description: "Very understanding and patient" },
            { name: "Patient", multiplier: 1.2, weight: 25, description: "Generally patient and calm" },
            { name: "Normal", multiplier: 1.0, weight: 20, description: "Average patience level" },
            { name: "Impatient", multiplier: 0.8, weight: 25, description: "Gets frustrated quickly" },
            { name: "Very Impatient", multiplier: 0.6, weight: 10, description: "Extremely impatient and rushes" }
        ];
        
        // Improved weighted random selection
        const totalWeight = personalityTypes.reduce((sum, type) => sum + type.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedPersonality = personalityTypes[2]; // Default to Normal
        for (const personality of personalityTypes) {
            if (random <= personality.weight) {
                selectedPersonality = personality;
                break;
            }
            random -= personality.weight;
        }
        
        // Calculate patience based on personality and add some randomness
        let patienceMultiplier = selectedPersonality.multiplier;
        
        // Add individual variation within the personality type (±10% for more consistent behavior)
        const individualVariation = 0.10;
        patienceMultiplier += (Math.random() - 0.5) * individualVariation * 2;
        
        // Calculate final patience
        const calculatedPatience = basePatience * patienceMultiplier;
        
        // Return both the patience value and personality info
        const result = {
            patience: Math.max(
                GameConfig.GAME_SETTINGS.MIN_CUSTOMER_PATIENCE,
                Math.min(GameConfig.GAME_SETTINGS.MAX_CUSTOMER_PATIENCE, calculatedPatience)
            ),
            personality: selectedPersonality,
            patienceMultiplier: patienceMultiplier
        };
        
        console.log(`Customer personality: ${selectedPersonality.name} (${(patienceMultiplier * 100).toFixed(0)}% patience)`);
        
        return result;
    }

    generateOrderWithDifficultyPricing() {
        const minItems = Math.max(1, parseInt(GameConfig.GAME_SETTINGS.ORDER_MIN_ITEMS, 10) || 1);
        const maxItems = Math.max(minItems, parseInt(GameConfig.GAME_SETTINGS.ORDER_MAX_ITEMS, 10) || 6);
        const numItems = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
        const order = [];
        
        // Get available products from ProductManager with difficulty-adjusted pricing
        if (!this.gameManager || !this.gameManager.productManager) {
            console.warn('ProductManager not available for order generation');
            return this.generateFallbackOrder();
        }
        
        try {
            const availableProducts = this.gameManager.productManager.getAvailableProducts();
            
            if (!availableProducts || availableProducts.length === 0) {
                console.warn('No available products for order generation');
                return this.generateFallbackOrder();
            }
            
            for (let i = 0; i < numItems; i++) {
                const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
                const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 of each item
                
                // Use the product's current price (already adjusted for difficulty)
                const orderItem = {
                    name: randomProduct.name,
                    emoji: randomProduct.emoji,
                    price: randomProduct.currentPrice || randomProduct.basePrice || 1.00,
                    quantity: quantity
                };
                
                order.push(orderItem);
            }
            
            return order;
            
        } catch (error) {
            console.error('Error generating order with difficulty pricing:', error);
            return this.generateFallbackOrder();
        }
    }
    
    generateFallbackOrder() {
        // Fallback order generation using basic products
        const fallbackProducts = [
            { name: "Tomatoes", emoji: "🍅", price: 3.00 },
            { name: "Apples", emoji: "🍎", price: 3.00 },
            { name: "Bananas", emoji: "🍌", price: 1.00 }
        ];
        
        const minItems = Math.max(1, parseInt(GameConfig.GAME_SETTINGS.ORDER_MIN_ITEMS, 10) || 1);
        const maxItems = Math.max(minItems, parseInt(GameConfig.GAME_SETTINGS.ORDER_MAX_ITEMS, 10) || 6);
        const numItems = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
        const order = [];
        
        for (let i = 0; i < numItems; i++) {
            const randomProduct = fallbackProducts[Math.floor(Math.random() * fallbackProducts.length)];
            const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
            
            order.push({
                name: randomProduct.name,
                emoji: randomProduct.emoji,
                price: randomProduct.price,
                quantity: quantity
            });
        }
        
        console.log('Using fallback order generation');
        return order;
    }

    calculateOrderTotal(order) {
        if (!order || !Array.isArray(order)) return 0;
        
        return order.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    startCustomerOrder() {
        this.currentState = 'ordering';
        this.customerStartTime = Date.now();
        
        this.showCustomerPanel();
        this.displayCustomerOrder();
        this.startPatienceTimer();
        
        // Notify game manager that order is ready
        if (this.gameManager && typeof this.gameManager.onCustomerOrderReady === 'function') {
            this.gameManager.onCustomerOrderReady();
        }
    }

    showCustomerPanel() {
        console.log('🎭 DEBUG: showCustomerPanel called');
        
        if (!this.domElements.customerPanel || !this.currentCustomer) {
            console.log('❌ DEBUG: Missing panel or customer:', {
                panel: !!this.domElements.customerPanel,
                customer: !!this.currentCustomer
            });
            return;
        }
        
        try {
            // Cancel any pending hide cleanup from the previous customer.
            this.clearCustomerPanelHideTransition();

            // Update customer info - show patience emoji instead of generic avatar
            if (this.domElements.customerAvatar) {
                const patienceEmoji = this.getPatienceEmoji(this.currentCustomer.personality?.name);
                this.domElements.customerAvatar.textContent = patienceEmoji;
                console.log('✅ DEBUG: Avatar updated:', patienceEmoji);
            }
            
            if (this.domElements.customerName) {
                this.domElements.customerName.textContent = this.currentCustomer.name || 'Customer';
                console.log('✅ DEBUG: Name updated:', this.currentCustomer.name);
            }
            
            // Highlight the current customer's patience level in the guide
            this.highlightCurrentPatienceLevel();
            
            // Show the panel
            // Remove any stale slide-out class from previous transitions.
            this.domElements.customerPanel.classList.remove('slide-out-left');
            this.domElements.customerPanel.classList.add('active');
            console.log('✅ DEBUG: Customer panel shown with active class');
            
            // Focus the Submit Total input for smooth user experience on all devices
            if (this.gameManager && this.gameManager.moneyManager) {
                // Immediate focus attempt for fast transition
                this.gameManager.moneyManager.focusSubmitTotalInput();
                
                // Backup focus attempts with reduced delays for faster responsiveness
                setTimeout(() => {
                    this.gameManager.moneyManager.focusSubmitTotalInput();
                }, 100); // Quick backup focus
                
                setTimeout(() => {
                    this.gameManager.moneyManager.focusSubmitTotalInput();
                }, 250); // Final backup focus for slower devices
            }
            
            // Force visibility check
            const panelStyle = window.getComputedStyle(this.domElements.customerPanel);
            console.log('🔍 DEBUG: Panel computed display:', panelStyle.display, 'visibility:', panelStyle.visibility, 'transform:', panelStyle.transform);
            
            // Also check patience bar visibility within the panel
            if (this.domElements.patienceFill && this.domElements.patienceBar) {
                const barStyle = window.getComputedStyle(this.domElements.patienceBar);
                const fillStyle = window.getComputedStyle(this.domElements.patienceFill);
                console.log('🔍 DEBUG: Patience bar - display:', barStyle.display, 'width:', barStyle.width, 'height:', barStyle.height);
                console.log('🔍 DEBUG: Patience fill - display:', fillStyle.display, 'width:', fillStyle.width, 'height:', fillStyle.height);
            }
            
        } catch (error) {
            console.error('Error updating customer panel:', error);
        }
    }

    highlightCurrentPatienceLevel() {
        if (!this.currentCustomer?.personality?.name) return;
        
        try {
            // Remove active class from all patience level items
            const allPatienceItems = document.querySelectorAll('.patience-level-item');
            allPatienceItems.forEach(item => item.classList.remove('active'));
            
            // Map personality names to data-level attributes
            const personalityToLevel = {
                'Very Patient': 'very-patient',
                'Patient': 'patient', 
                'Normal': 'normal',
                'Impatient': 'impatient',
                'Very Impatient': 'very-impatient'
            };
            
            const levelKey = personalityToLevel[this.currentCustomer.personality.name];
            if (levelKey) {
                const currentLevelItem = document.querySelector(`[data-level="${levelKey}"]`);
                if (currentLevelItem) {
                    currentLevelItem.classList.add('active');
                }
            }
            
        } catch (error) {
            console.error('Error highlighting patience level:', error);
        }
    }

    hideCustomerPanel() {
        if (this.domElements.customerPanel) {
            const panel = this.domElements.customerPanel;
            this.clearCustomerPanelHideTransition();
            // Add slide-out class for smooth transition
            panel.classList.add('slide-out-left');

            // Remove classes after transition ends
            const cleanup = () => {
                panel.classList.remove('slide-out-left', 'active');
                panel.removeEventListener('transitionend', cleanup);
                this.customerPanelHideHandler = null;
                this.customerPanelHideFallbackTimer = null;

                // If a new customer already arrived while the old panel was sliding out,
                // keep the panel visible for the current interaction.
                if (this.currentCustomer && this.currentState !== 'idle') {
                    panel.classList.remove('slide-out-left');
                    panel.classList.add('active');
                }
            };
            this.customerPanelHideHandler = cleanup;
            panel.addEventListener('transitionend', cleanup);

            // Fallback cleanup in case transitionend doesn't fire on some devices.
            this.customerPanelHideFallbackTimer = setTimeout(() => {
                if (panel.classList.contains('slide-out-left') || panel.classList.contains('active')) {
                    cleanup();
                }
            }, 450);
        }
    }

    clearCustomerPanelHideTransition() {
        const panel = this.domElements.customerPanel;
        if (!panel) return;

        if (this.customerPanelHideHandler) {
            panel.removeEventListener('transitionend', this.customerPanelHideHandler);
            this.customerPanelHideHandler = null;
        }

        if (this.customerPanelHideFallbackTimer) {
            clearTimeout(this.customerPanelHideFallbackTimer);
            this.customerPanelHideFallbackTimer = null;
        }
    }

    consolidateOrder(order) {
        if (!order || !Array.isArray(order)) return [];
        
        const consolidated = {};
        
        order.forEach(item => {
            const key = `${item.name}_${item.price}`;
            if (consolidated[key]) {
                consolidated[key].quantity += item.quantity;
            } else {
                consolidated[key] = { ...item };
            }
        });
        
        return Object.values(consolidated);
    }

    displayCustomerOrder() {
        if (!this.domElements.orderItems || !this.currentCustomer) {
            return;
        }
        
        try {
            const maxOrderSlots = Math.max(1, parseInt(GameConfig.GAME_SETTINGS.ORDER_MAX_ITEMS, 10) || 6);
            const allOrderItems = this.currentCustomer.consolidatedOrder || this.currentCustomer.order || [];
            const consolidatedOrder = allOrderItems.slice(0, maxOrderSlots);

            if (allOrderItems.length > maxOrderSlots) {
                console.warn(`displayCustomerOrder: order has ${allOrderItems.length} items, truncating to ${maxOrderSlots}`);
            }
            
            // Clear and populate order items
            this.domElements.orderItems.innerHTML = '';
            
            for (let slotIndex = 0; slotIndex < maxOrderSlots; slotIndex++) {
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';
                const item = consolidatedOrder[slotIndex];

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

                this.domElements.orderItems.appendChild(orderItem);
            }
            
            // Hide total initially - customer must calculate it first
            this.hideOrderTotal();
            
        } catch (error) {
            console.error('Error displaying customer order:', error);
        }
    }

    hideOrderTotal() {
        this.updateSubmitTotalInline('?', false);
    }

    showOrderTotal() {
        if (this.currentCustomer) {
            const formattedTotal = GameConfig.formatMoney(this.currentCustomer.orderTotal);
            this.updateSubmitTotalInline(formattedTotal, true);
        }
    }

    updateSubmitTotalInline(totalText = '?', revealed = false) {
        if (this.domElements.submitTotalInlineLabel) {
            this.domElements.submitTotalInlineLabel.textContent = `Total: ${totalText}`;
        }

        if (this.domElements.submitBtn) {
            this.domElements.submitBtn.classList.toggle('total-revealed', revealed);
        }
    }

    startPatienceTimer(mode = 'ordering') {
        // Validate customer exists
        if (!this.currentCustomer) {
            console.warn('Cannot start patience timer - no current customer');
            return;
        }
        
        // Check DOM elements
        if (!this.domElements.patienceFill) {
            console.error('Cannot start patience timer - patienceFill element not found!');
            console.log('Available DOM elements:', Object.keys(this.domElements));
            console.log('patienceFill element:', document.getElementById('patienceFill'));
            return;
        }
        
        // Always stop any existing timer to prevent conflicts
        this.stopPatienceTimer();
        
        // Get personality info
        const personalityName = this.currentCustomer.personality?.name || 'Normal';
        let patienceDecrement;
        
        if (mode === 'payment') {
            patienceDecrement = this.getPaymentPatienceDecrement(personalityName);
        } else {
            patienceDecrement = this.getPersonalityPatienceDecrement(personalityName);
        }
        
        // Initialize patience counter (1000 = 100%)
        this.currentCustomer.patienceCounter = 1000;
        this.currentCustomer.patienceDecrement = patienceDecrement;
        this.currentCustomer.patienceMode = mode;
        
        // Set initial bar display
        this.setSmoothPatienceBar(100);
        
        // Start timer with 250ms interval for smooth updates
        this.patienceTimer = setInterval(() => {
            this.updatePatience();
        }, 250);
        
        console.log(`Patience timer started for ${this.currentCustomer.name} (${mode} mode)`);
    }

    setSmoothPatienceBar(percent) {
        if (!this.domElements.patienceFill) {
            console.error('❌ Cannot update patience bar - patienceFill element missing!');
            return;
        }
        
        // Ensure percent is within valid range
        const clampedPercent = Math.max(0, Math.min(100, percent));
        
        // Determine patience level for CSS classes
        let patienceLevel = 'high';
        if (clampedPercent <= 25) patienceLevel = 'critical';
        else if (clampedPercent <= 50) patienceLevel = 'low';
        else if (clampedPercent <= 75) patienceLevel = 'medium';
        
        // Update patience bar fill
        this.domElements.patienceFill.style.width = clampedPercent + '%';
        this.domElements.patienceFill.style.display = 'block';
        
        // Apply appropriate CSS class for styling
        this.domElements.patienceFill.classList.remove('high', 'medium', 'low', 'critical');
        this.domElements.patienceFill.classList.add(patienceLevel);
        
        // Update percentage display
        if (this.domElements.patiencePercentage) {
            this.domElements.patiencePercentage.textContent = Math.round(clampedPercent) + '%';
            this.domElements.patiencePercentage.style.color = this.getPercentageColor(clampedPercent);
        }
        
        // Update patience indicators
        this.updatePatienceIndicators(clampedPercent);
        
        // Update patience status
        this.updatePatienceStatus(clampedPercent);
        
        // Force reflow to ensure immediate update
        this.domElements.patienceFill.offsetHeight;
    }
    
    getPercentageColor(percent) {
        if (percent > 70) return '#27ae60';
        if (percent > 40) return '#f39c12';
        if (percent > 20) return '#e67e22';
        return '#e74c3c';
    }
    
    updatePatienceIndicators(percent) {
        // Skip patience indicators in new unified design - they don't exist
        // This method is kept for compatibility but does nothing
        return;
    }
    
    updatePatienceStatus(percent) {
        if (!this.domElements.statusIcon || !this.domElements.statusText || !this.domElements.patienceStatus) return;
        
        let statusIcon, statusText, statusClass, borderColor;
        
        if (percent > 75) {
            statusIcon = '💚';
            statusText = 'Customer is very patient';
            statusClass = 'high';
            borderColor = '#27ae60';
        } else if (percent > 50) {
            statusIcon = '💛';
            statusText = 'Customer is getting concerned';
            statusClass = 'medium';
            borderColor = '#f39c12';
        } else if (percent > 25) {
            statusIcon = '🧡';
            statusText = 'Customer is becoming impatient';
            statusClass = 'low';
            borderColor = '#e67e22';
        } else {
            statusIcon = '❤️';
            statusText = 'Customer is very frustrated!';
            statusClass = 'critical';
            borderColor = '#e74c3c';
        }
        
        this.domElements.statusIcon.textContent = statusIcon;
        this.domElements.statusText.textContent = statusText;
        this.domElements.patienceStatus.style.borderLeftColor = borderColor;
        this.domElements.patienceStatus.style.background = `${borderColor}20`;
        
        // Remove all status classes and add current one
        this.domElements.patienceStatus.classList.remove('high', 'medium', 'low', 'critical');
        this.domElements.patienceStatus.classList.add(statusClass);
    }

    updatePatience() {
        if (!this.currentCustomer || !this.patienceTimer) {
            return;
        }

        const now = Date.now();
        const personalityName = this.currentCustomer.personality?.name || 'Normal';
        const tickDecrement = Number.isFinite(this.currentCustomer.patienceDecrement)
            ? this.currentCustomer.patienceDecrement
            : this.getPersonalityPatienceDecrement(personalityName);

        if (!Number.isFinite(this.currentCustomer.patienceCounter)) {
            this.currentCustomer.patienceCounter = 1000;
        }

        // Keep patience behavior deterministic across phases by using the active mode counter.
        this.currentCustomer.patienceCounter = Math.max(0, this.currentCustomer.patienceCounter - tickDecrement);

        if (this.currentCustomer.patienceCounter <= 0) {
            this.customerLostPatience();
            return;
        }

        const percentage = Math.max(0, (this.currentCustomer.patienceCounter / 1000) * 100);
        this.currentCustomer.currentPatience = percentage;

        // Batch DOM updates for performance - only update every 100ms
        const timeSinceLastUpdate = now - (this.lastPatienceUpdate || 0);
        if (timeSinceLastUpdate >= 100) {
            this.setSmoothPatienceBar(percentage);
            this.updatePatienceStatus(percentage);
            this.lastPatienceUpdate = now;
        }

        // Apply occasional personality pressure while preserving the active phase model.
        if (timeSinceLastUpdate >= 500 && this.currentCustomer.personality) {
            const zapBase = this.currentCustomer.patienceMode === 'payment'
                ? this.getPaymentPatienceDecrement(personalityName)
                : this.getPersonalityPatienceDecrement(personalityName);

            if (zapBase > 0 && Math.random() < 0.1) { // 10% chance per check
                this.applyZapDamage(zapBase);
            }
        }
    }

    stopPatienceTimer() {
        if (this.patienceTimer) {
            console.log('⏹️ Stopping patience timer...');
            clearInterval(this.patienceTimer);
            this.patienceTimer = null;
            
            // Extra safety: ensure no lingering timer references
            if (this.currentCustomer) {
                this.currentCustomer.patienceDecrement = null;
            }
            console.log('✅ Patience timer fully stopped and cleared');
        } else {
            console.log('ℹ️ No patience timer to stop');
        }
    }

    customerLostPatience() {
        console.log('Customer lost patience and left');
        
        this.stopPatienceTimer();
        this.currentState = 'leaving';
        
        // Hide any open interfaces when customer leaves
        this.hideAllInterfaces();
        
        // 1️⃣ Inform GameManager that this (unsuccessful) customer counts toward total served
        if (this.gameManager && typeof this.gameManager.onCustomerCompleted === 'function') {
            this.gameManager.onCustomerCompleted();
        }
        
        // Create negative review
        const review = {
            stars: 1,
            text: `${this.currentCustomer?.name || 'Customer'} left frustrated: "Too slow! I don't have all day!"`,
            impact: 'Popularity decreased significantly',
            accuracy: 0,
            speed: 0,
            popularityImpact: GameConfig.GAME_SETTINGS.POPULARITY_LOSS_SLOW
        };
        
        // Update game statistics
        if (this.gameManager && typeof this.gameManager.updateGameStatistics === 'function') {
            this.gameManager.updateGameStatistics(review);
            
            // Refresh HUD so service score/ratings reflect new average
            if (typeof this.gameManager.updateHUD === 'function') {
                this.gameManager.updateHUD();
            }
        }
        
        // Remove customer and reset
        this.removeCurrentCustomer();
    }

    onTotalCalculated(calculatedTotal) {
        if (!this.currentCustomer) {
            console.warn('No current customer for total validation');
            return false;
        }
        
        const expectedTotal = this.currentCustomer.orderTotal;
        const tolerance = GameConfig.GAME_SETTINGS.MONEY_TOLERANCE;
        const isCorrect = Math.abs(calculatedTotal - expectedTotal) <= tolerance;
        
        if (isCorrect) {
            this.onCorrectTotal(calculatedTotal);
            return true;
        } else {
            this.onIncorrectTotal(calculatedTotal, expectedTotal);
            return false;
        }
    }

    onCorrectTotal(total) {
        console.log('✅ Customer: Correct total calculated');
        
        // Show the total now that user calculated it correctly
        this.showOrderTotal();
        
        // CRITICAL: Stop ordering timer before switching to payment phase
        console.log('🔄 Stopping ordering timer before payment phase...');
        this.stopPatienceTimer();
        
        // Immediately set state and payment info (no delays that break GameManager flow)
        this.currentState = 'paying';
        
        // Generate customer payment
        const paymentAmount = this.generateCustomerPayment(total);
        this.currentCustomer.paymentAmount = paymentAmount;
        this.currentCustomer.expectedChange = paymentAmount - total;
        
        console.log(`Customer pays: ${GameConfig.formatMoney(paymentAmount)}, expects change: ${GameConfig.formatMoney(this.currentCustomer.expectedChange)}`);
        
        // Start payment timer with a minimal delay to ensure clean transition
        setTimeout(() => {
            console.log('🔄 Starting payment timer...');
            this.startPatienceTimer('payment');
        }, 10); // Very minimal delay just for timer cleanup
    }

    onIncorrectTotal(calculated, expected) {
        console.log(`❌ Customer: Incorrect total - calculated: ${GameConfig.formatMoney(calculated)}, expected: ${GameConfig.formatMoney(expected)}`);
        
        // Apply zap damage to patience but allow player to recalculate instead
        this.applyZapDamage(15); // 15% patience damage for wrong total

        // Customer remains in ordering phase awaiting correct total
    }

    generateCustomerPayment(orderTotal) {
        // Define realistic bill denominations customers would use
        const billDenominations = [1, 5, 10, 20, 50, 100];
        
        // Find the smallest combination of bills that covers the total
        let paymentAmount = 0;
        
        // For small amounts (under $2), customers might pay exact change or use $1-$5 bills
        if (orderTotal <= 2.00) {
            const smallPayments = [
                Math.ceil(orderTotal), // Exact or close to exact
                5.00, // $5 bill
                10.00 // $10 bill (less common for small amounts)
            ];
            paymentAmount = smallPayments[Math.floor(Math.random() * smallPayments.length)];
        }
        // For medium amounts ($2-$10), use $5, $10, or $20 bills
        else if (orderTotal <= 10.00) {
            const mediumPayments = [];
            
            // Add realistic payment options
            if (orderTotal <= 5.00) {
                mediumPayments.push(5.00, 10.00, 20.00);
            } else {
                mediumPayments.push(10.00, 20.00);
            }
            
            paymentAmount = mediumPayments[Math.floor(Math.random() * mediumPayments.length)];
        }
        // For larger amounts ($10+), use $10, $20, $50, or $100 bills
        else if (orderTotal <= 20.00) {
            const largePayments = [20.00, 50.00];
            if (orderTotal <= 15.00) {
                largePayments.unshift(20.00); // More likely to use $20 for amounts under $15
            }
            paymentAmount = largePayments[Math.floor(Math.random() * largePayments.length)];
        }
        // For very large amounts ($20+), use $20, $50, or $100 bills
        else {
            const veryLargePayments = [];
            if (orderTotal <= 50.00) {
                veryLargePayments.push(50.00, 100.00);
            } else {
                veryLargePayments.push(100.00);
            }
            paymentAmount = veryLargePayments[Math.floor(Math.random() * veryLargePayments.length)];
        }
        
        // Ensure payment amount is always greater than or equal to the total
        if (paymentAmount < orderTotal) {
            // Find next appropriate bill denomination
            for (const bill of billDenominations) {
                if (bill >= orderTotal) {
                    paymentAmount = bill;
                    break;
                }
            }
        }
        
        console.log(`Payment generation: Order total ${GameConfig.formatMoney(orderTotal)} → Customer pays ${GameConfig.formatMoney(paymentAmount)} (realistic bill denomination)`);
        
        return paymentAmount;
    }

    onPaymentProcessed(changeGiven) {
        console.log(`💸 Customer received change: ${GameConfig.formatMoney(changeGiven)}`);
        
        if (!this.currentCustomer) return false;
        
        const expectedChange = this.currentCustomer.expectedChange || 0;
        const tolerance = GameConfig.GAME_SETTINGS.MONEY_TOLERANCE;
        const isCorrectChange = Math.abs(changeGiven - expectedChange) <= tolerance;
        
        if (isCorrectChange) {
            this.onCorrectChange();
        } else {
            this.onIncorrectChange(changeGiven, expectedChange);
        }
        
        return isCorrectChange;
    }

    onCorrectChange() {
        console.log('✅ Customer: Correct change received');
        
        // Generate positive review
        const review = this.generatePositiveReview();
        this.completeTransaction(review);
    }

    onIncorrectChange(given, expected) {
        console.log(`❌ Customer: Incorrect change - given: ${GameConfig.formatMoney(given)}, expected: ${GameConfig.formatMoney(expected)}`);
        
        // Apply zap damage to customer patience
        this.applyZapDamage(20); // 20% patience damage for wrong change (more severe)
        
        // Increment mistake counter then generate review based on new rules
        if (this.currentCustomer && given > 0) {
            this.currentCustomer.mistakes = (this.currentCustomer.mistakes || 0) + 1;
            console.warn(`[Mistake] Incorrect change retry. Mistakes: ${this.currentCustomer.mistakes}`);
        }

        const review = this.generatePositiveReview(); // will assign 2-5 stars per rules
        this.completeTransaction(review);
    }

    // Apply zap damage for incorrect change without completing transaction (for retries)
    onIncorrectChangeRetry(given, expected) {
        console.log(`❌ Customer: Incorrect change (retry) - given: ${GameConfig.formatMoney(given)}, expected: ${GameConfig.formatMoney(expected)}`);
        
        // Apply zap damage to customer patience
        this.applyZapDamage(10); // 10% patience damage for wrong change on retry (less severe)
        
        // Customer waits for correct change calculation
        
        if (this.currentCustomer && given > 0) {
            this.currentCustomer.mistakes = (this.currentCustomer.mistakes || 0) + 1;
            console.warn(`[Mistake] Incorrect change retry. Mistakes: ${this.currentCustomer.mistakes}`);
        }
    }

    generatePositiveReview() {
        // Calculate speed percentage remaining
        const serviceTime = this.customerStartTime ? Date.now() - this.customerStartTime : 0;
        const maxTime = this.currentCustomer?.maxPatience || 60000;
        const remainingPercent = Math.max(0, Math.min(1, 1 - (serviceTime / maxTime)))*100; // 0-100%
        const speedScore = remainingPercent / 100; // keep existing variable for accuracy metric

        const mistakes = this.currentCustomer?.mistakes || 0;

        // Determine stars per new rules
        let stars;
        if (mistakes === 0 && remainingPercent > 50) {
            stars = 5; // 100% accuracy, served before 50% patience used
        } else if (mistakes === 0) {
            stars = 4; // 100% accuracy, but patience fell below 50%
        } else if (mistakes === 1) {
            stars = 3; // One mistake corrected
        } else if (mistakes === 2) {
            stars = 2; // Two mistakes
        } else {
            stars = 1; // Three or more mistakes (should rarely reach here for positive path)
        }

        console.log(`[⭐ Review] Mistakes: ${mistakes}, Remaining%: ${remainingPercent.toFixed(1)}, Stars: ${stars}`);

        const reviewMessages = {
            5: ["⭐ Incredible! Perfect and super fast!", "⭐️⭐️⭐️⭐️⭐️ Flawless service!"],
            4: ["Great job! Everything correct.", "Very good – just in time!"],
            3: ["Good, but watch those mistakes.", "Decent service – one error fixed."],
            2: ["Several mistakes made it rough.", "Needs improvement – too many errors."],
            1: ["Poor service experience.", "Unacceptable – far too many mistakes."]
        };

        const text = reviewMessages[stars][Math.floor(Math.random() * reviewMessages[stars].length)];

        // Convert stars to accuracy metric for score calculation (normalized 0-1)
        const accuracyMetric = stars / 5; // normalize 1-5 stars to 0.2-1.0

        return {
            text,
            stars,
            accuracy: accuracyMetric,
            speed: speedScore,
            impact: stars >= 4 ? 'Popularity increased!' : stars === 3 ? 'Popularity unchanged' : 'Popularity decreased',
            popularityImpact: stars >= 5 ? 
                GameConfig.GAME_SETTINGS.POPULARITY_GAIN_PERFECT : 
                stars >= 4 ? GameConfig.GAME_SETTINGS.POPULARITY_GAIN_GOOD : GameConfig.GAME_SETTINGS.POPULARITY_LOSS_ERROR
        };
    }

    generateNegativeReview(reason = 'general') {
        // Calculate actual performance metrics
        const serviceTime = this.customerStartTime ? Date.now() - this.customerStartTime : 30000;
        const maxTime = this.currentCustomer?.maxPatience || 60000;
        const speedScore = Math.max(0, Math.min(1, 1 - (serviceTime / maxTime)));
        
        const reviews = {
            change: [
                { text: "Wrong change! Check your math.", stars: 2 },
                { text: "I didn't get the right change.", stars: 1 },
                { text: "Please double-check your calculations.", stars: 2 }
            ],
            general: [
                { text: "Not satisfied with the service.", stars: 2 },
                { text: "Could be better.", stars: 1 },
                { text: "Disappointing experience.", stars: 1 }
            ]
        };
        
        const reviewList = reviews[reason] || reviews.general;
        const review = reviewList[Math.floor(Math.random() * reviewList.length)];
        
        return {
            text: review.text,
            stars: review.stars,
            accuracy: reason === 'change' ? 0.0 : 0.3, // 0 for wrong change, low for other issues
            speed: speedScore,
            impact: 'Popularity decreased',
            popularityImpact: GameConfig.GAME_SETTINGS.POPULARITY_LOSS_ERROR
        };
    }

    completeTransaction(review) {
        this.currentState = 'reviewing';
        this.stopPatienceTimer();
        
        // Hide all interfaces immediately when transaction completes
        this.hideAllInterfaces();
        
        // Update statistics
        this.updateCustomerStatistics(review);
        
        // Add earnings to GameManager
        if (this.gameManager && this.currentCustomer) {
            this.gameManager.totalEarnings += this.currentCustomer.orderTotal;
            console.log(`💰 Earnings added: ${GameConfig.formatMoney(this.currentCustomer.orderTotal)}, Total: ${GameConfig.formatMoney(this.gameManager.totalEarnings)}`);
        }
        
        // Notify GameManager that customer completed
        if (this.gameManager && typeof this.gameManager.onCustomerCompleted === 'function') {
            this.gameManager.onCustomerCompleted();
        }
        
        // Show review in game
        if (this.gameManager && typeof this.gameManager.showCustomerReview === 'function') {
            this.gameManager.showCustomerReview(review);
        }
        
        // Remove customer after a minimal delay
        setTimeout(() => {
            this.removeCurrentCustomer();
        }, 100); // completes before next spawn timer in GameManager (300ms)
    }
    
    removeCurrentCustomer() {
        if (!this.currentCustomer) {
            console.log('No current customer to remove');
            return;
        }
        
        const customerName = this.currentCustomer.name;
        console.log(`🗑 Removing customer: ${customerName}`);
        
        // CRITICAL: Stop any running timers FIRST and clear all timer state
        this.stopPatienceTimer();
        
        // Extra safety: Force clear any timer references
        if (this.patienceTimer) {
            console.warn('🚨 Found lingering timer during removal - force clearing');
            clearInterval(this.patienceTimer);
            this.patienceTimer = null;
        }
        
        // Reset patience bar to empty state
        if (this.domElements.patienceFill) {
            this.domElements.patienceFill.style.width = '0%';
            this.domElements.patienceFill.classList.remove('high', 'medium', 'low', 'critical');
        }
        
        // Reset percentage display
        if (this.domElements.patiencePercentage) {
            this.domElements.patiencePercentage.textContent = '0%';
            this.domElements.patiencePercentage.style.color = '#95a5a6';
        }
        
        // Reset patience indicators (skip in new design - they don't exist)
        // Kept for compatibility but does nothing
        
        // Reset patience status
        if (this.domElements.patienceStatus) {
            this.domElements.patienceStatus.classList.remove('high', 'medium', 'low', 'critical');
            this.domElements.patienceStatus.style.background = 'rgba(149, 165, 166, 0.1)';
            this.domElements.patienceStatus.style.borderLeftColor = '#95a5a6';
        }
        
        if (this.domElements.statusIcon) {
            this.domElements.statusIcon.textContent = '😴';
        }
        
        if (this.domElements.statusText) {
            this.domElements.statusText.textContent = 'No customer';
        }
        
        // Clear patience level highlighting
        this.clearPatienceLevelHighlighting();
        
        // Remove from 3D scene and advance customer line
        if (this.currentCustomer.model && this.sceneManager && 
            typeof this.sceneManager.removeCustomer === 'function') {
            this.sceneManager.removeCustomer(this.currentCustomer.model);
        }
        
        // Advance the player customer line
        if (this.sceneManager && typeof this.sceneManager.servePlayerCustomer === 'function') {
            this.sceneManager.servePlayerCustomer();
        }
        
        // Hide customer panel and all interfaces
        this.hideCustomerPanel();
        this.hideAllInterfaces();
        this.updateSubmitTotalInline('?', false);
        
        // CRITICAL: Completely clear customer data and timer state
        if (this.currentCustomer) {
            this.currentCustomer.patienceCounter = null;
            this.currentCustomer.patienceDecrement = null;
            this.currentCustomer = null;
        }
        
        this.currentState = 'idle';
        
        // Update total customers served
        this.totalCustomersServed++;
        
        // MOBILE FIX: Force replenish customer lines immediately after customer removal
        if (this.sceneManager && typeof this.sceneManager.replenishCustomerLines === 'function') {
            console.log('📱 iPad Fix: Force replenishing customer lines after removal');
            this.sceneManager.replenishCustomerLines();
        }
        
        console.log(`✅ Customer ${customerName} removed successfully (Total served: ${this.totalCustomersServed})`);
        console.log('🧹 All timer state completely cleared');
    }

    clearPatienceLevelHighlighting() {
        try {
            const allPatienceItems = document.querySelectorAll('.patience-level-item');
            allPatienceItems.forEach(item => item.classList.remove('active'));
        } catch (error) {
            console.error('Error clearing patience level highlighting:', error);
        }
    }

    hideAllInterfaces() {
        // Hide mental math interface and reset MoneyManager
        if (this.gameManager?.moneyManager) {
            this.gameManager.moneyManager.hideMentalMathInterface();
            this.gameManager.moneyManager.hidePaymentInterface();
            this.gameManager.moneyManager.resetPayment();
        }
        
        // Hide any review panels
        if (this.gameManager) {
            this.gameManager.hideCustomerReview();
        }
        
        console.log('All interfaces hidden due to customer departure');
    }

    updateCustomerStatistics(review) {
        // Update satisfaction scores
        this.customerSatisfaction.push(review.stars);
        
        // Calculate service time
        if (this.customerStartTime) {
            const serviceTime = Date.now() - this.customerStartTime;
            this.averageServiceTime = (this.averageServiceTime + serviceTime) / 2;
        }
        
        console.log(`Customer statistics updated - Rating: ${review.stars}/5, Total served: ${this.totalCustomersServed}`);
    }

    // Public getters
    getCurrentCustomer() {
        return this.currentCustomer;
    }

    getCurrentState() {
        return this.currentState;
    }

    getCustomerPaymentAmount() {
        return this.currentCustomer?.paymentAmount || 0;
    }

    getExpectedChange() {
        return this.currentCustomer?.expectedChange || 0;
    }

    getTotalCustomersServed() {
        return this.totalCustomersServed;
    }

    getAverageRating() {
        if (this.customerSatisfaction.length === 0) return 0;
        const sum = this.customerSatisfaction.reduce((a, b) => a + b, 0);
        return sum / this.customerSatisfaction.length;
    }

    // Debug and testing methods
    skipCurrentCustomer() {
        console.log('Skipping current customer for debugging');
        this.removeCurrentCustomer();
    }

    forceCorrectCalculation() {
        if (this.currentCustomer) {
            this.onCorrectTotal(this.currentCustomer.orderTotal);
        }
    }

    // Pause and resume functionality
    pauseCustomers() {
        this.stopCustomerSpawning();
        this.stopPatienceTimer();
        console.log('Customer system paused');
    }

    resumeCustomers() {
        this.startCustomerSpawning();
        if (this.currentCustomer && this.currentState === 'ordering') {
            this.startPatienceTimer();
        }
        console.log('Customer system resumed');
    }

    resetCustomers() {
        // Clear all customer state
        this.stopCustomerSpawning();
        this.stopPatienceTimer();
        
        if (this.currentCustomer) {
            this.removeCurrentCustomer();
        }
        
        // Reset statistics
        this.totalCustomersServed = 0;
        this.averageServiceTime = 0;
        this.customerSatisfaction = [];
        
        console.log('Customer system reset');
    }

    dispose() {
        // Clean up timers and state
        this.stopCustomerSpawning();
        this.stopPatienceTimer();
        
        // Remove current customer
        if (this.currentCustomer) {
            this.removeCurrentCustomer();
        }
        
        // Clear DOM element cache
        this.domElements = {};
        
        console.log('CustomerManager disposed');
    }

    // Helper methods for personality-based patience display
    getPatienceEmoji(personalityName) {
        const emojiMap = {
            'Very Patient': '😌',
            'Patient': '😊',
            'Normal': '😐',
            'Impatient': '😤',
            'Very Impatient': '😡'
        };
        return emojiMap[personalityName] || '😐';
    }

    getPersonalityBarColor(personalityName) {
        const colorMap = {
            'Very Patient': '#27ae60',    // Green - Most calm and patient
            'Patient': '#2ecc71',         // Light Green - Patient and understanding  
            'Normal': '#f39c12',          // Orange - Average patience level
            'Impatient': '#e67e22',       // Dark Orange - Getting frustrated
            'Very Impatient': '#e74c3c'   // Red - Most urgent and impatient
        };
        return colorMap[personalityName] || '#f39c12';
    }

    // ========================================
    // SMOOTH PATIENCE TIMER SYSTEM
    // ========================================
    
    // DEBUG: Test function to manually test patience bar
    testPatienceBar() {
        console.log('🧪 Testing patience bar animation...');
        
        if (!this.domElements.patienceFill) {
            console.error('❌ Cannot test - patienceFill element not found');
            return;
        }
        
        // Show customer panel first
        if (this.domElements.customerPanel) {
            this.domElements.customerPanel.classList.add('active');
        }
        
        // Test sequence: 100% -> 75% -> 50% -> 25% -> 0%
        const testSequence = [
            { percent: 100, delay: 0 },
            { percent: 75, delay: 1000 },
            { percent: 50, delay: 2000 },
            { percent: 25, delay: 3000 },
            { percent: 0, delay: 4000 }
        ];
        
        testSequence.forEach(({ percent, delay }) => {
            setTimeout(() => {
                console.log(`🎨 Test: Setting bar to ${percent}%`);
                this.setSmoothPatienceBar(percent);
            }, delay);
        });
        
        // Reset after test
        setTimeout(() => {
            console.log('🔄 Test complete - resetting bar');
            this.setSmoothPatienceBar(0);
            if (this.domElements.customerPanel) {
                this.domElements.customerPanel.classList.remove('active');
            }
        }, 5500);
    }
    
    // Get patience decrement amount per tick (using 250ms intervals for ultra-smooth movement)
    // Values calculated to match patience guide percentages exactly
    getPersonalityPatienceDecrement(personalityName) {
        const decrementMap = {
            'Very Patient': 2.67,     // -2.67 per 250ms = ~93.75 seconds total (150% of normal)
            'Patient': 3.33,          // -3.33 per 250ms = ~75 seconds total (120% of normal)
            'Normal': 4,              // -4 per 250ms = ~62.5 seconds total (100% baseline)
            'Impatient': 5,           // -5 per 250ms = ~50 seconds total (80% of normal)
            'Very Impatient': 6.67    // -6.67 per 250ms = ~37.5 seconds total (60% of normal)
        };
        return decrementMap[personalityName] || 4;
    }

    // Get payment decrement amount (faster than ordering, maintaining personality proportions)
    getPaymentPatienceDecrement(personalityName) {
        const decrementMap = {
            'Very Patient': 5.33,     // -5.33 per 250ms = ~46.9 seconds payment time (150% of normal)
            'Patient': 6.67,          // -6.67 per 250ms = ~37.5 seconds payment time (120% of normal)
            'Normal': 8,              // -8 per 250ms = ~31.25 seconds payment time (100% baseline)
            'Impatient': 10,          // -10 per 250ms = ~25 seconds payment time (80% of normal)
            'Very Impatient': 13.33   // -13.33 per 250ms = ~18.75 seconds payment time (60% of normal)
        };
        return decrementMap[personalityName] || 8;
    }

    // ========================================
    // ZAP DAMAGE SYSTEM
    // ========================================
    
    applyZapDamage(damageAmount = 15) {
        if (!this.currentCustomer || !this.domElements.patienceBarContainer) {
            console.warn('Cannot apply zap damage - missing customer or patience bar container');
            return;
        }

        console.log(`⚡ Applying zap damage: ${damageAmount}% patience lost`);

        // Apply visual zap effect
        this.triggerZapAnimation();

        // Reduce patience counter (convert percentage to counter units)
        const counterDamage = damageAmount * 10; // 15% = 150 counter units
        this.currentCustomer.patienceCounter = Math.max(0, this.currentCustomer.patienceCounter - counterDamage);

        // The timer system will automatically handle display updates
        // No manual display updates needed - this prevents conflicts

        // Check if customer lost all patience after damage
        if (this.currentCustomer.patienceCounter <= 0) {
            // Stop timer and trigger patience loss after animation
            this.stopPatienceTimer();
            setTimeout(() => {
                this.customerLostPatience();
            }, 800); // Wait for enhanced zap animation to complete
        }
    }

    triggerZapAnimation() {
        if (!this.domElements.patienceBarContainer) return;

        // Add zap damage class to container
        this.domElements.patienceBarContainer.classList.add('zap-damage');

        // Create enhanced zap particles effect
        this.createZapParticles();

        // Remove zap class after animation completes
        setTimeout(() => {
            if (this.domElements.patienceBarContainer) {
                this.domElements.patienceBarContainer.classList.remove('zap-damage');
                // Timer handles updates automatically - no manual update needed
            }
        }, 800);
    }

    createZapParticles() {
        if (!this.domElements.patienceBarContainer) return;

        // Create multiple particle elements for enhanced effect
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'zap-particles';
            
            // Randomize particle position across the entire container
            const offsetX = (Math.random() - 0.5) * 40; // -20 to 20px
            const offsetY = (Math.random() - 0.5) * 16;  // -8 to 8px
            
            particle.style.left = `${50 + offsetX}%`;
            particle.style.top = `${50 + offsetY}%`;
            
            // Add random delay for staggered effect
            particle.style.animationDelay = `${Math.random() * 0.2}s`;
            
            this.domElements.patienceBarContainer.appendChild(particle);

            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 800);
        }
    }

    // ========================================
    // COMPATIBILITY METHODS
    // ========================================
    
    updatePatienceDisplay() {
        // This method is deprecated - the new timer system handles all updates automatically
        // Kept for compatibility but does nothing to prevent conflicts
        return;
    }
}

// Export for global access
window.CustomerManager = CustomerManager;
