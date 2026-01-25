/**
 * Voice Configuration Utility
 * Helps configure premium AI voice services for ultra-realistic speech
 */

class VoiceConfig {
    constructor() {
        this.configUI = null;
        this.isConfigOpen = false;
    }
    
    /**
     * Show voice configuration panel
     */
    showConfig() {
        if (this.isConfigOpen) return;
        
        this.createConfigUI();
        this.isConfigOpen = true;
    }
    
    /**
     * Hide voice configuration panel
     */
    hideConfig() {
        if (this.configUI) {
            this.configUI.remove();
            this.configUI = null;
            this.isConfigOpen = false;
        }
    }
    
    /**
     * Create the configuration UI
     */
    createConfigUI() {
        const overlay = document.createElement('div');
        overlay.className = 'voice-config-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Arial', sans-serif;
        `;
        
        const panel = document.createElement('div');
        panel.className = 'voice-config-panel';
        panel.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 15px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
        `;
        
        panel.innerHTML = `
            <h2 style="color: #00ffff; margin-bottom: 20px; text-align: center; font-size: 24px;">
                🎤 Realistic AI Voice Settings
            </h2>
            
            <div style="color: #ccc; margin-bottom: 25px; line-height: 1.6;">
                <p><strong>New: Ultra-realistic Neural AI voices enabled by default!</strong></p>
                <p>The game now uses advanced neural synthesis for human-like speech across all devices. You can also configure premium accounts below.</p>
            </div>

            <!-- Free Neural AI Configuration -->
            <div class="service-section" style="margin-bottom: 25px; padding: 20px; background: rgba(0, 255, 128, 0.1); border-radius: 10px; border-left: 4px solid #00ff80;">
                <h3 style="color: #00ff80; margin-bottom: 15px; display: flex; align-items: center;">
                    ⚡ Free Neural AI (Automatic)
                    <span style="background: #00ff80; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">ACTIVE</span>
                </h3>
                <p style="color: #ccc; margin-bottom: 15px;">
                    Modern neural voices provided automatically for a natural experience on all devices.
                </p>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">Select Persona:</label>
                    <select id="free-neural-voice" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                        <option value="Amy">Amy (American Female - Professional)</option>
                        <option value="Emma">Emma (British Female - Crisp)</option>
                        <option value="Brian">Brian (British Male - Deep)</option>
                        <option value="Joey">Joey (American Male - Friendly)</option>
                        <option value="Joanna">Joanna (American Female - Clear)</option>
                        <option value="Salli">Salli (American Female - Teen)</option>
                    </select>
                </div>
            </div>
            
            <!-- ElevenLabs Configuration -->
            <div class="service-section" style="margin-bottom: 25px; padding: 20px; background: rgba(0, 255, 255, 0.1); border-radius: 10px; border-left: 4px solid #00ffff;">
                <h3 style="color: #00ffff; margin-bottom: 15px; display: flex; align-items: center;">
                    🏆 ElevenLabs (Ultra-Realistic)
                    <span style="background: #00ff00; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">RECOMMENDED</span>
                </h3>
                <p style="color: #ccc; margin-bottom: 15px;">
                    The most advanced AI voice technology with human-like expressiveness and emotion.
                </p>
                <div style="margin-bottom: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
                    <input type="text" id="elevenlabs-key" placeholder="Enter your ElevenLabs API key" 
                           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">Voice:</label>
                    <select id="elevenlabs-voice" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                        <option value="pNInz6obpgDQGcFmaJgB">Adam (Natural Male)</option>
                        <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Professional Female)</option>
                        <option value="AZnzlk1XvdvUeBnXmlld">Domi (Confident Female)</option>
                        <option value="EXAVITQu4vr4xnSDxMaL">Bella (Narration Female)</option>
                        <option value="ErXwobaYiN019PkySvjV">Antoni (Warm Male)</option>
                        <option value="MF3mGyEYCl7XYWbV9V6O">Elli (Emotional Female)</option>
                        <option value="TxGEqnHWrfWFTfGW9XjX">Josh (Deep Male)</option>
                    </select>
                </div>
                <a href="https://elevenlabs.io/" target="_blank" style="color: #00ffff; text-decoration: none; font-size: 14px;">
                    → Get API key from ElevenLabs.io
                </a>
            </div>
            
            <!-- Azure Configuration -->
            <div class="service-section" style="margin-bottom: 25px; padding: 20px; background: rgba(0, 120, 212, 0.1); border-radius: 10px; border-left: 4px solid #0078d4;">
                <h3 style="color: #0078d4; margin-bottom: 15px;">
                    🎭 Azure Neural Voices (High-Quality)
                </h3>
                <p style="color: #ccc; margin-bottom: 15px;">
                    Microsoft's advanced neural voices with natural prosody and clear pronunciation.
                </p>
                <div style="margin-bottom: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
                    <input type="text" id="azure-key" placeholder="Enter your Azure Speech API key" 
                           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">Voice:</label>
                    <select id="azure-voice" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                        <option value="en-US-AriaNeural">Aria (Conversational Female)</option>
                        <option value="en-US-GuyNeural">Guy (Professional Male)</option>
                        <option value="en-US-JennyNeural">Jenny (Friendly Female)</option>
                        <option value="en-US-DavisNeural">Davis (Narrator Male)</option>
                        <option value="en-US-AmberNeural">Amber (Young Female)</option>
                        <option value="en-US-BrandonNeural">Brandon (Young Male)</option>
                    </select>
                </div>
                <a href="https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/" target="_blank" style="color: #0078d4; text-decoration: none; font-size: 14px;">
                    → Get API key from Azure Cognitive Services
                </a>
            </div>
            
            <!-- Google Configuration -->
            <div class="service-section" style="margin-bottom: 25px; padding: 20px; background: rgba(66, 133, 244, 0.1); border-radius: 10px; border-left: 4px solid #4285f4;">
                <h3 style="color: #4285f4; margin-bottom: 15px;">
                    🎵 Google WaveNet (Natural)
                </h3>
                <p style="color: #ccc; margin-bottom: 15px;">
                    Google's WaveNet technology for natural-sounding speech synthesis.
                </p>
                <div style="margin-bottom: 10px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
                    <input type="text" id="google-key" placeholder="Enter your Google Cloud API key" 
                           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: block; margin-bottom: 5px;">Voice:</label>
                    <select id="google-voice" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #2a2a3e; color: #fff;">
                        <option value="en-US-Neural2-J">Neural2-J (Male)</option>
                        <option value="en-US-Neural2-F">Neural2-F (Female)</option>
                        <option value="en-US-Neural2-A">Neural2-A (Male)</option>
                        <option value="en-US-Neural2-C">Neural2-C (Female)</option>
                        <option value="en-US-Neural2-D">Neural2-D (Male)</option>
                        <option value="en-US-Neural2-E">Neural2-E (Female)</option>
                    </select>
                </div>
                <a href="https://cloud.google.com/text-to-speech" target="_blank" style="color: #4285f4; text-decoration: none; font-size: 14px;">
                    → Get API key from Google Cloud Console
                </a>
            </div>
            
            <!-- Current Status -->
            <div style="margin-bottom: 25px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                <h4 style="color: #fff; margin-bottom: 10px;">Current Voice Status:</h4>
                <div id="voice-status" style="color: #ccc;">
                    Checking available services...
                </div>
            </div>
            
            <!-- Buttons -->
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                <button id="test-voice-btn" style="
                    background: #00ff00;
                    color: #000;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    🎤 Test Voice
                </button>
                <button id="save-config-btn" style="
                    background: #00ffff;
                    color: #000;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    💾 Save Configuration
                </button>
                <button id="close-config-btn" style="
                    background: #666;
                    color: #fff;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    ✕ Close
                </button>
            </div>
        `;
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        this.configUI = overlay;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load current configuration
        this.loadCurrentConfig();
        
        // Update status
        this.updateStatus();
    }
    
    /**
     * Set up event listeners for the configuration UI
     */
    setupEventListeners() {
        // Close button
        document.getElementById('close-config-btn').addEventListener('click', () => {
            this.hideConfig();
        });
        
        // Test voice button
        document.getElementById('test-voice-btn').addEventListener('click', () => {
            this.testVoice();
        });
        
        // Save configuration button
        document.getElementById('save-config-btn').addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Close on overlay click
        this.configUI.addEventListener('click', (e) => {
            if (e.target === this.configUI) {
                this.hideConfig();
            }
        });
    }
    
    /**
     * Load current configuration into the UI
     */
    loadCurrentConfig() {
        // Load Free Neural config
        const freeVoice = localStorage.getItem('free_neural_voice_name') || 'Amy';
        document.getElementById('free-neural-voice').value = freeVoice;

        // Load ElevenLabs config
        const elevenLabsKey = localStorage.getItem('elevenlabs_api_key');
        if (elevenLabsKey) {
            document.getElementById('elevenlabs-key').value = elevenLabsKey;
        }
        
        // Load Azure config
        const azureKey = localStorage.getItem('azure_speech_key');
        if (azureKey) {
            document.getElementById('azure-key').value = azureKey;
        }
        
        // Load Google config
        const googleKey = localStorage.getItem('google_cloud_key');
        if (googleKey) {
            document.getElementById('google-key').value = googleKey;
        }
    }
    
    /**
     * Save the configuration
     */
    saveConfiguration() {
        const freeVoice = document.getElementById('free-neural-voice').value;
        const elevenLabsKey = document.getElementById('elevenlabs-key').value.trim();
        const elevenLabsVoice = document.getElementById('elevenlabs-voice').value;
        const azureKey = document.getElementById('azure-key').value.trim();
        const azureVoice = document.getElementById('azure-voice').value;
        const googleKey = document.getElementById('google-key').value.trim();
        const googleVoice = document.getElementById('google-voice').value;
        
        // Configure voice manager if available
        if (window.gameManager && window.gameManager.voiceManager) {
            const vm = window.gameManager.voiceManager;
            
            // Update free neural voice
            vm.voiceServices.free_neural.voiceName = freeVoice;
            localStorage.setItem('free_neural_voice_name', freeVoice);

            if (elevenLabsKey) {
                vm.setElevenLabsKey(elevenLabsKey);
                vm.voiceServices.elevenlabs.voiceId = elevenLabsVoice;
            }
            
            if (azureKey) {
                vm.setAzureKey(azureKey);
                vm.voiceServices.azure.voiceName = azureVoice;
            }
            
            if (googleKey) {
                vm.setGoogleKey(googleKey);
                vm.voiceServices.google.voiceName = googleVoice;
            }
            
            // Save voice preferences
            localStorage.setItem('elevenlabs_voice_id', elevenLabsVoice);
            localStorage.setItem('azure_voice_name', azureVoice);
            localStorage.setItem('google_voice_name', googleVoice);
            
            console.log('🎤 Voice configuration saved!');
            this.updateStatus();
            
            // Show success message
            this.showMessage('Configuration saved successfully! 🎉', 'success');
        }
    }
    
    /**
     * Test the current voice configuration
     */
    async testVoice() {
        if (!window.gameManager || !window.gameManager.voiceManager) {
            this.showMessage('Voice manager not available', 'error');
            return;
        }
        
        const testText = "Welcome to the ultimate escape room challenge! This is a test of the premium AI voice system.";
        
        try {
            this.showMessage('Testing voice... 🎤', 'info');
            await window.gameManager.voiceManager.speak(testText);
            this.showMessage('Voice test completed! 🎉', 'success');
        } catch (error) {
            console.error('Voice test failed:', error);
            this.showMessage('Voice test failed. Check your API keys and try again.', 'error');
        }
    }
    
    /**
     * Update the status display
     */
    updateStatus() {
        const statusElement = document.getElementById('voice-status');
        if (!statusElement) return;
        
        let status = '';
        
        if (window.gameManager && window.gameManager.voiceManager) {
            const vm = window.gameManager.voiceManager;
            
            if (vm.voiceServices.elevenlabs.enabled) {
                status += '✅ ElevenLabs (Ultra-realistic)<br>';
            }
            if (vm.voiceServices.azure.enabled) {
                status += '✅ Azure Neural (High-quality)<br>';
            }
            if (vm.voiceServices.google.enabled) {
                status += '✅ Google WaveNet (Natural)<br>';
            }
            
            status += '✅ Enhanced Browser Voices (Fallback)';
            
            if (!vm.voiceServices.elevenlabs.enabled && !vm.voiceServices.azure.enabled && !vm.voiceServices.google.enabled) {
                status = '⚠️ Using browser voices only. Configure premium services for better quality.';
            }
        } else {
            status = '❌ Voice manager not initialized';
        }
        
        statusElement.innerHTML = status;
    }
    
    /**
     * Show a temporary message
     */
    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.voice-config-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'voice-config-message';
        
        const colors = {
            info: '#00ffff',
            success: '#00ff00',
            error: '#ff4444'
        };
        
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info}22;
            border: 1px solid ${colors[type] || colors.info};
            color: ${colors[type] || colors.info};
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 3000);
    }
}

// Make VoiceConfig available globally
window.VoiceConfig = VoiceConfig;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.voiceConfig = new VoiceConfig();
    
    // Add keyboard shortcut to open voice config (Ctrl+Shift+V)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            e.preventDefault();
            window.voiceConfig.showConfig();
        }
    });
    
    console.log('🎤 Voice Config utility initialized. Press Ctrl+Shift+V to configure premium voices.');
});
