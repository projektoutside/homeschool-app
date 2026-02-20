class SettingsManager {
    constructor() {
        this.isInitialized = false;
        this.currentEditingItem = null;
        // Initialize data structures - load data in initialize() method
        this.customItems = [];
        this.deletedDefaultItems = [];
        this.gameSettings = {};
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load data first
            this.customItems = this.loadCustomItems();
            this.deletedDefaultItems = this.loadDeletedDefaultItems();
            this.gameSettings = this.loadGameSettings();
            
            this.setupEventListeners();
            this.loadItemsIntoSettings();
            this.loadGeneralSettings();
            
            // Ensure timer settings are immediately available globally
            this.makeTimerSettingsGloballyAvailable();
            
            this.isInitialized = true;
            console.log('✅ SettingsManager initialized successfully');
        } catch (error) {
            console.error('❌ SettingsManager initialization failed:', error);
        }
    }

    setupEventListeners() {
        // Settings panel controls
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        }

        // Close settings when clicking outside
        if (settingsPanel) {
            settingsPanel.addEventListener('click', (e) => {
                if (e.target === settingsPanel) {
                    this.closeSettings();
                }
            });
        }

        // Tab switching
        const settingsTabs = document.querySelectorAll('.settings-tab');
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Item management
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.openItemEditor());
        }

        // Item editor modal
        const closeItemEditorBtn = document.getElementById('closeItemEditorBtn');
        const cancelItemBtn = document.getElementById('cancelItemBtn');
        const saveItemBtn = document.getElementById('saveItemBtn');
        const deleteItemBtn = document.getElementById('deleteItemBtn');
        const itemEditorModal = document.getElementById('itemEditorModal');

        if (closeItemEditorBtn) {
            closeItemEditorBtn.addEventListener('click', () => this.closeItemEditor());
        }

        if (cancelItemBtn) {
            cancelItemBtn.addEventListener('click', () => this.closeItemEditor());
        }

        if (saveItemBtn) {
            saveItemBtn.addEventListener('click', () => this.saveItem());
        }

        if (deleteItemBtn) {
            deleteItemBtn.addEventListener('click', () => this.deleteItem());
        }

        if (itemEditorModal) {
            itemEditorModal.addEventListener('click', (e) => {
                if (e.target === itemEditorModal) {
                    this.closeItemEditor();
                }
            });
        }

        // Seasonal checkbox toggle
        const seasonalCheckbox = document.getElementById('itemSeasonalCheckbox');
        if (seasonalCheckbox) {
            seasonalCheckbox.addEventListener('change', () => this.toggleSeasonalOptions());
        }

        // Unified timer slider with real-time preview
        const unifiedTimerSlider = document.getElementById('unifiedTimerSlider');
        if (unifiedTimerSlider) {
            unifiedTimerSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const display = document.getElementById('timerValueDisplay');
                if (display) {
                    display.textContent = `${value} minute${value !== 1 ? 's' : ''}`;
                    
                    // Add visual feedback for real-time preview
                    display.style.color = '#3498db';
                    display.style.fontWeight = 'bold';
                    display.style.transform = 'scale(1.05)';
                    display.style.transition = 'all 0.2s ease';
                    
                    // Reset styling after a short delay
                    setTimeout(() => {
                        display.style.color = '';
                        display.style.fontWeight = '';
                        display.style.transform = '';
                    }, 200);
                }
                
                console.log(`⏰ Timer preview: ${value} minute${value !== 1 ? 's' : ''} for all game modes`);
            });
        }

        // Timer preset buttons
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = parseFloat(e.target.dataset.time);
                const slider = document.getElementById('unifiedTimerSlider');
                const display = document.getElementById('timerValueDisplay');
                
                if (slider) {
                    slider.value = time;
                }
                if (display) {
                    display.textContent = `${time} minute${time !== 1 ? 's' : ''}`;
                }
            });
        });

        // Save settings
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // General settings buttons
        const resetGameBtn = document.getElementById('resetGameBtn');
        const exportDataBtn = document.getElementById('exportDataBtn');
        const importDataBtn = document.getElementById('importDataBtn');

        if (resetGameBtn) {
            resetGameBtn.addEventListener('click', () => this.resetGameData());
        }

        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        }

        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => this.importData());
        }


    }

    openSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.add('active');
            this.loadItemsIntoSettings();
        }
    }

    closeSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.remove('active');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Tab`);
        });
    }

    loadItemsIntoSettings() {
        const categories = ['vegetables', 'fruits', 'baked_goods', 'preserves'];
        
        categories.forEach(category => {
            const listElement = document.getElementById(`${category}List`);
            if (!listElement) return;

            listElement.innerHTML = '';

            // Get items for this category
            const categoryItems = this.getAllItemsForCategory(category);
            
            categoryItems.forEach(item => {
                const itemCard = this.createItemCard(item);
                listElement.appendChild(itemCard);
            });
        });
    }

    getAllItemsForCategory(category) {
        // Get default items from GameConfig
        const defaultItems = window.GameConfig?.MARKET_ITEMS?.[category] || [];
        
        // Filter out deleted default items
        const filteredDefaultItems = defaultItems.filter(item => 
            !this.isItemDeleted(item)
        );
        
        // Get custom items for this category
        const customItems = this.customItems.filter(item => item.category === category);
        
        // Combine and return
        return [...filteredDefaultItems, ...customItems];
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        const isCustom = !this.isDefaultItem(item);
        
        card.innerHTML = `
            <div class="item-card-header">
                <div class="item-emoji">${item.emoji}</div>
                <div class="item-actions">
                    <button class="edit-item-btn" title="Edit Item">✏️</button>
                    <button class="delete-item-btn" title="Delete Item">[X]</button>
                </div>
            </div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">$${item.basePrice.toFixed(2)}</div>
        `;

        // Add event listeners
        const editBtn = card.querySelector('.edit-item-btn');
        const deleteBtn = card.querySelector('.delete-item-btn');

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editItem(item);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteItem(item);
            });
        }

        return card;
    }

    isDefaultItem(item) {
        // Check if item exists in default GameConfig items
        const defaultItems = window.GameConfig?.MARKET_ITEMS || {};
        
        for (const category of Object.keys(defaultItems)) {
            const categoryItems = defaultItems[category] || [];
            const found = categoryItems.find(defaultItem => 
                defaultItem.name === item.name && 
                defaultItem.emoji === item.emoji &&
                defaultItem.category === item.category
            );
            if (found) {
                return true;
            }
        }
        return false;
    }

    openItemEditor(item = null) {
        const modal = document.getElementById('itemEditorModal');
        if (!modal) {
            console.error('Item editor modal not found');
            return;
        }

        this.currentEditingItem = item;
        
        if (item) {
            this.populateItemForm(item);
        } else {
            this.clearItemForm();
        }
        
        modal.classList.add('active');
    }

    closeItemEditor() {
        const modal = document.getElementById('itemEditorModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentEditingItem = null;
    }

    populateItemForm(item) {
        document.getElementById('itemNameInput').value = item.name || '';
        document.getElementById('itemEmojiInput').value = item.emoji || '';
        document.getElementById('itemPriceInput').value = item.basePrice || '';
        document.getElementById('itemCategorySelect').value = item.category || 'vegetables';
        
        const seasonalCheckbox = document.getElementById('itemSeasonalCheckbox');
        seasonalCheckbox.checked = item.seasonal || false;
        
        this.toggleSeasonalOptions();
        
        if (item.seasonal && item.seasons) {
            const seasonCheckboxes = document.querySelectorAll('.season-checkboxes input');
            seasonCheckboxes.forEach(checkbox => {
                checkbox.checked = item.seasons.includes(checkbox.value);
            });
        }
    }

    clearItemForm() {
        document.getElementById('itemNameInput').value = '';
        document.getElementById('itemEmojiInput').value = '';
        document.getElementById('itemPriceInput').value = '';
        document.getElementById('itemCategorySelect').value = 'vegetables';
        document.getElementById('itemSeasonalCheckbox').checked = false;
        
        this.toggleSeasonalOptions();
        
        const seasonCheckboxes = document.querySelectorAll('.season-checkboxes input');
        seasonCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    toggleSeasonalOptions() {
        const seasonalCheckbox = document.getElementById('itemSeasonalCheckbox');
        const seasonalOptions = document.getElementById('seasonalOptions');
        
        if (seasonalOptions) {
            seasonalOptions.style.display = seasonalCheckbox.checked ? 'block' : 'none';
        }
    }

    editItem(item) {
        this.openItemEditor(item);
    }

    confirmDeleteItem(item) {
        const isDefault = this.isDefaultItem(item);
        const message = isDefault 
            ? `Are you sure you want to remove "${item.name}" from your market? (This will hide it from the game)`
            : `Are you sure you want to delete "${item.name}"?`;
            
        if (confirm(message)) {
            if (isDefault) {
                this.addToDeletedDefaults(item);
            } else {
                this.removeCustomItem(item);
            }
            this.loadItemsIntoSettings();
            this.updateGameItems();
        }
    }

    saveItem() {
        const name = document.getElementById('itemNameInput').value.trim();
        const emoji = document.getElementById('itemEmojiInput').value.trim();
        const price = parseFloat(document.getElementById('itemPriceInput').value);
        const category = document.getElementById('itemCategorySelect').value;
        const seasonal = document.getElementById('itemSeasonalCheckbox').checked;

        // Validation
        if (!name || !emoji || !price || price <= 0) {
            alert('Please fill in all required fields with valid values.');
            return;
        }

        const seasons = [];
        if (seasonal) {
            const seasonCheckboxes = document.querySelectorAll('.season-checkboxes input:checked');
            seasonCheckboxes.forEach(checkbox => {
                seasons.push(checkbox.value);
            });
            
            if (seasons.length === 0) {
                alert('Please select at least one season for seasonal items.');
                return;
            }
        }

        const itemData = {
            name,
            emoji,
            basePrice: price,
            category,
            seasonal,
            seasons: seasonal ? seasons : undefined
        };

        if (this.currentEditingItem) {
            // Editing existing item
            if (this.isDefaultItem(this.currentEditingItem)) {
                // Create custom version of default item
                this.addCustomItem(itemData);
            } else {
                // Update existing custom item
                this.updateCustomItem(this.currentEditingItem, itemData);
            }
        } else {
            // Adding new item
            this.addCustomItem(itemData);
        }

        this.closeItemEditor();
        this.loadItemsIntoSettings();
        this.updateGameItems();
    }

    deleteItem() {
        if (this.currentEditingItem && !this.isDefaultItem(this.currentEditingItem)) {
            if (confirm(`Are you sure you want to delete "${this.currentEditingItem.name}"?`)) {
                this.removeCustomItem(this.currentEditingItem);
                this.closeItemEditor();
                this.loadItemsIntoSettings();
                this.updateGameItems();
            }
        }
    }

    addCustomItem(item) {
        // Add unique ID
        item.id = Date.now().toString();
        this.customItems.push(item);
        this.saveCustomItems();
    }

    updateCustomItem(oldItem, newItem) {
        const index = this.customItems.findIndex(item => 
            item.name === oldItem.name && item.emoji === oldItem.emoji
        );
        
        if (index !== -1) {
            this.customItems[index] = { ...newItem, id: this.customItems[index].id };
            this.saveCustomItems();
        }
    }

    removeCustomItem(item) {
        this.customItems = this.customItems.filter(customItem => 
            !(customItem.name === item.name && customItem.emoji === item.emoji)
        );
        this.saveCustomItems();
    }

    updateGameItems() {
        // Update the game's product manager if it exists
        if (window.gameManager?.productManager) {
            window.gameManager.productManager.refreshItems();
        }
    }

    loadGeneralSettings() {
        console.log('📂 Loading general settings into form...');
        
        // Load general settings into the form
        document.getElementById('enableSoundSetting').checked = this.gameSettings.enableSound;
        document.getElementById('volumeSetting').value = this.gameSettings.volume;
        document.getElementById('enableAnimationsSetting').checked = this.gameSettings.enableAnimations;
        document.getElementById('showHintsSetting').checked = this.gameSettings.showHints;
        
        // Load timer settings
        document.getElementById('enableTimerSetting').checked = this.gameSettings.enableTimer;
        document.getElementById('timerWarningSetting').checked = this.gameSettings.timerWarning;
        
        console.log('⏰ Timer settings loaded:', {
            enableTimer: this.gameSettings.enableTimer,
            timerWarning: this.gameSettings.timerWarning
        });
        
        // Load unified timer setting
        const unifiedTimer = this.gameSettings.unifiedTimer || 5;
        const slider = document.getElementById('unifiedTimerSlider');
        const display = document.getElementById('timerValueDisplay');
        
        if (slider) {
            slider.value = unifiedTimer;
            console.log(`✅ Unified timer slider loaded: ${unifiedTimer} minutes`);
        }
        
        if (display) {
            display.textContent = `${unifiedTimer} minute${unifiedTimer !== 1 ? 's' : ''}`;
        }
        
        // Load game mode timer settings - elements are not present in the UI
        // Timer values are managed through the unified timer slider
        console.log('🎮 Game mode timer settings are managed through unified timer');
    }

    saveSettings() {
        console.log('💾 Saving settings...');
        
        // Get unified timer value
        const unifiedTimer = parseFloat(document.getElementById('unifiedTimerSlider')?.value || 5);
        
        // Save general settings with unified timer
        this.gameSettings = {
            enableSound: document.getElementById('enableSoundSetting').checked,
            volume: parseInt(document.getElementById('volumeSetting').value),
            enableAnimations: document.getElementById('enableAnimationsSetting').checked,
            showHints: document.getElementById('showHintsSetting').checked,
            enableTimer: document.getElementById('enableTimerSetting').checked,
            timerWarning: document.getElementById('timerWarningSetting').checked,
            unifiedTimer: unifiedTimer,
            gameModeTimers: {
                progressive: unifiedTimer,
                single: unifiedTimer,
                vs: unifiedTimer,
                custom: unifiedTimer
            }
        };

        console.log('📊 Timer settings to be saved:', {
            enableTimer: this.gameSettings.enableTimer,
            timerWarning: this.gameSettings.timerWarning,
            unifiedTimer: this.gameSettings.unifiedTimer,
            gameModeTimers: this.gameSettings.gameModeTimers
        });

        this.saveGameSettings();
        this.closeSettings();
        
        // Update timer settings immediately for both main game and any running games
        this.applyTimerSettingsToAllInstances(unifiedTimer);
        
        console.log('✅ Timer settings saved and applied successfully!');
    }
    
    applyTimerSettingsToAllInstances(unifiedTimer) {
        console.log('🔄 Applying timer settings to all game instances...');
        
        const durationSeconds = unifiedTimer * 60; // Convert to seconds
        const gameInstances = [
            window.gameManager,
            window.main?.gameManager
        ].filter(instance => instance && instance.timerManager);
        
        if (gameInstances.length === 0) {
            console.log('ℹ️ No timer managers available - settings will be applied when games start');
            return;
        }
        
        gameInstances.forEach((gameManager, index) => {
            console.log(`🎮 Updating timer settings for game instance ${index + 1}...`);
            const timerManager = gameManager.timerManager;
            
            // Apply basic timer settings
            timerManager.setEnabled(this.gameSettings.enableTimer);
            timerManager.setWarningEnabled(this.gameSettings.timerWarning);
            
            // Refresh all settings to ensure everything is in sync
            if (typeof timerManager.refreshSettings === 'function') {
                timerManager.refreshSettings();
            }
            
            console.log(`✅ Instance ${index + 1} - Timer enabled: ${this.gameSettings.enableTimer}`);
            console.log(`✅ Instance ${index + 1} - Timer warning enabled: ${this.gameSettings.timerWarning}`);
            
            // Update all game mode timers with unified value
            Object.keys(this.gameSettings.gameModeTimers).forEach(mode => {
                console.log(`🔄 Instance ${index + 1} - Setting ${mode} mode timer to ${unifiedTimer} minutes (${durationSeconds} seconds)`);
                timerManager.setGameModeTimer(mode, durationSeconds);
                
                // Verify the setting was applied
                const currentSettings = timerManager.getGameModeSettings(mode);
                if (currentSettings) {
                    console.log(`✅ Instance ${index + 1} - ${mode} mode timer verified: ${Math.floor(currentSettings.duration/60)}:${(currentSettings.duration%60).toString().padStart(2,'0')}`);
                } else {
                    console.warn(`⚠️ Instance ${index + 1} - Failed to verify ${mode} mode timer settings`);
                }
            });
            
            // If timer is currently running, apply the new settings immediately
            if (timerManager.isTimerRunning()) {
                const currentMode = timerManager.getCurrentGameMode();
                const wasRunning = timerManager.isTimerRunning();
                const wasPaused = timerManager.isTimerPaused();
                
                console.log(`⏰ Instance ${index + 1} - Timer is running in ${currentMode} mode - applying new duration immediately`);
                
                // Update the current game mode to ensure it uses the new duration
                timerManager.setGameMode(currentMode);
                
                // If the timer was running and not paused, restart it with the new duration
                if (wasRunning && !wasPaused) {
                    console.log(`🔄 Instance ${index + 1} - Restarting timer with new duration`);
                    timerManager.stopTimer();
                    
                    // Small delay to ensure clean restart
                    setTimeout(() => {
                        timerManager.startTimer(null, currentMode);
                        console.log(`✅ Instance ${index + 1} - Timer restarted with new ${unifiedTimer} minute duration`);
                    }, 100);
                } else if (wasPaused) {
                    console.log(`⏸️ Instance ${index + 1} - Timer was paused, duration updated but keeping paused state`);
                }
                
                const currentDuration = timerManager.getDuration();
                console.log(`⏰ Instance ${index + 1} - Updated timer: ${currentMode} mode, ${Math.floor(currentDuration/60)}:${(currentDuration%60).toString().padStart(2,'0')}`);
            } else {
                console.log(`💤 Instance ${index + 1} - Timer not currently running, settings will be applied when started`);
            }
        });
        
        // Show confirmation
        this.showTimerSaveConfirmation(unifiedTimer);
    }
    
    showTimerSaveConfirmation(timerMinutes) {
        // Create a custom confirmation popup for timer settings
        const confirmationDiv = document.createElement('div');
        confirmationDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            min-width: 300px;
            border: 2px solid #3498db;
        `;
        
        confirmationDiv.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 10px;">⏰ Timer Settings Updated!</div>
            <div style="font-size: 1rem; margin-bottom: 15px;">
                Game timer set to <strong>${timerMinutes} minute${timerMinutes !== 1 ? 's' : ''}</strong> for all game modes
            </div>
            <div style="font-size: 0.9rem; color: #bdc3c7;">
                Settings applied immediately to any running games
            </div>
        `;
        
        document.body.appendChild(confirmationDiv);
        
        // Auto-remove after 3 seconds with fade out
        setTimeout(() => {
            confirmationDiv.style.transition = 'opacity 0.5s ease-out';
            confirmationDiv.style.opacity = '0';
            setTimeout(() => {
                if (confirmationDiv.parentNode) {
                    confirmationDiv.parentNode.removeChild(confirmationDiv);
                }
            }, 500);
        }, 2500);
    }
    
    makeTimerSettingsGloballyAvailable() {
        console.log('🌐 Making timer settings globally available...');
        
        // Make settings available to all game instances
        if (this.gameSettings && this.gameSettings.unifiedTimer) {
            const durationSeconds = this.gameSettings.unifiedTimer * 60;
            
            // Apply to existing game managers
            const gameInstances = [
                window.gameManager,
                window.main?.gameManager
            ].filter(instance => instance && instance.timerManager);
            
            gameInstances.forEach((gameManager, index) => {
                console.log(`🎮 Applying initial timer settings to game instance ${index + 1}...`);
                const timerManager = gameManager.timerManager;
                
                // Apply basic settings
                timerManager.setEnabled(this.gameSettings.enableTimer);
                timerManager.setWarningEnabled(this.gameSettings.timerWarning);
                
                // Apply unified timer to all modes
                Object.keys(this.gameSettings.gameModeTimers || {}).forEach(mode => {
                    timerManager.setGameModeTimer(mode, durationSeconds);
                });
                
                console.log(`✅ Initial timer settings applied to instance ${index + 1}: ${this.gameSettings.unifiedTimer} minutes`);
            });
        }
    }

    // Method to show a custom confirmation pop-up
    showCustomSaveConfirmation() {
        // Create the modal background
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'settingsSaveConfirmationOverlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Match game style */
        `;

        // Create the modal content
        const modalContent = document.createElement('div');
        modalContent.id = 'settingsSaveConfirmationContent';
        modalContent.style.cssText = `
            background: #ffffff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 400px;
            width: 90%;
        `;

        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Settings Saved!';
        title.style.cssText = `
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.4rem;
        `;
        modalContent.appendChild(title);

        // Add message
        const message = document.createElement('p');
        message.textContent = 'Your settings have been saved successfully.';
        message.style.cssText = `
            color: #555;
            margin-bottom: 25px;
            font-size: 1rem;
        `;
        modalContent.appendChild(message);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.cssText = `
            background: linear-gradient(135deg, #3498db, #2980b9); /* Blue gradient */
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            transition: background 0.3s ease;
        `;
        closeButton.onmouseover = () => { closeButton.style.background = 'linear-gradient(135deg, #2980b9, #1f618d)'; };
        closeButton.onmouseout = () => { closeButton.style.background = 'linear-gradient(135deg, #3498db, #2980b9)'; };
        
        closeButton.onclick = () => {
            modalOverlay.remove(); // Remove the modal when OK is clicked
        };
        modalContent.appendChild(closeButton);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    }

    resetGameData() {
        if (confirm('Are you sure you want to reset all game data? This will:\n\n• Remove all custom items\n• Restore all deleted default items\n• Reset all settings to defaults\n• Clear all game progress\n\nThis action cannot be undone!')) {
            localStorage.removeItem('farmersMarket_customItems');
            localStorage.removeItem('farmersMarket_deletedDefaults');
            localStorage.removeItem('farmersMarket_gameSettings');
            localStorage.removeItem('farmersMarket_gameState');
            
            this.customItems = [];
            this.deletedDefaultItems = [];
            this.gameSettings = this.getDefaultSettings();
            
            this.loadItemsIntoSettings();
            this.loadGeneralSettings();
            this.updateGameItems();
            
            alert('Game data has been reset successfully! All default items have been restored.');
        }
    }

    exportData() {
        const exportData = {
            customItems: this.customItems,
            deletedDefaultItems: this.deletedDefaultItems,
            gameSettings: this.gameSettings,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `farmers-market-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (importData.customItems) {
                        this.customItems = importData.customItems;
                        this.saveCustomItems();
                    }
                    
                    if (importData.deletedDefaultItems) {
                        this.deletedDefaultItems = importData.deletedDefaultItems;
                        this.saveDeletedDefaultItems();
                    }
                    
                    if (importData.gameSettings) {
                        this.gameSettings = { ...this.getDefaultSettings(), ...importData.gameSettings };
                        this.saveGameSettings();
                    }
                    
                    this.loadItemsIntoSettings();
                    this.loadGeneralSettings();
                    
                    alert('Settings imported successfully!');
                } catch (error) {
                    alert('Error importing settings file. Please check the file format.');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Storage methods
    loadCustomItems() {
        try {
            // Check if localStorage is available (fails in private browsing)
            if (typeof localStorage === 'undefined' || localStorage === null) {
                console.warn('localStorage not available, using default items');
                return [];
            }
            
            const stored = localStorage.getItem('farmersMarket_customItems');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading custom items:', error);
            return [];
        }
    }

    saveCustomItems() {
        try {
            // Check if localStorage is available (fails in private browsing)
            if (typeof localStorage === 'undefined' || localStorage === null) {
                console.warn('localStorage not available, cannot save custom items');
                return;
            }
            
            localStorage.setItem('farmersMarket_customItems', JSON.stringify(this.customItems));
        } catch (error) {
            console.error('Error saving custom items:', error);
        }
    }

    loadDeletedDefaultItems() {
        try {
            const items = localStorage.getItem('farmersMarket_deletedDefaults');
            return items ? JSON.parse(items) : [];
        } catch (error) {
            console.error('Error loading deleted default items:', error);
            return [];
        }
    }

    saveDeletedDefaultItems() {
        try {
            localStorage.setItem('farmersMarket_deletedDefaults', JSON.stringify(this.deletedDefaultItems));
        } catch (error) {
            console.error('Error saving deleted default items:', error);
        }
    }

    isItemDeleted(item) {
        return this.deletedDefaultItems.some(deletedItem => 
            deletedItem.name === item.name && deletedItem.emoji === item.emoji
        );
    }

    addToDeletedDefaults(item) {
        if (!this.isItemDeleted(item)) {
            this.deletedDefaultItems.push({
                name: item.name,
                emoji: item.emoji,
                category: item.category
            });
            this.saveDeletedDefaultItems();
        }
    }

    loadGameSettings() {
        try {
            const stored = localStorage.getItem('farmersMarket_gameSettings');
            return stored ? { ...this.getDefaultSettings(), ...JSON.parse(stored) } : this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading game settings:', error);
            return this.getDefaultSettings();
        }
    }

    saveGameSettings() {
        try {
            localStorage.setItem('farmersMarket_gameSettings', JSON.stringify(this.gameSettings));
        } catch (error) {
            console.error('Error saving game settings:', error);
        }
    }

    getDefaultSettings() {
        return {
            enableSound: true,
            volume: 70,
            enableAnimations: true,
            showHints: true,
            enableTimer: true,
            gameModeTimers: {
                progressive: 3, // 3 minutes
                single: 5,      // 5 minutes
                vs: 5,          // 5 minutes
                custom: 5       // 5 minutes
            },
            timerWarning: true,
            timerWarningThreshold: 30,
            timerAlertThreshold: 60
        };
    }

    // Public methods for other parts of the game
    getAllItems() {
        const allItems = {};
        const categories = ['vegetables', 'fruits', 'baked_goods', 'preserves'];
        
        categories.forEach(category => {
            allItems[category] = this.getAllItemsForCategory(category);
        });
        
        return allItems;
    }

    getSettings() {
        return this.gameSettings;
    }


}

// Export for global access
window.SettingsManager = SettingsManager;
