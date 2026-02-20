// Farmers Market Frenzy 3D - Money Manager
class MoneyManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Cash register state
        this.registerDisplay = '';
        this.currentTotal = 0;
        this.isCalculating = false;
        
        // Payment state
        this.paymentAmount = 0;
        this.expectedChange = 0;
        this.selectedMoney = [];
        this.changeGiven = 0;
        this.isFinalizingPayment = false;

        // Responsive payment panel handlers
        this.boundResizeHandler = null;
        this.boundOrientationHandler = null;
        this.boundViewportResizeHandler = null;
        
        // DOM element cache
        this.domElements = {};
        
        // Configuration
        this.soundEnabled = GameConfig.GAME_SETTINGS.ENABLE_SOUND;
        this.masterVolume = GameConfig.GAME_SETTINGS.MASTER_VOLUME;
        
        this.init();
    }
    
    init() {
        try {
            this.cacheDOM();
            this.setupEventListeners();
            this.setupMoneySelectionInterface();
            this.clearInput();
            console.log('✅ MoneyManager initialized successfully');
        } catch (error) {
            console.error('❌ MoneyManager initialization failed:', error);
        }
    }
    
    cacheDOM() {
        // Cache all DOM elements with null checks
        this.domElements = {
            keypadDisplay: document.getElementById('keypadDisplay'),
            submitBtn: document.getElementById('submitBtn'),
            clearBtn: document.getElementById('clearBtn'),
            decimalBtn: document.getElementById('decimalBtn'),
            paymentInterface: document.getElementById('paymentInterface'),
            paymentAmount: document.getElementById('paymentAmount'),
            changeDisplay: document.getElementById('changeDisplay'),
            completeTransactionBtn: document.getElementById('completeTransactionBtn'),
            undoBtn: document.getElementById('undoBtn'),
            clearSelectionBtn: document.getElementById('clearSelectionBtn'),
            billsGrid: document.getElementById('billsGrid'),
            coinsGrid: document.getElementById('coinsGrid'),
            gameAudio: document.getElementById('gameAudio')
        };
        
        // Keypad state
        this.keypadValue = '';
        this.hasDecimal = false;
        
        // Initialize keypad display
        setTimeout(() => this.updateKeypadDisplay(), 100);
        
        // Log any missing elements for debugging
        Object.keys(this.domElements).forEach(key => {
            if (!this.domElements[key]) {
                console.warn(`MoneyManager: DOM element '${key}' not found`);
            }
        });
    }
    
    setupEventListeners() {
        // Number keypad buttons
        this.setupKeypadEventListeners();
        
        // Submit button
        if (this.domElements.submitBtn) {
            this.domElements.submitBtn.addEventListener('click', this.enterTotal.bind(this));
        }
        
        // Clear button
        if (this.domElements.clearBtn) {
            this.domElements.clearBtn.addEventListener('click', this.clearKeypad.bind(this));
        }
        
        // Decimal button
        if (this.domElements.decimalBtn) {
            this.domElements.decimalBtn.addEventListener('click', this.addDecimal.bind(this));
        }
        
        // Complete transaction button
        if (this.domElements.completeTransactionBtn) {
            this.domElements.completeTransactionBtn.addEventListener('click', this.completeTransaction.bind(this));
        }
        
        // Undo button
        if (this.domElements.undoBtn) {
            this.domElements.undoBtn.addEventListener('click', this.undoLastSelection.bind(this));
        }
        
        // Clear selection button
        if (this.domElements.clearSelectionBtn) {
            this.domElements.clearSelectionBtn.addEventListener('click', this.clearSelection.bind(this));
        }
    }
    
    setupKeypadEventListeners() {
        // Add event listeners to all number buttons with ultra-fast pointerdown handling
        const numberButtons = document.querySelectorAll('.key-btn.number');
        numberButtons.forEach(button => {
            const handlePress = (e) => {
                e.preventDefault();
                const number = e.currentTarget.dataset.number;
                this.addNumber(number);
            };
            if (window.PointerEvent) {
                button.addEventListener('pointerdown', handlePress, { passive: false });
            } else {
                button.addEventListener('touchstart', handlePress, { passive: false });
                button.addEventListener('mousedown', handlePress, { passive: false });
            }
        });
        
        // Add enhanced keyboard support for PC users
        document.addEventListener('keydown', (e) => {
            // Only handle keypad input when customer panel is visible
            const customerPanel = document.querySelector('.customer-panel.active');
            if (!customerPanel) return;
            
            // Prevent default for number keys and special keys
            if (/^[0-9]$/.test(e.key) || e.key === '.' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
            }
            
            // Handle number keys
            if (/^[0-9]$/.test(e.key)) {
                this.addNumber(e.key);
            }
            // Handle decimal point
            else if (e.key === '.') {
                this.addDecimal();
            }
            // Handle Enter (submit)
            else if (e.key === 'Enter') {
                this.enterTotal();
            }
            // Handle Escape or Backspace (clear)
            else if (e.key === 'Escape' || e.key === 'Backspace') {
                this.clearKeypad();
            }
        });
    }
    
    setupMoneySelectionInterface() {
        console.log('Setting up money selection interface...');
        
        // Try dynamic creation first, then fall back to static elements
        const dynamicSetup = this.setupDynamicMoneyElements();
        if (!dynamicSetup) {
            console.log('Dynamic setup failed, using static elements');
            this.setupStaticMoneyElements();
        }
    }

    setupDynamicMoneyElements() {
        try {
            // Setup bills
            if (this.domElements.billsGrid) {
                this.domElements.billsGrid.innerHTML = '';
                GameConfig.MONEY_SYSTEM.bills.forEach(bill => {
                    const billElement = this.createMoneyElement(bill, 'bill');
                    this.domElements.billsGrid.appendChild(billElement);
                });
                console.log(`Created ${GameConfig.MONEY_SYSTEM.bills.length} bill elements`);
            } else {
                return false;
            }
            
            // Setup coins
            if (this.domElements.coinsGrid) {
                this.domElements.coinsGrid.innerHTML = '';
                GameConfig.MONEY_SYSTEM.coins.forEach(coin => {
                    const coinElement = this.createMoneyElement(coin, 'coin');
                    this.domElements.coinsGrid.appendChild(coinElement);
                });
                console.log(`Created ${GameConfig.MONEY_SYSTEM.coins.length} coin elements`);
            } else {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Dynamic money element setup failed:', error);
            return false;
        }
    }

    setupStaticMoneyElements() {
        console.log('Setting up static money elements...');
        
        // Store references to event handlers for proper cleanup
        this.eventHandlers = this.eventHandlers || new Map();
        
        // Remove any existing click handlers first to prevent duplicates
        const existingBills = document.querySelectorAll('.bill-item');
        const existingCoins = document.querySelectorAll('.coin-item');
        
        // Remove old event listeners by cloning elements (fastest way to remove all listeners)
        [...existingBills, ...existingCoins].forEach(element => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        });
        
        // Add fast press handlers to bill elements (re-query after cloning)
        const billElements = document.querySelectorAll('.bill-item');
        billElements.forEach(billElement => {
            const value = parseFloat(billElement.dataset.value);
            const label = billElement.textContent.trim();
            const money = { value, label, color: '#27ae60' };
            const pressHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectMoney(money);
            };
            if (window.PointerEvent) {
                billElement.addEventListener('pointerdown', pressHandler, { passive: false });
            } else {
                billElement.addEventListener('touchstart', pressHandler, { passive: false });
                billElement.addEventListener('mousedown', pressHandler, { passive: false });
            }
            // Store handler for cleanup
            this.eventHandlers.set(billElement, { pointerdown: pressHandler });
        });
        
        // Add fast press handlers to coin elements (re-query after cloning)
        const coinElements = document.querySelectorAll('.coin-item');
        coinElements.forEach(coinElement => {
            const value = parseFloat(coinElement.dataset.value);
            const label = coinElement.textContent.trim();
            const money = { value, label, color: '#f39c12' };
            const pressHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectMoney(money);
            };
            if (window.PointerEvent) {
                coinElement.addEventListener('pointerdown', pressHandler, { passive: false });
            } else {
                coinElement.addEventListener('touchstart', pressHandler, { passive: false });
                coinElement.addEventListener('mousedown', pressHandler, { passive: false });
            }
            // Store handler for cleanup
            this.eventHandlers.set(coinElement, { pointerdown: pressHandler });
        });
        
        console.log(`Added fast press handlers to ${billElements.length} bills and ${coinElements.length} coins`);
    }
    
    createMoneyElement(money, type) {
        const element = document.createElement('div');
        element.className = `${type}-item`;
        element.dataset.value = money.value;
        element.textContent = money.label;
        
        // Set background color with enhanced gradients for better visibility
        if (type === 'coin') {
            // Enhanced coin colors for better cross-platform visibility
            element.style.background = `linear-gradient(135deg, ${money.color}dd, ${money.color}aa)`;
            element.style.border = '3px solid rgba(255, 255, 255, 0.3)';
            element.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)';
        } else {
            element.style.background = `linear-gradient(135deg, ${money.color}dd, ${money.color}aa)`;
        }
        
        // Add specific class for styling based on coin denomination
        if (type === 'coin') {
            switch (money.value) {
                case 0.25:
                    element.classList.add('coin-quarter');
                    // Quarter - silver color with enhanced visibility
                    element.style.background = 'linear-gradient(135deg, #c0c0c0dd, #a8a8a8aa)';
                    break;
                case 0.10:
                    element.classList.add('coin-dime');
                    // Dime - bright silver with enhanced contrast
                    element.style.background = 'linear-gradient(135deg, #dfe4eadd, #c5cdd4aa)';
                    break;
                case 0.05:
                    element.classList.add('coin-nickel');
                    // Nickel - darker silver
                    element.style.background = 'linear-gradient(135deg, #a0a0a0dd, #888888aa)';
                    break;
                case 0.01:
                    element.classList.add('coin-penny');
                    // Penny - copper color
                    element.style.background = 'linear-gradient(135deg, #b87333dd, #a0642aaa)';
                    break;
                default:
                    break;
            }
        }
        
        // Enhanced accessibility attributes for cross-platform compatibility
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `${type} ${money.label}`);
        
        // Replace click with fast pointerdown inside dynamic money element
        if (window.PointerEvent) {
            element.addEventListener('pointerdown', () => this.selectMoney(money));
        } else {
            element.addEventListener('touchstart', () => this.selectMoney(money));
            element.addEventListener('mousedown', () => this.selectMoney(money));
        }
        
        // Add keyboard support for console navigation
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectMoney(money);
            }
        });
        
        // Enhanced focus handling for consoles
        element.addEventListener('focus', () => {
            element.style.outline = '4px solid #3498db';
            element.style.outlineOffset = '4px';
            element.style.transform = 'scale(1.1)';
            element.style.zIndex = '10';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.style.transform = '';
            element.style.zIndex = '';
        });
        
        return element;
    }
    
    // Cash register operations
    showMentalMathInterface() {
        // Mental math interface was removed - functionality now in customer panel
        this.clearInput();
        
        // Automatically focus the Submit Total input for smooth user experience
        this.focusSubmitTotalInput();
    }
    
    hideMentalMathInterface() {
        // Mental math interface was removed - no action needed
    }
    
    clearInput() {
        this.keypadValue = '';
        this.hasDecimal = false;
        this.updateKeypadDisplay();
        this.currentTotal = 0;
    }
    
    updateKeypadDisplay() {
        if (this.domElements.keypadDisplay) {
            const displayValue = this.keypadValue || '0.00';
            this.domElements.keypadDisplay.textContent = displayValue;
        }
    }
    
    addNumber(number) {
        // Limit input length (max 8 characters including decimal)
        if (this.keypadValue.length >= 8) return;
        
        // If starting fresh and number is 0, don't add it unless we have a decimal
        if (this.keypadValue === '' && number === '0') {
            this.keypadValue = '0';
        } else if (this.keypadValue === '0' && !this.hasDecimal) {
            // Replace leading zero with new number
            this.keypadValue = number;
        } else {
            this.keypadValue += number;
        }
        
        this.updateKeypadDisplay();
    }
    
    addDecimal() {
        // Only allow one decimal point
        if (this.hasDecimal) return;
        
        // If empty, start with "0."
        if (this.keypadValue === '') {
            this.keypadValue = '0.';
        } else {
            this.keypadValue += '.';
        }
        
        this.hasDecimal = true;
        this.updateKeypadDisplay();
    }
    
    clearKeypad() {
        this.keypadValue = '';
        this.hasDecimal = false;
        this.updateKeypadDisplay();
        this.clearDisplayStyles();
    }
    
    clearDisplayStyles() {
        if (this.domElements.keypadDisplay) {
            this.domElements.keypadDisplay.classList.remove('error', 'success');
        }
    }
    
    // Focus the Submit Total input field for better user experience across all devices
    focusSubmitTotalInput() {
        // For keypad, we don't need to focus anything, just ensure display is ready
        this.updateKeypadDisplay();
    }
    
    // Enhanced device detection for comprehensive cross-platform support
    getDeviceInfo() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform ? navigator.platform.toLowerCase() : '';
        
        // Check for touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Gaming console detection
        const isPlayStation = /playstation/i.test(userAgent) || /ps[345]/i.test(userAgent);
        const isXbox = /xbox/i.test(userAgent);
        const isNintendo = /nintendo/i.test(userAgent) || /switch/i.test(userAgent);
        const isConsole = isPlayStation || isXbox || isNintendo;
        
        // Mobile device detection
        const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        // Tablet detection (including iPad)
        const isIPad = /ipad/i.test(userAgent) || 
                      (platform.includes('mac') && navigator.maxTouchPoints > 1);
        const isAndroidTablet = /android/i.test(userAgent) && !/mobile/i.test(userAgent);
        const isTablet = isIPad || isAndroidTablet || 
                        (hasTouch && window.innerWidth >= 768 && window.innerWidth <= 1024);
        
        // Desktop detection
        const isDesktop = !isMobileUA && !isTablet && !isConsole && !hasTouch;
        
        // Smart TV detection
        const isSmartTV = /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast/i.test(userAgent);
        
        // Screen size analysis
        const isLargeScreen = window.innerWidth >= 1920 || window.innerHeight >= 1080;
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
        
        // Determine device type
        let deviceType = 'unknown';
        if (isConsole) deviceType = 'console';
        else if (isSmartTV) deviceType = 'smart-tv';
        else if (isMobileUA && !isTablet) deviceType = 'mobile';
        else if (isTablet) deviceType = 'tablet';
        else if (isDesktop) deviceType = 'desktop';
        
        return {
            deviceType,
            platform: platform || 'unknown',
            userAgent,
            isMobile: isMobileUA && !isTablet,
            isTablet,
            isDesktop,
            isConsole,
            isSmartTV,
            isPlayStation,
            isXbox,
            isNintendo,
            hasTouch,
            isLargeScreen,
            isSmallScreen,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight
        };
    }
    
    // Enhanced mobile device detection for better cross-platform support (keeping for backward compatibility)
    isMobileOrTabletDevice() {
        const deviceInfo = this.getDeviceInfo();
        return deviceInfo.isMobile || deviceInfo.isTablet || deviceInfo.isConsole;
    }
    
    // Cross-platform functionality test
    testCrossPlatformFeatures() {
        console.log('\n🧪 CROSS-PLATFORM FUNCTIONALITY TEST 🧪');
        console.log('==========================================');
        
        const deviceInfo = this.getDeviceInfo();
        console.log('📱 Device Detection Results:');
        console.log(`   Device Type: ${deviceInfo.deviceType}`);
        console.log(`   Platform: ${deviceInfo.platform}`);
        console.log(`   Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
        console.log(`   Touch Support: ${deviceInfo.hasTouch}`);
        console.log(`   Console: ${deviceInfo.isConsole}`);
        console.log(`   Mobile: ${deviceInfo.isMobile}`);
        console.log(`   Tablet: ${deviceInfo.isTablet}`);
        console.log(`   Desktop: ${deviceInfo.isDesktop}`);
        
        // Test keypad functionality
        console.log('\n🔢 Testing Keypad:');
        if (this.domElements.keypadDisplay) {
            console.log('   ✅ Keypad display element found');
            
            // Test keypad functionality
            this.focusSubmitTotalInput();
            console.log('   🎯 Keypad test initiated');
        } else {
            console.log('   ❌ Keypad display element not found');
        }
        
        // Test coin display
        console.log('\n🪙 Testing Coin Display:');
        const coinsGrid = document.getElementById('coinsGrid');
        if (coinsGrid) {
            const coinElements = coinsGrid.querySelectorAll('.coin-item');
            console.log(`   ✅ Found ${coinElements.length} coin elements`);
            
            coinElements.forEach((coin, index) => {
                const value = coin.dataset.value;
                const label = coin.textContent;
                const styles = window.getComputedStyle(coin);
                console.log(`   🪙 Coin ${index + 1}: ${label} (${value}) - Font: ${styles.fontSize}, Color: ${styles.color}`);
            });
        } else {
            console.log('   ❌ Coins grid not found');
        }
        
        // Test platform-specific optimizations
        console.log('\n⚙️ Platform Optimizations:');
        const hasConsoleOptimizations = deviceInfo.isConsole && window.innerWidth >= 1280;
        const hasMobileOptimizations = deviceInfo.isMobile && 'ontouchstart' in window;
        const hasTabletOptimizations = deviceInfo.isTablet && window.innerWidth >= 768;
        
        console.log(`   🎮 Console optimizations: ${hasConsoleOptimizations ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   📱 Mobile optimizations: ${hasMobileOptimizations ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   📋 Tablet optimizations: ${hasTabletOptimizations ? '✅ Active' : '❌ Inactive'}`);
        
        // Test accessibility features
        console.log('\n♿ Accessibility Features:');
        if (this.domElements.submitBtn) {
            const submitBtn = this.domElements.submitBtn;
            console.log(`   🏷️ ARIA label: ${submitBtn.getAttribute('aria-label') || 'Not set'}`);
            console.log(`   ⌨️ Tabindex: ${submitBtn.getAttribute('tabindex') || 'Default'}`);
            console.log(`   🔑 Access key: ${submitBtn.getAttribute('accesskey') || 'Not set'}`);
        }
        
        console.log('\n✅ Cross-platform test completed!');
        console.log('==========================================\n');
        
        return {
            deviceInfo,
            platformSettings: GameConfig.PLATFORM_SETTINGS[deviceInfo.deviceType],
            keypadFound: !!this.domElements.keypadDisplay,
            coinsFound: !!document.getElementById('coinsGrid'),
            optimizationsActive: {
                console: hasConsoleOptimizations,
                mobile: hasMobileOptimizations,
                tablet: hasTabletOptimizations
            }
        };
    }
    
    isValidMoneyInput(input) {
        // Allow numbers with up to 2 decimal places
        const moneyRegex = /^\d+(\.\d{0,2})?$/;
        return moneyRegex.test(input) && parseFloat(input) >= 0;
    }
    
    enterTotal() {
        const inputValue = this.keypadValue.trim();
        
        if (!inputValue || !this.isValidMoneyInput(inputValue)) {
            this.showError('Please enter a valid amount');
            this.playSound('error');
            return;
        }
        
        const total = parseFloat(inputValue);
        
        if (total <= 0) {
            this.showError('Total must be greater than $0.00');
            this.playSound('error');
            return;
        }
        
        this.currentTotal = total;
        
        // Submit to customer manager for validation
        const isCorrect = this.gameManager.onTotalCalculated(total);
        
        if (isCorrect) {
            this.playSound('success');
            this.showSuccess('Correct total!');
        } else {
            this.playSound('error');
            this.shakeMathInterface();
            // Immediately clear the wrong answer for better user experience
            setTimeout(() => {
                this.clearKeypad();
                this.focusSubmitTotalInput();
            }, 800); // Short delay to let user see the shake animation
        }
    }
    
    showError(message) {
        if (this.domElements.keypadDisplay) {
            this.domElements.keypadDisplay.textContent = message;
            this.domElements.keypadDisplay.classList.add('error');
            
            setTimeout(() => {
                if (this.domElements.keypadDisplay) {
                    this.domElements.keypadDisplay.classList.remove('error');
                    this.clearKeypad();
                    this.focusSubmitTotalInput();
                }
            }, 2000);
        }
    }
    
    showSuccess(message) {
        if (this.domElements.keypadDisplay) {
            this.domElements.keypadDisplay.textContent = message;
            this.domElements.keypadDisplay.classList.add('success');
            
            setTimeout(() => {
                if (this.domElements.keypadDisplay) {
                    this.domElements.keypadDisplay.classList.remove('success');
                    this.clearKeypad();
                    // Note: Don't focus here as payment interface will be shown next
                }
            }, 1500);
        }
    }
    
    shakeMathInterface() {
        // Since mentalMathInterface was removed, shake the customer panel instead
        const customerPanel = document.querySelector('.customer-panel');
        if (customerPanel) {
            customerPanel.classList.add('animate-shake');
            setTimeout(() => {
                customerPanel.classList.remove('animate-shake');
            }, 500);
        }
    }
    
    // Payment processing
    startPaymentProcess(paymentAmount, expectedChange, orderTotal = null) {
        console.log(`🏪 Starting payment process:`);
        console.log(`  Customer paid: $${paymentAmount.toFixed(2)}`);
        console.log(`  Expected change: $${expectedChange.toFixed(2)}`);
        console.log(`  Select bills/coins to give as change...`);
        
        this.paymentAmount = paymentAmount;
        this.expectedChange = expectedChange;
        this.orderTotal = orderTotal || (paymentAmount - expectedChange); // Calculate if not provided
        
        // CRITICAL: Ensure change amount starts at exactly zero
        this.selectedMoney = [];
        this.changeGiven = 0;
        this.isFinalizingPayment = false;
        
        this.showPaymentInterface();
        this.updatePaymentDisplay();
        
        // Re-setup money selection interface to ensure click handlers are active
        this.setupStaticMoneyElements();
    }
    
    showPaymentInterface() {
        if (this.domElements.paymentInterface) {
            const panel = this.domElements.paymentInterface;
            // Ensure any previous fade-out class is removed before showing
            panel.classList.remove('fade-out');
            panel.classList.add('active');
            // Dynamically fit and center the panel between timer and scoreboard.
            this.adjustPaymentInterfacePosition();
            requestAnimationFrame(() => this.adjustPaymentInterfacePosition());
            setTimeout(() => this.adjustPaymentInterfacePosition(), 120);
            // Re-calculate when viewport geometry changes.
            if (!this.boundResizeHandler) {
                this.boundResizeHandler = () => this.adjustPaymentInterfacePosition();
                window.addEventListener('resize', this.boundResizeHandler);
            }
            if (!this.boundOrientationHandler) {
                this.boundOrientationHandler = () => this.adjustPaymentInterfacePosition();
                window.addEventListener('orientationchange', this.boundOrientationHandler);
            }
            if (window.visualViewport && !this.boundViewportResizeHandler) {
                this.boundViewportResizeHandler = () => this.adjustPaymentInterfacePosition();
                window.visualViewport.addEventListener('resize', this.boundViewportResizeHandler);
            }
        }
    }
    
    hidePaymentInterface() {
        if (this.domElements.paymentInterface) {
            const panel = this.domElements.paymentInterface;
            // Begin fade-out transition
            panel.classList.remove('active');
            panel.classList.add('fade-out');
            // After transition completes, fully reset state
            setTimeout(() => {
                panel.classList.remove('fade-out');
            }, 550); // Slightly longer than CSS transition to ensure completion
        }
        if (this.boundResizeHandler) {
            window.removeEventListener('resize', this.boundResizeHandler);
            this.boundResizeHandler = null;
        }
        if (this.boundOrientationHandler) {
            window.removeEventListener('orientationchange', this.boundOrientationHandler);
            this.boundOrientationHandler = null;
        }
        if (window.visualViewport && this.boundViewportResizeHandler) {
            window.visualViewport.removeEventListener('resize', this.boundViewportResizeHandler);
            this.boundViewportResizeHandler = null;
        }

        // Reset payment state when hiding interface to ensure clean state
        this.resetPayment();
        
        // Focus Submit Total input for the next customer (after payment interface is hidden)
        setTimeout(() => {
            this.focusSubmitTotalInput();
        }, 600); // Delay to ensure payment interface is fully hidden
    }
    
    updatePaymentDisplay() {
        if (this.domElements.paymentAmount) {
            this.domElements.paymentAmount.textContent = `Customer paid: ${GameConfig.formatMoney(this.paymentAmount)}`;
        }
        
        // Update order total display in red
        const orderTotalDisplay = document.getElementById('orderTotalDisplay');
        if (orderTotalDisplay && this.orderTotal) {
            orderTotalDisplay.textContent = `Order Total: ${GameConfig.formatMoney(this.orderTotal)}`;
        }
        
        // Calculate current change being given (this is what the user is selecting)
        // ENSURE this starts at exactly 0.00 when no money is selected
        const totalChangeSelected = this.selectedMoney.length > 0 
            ? this.selectedMoney.reduce((sum, money) => sum + money.value, 0) 
            : 0;
        
        if (this.domElements.changeDisplay) {
            this.domElements.changeDisplay.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold; color: #34495e;">
                    Total Change: ${GameConfig.formatMoney(totalChangeSelected)}
                </div>
            `;
        }
        
        // Update button states
        this.updateButtonStates();

        // Keep the full payment UI (including Submit button) visible after content updates.
        this.adjustPaymentInterfacePosition();
    }

    updateButtonStates() {
        // Enable/disable undo button based on selection history
        if (this.domElements.undoBtn) {
            this.domElements.undoBtn.disabled = this.selectedMoney.length === 0;
        }
        
        // Enable/disable clear button based on selection
        if (this.domElements.clearSelectionBtn) {
            this.domElements.clearSelectionBtn.disabled = this.selectedMoney.length === 0;
        }
        
        // Keep complete button neutral - don't give away the answer!
        if (this.domElements.completeTransactionBtn) {
            // Always show the same appearance regardless of correctness
            this.domElements.completeTransactionBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            this.domElements.completeTransactionBtn.textContent = 'Submit Change';
        }
    }
    
    selectMoney(money) {
        console.log(`💰 Change money selected: ${money.label} ($${money.value})`);
        
        if (!money || typeof money.value !== 'number') {
            console.error('Invalid money object:', money);
            return;
        }
        
        // Add to selection immediately without any delays
        this.selectedMoney.push(money);
        
        const totalChangeSelected = this.selectedMoney.reduce((sum, m) => sum + m.value, 0);
        console.log(`Total change selected: $${totalChangeSelected.toFixed(2)}`);
        console.log(`Expected change: $${this.expectedChange.toFixed(2)}`);
        
        // Update display immediately
        this.updatePaymentDisplay();
        // Removed ripple animation for faster clicking - this.highlightMoneySelection(money);
        this.playSound('register');
        
        // Removed annoying popup feedback - users can see their selection in the display
    }

    showSelectionFeedback(money, action = 'Selected') {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            font-size: 1.2rem;
        `;
        feedback.textContent = `${action}: ${money.label}`;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1000);
    }

    undoLastSelection() {
        if (this.selectedMoney.length === 0) {
            console.log('No money to undo');
            return;
        }
        
        const lastMoney = this.selectedMoney.pop();
        console.log(`🔄 Undoing selection: ${lastMoney.label} ($${lastMoney.value})`);
        
        this.updatePaymentDisplay();
        this.playSound('register');
        
        // Removed undo feedback popup - users can see the change in the display
    }

    showUndoFeedback(money) {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(243, 156, 18, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            font-size: 1.2rem;
        `;
        feedback.textContent = `↶ Removed: ${money.label}`;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1000);
    }
    
    // Removed highlightMoneySelection and addRippleEffect methods for faster clicking
    // Users can see their selections in the Total Change display instead
    
    completeTransaction() {
        if (this.isFinalizingPayment) {
            return;
        }

        const totalChangeGiven = this.selectedMoney.reduce((sum, money) => sum + money.value, 0);
        
        console.log(`💰 Transaction Summary:`);
        console.log(`  Customer paid: $${this.paymentAmount.toFixed(2)}`);
        console.log(`  Expected change: $${this.expectedChange.toFixed(2)}`);
        console.log(`  Change given: $${totalChangeGiven.toFixed(2)}`);
        
        if (Math.abs(totalChangeGiven - this.expectedChange) <= GameConfig.GAME_SETTINGS.MONEY_TOLERANCE) {
            this.onCorrectChange();
        } else {
            this.showChangeError();
        }
    }
    
    onCorrectChange() {
        if (this.isFinalizingPayment) {
            return;
        }
        this.isFinalizingPayment = true;
        const processedChange = this.expectedChange;

        this.playSound('success');
        // Removed success popup – keep money bag animation only
        this.addSuccessParticles();

        // Briefly show explicit success confirmation before closing.
        this.showTransactionSuccess('✅ Correct change submitted!');

        // Hide payment interface after short confirmation.
        setTimeout(() => {
            this.hidePaymentInterface();
        }, 220);

        // Notify GameManager using the captured value before reset.
        setTimeout(() => {
            try {
                if (this.gameManager && typeof this.gameManager.onPaymentProcessed === 'function') {
                    this.gameManager.onPaymentProcessed(processedChange);
                }
            } finally {
                this.isFinalizingPayment = false;
            }
        }, 500);
    }
    
    showChangeError() {
        const totalChangeGiven = this.selectedMoney.reduce((sum, money) => sum + money.value, 0);
        
        this.playSound('error');
        
        // Apply zap damage through CustomerManager for incorrect change (retry version)
        if (this.gameManager && this.gameManager.customerManager) {
            this.gameManager.customerManager.onIncorrectChangeRetry(totalChangeGiven, this.expectedChange);
        }
        
        // Add error styling to change display
        if (this.domElements.changeDisplay) {
            this.domElements.changeDisplay.classList.add('error');
            this.domElements.changeDisplay.innerHTML = `
                <div style="font-size: 1.2rem; color: #e74c3c; font-weight: bold;">
                    ❌ Incorrect Change!
                </div>
                <div style="font-size: 1rem; margin-top: 5px; color: #e74c3c;">
                    Try again - calculate the correct change
                </div>
                <div style="font-size: 0.95rem; margin-top: 6px; color: #2c3e50; font-weight: 700;">
                    Correct Change: ${GameConfig.formatMoney(this.expectedChange)}
                </div>
            `;
            this.adjustPaymentInterfacePosition();
            
            setTimeout(() => {
                if (this.domElements.changeDisplay) {
                    this.domElements.changeDisplay.classList.remove('error');
                    this.updatePaymentDisplay();
                }
            }, 3000);
        }
    }
    
    showTransactionSuccess(message = '✓ Correct change!', hint = null) {
        // Skip default congratulatory popup – money bag animation already gives feedback
        if (message.trim().startsWith('✓')) {
            return; // suppress
        }

        if (this.domElements.changeDisplay) {
            this.domElements.changeDisplay.classList.add('success');
            this.domElements.changeDisplay.textContent = message;
            this.adjustPaymentInterfacePosition();
            
            if (hint) {
                setTimeout(() => {
                    if (this.domElements.changeDisplay) {
                        this.domElements.changeDisplay.textContent += ` (${hint})`;
                        this.adjustPaymentInterfacePosition();
                    }
                }, 1000);
            }
        }
    }
    
    addSuccessParticles() {
        // Create success particle effect - money bags falling down to Total Earnings
        if (this.domElements.paymentInterface) {
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const particle = document.createElement('div');
                    particle.className = 'success-particle';
                    particle.textContent = '💰';
                    
                    // Start from center and fall straight down towards Total Earnings
                    particle.style.position = 'fixed';
                    particle.style.left = (45 + Math.random() * 10) + '%'; // Center area with slight variation
                    particle.style.top = '40%'; // Start from middle of screen
                    particle.style.fontSize = '2rem';
                    particle.style.zIndex = '10000';
                    particle.style.pointerEvents = 'none';
                    particle.style.animation = `moneyFallDown 2s ease-in forwards`;
                    particle.style.animationDelay = Math.random() * 0.5 + 's';
                    
                    document.body.appendChild(particle);
                    
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, 2500);
                }, i * 100);
            }
        }
    }
    
    // Helper methods
    calculateOptimalChange(amount) {
        return GameConfig.calculateOptimalChange(amount);
    }
    
    getChangeBreakdown() {
        const totalSelected = this.selectedMoney.reduce((sum, money) => sum + money.value, 0);
        const change = totalSelected - this.paymentAmount;
        return GameConfig.getChangeBreakdown(change);
    }
    
    validateChangeAmount(given, expected) {
        // Add null checks and handle edge cases
        if (typeof given !== 'number' || typeof expected !== 'number') {
            console.warn('Invalid input to validateChangeAmount:', { given, expected });
            return false;
        }
        
        if (isNaN(given) || isNaN(expected)) {
            console.warn('NaN detected in validateChangeAmount:', { given, expected });
            return false;
        }
        
        // Round to 2 decimal places to handle floating point precision issues
        const roundedGiven = Math.round(given * 100) / 100;
        const roundedExpected = Math.round(expected * 100) / 100;
        
        const tolerance = GameConfig.GAME_SETTINGS.MONEY_TOLERANCE || 0.01;
        return Math.abs(roundedGiven - roundedExpected) <= tolerance;
    }
    
    clearSelection() {
        if (this.selectedMoney.length === 0) {
            console.log('No money to clear');
            return;
        }
        
        console.log('🗑️ Clearing all change selections...');
        this.selectedMoney = [];
        this.updatePaymentDisplay();
        
        // Show feedback
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(231, 76, 60, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            font-size: 1.2rem;
        `;
        feedback.textContent = '🗑️ All Change Cleared';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1000);
    }

    resetPayment() {
        this.paymentAmount = 0;
        this.expectedChange = 0;
        this.selectedMoney = [];
        this.changeGiven = 0;
        this.updatePaymentDisplay();
    }
    
    // Audio methods
    playSound(type) {
        if (!this.soundEnabled || !this.domElements.gameAudio) return;
        
        try {
            // Use the consolidated audio element for all sound types
            this.domElements.gameAudio.volume = this.masterVolume;
            this.domElements.gameAudio.currentTime = 0;
            
            // Play the sound
            const playPromise = this.domElements.gameAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Audio play failed:', error);
                });
            }
        } catch (error) {
            console.warn('Audio playback error:', error);
        }
    }
    
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume / 100));
    }
    
    // Educational helpers
    showChangeHint() {
        const breakdown = this.getChangeBreakdown();
        let hint = 'Optimal change: ';
        breakdown.forEach(item => {
            hint += `${item.count}x ${item.label} `;
        });
        console.log(hint);
        
        // Show hint in UI if needed
        this.showTransactionSuccess('💡 Hint shown in console', hint);
    }
    
    highlightCorrectMoney() {
        // Highlight the correct money denominations for the change
        const breakdown = this.getChangeBreakdown();
        breakdown.forEach(item => {
            const elements = document.querySelectorAll(`[data-value="${item.value}"]`);
            elements.forEach(element => {
                element.classList.add('highlight-correct');
                setTimeout(() => {
                    element.classList.remove('highlight-correct');
                }, 3000);
            });
        });
    }
    
    // Debug and testing methods
    autoCompletePayment() {
        // For debugging: automatically complete payment with correct change
        this.selectedMoney = this.calculateOptimalChange(this.expectedChange);
        this.updatePaymentDisplay();
        this.completeTransaction();
    }
    
    getPaymentState() {
        return {
            paymentAmount: this.paymentAmount,
            expectedChange: this.expectedChange,
            selectedMoney: this.selectedMoney,
            totalSelected: this.selectedMoney.reduce((sum, money) => sum + money.value, 0)
        };
    }
    
    // Cleanup and reset
    resetAll() {
        this.clearInput();
        this.resetPayment();
        this.hideMentalMathInterface();
        this.hidePaymentInterface();
    }
    
    setDifficulty(difficulty) {
        // Update available coins based on difficulty
        this.updateCoinsForDifficulty(difficulty);
    }

    updateCoinsForDifficulty(difficulty) {
        const allowedCoins = GameConfig.getAvailableCoinsForDifficulty(difficulty);
        
        if (this.domElements.coinsGrid) {
            // Hide coins not allowed in this difficulty
            const coinElements = this.domElements.coinsGrid.querySelectorAll('.coin-item');
            coinElements.forEach(element => {
                const value = parseFloat(element.dataset.value);
                if (allowedCoins.some(c => c.value === value)) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            });
        }
        
        // Show or hide entire coins section/container based on availability
        const coinsSection = this.domElements.coinsGrid?.closest('.coins-section');
        if (coinsSection) {
            coinsSection.style.display = allowedCoins.length > 0 ? 'block' : 'none';
        }
    }

    dispose() {
        console.log('🧹 Disposing MoneyManager...');
        
        // Clear any running timers or intervals
        // (Add any timer cleanup here if needed)
        
        // Remove event listeners to prevent memory leaks
        if (this.eventHandlers) {
            this.eventHandlers.forEach((handlers, element) => {
                if (element && element.parentNode) {
                    Object.entries(handlers).forEach(([event, handler]) => {
                        element.removeEventListener(event, handler);
                    });
                }
            });
            this.eventHandlers.clear();
        }
        
        // Clear DOM element references
        Object.keys(this.domElements).forEach(key => {
            this.domElements[key] = null;
        });
        
        // Clear state
        this.selectedMoney = [];
        this.paymentAmount = 0;
        this.expectedChange = 0;
        this.changeGiven = 0;
        
        // Clear game manager reference
        this.gameManager = null;
        
        console.log('✅ MoneyManager disposed successfully');
    }

    /**
     * Keeps the payment panel centered and fully visible between top timer and
     * bottom scoreboard by applying a dynamic fit scale.
     */
    adjustPaymentInterfacePosition() {
        const panel = this.domElements.paymentInterface;
        if (!panel) return;
        if (!panel.classList.contains('active')) return;

        const viewportWidth = Math.max(window.innerWidth || 0, 1);
        const viewportHeight = Math.max(window.innerHeight || 0, 1);
        const horizontalMargin = Math.max(8, Math.round(viewportWidth * 0.02));
        const verticalMargin = Math.max(8, Math.round(viewportHeight * 0.02));

        const scoreboard = document.getElementById('scoringPanel');
        const timer = document.getElementById('timerDisplay');
        const scoreboardRect = scoreboard ? scoreboard.getBoundingClientRect() : null;
        const timerRect = timer ? timer.getBoundingClientRect() : null;

        let availableTop = (timerRect?.bottom ?? 0) + verticalMargin;
        let availableBottom = (scoreboardRect?.top ?? viewportHeight) - verticalMargin;

        if (!Number.isFinite(availableTop)) availableTop = verticalMargin;
        if (!Number.isFinite(availableBottom)) availableBottom = viewportHeight - verticalMargin;

        // Fallback to full viewport when upper/lower HUDs leave no usable gap.
        if (availableBottom - availableTop < 120) {
            availableTop = verticalMargin;
            availableBottom = viewportHeight - verticalMargin;
        }

        const availableHeight = Math.max(availableBottom - availableTop, 1);
        const availableWidth = Math.max(viewportWidth - horizontalMargin * 2, 1);

        // Use full scroll dimensions so overflowing content (error/help text, buttons)
        // is included in fit calculations and remains reachable.
        const panelWidth = Math.max(
            panel.scrollWidth || 0,
            panel.offsetWidth || 0,
            panel.getBoundingClientRect().width || 0,
            1
        );
        const panelHeight = Math.max(
            panel.scrollHeight || 0,
            panel.offsetHeight || 0,
            panel.getBoundingClientRect().height || 0,
            1
        );

        let fitScale = Math.min(1, availableWidth / panelWidth, availableHeight / panelHeight);
        if (!Number.isFinite(fitScale) || fitScale <= 0) fitScale = 1;

        const desiredCenterY = availableTop + availableHeight / 2;
        const scaledHalfHeight = (panelHeight * fitScale) / 2;
        const minCenterY = verticalMargin + scaledHalfHeight;
        const maxCenterY = viewportHeight - verticalMargin - scaledHalfHeight;
        const centerY = Math.max(minCenterY, Math.min(maxCenterY, desiredCenterY));

        panel.style.setProperty('--payment-fit-scale', fitScale.toFixed(4));
        panel.style.setProperty('--payment-center-x', '50%');
        panel.style.setProperty('--payment-center-y', `${centerY.toFixed(2)}px`);
    }
}

// Add CSS animations for particles and effects
const style = document.createElement('style');
style.textContent = `
    /* Removed ripple animation for faster clicking */
    
    @keyframes particlesBurst {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
        }
    }
    
    @keyframes moneyFallDown {
        0% {
            transform: translateX(0) translateY(0) scale(0.5);
            opacity: 1;
        }
        20% {
            transform: translateX(0) translateY(50px) scale(1.2);
            opacity: 1;
        }
        60% {
            transform: translateX(0) translateY(200px) scale(1);
            opacity: 0.9;
        }
        100% {
            transform: translateX(0) translateY(400px) scale(0.8);
            opacity: 0;
        }
    }
    
    .total-input.error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 10px rgba(231, 76, 60, 0.3) !important;
    }
    
    .total-input.success {
        border-color: #27ae60 !important;
        box-shadow: 0 0 10px rgba(39, 174, 96, 0.3) !important;
    }
    
    .change-display.error {
        color: #e74c3c !important;
        font-weight: bold;
    }
    
    .change-display.success {
        color: #27ae60 !important;
        font-weight: bold;
    }
    
    .change-display.hint {
        color: #3498db !important;
        font-style: italic;
    }
    
    /* Removed highlight styles for faster clicking */
    
    .complete-transaction-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

document.head.appendChild(style);

// Export for global access
window.MoneyManager = MoneyManager;
