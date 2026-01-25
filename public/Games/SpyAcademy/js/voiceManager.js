/**
 * Advanced Voice Manager for AI Narration
 * Supports premium AI voice services for ultra-realistic speech synthesis
 * Falls back to enhanced browser voices for maximum compatibility
 */

class VoiceManager {
    constructor() {
        // Voice service configuration
        this.voiceServices = {
            free_neural: {
                enabled: true,
                provider: 'streamelements', // Amazon Polly via StreamElements
                voiceName: 'Amy', // High quality realistic female
                rate: 1.0,
                pitch: 1.0
            },
            elevenlabs: {
                enabled: false,
                apiKey: null,
                voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - Professional male
                model: 'eleven_multilingual_v2',
                stability: 0.5,
                similarityBoost: 0.8,
                style: 0.3
            },
            azure: {
                enabled: false,
                apiKey: null,
                region: 'eastus',
                voiceName: 'en-US-AriaNeural', // Very natural female voice
                rate: 1.0,
                pitch: 0,
                style: 'friendly'
            },
            google: {
                enabled: false,
                apiKey: null,
                languageCode: 'en-US',
                voiceName: 'en-US-Studio-M',
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0
            }
        };
        
        // Browser speech synthesis (enhanced fallback)
        this.speechSynthesis = window.speechSynthesis;
        this.isSupported = 'speechSynthesis' in window;
        this.voice = null;
        this.isEnabled = true;
        this.rate = 1.0; 
        this.pitch = 1.0;
        this.volume = 1.0; 
        this.speechTimeout = 30000;
        this.currentUtterance = null;
        this.voicesLoadedPromise = null;
        this.isSpeaking = false;
        this.speechQueue = [];
        
        // Audio caching for performance
        this.audioCache = new Map();
        this.maxCacheSize = 50;
        
        // Initialize voice services
        this.initializeVoiceServices();
        this.ensureVoicesLoaded();
        
        console.log('🎤 Advanced Voice Manager (Realistic Mode) initialized');
    }
    
    /**
     * Initialize premium voice services
     */
    async initializeVoiceServices() {
        await this.detectApiKeys();
        
        // Load saved free neural voice preference
        const savedFreeVoice = localStorage.getItem('free_neural_voice_name');
        if (savedFreeVoice) {
            this.voiceServices.free_neural.voiceName = savedFreeVoice;
            console.log(`🎭 Loaded saved Free Neural voice: ${savedFreeVoice}`);
        }

        if (this.voiceServices.elevenlabs.enabled) console.log('🎭 ElevenLabs enabled');
        if (this.voiceServices.azure.enabled) console.log('🎭 Azure Neural enabled');
        if (this.voiceServices.google.enabled) console.log('🎭 Google WaveNet enabled');
    }
    
    /**
     * Detect API keys
     */
    async detectApiKeys() {
        const elevenLabsKey = window.ELEVENLABS_API_KEY || localStorage.getItem('elevenlabs_api_key');
        if (elevenLabsKey) {
            this.voiceServices.elevenlabs.apiKey = elevenLabsKey;
            this.voiceServices.elevenlabs.enabled = true;
        }
        
        const azureKey = window.AZURE_SPEECH_KEY || localStorage.getItem('azure_speech_key');
        if (azureKey) {
            this.voiceServices.azure.apiKey = azureKey;
            this.voiceServices.azure.enabled = true;
        }
        
        const googleKey = window.GOOGLE_CLOUD_KEY || localStorage.getItem('google_cloud_key');
        if (googleKey) {
            this.voiceServices.google.apiKey = googleKey;
            this.voiceServices.google.enabled = true;
        }
    }

    /**
     * Ensure voices are loaded with a single Promise to prevent multiple listeners
     */
    ensureVoicesLoaded() {
        if (this.voicesLoadedPromise) return this.voicesLoadedPromise;

        this.voicesLoadedPromise = new Promise((resolve) => {
            if (!this.isSupported) {
                resolve([]);
                return;
            }

            let voices = this.speechSynthesis.getVoices();
            if (voices.length > 0) {
                this.selectPreferredVoice(voices);
                resolve(voices);
                return;
            }

            const onVoicesChanged = () => {
                voices = this.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    this.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                    this.selectPreferredVoice(voices);
                    resolve(voices);
                }
            };

            this.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
            
            // Fallback for some browsers
            setTimeout(() => {
                voices = this.speechSynthesis.getVoices();
                this.selectPreferredVoice(voices);
                resolve(voices);
            }, 1000);
        });

        return this.voicesLoadedPromise;
    }

    /**
     * Select preferred realistic female voice (Matching original AudioManager priority)
     */
    selectPreferredVoice(voices) {
        if (!voices || voices.length === 0) return;

        // ORIGINAL AUDIOMANAGER PRIORITY LIST
        const femaleVoicePriority = [
            'Microsoft Aria Online (Natural) - English (United States)',
            'Microsoft Jenny Online (Natural) - English (United States)',
            'Microsoft Aria Desktop - English (United States)',
            'Microsoft Zira Desktop - English (United States)',
            'Google US English Female',
            'Google UK English Female',
            'Google Australian English Female',
            'Samantha',
            'Victoria',
            'Alex (Enhanced)',
            'Fiona',
            'Karen',
            'Serena'
        ];

        let selectedVoice = null;

        // 1. Try priority list
        for (const voiceName of femaleVoicePriority) {
            selectedVoice = voices.find(v =>
                v.name === voiceName ||
                v.name.includes(voiceName) ||
                (voiceName.includes('Enhanced') && v.name.includes(voiceName.replace(' (Enhanced)', '')))
            );
            if (selectedVoice) break;
        }

        // 2. Try broader female search
        if (!selectedVoice) {
            selectedVoice = voices.find(v =>
                v.lang.startsWith('en') && (
                    v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('woman') ||
                    v.name.toLowerCase().includes('girl') ||
                    v.name.includes('Aria') ||
                    v.name.includes('Jenny') ||
                    v.name.includes('Zira') ||
                    v.name.includes('Samantha') ||
                    v.name.includes('Victoria') ||
                    v.name.includes('Karen') ||
                    v.name.includes('Serena') ||
                    v.name.includes('Fiona')
                )
            );
        }

        // 3. Any English voice
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) {
            this.voice = selectedVoice;
            console.log('🎤 Selected Realistic Voice:', selectedVoice.name);
        }
    }
    
    /**
     * Primary voice synthesis method
     */
    async speak(text, options = {}) {
        if (!this.isEnabled || !text || text.trim().length === 0) {
            return Promise.resolve();
        }
        
        this.fadeOutIntroMusicIfPlaying();
        
        try {
            const textHash = this.hashText(text);
            if (this.audioCache.has(textHash)) {
                return this.playCachedAudio(textHash);
            }
            
            // Try premium services first, then our high-quality free neural, then fallback to browser
            const services = ['elevenlabs', 'azure', 'google', 'free_neural', 'browser'];
            
            for (let service of services) {
                // If it's a premium service, check if it's enabled (has key)
                // If it's free_neural or browser, they are always "available" but may fail
                const isAvailable = service === 'browser' || service === 'free_neural' || this.voiceServices[service]?.enabled;
                
                if (isAvailable) {
                    try {
                        switch (service) {
                            case 'elevenlabs':
                                return await this.speakElevenLabs(text, options);
                            case 'azure':
                                return await this.speakAzure(text, options);
                            case 'google':
                                return await this.speakGoogle(text, options);
                            case 'free_neural':
                                return await this.speakFreeNeural(text, options);
                            case 'browser':
                                return await this.speakBrowser(text, options);
                        }
                    } catch (error) {
                        console.warn(`🎤 ${service} synthesis failed:`, error.message);
                        // If free_neural fails (e.g. offline), it will automatically try 'browser' next
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error('🎤 Voice synthesis failure:', error);
        }
    }

    /**
     * High-quality Free Neural AI Voices (Amazon Polly / Microsoft Edge)
     * Provides consistent, modern realism across all platforms for free
     */
    async speakFreeNeural(text, options = {}) {
        const config = this.voiceServices.free_neural;
        const voice = options.voice || config.voiceName;
        
        try {
            // Encode text for URL
            const encodedText = encodeURIComponent(text);
            let url = '';
            
            if (config.provider === 'streamelements') {
                // StreamElements API provides access to Amazon Polly Neural voices for free
                url = `https://api.streamelements.com/v2/voice/speak?voice=${voice}&text=${encodedText}`;
            } else if (config.provider === 'google') {
                url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodedText}`;
            }
            
            if (!url) throw new Error('No free neural provider configured');

            // Safety timeout for fetching
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Free Neural API error: ${response.status}`);
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log(`🎤 Using Free Neural AI Voice: ${voice}`);
            return this.playAndCacheAudio(audioUrl, this.hashText(text));
        } catch (error) {
            console.warn('🎤 Free Neural synthesis failed:', error);
            throw error; // Fallback to next service in speak()
        }
    }
    
    /**
     * Browser speech synthesis with PROMISE support
     */
    async speakBrowser(text, options = {}) {
        // If already speaking, cancel it to prevent overlapping
        this.stop();
        
        return new Promise(async (resolve) => {
            try {
                const voices = await this.ensureVoicesLoaded();
                
                // Double check if another speech started while waiting for voices
                this.stop();
                
                const utterance = new SpeechSynthesisUtterance(text);
                this.currentUtterance = utterance;
                
                if (this.voice) {
                    utterance.voice = this.voice;
                }
                
                utterance.rate = options.rate || this.rate;
                utterance.pitch = options.pitch || this.pitch;
                utterance.volume = options.volume || this.volume;
                
                let resolved = false;
                const finish = () => {
                    if (resolved) return;
                    resolved = true;
                    this.currentUtterance = null;
                    this.isSpeaking = false;
                    resolve();
                };

                utterance.onend = finish;
                utterance.onerror = (event) => {
                    console.warn('🎤 Browser speech error:', event.error);
                    finish();
                };
                
                // Safety timeout
                setTimeout(finish, this.speechTimeout);
                
                this.isSpeaking = true;
                this.speechSynthesis.speak(utterance);
                
            } catch (error) {
                console.error('🎤 Browser speech error:', error);
                this.isSpeaking = false;
                resolve();
            }
        });
    }

    async speakElevenLabs(text, options = {}) {
        const config = this.voiceServices.elevenlabs;
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`, {
                method: 'POST',
                headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': config.apiKey },
                body: JSON.stringify({
                    text: text,
                    model_id: config.model,
                    voice_settings: {
                        stability: options.stability || config.stability,
                        similarity_boost: options.similarityBoost || config.similarityBoost,
                        style: options.style || config.style
                    }
                })
            });
            if (!response.ok) throw new Error(`ElevenLabs API error: ${response.status}`);
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            return this.playAndCacheAudio(audioUrl, this.hashText(text));
        } catch (error) {
            console.error('🎤 ElevenLabs error:', error);
            throw error;
        }
    }
    
    async speakAzure(text, options = {}) {
        const config = this.voiceServices.azure;
        try {
            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${config.voiceName}"><prosody rate="1.0" pitch="${options.pitch || config.pitch}"><mstts:express-as style="${options.style || config.style}">${text}</mstts:express-as></prosody></voice></speak>`;
            const response = await fetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
                method: 'POST',
                headers: { 'Ocp-Apim-Subscription-Key': config.apiKey, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
                body: ssml
            });
            if (!response.ok) throw new Error(`Azure Speech API error: ${response.status}`);
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            return this.playAndCacheAudio(audioUrl, this.hashText(text));
        } catch (error) {
            console.error('🎤 Azure error:', error);
            throw error;
        }
    }
    
    async speakGoogle(text, options = {}) {
        const config = this.voiceServices.google;
        try {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text },
                    voice: { languageCode: config.languageCode, name: config.voiceName },
                    audioConfig: { audioEncoding: config.audioEncoding, speakingRate: 1.0, pitch: options.pitch || config.pitch }
                })
            });
            if (!response.ok) throw new Error(`Google TTS error: ${response.status}`);
            const data = await response.json();
            const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
            const audioUrl = URL.createObjectURL(audioBlob);
            return this.playAndCacheAudio(audioUrl, this.hashText(text));
        } catch (error) {
            console.error('🎤 Google error:', error);
            throw error;
        }
    }

    async playAndCacheAudio(audioUrl, textHash) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.onloadeddata = () => {
                if (this.audioCache.size >= this.maxCacheSize) {
                    const firstKey = this.audioCache.keys().next().value;
                    URL.revokeObjectURL(this.audioCache.get(firstKey));
                    this.audioCache.delete(firstKey);
                }
                this.audioCache.set(textHash, audioUrl);
            };
            audio.onended = resolve;
            audio.onerror = reject;
            audio.volume = this.volume;
            audio.play().catch(reject);
        });
    }

    async playCachedAudio(textHash) {
        const audioUrl = this.audioCache.get(textHash);
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audio.volume = this.volume;
        return new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play().catch(resolve);
        });
    }

    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString();
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    }

    stop() {
        if (this.isSupported) {
            this.speechSynthesis.cancel();
            this.currentUtterance = null;
        }
    }

    cleanup() {
        this.stop();
        for (let audioUrl of this.audioCache.values()) URL.revokeObjectURL(audioUrl);
        this.audioCache.clear();
    }

    fadeOutIntroMusicIfPlaying() {
        if (window.soundManager) {
            window.soundManager.stopIntroMusic();
        }
    }

    setElevenLabsKey(key) { this.voiceServices.elevenlabs.apiKey = key; this.voiceServices.elevenlabs.enabled = !!key; }
    setAzureKey(key, region = 'eastus') { this.voiceServices.azure.apiKey = key; this.voiceServices.azure.region = region; this.voiceServices.azure.enabled = !!key; }
    setGoogleKey(key) { this.voiceServices.google.apiKey = key; this.voiceServices.google.enabled = !!key; }
}

window.VoiceManager = VoiceManager;
