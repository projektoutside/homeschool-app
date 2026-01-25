/**
 * Enhanced Rock, Paper, Scissors Challenge
 * Multi-round team deception game with strategic mechanics
 */

class RockPaperScissorsChallenge {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.voiceManager = gameManager.voiceManager;
        this.soundManager = window.soundManager;
        
        this.players = [];
        
        // Dynamic win condition system (replaces 2-round tournament)
        this.winThresholds = {
            good: 0,    // Will be set based on player count
            bad: 0      // Will be set based on player count
        };
        this.gameEnded = false; // Flag to prevent further actions once game ends
        
        // Team leader rotation for continuous gameplay
        this.teamLeaderRotation = []; // Track order of team leaders
        this.currentTeamLeaderIndex = 0;
        this.lastSelectedPlayer = null; // Track for back-to-back rule
        
        // Round tracking for voting system
        this.currentRound = 1; // Track which round we're in
        this.completedFirstRound = false; // Flag to track if first round is complete
        
        // Current game state
        this.teamLeader = null;
        this.chosenPlayer = null;
        this.aiMove = null;
        this.suggestedMove = null;
        this.playerMove = null;
        this.gameResult = null;
        
        // Team scoring system
        this.gameScore = {
            goodTeam: 0,
            badTeam: 0,
            ties: 0
        };
        
        // Voting system (only activated in second round and beyond, with 5+ players)
        this.votes = new Map(); // playerIndex -> boolean (yes/no)
        this.votingComplete = false;
        this.votingActive = false; // Prevents race conditions during voting
        this.votingOverlay = null; // Track voting overlay for proper cleanup
        
        // 3D Scene properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.aiMoveObject = null;
        this.playerMoveObject = null;
        
        console.log('🎮 Enhanced Rock, Paper, Scissors Challenge initialized with dynamic win conditions');
    }
    
    async init() {
        console.log('🎮 Starting Dynamic Win Condition Rock, Paper, Scissors Challenge');
        
        try {
            this.players = this.gameManager.getSecretRoles();
            
            // Validate player count (3-8 players only)
            if (!this.players || this.players.length < 3) {
                throw new Error('This challenge requires a minimum of 3 players');
            }
            if (this.players.length > 8) {
                throw new Error('This challenge supports a maximum of 8 players');
            }
            
            // Set win thresholds based on player count
            this.setWinThresholds(this.players.length);
            
            // Use existing role assignments from RoleManager and convert to team format for RPS challenge
            this.convertRolesToTeams();
            
            // Initialize team leader rotation with RANDOM order (not sequential)
            this.teamLeaderRotation = [...Array(this.players.length).keys()];
            // Shuffle the team leader rotation randomly using Fisher-Yates algorithm
            for (let i = this.teamLeaderRotation.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.teamLeaderRotation[i], this.teamLeaderRotation[j]] = [this.teamLeaderRotation[j], this.teamLeaderRotation[i]];
            }
            console.log(`🎲 Randomized Team Leader Order: ${this.teamLeaderRotation.map(i => this.players[i].name).join(' → ')}`);
            
            // Start the dynamic challenge with win condition display
            await this.showGameIntroduction();
            await this.startContinuousGameplay();
            
        } catch (error) {
            console.error('❌ Error initializing Dynamic Rock, Paper, Scissors Challenge:', error);
            throw error;
        }
    }
    
    // Set win thresholds based on player count
    setWinThresholds(playerCount) {
        const thresholds = {
            3: { good: 4, bad: 3 },
            4: { good: 5, bad: 3 },
            5: { good: 5, bad: 4 },
            6: { good: 6, bad: 5 },
            7: { good: 7, bad: 5 },
            8: { good: 8, bad: 6 }
        };
        
        this.winThresholds = thresholds[playerCount];
        
        console.log(`🎯 Win thresholds set: Good Team needs ${this.winThresholds.good} points, Bad Team needs ${this.winThresholds.bad} points`);
    }
    
    // Convert existing role assignments to team format for RPS challenge compatibility
    convertRolesToTeams() {
        console.log('🔄 Converting role assignments to team format for RPS challenge');
        
        this.players.forEach(player => {
            // Convert RoleManager format (role: 'Bad'/'Good') to RPS format (team: 'bad'/'good')
            player.team = player.role === 'Bad' ? 'bad' : 'good';
        });
        
        // Calculate team composition for logging
        const playerCount = this.players.length;
        const badTeamCount = this.players.filter(p => p.team === 'bad').length;
        const goodTeamCount = this.players.filter(p => p.team === 'good').length;
        
        console.log(`🎯 Team Composition (using existing role assignments):`);
        console.log(`📊 Bad Team: ${badTeamCount} players`);
        console.log(`📊 Good Team: ${goodTeamCount} players`);
        
        // Log specific rules based on player count and role assignments
        if (playerCount === 3 || playerCount === 4) {
            console.log(`📋 Rules: Standard gameplay - ${badTeamCount} Bad player operates in complete secret`);
        } else if (playerCount === 5) {
            console.log(`📋 Rules: ${badTeamCount} Bad players operating in secret without knowledge of each other (maximum chaos)`);
        } else if (playerCount === 6 || playerCount === 7) {
            console.log(`📋 Rules: ${badTeamCount} Bad players with ALLIANCE - they know each other's identities for strategic balance`);
        } else if (playerCount === 8) {
            console.log(`📋 Rules: ${badTeamCount} Bad players operating in secret without knowledge of each other (maximum chaos)`);
        }
        
        // Log actual team assignments (for debugging)
        const badPlayers = this.players.filter(p => p.team === 'bad').map(p => p.name);
        const goodPlayers = this.players.filter(p => p.team === 'good').map(p => p.name);
        console.log(`😈 Bad Team Members: ${badPlayers.join(', ')}`);
        console.log(`😇 Good Team Members: ${goodPlayers.join(', ')}`);
        
        // Validation check to ensure consistency
        const expectedBadCount = this.gameManager.getBadPlayers().length;
        const actualBadCount = this.players.filter(p => p.team === 'bad').length;
        
        if (actualBadCount !== expectedBadCount) {
            console.error(`❌ Team conversion error: Expected ${expectedBadCount} bad players, got ${actualBadCount}`);
            throw new Error(`Team conversion failed: Expected ${expectedBadCount} bad players, got ${actualBadCount}`);
        }
        
        console.log(`✅ Role-to-team conversion validated: ${actualBadCount} Bad, ${goodTeamCount} Good`);
    }
    
    async showGameIntroduction() {
        return new Promise(async (resolve) => {
            const overlay = this.createOverlay();
            
            // Add Begin Challenge Button
            const skipBtn = document.createElement('button');
            skipBtn.id = 'skip-intro-btn';
            skipBtn.innerHTML = '🎮 Begin Challenge';

            const cleanup = () => {
                if (this.voiceManager) {
                    this.voiceManager.stop();
                }
                if (this.soundManager) this.soundManager.playClick();
                if (overlay && overlay.parentNode) overlay.remove();
                if (skipBtn && skipBtn.parentNode) skipBtn.remove();
                resolve();
            };

            skipBtn.onclick = cleanup;
            document.body.appendChild(skipBtn);

            // Calculate team composition for display
            const playerCount = this.players.length;
            const badTeamCount = this.players.filter(p => p.team === 'bad').length;
            const goodTeamCount = this.players.filter(p => p.team === 'good').length;
            
            // Determine team reveal info based on player count
            let teamRevealInfo = "";
            if (playerCount === 6 || playerCount === 7) {
                teamRevealInfo = `<div style="background: rgba(255, 0, 0, 0.15); border: 2px solid #ff0000; border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <h4 style="color: #ff0000; margin-bottom: 10px;">🤝 Special Alliance Rule</h4>
                    <p style="color: #ffffff; font-size: 1.1rem;">With ${playerCount} players, Bad Team members know each other's identities for strategic balance.</p>
                </div>`;
            } else if (playerCount === 3 || playerCount === 4) {
                teamRevealInfo = `<div style="background: rgba(255, 255, 0, 0.15); border: 2px solid #ffaa00; border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <h4 style="color: #ffaa00; margin-bottom: 10px;">🔒 Standard Rules</h4>
                    <p style="color: #ffffff; font-size: 1.1rem;">With ${playerCount} players, all team identities remain completely secret. Trust no one!</p>
                </div>`;
            } else if (playerCount === 5 || playerCount === 8) {
                teamRevealInfo = `<div style="background: rgba(255, 255, 0, 0.15); border: 2px solid #ffaa00; border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <h4 style="color: #ffaa00; margin-bottom: 10px;">🔒 Secret Identities Rule</h4>
                    <p style="color: #ffffff; font-size: 1.1rem;">With ${playerCount} players, Bad Team members remain unknown to each other for maximum chaos.</p>
                </div>`;
            }
            
            overlay.innerHTML = `
                <div style="text-align: center; max-width: 900px; margin: 0 auto;">
                    <h1 style="font-family: 'Cinzel', serif; font-size: 3.5rem; color: #ff6b35; margin-bottom: 30px;">
                        🎯 DECEPTION DUEL CHALLENGE 🎯
                    </h1>
                    
                    <div style="background: rgba(255, 107, 53, 0.2); padding: 40px; border-radius: 25px; margin: 40px 0;">
                        <h3 style="color: #ff6b35; font-size: 2rem; margin-bottom: 25px;">⚡ First-to-Target Victory</h3>
                        <div style="text-align: left; font-size: 1.3rem; color: #ffffff; line-height: 1.8;">
                            <p><strong>Objective:</strong> First team to reach their target score wins instantly!</p>
                            <p><strong>Gameplay:</strong> Continuous turns with rotating Team Leaders</p>
                            <p><strong>Strategy:</strong> Every point matters - tension builds to the finale</p>
                        </div>
                    </div>

                    <div style="background: rgba(0, 255, 255, 0.15); border: 2px solid #00ffff; border-radius: 20px; padding: 30px; margin: 30px 0;">
                        <h3 style="color: #00ffff; font-size: 2rem; margin-bottom: 20px;">👥 Team Composition (${playerCount} Players)</h3>
                        <div style="display: flex; justify-content: center; gap: 40px; margin: 20px 0;">
                            <div style="text-align: center;">
                                <div style="background: rgba(0, 255, 0, 0.2); border: 2px solid #00ff00; border-radius: 15px; padding: 20px; min-width: 120px;">
                                    <h4 style="color: #00ff00; margin-bottom: 10px;">😇 GOOD TEAM</h4>
                                    <div style="font-size: 3rem; color: #00ff00; margin: 10px 0;">${goodTeamCount}</div>
                                    <p style="color: #ffffff; font-size: 1rem;">Players</p>
                                </div>
                            </div>
                            <div style="text-align: center;">
                                <div style="background: rgba(255, 0, 0, 0.2); border: 2px solid #ff0000; border-radius: 15px; padding: 20px; min-width: 120px;">
                                    <h4 style="color: #ff0000; margin-bottom: 10px;">😈 BAD TEAM</h4>
                                    <div style="font-size: 3rem; color: #ff0000; margin: 10px 0;">${badTeamCount}</div>
                                    <p style="color: #ffffff; font-size: 1rem;">Players</p>
                                </div>
                            </div>
                        </div>
                        
                        ${teamRevealInfo}
                    </div>
                    
                    <div style="background: rgba(255, 215, 0, 0.2); border: 3px solid #ffd700; border-radius: 20px; padding: 30px; margin: 30px 0;">
                        <h3 style="color: #ffd700; font-size: 2rem; margin-bottom: 20px;">🏆 WIN CONDITIONS</h3>
                        <div style="display: flex; justify-content: space-around; margin: 20px 0;">
                            <div style="text-align: center; flex: 1;">
                                <div style="background: rgba(0, 255, 0, 0.3); border: 2px solid #00ff00; border-radius: 15px; padding: 25px; margin: 0 10px;">
                                    <h4 style="color: #00ff00; font-size: 1.8rem; margin-bottom: 15px;">😇 GOOD TEAM</h4>
                                    <div style="font-size: 4rem; color: #00ff00; margin: 15px 0;">${this.winThresholds.good}</div>
                                    <p style="color: #ffffff; font-size: 1.2rem; font-weight: bold;">Points to Win</p>
                                </div>
                            </div>
                            
                            <div style="text-align: center; flex: 1;">
                                <div style="background: rgba(255, 0, 0, 0.3); border: 2px solid #ff0000; border-radius: 15px; padding: 25px; margin: 0 10px;">
                                    <h4 style="color: #ff0000; font-size: 1.8rem; margin-bottom: 15px;">😈 BAD TEAM</h4>
                                    <div style="font-size: 4rem; color: #ff0000; margin: 15px 0;">${this.winThresholds.bad}</div>
                                    <p style="color: #ffffff; font-size: 1.2rem; font-weight: bold;">Points to Win</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-around; margin: 40px 0;">
                        <div style="background: rgba(0, 255, 0, 0.2); border: 2px solid #00ff00; border-radius: 20px; padding: 30px; flex: 1; margin: 0 10px;">
                            <h3 style="color: #00ff00; font-size: 1.8rem; margin-bottom: 15px;">😇 CURRENT</h3>
                            <div style="font-size: 3rem; margin: 15px 0;">${this.gameScore.goodTeam} / ${this.winThresholds.good}</div>
                            <p style="color: #ffffff; font-size: 1.1rem;">Progress to Victory</p>
                        </div>
                        
                        <div style="background: rgba(255, 255, 0, 0.2); border: 2px solid #ffaa00; border-radius: 20px; padding: 30px; flex: 1; margin: 0 10px;">
                            <h3 style="color: #ffaa00; font-size: 1.8rem; margin-bottom: 15px;">🤝 TIES</h3>
                            <div style="font-size: 3rem; margin: 15px 0;">${this.gameScore.ties}</div>
                            <p style="color: #ffffff; font-size: 1.1rem;">Special rewards at 3 & 4</p>
                        </div>
                        
                        <div style="background: rgba(255, 0, 0, 0.2); border: 2px solid #ff0000; border-radius: 20px; padding: 30px; flex: 1; margin: 0 10px;">
                            <h3 style="color: #ff0000; font-size: 1.8rem; margin-bottom: 15px;">😈 CURRENT</h3>
                            <div style="font-size: 3rem; margin: 15px 0;">${this.gameScore.badTeam} / ${this.winThresholds.bad}</div>
                            <p style="color: #ffffff; font-size: 1.1rem;">Progress to Victory</p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255, 255, 0, 0.15); border: 2px solid #ffaa00; border-radius: 20px; padding: 30px; margin: 30px 0;">
                        <h3 style="color: #ffaa00; font-size: 1.8rem; margin-bottom: 20px;">⚖️ Strategic Rules</h3>
                        <div style="text-align: left; font-size: 1.2rem; color: #ffffff;">
                            <p>• Team Leaders cannot select the same player back-to-back</p>
                            <p>• No player may participate in consecutive rounds</p>
                            <p>• Random voting phases may activate for additional strategy</p>
                            <p>• Game ends INSTANTLY when a team reaches their target</p>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Enhanced voice announcement with win conditions (WITHOUT player introductions)
            let challengeText = `Welcome to the Deception Duel Challenge with ${playerCount} players! `;
            challengeText += `Team composition: ${goodTeamCount} Good Team players versus ${badTeamCount} Bad Team players. `;
            challengeText += `Win conditions: Good Team needs ${this.winThresholds.good} points, Bad Team needs ${this.winThresholds.bad} points. `;
            challengeText += `First team to reach their target wins instantly! Every point matters in this strategic battle! `;
            challengeText += ` Good luck to all players!`;
            
            if (this.voiceManager) {
                await this.voiceManager.speak(challengeText);
            }
        });
    }
    
    // Replace round-based system with continuous gameplay
    async startContinuousGameplay() {
        console.log('🎮 Starting continuous gameplay until win condition is met');
        
        // Start the team leader rotation
        this.currentTeamLeaderIndex = 0;
        await this.nextTeamLeaderTurn();
    }
    
    // Check win conditions after each point scored
    checkWinConditions() {
        if (this.gameEnded) return false;
        
        // Check if Good team has won
        if (this.gameScore.goodTeam >= this.winThresholds.good) {
            this.gameEnded = true;
            this.winningTeam = 'good';
            console.log('🏆 Good Team wins with', this.gameScore.goodTeam, 'points!');
            return true;
        }
        
        // Check if Bad team has won
        if (this.gameScore.badTeam >= this.winThresholds.bad) {
            this.gameEnded = true;
            this.winningTeam = 'bad';
            console.log('🏆 Bad Team wins with', this.gameScore.badTeam, 'points!');
            return true;
        }
        
        return false;
    }
    
    async nextTeamLeaderTurn() {
        // Check win conditions before starting next turn
        if (this.checkWinConditions()) {
            await this.showFinalVictoryScreen();
            return;
        }
        
        // Safety: Ensure no leftover intro elements persist if skipped/ended early
        if (document.getElementById('skip-intro-btn')) {
            document.getElementById('skip-intro-btn').remove();
        }

        // Select the next team leader
        await this.selectTeamLeader();
    }
    
    async selectTeamLeader() {
        // Select current team leader from rotation
        const teamLeaderIndex = this.teamLeaderRotation[this.currentTeamLeaderIndex];
        this.teamLeader = this.players[teamLeaderIndex];
        
        console.log(`🎯 Team Leader: ${this.teamLeader.name} (${this.teamLeader.colorName})`);
        
        const overlay = this.createOverlay();
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 3rem; color: #ff6b35; margin-bottom: 20px;">
                    🎯 Team Leader
                </h1>
                
                <div style="
                    background: linear-gradient(135deg, ${this.teamLeader.color}30, ${this.teamLeader.color}15);
                    border: 2px solid ${this.teamLeader.color};
                    border-radius: 20px;
                    padding: 20px;
                    margin: 20px 0;
                    box-shadow: 0 0 30px ${this.teamLeader.color}40;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: ${this.teamLeader.color};
                        border-radius: 50%;
                        box-shadow: 0 0 15px ${this.teamLeader.color}80;
                        flex-shrink: 0;
                    "></div>
                    
                    <h2 style="color: #ffffff; font-size: 2rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${this.teamLeader.name}
                    </h2>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.08); padding: 15px; border-radius: 15px; margin: 15px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 15px; font-size: 1.1rem; text-transform: uppercase;">📊 Progress to Victory</h3>
                    <div style="display: flex; justify-content: space-around; gap: 10px;">
                        <div style="text-align: center; flex: 1;">
                            <span style="color: #00ff00; font-size: 1rem;">😇 Good</span><br/>
                            <span style="color: #00ff00; font-size: 1.5rem; font-weight: bold;">${this.gameScore.goodTeam}/${this.winThresholds.good}</span>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <span style="color: #ffaa00; font-size: 1rem;">🤝 Ties</span><br/>
                            <span style="color: #ffaa00; font-size: 1.5rem; font-weight: bold;">${this.gameScore.ties}</span>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <span style="color: #ff0000; font-size: 1rem;">😈 Bad</span><br/>
                            <span style="color: #ff0000; font-size: 1.5rem; font-weight: bold;">${this.gameScore.badTeam}/${this.winThresholds.bad}</span>
                        </div>
                    </div>
                </div>
                
                <p style="font-size: 1.3rem; color: #ffffff; margin: 30px 0;">
                    Step forward to the console for your strategic decision.
                </p>
                
                <button id="start-turn-btn">
                    🎮 Start My Turn
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Voice announcement
        if (this.voiceManager) {
            await this.voiceManager.speak(`${this.teamLeader.name}, you are the Team Leader.`);
            await this.voiceManager.speak("Everyone else, turn away from the screen now.");
            await this.voiceManager.speak("Step forward to the console!");
        }
        
        document.getElementById('start-turn-btn').addEventListener('click', async () => {
            if (this.soundManager) this.soundManager.playClick();
            overlay.remove();
            await this.startRockPaperScissors();
        });
    }
    
    async startRockPaperScissors() {
        // AI makes its move (hidden from all but team leader)
        const moves = ['rock', 'paper', 'scissors'];
        this.aiMove = moves[Math.floor(Math.random() * moves.length)];
        
        const overlay = this.createOverlay();
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 1000px; margin: 0 auto;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 2.5rem; color: #ff6b35; margin-bottom: 20px;">
                    🤖 Team Leader's Strategic Console
                </h1>
                
                <!-- AI's Secret Move Section - Compact One-Line Mode -->
                <div style="
                    background: rgba(255, 107, 53, 0.15);
                    border: 2px solid #ff6b35;
                    border-radius: 15px;
                    padding: 15px 30px;
                    margin: 15px 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    box-shadow: 0 0 20px rgba(255, 107, 53, 0.2);
                ">
                    <h2 style="color: #ff6b35; font-size: 1.2rem; margin: 0;">🤖 AI Secret Move:</h2>
                    <img src="${this.getMoveImage(this.aiMove, false)}" style="width:50px; height:50px; object-fit:contain; filter: drop-shadow(0 0 5px #ff6b35);" alt="AI Move">
                    <h3 style="color: #ffffff; font-size: 1.5rem; margin: 0; letter-spacing: 2px; font-weight: 800;">
                        ${this.aiMove.toUpperCase()}
                    </h3>
                </div>
                
                <!-- Combined Selection Section -->
                <div style="display: flex; gap: 20px; margin: 15px 0; justify-content: center; flex-wrap: wrap; width: 100%;">
                    
                    <!-- Suggestion Selection (Advice) - Compact Horizontal Style -->
                    <div style="width: 100%; background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 20px; order: -1;">
                        <h3 style="color: #00ffff; font-size: 1.2rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">💭 Step 1: Choose Your "Advice"</h3>
                        <div id="move-selection" style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                            ${['rock', 'paper', 'scissors'].map(move => `
                                <div class="move-suggestion" data-move="${move}" style="
                                    background: rgba(255, 255, 255, 0.08);
                                    border: 2px solid rgba(255, 255, 255, 0.3);
                                    border-radius: 15px;
                                    padding: 10px 20px;
                                    cursor: pointer;
                                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                                    text-align: center;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    gap: 10px;
                                    min-width: 120px;
                                ">
                                    <div style="width:60px; height:60px;">
                                        <img src="${this.getMoveImage(move, true)}" style="width:100%; height:100%; object-fit:contain;" alt="${move}">
                                    </div>
                                    <h4 style="color: #ffffff; margin: 0; text-transform: uppercase; font-size: 1rem; letter-spacing: 1px;">
                                        ${move}
                                    </h4>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Player Selection -->
                    <div style="flex: 1; min-width: 300px; padding: 10px;">
                        <h3 style="color: #ffffff; font-size: 1.2rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">👥 Step 2: Choose Your Teammate</h3>
                        <div id="player-selection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
                            ${this.renderPlayerSelection()}
                        </div>
                    </div>
                </div>
                
                <!-- Status Display -->
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 20px; margin: 30px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div id="player-status" style="color: #cccccc;">
                            <strong>Selected Player:</strong> <span id="selected-player-name">None</span>
                        </div>
                        <div id="move-status" style="color: #cccccc;">
                            <strong>Suggested Move:</strong> <span id="selected-move-name">None</span>
                        </div>
                    </div>
                </div>
                
                <!-- Confirm Button -->
                <button id="confirm-selections-btn" disabled>
                    ✅ Confirm Both Selections
                </button>
                
                <p style="font-size: 1rem; color: #ffaa00; margin-top: 15px;">
                    Make both selections above, then confirm to proceed
                </p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.bindCombinedSelection();
    }
    
    renderPlayerSelection() {
        // Get players excluding team leader and randomize their order
        const eligiblePlayers = this.players.filter(player => player !== this.teamLeader);
        
        // Randomize the order of eligible players for display
        const shuffledPlayers = [...eligiblePlayers];
        for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
        }
        
        return shuffledPlayers
            .map((player, index) => {
                const playerIndex = this.players.indexOf(player);
                const isDisabled = this.lastSelectedPlayer && this.lastSelectedPlayer === player;
                
                return `
                    <div class="teammate-option ${isDisabled ? 'disabled' : ''}" data-player="${playerIndex}" style="
                        background: linear-gradient(135deg, ${player.color}25, ${player.color}40);
                        border: 2px solid ${isDisabled ? '#444444' : player.color};
                        border-radius: 12px;
                        padding: 10px 15px;
                        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
                        transition: all 0.3s ease;
                        opacity: ${isDisabled ? '0.4' : '1'};
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        text-align: center;
                    ">
                        <div style="flex: 1; overflow: hidden;">
                            <h4 style="color: #ffffff; margin: 0; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800;">${player.name}</h4>
                            ${isDisabled ? '<p style="color: #ff4444; font-size: 0.75rem; margin: 2px 0 0 0;">(Locked)</p>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
    }
    
    /**
     * Ensure voice manager is properly connected
     * Returns the voice manager or null if not available
     */
    getVoiceManager() {
        // Check if voice manager is already set and working
        if (this.voiceManager && typeof this.voiceManager.speak === 'function') {
            return this.voiceManager;
        }
        
        // Try to get from gameManager
        if (this.gameManager) {
            if (this.gameManager.voiceManager && typeof this.gameManager.voiceManager.speak === 'function') {
                this.voiceManager = this.gameManager.voiceManager;
                return this.voiceManager;
            }
            
            // Try to get from audioManager
            if (window.audioManager && typeof window.audioManager.speak === 'function') {
                this.voiceManager = window.audioManager;
                return this.voiceManager;
            }
            
            // Try to create new VoiceManager
            if (typeof VoiceManager !== 'undefined') {
                try {
                    this.voiceManager = new VoiceManager();
                    return this.voiceManager;
                } catch (e) {
                    console.warn('Could not create VoiceManager:', e);
                }
            }
        }
        
        // Try global audioManager
        if (window.audioManager && typeof window.audioManager.speak === 'function') {
            this.voiceManager = window.audioManager;
            return this.voiceManager;
        }
        
        return null;
    }
    
    /**
     * Safely speak text with the voice manager
     * Returns true if speech was started, false otherwise
     */
    async safeSpeak(text, options = {}) {
        const voiceManager = this.getVoiceManager();
        
        if (!voiceManager) {
            console.warn('Voice manager not available, skipping speech:', text);
            return false;
        }
        
        try {
            await voiceManager.speak(text, options);
            return true;
        } catch (error) {
            console.warn('Error speaking text:', error);
            return false;
        }
    }
    
    bindCombinedSelection() {
        let isProcessing = false;
        let selectedPlayer = null;
        let selectedMove = null;

        // Add pulsing glow styles with thick white border
        if (!document.getElementById('selection-glow-styles')) {
            const style = document.createElement('style');
            style.id = 'selection-glow-styles';
            style.textContent = `
                @keyframes selection-pulse-glow {
                    0% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
                    50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(255, 255, 255, 1), inset 0 0 30px rgba(255, 255, 255, 0.5); }
                    100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
                }
                .selection-active {
                    border-color: #ffffff !important;
                    border-width: 8px !important;
                    animation: selection-pulse-glow 1.2s infinite ease-in-out !important;
                    z-index: 100;
                    position: relative;
                }
            `;
            document.head.appendChild(style);
        }

        // Auto-select if only one available
        const availablePlayers = this.players.filter(player => 
            player !== this.teamLeader && 
            !(this.lastSelectedPlayer && this.lastSelectedPlayer === player)
        );
        
        if (availablePlayers.length === 1) {
            selectedPlayer = availablePlayers[0];
            const singlePlayerOption = document.querySelector('.teammate-option:not(.disabled)');
            if (singlePlayerOption) {
                singlePlayerOption.classList.add('selection-active');
                document.getElementById('selected-player-name').textContent = selectedPlayer.name;
                document.getElementById('selected-player-name').style.color = '#ffffff';
            }
        }

        document.querySelectorAll('.teammate-option:not(.disabled)').forEach(option => {
            option.addEventListener('click', () => {
                if (isProcessing) return;
                const playerIndex = parseInt(option.dataset.player);
                selectedPlayer = this.players[playerIndex];
                
                if (this.soundManager) this.soundManager.playSelect();
                
                document.querySelectorAll('.teammate-option').forEach(opt => {
                    opt.classList.remove('selection-active');
                    const optPlayerIndex = parseInt(opt.dataset.player);
                    const optPlayer = this.players[optPlayerIndex];
                    const isDisabled = this.lastSelectedPlayer && this.lastSelectedPlayer === optPlayer;
                    opt.style.background = `linear-gradient(135deg, ${optPlayer.color}30, ${optPlayer.color}50)`;
                    opt.style.borderColor = isDisabled ? '#666666' : optPlayer.color;
                });
                
                option.classList.add('selection-active');
                document.getElementById('selected-player-name').textContent = selectedPlayer.name;
                document.getElementById('selected-player-name').style.color = '#ffffff';
                this.checkBothSelected(selectedPlayer, selectedMove);
            });
        });
        
        document.querySelectorAll('.move-suggestion').forEach(option => {
            option.addEventListener('click', () => {
                if (isProcessing) return;
                selectedMove = option.dataset.move;
                
                if (this.soundManager) this.soundManager.playSelect();
                
                document.querySelectorAll('.move-suggestion').forEach(opt => {
                    opt.classList.remove('selection-active');
                    opt.style.background = 'rgba(255, 255, 255, 0.1)';
                    opt.style.borderColor = '#ffffff';
                });
                
                option.classList.add('selection-active');
                document.getElementById('selected-move-name').textContent = selectedMove.toUpperCase();
                document.getElementById('selected-move-name').style.color = '#ffffff';
                this.checkBothSelected(selectedPlayer, selectedMove);
            });
        });
        
        // Double-click protection for confirm button
        let confirmSelectionsClicked = false;
        
        // Confirm button handler with double-click protection
        document.getElementById('confirm-selections-btn').addEventListener('click', async () => {
            // Prevent double clicks
            if (!selectedPlayer || !selectedMove || isProcessing || confirmSelectionsClicked) return;
            confirmSelectionsClicked = true;
            
            // Visual feedback that click was registered
            const confirmBtn = document.getElementById('confirm-selections-btn');
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            confirmBtn.textContent = 'PROCESSING...';
            
            // Proceed with selection
            try {
                isProcessing = true;
                console.log('🎯 Processing team leader selections...');
                
                this.chosenPlayer = selectedPlayer;
                this.suggestedMove = selectedMove;
                
                if (this.soundManager) {
                    this.soundManager.playClick();
                }
                
                document.querySelectorAll('.challenge-overlay').forEach(overlay => {
                    overlay.remove();
                });
                
                if (this.votingOverlay) {
                    this.votingOverlay.remove();
                    this.votingOverlay = null;
                }
                
                const blackScreen = document.createElement('div');
                blackScreen.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: #000000;
                    z-index: 999999;
                `;
                document.body.appendChild(blackScreen);
                
                await this.delay(100);
                blackScreen.remove();
                
                const shouldVote = this.completedFirstRound && this.players.length >= 5 && Math.random() < 0.3;
                
                if (shouldVote) {
                    console.log('🗳️ Second round voting phase activated!');
                    await this.showTeamVoting();
                } else {
                    if (this.voiceManager && this.chosenPlayer) {
                        try {
                            await Promise.race([
                                this.voiceManager.speak(`${this.chosenPlayer.name}, come forward to make your choice!`),
                                this.delay(5000)
                            ]);
                        } catch (error) {
                            console.warn('🎤 Voice manager error:', error);
                        }
                    }
                    await this.showPlayerDecision();
                }
                
            } catch (error) {
                console.error('❌ Error in confirm selections:', error);
                // Reset double-click protection on error
                confirmSelectionsClicked = false;
                isProcessing = false;
                const confirmBtn = document.getElementById('confirm-selections-btn');
                if (confirmBtn) {
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.pointerEvents = 'auto';
                    confirmBtn.textContent = '✅ Confirm Both Selections';
                }
                if (this.gameManager) {
                    this.gameManager.showError('An error occurred during selection. Please try again.');
                }
                document.querySelectorAll('.challenge-overlay, .player-decision-overlay').forEach(overlay => {
                    overlay.remove();
                });
            }
        });
        
        this.checkBothSelected(selectedPlayer, selectedMove);
    }
    
    checkBothSelected(player, move) {
        const confirmBtn = document.getElementById('confirm-selections-btn');
        if (player && move) {
            confirmBtn.style.opacity = '1';
            confirmBtn.style.pointerEvents = 'auto';
            confirmBtn.disabled = false;
        } else {
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.pointerEvents = 'none';
            confirmBtn.disabled = true;
        }
    }
    
    async showTeamVoting() {
        this.votes.clear();
        this.votingComplete = false;
        this.votingActive = true;
        
        if (this.votingOverlay) {
            this.votingOverlay.remove();
            this.votingOverlay = null;
        }
        
        document.querySelectorAll('.challenge-overlay, .player-decision-overlay').forEach(overlay => {
            overlay.remove();
        });
        
        const overlay = this.createOverlay();
        this.votingOverlay = overlay;
        
        const voters = this.players.filter(player => player !== this.teamLeader);
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #ff6b35; margin-bottom: 20px;">
                    🗳️ Team Vote
                </h1>
                
                <div style="background: rgba(255, 255, 0, 0.15); padding: 25px; border-radius: 15px; margin: 20px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 15px;">⚡ Second Round Voting Activated!</h3>
                    <p style="color: #ffffff; font-size: 1.1rem;">
                        The team must vote to approve or reject the Team Leader's choice
                    </p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 20px; margin: 30px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 20px;">Team Leader's Choice</h3>
                    <div style="
                        background: linear-gradient(135deg, ${this.chosenPlayer.color}30, ${this.chosenPlayer.color}50);
                        border: 2px solid ${this.chosenPlayer.color};
                        border-radius: 15px;
                        padding: 25px;
                        display: inline-block;
                        min-width: 200px;
                    ">
                        <div style="
                            width: 60px;
                            height: 60px;
                            background: ${this.chosenPlayer.color};
                            border-radius: 50%;
                            margin: 0 auto 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.8rem;
                            font-weight: bold;
                            color: ${this.getContrastColor(this.chosenPlayer.color)};
                        ">${this.players.indexOf(this.chosenPlayer) + 1}</div>
                        <h3 style="color: #ffffff; margin: 0;">${this.chosenPlayer.name}</h3>
                    </div>
                </div>
                
                <div style="background: rgba(255, 255, 0, 0.15); padding: 25px; border-radius: 15px; margin: 20px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 15px;">Vote: Allow this player to proceed?</h3>
                    <p style="color: #ffffff; font-size: 1.2rem;">
                        All players except the Team Leader must vote YES or NO
                    </p>
                </div>
                
                <div style="display: flex; justify-content: center; gap: 40px; margin: 40px 0;">
                    <button id="vote-yes-btn" style="
                        background: linear-gradient(135deg, #00ff00, #00cc00);
                        color: white;
                        border: none;
                        padding: 25px 40px;
                        font-size: 1.5rem;
                        border-radius: 15px;
                        cursor: pointer;
                        font-weight: bold;
                        min-width: 150px;
                    ">
                        ✅ YES
                    </button>
                    
                    <button id="vote-no-btn" style="
                        background: linear-gradient(135deg, #ff0000, #cc0000);
                        color: white;
                        border: none;
                        padding: 25px 40px;
                        font-size: 1.5rem;
                        border-radius: 15px;
                        cursor: pointer;
                        font-weight: bold;
                        min-width: 150px;
                    ">
                        ❌ NO
                    </button>
                </div>
                
                <div id="vote-status" style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-top: 30px;">
                    <p style="color: #ffffff; margin: 0;">Votes cast: <span id="votes-cast">0</span> / ${voters.length}</p>
                    <div id="vote-progress" style="background: rgba(255, 255, 255, 0.2); height: 10px; border-radius: 5px; margin-top: 10px; overflow: hidden;">
                        <div id="progress-bar" style="background: #ffaa00; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        if (this.voiceManager) {
            await this.voiceManager.speak(`Second round voting phase activated! Should ${this.chosenPlayer.name} be allowed to participate? Everyone except the Team Leader must vote yes or no.`);
        }
        
        let votesCast = 0;
        const totalVotes = voters.length;
        
        const castVote = (voteValue) => {
            if (!this.votingActive || votesCast >= totalVotes) return;
            this.votes.set(votesCast, voteValue);
            votesCast++;
            if (this.soundManager) this.soundManager.playSelect();
            document.getElementById('votes-cast').textContent = votesCast;
            document.getElementById('progress-bar').style.width = `${(votesCast / totalVotes) * 100}%`;
            if (votesCast >= totalVotes && this.votingActive) {
                this.votingActive = false;
                this.votingComplete = true;
                setTimeout(() => this.processVoteResult(), 500);
            }
        };
        
        document.getElementById('vote-yes-btn').onclick = () => castVote(true);
        document.getElementById('vote-no-btn').onclick = () => castVote(false);
    }
    
    async processVoteResult() {
        if (!this.votingComplete || !this.votingOverlay) return;
        let yesVotes = 0;
        let noVotes = 0;
        this.votes.forEach((vote) => { if (vote) yesVotes++; else noVotes++; });
        const totalVotes = yesVotes + noVotes;
        const majority = Math.floor(totalVotes / 2) + 1;
        let result = yesVotes >= majority ? 'yes' : 'no';
        let resultText = result === 'yes' ? 'APPROVED' : 'BLOCKED';
        if (this.votingOverlay) { this.votingOverlay.remove(); this.votingOverlay = null; }
        this.votingActive = false;
        this.votingComplete = false;
        await this.showVoteResult(result, resultText, yesVotes, noVotes);
    }
    
    async showVoteResult(result, resultText, yesVotes, noVotes) {
        document.querySelectorAll('.challenge-overlay').forEach(overlay => {
            if (overlay.innerHTML.includes('Team Vote')) overlay.remove();
        });
        
        const overlay = this.createOverlay();
        const resultColor = result === 'yes' ? '#00ff00' : '#ff0000';
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="color: ${resultColor}; margin-bottom: 30px; font-size: 3rem;">
                    🗳️ ${resultText}
                </h1>
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 20px; margin: 30px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 20px;">Vote Results</h3>
                    <div style="display: flex; justify-content: space-around;">
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; color: #00ff00;">${yesVotes}</div>
                            <p style="color: #ffffff; margin: 5px 0;">YES votes</p>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2.5rem; color: #ff0000;">${noVotes}</div>
                            <p style="color: #ffffff; margin: 5px 0;">NO votes</p>
                        </div>
                    </div>
                </div>
                
                <p style="color: #ffffff; font-size: 1.3rem; margin: 30px 0;">
                    ${result === 'yes' 
                        ? `${this.chosenPlayer.name} will participate in this round.`
                        : `${this.chosenPlayer.name} has been blocked. The Team Leader must choose another player.`
                    }
                </p>
                
                <button id="continue-vote-btn" style="
                    background: linear-gradient(135deg, ${resultColor}, ${resultColor}cc);
                    color: white;
                    border: none;
                    padding: 20px 40px;
                    font-size: 1.3rem;
                    border-radius: 15px;
                    cursor: pointer;
                    font-weight: bold;
                    margin-top: 30px;
                ">
                    Continue ➡️
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        if (this.voiceManager) await this.voiceManager.speak(`Vote ${resultText}!`);
        
        document.getElementById('continue-vote-btn').addEventListener('click', async () => {
            if (this.soundManager) this.soundManager.playClick();
            overlay.remove();
            
            if (result === 'yes') {
                if (this.voiceManager) await this.voiceManager.speak(`${this.chosenPlayer.name}, come forward to make your choice!`);
                await this.showPlayerDecision();
            } else {
                await this.startRockPaperScissors();
            }
        });
    }
    
    async showSuggestedMove() {
        const overlay = this.createOverlay();
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ff6b35; margin-bottom: 20px;">
                    💭 Choose Your "Advice"
                </h1>
                
                <p style="color: #ffffff; font-size: 1.2rem; margin-bottom: 30px;">
                    What move will you suggest to ${this.chosenPlayer.name}?<br>
                </p>
                
                <div style="display: flex; justify-content: space-around; margin: 40px 0;">
                    ${['rock', 'paper', 'scissors'].map(move => `
                        <div class="move-suggestion" data-move="${move}" style="
                            background: rgba(255, 255, 255, 0.1);
                            border: 2px solid #ffffff;
                            border-radius: 15px;
                            padding: 30px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            text-align: center;
                        ">
                            <div style="font-size: 4rem; margin-bottom: 10px;">
                                ${this.getMoveEmoji(move)}
                        </div>
                            <h3 style="color: #ffffff; margin: 0; text-transform: uppercase;">
                                ${move}
                            </h3>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.querySelectorAll('.move-suggestion').forEach(option => {
            option.addEventListener('click', async () => {
                this.suggestedMove = option.dataset.move;
                if (this.soundManager) this.soundManager.playSelect();
                overlay.remove();
                await this.showPlayerDecision();
            });
        });
    }
    
    async showPlayerDecision() {
        const overlay = this.createPlayerDecisionOverlay();
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="color: ${this.chosenPlayer.color}; margin-bottom: 20px;">
                    ${this.chosenPlayer.name}'s Choice
                </h1>
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 15px; margin: 30px 0;">
                    <h3 style="color: #ffaa00; margin-bottom: 15px;">Team Leader's Advice:</h3>
                    <div style="margin-bottom: 10px;">
                        <img src="${this.getMoveImage(this.suggestedMove, true)}" style="width:100px; height:100px; object-fit:contain;" alt="Suggested Move">
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-around; margin: 40px 0;">
                    ${['rock', 'paper', 'scissors'].map(move => `
                        <div class="final-move" data-move="${move}" style="
                            background: rgba(255, 255, 255, 0.1);
                            border: 2px solid #ffffff;
                            border-radius: 15px;
                            padding: 20px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            text-align: center;
                            min-width: 120px;
                        ">
                            <div style="width:100px; height:100px; margin: 0 auto 10px auto;">
                                <img src="${this.getMoveImage(move, true)}" style="width:100%; height:100%; object-fit:contain;" alt="${move}">
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <button id="confirm-choice-btn" disabled>
                    ✅ Confirm Choice
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        if (this.voiceManager) {
            await this.voiceManager.speak(`${this.chosenPlayer.name}, make your choice!`);
        }
        
        let selectedMove = null;
        
        document.querySelectorAll('.final-move').forEach(option => {
            option.addEventListener('click', () => {
                selectedMove = option.dataset.move;
                if (this.soundManager) this.soundManager.playSelect();
                document.querySelectorAll('.final-move').forEach(opt => {
                    opt.style.borderColor = '#ffffff';
                });
                option.style.borderColor = '#00ff00';
                const confirmBtn = document.getElementById('confirm-choice-btn');
                confirmBtn.style.opacity = '1';
                confirmBtn.disabled = false;
            });
        });
        
        document.getElementById('confirm-choice-btn').addEventListener('click', async () => {
            if (selectedMove) {
                this.playerMove = selectedMove;
                if (this.soundManager) this.soundManager.playClick();
                
                // 2-second dramatic pause before battle
                overlay.style.transition = 'opacity 0.5s ease';
                overlay.style.opacity = '0.5';
                
                await this.delay(2000);
                
                // Fade out completely
                overlay.style.opacity = '0';
                await this.delay(500);
                overlay.remove();
                
                // Create a transition overlay for the battle scene
                const transitionOverlay = document.createElement('div');
                transitionOverlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
                    background: #000; z-index: 10002; display: flex;
                    flex-direction: column; justify-content: center; align-items: center;
                `;
                transitionOverlay.innerHTML = `
                    <div id="ai-announcement" style="
                        font-family: 'Cinzel', serif; font-size: 1.8rem;
                        color: #ff6b35; text-align: center; max-width: 800px;
                        padding: 40px; opacity: 0; transition: opacity 1s ease;
                    ">
                        <p style="color: #ffffff; line-height: 1.8;">A decision has been made...</p>
                        <p style="color: #ffaa00; margin-top: 20px;">All players may now turn around</p>
                        <p style="color: #ff6b35; font-size: 2rem; margin-top: 30px;">Watch the epic battle duel!</p>
                    </div>
                `;
                document.body.appendChild(transitionOverlay);
                
                // Fade in announcement
                await this.delay(300);
                document.getElementById('ai-announcement').style.opacity = '1';
                
                // AI voice announcement during transition
                if (this.voiceManager) {
                    await this.voiceManager.speak("A decision has been made. All players may now turn around and watch the epic battle duel.");
                } else {
                    // If no voice manager, just wait
                    await this.delay(4000);
                }
                
                // Fade out announcement
                document.getElementById('ai-announcement').style.transition = 'opacity 0.5s ease';
                document.getElementById('ai-announcement').style.opacity = '0';
                
                // Create battle overlay (hidden initially) with minimalistic background
                const battleOverlay = document.createElement('div');
                battleOverlay.id = 'battle-overlay';
                battleOverlay.className = 'battle-overlay';
                battleOverlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100vh; 
                    background: #000000;
                    display: flex; flex-direction: column; justify-content: center; align-items: center; 
                    z-index: 10001; overflow: hidden; opacity: 0; transition: opacity 1s ease;
                `;
                
                // Pre-build the battle HTML structure - minimalistic design focused on hands
                battleOverlay.innerHTML = `
                    <div id="battle-arena" style="width:100%; display:flex; justify-content:space-around; align-items:center; position:relative; z-index:2; margin-bottom:20px; opacity:0; transition:opacity 0.5s ease 0.3s;">
                        <div id="player-hand" style="width:200px; height:200px; opacity:0;">
                            <img src="${this.getMoveImage('rock', true)}" style="width:100%; height:100%; object-fit:contain;" alt="Player">
                        </div>
                        
                        <div style="text-align:center; min-width:200px; opacity:0; transition:opacity 0.5s ease 0.5s;" id="center-area">
                            <div id="vs-text" style="font-size:5rem; color:#ffaa00; font-family:'Cinzel', serif; margin-bottom:20px;">VS</div>
                            <div id="rps-text" style="font-family:'Cinzel', serif; font-size:4rem; font-weight:bold; color:#ffffff; text-shadow:0 0 30px rgba(255,107,53,0.8);"></div>
                        </div>
                        
                        <div id="ai-hand" style="width:200px; height:200px; opacity:0;">
                            <img src="${this.getMoveImage('rock', false)}" style="width:100%; height:100%; object-fit:contain;" alt="AI">
                        </div>
                    </div>
                    
                    <div id="battle-result-text" style="margin-top:30px; font-size:3rem; font-family:'Cinzel', serif; color:#ffffff; opacity:0; transition:all 0.5s ease;"></div>
                `;
                
                document.body.appendChild(battleOverlay);
                
                // Remove transition overlay
                transitionOverlay.remove();
                
                // Fade in battle scene
                await this.delay(300);
                battleOverlay.style.opacity = '1';
                
                // Show arena elements progressively
                document.getElementById('battle-arena').style.opacity = '1';
                document.getElementById('center-area').style.opacity = '1';
                document.getElementById('player-hand').style.opacity = '1';
                document.getElementById('ai-hand').style.opacity = '1';
                
                // Calculate the winner BEFORE starting the animation
                this.gameResult = this.determineWinner(this.playerMove, this.aiMove);
                console.log(`🎯 Battle result: Player (${this.playerMove}) vs AI (${this.aiMove}) = ${this.gameResult}`);
                
                // AI announces "Ready, Go!" with slower, dramatic voice then waits 1.5 seconds
                if (this.soundManager) this.soundManager.playCountdownBeep(1);
                if (this.voiceManager) {
                    // Speak slowly with rate 0.7 for dramatic effect
                    await this.voiceManager.speak("Ready, Go!", { rate: 0.7, pitch: 1.0 });
                } else {
                    await this.delay(2000);
                }
                
                // Wait 1.5 seconds after "Ready, Go!" before starting the battle animation
                await this.delay(1000);
                
                // Now start the battle animation
                await this.animateBattleWithOverlay(battleOverlay);
                
                await this.showDeceptionAnalysis();
            }
        });
    }
    
    async animateBattleWithOverlay(battleOverlay) {
        const playerHand = document.getElementById('player-hand');
        const aiHand = document.getElementById('ai-hand');
        const rpsTextEl = document.getElementById('rps-text');
        const resultTextEl = document.getElementById('battle-result-text');

        // Play Rock Paper Scissors Shoot chant sound
        if (this.soundManager && typeof this.soundManager.playRPSChant === 'function') {
            this.soundManager.playRPSChant();
        }
        
        // During counting phase, show fist (rock) for both player and AI
        // Only reveal actual choice on "SHOOT!"
        const fistImage = this.getMoveImage('rock', true);
        const playerFist = this.getMoveImage('rock', true);
        const aiFist = this.getMoveImage('rock', false);
        
        // Set initial fist images for counting phase
        playerHand.innerHTML = `<img src="${playerFist}" style="width:200px; height:200px; object-fit:contain;" alt="Player Fist">`;
        aiHand.innerHTML = `<img src="${aiFist}" style="width:200px; height:200px; object-fit:contain;" alt="AI Fist">`;
        
        // Pre-load the actual move images for reveal
        const playerActualMoveSrc = this.getMoveImage(this.playerMove, true);
        const aiActualMoveSrc = this.getMoveImage(this.aiMove, false);
        
        // Perfectly synchronized animation - hands and text move together
        const swingDuration = 700; // ms per full swing
        const totalDuration = 3 * swingDuration;
        const startTime = Date.now();
        const words = ['Rock', 'Paper', 'Scissors', 'SHOOT!'];
        let currentWordIndex = -1; // Initialize to -1 to catch the first "Rock" (index 0)
        let revealed = false; // Track if we've revealed the moves
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                
                if (elapsed >= totalDuration) {
                    // End of 3 swings - hands at bottom, show SHOOT!
                    playerHand.style.transform = 'translateY(25px)';
                    aiHand.style.transform = 'translateY(25px)';
                    
                    // Show SHOOT! with dramatic effect
                    rpsTextEl.textContent = 'SHOOT!';
                    rpsTextEl.style.color = '#ff6b35';
                    rpsTextEl.style.fontSize = '7rem';
                    rpsTextEl.style.textShadow = '0 0 80px rgba(255,107,53,1), 0 0 150px rgba(255,107,53,0.8)';
                    rpsTextEl.style.transition = 'all 0.3s ease';
                    rpsTextEl.style.transform = 'scale(1.3)';
                    
                    // Play dramatic sound
                    if (this.soundManager) this.soundManager.playCountdownBeep(3);
                    
                    // Smooth reveal of actual moves with brief anticipation
                    setTimeout(() => {
                        if (!revealed) {
                            revealed = true;
                            
                            // Smooth reveal: fade out fist, swap, fade in actual move
                            // Use opacity transition for smooth reveal
                            const playerImg = playerHand.querySelector('img');
                            const aiImg = aiHand.querySelector('img');
                            
                            if (playerImg && aiImg) {
                                // Crossfade reveal of actual moves
                                playerImg.style.transition = 'opacity 0.15s ease-out';
                                aiImg.style.transition = 'opacity 0.15s ease-out';
                                playerImg.style.opacity = '0';
                                aiImg.style.opacity = '0';
                                
                                setTimeout(() => {
                                    // Swap to actual move images
                                    playerImg.src = playerActualMoveSrc;
                                    aiImg.src = aiActualMoveSrc;
                                    
                                    // Fade back in
                                    playerImg.style.opacity = '1';
                                    playerImg.style.transition = 'opacity 0.3s ease-in';
                                    aiImg.style.opacity = '1';
                                    aiImg.style.transition = 'opacity 0.3s ease-in';
                                }, 150);
                            }
                            
                            // Smooth hand movement to reveal position
                            playerHand.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                            playerHand.style.transform = 'translateY(0px) scale(1.2)';
                            
                            aiHand.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                            aiHand.style.transform = 'translateY(0px) scale(1.2)';
                            
                            // Settle text back
                            rpsTextEl.style.transform = 'scale(1)';
                            
                            if (this.soundManager) this.soundManager.playClick();
                            
                            // Continue to result after smooth animation completes
                            setTimeout(() => {
                                showResult();
                            }, 1000);
                        }
                    }, 300); // Brief pause after SHOOT! before reveal
                    
                    return;
                }
                
                // Calculate swing phase
                const progress = elapsed / totalDuration;
                const phase = progress * 3 * Math.PI * 2;
                
                // Hands motion: sine wave from top (-30px) to bottom (+30px)
                const y = -30 + Math.sin(phase - Math.PI / 2) * 60;
                const scale = 1 + Math.sin(phase - Math.PI / 2) * 0.05;
                
                playerHand.style.transform = `translateY(${y}px) scale(${scale})`;
                aiHand.style.transform = `translateY(${y}px) scale(${scale})`;
                
                // Determine which word to show based on swing phase
                const swingProgress = (elapsed % swingDuration) / swingDuration;
                const swingNumber = Math.floor(elapsed / swingDuration);
                
                // Show word during the upward motion of each swing (first half)
                if (swingProgress < 0.5 && swingNumber < 3) {
                    if (currentWordIndex !== swingNumber) {
                        currentWordIndex = swingNumber;
                        rpsTextEl.textContent = words[swingNumber];
                        rpsTextEl.style.transition = 'all 0.2s ease';
                        rpsTextEl.style.transform = 'scale(1.15)';
                        
                        if (this.soundManager) this.soundManager.playCountdownBeep(swingNumber + 1);
                        
                        setTimeout(() => {
                            rpsTextEl.style.transform = 'scale(1)';
                        }, 200);
                    }
                }
                
                requestAnimationFrame(animate);
            };
            
            // Start the logic loop
            animate();
            
            const showResult = () => {
                // Apply winner/loser styles (no grayscale, keep colors)
                if (this.gameResult === 'player') {
                    playerHand.style.filter = 'drop-shadow(0 0 50px #00ff00)';
                    playerHand.style.transform = 'scale(1.15)';
                    aiHand.style.filter = 'brightness(0.6)';
                    aiHand.style.transform = 'scale(0.95)';
                    resultTextEl.textContent = 'PLAYER WINS!';
                    resultTextEl.style.color = '#00ff00';
                    if (this.soundManager) this.soundManager.playGoodTeamWin();
                } else if (this.gameResult === 'ai') {
                    aiHand.style.filter = 'drop-shadow(0 0 50px #00ff00)';
                    aiHand.style.transform = 'scale(1.15)';
                    playerHand.style.filter = 'brightness(0.6)';
                    playerHand.style.transform = 'scale(0.95)';
                    resultTextEl.textContent = 'AI WINS!';
                    resultTextEl.style.color = '#ff0000';
                    if (this.soundManager) this.soundManager.playBadTeamWin();
                } else {
                    resultTextEl.textContent = "IT'S A TIE!";
                    resultTextEl.style.color = '#ffaa00';
                }
                
                resultTextEl.style.opacity = '1';
                resultTextEl.style.transform = 'translateY(-20px)';
                
                setTimeout(() => {
                    battleOverlay.style.opacity = '0';
                    setTimeout(() => {
                        battleOverlay.remove();
                        resolve();
                    }, 500);
                }, 2500);
            };
        });
    }
    
    async showAnimatedBattle() {
        this.gameResult = this.determineWinner(this.playerMove, this.aiMove);
        // Don't call animateBattle() - it's replaced by animateBattleWithOverlay()
        // The game result is already set above
    }
    
    async animateBattle() {
        // This method is kept for compatibility but animateBattleWithOverlay is now used
        return Promise.resolve();
    }
    
    async showDeceptionAnalysis() {
        if (this.gameResult === 'player') this.gameScore.goodTeam++;
        else if (this.gameResult === 'ai') this.gameScore.badTeam++;
        else {
            this.gameScore.ties++;
            if (this.gameScore.ties === 3) { if (Math.random() < 0.5) this.gameScore.goodTeam++; else this.gameScore.badTeam++; }
            else if (this.gameScore.ties === 4) { this.gameScore.goodTeam++; }
        }
        
        if (this.checkWinConditions()) await this.showFinalVictoryScreen();
        else await this.showRegularTurnAnalysis();
    }
    
    async showRegularTurnAnalysis() {
        const overlay = this.createOverlay();
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 3rem; color: #ff6b35; margin-bottom: 30px;">🎭 TURN OVER 🎭</h1>
                <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 20px; margin: 30px 0;">
                    <h2 style="color: #ffffff; font-size: 2.5rem;">Result: ${this.gameResult.toUpperCase()}</h2>
                    <p style="color: #ffffff; font-size: 1.5rem; margin-top: 20px;">
                        Good Team: ${this.gameScore.goodTeam} | Bad Team: ${this.gameScore.badTeam}
                    </p>
                    <button id="cont-ana-btn" style="background: linear-gradient(135deg, #ffaa00, #ff8800); color: white; border: none; padding: 20px 40px; font-size: 1.5rem; border-radius: 15px; cursor: pointer; font-weight: bold; margin-top: 30px;">Next Turn ➡️</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        if (this.voiceManager) await this.voiceManager.speak("Discuss and continue.");
        document.getElementById('cont-ana-btn').onclick = async () => {
            overlay.remove(); await this.completeTurn();
        };
    }
    
    async showFinalVictoryScreen() {
        // Remove any existing overlays first
        document.querySelectorAll('.challenge-overlay, .victory-overlay').forEach(o => o.remove());
        
        const isGoodTeam = this.winningTeam === 'good';
        const themeColor = isGoodTeam ? '#00ffff' : '#ff3333';
        const secondaryColor = isGoodTeam ? '#00ff88' : '#ff0000';
        const titleText = isGoodTeam ? 'VICTORY!' : 'DEFEAT!';
        const subtitleText = isGoodTeam ? 'THE GOOD TEAM' : 'THE BAD TEAM';
        
        // Play epic victory sound
        if (this.soundManager) {
            if (isGoodTeam) {
                this.soundManager.playGoodTeamWin();
            } else {
                this.soundManager.playBadTeamWin();
            }
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            min-height: 100vh;
            min-height: -webkit-fill-available;
            background: radial-gradient(ellipse at center, ${isGoodTeam ? '#001a1a' : '#1a0000'} 0%, #000000 100%);
            z-index: 20000;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            overflow-y: auto;
            overflow-x: hidden;
            font-family: 'Cinzel', serif;
            padding: 20px;
            padding-bottom: 40px;
            box-sizing: border-box;
        `;
        
        // Add animated particle background
        const particleContainer = document.createElement('div');
        particleContainer.id = 'victory-particles';
        particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        `;
        overlay.appendChild(particleContainer);
        
        // Create floating particles (fewer for mobile)
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const particleCount = isMobile ? 25 : 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = isMobile ? Math.random() * 6 + 3 : Math.random() * 8 + 4;
            const startX = Math.random() * 100;
            const duration = Math.random() * 3 + 2;
            const delay = Math.random() * 2;
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${Math.random() > 0.5 ? themeColor : secondaryColor};
                border-radius: 50%;
                left: ${startX}%;
                top: 100%;
                opacity: ${Math.random() * 0.6 + 0.3};
                box-shadow: 0 0 ${size * 2}px ${themeColor};
                animation: floatUp ${duration}s ease-out ${delay}s infinite;
            `;
            particleContainer.appendChild(particle);
        }
        
        // Main content container with proper scrolling
        const content = document.createElement('div');
        content.style.cssText = `
            text-align: center;
            z-index: 10;
            position: relative;
            animation: contentFadeIn 1s ease-out;
            max-width: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 20px;
        `;
        
        // Trophy emoji with responsive sizing
        const trophy = document.createElement('div');
        trophy.innerHTML = '🏆';
        trophy.style.cssText = `
            font-size: ${isMobile ? '5rem' : '8rem'};
            margin-bottom: 10px;
            animation: trophyBounce 2s ease-in-out infinite;
            text-shadow: 0 0 30px ${themeColor}, 0 0 60px ${themeColor}60;
        `;
        content.appendChild(trophy);
        
        // Main title with responsive sizing
        const title = document.createElement('h1');
        title.textContent = titleText;
        title.style.cssText = `
            font-size: ${isMobile ? '2rem' : '5rem'};
            font-weight: bold;
            color: ${themeColor};
            margin: 0 0 15px 0;
            letter-spacing: ${isMobile ? '3px' : '15px'};
            text-transform: uppercase;
            text-shadow: 
                0 0 20px ${themeColor},
                0 0 40px ${themeColor},
                0 0 60px ${themeColor}80;
            line-height: 1.2;
            word-wrap: break-word;
            max-width: 100%;
            padding: 0 10px;
            box-sizing: border-box;
        `;
        content.appendChild(title);
        
        // Subtitle with responsive sizing
        const subtitle = document.createElement('h2');
        subtitle.textContent = subtitleText;
        subtitle.style.cssText = `
            font-size: ${isMobile ? '1.5rem' : '3rem'};
            color: ${secondaryColor};
            margin: 0 0 20px 0;
            letter-spacing: ${isMobile ? '3px' : '10px'};
            text-shadow: 0 0 15px ${secondaryColor};
            line-height: 1.3;
            word-wrap: break-word;
            max-width: 100%;
            padding: 0 10px;
            box-sizing: border-box;
        `;
        content.appendChild(subtitle);
        
        // Score display with responsive sizing
        const scoreDisplay = document.createElement('div');
        scoreDisplay.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid ${themeColor};
            border-radius: 15px;
            padding: ${isMobile ? '15px 20px' : '30px 60px'};
            margin: 20px auto;
            max-width: 95%;
            width: 100%;
            box-shadow: 0 0 20px ${themeColor}30, inset 0 0 20px ${themeColor}10;
        `;
        scoreDisplay.innerHTML = `
            <div style="display: flex; justify-content: space-around; gap: ${isMobile ? '10px' : '40px'}; flex-wrap: wrap;">
                <div style="text-align: center; min-width: 80px;">
                    <div style="color: #00ff00; font-size: ${isMobile ? '1rem' : '1.5rem'};">😇 GOOD</div>
                    <div style="color: #ffffff; font-size: ${isMobile ? '2rem' : '3rem'}; font-weight: bold; margin-top: 5px;">${this.gameScore.goodTeam}</div>
                </div>
                <div style="text-align: center; min-width: 80px;">
                    <div style="color: #ffaa00; font-size: ${isMobile ? '1rem' : '1.5rem'};">🤝 TIES</div>
                    <div style="color: #ffffff; font-size: ${isMobile ? '2rem' : '3rem'}; font-weight: bold; margin-top: 5px;">${this.gameScore.ties}</div>
                </div>
                <div style="text-align: center; min-width: 80px;">
                    <div style="color: #ff0000; font-size: ${isMobile ? '1rem' : '1.5rem'};">😈 BAD</div>
                    <div style="color: #ffffff; font-size: ${isMobile ? '2rem' : '3rem'}; font-weight: bold; margin-top: 5px;">${this.gameScore.badTeam}</div>
                </div>
            </div>
        `;
        content.appendChild(scoreDisplay);
        
        // Victory stats with responsive sizing
        const statsText = isGoodTeam 
            ? `Victory achieved with ${this.gameScore.goodTeam} points!`
            : `Domination complete with ${this.gameScore.badTeam} points!`;
        const stats = document.createElement('p');
        stats.textContent = statsText;
        stats.style.cssText = `
            color: rgba(255, 255, 255, 0.9);
            font-size: ${isMobile ? '1.1rem' : '1.5rem'};
            margin: 20px 0;
            padding: 0 10px;
            box-sizing: border-box;
        `;
        content.appendChild(stats);
        
        // Save player data to localStorage for Play Again functionality
        this.savePlayerDataForReplay();
        
        // Create container for the two buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 40px;
            width: 100%;
        `;
        
        // Play Again With Same Players button
        const playAgainSameBtn = document.createElement('button');
        playAgainSameBtn.innerHTML = '🎮 Play Again With Same Players';
        playAgainSameBtn.style.cssText = `
            background: linear-gradient(135deg, ${themeColor}, ${secondaryColor});
            color: #000;
            border: none;
            padding: 20px 30px;
            font-size: 1.2rem;
            font-weight: bold;
            font-family: 'Cinzel', serif;
            border-radius: 50px;
            cursor: pointer;
            letter-spacing: 2px;
            text-transform: uppercase;
            box-shadow: 0 0 30px ${themeColor}60, 0 0 60px ${themeColor}40;
            transition: all 0.3s ease;
            animation: buttonPulse 2s ease-in-out infinite;
            max-width: 280px;
        `;
        
        playAgainSameBtn.onmouseover = () => {
            playAgainSameBtn.style.transform = 'scale(1.05)';
            playAgainSameBtn.style.boxShadow = `0 0 50px ${themeColor}, 0 0 100px ${themeColor}60`;
        };
        playAgainSameBtn.onmouseout = () => {
            playAgainSameBtn.style.transform = 'scale(1)';
            playAgainSameBtn.style.boxShadow = `0 0 30px ${themeColor}60, 0 0 60px ${themeColor}40`;
        };
        
        // Start New Game button
        const startNewGameBtn = document.createElement('button');
        startNewGameBtn.innerHTML = '🔄 Start New Game';
        startNewGameBtn.style.cssText = `
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: #000;
            border: none;
            padding: 20px 30px;
            font-size: 1.2rem;
            font-weight: bold;
            font-family: 'Cinzel', serif;
            border-radius: 50px;
            cursor: pointer;
            letter-spacing: 2px;
            text-transform: uppercase;
            box-shadow: 0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.3);
            transition: all 0.3s ease;
            max-width: 280px;
        `;
        
        startNewGameBtn.onmouseover = () => {
            startNewGameBtn.style.transform = 'scale(1.05)';
            startNewGameBtn.style.boxShadow = '0 0 40px rgba(255, 107, 53, 0.8), 0 0 60px rgba(255, 107, 53, 0.5)';
        };
        startNewGameBtn.onmouseout = () => {
            startNewGameBtn.style.transform = 'scale(1)';
            startNewGameBtn.style.boxShadow = '0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.3)';
        };
        
        // Double-click protection flags
        let playAgainSameClicked = false;
        let startNewGameClicked = false;
        
        // Play Again With Same Players - goes to color selection with saved players
        playAgainSameBtn.onclick = async () => {
            if (playAgainSameClicked) return;
            playAgainSameClicked = true;
            
            playAgainSameBtn.style.transform = 'scale(0.95)';
            playAgainSameBtn.textContent = 'LOADING...';
            playAgainSameBtn.style.opacity = '0.7';
            playAgainSameBtn.style.pointerEvents = 'none';
            
            if (this.soundManager) this.soundManager.playClick();
            
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            await new Promise(resolve => setTimeout(resolve, 600));
            overlay.remove();
            
            // Go directly to color selection with saved players
            await this.startColorSelectionWithSavedPlayersFromVictory();
        };
        
        // Start New Game - goes to main menu fresh
        startNewGameBtn.onclick = async () => {
            if (startNewGameClicked) return;
            startNewGameClicked = true;
            
            startNewGameBtn.style.transform = 'scale(0.95)';
            startNewGameBtn.textContent = 'LOADING...';
            startNewGameBtn.style.opacity = '0.7';
            startNewGameBtn.style.pointerEvents = 'none';
            
            if (this.soundManager) this.soundManager.playClick();
            
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            await new Promise(resolve => setTimeout(resolve, 600));
            overlay.remove();
            
            // Clear saved data and go to main menu
            this.clearSavedPlayerData();
            window.location.reload();
        };
        
        buttonsContainer.appendChild(playAgainSameBtn);
        buttonsContainer.appendChild(startNewGameBtn);
        content.appendChild(buttonsContainer);
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Add CSS animations
        if (!document.getElementById('victory-animations')) {
            const style = document.createElement('style');
            style.id = 'victory-animations';
            style.textContent = `
                @keyframes floatUp {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
                @keyframes orbFloat1 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(50px, -30px); }
                }
                @keyframes orbFloat2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-50px, 30px); }
                }
                @keyframes glowPulse {
                    0%, 100% { 
                        transform: scale(1);
                        opacity: 0.3;
                    }
                    50% { 
                        transform: scale(1.1);
                        opacity: 0.5;
                    }
                }
                @keyframes contentFadeIn {
                    0% {
                        opacity: 0;
                        transform: translateY(50px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes trophyBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes trophyGlow {
                    0% { text-shadow: 0 0 50px ${themeColor}, 0 0 100px ${themeColor}60; }
                    100% { text-shadow: 0 0 80px ${themeColor}, 0 0 150px ${themeColor}80, 0 0 200px ${themeColor}60; }
                }
                @keyframes titlePulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                @keyframes buttonPulse {
                    0%, 100% { box-shadow: 0 0 30px ${themeColor}60, 0 0 60px ${themeColor}40; }
                    50% { box-shadow: 0 0 50px ${themeColor}80, 0 0 80px ${themeColor}60; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Voice announcement with delay for dramatic effect
        setTimeout(async () => {
            if (this.voiceManager) {
                await this.voiceManager.speak(`${subtitleText} wins! Victory is yours! Congratulations to the winning team!`);
            }
        }, 1500);
    }
    
    async completeTurn() {
        this.lastSelectedPlayer = this.chosenPlayer;
        this.currentTeamLeaderIndex = (this.currentTeamLeaderIndex + 1) % this.teamLeaderRotation.length;
        await this.nextTeamLeaderTurn();
    }
    
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'challenge-overlay';
        overlay.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            height: calc(var(--vh, 1vh) * 100); 
            background: rgba(0, 0, 0, 0.95); 
            display: flex; 
            justify-content: center; 
            align-items: flex-start; 
            z-index: 10000; 
            color: white; 
            font-family: 'Cinzel', serif; 
            flex-direction: column;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px);
            box-sizing: border-box;
        `;
        return overlay;
    }
    
    createPlayerDecisionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'player-decision-overlay';
        overlay.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            height: calc(var(--vh, 1vh) * 100); 
            background: #000; 
            display: flex; 
            justify-content: center; 
            align-items: flex-start; 
            z-index: 10001;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: env(safe-area-inset-top, 20px) 10px env(safe-area-inset-bottom, 20px);
            box-sizing: border-box;
        `;
        return overlay;
    }
    
    getMoveEmoji(move) {
        // Fallback emojis (not used when images are available)
        switch (move) {
            case 'rock': return '✊';
            case 'paper': return '✋';
            case 'scissors': return '✌️';
            default: return '✊';
        }
    }
    
    getMoveImage(move, isPlayer) {
        // Return the appropriate PNG image path
        const prefix = isPlayer ? 'player' : 'AI';
        return `rockpaperscissorspng/${prefix}${move}.png`;
    }
    
    getContrastColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16), l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return l > 0.5 ? '#000000' : '#ffffff';
    }
    
    determineWinner(p, a) {
        if (p === a) return 'tie';
        const win = { 'rock': 'scissors', 'paper': 'rock', 'scissors': 'paper' };
        return win[p] === a ? 'player' : 'ai';
    }
    
    removeOldBattleElements() {
        const b = document.querySelector('.battle-overlay');
        if (b) b.remove();
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Save current player data to localStorage for Play Again functionality
     * Preserves player names and colors so players don't need to re-enter them
     */
    savePlayerDataForReplay() {
        try {
            const playersData = this.players.map(player => ({
                name: player.name,
                color: player.color,
                colorName: player.colorName
            }));
            
            // Save to localStorage with a unique key
            const storageKey = 'spyAcademy_lastPlayers';
            localStorage.setItem(storageKey, JSON.stringify(playersData));
            
            console.log('✅ Player data saved for replay:', playersData.length, 'players');
            return true;
        } catch (error) {
            console.error('❌ Error saving player data for replay:', error);
            return false;
        }
    }
    
    /**
     * Get saved player data from localStorage
     * @returns {Array|null} Array of saved player objects or null if none saved
     */
    getSavedPlayerData() {
        try {
            const storageKey = 'spyAcademy_lastPlayers';
            const savedData = localStorage.getItem(storageKey);
            
            if (savedData) {
                const playersData = JSON.parse(savedData);
                console.log('✅ Retrieved saved player data:', playersData.length, 'players');
                return playersData;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error retrieving saved player data:', error);
            return null;
        }
    }
    
    /**
     * Return to main menu with saved player data pre-loaded
     * This allows players to quickly start a new game without re-entering names
     */
    async returnToMainMenuWithSavedPlayers() {
        try {
            console.log('🎮 Returning to main menu with saved players...');
            
            // Stop any playing sounds first
            if (this.soundManager) {
                try {
                    this.soundManager.stopBackgroundMusic();
                    this.soundManager.stopIntroMusic();
                } catch (e) {
                    console.warn('Error stopping sounds:', e);
                }
            }
            
            // Stop any voice output
            if (this.voiceManager) {
                try {
                    this.voiceManager.stop();
                } catch (e) {
                    console.warn('Error stopping voice:', e);
                }
            }
            
            // Clean up ALL overlays completely first
            const allOverlays = document.querySelectorAll('.challenge-overlay, .victory-overlay, .player-decision-overlay, .battle-overlay, #role-assignment-overlay, #player-call-screen, #player-secret-screen, #next-player-prompt, #voting-overlay');
            allOverlays.forEach(el => {
                if (el && el.parentNode) el.remove();
            });
            
            // Remove any animation styles that might be blocking
            document.body.style.overflow = 'auto';
            document.body.style.position = 'static';
            
            // Get saved player data FIRST
            const savedPlayers = this.getSavedPlayerData();
            console.log('📋 Saved players:', savedPlayers ? savedPlayers.length : 0);
            
            // Hide ALL game scenes first
            const allScenes = ['main-menu', 'player-selection', 'color-selection', 'challenge-container', 'game-over', 'victory'];
            allScenes.forEach(sceneId => {
                const scene = document.getElementById(sceneId);
                if (scene) {
                    scene.classList.remove('active');
                    scene.style.display = 'none';
                    scene.style.opacity = '0';
                    scene.style.visibility = 'hidden';
                    scene.style.zIndex = '';
                }
            });
            
            // Store saved players in global variable
            window.savedPlayersForReplay = savedPlayers;
            
            // Force show main menu with inline styles to ensure visibility
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
                mainMenu.style.cssText = `
                    display: block !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    z-index: 1000 !important;
                    position: relative !important;
                `;
                mainMenu.classList.add('active');
                console.log('✅ Main menu displayed with saved players');
            } else {
                console.error('❌ Main menu element not found!');
            }
            
            // If we have saved players, proceed directly to color selection (skip player count)
            if (savedPlayers && savedPlayers.length > 0) {
                console.log('🎮 Found', savedPlayers.length, 'saved players - proceeding to color selection');
                
                // Short delay then go to color selection
                setTimeout(async () => {
                    await this.startColorSelectionWithSavedPlayers(savedPlayers);
                }, 200);
            } else {
                console.log('🎮 No saved players found - main menu ready for new game');
            }
            
        } catch (error) {
            console.error('❌ Error returning to main menu with saved players:', error);
            
            // Fallback: reload the page gracefully
            console.log('🔄 Falling back to page reload...');
            window.location.reload();
        }
    }
    
    /**
     * Start color selection with saved player data
     * Skips the player count selection and goes straight to confirming colors
     */
    async startColorSelectionWithSavedPlayers(savedPlayers) {
        try {
            const playerCount = savedPlayers.length;
            console.log('🎮 Starting color selection with', playerCount, 'saved players');
            
            // Hide main menu
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
                mainMenu.classList.remove('active');
                mainMenu.style.display = 'none';
            }
            
            // Show color selection
            const colorSelection = document.getElementById('color-selection');
            if (colorSelection) {
                colorSelection.style.display = 'block';
                colorSelection.classList.add('active');
                
                // Set up color selection with saved data using the app's method
                if (window.LightChallengeApp && typeof window.LightChallengeApp.setupColorSelectionWithSavedData === 'function') {
                    window.LightChallengeApp.setupColorSelectionWithSavedData(savedPlayers);
                } else {
                    // Fallback: manual setup
                    this.manualSetupColorSelection(savedPlayers);
                }
                
                console.log('✅ Color selection set up with saved players');
            }
            
        } catch (error) {
            console.error('❌ Error starting color selection with saved players:', error);
            
            // Fallback: reload the page
            window.location.reload();
        }
    }
    
    /**
     * Manual fallback to set up color selection with saved players
     * Used if the main app method is not available
     */
    manualSetupColorSelection(savedPlayers) {
        const colorGrid = document.getElementById('color-grid');
        let confirmButton = document.getElementById('confirm-colors');
        
        if (!colorGrid || !confirmButton) {
            console.error('❌ Color selection elements not found');
            return;
        }
        
        // Available colors mapping
        const colorNameToHex = {
            'Red': { hex: '#ff0000', emoji: '🔴' },
            'Green': { hex: '#00ff00', emoji: '🟢' },
            'Blue': { hex: '#0080ff', emoji: '🔵' },
            'Yellow': { hex: '#ffff00', emoji: '🟡' },
            'Orange': { hex: '#ff8000', emoji: '🟠' },
            'Purple': { hex: '#8000ff', emoji: '🟣' },
            'Pink': { hex: '#ff0080', emoji: '🌸' },
            'Cyan': { hex: '#00ff80', emoji: '💎' }
        };
        
        const playerCount = savedPlayers.length;
        const selectedColors = [...savedPlayers];
        
        // Create the color selection UI with saved data (Using Dropdown)
        let colorGridHTML = '';
        for (let i = 0; i < playerCount; i++) {
            const savedPlayer = savedPlayers[i];
            const savedHex = savedPlayer.color || colorNameToHex[savedPlayer.colorName] || '#ffffff';
            
            colorGridHTML += `
                <div class="player-color-row">
                    <div class="player-name-section">
                        <input type="text" 
                               id="player-${i + 1}-name" 
                               class="player-name-input" 
                               placeholder="Enter name"
                               value="${savedPlayer.name}"
                               maxlength="20">
                    </div>
                    <div class="color-dropdown-section">
                        <select class="color-select" data-player="${i}">
                            ${Object.entries(colorNameToHex).map(([name, info]) => `
                                <option value="${info.hex}" data-name="${name}" ${info.hex === savedHex ? 'selected' : ''}>
                                    ${info.emoji} ${name.toUpperCase()}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;
        }
        
        colorGrid.innerHTML = colorGridHTML;
        
        // Show confirm button immediately
        confirmButton.style.display = 'block';
        confirmButton.disabled = false;
        
        // Add event listeners for dropdown selection
        colorGrid.querySelectorAll('.color-select').forEach(select => {
            const updateSelectStyle = (el) => {
                const color = el.value;
                el.style.backgroundColor = color;
                // Simple contrasting color
                const r = parseInt(color.substr(1,2),16);
                const g = parseInt(color.substr(3,2),16);
                const b = parseInt(color.substr(5,2),16);
                const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                el.style.color = l > 0.5 ? '#000000' : '#ffffff';
                el.style.borderColor = color;
            };

            // Initial style
            updateSelectStyle(select);

            select.addEventListener('change', (e) => {
                const playerIndex = parseInt(select.dataset.player);
                const color = select.value;
                const colorName = select.options[select.selectedIndex].dataset.name;
                const nameInput = document.getElementById(`player-${playerIndex + 1}-name`);
                
                // Update selected colors
                selectedColors[playerIndex] = {
                    color: color,
                    colorName: colorName,
                    name: nameInput.value.trim() || `Player ${playerIndex + 1}`
                };
                
                if (this.soundManager) this.soundManager.playSelect();
                
                // Update all dropdowns to hide newly selected color
                colorGrid.querySelectorAll('.color-select').forEach(s => {
                    const sIndex = parseInt(s.dataset.player);
                    const sValue = s.value;
                    Array.from(s.options).forEach(opt => {
                        const isTakenByOther = selectedColors.some((sc, idx) => 
                            idx !== sIndex && sc && sc.color === opt.value
                        );
                        if (isTakenByOther && opt.value !== sValue) {
                            opt.disabled = true;
                            opt.style.display = 'none';
                        } else {
                            opt.disabled = false;
                            opt.style.display = 'block';
                        }
                    });
                    updateSelectStyle(s);
                });
            });
        });
        
        // Add event listeners for name inputs
        for (let i = 0; i < playerCount; i++) {
            const nameInput = document.getElementById(`player-${i + 1}-name`);
            if (nameInput) {
                nameInput.addEventListener('input', () => {
                    if (selectedColors[i]) {
                        selectedColors[i].name = nameInput.value.trim() || `Player ${i + 1}`;
                    }
                });
            }
        }
        
        // Double-click protection flag
        let confirmClicked = false;
        
        // Setup confirm button handler - properly start the game with saved players
        confirmButton.onclick = async () => {
            // Prevent double clicks
            if (confirmClicked || confirmButton.disabled) return;
            confirmClicked = true;
            confirmButton.disabled = true;
            
            // Visual feedback
            confirmButton.style.opacity = '0.7';
            confirmButton.textContent = 'STARTING...';
            
            if (this.soundManager) this.soundManager.playClick();
            
            // Prepare player data
            const playersData = selectedColors.map((player, index) => ({
                name: player.name || `Player ${index + 1}`,
                color: player.color,
                colorName: player.colorName
            }));
            
            console.log('🎮 Starting replay game with players:', playersData);
            
            // Stop any playing sounds
            if (this.soundManager) {
                try {
                    this.soundManager.stopIntroMusic();
                } catch (e) {}
            }
            
            // Hide color selection and start role assignment
            const colorSelection = document.getElementById('color-selection');
            const challengeContainer = document.getElementById('challenge-container');
            
            if (colorSelection && challengeContainer) {
                colorSelection.classList.remove('active');
                colorSelection.style.display = 'none';
                
                challengeContainer.style.display = 'block';
                challengeContainer.classList.add('active');
                
                // Use the existing window.gameManager (already created at page load)
                try {
                    if (window.gameManager) {
                        // Reset for replay but keep managers
                        window.gameManager.resetForReplay();
                        
                        // Ensure managers are initialized
                        if (!window.gameManager.gameState?.isInitialized) {
                            await window.gameManager.initializeManagers();
                        }
                        
                        // Start role assignment with players data
                        if (window.gameManager.roleManager) {
                            await window.gameManager.roleManager.startRoleAssignment(playersData);
                            console.log('✅ Role assignment started for replay');
                        } else {
                            throw new Error('Role manager not available');
                        }
                    } else {
                        throw new Error('Game manager not available');
                    }
                } catch (error) {
                    console.error('❌ Error starting replay game:', error);
                    // Fallback: reload with player data
                    try {
                        const playerDataParam = encodeURIComponent(JSON.stringify(playersData));
                        localStorage.setItem('spyAcademy_replayData', playerDataParam);
                        window.location.reload();
                    } catch (e) {
                        alert('Error starting replay game. Please refresh the page.');
                    }
                }
            } else {
                console.error('❌ Color selection or challenge container not found');
                window.location.reload();
            }
        };
        
        console.log('✅ Manual color selection setup complete');
    }
    
    /**
     * Start color selection with saved players directly from victory screen
     * This skips the main menu and player count selection, going straight to color selection
     */
    async startColorSelectionWithSavedPlayersFromVictory() {
        try {
            const savedPlayers = this.getSavedPlayerData();
            
            if (!savedPlayers || savedPlayers.length === 0) {
                console.warn('⚠️ No saved players found, falling back to main menu');
                window.location.reload();
                return;
            }
            
            console.log('🎮 Starting color selection from victory with', savedPlayers.length, 'saved players');
            
            // Store in global variable for player selection handler
            window.savedPlayersForReplay = savedPlayers;
            
            // Hide victory scene
            const victoryScene = document.getElementById('victory');
            if (victoryScene) {
                victoryScene.classList.remove('active');
                victoryScene.style.display = 'none';
            }
            
            // Also hide game-over scene if it exists
            const gameOverScene = document.getElementById('game-over');
            if (gameOverScene) {
                gameOverScene.classList.remove('active');
                gameOverScene.style.display = 'none';
            }
            
            // Hide main menu if it's showing
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
                mainMenu.classList.remove('active');
                mainMenu.style.display = 'none';
            }
            
            // Hide challenge container
            const challengeContainer = document.getElementById('challenge-container');
            if (challengeContainer) {
                challengeContainer.classList.remove('active');
                challengeContainer.style.display = 'none';
            }
            
            // Show color selection
            const colorSelection = document.getElementById('color-selection');
            if (colorSelection) {
                colorSelection.style.display = 'block';
                colorSelection.classList.add('active');
                
                // Set up color selection with saved data
                if (window.LightChallengeApp && typeof window.LightChallengeApp.setupColorSelectionWithSavedData === 'function') {
                    window.LightChallengeApp.setupColorSelectionWithSavedData(savedPlayers);
                } else {
                    this.manualSetupColorSelection(savedPlayers);
                }
                
                console.log('✅ Color selection displayed with saved players');
            } else {
                throw new Error('Color selection scene not found');
            }
            
        } catch (error) {
            console.error('❌ Error starting color selection from victory:', error);
            window.location.reload();
        }
    }
    
    /**
     * Clear saved player data from localStorage
     * Called when user chooses to start a completely new game
     */
    clearSavedPlayerData() {
        try {
            const storageKey = 'spyAcademy_lastPlayers';
            localStorage.removeItem(storageKey);
            window.savedPlayersForReplay = null;
            console.log('✅ Saved player data cleared');
        } catch (error) {
            console.error('❌ Error clearing saved player data:', error);
        }
    }
}

window.RockPaperScissorsChallenge = RockPaperScissorsChallenge;
