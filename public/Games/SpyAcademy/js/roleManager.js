/**
 * Role Manager for Social Deduction Mechanics
 * Handles secret role assignment and win conditions
 */

class RoleManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.voiceManager = null;
        this.soundManager = null;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.isAssigningRoles = false;
        
        console.log('🎭 Role Manager initialized');
    }
    
    setVoiceManager(voiceManager) {
        this.voiceManager = voiceManager;
    }
    
    setSoundManager(soundManager) {
        this.soundManager = soundManager;
    }
    
    async startRoleAssignment(playersData) {
        console.log('🎭 Starting role assignment for', playersData.length, 'players');
        
        // Reset state
        this.players = [];
        this.currentPlayerIndex = 0;
        this.isAssigningRoles = true;
        
        // Create player objects with roles
        this.generatePlayerRoles(playersData);
        
        // Start with Game Introduction before role assignment
        await this.showGameIntroduction();
        
        // Start the assignment process
        await this.showInitialInstructions();
    }

    async showGameIntroduction() {
        return new Promise(async (resolve) => {
            // Create overlay for game introduction
            const overlay = document.createElement('div');
            overlay.id = 'game-introduction-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                height: calc(var(--vh, 1vh) * 100);
                background: linear-gradient(135deg, rgba(0, 5, 20, 0.98), rgba(0, 20, 40, 0.98));
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                z-index: 11000;
                animation: fadeIn 1s ease-out;
                padding: calc(env(safe-area-inset-top, 0px) + 40px) 20px 120px;
                box-sizing: border-box;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: linear-gradient(135deg, rgba(0, 40, 80, 0.8), rgba(0, 80, 120, 0.8));
                border: 3px solid #00ffff;
                border-radius: 30px;
                padding: 40px 30px;
                max-width: 800px;
                width: 100%;
                text-align: center;
                box-shadow: 0 0 80px rgba(0, 255, 255, 0.3);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                margin: 0 auto;
                flex-shrink: 0;
            `;

            content.innerHTML = `
                <div style="margin-bottom: 40px;">
                    <h1 style="font-family: 'Cinzel', serif; font-size: clamp(2.5rem, 8vw, 4rem); color: #00ffff; margin-bottom: 20px; text-shadow: 0 0 30px rgba(0, 255, 255, 0.8); letter-spacing: 5px;">
                        WELCOME AGENTS
                    </h1>
                    <div style="width: 100px; height: 4px; background: #00ffff; margin: 0 auto 30px; box-shadow: 0 0 20px #00ffff;"></div>
                    <div style="font-size: clamp(1.2rem, 4vw, 1.6rem); color: #ffffff; line-height: 1.8; text-align: left; padding: 0 10px;">
                        <p style="margin: 20px 0; color: #00ffff; font-weight: bold; text-align: center;">MISSION BRIEFING IN PROGRESS...</p>
                        <p style="margin: 15px 0; opacity: 0.9;">Welcome to the <strong>Spy Academy</strong>. You have been selected from thousands of recruits for your unique analytical skills and mental fortitude.</p>
                        <p style="margin: 15px 0; opacity: 0.9;">But be warned: our intelligence suggests that <strong>double agents</strong> have compromised our ranks. Their goal is to sabotage our mission from within.</p>
                        <p style="margin: 15px 0; opacity: 0.9;">Your objective is to complete the challenges ahead while identifying the saboteurs among you. Failure is not an option.</p>
                        <p style="margin: 25px 0; color: #ffaa00; font-weight: bold; text-align: center; font-family: 'Cinzel', serif; letter-spacing: 2px;">TRUST NO ONE. COMPLETE THE MISSION.</p>
                    </div>
                </div>
            `;

            const startBtn = document.createElement('button');
            startBtn.id = 'begin-impressions-btn'; // Reusing or new ID
            startBtn.innerHTML = '🛡️ BEGIN MISSION';
            startBtn.className = 'confirm-btn'; // Use consistent class
            startBtn.style.cssText = `
                position: fixed !important;
                bottom: 40px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 22000 !important;
                background: linear-gradient(135deg, #00ffff 0%, #0080ff 100%) !important;
                color: #000 !important;
                font-family: 'Orbitron', sans-serif !important;
                font-weight: 800 !important;
                padding: 20px 50px !important;
                border-radius: 50px !important;
                border: 2px solid rgba(255,255,255,0.4) !important;
                cursor: pointer !important;
                letter-spacing: 2px !important;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5) !important;
            `;

            const cleanup = () => {
                if (this.voiceManager) this.voiceManager.stop();
                if (this.soundManager) this.soundManager.playClick();
                overlay.remove();
                startBtn.remove();
                resolve();
            };

            startBtn.onclick = cleanup;

            overlay.appendChild(content);
            document.body.appendChild(overlay);
            document.body.appendChild(startBtn);

            // AI introduction script
            const introScript = "Welcome to the Spy Academy. You have been selected from thousands of recruits for your unique analytical skills and mental fortitude. But be warned: our intelligence suggests that double agents have compromised our ranks. Their goal is to sabotage our mission from within. Your objective is to complete the challenges ahead while identifying the saboteurs among you. Trust no one. Complete the mission. Failure is not an option. Good luck, agents.";

            if (this.voiceManager) {
                await this.voiceManager.speak(introScript);
            }
        });
    }
    
    generatePlayerRoles(playersData) {
        const playerCount = playersData.length;
        
        // Validate player count
        if (playerCount < 3 || playerCount > 8) {
            console.error('❌ Invalid player count:', playerCount);
            throw new Error('Player count must be between 3 and 8');
        }
        
        // Create players with names and initial Good roles
        for (let i = 0; i < playerCount; i++) {
            this.players.push({
                index: i,
                name: playersData[i].name,
                color: playersData[i].color,
                colorName: playersData[i].colorName,
                role: 'Good',
                hasReceived: false,
                partnerId: null // For Bad players who know each other
            });
        }
        
        // Dynamic role distribution based on player count
        let badPlayerCount = 0;
        let badPlayersKnowEachOther = false;
        
        switch (playerCount) {
            case 3:
                badPlayerCount = 1;
                badPlayersKnowEachOther = false;
                break;
            case 4:
                badPlayerCount = 1;
                badPlayersKnowEachOther = false;
                break;
            case 5:
                badPlayerCount = 2;
                badPlayersKnowEachOther = false;
                break;
            case 6:
                badPlayerCount = 2;
                badPlayersKnowEachOther = true; // KEY MECHANIC - Reveal Stage
                break;
            case 7:
                badPlayerCount = 2;
                badPlayersKnowEachOther = true; // KEY MECHANIC - Reveal Stage
                break;
            case 8:
                badPlayerCount = 3;
                badPlayersKnowEachOther = false;
                break;
        }
        
        // Randomly select Bad players
        const badPlayerIndices = [];
        while (badPlayerIndices.length < badPlayerCount) {
            const randomIndex = Math.floor(Math.random() * playerCount);
            if (!badPlayerIndices.includes(randomIndex)) {
                badPlayerIndices.push(randomIndex);
            }
        }
        
        // Assign Bad roles
        badPlayerIndices.forEach(index => {
            this.players[index].role = 'Bad';
        });
        
        // Set up partner relationships for 6 and 7 player games
        if (badPlayersKnowEachOther && badPlayerIndices.length === 2) {
            this.players[badPlayerIndices[0]].partnerId = badPlayerIndices[1];
            this.players[badPlayerIndices[1]].partnerId = badPlayerIndices[0];
        }
        
        // Store metadata for reveal stage
        this.badPlayersKnowEachOther = badPlayersKnowEachOther;
        
        // RANDOMIZE THE ORDER for role assignment (but keep original indices for consistency)
        this.shuffleArray(this.players);
        
        console.log('🎭 Role distribution:', {
            playerCount,
            badPlayerCount,
            badPlayersKnowEachOther,
            roles: this.players.map(p => `${p.name} (${p.colorName}): ${p.role}`)
        });
        console.log('🔀 Player order randomized for role assignment');
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
        // **FADE OUT INTRO MUSIC when Secret Role Assignment screen appears**
        if (window.soundManager && window.soundManager.introMusic) {
            window.logger?.audio('Secret Role Assignment starting - fading out intro music');
            window.soundManager.stopIntroMusic(); // This includes fade out
        }
        
        // Create overlay for initial instructions
        const overlay = document.createElement('div');
        overlay.id = 'role-assignment-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(50, 0, 100, 0.95));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 9999;
            animation: fadeIn 0.6s ease-out;
            padding: calc(env(safe-area-inset-top, 0px) + 30px) 15px 120px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(40, 0, 80, 0.9), rgba(80, 0, 120, 0.9));
            border: 3px solid rgba(255, 0, 255, 0.6);
            border-radius: 25px;
            padding: 20px;
            max-width: 800px;
            width: 100%;
            text-align: center;
            box-shadow: 0 0 60px rgba(255, 0, 255, 0.4);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            margin: 0 auto;
            margin-top: 0 !important;
            flex-shrink: 0;
        `;
        
        content.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 3rem; color: #ff00ff; margin-bottom: 20px; text-shadow: 0 0 30px rgba(255, 0, 255, 0.8);">
                    🎭 SECRET ROLE ASSIGNMENT
                </h1>
                <div style="font-size: 1.4rem; color: #ffffff; line-height: 1.8; margin-bottom: 30px;">
                    <p style="margin: 15px 0;">Perfect! All colors have been assigned.</p>
                    <p style="margin: 15px 0; color: #ffaa00; font-weight: bold;">Now, please listen carefully...</p>
                </div>
            </div>
            
            <div style="background: rgba(255, 0, 0, 0.1); border: 2px solid rgba(255, 0, 0, 0.4); border-radius: 15px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #ff4444; font-size: 1.6rem; margin-bottom: 20px;">⚠️ IMPORTANT INSTRUCTIONS</h3>
                <div style="font-size: 1.2rem; color: #ffffff; text-align: left; line-height: 1.6;">
                    <p>🧍 <strong>ALL PLAYERS must now face AWAY from the screen</strong></p>
                    <p>🎯 <strong>I will call up the first player</strong></p>
                    <p>👆 <strong>When YOUR Name is called, approach and press 'Ready'</strong></p>
                    <p>🤐 <strong>You will receive your SECRET identity</strong></p>
                    <p>🔄 <strong>After viewing your secret identity, please Press Continue and then click Finish.</strong></p>
                    <p>🤐 <strong>Keep your identity Hidden!</strong></p>
                </div>
            </div>
        `;
        
        const skipBtn = document.createElement('button');
        skipBtn.id = 'skip-instructions-btn';
        skipBtn.innerHTML = '⏭️ Skip Instructions';
        skipBtn.title = 'Skip voice instructions and proceed directly';
        
        overlay.appendChild(content);
        overlay.appendChild(skipBtn);
        document.body.appendChild(overlay);

        // Auto-progress after voice instructions OR allow skip
        const startRoleAssignment = async () => {
            // Remove overlay and start calling players
            overlay.remove();
            await this.callNextPlayer();
        };

        // Track if user has clicked skip to prevent auto-progression
        let userSkipped = false;

        // Bind skip button first (before voice starts)
        if (skipBtn) {
            skipBtn.addEventListener('click', async () => {
                if (this.soundManager) this.soundManager.playClick();
                userSkipped = true; // Mark that user manually skipped
                // Stop any ongoing voice and proceed immediately
                if (this.voiceManager) {
                    this.voiceManager.stop();
                }
                await startRoleAssignment();
            });
        }

        // Play comprehensive voice instructions for secret role assignment
        if (this.voiceManager) {
            try {
                // Start voice instructions and wait for completion
                await this.voiceManager.speak("ALL PLAYERS must now face AWAY from the screen");
                if (userSkipped) return; // Exit if user clicked skip

                await this.voiceManager.speak("I will call up the first player");
                if (userSkipped) return;

                await this.voiceManager.speak("When YOUR Name is called, approach and press 'Ready'");
                if (userSkipped) return;

                await this.voiceManager.speak("You will receive your SECRET identity");
                if (userSkipped) return;

                await this.voiceManager.speak("After viewing your secret identity, please Press Continue and then click Finish.");
                if (userSkipped) return;

                await this.voiceManager.speak("Keep your identity Hidden!");
                if (userSkipped) return;

                // Longer pause to let users absorb all instructions before auto-progressing
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Only auto-proceed if user hasn't clicked skip
                if (!userSkipped) {
                    await startRoleAssignment();
                }
            } catch (error) {
                // If there's an error or user skipped, proceed
                if (!userSkipped) {
                    await startRoleAssignment();
                }
            }
        } else {
            // No voice manager - proceed immediately
            await startRoleAssignment();
        }
    }
    
    async callNextPlayer() {
        if (this.currentPlayerIndex >= this.players.length) {
            await this.completeRoleAssignment();
            return;
        }
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Create player call screen
        const callScreen = document.createElement('div');
        callScreen.id = 'player-call-screen';
        callScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(40, 40, 80, 0.95));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
            padding: calc(env(safe-area-inset-top, 0px) + 30px) 15px 120px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, ${currentPlayer.color}20, ${currentPlayer.color}40);
            border: 4px solid ${currentPlayer.color};
            border-radius: 30px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 0 80px ${currentPlayer.color}80;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            max-width: 600px;
            width: 100%;
            margin: 0 auto;
            margin-top: 0 !important;
            flex-shrink: 0;
        `;
        
        content.innerHTML = `
            <h1 style="font-family: 'Cinzel', serif; font-size: 4rem; color: ${currentPlayer.color}; margin-bottom: 30px; text-shadow: 0 0 40px ${currentPlayer.color};">
                ${currentPlayer.name.toUpperCase()}
            </h1>
            
            <p style="font-size: 2rem; color: #ffffff; margin-bottom: 40px; text-shadow: 0 0 20px rgba(255,255,255,0.5);">
                Please approach the screen
            </p>
        `;
        
        const readyBtn = document.createElement('button');
        readyBtn.id = 'ready-btn';
        readyBtn.innerHTML = '🎯 READY';
        
        callScreen.appendChild(content);
        callScreen.appendChild(readyBtn);
        document.body.appendChild(callScreen);

        // Speak the player's name for subsequent players (not the first one who was already called)
        if (this.voiceManager && this.currentPlayerIndex > 0) {
            await this.voiceManager.speak(`${currentPlayer.name}, step up!`);
        } else if (this.voiceManager && this.currentPlayerIndex === 0) {
            // For the first player, give clear instruction about the ready button
            await this.voiceManager.speak(`${currentPlayer.name}, please approach the screen and press Ready to receive your secret identity.`);
        }
        
        // Bind ready button
        readyBtn.addEventListener('click', async () => {
            callScreen.remove();
            await this.showPlayerSecret(currentPlayer);
        });
    }
    
    async showPlayerSecret(player) {
        // Create secret reveal screen
        const secretScreen = document.createElement('div');
        secretScreen.id = 'player-secret-screen';
        secretScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 0, 40, 0.98));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 10001;
            animation: fadeIn 0.8s ease-out;
            padding: calc(env(safe-area-inset-top, 0px) + 30px) 15px 120px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(60, 60, 100, 0.9), rgba(40, 40, 80, 0.9));
            border: 3px solid #ffffff;
            border-radius: 25px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 0 100px rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            max-width: 700px;
            width: 100%;
            margin: 0 auto;
            margin-top: 0 !important;
            flex-shrink: 0;
        `;
        
        const roleColor = player.role === 'Bad' ? '#ff0000' : '#00ff00';
        const roleIcon = player.role === 'Bad' ? '😈' : '😇';
        
        // Check if this Bad player has a partner (6 and 7 player games)
        let partnerInfo = '';
        if (player.role === 'Bad' && player.partnerId !== null) {
            const partner = this.players.find(p => p.index === player.partnerId);
            if (partner) {
                partnerInfo = `
                    <div style="background: rgba(255, 0, 0, 0.2); border: 3px solid #ff0000; border-radius: 20px; padding: 25px; margin: 30px 0;">
                        <h3 style="color: #ff0000; font-size: 2rem; margin-bottom: 15px;">
                            🤝 YOUR PARTNER
                        </h3>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0;">
                            <div style="
                                width: 60px;
                                height: 60px;
                                background: ${partner.color};
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 2rem;
                                font-weight: bold;
                                color: ${this.getContrastColor(partner.color)};
                            ">${partner.index + 1}</div>
                            <div style="text-align: left;">
                                <div style="font-size: 1.8rem; font-weight: bold; color: #ffffff;">
                                    ${partner.name}
                                </div>
                                <div style="font-size: 1.2rem; color: ${partner.color}; font-weight: bold;">
                                    ${partner.colorName}
                                </div>
                            </div>
                        </div>
                        <p style="color: #ffcccc; font-size: 1.1rem; line-height: 1.5;">
                            <strong>${partner.name}</strong> is also BAD!<br/>
                            Coordinate your deception strategy!
                        </p>
                    </div>
                `;
            }
        }
        
        content.innerHTML = `
            <div style="margin-bottom: 40px;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 4rem; color: ${roleColor}; margin-bottom: 20px; text-shadow: 0 0 50px ${roleColor}80;">
                    ${roleIcon} ${player.role.toUpperCase()}
                </h1>
                <p style="font-size: 1.4rem; color: #cccccc; margin-bottom: 30px;">
                    Remember your role - keep it secret!
                </p>
            </div>
            
            <div style="background: rgba(${player.role === 'Bad' ? '255, 0, 0' : '0, 255, 0'}, 0.15); border: 2px solid ${roleColor}; border-radius: 20px; padding: 30px; margin: 30px 0;">
                <h2 style="font-size: 3rem; color: ${roleColor}; margin-bottom: 15px;">
                    ${roleIcon} ${player.role.toUpperCase()}
                </h2>
                <p style="font-size: 1.3rem; color: #ffffff; line-height: 1.6;">
                    ${player.role === 'Bad' 
                        ? 'You are the VILLAIN! Your goal is to deceive the team and prevent them from discovering your identity. If they vote you out at the end, you lose. If they vote out an innocent player, you win!'
                        : 'You are GOOD! Work with your team to solve challenges and identify the hidden villain among you. At the end, vote wisely to exclude the villain and claim victory!'
                    }
                </p>
            </div>
            
            ${partnerInfo}
        `;
        
        const continueBtn = document.createElement('button');
        continueBtn.id = 'continue-btn';
        continueBtn.innerHTML = '🔄 Continue';
        
        secretScreen.appendChild(content);
        secretScreen.appendChild(continueBtn);
        document.body.appendChild(secretScreen);
        
        // Mark player as received
        player.hasReceived = true;
        
        // Bind continue button
        continueBtn.addEventListener('click', async () => {
            secretScreen.remove();
            await this.showNextPlayerPrompt();
        });
    }
    
    // Helper method to get contrasting text color
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
    
    async showNextPlayerPrompt() {
        this.currentPlayerIndex++;
        
        if (this.currentPlayerIndex >= this.players.length) {
            await this.completeRoleAssignment();
            return;
        }
        
        // Create next player prompt
        const promptScreen = document.createElement('div');
        promptScreen.id = 'next-player-prompt';
        promptScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(40, 40, 80, 0.95));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
            padding: calc(env(safe-area-inset-top, 0px) + 30px) 15px 120px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, rgba(80, 80, 120, 0.9), rgba(60, 60, 100, 0.9));
            border: 3px solid #888888;
            border-radius: 25px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 0 60px rgba(136, 136, 136, 0.4);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            max-width: 600px;
            width: 100%;
            margin: 0 auto;
            margin-top: 0 !important;
            flex-shrink: 0;
        `;
        
        content.innerHTML = `
            <h2 style="font-family: 'Cinzel', serif; font-size: 2.5rem; color: #ffffff; margin-bottom: 30px;">
                🔄 Next Player
            </h2>
            
            <p style="font-size: 1.4rem; color: #cccccc; margin-bottom: 40px; line-height: 1.6;">
                Call over the next player.<br/>
                Once they are ready, press 'Finish' to continue.
            </p>
        `;
        
        const finishBtn = document.createElement('button');
        finishBtn.id = 'finish-btn';
        finishBtn.innerHTML = '✅ Finish';
        
        promptScreen.appendChild(content);
        promptScreen.appendChild(finishBtn);
        document.body.appendChild(promptScreen);
        
        // Bind finish button
        finishBtn.addEventListener('click', async () => {
            promptScreen.remove();
            await this.callNextPlayer();
        });
    }
    
    async completeRoleAssignment() {
        console.log('🎭 Role assignment complete!');
        this.isAssigningRoles = false;
        
        // Store player data in game manager
        this.gameManager.gameState.secretRoles = this.players;
        
        // Go directly to First Impressions Challenge for faster pacing
        await this.startFirstImpressionsChallenge();
    }
    
    /**
     * Start the First Impressions Challenge
     */
    async startFirstImpressionsChallenge() {
        console.log('🕵️ Starting First Impressions Challenge from role manager');
        
        // Check if voting suspicion scene should be skipped
        const skipVoting = window.gameSettings?.skipVotingScene || false;
        
        if (skipVoting) {
            console.log('⏭️ Skipping First Impressions Challenge (Voting Suspicion Scene) as per user preference');
            
            // Play skip sound if available
            if (window.soundManager) {
                window.soundManager.playClick();
            }
            
            // Go directly to Rock Paper Scissors Challenge
            await this.startRockPaperScissorsChallenge();
            return;
        }
        
        try {
            // Use the game manager's method to start the challenge
            if (this.gameManager && typeof this.gameManager.startFirstImpressionsChallenge === 'function') {
                await this.gameManager.startFirstImpressionsChallenge();
                console.log('✅ First Impressions Challenge started successfully');
            } else {
                console.error('❌ GameManager startFirstImpressionsChallenge method not found!');
                this.showError('Failed to start First Impressions Challenge');
            }
        } catch (error) {
            console.error('❌ Error starting First Impressions Challenge:', error);
            this.showError('Failed to start First Impressions Challenge: ' + error.message);
        }
    }
    
    /**
     * Start Rock Paper Scissors Challenge directly (when skipping voting)
     */
    async startRockPaperScissorsChallenge() {
        console.log('🪨📄✂️ Starting Rock Paper Scissors Challenge from role manager');
        
        try {
            // Use the game manager's method to start the challenge
            if (this.gameManager && typeof this.gameManager.startFirstChallenge === 'function') {
                await this.gameManager.startFirstChallenge();
                console.log('✅ Rock Paper Scissors Challenge started successfully');
            } else {
                console.error('❌ GameManager startFirstChallenge method not found!');
                this.showError('Failed to start Rock Paper Scissors Challenge');
            }
        } catch (error) {
            console.error('❌ Error starting Rock Paper Scissors Challenge:', error);
            this.showError('Failed to start Rock Paper Scissors Challenge: ' + error.message);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (this.gameManager && typeof this.gameManager.showError === 'function') {
            this.gameManager.showError(message);
        } else {
            console.error('Error:', message);
        }
    }
    
    getPlayerByColor(color) {
        return this.players.find(p => p.color === color);
    }
    
    getVillain() {
        // For backwards compatibility, return the first Bad player found
        return this.players.find(p => p.role === 'Bad') || null;
    }
    
    // New method to get all Bad players
    getBadPlayers() {
        return this.players.filter(p => p.role === 'Bad');
    }
    
    // New method to get Bad players that know each other (6 and 7 player games)
    getBadPlayerPartners() {
        return this.players.filter(p => p.role === 'Bad' && p.partnerId !== null);
    }
    
    // Helper method to check if Bad players know each other in current game
    doBadPlayersKnowEachOther() {
        return this.badPlayersKnowEachOther || false;
    }
    
    getGoodPlayers() {
        return this.players.filter(p => p.role === 'Good');
    }
    
    // Method to start final voting phase
    async startFinalVoting() {
        console.log('🗳️ Starting final voting phase...');
        
        if (this.voiceManager) {
            await this.voiceManager.speak("Time to vote! Choose wisely!");
        }
        
        // This will be implemented as part of the final challenge
        // For now, just log the available players
        console.log('Players available for voting:', this.players.map(p => `${p.name} (${p.role})`));
    }
}

// Make RoleManager available globally
window.RoleManager = RoleManager;
