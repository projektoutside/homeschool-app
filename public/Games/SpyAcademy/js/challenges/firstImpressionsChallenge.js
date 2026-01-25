/**
 * First Impressions Challenge
 * Psychological phase where players vote on their initial suspicions
 * All players vote together and can see each other's selections
 */

class FirstImpressionsChallenge {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.voiceManager = gameManager.voiceManager;
        this.roleManager = gameManager.roleManager;
        this.soundManager = window.soundManager;
        
        this.players = [];
        this.votes = new Map(); // playerIndex -> suspectedPlayerIndex
        this.publicVotes = []; // Array to track votes publicly
        this.votingComplete = false;
        
        // Device detection
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        console.log('🕵️ First Impressions Challenge initialized');
    }
    
    async init() {
        console.log('🕵️ Starting First Impressions Challenge');
        
        try {
            // Get players from role manager
            this.players = this.gameManager.getSecretRoles();
            this.currentPlayerIndex = 0;
            this.votes.clear();
            this.publicVotes = [];
            this.votingComplete = false;
            
            // RANDOMIZE THE VOTING ORDER to ensure fair, unpredictable sequence
            this.shuffleArray(this.players);
            console.log('🔀 Player voting order randomized:', this.players.map(p => p.name));
            
            // Start with dramatic introduction
            await this.showInitialInstructions();
            
            console.log('✅ First Impressions Challenge initialization complete!');
            
        } catch (error) {
            console.error('❌ Error initializing First Impressions Challenge:', error);
            throw error;
        }
    }
    
    // Helper method to shuffle array in place (Fisher-Yates algorithm)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    async showInitialInstructions() {
        // Hide any existing content
        document.querySelectorAll('.scene').forEach(scene => {
            scene.classList.remove('active');
            scene.style.display = 'none';
        });
        
        // Create and show dramatic introduction overlay immediately
        const overlay = document.createElement('div');
        overlay.id = 'first-impressions-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(40, 0, 0, 0.98));
            display: flex;
            justify-content: center;
            align-items: flex-start;
            z-index: 10000;
            animation: fadeIn 0.8s ease-out;
            padding: env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px);
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, ${currentPlayer.color}20, ${currentPlayer.color}40);
            border: 4px solid ${currentPlayer.color};
            border-radius: 30px;
            padding: ${this.isMobile ? '20px' : '60px'};
            text-align: center;
            box-shadow: 0 0 80px ${currentPlayer.color}80;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            max-width: ${this.isMobile ? '95vw' : '600px'};
            width: 95%;
            animation: fadeIn 0.5s ease-out;
            margin: 0 auto;
            margin-top: 0 !important;
            flex-shrink: 0;
        `;
        
        content.innerHTML = `
            <div style="margin-bottom: 40px;">
                <h1 style="font-family: 'Cinzel', serif; font-size: ${this.isMobile ? '2.5rem' : '3.5rem'}; color: #ff0000; margin-bottom: 20px; text-shadow: 0 0 40px rgba(255, 0, 0, 0.8);">
                    🕵️ PUBLIC SUSPICION VOTE
                </h1>
                <div style="font-size: ${this.isMobile ? '1.2rem' : '1.4rem'}; color: #ffffff; line-height: 1.8; margin-bottom: 30px;">
                    <p style="margin: 15px 0;">Time to vote on suspicions!</p>
                    <p style="margin: 15px 0; color: #ff6666; font-weight: bold;">Who looks suspicious?</p>
                </div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 20px; padding: ${this.isMobile ? '20px' : '30px'}; margin: 30px 0;">
                <h3 style="color: #ffffff; font-size: ${this.isMobile ? '1.4rem' : '1.8rem'}; margin-bottom: 20px;">
                    👁️ The Rules
                </h3>
                <div style="font-size: ${this.isMobile ? '1.1rem' : '1.3rem'}; color: #ffffff; text-align: left; line-height: 1.6;">
                    <p>🔍 <strong>Study your teammates</strong></p>
                    <p>👤 <strong>Vote one by one</strong></p>
                    <p>🎯 <strong>Pick who seems "Bad"</strong></p>
                    <p>👀 <strong>All votes are VISIBLE!</strong></p>
                    <p>💭 <strong>Watch the live results!</strong></p>
                </div>
            </div>
            
            <div style="background: rgba(255, 165, 0, 0.1); border: 2px solid rgba(255, 165, 0, 0.4); border-radius: 15px; padding: ${this.isMobile ? '15px' : '25px'}; margin: 30px 0;">
                <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #ffaa00; font-style: italic;">
                    "Let the suspicions unfold..."
                </p>
            </div>
            
            <div style="margin-top: 40px;">
                <button id="begin-impressions-btn" style="
                    background: linear-gradient(45deg, #ff0000, #cc0000);
                    color: #ffffff;
                    border: none;
                    border-radius: 20px;
                    font-weight: 700;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    box-shadow: 0 10px 30px rgba(255, 0, 0, 0.5);
                    opacity: 0;
                    transform: scale(0.8);
                    pointer-events: none;
                ">
                    🎭 Start Voting!
                </button>
            </div>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Start AI speaking while screen is visible
        if (this.voiceManager) {
            await this.voiceManager.speak("You can all turn around now!");
            await this.voiceManager.speak("Welcome to The Spy Academy, agents!");
            await this.voiceManager.speak("Your secret identities have been assigned.");
            await this.voiceManager.speak("Time for public suspicion voting.");
            await this.voiceManager.speak("Study your teammates carefully.");
            await this.voiceManager.speak("Who looks suspicious?");
            await this.voiceManager.speak("Vote one by one, results are public!");
            await this.voiceManager.speak("Trust your instincts!");
        }
        
        // After AI finishes speaking, animate in the button
        const beginBtn = document.getElementById('begin-impressions-btn');
        
        // Create a dramatic button appearance animation
        setTimeout(() => {
            beginBtn.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            beginBtn.style.opacity = '1';
            beginBtn.style.transform = 'scale(1)';
            beginBtn.style.pointerEvents = 'auto';
            
            // Add pulsing effect
            beginBtn.style.animation = 'pulse 2s infinite';
            
            // Play sound effect
            if (this.soundManager) {
                this.soundManager.playSelect();
            }
        }, 500);
        
        // Bind begin button
        beginBtn.addEventListener('click', async () => {
            if (this.soundManager) this.soundManager.playSubmit();
            overlay.remove();
            await this.setupVotingDisplay();
        });
    }
    
    async setupVotingDisplay() {
        // Create the voting display with live results panel
        this.createVotingDisplayPanel();
        await this.callFirstPlayer();
    }
    
    createVotingDisplayPanel() {
        // Create main voting display container
        const votingDisplay = document.createElement('div');
        votingDisplay.id = 'voting-display-container';
        votingDisplay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 0, 20, 0.95));
            z-index: 9999;
            display: flex;
            animation: fadeIn 0.5s ease-out;
            overflow: hidden;
        `;
        
        // Detect if this is an iPad (larger mobile device)
        const isIPad = /iPad/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                      (this.isMobile && window.innerWidth >= 768);
        
        // Create left panel for live results
        const leftPanel = document.createElement('div');
        leftPanel.id = 'live-results-panel';
        leftPanel.style.cssText = `
            width: ${this.isMobile ? (isIPad ? '40%' : '100%') : '35%'};
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(40, 40, 80, 0.9), rgba(60, 60, 100, 0.9));
            border-right: 3px solid rgba(255, 255, 255, 0.3);
            padding: ${isIPad ? '15px' : '20px'};
            padding-top: env(safe-area-inset-top, 20px);
            padding-bottom: env(safe-area-inset-bottom, 20px);
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            z-index: 10002;
            ${this.isMobile && !isIPad ? 'position: absolute; top: 0; left: -100%; transition: left 0.3s ease;' : ''}
        `;
        
        leftPanel.innerHTML = `
            <div style="text-align: center; margin-bottom: ${isIPad ? '20px' : '30px'};">
                <h2 style="font-family: 'Cinzel', serif; font-size: ${isIPad ? '1.6rem' : (this.isMobile ? '1.8rem' : '2.2rem')}; color: #ffffff; margin-bottom: 10px;">
                    📊 LIVE RESULTS
                </h2>
                <p style="color: #cccccc; font-size: ${isIPad ? '0.9rem' : '1rem'};">
                    Watch the votes come in!
                </p>
            </div>
            
            <div id="votes-display" style="margin-bottom: ${isIPad ? '20px' : '30px'};">
                ${this.generateEmptyVotesDisplay()}
            </div>
            
            <div id="voting-progress-panel" style="
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: ${isIPad ? '15px' : '20px'};
                text-align: center;
            ">
                <h3 style="color: #ffffff; margin-bottom: 15px; font-size: ${isIPad ? '1.1rem' : '1.3rem'};">Progress</h3>
                <div style="
                    font-size: ${isIPad ? '1.5rem' : '2rem'};
                    color: #00ff00;
                    font-weight: bold;
                    margin-bottom: 10px;
                ">
                    <span id="votes-completed">0</span>/${this.players.length}
                </div>
                <p style="color: #cccccc; font-size: ${isIPad ? '0.8rem' : '0.9rem'};">Votes Cast</p>
            </div>
            
            ${this.isMobile && !isIPad ? `
                <button id="toggle-results-btn" style="
                    position: absolute;
                    top: 20px;
                    right: -50px;
                    width: 50px;
                    height: 60px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 0 10px 10px 0;
                    color: #ffffff;
                    font-size: 1.2rem;
                    cursor: pointer;
                    z-index: 10001;
                ">📊</button>
            ` : ''}
        `;
        
        // Create right panel for individual voting
        const rightPanel = document.createElement('div');
        rightPanel.id = 'individual-voting-panel';
        rightPanel.style.cssText = `
            width: ${this.isMobile ? (isIPad ? '60%' : '100%') : '65%'};
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 40, 0.8));
            display: flex;
            justify-content: center;
            align-items: flex-start;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: env(safe-area-inset-top, 20px) 10px env(safe-area-inset-bottom, 20px);
            box-sizing: border-box;
        `;
        
        votingDisplay.appendChild(leftPanel);
        votingDisplay.appendChild(rightPanel);
        document.body.appendChild(votingDisplay);
        
        // Add mobile toggle functionality (only for phones, not iPads)
        if (this.isMobile && !isIPad) {
            const toggleBtn = document.getElementById('toggle-results-btn');
            let panelVisible = false;
            
            toggleBtn.addEventListener('click', () => {
                panelVisible = !panelVisible;
                leftPanel.style.left = panelVisible ? '0' : '-100%';
                toggleBtn.textContent = panelVisible ? '❌' : '📊';
            });
        }
    }
    
    generateEmptyVotesDisplay() {
        return `
            <div style="text-align: center; color: #cccccc; padding: 40px; font-style: italic;">
                Waiting for first vote...
            </div>
        `;
    }
    
    updateVotesDisplay() {
        const votesDisplay = document.getElementById('votes-display');
        if (!votesDisplay) return;
        
        // Detect if this is an iPad for styling
        const isIPad = /iPad/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                      (this.isMobile && window.innerWidth >= 768);
        
        let displayHTML = '';
        
        // Show all votes that have been cast
        this.votes.forEach((suspectIndex, voterIndex) => {
            const voter = this.players[voterIndex];
            const suspect = this.players[suspectIndex];
            
            displayHTML += `
                <div style="
                    background: linear-gradient(135deg, ${voter.color}20, ${voter.color}40);
                    border: 2px solid ${voter.color};
                    border-radius: 12px;
                    padding: ${isIPad ? '10px' : '15px'};
                    margin: ${isIPad ? '8px 0' : '12px 0'};
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    animation: slideInLeft 0.5s ease-out;
                ">
                    <div style="display: flex; align-items: center;">
                        <div style="
                            width: ${isIPad ? '20px' : '25px'};
                            height: ${isIPad ? '20px' : '25px'};
                            background: ${voter.color};
                            border-radius: 50%;
                            margin-right: ${isIPad ? '8px' : '10px'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${this.getContrastColor(voter.color)};
                            font-size: ${isIPad ? '0.7rem' : '0.8rem'};
                        ">${voterIndex + 1}</div>
                        <span style="color: #ffffff; font-size: ${isIPad ? '0.8rem' : '0.9rem'}; font-weight: bold;">
                            ${voter.name}
                        </span>
                    </div>
                    
                    <div style="display: flex; align-items: center;">
                        <span style="color: #cccccc; margin: 0 ${isIPad ? '6px' : '8px'}; font-size: ${isIPad ? '0.7rem' : '0.8rem'};">→</span>
                        <div style="
                            width: ${isIPad ? '20px' : '25px'};
                            height: ${isIPad ? '20px' : '25px'};
                            background: ${suspect.color};
                            border-radius: 50%;
                            margin-right: ${isIPad ? '6px' : '8px'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${this.getContrastColor(suspect.color)};
                            font-size: ${isIPad ? '0.7rem' : '0.8rem'};
                        ">${suspectIndex + 1}</div>
                        <span style="color: #ffffff; font-size: ${isIPad ? '0.8rem' : '0.9rem'}; font-weight: bold;">
                            ${suspect.name}
                        </span>
                    </div>
                </div>
            `;
        });
        
        if (displayHTML === '') {
            displayHTML = this.generateEmptyVotesDisplay();
        }
        
        votesDisplay.innerHTML = displayHTML;
        
        // Update progress counter
        const votesCompleted = document.getElementById('votes-completed');
        if (votesCompleted) {
            votesCompleted.textContent = this.votes.size;
        }
    }
    
    async callFirstPlayer() {
        this.currentPlayerIndex = 0;
        await this.callNextPlayer();
    }
    
    async callNextPlayer() {
        if (this.currentPlayerIndex >= this.players.length) {
            await this.completeVotingProcess();
            return;
        }
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        const rightPanel = document.getElementById('individual-voting-panel');
        
        // Create player call screen content
        rightPanel.innerHTML = `
            <div style="
                background: linear-gradient(135deg, ${currentPlayer.color}20, ${currentPlayer.color}40);
                border: 4px solid ${currentPlayer.color};
                border-radius: 30px;
                padding: ${this.isMobile ? '20px' : '60px'};
                text-align: center;
                box-shadow: 0 0 80px ${currentPlayer.color}80;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                max-width: ${this.isMobile ? '95vw' : '600px'};
                width: 95%;
                animation: fadeIn 0.5s ease-out;
                margin: 0 auto;
                margin-top: 0 !important;
                flex-shrink: 0;
            ">
                <h1 style="
                    font-family: 'Cinzel', serif;
                    font-size: ${this.isMobile ? '3rem' : '4rem'};
                    color: ${currentPlayer.color};
                    margin-bottom: 20px;
                    text-shadow: 0 0 40px ${currentPlayer.color};
                ">
                    ${currentPlayer.name.toUpperCase()}
                </h1>
                
                <p style="
                    font-size: ${this.isMobile ? '1.5rem' : '2rem'};
                    color: #ffffff;
                    margin-bottom: 30px;
                    text-shadow: 0 0 20px rgba(255,255,255,0.5);
                ">
                    Step forward for your vote
                </p>
                
                <div style="margin-bottom: 30px;">
                    <p style="
                        font-size: ${this.isMobile ? '1rem' : '1.2rem'};
                        color: #cccccc;
                        line-height: 1.6;
                    ">
                        Choose who you suspect is the "Bad" player.<br/>
                        Your vote will be visible to everyone!
                    </p>
                </div>
                
                <button id="ready-to-vote-btn">
                    🎯 READY TO VOTE
                </button>
            </div>
        `;
        
        // Speak the player's name instead of color
        if (this.voiceManager) {
            await this.voiceManager.speak(`${currentPlayer.name}, your turn!`);
        }
        
        // Bind ready button
        const readyBtn = document.getElementById('ready-to-vote-btn');
        readyBtn.addEventListener('click', async () => {
            if (this.soundManager) this.soundManager.playClick();
            await this.showVotingInterface(currentPlayer);
        });
    }
    
    async showVotingInterface(votingPlayer) {
        const rightPanel = document.getElementById('individual-voting-panel');
        
        // Generate player options (excluding the voting player)
        const playerOptions = this.players
            .map((player, index) => ({ ...player, originalIndex: index }))
            .filter((_, index) => index !== this.players.indexOf(votingPlayer))
            .map(player => `
                <div class="suspect-option" data-player-index="${player.originalIndex}" style="
                    background: linear-gradient(135deg, ${player.color}30, ${player.color}50);
                    border: 2px solid ${player.color};
                    border-radius: 15px;
                    padding: 20px;
                    margin: 15px 0;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: ${player.color};
                            border-radius: 50%;
                            margin-right: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${this.getContrastColor(player.color)};
                        ">${player.originalIndex + 1}</div>
                        <div>
                            <div style="font-size: 1.2rem; font-weight: bold; color: #ffffff;">
                                ${player.name}
                            </div>
                            <div style="font-size: 1rem; color: #cccccc;">
                                ${player.colorName}
                            </div>
                        </div>
                    </div>
                    <div style="
                        background: rgba(255, 0, 0, 0.8);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 10px;
                        font-size: 0.9rem;
                        font-weight: bold;
                    ">
                        SUSPECT
                    </div>
                </div>
            `).join('');
        
        rightPanel.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(60, 60, 100, 0.9), rgba(40, 40, 80, 0.9));
                border: 3px solid #ffffff;
                border-radius: 25px;
                padding: ${this.isMobile ? '20px' : '50px'};
                text-align: center;
                box-shadow: 0 0 100px rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                max-width: ${this.isMobile ? '95vw' : '700px'};
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                animation: fadeIn 0.8s ease-out;
                margin: 0 auto;
                flex-shrink: 0;
            ">
                <div style="margin-bottom: 30px;">
                    <h2 style="font-family: 'Cinzel', serif; font-size: ${this.isMobile ? '2rem' : '2.5rem'}; color: #ffffff; margin-bottom: 15px;">
                        🔍 Who Do You Suspect?
                    </h2>
                    <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #cccccc; margin-bottom: 20px;">
                        ${votingPlayer.name}, choose the player you believe is secretly "Bad"
                    </p>
                </div>
                
                <div style="margin: 30px 0;">
                    ${playerOptions}
                </div>
                
                <div style="margin-top: 30px;">
                    <p style="font-size: ${this.isMobile ? '0.9rem' : '1rem'}; color: #ffaa00; font-style: italic;">
                        Your vote will be visible to everyone on the live results panel!
                    </p>
                </div>
            </div>
        `;
        
        // Bind suspect option clicks
        document.querySelectorAll('.suspect-option').forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.transform = 'scale(1.02)';
                option.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.2)';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.transform = 'scale(1)';
                option.style.boxShadow = 'none';
            });
            
            option.addEventListener('click', async () => {
                const suspectedPlayerIndex = parseInt(option.dataset.playerIndex);
                await this.recordVote(votingPlayer, suspectedPlayerIndex);
            });
        });
    }
    
    async recordVote(votingPlayer, suspectedPlayerIndex) {
        const votingPlayerIndex = this.players.indexOf(votingPlayer);
        const suspectedPlayer = this.players[suspectedPlayerIndex];
        
        // Record the vote
        this.votes.set(votingPlayerIndex, suspectedPlayerIndex);
        
        if (this.soundManager) this.soundManager.playSelect();
        
        console.log(`🗳️ ${votingPlayer.name} (${votingPlayer.colorName}) voted for ${suspectedPlayer.name} (${suspectedPlayer.colorName})`);
        
        // Update the live results display
        this.updateVotesDisplay();
        
        // Show brief confirmation and move to next player
        await this.showVoteConfirmation(votingPlayer, suspectedPlayer);
    }
    
    async showVoteConfirmation(votingPlayer, suspectedPlayer) {
        const rightPanel = document.getElementById('individual-voting-panel');
        
        rightPanel.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(0, 100, 0, 0.9), rgba(0, 150, 0, 0.9));
                border: 3px solid #00ff00;
                border-radius: 25px;
                padding: ${this.isMobile ? '20px' : '60px'};
                text-align: center;
                box-shadow: 0 0 80px rgba(0, 255, 0, 0.5);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                max-width: ${this.isMobile ? '90vw' : '500px'};
                width: 90%;
                animation: fadeIn 0.5s ease-out;
                margin: 0 auto;
                margin-top: 0 !important;
                flex-shrink: 0;
            ">
                <h2 style="font-family: 'Cinzel', serif; font-size: ${this.isMobile ? '2rem' : '2.5rem'}; color: #ffffff; margin-bottom: 20px;">
                    ✅ Vote Recorded
                </h2>
                
                <p style="font-size: ${this.isMobile ? '1.2rem' : '1.4rem'}; color: #ffffff; margin-bottom: 20px;">
                    ${votingPlayer.name} suspects ${suspectedPlayer.name}
                </p>
                
                <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #cccccc; margin-bottom: 30px;">
                    Your vote is now visible on the live results panel!
                </p>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0;
                ">
                    <div style="display: flex; align-items: center; justify-content: center;">
                        <div style="
                            width: 30px;
                            height: 30px;
                            background: ${votingPlayer.color};
                            border-radius: 50%;
                            margin-right: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${this.getContrastColor(votingPlayer.color)};
                        ">${this.players.indexOf(votingPlayer) + 1}</div>
                        <span style="color: #ffffff; margin: 0 10px;">→</span>
                        <div style="
                            width: 30px;
                            height: 30px;
                            background: ${suspectedPlayer.color};
                            border-radius: 50%;
                            margin-left: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: ${this.getContrastColor(suspectedPlayer.color)};
                        ">${this.players.indexOf(suspectedPlayer) + 1}</div>
                    </div>
                </div>
                
                <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #cccccc;">
                    Step back and let the next player vote...
                </p>
            </div>
        `;
        
        // Auto-continue after 3 seconds
        setTimeout(async () => {
            this.currentPlayerIndex++;
            await this.callNextPlayer();
        }, 3000);
    }
    
    async completeVotingProcess() {
        console.log('🗳️ All votes complete!');
        
        // Analyze the votes for drama
        this.analyzeVotes();
        
        // Play final dramatic narration
        if (this.voiceManager) {
            await this.voiceManager.speak("All votes are in!");
            await this.voiceManager.speak("Check the live results!");
            await this.voiceManager.speak("Suspicions revealed!");
            await this.voiceManager.speak("Time for challenges!");
        }
        
        // Show final results for a moment
        const rightPanel = document.getElementById('individual-voting-panel');
        rightPanel.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(60, 60, 100, 0.9), rgba(40, 40, 80, 0.9));
                border: 3px solid #ffffff;
                border-radius: 25px;
                padding: ${this.isMobile ? '40px' : '60px'};
                text-align: center;
                box-shadow: 0 0 100px rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                max-width: ${this.isMobile ? '90vw' : '600px'};
                width: 90%;
                animation: fadeIn 0.5s ease-out;
            ">
                <h1 style="font-family: 'Cinzel', serif; font-size: ${this.isMobile ? '2.5rem' : '3rem'}; color: #ff00ff; margin-bottom: 30px; text-shadow: 0 0 50px rgba(255,0,255,0.8);">
                    🗳️ VOTING COMPLETE
                </h1>
                
                <p style="font-size: ${this.isMobile ? '1.2rem' : '1.4rem'}; color: #ffffff; margin-bottom: 20px;">
                    All suspicions are now public!
                </p>
                
                <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #cccccc; margin-bottom: 30px;">
                    Check the live results panel to see who suspects whom!
                </p>
                
                <div style="
                    background: rgba(255, 165, 0, 0.1);
                    border: 2px solid rgba(255, 165, 0, 0.4);
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0;
                ">
                    <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #ffaa00;">
                        "The game of suspicion begins..."
                    </p>
                </div>
                
                <p style="font-size: ${this.isMobile ? '1rem' : '1.2rem'}; color: #cccccc;">
                    Starting challenges in 5 seconds...
                </p>
            </div>
        `;
        
        // Auto-remove after 5 seconds and start next challenge
        setTimeout(async () => {
            // Remove the entire voting display
            const votingDisplay = document.getElementById('voting-display-container');
            if (votingDisplay) votingDisplay.remove();
            
            await this.startRockPaperScissorsChallenge();
        }, 5000);
    }
    
    analyzeVotes() {
        console.log('🔍 First Impressions voting analysis:');
        
        const suspicionCounts = new Map();
        this.votes.forEach((suspectedIndex, voterIndex) => {
            suspicionCounts.set(suspectedIndex, (suspicionCounts.get(suspectedIndex) || 0) + 1);
            console.log(`Player ${voterIndex + 1} suspects Player ${suspectedIndex + 1}`);
        });
        
        // Find most suspected player
        let mostSuspected = null;
        let maxSuspicions = 0;
        suspicionCounts.forEach((count, playerIndex) => {
            if (count > maxSuspicions) {
                maxSuspicions = count;
                mostSuspected = playerIndex;
            }
        });
        
        if (mostSuspected !== null) {
            const suspectedPlayer = this.players[mostSuspected];
            console.log(`🎯 Most suspected: Player ${mostSuspected + 1} (${suspectedPlayer.colorName}) with ${maxSuspicions} votes`);
            console.log(`🎭 Actual role: ${suspectedPlayer.role}`);
        }
        
        // Store results in game state for potential future use
        this.gameManager.gameState.firstImpressions = {
            votes: Object.fromEntries(this.votes),
            suspicionCounts: Object.fromEntries(suspicionCounts),
            mostSuspected: mostSuspected
        };
    }
    
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    startRockPaperScissorsChallenge() {
        console.log('🎮 Transitioning to Rock, Paper, Scissors Challenge');
        
        if (typeof RockPaperScissorsChallenge !== 'undefined') {
            const challenge = new RockPaperScissorsChallenge(this.gameManager);
            challenge.init();
        } else {
            console.error('❌ RockPaperScissorsChallenge not loaded, going to Final Voting');
            this.gameManager.startFirstChallenge();
        }
    }
    
    cleanup() {
        // Stop any ongoing voice narration
        if (this.voiceManager) {
            this.voiceManager.stop();
        }
        
        // Remove any overlays
        const overlays = ['first-impressions-overlay', 'voting-display-container'];
        overlays.forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) {
                overlay.remove();
            }
        });
        
        console.log('🔄 First Impressions Challenge cleaned up');
    }
}

// Make FirstImpressionsChallenge available globally
window.FirstImpressionsChallenge = FirstImpressionsChallenge;
