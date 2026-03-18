        // I. IMPORTS
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import anime from 'animejs';
        import { createSoundRegistry, CUSTOM_SOUND_TYPES } from '../audio/sound-registry.js';
        import { CONFIG } from '../config/constants.js';
        import { debugLog } from '../core/debug.js';
import { PROBLEM_TYPES, levelProblemConfig } from '../math/problem-config.js';
import { setupResponsiveLayout } from '../ui/responsive-layout.js';
import { bindUpgradesPanelButton } from '../ui/upgrades-panel-button.js';
        import {
            createDefaultActionCooldowns,
            createDefaultCustomPetRarityRates,
            createDefaultKeyInventory,
            createDefaultLevelProgressData,
            createDefaultPlayerUpgrades,
            createDefaultScoreData,
        } from '../state/defaults.js';

        // Auto-clear data on page refresh/reload
        window.addEventListener('beforeunload', function() {
            debugLog('🔄 Page refresh detected - clearing all game data for fresh start...');
            
            try {
                // Clear all localStorage data
                localStorage.removeItem('lavaCageGameTimer');
                localStorage.removeItem('lavaCageGameDifficulty');
                localStorage.removeItem('lavaCageLockPickDuration');
                localStorage.removeItem('lavaCageUpgrades');
                localStorage.removeItem('petRescue3_petRarityRates');
                
                // Clear custom sounds
                CUSTOM_SOUND_TYPES.forEach(type => {
                    localStorage.removeItem(`customSound_${type}`);
                });
                
                debugLog('🔄 All game data cleared on page refresh');
            } catch (error) {
                console.error('🔄 Error clearing data on refresh:', error);
            }
        });

        // III. STATE VARIABLES
        // A. Game State
        let gameTime = CONFIG.TIMER_DEFAULT;
        let timerInterval;
        let lastFrameTime = 0;
        let petStats;
        let isGrumpy = false;
        let timeGrumpy = 0;
        let chainStress = 0;
        let lockPickDurationSetting = CONFIG.LOCK_PICK_DURATION_DEFAULT;
        let lockPickingProgress = 0;
        let lockPickRate; // Calculated based on durationSetting
        let currentDifficultySetting = 'easy';
        let playerEnergy = 25;
        let actionCooldowns = createDefaultActionCooldowns();
        let playerUpgrades = createDefaultPlayerUpgrades();
        let openUpgradesModalHandler = null;
        
        // Ensure totalCooldownReduction is always defined
        function ensureTotalCooldownReduction() {
            if (typeof playerUpgrades.totalCooldownReduction === 'undefined') {
                playerUpgrades.totalCooldownReduction = 0;
                debugLog('🛒 Initialized totalCooldownReduction to 0');
            }
            
            // If mathCooldown level is higher than 0 but totalCooldownReduction is 0,
            // this means the player upgraded before the fix was implemented
            // We need to estimate their total cooldown reduction
            if (playerUpgrades.mathCooldown > 0 && playerUpgrades.totalCooldownReduction === 0) {
                // Estimate based on average reduction (2 seconds per upgrade)
                playerUpgrades.totalCooldownReduction = playerUpgrades.mathCooldown * 2;
                debugLog(`🛒 Estimated totalCooldownReduction: ${playerUpgrades.totalCooldownReduction}s based on ${playerUpgrades.mathCooldown} levels`);
                
                // Save the corrected value
                localStorage.setItem('lavaCageUpgrades', JSON.stringify(playerUpgrades));
            }
        }
        let gameState = 'INIT'; // INIT, INTRO, PLAYING, TRANSITIONING, LOSE
        let gameStarted = false;
        let lightningTimeoutId;
        let cloudSpawnTimeoutId;
        let swingPhaseOffset = Math.PI / 2;
        let swingBaseTime = 0;
        let joltOffsets = { x: 0, y: 0, z: 0, rotZ: 0 };
        let isJolting = false;
        let autoModeEnabled = false; // Auto mode for automatically activating buttons
        let heartbeatActive = false;
        let currentPetRescued = false; // Flag for current pet rescue completion

        // B. Rarity and Score State
        let currentPetRarityKey = 'common'; // Will be set in resetGameState
        let scoreData = createDefaultScoreData();

        // C. Level Progression System
        let levelProgressData = createDefaultLevelProgressData();

        // C. Three.js Scene Objects
        let scene, camera, renderer, controls, ambientLight, skyLight, stars;
        let pet, cage, chainLinks = [], mountedChainLink = null, lavaPlane;
        let stressFairyObject = null; 
        let silhouetteQueueGroup; // For the chain queue visual effect
        let silhouetteCages = []; // To hold references to silhouette cage meshes
        
        // Add treasure cloud system variables
        let treasureClouds = []; // Array to hold active treasure clouds
        
        // Initialize treasure cloud system if available
        if (typeof initializeTreasureCloudSystem === 'function') {
            setTimeout(() => {
                initializeTreasureCloudSystem();
                debugLog('Treasure cloud system reinitialized after reset');
            }, 1000);
        }
        let isFirstCloud = true; // Track if this is the first cloud (always gives wooden pick)
        
        // Key inventory system
        let keyInventory = createDefaultKeyInventory();
        
        // Custom pet rarity rates
        let customPetRarityRates = createDefaultCustomPetRarityRates();

        // D. UI Elements
        const gameContainer = document.getElementById('game-container');
        const topCenterStats = document.getElementById('top-center-stats');
        const timerDisplay = document.getElementById('timer-display');
        const stressBar = document.getElementById('stress-bar');
        const statBars = {
            hunger: document.getElementById('hunger-bar'),
            hydration: document.getElementById('hydration-bar'),
            joy: document.getElementById('joy-bar'),
            rest: document.getElementById('rest-bar'),
        };
        const actionButtons = {
            feed: document.getElementById('feed-button'),
            water: document.getElementById('water-button'),
            play: document.getElementById('play-button'),
            sing: document.getElementById('sing-button'),
            extendTime: document.getElementById('extend-time-button'),
            stressFairy: document.getElementById('stress-fairy-button')
        };
        const lockPickingPanel = document.getElementById('lock-picking-panel');
        const lockProgressBar = document.getElementById('lock-progress-bar');
        
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const gameOverMessage = document.getElementById('game-over-message');
        
        const settingsButton = document.getElementById('settings-button');
        const settingsPanel = document.getElementById('settings-panel');
        const timerSettingInput = document.getElementById('timer-setting');
        const timerSettingMinutes = document.getElementById('timer-setting-mm');
        const timerSettingSeconds = document.getElementById('timer-setting-ss');
        const lockPickDurationSettingInput = document.getElementById('lockpick-duration-setting');
        const difficultySettingSelect = document.getElementById('difficulty-setting');
        
        // Pet rarity sliders
        const commonRateSlider = document.getElementById('common-rate');
        const rareRateSlider = document.getElementById('rare-rate');
        const legendaryRateSlider = document.getElementById('legendary-rate');
        const commonRateValueDisplay = document.getElementById('common-rate-value');
        const rareRateValueDisplay = document.getElementById('rare-rate-value');
        const legendaryRateValueDisplay = document.getElementById('legendary-rate-value');
        const rarityRateWarning = document.getElementById('rarity-rate-warning');
        
        const energyDisplayMain = document.getElementById('energy-display-main');
        const petStatusEnergyValue = document.getElementById('pet-status-energy-value');
        const currentPetRarityText = document.getElementById('pet-rarity-text');
        
        const startOverlay = document.getElementById('start-overlay');
        const startButton = document.getElementById('start-button');
        const petStatusSection = document.getElementById('pet-status-section');
        const petStatusFlowSlot = document.getElementById('pet-status-flow-slot');
        const petStatusStageSlot = document.getElementById('pet-status-stage-slot');
        const utilityButtons = document.getElementById('utility-buttons');
        const utilityButtonsFlowSlot = document.getElementById('utility-buttons-flow-slot');

        // Lock pick tools (declare early to avoid reference errors)
        let lockPickTools = null;

        // Score Panel UI Elements
        const commonScoreDisplay = document.getElementById('common-score');
        const rareScoreDisplay = document.getElementById('rare-score');
        const legendaryScoreDisplay = document.getElementById('legendary-score');
        const overallScoreDisplay = document.getElementById('overall-score-value');


        // Sound upload UI
        const soundUploadInputs = { 
            bgm: document.getElementById('bgm-upload'), animal: document.getElementById('animal-upload'), thunder: document.getElementById('thunder-upload'), 
            feed: document.getElementById('feed-upload'), water: document.getElementById('water-upload'), play: document.getElementById('play-upload'), 
            sing: document.getElementById('sing-upload'), chainSnap: document.getElementById('chain-snap-upload'), cageHit: document.getElementById('cage-hit-upload'), 
            victory: document.getElementById('victory-upload'), lockOpen: document.getElementById('lock-open-upload'),
            lockPickClick: document.getElementById('lock-pick-click-upload'), 
            lockPickSuccess: document.getElementById('lock-pick-success-upload'), 
            jolt: document.getElementById('jolt-upload'),
            errorSound: document.getElementById('error-upload'), correctAnswer: document.getElementById('correct-answer-upload'), fairy: document.getElementById('fairy-upload'), 
            heartbeat: document.getElementById('heartbeat-upload'), newRandomQuestion: document.getElementById('new-random-question-upload'),
            newPetReveal: document.getElementById('new-pet-reveal-upload'), buyUpgrade: document.getElementById('buy-upgrade-upload'), mathWizard: document.getElementById('math-wizard-upload'), legendaryPet: document.getElementById('legendary-pet-upload')
        };

        // E. Sound Objects
        let stagedCustomSounds = {}; 
        
        // F. Math Challenge State (as before)
        let currentChallengeLevel = 0; 
        let activeChallengeProblems = []; 
        let mathProblemTimers = [null, null, null, null];
        const mathChallengeGrid = document.getElementById('math-challenge-grid');
        const mathBoxElements = [];
        const mathHeaderElements = [];
        const mathProblemElements = [];
        const mathMCGridElements = [];
        for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) {
            mathBoxElements.push(document.getElementById(`math-box-${i}`));
            mathHeaderElements.push(document.getElementById(`math-header-${i}`));
            mathProblemElements.push(document.getElementById(`problem-box-${i}`));
            mathMCGridElements.push(document.getElementById(`mc-grid-${i}`));
        }
        const epChallengeButtonsContainer = document.getElementById('ep-difficulty-buttons');
        const epChallengePanel = document.getElementById('ep-challenge-panel');
        const epDifficultyCallout = document.getElementById('ep-difficulty-callout');
        let responsiveLayoutController = null;
        let compactMathDeckFitFrame = 0;
        let heroFramingRefreshFrame = 0;
        let responsiveLayoutState = {
            layout: 'desktop',
            orientation: 'landscape',
            pointer: 'fine',
            mathDeck: 'desktop',
            isDesktopLike: true,
            isCompact: false,
        };


        // IV. UTILITY FUNCTIONS
        function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
        function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
        function readFileAsDataURL(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
        function isDesktopInteractionLayout() { return Boolean(responsiveLayoutState?.isDesktopLike); }
        function clampValue(value, min, max) { return Math.min(Math.max(value, min), max); }

        const CHAIN_SWING_AXIS = new THREE.Vector3(0, 0, 1);
        const chainLastLinkWorld = new THREE.Vector3();
        const chainAttachLocalScratch = new THREE.Vector3();
        const chainAttachRotatedOffset = new THREE.Vector3();

        function getMountedLinkCenterOffsetY() {
            return -CONFIG.LINK_MAJOR_RADIUS
                - (CONFIG.LINK_TUBE_RADIUS * 0.5)
                - (CONFIG.LINK_MAJOR_RADIUS * 0.7);
        }

        function getCageHookOffsetForScale(scale) {
            return (1 * scale)
                + ((0.1 * scale) / 2)
                + (CONFIG.LINK_TUBE_RADIUS * scale)
                + ((CONFIG.LINK_TUBE_RADIUS * 0.7) * scale)
                + (CONFIG.LINK_TUBE_RADIUS * scale);
        }

        function getLegendaryChainAttachOffset() {
            return getCageHookOffsetForScale(CONFIG.PET_RARITIES.legendary.cageScale) + getMountedLinkCenterOffsetY();
        }

        function updateCageChainAttachPoint(mountedLink) {
            if (!cage || !mountedLink) {
                return null;
            }

            if (!cage.chainAttachPoint) {
                cage.chainAttachPoint = new THREE.Object3D();
                cage.chainAttachPoint.name = 'cage-chain-attach-point';
                cage.add(cage.chainAttachPoint);
            }

            cage.updateMatrixWorld(true);
            mountedLink.getWorldPosition(chainAttachLocalScratch);
            cage.worldToLocal(chainAttachLocalScratch);
            cage.chainAttachPoint.position.copy(chainAttachLocalScratch);
            cage.chainAttachPoint.updateMatrixWorld(true);
            return cage.chainAttachPoint;
        }

        function getCageHeroFraming() {
            if (!camera || !cage) {
                return null;
            }

            const rarityData = CONFIG.PET_RARITIES[currentPetRarityKey] || CONFIG.PET_RARITIES.common;
            const cageScale = rarityData.cageScale || 1;
            const isCompactLandscape = responsiveLayoutState?.mathDeck === 'compact-landscape';
            const subjectBounds = new THREE.Box3();
            subjectBounds.expandByObject(cage);
            if (pet && pet.parent !== cage) {
                subjectBounds.expandByObject(pet);
            }

            if (subjectBounds.isEmpty()) {
                return null;
            }

            if (isCompactLandscape) {
                subjectBounds.min.x -= 0.06 * cageScale;
                subjectBounds.max.x += 0.06 * cageScale;
                subjectBounds.min.y -= 0.04 * cageScale;
                subjectBounds.max.y += 0.10 * cageScale;
            } else {
                subjectBounds.min.x -= 0.1 * cageScale;
                subjectBounds.max.x += 0.1 * cageScale;
                subjectBounds.min.y -= 0.06 * cageScale;
                subjectBounds.max.y += 0.16 * cageScale;
            }

            const size = subjectBounds.getSize(new THREE.Vector3());
            const target = subjectBounds.getCenter(new THREE.Vector3());
            const verticalFov = THREE.MathUtils.degToRad(camera.fov);
            const aspect = Math.max(camera.aspect || 1, 0.1);
            const isWideViewport = aspect > 1.75 && !isCompactLandscape;
            target.y = subjectBounds.min.y + size.y * (isCompactLandscape ? 0.54 : (isWideViewport ? 0.28 : 0.6));
            const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);

            const distanceForHeight = size.y / (2 * Math.tan(verticalFov / 2) * (isCompactLandscape ? 0.88 : 0.76));
            const distanceForWidth = size.x / (2 * Math.tan(horizontalFov / 2) * (isCompactLandscape ? 0.82 : 0.66));
            const depthPadding = size.z * 0.5;
            const zoomBackMultiplier = isCompactLandscape ? 0.72 : (isWideViewport ? 1.08 : 1.06);
            const minimumDistance = isCompactLandscape
                ? 3.05
                : isWideViewport
                    ? clampValue(4.85 + Math.max(aspect - 1.75, 0) * 0.62, 4.85, 5.8)
                    : clampValue(2.85 + Math.max(aspect - 1.25, 0) * 1.12, 2.85, 4.05);
            const maximumDistance = isCompactLandscape ? 3.55 : (isWideViewport ? 5.8 : 4.85);
            const distance = clampValue((Math.max(distanceForHeight, distanceForWidth) + depthPadding) * zoomBackMultiplier, minimumDistance, maximumDistance);

            const frontPosition = new THREE.Vector3(
                target.x,
                target.y + size.y * (isCompactLandscape ? 0.03 : (isWideViewport ? 0.01 : 0.06)),
                target.z + distance
            );

            const introRadius = distance * (isCompactLandscape ? 0.88 : 0.92);
            const introAzimuth = THREE.MathUtils.degToRad(80);
            const introPosition = new THREE.Vector3(
                target.x + Math.sin(introAzimuth) * introRadius,
                target.y + size.y * (isCompactLandscape ? 0.06 : (isWideViewport ? 0.04 : 0.1)),
                target.z + Math.cos(introAzimuth) * introRadius
            );

            return {
                target,
                position: frontPosition,
                introPosition,
                size,
                distance,
            };
        }

        function setCameraToHeroFraming(framing) {
            if (!camera || !framing) {
                return;
            }

            camera.position.copy(framing.position);
            if (controls) {
                controls.target.copy(framing.target);
                controls.update();
            } else {
                camera.lookAt(framing.target);
            }
        }

        function animateCameraToHeroFraming(framing, duration = 700) {
            if (!camera || !framing) {
                return;
            }

            const cameraState = {
                camX: camera.position.x,
                camY: camera.position.y,
                camZ: camera.position.z,
                targetX: controls ? controls.target.x : framing.target.x,
                targetY: controls ? controls.target.y : framing.target.y,
                targetZ: controls ? controls.target.z : framing.target.z,
            };

            anime.remove(camera.position);
            anime({
                targets: cameraState,
                camX: framing.position.x,
                camY: framing.position.y,
                camZ: framing.position.z,
                targetX: framing.target.x,
                targetY: framing.target.y,
                targetZ: framing.target.z,
                duration,
                easing: 'easeInOutQuad',
                update: () => {
                    camera.position.set(cameraState.camX, cameraState.camY, cameraState.camZ);
                    if (controls) {
                        controls.target.set(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
                        controls.update();
                    } else {
                        camera.lookAt(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
                    }
                },
                complete: () => {
                    if (controls) {
                        controls.target.copy(framing.target);
                        controls.update();
                    } else {
                        camera.lookAt(framing.target);
                    }
                }
            });
        }

        function queueHeroFramingRefresh({ animate = false, duration = 450 } = {}) {
            if (heroFramingRefreshFrame) {
                cancelAnimationFrame(heroFramingRefreshFrame);
            }

            heroFramingRefreshFrame = requestAnimationFrame(() => {
                heroFramingRefreshFrame = requestAnimationFrame(() => {
                    heroFramingRefreshFrame = 0;
                    resizeGameViewport();

                    if (!cage || !camera || !['INTRO', 'PLAYING', 'TRANSITIONING'].includes(gameState)) {
                        return;
                    }

                    const framing = getCageHeroFraming();
                    if (!framing) {
                        return;
                    }

                    if (animate && gameState === 'PLAYING') {
                        animateCameraToHeroFraming(framing, duration);
                        return;
                    }

                    setCameraToHeroFraming(framing);
                });
            });
        }

        function resizeGameViewport() {
            if (camera && renderer && gameContainer) {
                const nextWidth = Math.max(gameContainer.clientWidth, 1);
                const nextHeight = Math.max(gameContainer.clientHeight, 1);
                camera.aspect = nextWidth / nextHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(nextWidth, nextHeight);
            }
        }

        const MATH_VISUAL_PROPERTY_NAMES = [
            '--math-deck-gap',
            '--math-card-pad-block',
            '--math-card-pad-inline',
            '--math-card-inner-gap',
            '--math-header-font-size',
            '--math-problem-font-size',
            '--math-choice-font-size',
            '--math-choice-gap',
            '--math-choice-min-h',
            '--math-choice-pad-block',
            '--math-choice-pad-inline',
        ];

        function clearMathDeckVisualBalance(root = document.body) {
            if (!root) {
                return;
            }

            MATH_VISUAL_PROPERTY_NAMES.forEach((propertyName) => {
                root.style.removeProperty(propertyName);
            });
        }

        function setMathDeckVisualBalance(root, metrics) {
            if (!root || !metrics) {
                return;
            }

            root.style.setProperty('--math-deck-gap', `${metrics.deckGap.toFixed(2)}px`);
            root.style.setProperty('--math-card-pad-block', `${metrics.blockPad.toFixed(2)}px`);
            root.style.setProperty('--math-card-pad-inline', `${metrics.inlinePad.toFixed(2)}px`);
            root.style.setProperty('--math-card-inner-gap', `${metrics.innerGap.toFixed(2)}px`);
            root.style.setProperty('--math-header-font-size', `${metrics.headerSize.toFixed(2)}px`);
            root.style.setProperty('--math-problem-font-size', `${metrics.problemSize.toFixed(2)}px`);
            root.style.setProperty('--math-choice-font-size', `${metrics.choiceFontSize.toFixed(2)}px`);
            root.style.setProperty('--math-choice-gap', `${metrics.choiceGap.toFixed(2)}px`);
            root.style.setProperty('--math-choice-min-h', `${metrics.choiceMinHeight.toFixed(2)}px`);
            root.style.setProperty('--math-choice-pad-block', `${metrics.choicePadBlock.toFixed(2)}px`);
            root.style.setProperty('--math-choice-pad-inline', `${metrics.choicePadInline.toFixed(2)}px`);
        }

        function getVisibleMathCells() {
            return mathBoxElements
                .map((box) => box?.querySelector('.math-cell'))
                .filter((cell) => cell && cell.offsetParent !== null);
        }

        function measureMathDeckOverflow(visibleCells) {
            const gridOverflow = Math.max(
                mathChallengeGrid ? mathChallengeGrid.scrollHeight - mathChallengeGrid.clientHeight : 0,
                mathChallengeGrid ? mathChallengeGrid.scrollWidth - mathChallengeGrid.clientWidth : 0,
                0
            );

            return visibleCells.reduce((maxOverflow, cell) => {
                const cellRect = cell.getBoundingClientRect();
                let cellOverflow = Math.max(
                    cell.scrollHeight - cell.clientHeight,
                    cell.scrollWidth - cell.clientWidth,
                    0
                );

                Array.from(cell.querySelectorAll('.math-header, .math-problem, .math-mc-grid, .mc-choice-btn')).forEach((element) => {
                    const rect = element.getBoundingClientRect();
                    cellOverflow = Math.max(
                        cellOverflow,
                        rect.bottom - cellRect.bottom,
                        rect.right - cellRect.right,
                        cellRect.left - rect.left,
                        cellRect.top - rect.top,
                        0
                    );
                });

                return Math.max(maxOverflow, Math.ceil(cellOverflow));
            }, Math.ceil(gridOverflow));
        }

        function applyMathDeckVisualBalance(layoutState = responsiveLayoutState) {
            if (!document.body || !mathChallengeGrid) {
                return;
            }

            const root = document.body;
            const deckStyles = window.getComputedStyle(mathChallengeGrid);

            if (deckStyles.display === 'contents') {
                clearMathDeckVisualBalance(root);
                return;
            }

            const deckWidth = Math.max(mathChallengeGrid.clientWidth, 1);
            const deckHeight = Math.max(mathChallengeGrid.clientHeight, 1);
            const mathDeckMode = layoutState?.mathDeck || 'desktop';
            const isCompactPortrait = mathDeckMode === 'compact-portrait';
            const isCompactLandscape = mathDeckMode === 'compact-landscape';
            const isCompactMathDeck = isCompactPortrait || isCompactLandscape;

            let columns = isCompactPortrait ? 2 : 4;
            let rows = isCompactPortrait ? 2 : 1;

            if (!isCompactMathDeck) {
                const visibleBoxes = mathBoxElements.filter((box) => box && box.offsetParent !== null);

                if (visibleBoxes.length > 1) {
                    const firstRowTop = Math.round(visibleBoxes[0].getBoundingClientRect().top);
                    columns = Math.max(
                        1,
                        visibleBoxes.filter((box) => Math.abs(Math.round(box.getBoundingClientRect().top) - firstRowTop) <= 2).length
                    );
                    rows = Math.max(1, Math.ceil(visibleBoxes.length / columns));
                }
            }

            const initialCompactness = Math.min(
                deckWidth / Math.max(columns, 1),
                deckHeight / Math.max(rows, 1)
            );
            const deckGap = clampValue(
                initialCompactness * (
                    isCompactPortrait
                        ? 0.118
                        : isCompactLandscape
                            ? 0.085
                            : 0.105
                ),
                isCompactPortrait ? 12 : isCompactLandscape ? 8 : 10,
                isCompactPortrait ? 18 : isCompactLandscape ? 14 : 18
            );
            const usableCellWidth = Math.max(
                1,
                (deckWidth - (deckGap * Math.max(columns - 1, 0))) / Math.max(columns, 1)
            );
            const usableCellHeight = Math.max(
                1,
                (deckHeight - (deckGap * Math.max(rows - 1, 0))) / Math.max(rows, 1)
            );
            const usableCompactness = Math.min(usableCellWidth, usableCellHeight);
            const metrics = {
                deckGap,
                innerGap: clampValue(
                    usableCompactness * (
                        isCompactPortrait
                            ? 0.052
                            : isCompactLandscape
                                ? 0.058
                                : 0.072
                    ),
                    isCompactMathDeck ? 5 : 6,
                    isCompactMathDeck ? 9 : 14
                ),
                blockPad: clampValue(
                    usableCellHeight * (
                        isCompactPortrait
                            ? 0.072
                            : isCompactLandscape
                                ? 0.082
                                : 0.11
                    ),
                    isCompactMathDeck ? 6 : 9,
                    isCompactMathDeck ? 10 : 18
                ),
                inlinePad: clampValue(
                    usableCellWidth * (
                        isCompactPortrait
                            ? 0.062
                            : isCompactLandscape
                                ? 0.07
                                : 0.09
                    ),
                    isCompactMathDeck ? 8 : 10,
                    isCompactMathDeck ? 13 : 20
                ),
                headerSize: clampValue(
                    usableCompactness * (
                        isCompactPortrait
                            ? 0.05
                            : isCompactLandscape
                                ? 0.055
                                : 0.075
                    ),
                    isCompactMathDeck ? 7 : 8,
                    isCompactMathDeck ? 9 : 12
                ),
                problemSize: clampValue(
                    Math.min(
                        usableCellWidth * (isCompactMathDeck ? 0.105 : 0.12),
                        usableCellHeight * (isCompactMathDeck ? 0.16 : 0.18)
                    ),
                    isCompactMathDeck ? 10 : 12,
                    isCompactMathDeck ? 15 : 22
                ),
                choiceFontSize: clampValue(
                    usableCompactness * (
                        isCompactPortrait
                            ? 0.068
                            : isCompactLandscape
                                ? 0.074
                                : 0.11
                    ),
                    isCompactMathDeck ? 9 : 9,
                    isCompactMathDeck ? 11 : 15
                ),
                choiceGap: clampValue(
                    usableCompactness * (
                        isCompactPortrait
                            ? 0.018
                            : isCompactLandscape
                                ? 0.02
                                : 0.03
                    ),
                    2,
                    isCompactMathDeck ? 4 : 6
                ),
                choiceMinHeight: clampValue(
                    usableCellHeight * (
                        isCompactPortrait
                            ? 0.17
                            : isCompactLandscape
                                ? 0.2
                                : 0.24
                    ),
                    isCompactMathDeck ? 16 : 18,
                    isCompactMathDeck ? 24 : 30
                ),
                choicePadBlock: clampValue(
                    usableCellHeight * (
                        isCompactPortrait
                            ? 0.018
                            : isCompactLandscape
                                ? 0.024
                                : 0.032
                    ),
                    isCompactMathDeck ? 2 : 3,
                    isCompactMathDeck ? 4 : 6
                ),
                choicePadInline: clampValue(
                    usableCellWidth * (
                        isCompactPortrait
                            ? 0.024
                            : isCompactLandscape
                                ? 0.028
                                : 0.04
                    ),
                    isCompactMathDeck ? 4 : 5,
                    isCompactMathDeck ? 8 : 10
                ),
            };

            setMathDeckVisualBalance(root, metrics);

            if (isCompactMathDeck) {
                const visibleCells = getVisibleMathCells();
                let overflow = measureMathDeckOverflow(visibleCells);
                let attempts = 0;

                while (overflow > 0 && attempts < 7) {
                    metrics.blockPad = clampValue(metrics.blockPad * 0.9, 4, metrics.blockPad);
                    metrics.inlinePad = clampValue(metrics.inlinePad * 0.92, 6, metrics.inlinePad);
                    metrics.innerGap = clampValue(metrics.innerGap * 0.88, 4, metrics.innerGap);
                    metrics.headerSize = clampValue(metrics.headerSize * 0.94, 6.5, metrics.headerSize);
                    metrics.problemSize = clampValue(metrics.problemSize * 0.92, 9, metrics.problemSize);
                    metrics.choiceFontSize = clampValue(metrics.choiceFontSize * 0.9, 8, metrics.choiceFontSize);
                    metrics.choiceGap = clampValue(metrics.choiceGap * 0.85, 2, metrics.choiceGap);
                    metrics.choiceMinHeight = clampValue(metrics.choiceMinHeight * 0.88, 14, metrics.choiceMinHeight);
                    metrics.choicePadBlock = clampValue(metrics.choicePadBlock * 0.82, 1.5, metrics.choicePadBlock);
                    metrics.choicePadInline = clampValue(metrics.choicePadInline * 0.88, 3, metrics.choicePadInline);
                    setMathDeckVisualBalance(root, metrics);
                    overflow = measureMathDeckOverflow(visibleCells);
                    attempts += 1;
                }
            }
        }

        function applyCompactMathDeckFit(layoutState = responsiveLayoutState) {
            if (!document.body || !gameContainer || !mathChallengeGrid || !topCenterStats) {
                return;
            }

            const root = document.body;

            if (!layoutState?.isCompact) {
                root.style.removeProperty('--compact-stage-max-h');
                root.style.removeProperty('--compact-challenge-block-size');
                root.style.removeProperty('--math-deck-block-size');
                root.style.removeProperty('--math-card-block-size');
                root.style.removeProperty('--math-choice-min-h');
                resizeGameViewport();
                applyMathDeckVisualBalance(layoutState);
                return;
            }

            const rootStyles = window.getComputedStyle(root);
            const rootGap = parseFloat(rootStyles.rowGap || rootStyles.gap) || 0;
            const paddingTop = parseFloat(rootStyles.paddingTop) || 0;
            const paddingBottom = parseFloat(rootStyles.paddingBottom) || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const statsHeight = Math.ceil(topCenterStats.getBoundingClientRect().height || 0);
            const mathDeckIsPortrait = layoutState.mathDeck === 'compact-portrait';
            const challengeHeight = Math.round(clampValue(
                mathDeckIsPortrait ? viewportHeight * 0.052 : viewportHeight * 0.048,
                mathDeckIsPortrait ? 36 : 20,
                mathDeckIsPortrait ? 46 : 28
            ));
            const safeStageHeight = mathDeckIsPortrait ? 146 : 96;

            const coreHeight = Math.max(
                viewportHeight - paddingTop - paddingBottom - statsHeight - challengeHeight - (rootGap * 3),
                mathDeckIsPortrait ? 240 : 180
            );

            const preferredDeckHeight = mathDeckIsPortrait
                ? viewportHeight * 0.29
                : viewportHeight * 0.17;
            const deckMinHeight = mathDeckIsPortrait ? 146 : 60;
            const deckMaxHeight = Math.max(deckMinHeight, coreHeight - safeStageHeight);
            const mathDeckHeight = clampValue(preferredDeckHeight, deckMinHeight, deckMaxHeight);
            const compactStageHeight = Math.max(safeStageHeight, coreHeight - mathDeckHeight);
            const mathCardHeight = mathDeckIsPortrait
                ? Math.max(68, Math.floor((mathDeckHeight - rootGap) / 2))
                : Math.max(60, Math.floor(mathDeckHeight));
            const mathChoiceMinHeight = clampValue(
                mathDeckIsPortrait ? mathCardHeight * 0.24 : mathCardHeight * 0.21,
                14,
                28
            );

            root.style.setProperty('--compact-stage-max-h', `${Math.round(compactStageHeight)}px`);
            root.style.setProperty('--compact-challenge-block-size', `${Math.round(challengeHeight)}px`);
            root.style.setProperty('--math-deck-block-size', `${Math.round(mathDeckHeight)}px`);
            root.style.setProperty('--math-card-block-size', `${Math.round(mathCardHeight)}px`);
            root.style.setProperty('--math-choice-min-h', `${Math.round(mathChoiceMinHeight)}px`);

            syncPetStatusPlacement(layoutState);
            resizeGameViewport();
            applyMathDeckVisualBalance(layoutState);
        }

        function scheduleCompactMathDeckFit(layoutState = responsiveLayoutState) {
            if (compactMathDeckFitFrame) {
                cancelAnimationFrame(compactMathDeckFitFrame);
            }

            compactMathDeckFitFrame = requestAnimationFrame(() => {
                compactMathDeckFitFrame = 0;
                applyCompactMathDeckFit(layoutState);
            });
        }

        function getMathDeckWorldTarget(mathBox, targetZ = 0) {
            if (!camera || !gameContainer || !mathBox) {
                return null;
            }

            const gameRect = gameContainer.getBoundingClientRect();
            const boxRect = mathBox.getBoundingClientRect();
            const centerX = boxRect.left + (boxRect.width / 2);
            const centerY = boxRect.top + (boxRect.height / 2);
            const normalizedX = ((centerX - gameRect.left) / Math.max(gameRect.width, 1)) * 2 - 1;
            const normalizedY = -(((centerY - gameRect.top) / Math.max(gameRect.height, 1)) * 2 - 1);
            const worldPoint = new THREE.Vector3(normalizedX, normalizedY, 0.5).unproject(camera);
            const direction = worldPoint.sub(camera.position).normalize();

            if (Math.abs(direction.z) < 0.0001) {
                return null;
            }

            const distance = (targetZ - camera.position.z) / direction.z;
            return camera.position.clone().add(direction.multiplyScalar(distance));
        }

        function syncPetStatusPlacement(layoutState = responsiveLayoutState) {
            if (!petStatusSection || !petStatusFlowSlot || !petStatusStageSlot) {
                return;
            }

            const stageWidth = gameContainer?.clientWidth || 0;
            const stageHeight = gameContainer?.clientHeight || 0;
            const isCompactPortrait = layoutState?.mathDeck === 'compact-portrait';
            const isCompactLandscape = layoutState?.mathDeck === 'compact-landscape';
            const minimumStageOverlayHeight = isCompactLandscape
                ? 80
                : isCompactPortrait
                    ? 144
                    : 220;
            const minimumUtilityOverlayHeight = isCompactLandscape
                ? 112
                : isCompactPortrait
                    ? 160
                    : 250;
            const minimumStageOverlayWidth = layoutState?.isCompact ? 220 : 250;
            const shouldUseStageOverlay =
                stageWidth >= minimumStageOverlayWidth &&
                stageHeight >= minimumStageOverlayHeight;
            const shouldUseUtilityStageOverlay =
                shouldUseStageOverlay &&
                Boolean(utilityButtons && utilityButtonsFlowSlot) &&
                stageWidth >= minimumStageOverlayWidth &&
                stageHeight >= minimumUtilityOverlayHeight;

            const targetSlot = shouldUseStageOverlay ? petStatusStageSlot : petStatusFlowSlot;

            if (petStatusSection.parentElement !== targetSlot) {
                targetSlot.appendChild(petStatusSection);
            }

            if (utilityButtons && utilityButtonsFlowSlot) {
                const utilityTargetSlot = shouldUseUtilityStageOverlay ? petStatusStageSlot : utilityButtonsFlowSlot;
                if (utilityButtons.parentElement !== utilityTargetSlot) {
                    utilityTargetSlot.appendChild(utilityButtons);
                }
            }

            if (shouldUseStageOverlay) {
                petStatusStageSlot.appendChild(petStatusSection);
                if (shouldUseUtilityStageOverlay && utilityButtons) {
                    petStatusStageSlot.appendChild(utilityButtons);
                }
            }

            document.body.classList.toggle('pet-status-in-stage', shouldUseStageOverlay);
            document.body.classList.toggle('utility-buttons-in-stage', shouldUseUtilityStageOverlay);
        }

        function resetLockPickingDockPosition() {
            if (!lockPickingPanel) {
                return;
            }

            lockPickingPanel.style.position = '';
            lockPickingPanel.style.left = '';
            lockPickingPanel.style.top = '';
            lockPickingPanel.style.right = '';
            lockPickingPanel.style.bottom = '';
            lockPickingPanel.style.width = '';
            lockPickingPanel.style.height = '';
            lockPickingPanel.style.transform = '';
            lockPickingPanel.style.zIndex = '';
        }

        function syncDraggablePanelsForLayout() {
            document.querySelectorAll('.drag-handle').forEach((handle) => {
                const isLockPickingHandle = Boolean(handle.closest('#lock-picking-panel'));
                const shouldEnableDrag = !isLockPickingHandle && isDesktopInteractionLayout();
                handle.classList.toggle('drag-disabled', !shouldEnableDrag);
                handle.style.cursor = shouldEnableDrag ? 'grab' : 'default';
            });

            resetLockPickingDockPosition();
        }

        function applyResponsiveLayoutChange(nextState, previousState) {
            responsiveLayoutState = nextState;
            document.body.classList.toggle('lock-dock-inline-landscape', nextState.mathDeck === 'compact-landscape');
            syncPetStatusPlacement(nextState);
            syncDraggablePanelsForLayout();
            scheduleCompactMathDeckFit(nextState);

            if (nextState.isCompact) {
                if (typeof resetPanelPositions === 'function') {
                    resetPanelPositions();
                }
            }

            if (nextState.isCompact && document.body.dataset.secondaryPanel === '') {
                document.body.dataset.secondaryPanel = 'ep';
            }

            if (!previousState) {
                return;
            }

            if (previousState.isDesktopLike !== nextState.isDesktopLike && !nextState.isDesktopLike) {
                if (typeof resetPanelPositions === 'function') {
                    resetPanelPositions();
                }
            }

            const compactLandscapeModeChanged =
                previousState.mathDeck !== nextState.mathDeck &&
                (previousState.mathDeck === 'compact-landscape' || nextState.mathDeck === 'compact-landscape');

            if (compactLandscapeModeChanged) {
                queueHeroFramingRefresh({ animate: false });
            }
        }

        function initializeResponsiveLayout() {
            if (responsiveLayoutController) {
                responsiveLayoutController.refresh();
                return;
            }

            responsiveLayoutController = setupResponsiveLayout({
                root: document.body,
                defaultSecondaryPanel: 'ep',
                onChange: applyResponsiveLayoutChange,
            });
        }

        function handleViewportResize() {
            scheduleCompactMathDeckFit();
            resizeGameViewport();
            queueHeroFramingRefresh();
        }

        // Power Level Title determination function
        function getPowerLevelTitle(score) {
            if (score >= 1000) return "🏆 Master";
            if (score >= 800) return "🏆 Mega";
            if (score >= 600) return "🏆 Super";
            if (score >= 300) return "🏆 Mighty";
            return "🏆 Rookie";
        }

        // Power Level Score calculation function
        function calculatePowerLevelScore() {
            let totalScore = 0;
            
            debugLog('🧮 CALCULATING Power Level Score...');
            debugLog('🧮 Starting playerUpgrades:', JSON.stringify(playerUpgrades));
            
            // Create a combined upgrade levels object including pending upgrades
            const combinedUpgrades = { ...playerUpgrades };
            
            // Add pending upgrades to the calculation for real-time updates (only if pendingUpgrades exists)
            if (typeof pendingUpgrades !== 'undefined') {
                debugLog('🧮 Adding pendingUpgrades:', JSON.stringify(pendingUpgrades));
                for (const upgradeType in pendingUpgrades) {
                const pendingLevel = pendingUpgrades[upgradeType] || 0;
                
                // Map modal upgrade types to playerUpgrades keys
                let playerUpgradeKey;
                switch(upgradeType) {
                    case 'lockpick':
                        playerUpgradeKey = 'lockPick';
                        break;
                    case 'luckycharms':
                        playerUpgradeKey = 'luckyCharms';
                        break;
                    case 'chainstrength':
                        playerUpgradeKey = 'chainStrength';
                        break;
                    case 'cooldown':
                        playerUpgradeKey = 'mathCooldown';
                        break;
                    default:
                        playerUpgradeKey = upgradeType; // food, water, play, sing
                }
                
                // Add pending levels to existing levels
                const oldLevel = combinedUpgrades[playerUpgradeKey] || 0;
                combinedUpgrades[playerUpgradeKey] = oldLevel + pendingLevel;
                debugLog(`🧮 ${upgradeType} -> ${playerUpgradeKey}: ${oldLevel} + ${pendingLevel} = ${combinedUpgrades[playerUpgradeKey]}`);
                }
            } else {
                debugLog('🧮 No pendingUpgrades to add');
            }
            
            debugLog('🧮 Final combinedUpgrades:', JSON.stringify(combinedUpgrades));
            
            // Iterate through all upgrade types in combined upgrades
            for (const upgradeType in combinedUpgrades) {
                const level = combinedUpgrades[upgradeType] || 0;
                
                // Skip totalCooldownReduction as it's not a level-based upgrade
                if (upgradeType === 'totalCooldownReduction') {
                    debugLog(`🧮 Skipping ${upgradeType} (not level-based)`);
                    continue;
                }
                
                // Calculate points for this upgrade using the tiered system
                // Level 1 = 50 pts, Level 2 = 100 pts, Level 3 = 200 pts, etc.
                // Formula: 50 * (2^(level-1)) for each level >= 1
                if (level > 0) {
                    const points = 50 * Math.pow(2, level - 1);
                    totalScore += points;
                    debugLog(`🧮 ${upgradeType} Level ${level}: +${points} points (total: ${totalScore})`);
                } else {
                    debugLog(`🧮 ${upgradeType} Level ${level}: +0 points`);
                }
            }
            
            debugLog(`🧮 FINAL CALCULATED SCORE: ${totalScore}`);
            return totalScore;
        }

        
        // Force power level update function
        function forcePowerLevelUpdate() {
            debugLog('🔥 FORCING Power Level Update...');
            const score = calculatePowerLevelScore();
            debugLog('Force calculated score:', score);
            
            // Directly update the modal display
            const modalScoreDisplay = document.getElementById('modal-power-level-score');
            if (modalScoreDisplay) {
                modalScoreDisplay.textContent = score;
                debugLog('✅ FORCED modal power level update to:', score);
            }
            
            // Update title
            const title = getPowerLevelTitle(score);
            const powerLevelTitleDisplay = document.getElementById('power-level-title');
            if (powerLevelTitleDisplay) {
                powerLevelTitleDisplay.textContent = title;
                debugLog('✅ FORCED title update to:', title);
            }
            
            return score;
        }

        // Update Power Level Score displays
        function updatePowerLevelScore() {
            const score = calculatePowerLevelScore();
            const title = getPowerLevelTitle(score);
            
            debugLog(`🔥 Updating Power Level Score: ${score}, Title: ${title}`);
            debugLog('🔥 Current playerUpgrades:', JSON.stringify(playerUpgrades));
            debugLog('🔥 Current pendingUpgrades:', typeof pendingUpgrades !== 'undefined' ? JSON.stringify(pendingUpgrades) : 'undefined');
            
            // Update the Power-Up Shop button display
            const shopButton = document.getElementById('upgrades-panel-button');
            if (shopButton) {
                const scoreDisplay = shopButton.querySelector('.power-level-score');
                if (scoreDisplay) {
                    scoreDisplay.textContent = `Power: ${score}`;
                    debugLog('✅ Updated shop button power score');
                }
                
                const titleDisplay = shopButton.querySelector('.shop-button-power-title');
                if (titleDisplay) {
                    titleDisplay.textContent = title;
                    debugLog('✅ Updated shop button title');
                }
            }
            
            // Update the modal header display
            const modalScoreDisplay = document.getElementById('modal-power-level-score');
            if (modalScoreDisplay) {
                debugLog(`🔥 BEFORE update - Modal score display current value: "${modalScoreDisplay.textContent}"`);
                modalScoreDisplay.textContent = score;
                debugLog(`✅ Updated modal power level score display to: ${score}`);
                debugLog(`🔥 AFTER update - Modal score display new value: "${modalScoreDisplay.textContent}"`);
            } else {
                debugLog('❌ Modal power level score display not found!');
            }
            
            // Update the Power Level Title display
            const powerLevelTitleDisplay = document.getElementById('power-level-title');
            if (powerLevelTitleDisplay) {
                powerLevelTitleDisplay.textContent = title;
                debugLog('✅ Updated power level title display');
            } else {
                debugLog('❌ Power level title display not found!');
            }
            
            // Update the modal breakdown display (simplified for kids)
            const modalBreakdownDisplay = document.getElementById('modal-power-level-breakdown');
            if (modalBreakdownDisplay) {
                let upgradeCount = 0;
                
                // Create a combined upgrade levels object including pending upgrades
                const combinedUpgrades = { ...playerUpgrades };
                
                // Add pending upgrades to the count for real-time updates (only if pendingUpgrades exists)
                if (typeof pendingUpgrades !== 'undefined') {
                    for (const upgradeType in pendingUpgrades) {
                    const pendingLevel = pendingUpgrades[upgradeType] || 0;
                    
                    // Map modal upgrade types to playerUpgrades keys
                    let playerUpgradeKey;
                    switch(upgradeType) {
                        case 'lockpick':
                            playerUpgradeKey = 'lockPick';
                            break;
                        case 'luckycharms':
                            playerUpgradeKey = 'luckyCharms';
                            break;
                        case 'chainstrength':
                            playerUpgradeKey = 'chainStrength';
                            break;
                        case 'cooldown':
                            playerUpgradeKey = 'mathCooldown';
                            break;
                        default:
                            playerUpgradeKey = upgradeType; // food, water, play, sing
                    }
                    
                    // Add pending levels to existing levels
                    combinedUpgrades[playerUpgradeKey] = (combinedUpgrades[playerUpgradeKey] || 0) + pendingLevel;
                    }
                }
                
                // Count upgrades with levels > 0
                for (const upgradeType in combinedUpgrades) {
                    const level = combinedUpgrades[upgradeType] || 0;
                    
                    // Skip totalCooldownReduction as it's not a level-based upgrade
                    if (upgradeType === 'totalCooldownReduction') continue;
                    
                    if (level > 0) {
                        upgradeCount++;
                    }
                }
                
                let breakdownHTML = '';
                if (upgradeCount === 0) {
                    breakdownHTML = '<div class="power-breakdown-item"><span class="upgrade-name">Get upgrades to grow stronger!</span></div>';
                } else {
                    breakdownHTML = `<div class="power-breakdown-item"><span class="upgrade-name">You have ${upgradeCount} awesome powers!</span></div>`;
                }
                
                modalBreakdownDisplay.innerHTML = breakdownHTML;
            }
        }

        function determineNextPetRarity() {
            // Get the Lucky Charms upgrade level from playerUpgrades
            const luckyCharmsLevel = playerUpgrades.luckyCharms || 0;
            
            // Create a copy of the base probabilities - start with custom rates if set
            let adjustedProbabilities = {};
            
            // Use the custom rates set by the player from the settings panel
            let baseProbs = {};
            if (customPetRarityRates) {
                baseProbs = { ...customPetRarityRates };
            } else {
                // Fallback to default probabilities from CONFIG if no custom rates
                for (const rarityKey in CONFIG.PET_RARITIES) {
                    baseProbs[rarityKey] = CONFIG.PET_RARITIES[rarityKey].probability;
                }
            }
            
            // Adjust probabilities based on Lucky Charms level
            // Each level of Lucky Charms increases rare probability by 5% and legendary by 3%
            // This is taken from the common probability pool
            if (luckyCharmsLevel > 0) {
                const rareBoost = 0.05 * luckyCharmsLevel; // 5% per level
                const legendaryBoost = 0.03 * luckyCharmsLevel; // 3% per level
                
                // Calculate total boost, but ensure we don't exceed common's probability (minimum 10%)
                const totalBoost = Math.min(rareBoost + legendaryBoost, baseProbs.common - 0.10);
                
                // Distribute the boost proportionally if we reached the cap
                const adjustmentRatio = totalBoost > 0 ? Math.min(1, (baseProbs.common - 0.10) / totalBoost) : 0;
                const actualRareBoost = rareBoost * adjustmentRatio;
                const actualLegendaryBoost = legendaryBoost * adjustmentRatio;
                
                // Apply adjusted boosts
                adjustedProbabilities.common = baseProbs.common - (actualRareBoost + actualLegendaryBoost);
                adjustedProbabilities.rare = baseProbs.rare + actualRareBoost;
                adjustedProbabilities.legendary = baseProbs.legendary + actualLegendaryBoost;
            } else {
                // No Lucky Charms, use default probabilities
                adjustedProbabilities = { ...baseProbs };
            }
            
            // Use the adjusted probabilities to determine next pet rarity
            const rand = Math.random();
            let cumulativeProb = 0;
            for (const rarityKey in adjustedProbabilities) {
                cumulativeProb += adjustedProbabilities[rarityKey];
                if (rand < cumulativeProb) {
                    return rarityKey;
                }
            }
            return 'common'; // Fallback, should ideally not be reached if probabilities sum to 1
        }

        // V. SOUND SYSTEM
        const SOUNDS = createSoundRegistry(debugLog);
        
        function playSound(soundName, spriteName = null) {
            if (SOUNDS[soundName] && gameStarted) { 
                if (spriteName) { SOUNDS[soundName].play(spriteName); } 
                else { SOUNDS[soundName].play(); }
            }
        }
        function stopSound(soundName) { if (SOUNDS[soundName]) { SOUNDS[soundName].stop(); } }
        
        function startHeartbeat() { 
            if (!heartbeatActive && SOUNDS.heartbeat && SOUNDS.heartbeat.state() === 'loaded') { 
                SOUNDS.heartbeat.play(); heartbeatActive = true; 
            } 
        }
        function stopHeartbeat() { 
            if (heartbeatActive && SOUNDS.heartbeat) { 
                SOUNDS.heartbeat.stop(); heartbeatActive = false; 
            } 
        }
        
        // Add UI event listeners directly to DOM elements without redeclaring variables
        
        // Start button event listener - PRIORITY HANDLER FOR SOUNDS
        document.getElementById('start-button').addEventListener('click', function(e) {
            debugLog('Start button clicked - playing sounds');
            
            // Ensure audio context is resumed for browsers that require user interaction
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    debugLog('Audio context resumed');
                    // Play start button sound after audio context is ready
                    setTimeout(() => {
                        if (SOUNDS.startButton) {
                            debugLog('Playing start button sound after audio context resume');
                            try {
                                SOUNDS.startButton.play();
                            } catch (err) {
                                debugLog('Error playing start button sound:', err);
                            }
                        }
                    }, 50); // Small delay to ensure audio context is fully ready
                }).catch(err => {
                    debugLog('Audio context resume failed:', err);
                });
            } else {
                // Audio context is already ready, play sound immediately
                if (SOUNDS.startButton) {
                    debugLog('Playing start button sound (audio context ready)');
                    try {
                        SOUNDS.startButton.play();
                    } catch (err) {
                        debugLog('Error playing start button sound:', err);
                    }
                } else {
                    debugLog('Start button sound not available');
                }
            }
            
            // Smooth fade out intro background music over 3 seconds for ultra-smooth transition
            if (SOUNDS.introBackground) {
                if (SOUNDS.introBackground.playing()) {
                    debugLog('Smoothly fading out intro background music over 3 seconds');
                    const currentVolume = SOUNDS.introBackground.volume();
                    debugLog('Current intro volume:', currentVolume);
                    
                    // Use an even longer, ultra-smooth fade (3 seconds)
                    SOUNDS.introBackground.fade(currentVolume, 0, 3000);
                    
                    // Add fade completion callback
                    SOUNDS.introBackground.once('fade', () => {
                        debugLog('Fade completed, stopping intro background music');
                        SOUNDS.introBackground.stop();
                    });
                    
                    // Backup timeout in case fade event doesn't fire
                    setTimeout(() => {
                        if (SOUNDS.introBackground.playing()) {
                            SOUNDS.introBackground.stop();
                            debugLog('Intro background music stopped after timeout backup');
                        }
                    }, 3200); // 3.2 seconds backup
                } else {
                    debugLog('Intro background music not playing');
                }
            } else {
                debugLog('Intro background music not available');
            }
            
            // Prevent multiple clicks during transition
            if (gameStarted && gameState !== 'INIT' && gameState !== 'LOSE' && gameState !== 'INTRO') { 
                if (gameState === 'PLAYING' || gameState === 'TRANSITIONING') return; 
            }
            
            // Enable Howler auto-unlock for better audio support
            Howler.autoUnlock = true;
            
            // Reset panel positions (from disabled listener)
            if (typeof resetPanelPositions === 'function') {
                resetPanelPositions();
            }
            
            this.disabled = true;
            gameStarted = true;
            
            // Handle start overlay transition - SEQUENCED to prevent lava flash
            const startOverlay = document.getElementById('start-overlay');
            const gameContainer = document.getElementById('game-container');
            
            // Step 1: Start fading out the overlay first
            if (startOverlay) startOverlay.style.opacity = '0';
            
            // Step 2: Wait for overlay to completely fade, then show game container
            setTimeout(() => {
                // Now that overlay is faded, hide it completely and show game
                if (startOverlay) startOverlay.style.display = 'none';
                if (gameContainer) gameContainer.style.opacity = '1';
                
                // Hide the black screen overlay after game container is visible
                const blackScreenOverlay = document.getElementById('black-screen-overlay');
                if (blackScreenOverlay) blackScreenOverlay.style.display = 'none';
                
                document.getElementById('start-button').disabled = false;
                
                // Show all interface elements
                document.querySelectorAll('#top-left-panel, #lock-picking-panel, #right-side-panels, #top-center-stats').forEach(el => {
                    el.style.opacity = '1';
                });
                
                // Close settings panel if open (from disabled listener)
                const settingsPanel = document.getElementById('settings-panel');
                if (settingsPanel?.classList.contains('is-open') && typeof closeSettingsPanel === 'function') {
                    closeSettingsPanel();
                }
                
                // Initialize Three.js scene now (prevents lava flash during intro)
                if (!scene) {
                    debugLog('Initializing Three.js scene after start button click');
                    initThree();
                    animate(0); // Start the animation loop
                }
                
                // Start the game
                startGame();
            }, 500); // Wait for overlay fade to complete before showing game
        }, true); // Use capture phase to ensure this runs first
        
        // Settings button event listener
        document.getElementById('settings-button').addEventListener('click', function() {
            openSettingsPanel();
        });
        
        // Close settings button event listener
        document.getElementById('close-settings-button').addEventListener('click', function() {
            closeSettingsPanel();
        });
        
        // Save settings button event listener
        document.getElementById('save-settings-button').addEventListener('click', function() {
            saveSettings();
            closeSettingsPanel();
        });
        
        // Restart button event listener
        document.getElementById('restart-settings-button').addEventListener('click', function() {
            restartToStartOverlay();
        });

        function setNewSoundSource(type, dataUrl) {
            let oldSoundIsPlaying = false; let oldVolume = 1.0;
            let soundObjectKey = type;
            switch(type) {
                case 'bgm': soundObjectKey = 'ambient'; break;
                case 'thunder': soundObjectKey = 'lightning'; break;
                case 'correctAnswer': soundObjectKey = 'correctAnswerSound'; break;
                case 'fairy': soundObjectKey = 'fairySound'; break;
                case 'buyUpgrade': soundObjectKey = 'buyUpgrade'; break;
                case 'mathWizard': soundObjectKey = 'mathWizard'; break;
                case 'legendaryPet': soundObjectKey = 'legendaryPet'; break;
                // Other specific mappings if keys differ
            }
            if (SOUNDS[soundObjectKey]) {
                oldSoundIsPlaying = SOUNDS[soundObjectKey].playing();
                oldVolume = SOUNDS[soundObjectKey].volume();
                SOUNDS[soundObjectKey].unload();
            }
            let newHowlConfig = {
                src: [dataUrl], volume: oldVolume,
                onloaderror: (id,err) => console.error(`Custom ${type} (key: ${soundObjectKey}) load error: ${err}`),
                onplayerror: (id,err) => { console.error(`Custom ${type} (key: ${soundObjectKey}) play error: ${err}`); if (this.loop && this.loop()) setTimeout(() => { if (this.state() === 'loaded' && !this.playing()) { this.play();}}, 1000); }
            };
            if (type === 'bgm' || type === 'heartbeat') newHowlConfig.loop = true;
            if (type === 'bgm') newHowlConfig.fade = true;
            if (type === 'lockPickClick') newHowlConfig.sprite = { click: [0, 150] };
            SOUNDS[soundObjectKey] = new Howl(newHowlConfig);
            if (oldSoundIsPlaying && gameStarted && (gameState === 'PLAYING' || gameState === 'INTRO' || gameState === 'TRANSITIONING')) {
                if (type === 'bgm' && SOUNDS.ambient) SOUNDS.ambient.play();
                if (type === 'heartbeat' && SOUNDS.heartbeat && isGrumpy) SOUNDS.heartbeat.play();
            }
        }
        async function handleSoundUpload(type, file) { if (!file) return; try { const dataUrl = await readFileAsDataURL(file); stagedCustomSounds[type] = dataUrl; setNewSoundSource(type, dataUrl); } catch (error) { console.error(`Error processing ${type}:`, error); alert(`Failed to load ${type}.`); } }
        async function loadCustomSoundsFromStorage() { for (const type of CUSTOM_SOUND_TYPES) { try { const savedSoundDataUrl = localStorage.getItem(`customSound_${type}`); if (savedSoundDataUrl) { setNewSoundSource(type, savedSoundDataUrl); } } catch (e) { console.error(`Error loading ${type} from localStorage:`, e); } } }
        
        function initializeIntroBackgroundAudio() {
            // Start intro background music with user interaction handling
            setTimeout(() => {
                if (SOUNDS.introBackground) {
                    debugLog('Attempting to start intro background music');
                    
                    // Try to play immediately, but handle browser restrictions
                    const playPromise = SOUNDS.introBackground.play();
                    
                    if (playPromise !== undefined) {
                        // Modern browsers return a promise
                        if (typeof playPromise.then === 'function') {
                            playPromise.then(() => {
                                debugLog('Intro background music started successfully, volume:', SOUNDS.introBackground.volume());
                            }).catch(error => {
                                debugLog('Intro background music blocked by browser, will start on user interaction:', error);
                                // Set a flag to start music on first user interaction
                                window.startIntroMusicOnInteraction = true;
                            });
                        } else {
                            debugLog('Intro background music started, volume:', SOUNDS.introBackground.volume());
                        }
                    } else {
                        debugLog('Intro background music started (legacy), volume:', SOUNDS.introBackground.volume());
                    }
                } else {
                    debugLog('Intro background music not available in SOUNDS object');
                }
            }, 500); // Small delay to ensure everything is loaded
            
            // Add a one-time click listener to start intro music if blocked by browser
            document.addEventListener('click', function startMusicOnFirstClick() {
                if (window.startIntroMusicOnInteraction && SOUNDS.introBackground && !SOUNDS.introBackground.playing()) {
                    debugLog('Starting intro background music on user interaction');
                    SOUNDS.introBackground.play();
                    window.startIntroMusicOnInteraction = false;
                }
                // Remove this listener after first use
                document.removeEventListener('click', startMusicOnFirstClick);
            }, { once: true });
            
            // Direct handler for Upgrade Wizard button
            const cooldownButton = document.getElementById('cooldown-upgrade-btn');
            
            // Directly update the cooldown display in case it's not being updated elsewhere
            const levelCooldown = document.getElementById('level-cooldown');
            const effectCooldown = document.getElementById('effect-cooldown');
            
            if (levelCooldown) {
                levelCooldown.textContent = playerUpgrades.mathCooldown || 0;
            }
            
            if (effectCooldown) {
                effectCooldown.textContent = playerUpgrades.mathCooldown || 0;
            }
            
            // Set the initial button text to show the correct cost
            if (cooldownButton) {
                // Make sure mathCooldown is initialized
                if (typeof playerUpgrades.mathCooldown === 'undefined') {
                    playerUpgrades.mathCooldown = 0;
                }
                
                // Calculate next cost with fallback for safety
                const currentLevel = parseInt(playerUpgrades.mathCooldown) || 0;
                const nextCost = Math.pow(2, currentLevel + 1) || 2; // Default to 2 if calculation fails
                cooldownButton.textContent = `Buy (-${nextCost} EP)`;
            }
            
            if (cooldownButton) {
                debugLog('Found cooldown upgrade button, adding direct handler');
                cooldownButton.addEventListener('click', function() {
                    debugLog('Cooldown upgrade button clicked');
                    // Ensure mathCooldown is properly initialized
                    if (typeof playerUpgrades.mathCooldown === 'undefined') {
                        playerUpgrades.mathCooldown = 0;
                    }
                    
                    // Calculate current upgrade cost with proper error handling
                    const currentLevel = parseInt(playerUpgrades.mathCooldown) || 0;
                    const upgradeCost = Math.pow(2, currentLevel + 1) || 2; // 2, 4, 8, 16, etc.
                    
                    debugLog('Current mathCooldown level:', currentLevel);
                    debugLog('Upgrade cost:', upgradeCost);
                    debugLog('Current player energy:', playerEnergy);
                    
                    // Check if player has enough energy
                    if (playerEnergy >= upgradeCost) {
                        // Deduct energy
                        playerEnergy -= upgradeCost;
                        
                        // Increment upgrade level
                        playerUpgrades.mathCooldown = parseInt(playerUpgrades.mathCooldown || 0) + 1;
                        
                        debugLog('Upgrade purchased! New level:', playerUpgrades.mathCooldown);
                        
                        // Calculate a random cooldown reduction using gambling system (50% = 1s, 35% = 2s, 15% = 3s)
                        const cooldownReduction = rollCooldownReduction();
                        
                        // Add the random reduction to the accumulated total
                        if (typeof playerUpgrades.totalCooldownReduction === 'undefined') {
                            playerUpgrades.totalCooldownReduction = 0;
                        }
                        playerUpgrades.totalCooldownReduction = parseInt(playerUpgrades.totalCooldownReduction || 0) + cooldownReduction;
                        
                        debugLog(`Added ${cooldownReduction}s cooldown reduction. Total reduction: ${playerUpgrades.totalCooldownReduction}s`);
                        
                        // Update the button text to show next upgrade cost
                        const nextUpgradeCost = Math.pow(2, parseInt(playerUpgrades.mathCooldown) + 1) || Math.pow(2, 1);
                        cooldownButton.textContent = `Buy (-${nextUpgradeCost} EP)`;
                        
                        // Immediately update the level and effect displays
                        const levelDisplay = document.getElementById('level-cooldown');
                        const effectDisplay = document.getElementById('effect-cooldown');
                        
                        if (levelDisplay) {
                            levelDisplay.textContent = playerUpgrades.mathCooldown;
                        }
                        
                        if (effectDisplay) {
                            // Show the total accumulated cooldown reduction, not just the level
                            effectDisplay.textContent = playerUpgrades.totalCooldownReduction;
                        }
                        
                        // Save to localStorage
                        try {
                            localStorage.setItem('lavaCageUpgrades', JSON.stringify(playerUpgrades));
                        } catch (e) {
                            console.error('Error saving upgrades:', e);
                        }
                        
                        // Display a notification about the cooldown reduction
                        try {
                            displayNotification(`Wizard Upgrade: -${cooldownReduction}s cooldown!`, 'upgrade');
                        } catch(e) {
                            debugLog('Notification error:', e);
                        }
                        
                        // Play the buy upgrade sound
                        playSound('buyUpgrade');
                        
                        // Update displays
                        updateUpgradeDisplay();
                        updateHUD();
                    } else {
                        // Not enough energy points
                        debugLog('Not enough energy to purchase upgrade');
                        playSound('errorSound');
                        animateElementShake(cooldownButton);
                    }
                });
            } else {
                console.error('Could not find cooldown upgrade button');
            }
        }

        // VI. THREE.JS SETUP & OBJECT CREATION
        const lavaVertexShader = `
            varying vec2 vUv; varying vec3 vPosition; uniform float uTime;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy)); vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
            void main() {
                vUv = uv; vPosition = position;
                float noise1 = snoise(uv * 5.0 + uTime * 0.1); float noise2 = snoise(uv * 10.0 - uTime * 0.05); float noise3 = snoise(uv * 20.0 + uTime * 0.02);
                float displacement = noise1 * 0.3 + noise2 * 0.2 + noise3 * 0.1;
                float turbulence = sin(uv.x * 20.0 + uTime * 0.5) * cos(uv.y * 20.0 + uTime * 0.3) * 0.05;
                vec3 pos = position; pos.z += displacement + turbulence;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }`;

        const lavaFragmentShader = `
            varying vec2 vUv; varying vec3 vPosition; uniform float uTime;
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy)); vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
            void main() {
                float noise1 = snoise(vUv * 5.0 + uTime * 0.1); float noise2 = snoise(vUv * 10.0 - uTime * 0.05); float noise3 = snoise(vUv * 20.0 + uTime * 0.02);
                float bubble = smoothstep(0.4, 0.6, noise1 * noise2);
                vec3 hotColor = vec3(1.0, 0.3, 0.0); vec3 mediumColor = vec3(0.8, 0.1, 0.0); vec3 coolColor = vec3(0.2, 0.0, 0.0);
                float heatDistortion = noise1 * 0.5 + 0.5;
                vec3 baseColor = mix(mediumColor, hotColor, noise1 * 0.5 + 0.5); baseColor = mix(baseColor, coolColor, noise2 * 0.3);
                float pulse = sin(uTime * 2.0 + vUv.y * 10.0) * 0.5 + 0.5; baseColor += vec3(0.2, 0.1, 0.0) * pulse;
                baseColor += vec3(0.3, 0.15, 0.0) * bubble;
                float distortion = noise3 * 0.1; baseColor += vec3(distortion * 0.2, distortion * 0.1, 0.0);
                float brightness = 0.8 + noise1 * 0.2; baseColor *= brightness;
                float rim = 1.0 - abs(dot(normalize(vPosition), vec3(0.0, 1.0, 0.0))); baseColor += vec3(0.2, 0.1, 0.0) * rim;
                gl_FragColor = vec4(baseColor, 1.0);
            }`;
        
        function removeCurrentPetAndCage() {
            if (pet) {
                scene.remove(pet);
                pet.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.isMaterial) { // Check if it's a single material
                           child.material.dispose();
                        } else if (Array.isArray(child.material)) { // Handle array of materials
                           child.material.forEach(material => material.dispose());
                        }
                    }
                });
                pet = null;
            }
            if (cage) {
                scene.remove(cage);
                 cage.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.isMaterial) {
                           child.material.dispose();
                        } else if (Array.isArray(child.material)) {
                           child.material.forEach(material => material.dispose());
                        }
                    }
                });
                cage = null;
            }
            mountedChainLink = null;
        }

        function createPet(rarityKey = 'common') {
            const rarityData = CONFIG.PET_RARITIES[rarityKey];
            const scale = rarityData.petScale;

            pet = new THREE.Group(); pet.flapAnimation = null;
            const headMat = new THREE.MeshStandardMaterial({ 
                color: rarityData.petColor, 
                roughness: 0.6, metalness: 0.2,
                emissive: rarityData.petEmissive, emissiveIntensity: rarityData.petEmissive !== 0x000000 ? 0.5 : 0
            });
            const accentMat = new THREE.MeshStandardMaterial({ 
                color: rarityData.petAccentColor, 
                roughness: 0.6, metalness: 0.2,
                emissive: rarityData.petEmissive, emissiveIntensity: rarityData.petEmissive !== 0x000000 ? 0.3 : 0
            });
            
            const bodyRadius = 0.3 * scale, bodyScaleY = 0.8, headRadius = 0.22 * scale;
            const bodyGeo = new THREE.SphereGeometry(bodyRadius, 16, 12);
            const body = new THREE.Mesh(bodyGeo, headMat); body.scale.set(1, bodyScaleY, 1.2); body.position.y = bodyRadius * bodyScaleY; body.castShadow = true; pet.add(body);
            
            const headGeo = new THREE.SphereGeometry(headRadius, 16, 12);
            const head = new THREE.Mesh(headGeo, headMat); head.position.set(0, (bodyRadius * bodyScaleY) * 1.8, bodyRadius * 1.2 * 0.3); head.castShadow = true; pet.add(head); pet.head = head; 
            
            const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 8, 8); const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0 });
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-headRadius*0.4, head.position.y + headRadius*0.15, head.position.z + headRadius * 0.8); pet.add(leftEye);
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(headRadius*0.4, head.position.y + headRadius*0.15, head.position.z + headRadius * 0.8); pet.add(rightEye);
            
            const earBaseRadius = 0.06 * scale, earHeight = 0.35 * scale;
            const earShape = new THREE.Shape(); earShape.moveTo(0, 0); earShape.quadraticCurveTo(earBaseRadius * 0.3, earHeight * 0.2, earBaseRadius * 0.8, earHeight * 0.4); earShape.quadraticCurveTo(earBaseRadius * 0.9, earHeight * 0.6, earBaseRadius * 0.7, earHeight * 0.8); earShape.quadraticCurveTo(earBaseRadius * 0.5, earHeight * 0.9, 0, earHeight); earShape.quadraticCurveTo(-earBaseRadius * 0.5, earHeight * 0.9, -earBaseRadius * 0.7, earHeight * 0.8); earShape.quadraticCurveTo(-earBaseRadius * 0.9, earHeight * 0.6, -earBaseRadius * 0.8, earHeight * 0.4); earShape.quadraticCurveTo(-earBaseRadius * 0.3, earHeight * 0.2, 0, 0);
            const earGeometry = new THREE.ExtrudeGeometry(earShape, { depth: earBaseRadius * 0.25, bevelEnabled: true, bevelThickness: 0.015 * scale, bevelSize: 0.015 * scale, bevelSegments: 3 });
            const leftEar = new THREE.Mesh(earGeometry, accentMat); leftEar.position.set(-headRadius * 0.4, head.position.y + headRadius * 0.6, head.position.z + 0.1 * scale); leftEar.rotation.set(-Math.PI / 6, -Math.PI / 12, -Math.PI / 20); leftEar.scale.set(0.7, 0.9, 0.7); pet.add(leftEar);
            const rightEar = new THREE.Mesh(earGeometry, accentMat); rightEar.position.set(headRadius * 0.4, head.position.y + headRadius * 0.6, head.position.z + 0.1 * scale); rightEar.rotation.set(-Math.PI / 6, Math.PI / 12, Math.PI / 20); rightEar.scale.set(0.7, 0.9, 0.7); pet.add(rightEar);
            
            const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7, metalness: 0.1 });
            const innerEarGeometry = new THREE.ExtrudeGeometry(earShape, { depth: earBaseRadius * 0.12, bevelEnabled: true, bevelThickness: 0.008 * scale, bevelSize: 0.008 * scale, bevelSegments: 2 });
            const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial); leftInnerEar.position.set(-headRadius * 0.4, head.position.y + headRadius * 0.6, head.position.z + 0.115 * scale); leftInnerEar.rotation.set(-Math.PI / 6, -Math.PI / 12, -Math.PI / 20); leftInnerEar.scale.set(0.6, 0.8, 0.6); pet.add(leftInnerEar);
            const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial); rightInnerEar.position.set(headRadius * 0.4, head.position.y + headRadius * 0.6, head.position.z + 0.115 * scale); rightInnerEar.rotation.set(-Math.PI / 6, Math.PI / 12, Math.PI / 20); rightInnerEar.scale.set(0.6, 0.8, 0.6); pet.add(rightInnerEar);
            
            const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.7, transparent: true, opacity: 0.9, emissive: rarityKey === 'legendary' ? 0xccaa00 : 0x000000, emissiveIntensity: 0.4 });
            const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.2, 0.1, 0.4, 0.2); wingShape.quadraticCurveTo(0.6, 0.3, 0.8, 0.4); wingShape.quadraticCurveTo(0.9, 0.5, 1.0, 0.6); wingShape.quadraticCurveTo(0.9, 0.7, 0.8, 0.8); wingShape.quadraticCurveTo(0.6, 0.9, 0.4, 1.0); wingShape.quadraticCurveTo(0.2, 0.95, 0, 0.9); wingShape.quadraticCurveTo(-0.2, 0.95, -0.4, 1.0); wingShape.quadraticCurveTo(-0.6, 0.9, -0.8, 0.8); wingShape.quadraticCurveTo(-0.9, 0.7, -1.0, 0.6); wingShape.quadraticCurveTo(-0.9, 0.5, -0.8, 0.4); wingShape.quadraticCurveTo(-0.6, 0.3, -0.4, 0.2); wingShape.quadraticCurveTo(-0.2, 0.1, 0, 0);
            const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: 0.02 * scale, bevelEnabled: true, bevelThickness: 0.01 * scale, bevelSize: 0.01 * scale, bevelSegments: 3 });
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial); leftWing.position.set(-bodyRadius * 0.8, body.position.y + bodyRadius * 0.3, -bodyRadius * 0.2); leftWing.rotation.set(0, Math.PI / 4, -Math.PI / 6); leftWing.scale.set(0.4 * scale, 0.4 * scale, 0.4 * scale); pet.add(leftWing); pet.leftWing = leftWing;
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial); rightWing.position.set(bodyRadius * 0.8, body.position.y + bodyRadius * 0.3, -bodyRadius * 0.2); rightWing.rotation.set(0, -Math.PI / 4, Math.PI / 6); rightWing.scale.set(0.4 * scale, 0.4 * scale, 0.4 * scale); pet.add(rightWing); pet.rightWing = rightWing;
            
            const tailCapsuleRadius = 0.10 * scale, tailCapsuleLength = 0.35 * scale;
            const tailGeo = new THREE.CapsuleGeometry(tailCapsuleRadius, tailCapsuleLength, 4, 8);
            const tail = new THREE.Mesh(tailGeo, accentMat); tail.position.set(0, body.position.y * 0.6, -(bodyRadius * body.scale.z * 0.4) - tailCapsuleLength * 0.4 * Math.cos(Math.PI/3)); tail.rotation.x = Math.PI / 2.5; tail.castShadow = true; pet.add(tail); pet.tail = tail;

            pet.position.set(0, 0.05 * scale, 0); // Initial y position adjustment if needed
            
            // Store the initial position for reference and reset purposes
            pet.userData.initialPosition = { x: 0, y: 0.05 * scale, z: 0 };
            
            // Make pet initially transparent for fade-in
            pet.traverse(child => { if (child.isMesh && child.material) { child.material.transparent = true; child.material.opacity = 0;} });

            return pet;
        }
        
        function createCage(rarityKey = 'common') { 
            const rarityData = CONFIG.PET_RARITIES[rarityKey];
            const scale = rarityData.cageScale;

            cage = new THREE.Group();
            const cageMat = new THREE.MeshStandardMaterial({ 
                color: rarityData.cageColor, 
                roughness: 0.32, metalness: 0.95, envMapIntensity: 1.3,
                emissive: rarityData.cageEmissive, emissiveIntensity: rarityData.cageEmissive !== 0x000000 ? 0.4 : 0
            });
            
            const barMainGeoHeight = 1 * scale; // Height of vertical bars
            const barMainGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, barMainGeoHeight, 24); 
            const frameSize = 1.2 * scale; 
            const fh = frameSize / 2; 
            const barRadius = 0.04 * scale;
            
            const frameGeo = new THREE.BoxGeometry(frameSize, 0.1 * scale, frameSize); 
            const base = new THREE.Mesh(frameGeo, cageMat); base.position.y = 0; base.receiveShadow = true; cage.add(base);
            const topFrame = new THREE.Mesh(frameGeo, cageMat); topFrame.position.y = barMainGeoHeight; cage.add(topFrame); // Positioned at top of bars
            
            const N_FRONT_BACK = 5, N_SIDES = N_FRONT_BACK;
            const barEffectiveLength = frameSize - 2 * barRadius;
            const allVerticalBarCoords = new Set();
            for (let i = 0; i < N_FRONT_BACK; i++) { const x = -barEffectiveLength/2 + i * (barEffectiveLength / (N_FRONT_BACK - 1)); allVerticalBarCoords.add(`${x.toFixed(4)},${(-fh + barRadius).toFixed(4)}`); }
            for (let i = 0; i < N_SIDES; i++) { const z = -barEffectiveLength/2 + i * (barEffectiveLength / (N_SIDES - 1)); if (Math.abs(z - (fh - barRadius)) > 1e-4) { allVerticalBarCoords.add(`${(fh - barRadius).toFixed(4)},${z.toFixed(4)}`); } if (Math.abs(z - (-(fh - barRadius))) > 1e-4) { allVerticalBarCoords.add(`${(-fh + barRadius).toFixed(4)},${z.toFixed(4)}`); } }
            
            allVerticalBarCoords.forEach(coordStr => { const [x, z] = coordStr.split(',').map(parseFloat); const bar = new THREE.Mesh(barMainGeo.clone(), cageMat); bar.geometry.translate((Math.random()-0.5)*0.01*scale, 0, (Math.random()-0.5)*0.01*scale); bar.position.set(x, barMainGeoHeight/2, z); bar.castShadow = true; cage.add(bar); });
            
            const hBarRadius = 0.03 * scale, hBarGeoLength = frameSize - 2 * barRadius; 
            const hBarGeo = new THREE.CylinderGeometry(hBarRadius, hBarRadius, hBarGeoLength, 18);
            const hBarHeights = [0.25 * scale, 0.75 * scale]; // Scale heights too
            hBarHeights.forEach(h => { let hBarFB2 = new THREE.Mesh(hBarGeo.clone(), cageMat); hBarFB2.rotation.z = Math.PI/2; hBarFB2.position.set(0, h, -(fh - barRadius)); hBarFB2.geometry.translate((Math.random()-0.5)*0.01*scale, 0, (Math.random()-0.5)*0.01*scale); cage.add(hBarFB2); let hBarLR1 = new THREE.Mesh(hBarGeo.clone(), cageMat); hBarLR1.rotation.x = Math.PI/2; hBarLR1.position.set(fh - barRadius, h, 0); hBarLR1.geometry.translate((Math.random()-0.5)*0.01*scale, 0, (Math.random()-0.5)*0.01*scale); cage.add(hBarLR1); let hBarLR2 = new THREE.Mesh(hBarGeo.clone(), cageMat); hBarLR2.rotation.x = Math.PI/2; hBarLR2.position.set(-(fh - barRadius), h, 0); hBarLR2.geometry.translate((Math.random()-0.5)*0.01*scale, 0, (Math.random()-0.5)*0.01*scale); cage.add(hBarLR2); });
            
            const doorWidth = frameSize - 2 * barRadius, doorHeight = barMainGeoHeight; 
            const numDoorBars = 5; const doorBarSpacing = doorWidth / (numDoorBars - 1);
            const doorBarRadius = barRadius * 0.8, frameBarRadiusInner = barRadius * 1.15;
            const doorBarGeo = new THREE.CylinderGeometry(doorBarRadius, doorBarRadius, doorHeight - 0.04 * scale, 18);
            const frameBarGeo = new THREE.CylinderGeometry(frameBarRadiusInner, frameBarRadiusInner, doorHeight, 18);
            const frameHBarGeo = new THREE.CylinderGeometry(frameBarRadiusInner, frameBarRadiusInner, doorWidth, 18);
            const doorGroup = new THREE.Group();
            const rightFrameBar = new THREE.Mesh(frameBarGeo.clone(), cageMat); rightFrameBar.position.set(0, 0, 0); rightFrameBar.castShadow = true; doorGroup.add(rightFrameBar);
            const leftFrameBar = new THREE.Mesh(frameBarGeo.clone(), cageMat); leftFrameBar.position.set(-doorWidth, 0, 0); leftFrameBar.castShadow = true; doorGroup.add(leftFrameBar);
            const topFrameBar = new THREE.Mesh(frameHBarGeo.clone(), cageMat); topFrameBar.rotation.z = Math.PI/2; topFrameBar.position.set(-doorWidth/2, doorHeight/2 - (0.02*scale), 0); topFrameBar.castShadow = true; doorGroup.add(topFrameBar);
            const botFrameBar = new THREE.Mesh(frameHBarGeo.clone(), cageMat); botFrameBar.rotation.z = Math.PI/2; botFrameBar.position.set(-doorWidth/2, -doorHeight/2 + (0.02*scale), 0); botFrameBar.castShadow = true; doorGroup.add(botFrameBar);
            for (let i = 1; i < numDoorBars-1; i++) { const bar = new THREE.Mesh(doorBarGeo.clone(), cageMat); bar.position.x = -i * doorBarSpacing; bar.position.y = 0; bar.position.z = 0; bar.castShadow = true; doorGroup.add(bar); }
            doorGroup.position.set(frameSize/2 - barRadius, doorHeight/2, fh - barRadius + 0.01*scale); doorGroup.updateMatrixWorld(); cage.door = doorGroup; cage.add(doorGroup);

            cage.visualLock = new THREE.Group();
            const lockBodyGeo = new THREE.CylinderGeometry(0.07*scale, 0.07*scale, 0.16*scale, 18); const lockBodyMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.9, roughness: 0.4 }); const lockBody = new THREE.Mesh(lockBodyGeo, lockBodyMat); lockBody.position.z = 0.06*scale; cage.visualLock.add(lockBody);
            const shackleGeo = new THREE.TorusGeometry(0.055*scale, 0.018*scale, 12, 24, Math.PI * 1.1); const shackleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1.0, roughness: 0.3 }); const shackle = new THREE.Mesh(shackleGeo, shackleMat); shackle.position.y = 0.09*scale; shackle.position.z = 0.01*scale; shackle.rotation.z = Math.PI + (Math.PI - Math.PI * 1.1)/2; cage.visualLock.add(shackle);
            const keyholeGeo = new THREE.CylinderGeometry(0.01*scale, 0.01*scale, 0.025*scale, 10); const keyholeMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.5 }); const keyhole = new THREE.Mesh(keyholeGeo, keyholeMat); keyhole.position.set(0, -0.045*scale, 0.09*scale); keyhole.rotation.x = Math.PI/2; lockBody.add(keyhole);
            cage.visualLock.position.set(-doorWidth + 0.03*scale, 0, 0.04*scale); cage.door.add(cage.visualLock);

            // --- Place hookAnchor at the true top center of the cage ---
            // Calculate the very top of the topFrame
            const anchorOffset = 0; // flush with cage roof
            const cageFrameTopSurfaceY = topFrame.position.y + (frameGeo.parameters.height / 2);
            const plateRadius = CONFIG.LINK_MAJOR_RADIUS * scale; // Scale attachment point
            const plateThickness = CONFIG.LINK_TUBE_RADIUS * scale;
            const plateGeo = new THREE.CylinderGeometry(plateRadius, plateRadius, plateThickness, 32); const plateMesh = new THREE.Mesh(plateGeo, cageMat); plateMesh.position.y = cageFrameTopSurfaceY + plateThickness / 2 + anchorOffset; plateMesh.receiveShadow = true; cage.add(plateMesh);
            
            const weldRadius = (CONFIG.LINK_TUBE_RADIUS * 1.15) * scale; 
            const weldHeight = (CONFIG.LINK_TUBE_RADIUS * 0.7) * scale; 
            const weldGeo = new THREE.CylinderGeometry(weldRadius * 1.1, weldRadius * 0.9, weldHeight, 12, 1);
            const weldPos = weldGeo.attributes.position; for (let i = 0; i < weldPos.count; i++) { let y_weld = weldPos.getY(i); if (Math.abs(y_weld) > 0.01*scale) { let x_weld = weldPos.getX(i); let z_weld = weldPos.getZ(i); let deform = (Math.random() - 0.5) * 0.04*scale * (weldRadius / ((CONFIG.LINK_TUBE_RADIUS * 1.15)*scale)); weldPos.setX(i, x_weld + deform); weldPos.setZ(i, z_weld + deform); } } weldGeo.computeVertexNormals();
            const weldMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85, metalness: 0.6 }); const weldMesh = new THREE.Mesh(weldGeo, weldMat); weldMesh.position.y = (cageFrameTopSurfaceY + plateThickness) + weldHeight / 2 + anchorOffset; weldMesh.castShadow = true; cage.add(weldMesh);
            
            // Place hookAnchor exactly at the top center, flush with the top of the weld
            const topOfWeldY = (cageFrameTopSurfaceY + plateThickness) + weldHeight + anchorOffset;
            const hookAnchor = new THREE.Object3D();
            hookAnchor.position.set(0, topOfWeldY, 0); // No extra offset, perfectly centered
            cage.add(hookAnchor); cage.hook = hookAnchor;

            // cage.position.y = CONFIG.INITIAL_CAGE_BASE_Y; // Set by startGame or transition
            // scene.add(cage); // Added by startGame or transition

            // Make cage initially transparent for fade-in
             cage.traverse(child => { if (child.isMesh && child.material) { child.material.transparent = true; child.material.opacity = 0;} });
            
            return cage;
        }

        function createChain() { 
            if (mountedChainLink) {
                if (mountedChainLink.parent) {
                    mountedChainLink.parent.remove(mountedChainLink);
                }
                mountedChainLink.geometry.dispose();
                mountedChainLink.material.dispose();
                mountedChainLink = null;
            }

            if (chainLinks.length > 0) {
                chainLinks.forEach(link => {
                    if (link.parent) {
                        link.parent.remove(link);
                    } else {
                        scene.remove(link);
                    }
                    link.geometry.dispose();
                    link.material.dispose();
                });
                chainLinks = [];
            }

            const linkMat = new THREE.MeshStandardMaterial({ color: 0x44494d, roughness: 0.32, metalness: 0.95, envMapIntensity: 1.3 });
            const linkGeoBase = new THREE.TorusGeometry(CONFIG.LINK_MAJOR_RADIUS, CONFIG.LINK_TUBE_RADIUS, 22, 48); // Use unscaled link geo
            
            if (!cage || !cage.hook) { console.error("Cage or cage.hook not initialized before createChain."); return; }
            
            const maxCageHeightToAttachPoint = getLegendaryChainAttachOffset();
            scene.chainHangingHeight = CONFIG.INITIAL_CAGE_BASE_Y + maxCageHeightToAttachPoint + CONFIG.DESIRED_FREE_CHAIN_LENGTH + 2;

            const worldChainAttachY = cage.position.y + getCageHookOffsetForScale(CONFIG.PET_RARITIES[currentPetRarityKey].cageScale) + getMountedLinkCenterOffsetY();
            const lengthToAttachPoint = Math.max(scene.chainHangingHeight - worldChainAttachY, CONFIG.LINK_EFFECTIVE_LENGTH);
            CONFIG.CHAIN_LINKS = Math.max(2, Math.round((lengthToAttachPoint / CONFIG.LINK_EFFECTIVE_LENGTH) + 0.5));

            const mountedLinkGeo = linkGeoBase.clone();
            const mountedLinkPos = mountedLinkGeo.attributes.position;
            for (let j = 0; j < mountedLinkPos.count; j++) {
                const x = mountedLinkPos.getX(j);
                const y = mountedLinkPos.getY(j);
                const z = mountedLinkPos.getZ(j);
                const deform = (Math.random() - 0.5) * 0.012;
                mountedLinkPos.setX(j, x + deform);
                mountedLinkPos.setY(j, y + deform);
                mountedLinkPos.setZ(j, z + deform);
            }
            mountedLinkGeo.computeVertexNormals();
            mountedChainLink = new THREE.Mesh(mountedLinkGeo, linkMat);
            mountedChainLink.castShadow = true;
            cage.hook.add(mountedChainLink);
            mountedChainLink.position.set(0, getMountedLinkCenterOffsetY(), 0);
            mountedChainLink.rotation.set(Math.PI / 2, 0, 0);
            cage.mountedChainLink = mountedChainLink;
            updateCageChainAttachPoint(mountedChainLink);
            
            for (let i = 0; i < CONFIG.CHAIN_LINKS; i++) {
                const linkGeo = linkGeoBase.clone(); const pos = linkGeo.attributes.position;
                for (let j = 0; j < pos.count; j++) { let x = pos.getX(j), y = pos.getY(j), z = pos.getZ(j); let deform = (Math.random()-0.5)*0.012; pos.setX(j, x + deform); pos.setY(j, y + deform); pos.setZ(j, z + deform); }
                linkGeo.computeVertexNormals(); const link = new THREE.Mesh(linkGeo, linkMat);
                if (i % 2 === 0) { link.rotation.y = Math.PI / 2 + (Math.random()-0.5)*0.08; } else { link.rotation.x = (Math.random()-0.5)*0.08; }
                link.castShadow = true;
                scene.add(link);
                chainLinks.push(link);
            }

            for (let i = 0; i < chainLinks.length; i++) {
                const distToThisLinkCenter = (i + 0.5) * CONFIG.LINK_EFFECTIVE_LENGTH;
                chainLinks[i].position.set(0, scene.chainHangingHeight - distToThisLinkCenter, 0);
                chainLinks[i].rotation.z = 0;
            }
        }

        function createLava() { 
            const lavaGeo = new THREE.PlaneGeometry(60, 60, 100, 100); // 2x wider and longer lava
            const lavaMat = new THREE.ShaderMaterial({ vertexShader: lavaVertexShader, fragmentShader: lavaFragmentShader, uniforms: { uTime: { value: 0.0 } }, side: THREE.DoubleSide });
            lavaPlane = new THREE.Mesh(lavaGeo, lavaMat); lavaPlane.rotation.x = -Math.PI / 2; lavaPlane.position.y = -3; scene.add(lavaPlane);
        }

        // ====== FLOATING TREASURE CLOUD SYSTEM ======
        function ensureCloudSpawning() {
            // Ensure cloud spawning continues if no clouds exist and no spawn is scheduled
            if (gameState === 'PLAYING' && !isGamePaused && treasureClouds.length === 0 && !cloudSpawnTimeoutId) {
                debugLog('🌤️ No clouds and no spawn scheduled - restarting cloud spawning...');
                const nextSpawnDelay = CONFIG.CLOUD_MIN_INTERVAL + Math.random() * (CONFIG.CLOUD_MAX_INTERVAL - CONFIG.CLOUD_MIN_INTERVAL);
                debugLog(`🌤️ Next cloud scheduled in ${(nextSpawnDelay/1000).toFixed(1)} seconds`);
                cloudSpawnTimeoutId = setTimeout(triggerCloudSpawn, nextSpawnDelay);
            } else if (cloudSpawnTimeoutId) {
                debugLog('🌤️ Cloud spawning already scheduled, no action needed');
            } else if (treasureClouds.length > 0) {
                debugLog('🌤️ Cloud already exists, waiting for it to be removed');
            } else if (gameState !== 'PLAYING') {
                debugLog('🌤️ Game not playing, cloud spawning paused');
            } else if (isGamePaused) {
                debugLog('🌤️ Game paused, cloud spawning paused');
            }
        }

        function initializeTreasureCloudSystem() {
            debugLog('🌤️ Initializing treasure cloud system with random spawning...');
            
            // Clear any existing cloud spawn timeout
            if (cloudSpawnTimeoutId) {
                clearTimeout(cloudSpawnTimeoutId);
                cloudSpawnTimeoutId = null;
            }
            
            // Clear any existing clouds
            treasureClouds.forEach(cloud => {
                scene.remove(cloud);
                // Clean up geometry and materials
                cloud.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.isMaterial) {
                            child.material.dispose();
                        } else if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        }
                    }
                });
            });
            
            // Reset treasure cloud system variables
            treasureClouds = [];
            isFirstCloud = true;
            
            // Start the random cloud spawning system with initial delay
            const initialCloudDelay = CONFIG.CLOUD_MIN_INTERVAL / 3 + Math.random() * (CONFIG.CLOUD_MIN_INTERVAL / 2);
            debugLog(`🌤️ First cloud will spawn in ${(initialCloudDelay/1000).toFixed(1)} seconds...`);
            cloudSpawnTimeoutId = setTimeout(triggerCloudSpawn, initialCloudDelay);
        }
        
        function createTreasureCloud() {
            const cloudGroup = new THREE.Group();
            cloudGroup.name = 'treasureCloud';
            
            // Determine chest color/difficulty randomly
            const chestTypes = [
                { color: 'green', difficultyRange: [1, 2], lidColor: 0x4CAF50, emissiveColor: 0x2E7D32 },
                { color: 'yellow', difficultyRange: [3, 4], lidColor: 0xFFEB3B, emissiveColor: 0xF57C00 },
                { color: 'orange', difficultyRange: [5, 6], lidColor: 0xFF9800, emissiveColor: 0xE65100 },
                { color: 'red', difficultyRange: [7, 8], lidColor: 0xF44336, emissiveColor: 0xC62828 }
            ];
            
            const chestType = chestTypes[Math.floor(Math.random() * chestTypes.length)];
            cloudGroup.userData.chestType = chestType;
            
            // Create cloud base using multiple spheres for fluffy appearance
            const cloudMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xf0f8ff, 
                transparent: true, 
                opacity: 0.85,
                roughness: 0.8,
                metalness: 0.1,
                emissive: 0x1a1a2e,
                emissiveIntensity: 0.1
            });
            
            const cloudParts = [];
            const numParts = 8;
            
            for (let i = 0; i < numParts; i++) {
                const radius = 0.19 + Math.random() * 0.12; // Smaller cloud puffs so the treasure stays readable
                const puffGeo = new THREE.SphereGeometry(radius, 12, 8);
                const puff = new THREE.Mesh(puffGeo, cloudMaterial);
                
                // Position puffs to form cloud shape
                const angle = (i / numParts) * Math.PI * 2;
                const distance = 0.18 + Math.random() * 0.1; // Tighter, lighter cloud formation
                puff.position.set(
                    Math.cos(angle) * distance,
                    (Math.random() - 0.5) * 0.2,
                    Math.sin(angle) * distance
                );
                
                puff.scale.set(
                    0.72 + Math.random() * 0.2,
                    0.58 + Math.random() * 0.18,
                    0.72 + Math.random() * 0.2
                );
                
                cloudParts.push(puff);
                cloudGroup.add(puff);
            }
            
            // Create treasure chest on top of cloud
            const chestGroup = new THREE.Group();
            
            // Scale factor for chest size
            const chestScale = 0.95; // Slightly smaller so the whole treasure reads cleanly in-frame
            
            // Classic wooden chest body material with magical glow
            const chestWoodMat = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513, // Rich wood brown
                roughness: 0.7, 
                metalness: 0.1,
                emissive: 0x221100, // Warm glow
                emissiveIntensity: 0.4
            });
            
            // Magical metal bands material
            const bandMat = new THREE.MeshStandardMaterial({ 
                color: 0xFFD700, // Bright gold bands
                roughness: 0.2, 
                metalness: 0.9,
                emissive: 0xCC9900, // Golden glow
                emissiveIntensity: 0.6
            });
            
            // Colored chest lid material based on difficulty
            const chestLidMat = new THREE.MeshStandardMaterial({ 
                color: chestType.lidColor,
                roughness: 0.3, 
                metalness: 0.7,
                emissive: chestType.emissiveColor,
                emissiveIntensity: 0.5
            });
            
            // Chest main body (classic proportions)
            const chestBodyGeo = new THREE.BoxGeometry(0.5 * chestScale, 0.3 * chestScale, 0.35 * chestScale);
            const chestBody = new THREE.Mesh(chestBodyGeo, chestWoodMat);
            chestBody.position.y = 0.15 * chestScale;
            chestGroup.add(chestBody);
            
            // Curved chest lid with colored material based on difficulty
            const chestLidGeo = new THREE.CylinderGeometry(0.26 * chestScale, 0.26 * chestScale, 0.52 * chestScale, 12, 1, false, 0, Math.PI);
            const chestLid = new THREE.Mesh(chestLidGeo, chestLidMat);
            chestLid.position.set(0, 0.33 * chestScale, 0);
            chestLid.rotation.z = Math.PI / 2;
            chestGroup.add(chestLid);
            
            // Metal corner reinforcements
            const cornerMat = new THREE.MeshStandardMaterial({ 
                color: 0x444444, // Dark metal
                roughness: 0.3, 
                metalness: 0.8,
                emissive: 0x111111,
                emissiveIntensity: 0.2
            });
            
            // Add corner brackets
            for (let i = 0; i < 4; i++) {
                const cornerGeo = new THREE.BoxGeometry(0.04 * chestScale, 0.32 * chestScale, 0.04 * chestScale);
                const corner = new THREE.Mesh(cornerGeo, cornerMat);
                const angle = (i / 4) * Math.PI * 2;
                corner.position.set(
                    Math.cos(angle) * 0.23 * chestScale,
                    0.15 * chestScale,
                    Math.sin(angle) * 0.16 * chestScale
                );
                chestGroup.add(corner);
            }
            
            // Horizontal metal bands around chest
            for (let i = 0; i < 2; i++) {
                const bandGeo = new THREE.BoxGeometry(0.54 * chestScale, 0.04 * chestScale, 0.39 * chestScale);
                const band = new THREE.Mesh(bandGeo, bandMat);
                band.position.y = (0.05 + (i * 0.2)) * chestScale;
                chestGroup.add(band);
            }
            
            // Classic keyhole lock plate
            const lockPlateGeo = new THREE.BoxGeometry(0.08 * chestScale, 0.12 * chestScale, 0.02 * chestScale);
            const lockPlate = new THREE.Mesh(lockPlateGeo, bandMat);
            lockPlate.position.set(0, 0.15 * chestScale, 0.185 * chestScale);
            chestGroup.add(lockPlate);
            
            // Keyhole
            const keyholeGeo = new THREE.CylinderGeometry(0.015 * chestScale, 0.015 * chestScale, 0.03 * chestScale, 8);
            const keyhole = new THREE.Mesh(keyholeGeo, cornerMat);
            keyhole.position.set(0, 0.15 * chestScale, 0.2 * chestScale);
            keyhole.rotation.x = Math.PI / 2;
            chestGroup.add(keyhole);
            
            // Chest hinges on the back
            for (let i = 0; i < 2; i++) {
                const hingeGeo = new THREE.BoxGeometry(0.06 * chestScale, 0.02 * chestScale, 0.08 * chestScale);
                const hinge = new THREE.Mesh(hingeGeo, cornerMat);
                hinge.position.set((-0.15 + i * 0.3) * chestScale, 0.3 * chestScale, -0.18 * chestScale);
                chestGroup.add(hinge);
            }
            
            // Add some magical gems on the lid
            const gemMat = new THREE.MeshStandardMaterial({ 
                color: 0x00FFFF, // Cyan gem
                roughness: 0.1, 
                metalness: 0.2,
                emissive: 0x004444,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9
            });
            
            const gemGeo = new THREE.OctahedronGeometry(0.025 * chestScale);
            for (let i = 0; i < 3; i++) {
                const gem = new THREE.Mesh(gemGeo, gemMat);
                gem.position.set(
                    (-0.1 + i * 0.1) * chestScale,
                    0.42 * chestScale,
                    0
                );
                chestGroup.add(gem);
            }
            
            // Add bright glow effect to chest
            const glowLight = new THREE.PointLight(0xFFFFAA, 2.0, 4);
            glowLight.position.set(0, 0.3 * chestScale, 0);
            chestGroup.add(glowLight);
            
            // Add additional ambient glow around chest
            const ambientGlow = new THREE.PointLight(0xFFD700, 1.2, 6);
            ambientGlow.position.set(0, 0.2 * chestScale, 0);
            chestGroup.add(ambientGlow);
            
            // Position chest on top of cloud with a compact silhouette.
            chestGroup.position.y = 0.24;
            cloudGroup.add(chestGroup);
            cloudGroup.chestGroup = chestGroup; // Store reference for animations
            
            // Keep the drifting treasure chest on a calmer, background lane behind the center chain.
            const cageY = CONFIG.INITIAL_CAGE_BASE_Y || 1.5;
            const baseCloudY = cageY + 1.5 + Math.random() * 0.25;
            const baseCloudZ = -1.1 - Math.random() * 0.4;
            cloudGroup.position.set(-8, baseCloudY, baseCloudZ);
            cloudGroup.userData.speed = 0.3 + Math.random() * 0.12; // Slightly slower drift so players have more time to click
            cloudGroup.userData.baseY = baseCloudY;
            cloudGroup.userData.baseZ = baseCloudZ;
            cloudGroup.userData.bobOffset = Math.random() * Math.PI * 2; // Random bob timing
            cloudGroup.userData.bobAmplitude = 0.05 + Math.random() * 0.02;
            cloudGroup.userData.depthAmplitude = 0.025 + Math.random() * 0.015;
            cloudGroup.userData.floatSpeed = 0.9 + Math.random() * 0.25;
            cloudGroup.userData.clicked = false;
            
            // Make cloud clickable
            cloudGroup.traverse(child => {
                if (child.isMesh) {
                    child.userData.cloudGroup = cloudGroup;
                    debugLog('🌤️ Setting cloudGroup userData for mesh:', child.type, child.name);
                }
            });
            
            debugLog('🌤️ Treasure cloud created with clickable meshes');
            
            return cloudGroup;
        }
        
        function triggerCloudSpawn() {
            if (gameState !== 'PLAYING' || isGamePaused) {
                // If game is paused or not playing, reschedule for later
                if (gameState === 'PLAYING' && isGamePaused) {
                    debugLog('🌤️ Cloud spawn delayed due to game pause');
                    const retryDelay = 5000; // Check again in 5 seconds
                    cloudSpawnTimeoutId = setTimeout(triggerCloudSpawn, retryDelay);
                }
                return;
            }
            
            // Ensure only one cloud exists at a time
            if (treasureClouds.length > 0) {
                debugLog('🌤️ Cloud spawn blocked - cloud already exists on screen');
                // Schedule next attempt with shorter delay since cloud is still present
                const retryDelay = CONFIG.CLOUD_MIN_INTERVAL / 4 + Math.random() * (CONFIG.CLOUD_MIN_INTERVAL / 2);
                cloudSpawnTimeoutId = setTimeout(triggerCloudSpawn, retryDelay);
                return;
            }
            
            debugLog('🌤️ Triggering random cloud spawn...');
            spawnTreasureCloud();
            
            // Schedule next cloud spawn with enhanced randomness
            if (gameState === 'PLAYING' && !isGamePaused) {
                let nextSpawnDelay;
                
                // Add some variability based on game progress and random events
                const baseDelay = CONFIG.CLOUD_MIN_INTERVAL + Math.random() * (CONFIG.CLOUD_MAX_INTERVAL - CONFIG.CLOUD_MIN_INTERVAL);
                
                // 15% chance for a "quiet period" with longer delay
                if (Math.random() < 0.15) {
                    nextSpawnDelay = baseDelay * 1.5 + Math.random() * 10000;
                    debugLog('🌤️ Quiet period - extended delay for next cloud');
                }
                // 10% chance for a "busy sky" with shorter delay
                else if (Math.random() < 0.10) {
                    nextSpawnDelay = Math.max(CONFIG.CLOUD_MIN_INTERVAL * 0.6, baseDelay * 0.7);
                    debugLog('🌤️ Busy sky - shorter delay for next cloud');
                }
                // Normal random delay
                else {
                    nextSpawnDelay = baseDelay;
                }
                
                debugLog(`🌤️ Next cloud scheduled in ${(nextSpawnDelay/1000).toFixed(1)} seconds`);
                cloudSpawnTimeoutId = setTimeout(triggerCloudSpawn, nextSpawnDelay);
            }
        }
        
        function spawnTreasureCloud() {
            if (gameState !== 'PLAYING' || isGamePaused) {
                debugLog('🌤️ Cloud spawn blocked - game not playing or paused');
                return;
            }
            
            // Ensure only one cloud exists at a time
            if (treasureClouds.length > 0) {
                debugLog('🌤️ Cloud spawn blocked - cloud already exists on screen');
                return;
            }
            
            const cloud = createTreasureCloud();
            treasureClouds.push(cloud);
            scene.add(cloud);
            
            // Debug logging
            debugLog('🌤️ Treasure cloud spawned at position:', cloud.position.x, cloud.position.y, cloud.position.z);
            debugLog('🌤️ Total treasure clouds:', treasureClouds.length);
            
            // Animate cloud entrance with dreamy motion
            anime({
                targets: cloud.position,
                x: [cloud.position.x, cloud.position.x + 2],
                duration: 2000,
                easing: 'easeOutSine'
            });
            
            // Add subtle rotation animation
            anime({
                targets: cloud.rotation,
                y: cloud.rotation.y + Math.PI * 2,
                duration: 20000,
                easing: 'linear',
                loop: true
            });
            
            // Treasure chest bobbing animation
            if (cloud.chestGroup) {
                anime({
                    targets: cloud.chestGroup.position,
                    y: [cloud.chestGroup.position.y, cloud.chestGroup.position.y + 0.1, cloud.chestGroup.position.y],
                    duration: 2000,
                    easing: 'easeInOutSine',
                    loop: true
                });
                
                // Subtle chest wobble
                anime({
                    targets: cloud.chestGroup.rotation,
                    z: [0, 0.1, -0.1, 0],
                    duration: 3000,
                    easing: 'easeInOutSine',
                    loop: true
                });
            }
        }
        
        function updateTreasureClouds(deltaTime) {
            if (gameState !== 'PLAYING') return;
            
            // Enforce single cloud rule - if somehow multiple clouds exist, remove extras
            if (treasureClouds.length > 1) {
                debugLog('🌤️ WARNING: Multiple clouds detected, removing extras...');
                // Keep the first cloud, remove the rest
                for (let i = treasureClouds.length - 1; i > 0; i--) {
                    const cloudToRemove = treasureClouds[i];
                    scene.remove(cloudToRemove);
                    treasureClouds.splice(i, 1);
                    
                    // Clean up geometry and materials
                    cloudToRemove.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            if (child.material.isMaterial) {
                                child.material.dispose();
                            } else if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            }
                        }
                    });
                }
            }
            
            // Debug: Log cloud count occasionally
            if (Math.random() < 0.001) { // Very rarely
                debugLog('🌤️ Update: Current treasure clouds:', treasureClouds.length);
            }
            
            // Update cloud positions and remove clouds that have exited
            for (let i = treasureClouds.length - 1; i >= 0; i--) {
                const cloud = treasureClouds[i];
                
                // Move cloud from left to right
                cloud.position.x += cloud.userData.speed * deltaTime;
                
                // Keep the cloud floating around a stable front-of-chain lane instead of drifting through the chain plane.
                const floatTime = (performance.now() * 0.001 * (cloud.userData.floatSpeed || 1)) + cloud.userData.bobOffset;
                const bobAmplitude = cloud.userData.bobAmplitude ?? 0.08;
                const depthAmplitude = cloud.userData.depthAmplitude ?? 0.04;
                const baseY = cloud.userData.baseY ?? cloud.position.y;
                const baseZ = cloud.userData.baseZ ?? cloud.position.z;
                cloud.position.y = baseY + (Math.sin(floatTime) * bobAmplitude);
                cloud.position.z = baseZ + (Math.cos(floatTime * 0.7) * depthAmplitude);
                
                // Remove cloud if it has exited the screen
                if (cloud.position.x > 8) {
                    scene.remove(cloud);
                    treasureClouds.splice(i, 1);
                    
                    // Clean up geometry and materials
                    cloud.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            if (child.material.isMaterial) {
                                child.material.dispose();
                            } else if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            }
                        }
                    });
                    
                    // Ensure cloud spawning continues
                    ensureCloudSpawning();
                }
            }
            
            // Cloud spawning is now handled by the timeout-based triggerCloudSpawn system
            // No timer-based spawning logic needed here anymore
        }
        
        function handleCloudClick(cloudGroup) {
            debugLog('🎯 Cloud clicked!', cloudGroup);
            debugLog('🎯 Game state:', gameState);
            debugLog('🎯 Already clicked:', cloudGroup.userData.clicked);
            
            if (cloudGroup.userData.clicked || gameState !== 'PLAYING') {
                debugLog('🎯 Click ignored - already clicked or game not playing');
                return;
            }
            
            cloudGroup.userData.clicked = true;
            
            // Play chest opening sound when clicked
            debugLog('🔊 Playing chest opening sound...');
            playSound('chestOpening');
            
            // Get the chest type for difficulty determination
            const chestType = cloudGroup.userData.chestType;
            debugLog('🎯 Chest type:', chestType);
            debugLog('🎯 Chest type details:', JSON.stringify(chestType));
            
            // Validate chest type
            if (!chestType || !chestType.difficultyRange || !Array.isArray(chestType.difficultyRange) || chestType.difficultyRange.length !== 2) {
                console.error('🎯 ERROR: Invalid chest type!', chestType);
                resumeGame();
                return;
            }
            
            // Generate a math problem based on chest color difficulty
            const difficultyLevel = chestType.difficultyRange[0] + Math.floor(Math.random() * (chestType.difficultyRange[1] - chestType.difficultyRange[0] + 1));
            debugLog('🎯 Generated difficulty level:', difficultyLevel, 'from range:', chestType.difficultyRange);
            
            // Validate difficulty level
            if (difficultyLevel < 1 || difficultyLevel > 8) {
                console.error('🎯 ERROR: Invalid difficulty level generated!', difficultyLevel);
                resumeGame();
                return;
            }
            
            // Show math challenge popup
            debugLog('🎯 About to call showTreasureChestMathChallenge...');
            try {
                showTreasureChestMathChallenge(cloudGroup, chestType, difficultyLevel);
                debugLog('🎯 showTreasureChestMathChallenge completed successfully');
            } catch (error) {
                console.error('🎯 ERROR in showTreasureChestMathChallenge:', error);
                resumeGame();
            }
        }
        
        function generateTreasureChestMultipleChoice(problemData) {
            // Generate wrong answers using the same logic as the main math system
            const rawCorrect = problemData.answer;
            const correct = formatNumberForDisplay(rawCorrect);
            
            let wrongs = []; 
            let correctNum = parseFloat(rawCorrect); 
            let isNumeric = !isNaN(correctNum); 
            let used = new Set([correct]); 
            let tryCount = 0; 
            
            while (wrongs.length < 3 && tryCount < 50) { 
                let wrong; 
                
                if (isNumeric) { 
                    // For negative numbers, use special handling
                    if (correctNum < 0) {
                        let wrongOptions = [
                            -correctNum,                // Mistake: wrong sign
                            correctNum - 1,            // Off by 1 on negative side
                            correctNum + 1,            // Off by 1 on positive side
                            correctNum * 2,            // Doubled wrong (common error)
                            Math.abs(correctNum)       // Forgot to maintain the sign
                        ];
                        
                        const randomIndex = Math.floor(Math.random() * wrongOptions.length);
                        let wrongValue = wrongOptions[randomIndex];
                        
                        if (formatNumberForDisplay(wrongValue) === correct) {
                            wrongValue = correctNum - 2;
                        }
                        
                        wrong = formatNumberForDisplay(wrongValue);
                    } else {
                        // For positive numbers
                        let delta = Math.max(1, Math.round(Math.abs(correctNum) * 0.15) || 1); 
                        let sign = Math.random() < 0.5 ? -1 : 1; 
                        let offset = delta * (Math.floor(Math.random()*3)+1) * sign; 
                        
                        wrong = formatNumberForDisplay(correctNum + offset);
                        
                        if (wrong === correct) {
                            wrong = formatNumberForDisplay(correctNum + offset + 1);
                        }
                    }
                } else if (rawCorrect.includes('/')) { 
                    // Handle fraction type answers
                    let [num, den] = rawCorrect.split('/').map(Number); 
                    if (Math.random() < 0.5) 
                        num += Math.random() < 0.5 ? 1 : -1; 
                    else 
                        den += Math.random() < 0.5 ? 1 : -1; 
                    
                    if (den === 0) den = 2; 
                    wrong = `${num}/${den}`; 
                } else if (rawCorrect.match(/^\d*\.\d+$/)) { 
                    // Handle explicit decimal format
                    let val = parseFloat(rawCorrect); 
                    wrong = formatNumberForDisplay(val + (Math.random() < 0.5 ? 0.1 : -0.1));
                } else { 
                    // Handle non-numeric answers
                    wrong = rawCorrect + String.fromCharCode(65 + Math.floor(Math.random()*3)); 
                } 
                
                if (!used.has(wrong)) { 
                    wrongs.push(wrong); 
                    used.add(wrong); 
                } 
                tryCount++; 
            } 
            
            // Shuffle the choices
            let choices = [correct, ...wrongs]; 
            for (let i = choices.length - 1; i > 0; i--) { 
                const j = Math.floor(Math.random() * (i + 1)); 
                [choices[i], choices[j]] = [choices[j], choices[i]]; 
            } 
            
            return { choices, correctAnswer: correct };
        }
        
        function showTreasureChestMathChallenge(cloudGroup, chestType, difficultyLevel) {
            debugLog('🎯 Starting treasure chest math challenge...');
            debugLog('🎯 Chest type:', chestType);
            debugLog('🎯 Difficulty level:', difficultyLevel);
            
            // Pause the game
            pauseGame();
            debugLog('🎯 Game paused');
            
            // Generate math problem using existing system
            const originalLevel = currentChallengeLevel;
            debugLog('🎯 Original challenge level:', originalLevel);
            currentChallengeLevel = difficultyLevel;
            debugLog('🎯 Set challenge level to:', difficultyLevel);
            
            debugLog('🎯 Generating problem for level', difficultyLevel);
            let problemData = generateProblemForCurrentLevel(0);
            debugLog('🎯 Problem data generated:', problemData);
            
            // Special safeguard for red chests - ensure valid problem generation
            if (chestType.color === 'red' && (!problemData || !problemData.problemString || problemData.answer === null)) {
                debugLog('🔴 Red chest problem generation failed, using fallback...');
                let retryCount = 0;
                while ((!problemData || !problemData.problemString || problemData.answer === null) && retryCount < 5) {
                    retryCount++;
                    debugLog(`🔴 Red chest retry ${retryCount}/5...`);
                    problemData = generateProblemForCurrentLevel(0);
                }
                
                // If still no valid problem, use a guaranteed fallback
                if (!problemData || !problemData.problemString || problemData.answer === null) {
                    debugLog('🔴 Using emergency fallback problem for red chest');
                    problemData = {
                        problemString: "12 × 8 = ?",
                        answer: "96",
                        type: "MULTIPLICATION_DOUBLE_DIGIT",
                        requiresTextInput: false
                    };
                }
            }
            
            currentChallengeLevel = originalLevel; // Restore original level
            debugLog('🎯 Restored original challenge level:', originalLevel);
            
            // Check if problem data is valid
            if (!problemData || !problemData.problemString || problemData.answer === null || problemData.answer === undefined) {
                console.error('🎯 ERROR: Invalid problem data generated!', problemData);
                resumeGame();
                return;
            }
            
            // Generate multiple choice options
            debugLog('🎯 Generating multiple choice options...');
            const { choices, correctAnswer } = generateTreasureChestMultipleChoice(problemData);
            debugLog('🎯 Multiple choice generated. Choices:', choices, 'Correct:', correctAnswer);
            
            // Timer variables - use CONFIG timeout and add safeguards for red chests
            let timeRemaining = Math.floor(CONFIG.MATH_PROBLEM_TIMEOUT_MS / 1000); // Use config timeout (30 seconds)
            
            // For red chests (difficulty 7-8), give extra time due to complexity
            if (chestType.color === 'red') {
                timeRemaining = 45; // 45 seconds for red chests
                debugLog('🔴 Red chest detected - extending timeout to 45 seconds for complex math');
            }
            
            let treasureTimerInterval = null; // Use unique variable name to avoid conflicts
            let challengeCompleted = false;
            
            // Create popup overlay
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #2c1810 0%, #5d3a1a 100%);
                border: 3px solid ${chestType.color === 'green' ? '#4CAF50' : chestType.color === 'yellow' ? '#FFE51B' : chestType.color === 'orange' ? '#FF9800' : '#F44336'};
                border-radius: 15px;
                padding: 25px;
                z-index: 1001;
                text-align: center;
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1);
                opacity: 0;
                font-family: Arial, sans-serif;
                min-width: 400px;
                max-width: 90vw;
            `;
            
            // Create content
            const title = document.createElement('h2');
            title.innerHTML = `🧮 ${chestType.color.charAt(0).toUpperCase() + chestType.color.slice(1)} Chest Challenge! 🧮`;
            title.style.cssText = `
                color: ${chestType.color === 'green' ? '#4CAF50' : chestType.color === 'yellow' ? '#FFE51B' : chestType.color === 'orange' ? '#FF9800' : '#F44336'};
                margin: 0 0 15px 0;
                fontSize: 1.5em;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            `;
            
            const instructions = document.createElement('p');
            instructions.innerHTML = 'Solve this math problem to open the treasure chest:';
            instructions.style.cssText = `
                color: #fff;
                margin: 10px 0;
                font-size: 1.1em;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            `;
            
            const problemDisplay = document.createElement('div');
            problemDisplay.innerHTML = problemData.problemString;
            problemDisplay.style.cssText = `
                color: #fff;
                font-size: 1.8em;
                font-weight: bold;
                margin: 20px 0;
                padding: 15px;
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            `;
            
            // Create timer display
            const timerDisplay = document.createElement('div');
            timerDisplay.style.cssText = `
                color: #FFE51B;
                font-size: 1.4em;
                font-weight: bold;
                margin: 15px 0;
                padding: 10px;
                background: rgba(0,0,0,0.4);
                border-radius: 8px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                border: 2px solid #FFE51B;
            `;
            
            // Function to update timer display
            const updateTimerDisplay = () => {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                timerDisplay.innerHTML = `⏰ Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Change color as time runs out
                if (timeRemaining <= 10) {
                    timerDisplay.style.color = '#FF4444';
                    timerDisplay.style.borderColor = '#FF4444';
                    timerDisplay.style.animation = 'pulse 1s infinite';
                } else if (timeRemaining <= 30) {
                    timerDisplay.style.color = '#FF9800';
                    timerDisplay.style.borderColor = '#FF9800';
                }
            };
            
            // Initialize timer display
            updateTimerDisplay();
            
            // Start countdown timer with safeguards
            treasureTimerInterval = setInterval(() => {
                if (challengeCompleted) {
                    clearInterval(treasureTimerInterval);
                    return;
                }
                
                timeRemaining--;
                updateTimerDisplay();
                
                if (timeRemaining <= 0) {
                    clearInterval(treasureTimerInterval);
                    debugLog('🔴 Treasure chest timeout triggered for', chestType.color, 'chest');
                    handleTimeout();
                }
            }, 1000);
            
            // Add emergency timeout as failsafe (double the normal timeout)
            const emergencyTimeout = setTimeout(() => {
                if (!challengeCompleted) {
                    debugLog('🚨 EMERGENCY: Force-closing stuck treasure chest popup!');
                    challengeCompleted = true;
                    if (treasureTimerInterval) clearInterval(treasureTimerInterval);
                    if (popup && popup.parentNode) popup.remove();
                    resumeGame();
                    evaporateCloudAnimation(cloudGroup);
                }
            }, (timeRemaining + 15) * 1000); // 15 seconds after normal timeout
            
            // Handle timeout with enhanced safeguards
            const handleTimeout = () => {
                if (challengeCompleted) return;
                challengeCompleted = true;
                
                // Clear timer interval
                if (treasureTimerInterval) {
                    clearInterval(treasureTimerInterval);
                    treasureTimerInterval = null;
                }
                
                // Play error sound for timeout
                debugLog('🔊 Playing treasure error sound for timeout...');
                playSound('treasureError');
                
                // Disable all buttons
                const allBtns = mcGrid.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);
                
                // Show timeout message
                timerDisplay.innerHTML = '⏰ Time\'s Up! 💨';
                timerDisplay.style.color = '#FF4444';
                timerDisplay.style.animation = 'pulse 0.5s infinite';
                
                setTimeout(() => {
                    try {
                        if (popup && popup.parentNode) {
                            popup.remove();
                        }
                        resumeGame();
                        evaporateCloudAnimation(cloudGroup);
                        // Ensure cloud spawning continues
                        ensureCloudSpawning();
                    } catch (error) {
                        console.error('🚨 Error in timeout cleanup:', error);
                        // Force resume game even if there's an error
                        resumeGame();
                        ensureCloudSpawning();
                    }
                }, 2000);
            };
            
            // Create multiple choice grid
            const mcGrid = document.createElement('div');
            mcGrid.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 20px 0;
                max-width: 350px;
                margin-left: auto;
                margin-right: auto;
            `;
            
            // Handle answer selection with enhanced safeguards
            const handleAnswer = (selectedChoice, btn) => {
                if (challengeCompleted) return;
                challengeCompleted = true;
                
                // Clear timer interval and emergency timeout
                if (treasureTimerInterval) {
                    clearInterval(treasureTimerInterval);
                    treasureTimerInterval = null;
                }
                if (emergencyTimeout) {
                    clearTimeout(emergencyTimeout);
                }
                
                // Disable all buttons to prevent multiple clicks
                const allBtns = mcGrid.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);
                
                if (selectedChoice === correctAnswer) {
                    // Correct answer - show success and give reward
                    debugLog('🔊 Playing treasure correct answer sound...');
                    playSound('treasureCorrect');
                    
                    btn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                    btn.style.transform = 'scale(1.05)';
                    timerDisplay.innerHTML = '✅ Correct! Well done!';
                    timerDisplay.style.color = '#4CAF50';
                    timerDisplay.style.borderColor = '#4CAF50';
                    timerDisplay.style.animation = '';
                    
                    setTimeout(() => {
                        try {
                            if (popup && popup.parentNode) {
                                popup.remove();
                            }
                            resumeGame();
                            debugLog('🎯 Showing correct answer feedback...');
                            showCorrectAnswerFeedback(chestType);
                            const rewardType = selectRandomReward(chestType);
                            debugLog('🎯 Selected reward:', rewardType);
                            debugLog('🎯 Playing treasure chest animation...');
                            playTreasureChestAnimation(cloudGroup, rewardType, chestType);
                        } catch (error) {
                            console.error('🚨 Error in correct answer cleanup:', error);
                            // Force resume game even if there's an error
                            resumeGame();
                            ensureCloudSpawning();
                        }
                    }, 1500);
            } else {
                    // Wrong answer - show failure and remove chest
                    debugLog('🔊 Playing treasure error sound...');
                    playSound('treasureError');
                    
                    btn.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
                    btn.style.transform = 'scale(0.95)';
                    timerDisplay.innerHTML = '❌ Wrong Answer!';
                    timerDisplay.style.color = '#f44336';
                    timerDisplay.style.borderColor = '#f44336';
                    timerDisplay.style.animation = '';
                    
                    // Highlight correct answer
                    allBtns.forEach(b => {
                        if (b.textContent.includes(correctAnswer)) {
                            b.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                            b.style.transform = 'scale(1.05)';
                        }
                    });
                    
                    setTimeout(() => {
                        try {
                            if (popup && popup.parentNode) {
                                popup.remove();
                            }
                            resumeGame();
                            showWrongAnswerFeedback();
                            removeCloudWithoutReward(cloudGroup);
                            // Ensure cloud spawning continues
                            ensureCloudSpawning();
                        } catch (error) {
                            console.error('🚨 Error in wrong answer cleanup:', error);
                            // Force resume game even if there's an error
                            resumeGame();
                            ensureCloudSpawning();
                        }
                    }, 2000);
                }
            };
            
            // Create choice buttons
            const labels = ['A', 'B', 'C', 'D']; 
            choices.forEach((choice, idx) => { 
                const btn = document.createElement('button'); 
                btn.className = 'treasure-mc-choice-btn'; 
                btn.innerHTML = `<span style="color: #FFE51B; font-weight: bold;">${labels[idx]}.</span> <span style="color: #fff;">${choice}</span>`; 
                btn.style.cssText = `
                    background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
                    color: white;
                    border: 2px solid #555;
                    border-radius: 8px;
                    padding: 12px 15px;
                    font-size: 1.1em;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    text-align: left;
                `;
                
                // Add hover effects
                btn.onmouseover = () => {
                    if (!btn.disabled) {
                        btn.style.transform = 'translateY(-2px)';
                        btn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
                        btn.style.borderColor = '#777';
                    }
                };
                btn.onmouseout = () => {
                    if (!btn.disabled) {
                        btn.style.transform = 'translateY(0)';
                        btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                        btn.style.borderColor = '#555';
                    }
                };
                
                btn.onclick = () => handleAnswer(choice, btn); 
                mcGrid.appendChild(btn); 
            });
            
            // Assemble popup
            popup.appendChild(title);
            popup.appendChild(instructions);
            popup.appendChild(problemDisplay);
            popup.appendChild(timerDisplay);
            popup.appendChild(mcGrid);
            
            document.body.appendChild(popup);
            
            // Animate popup entrance
            anime({
                targets: popup,
                opacity: [0, 1],
                scale: [0.5, 1],
                duration: 600,
                easing: 'easeOutBack'
            });
        }
        
        function selectRandomReward(chestType) {
            // Define reward pools for each chest color
            const rewardPools = {
                green: [
                    { type: 'lockpick', subtype: 'wooden', amount: 1 },
                    { type: 'lockpick', subtype: 'steel', amount: 1 },
                    { type: 'energy', amount: Math.floor(Math.random() * 11) + 10 } // 10-20
                ],
                yellow: [
                    { type: 'lockpick', subtype: 'wooden', amount: 2 },
                    { type: 'lockpick', subtype: 'steel', amount: 1 },
                    { type: 'energy', amount: Math.floor(Math.random() * 11) + 15 } // 15-25
                ],
                orange: [
                    { type: 'lockpick', subtype: 'steel', amount: 2 },
                    { type: 'lockpick', subtype: 'golden', amount: 1 },
                    { type: 'energy', amount: Math.floor(Math.random() * 11) + 20 } // 20-30
                ],
                red: [
                    { type: 'bundle', description: 'Triple Key Bundle (Wooden ×1, Steel ×1, Golden ×1)' },
                    { type: 'lockpick', subtype: 'golden', amount: 2 },
                    { type: 'energy', amount: Math.floor(Math.random() * 11) + 30 }, // 30-40
                    { type: 'pet_rescue', subtype: 'common' },
                    { type: 'pet_rescue', subtype: 'rare' },
                    { type: 'pet_rescue', subtype: 'legendary' }
                ]
            };
            
            const pool = rewardPools[chestType.color];
            return pool[Math.floor(Math.random() * pool.length)];
        }
        
        function showCorrectAnswerFeedback(chestType) {
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                font-size: 1.2em;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
                text-align: center;
            `;
            feedback.innerHTML = '🎉 Correct! Opening chest... 🎉';
            document.body.appendChild(feedback);
            
            setTimeout(() => {
                feedback.remove();
            }, 2000);
        }
        
        function showWrongAnswerFeedback() {
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                font-size: 1.2em;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
                text-align: center;
            `;
            feedback.innerHTML = '❌ Wrong answer! The chest vanishes... ❌';
            document.body.appendChild(feedback);
            
            setTimeout(() => {
                feedback.remove();
            }, 2000);
        }
        
        function removeCloudWithoutReward(cloudGroup) {
            // Animate cloud disappearing
            anime({
                targets: cloudGroup.position,
                y: cloudGroup.position.y - 2,
                duration: 1000,
                easing: 'easeInQuad'
            });
            
            anime({
                targets: cloudGroup.scale,
                x: 0,
                y: 0,
                z: 0,
                duration: 1000,
                easing: 'easeInBack',
                complete: () => {
                    const index = treasureClouds.indexOf(cloudGroup);
                    if (index > -1) {
                        scene.remove(cloudGroup);
                        treasureClouds.splice(index, 1);
                        
                        // Clean up geometry and materials
                        cloudGroup.traverse(child => {
                            if (child.isMesh) {
                                child.geometry.dispose();
                                if (child.material.isMaterial) {
                                    child.material.dispose();
                                } else if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                }
                            }
                        });
                        
                        // Ensure cloud spawning continues
                        ensureCloudSpawning();
                    }
                }
            });
        }

        function playTreasureChestAnimation(cloudGroup, rewardData, chestType) {
            if (!cloudGroup.chestGroup) return;
            
            // Stop existing animations on the chest
            anime.remove(cloudGroup.chestGroup.position);
            anime.remove(cloudGroup.chestGroup.rotation);
            
            // Chest opening animation - find the curved lid (cylinder geometry)
            const chestLid = cloudGroup.chestGroup.children.find(child => 
                child.geometry instanceof THREE.CylinderGeometry && child.position.y > 0.3
            );
            
            if (chestLid) {
                // Animate curved lid opening (rotating around X axis)
                anime({
                    targets: chestLid.rotation,
                    x: -Math.PI / 2.5, // Open the curved lid
                    duration: 800,
                    easing: 'easeOutBounce'
                });
                
                // Move lid slightly backward
                anime({
                    targets: chestLid.position,
                    z: -0.15,
                    y: chestLid.position.y + 0.1,
                    duration: 800,
                    easing: 'easeOutQuad'
                });
            }
            
            // Create magical sparkle effect
            createTreasureSparkles(cloudGroup);
            
            // Show reward popup after a short delay
            setTimeout(() => {
                debugLog('🎯 Calling showTreasureRewardPopup with:', rewardData, chestType);
                showTreasureRewardPopup(rewardData, chestType);
                playSound('lockPickSuccess'); // Reuse existing success sound
                
                // Remove cloud after showing reward
                setTimeout(() => {
                    const index = treasureClouds.indexOf(cloudGroup);
                    if (index > -1) {
                        scene.remove(cloudGroup);
                        treasureClouds.splice(index, 1);
                        
                        // Clean up geometry and materials
                        cloudGroup.traverse(child => {
                            if (child.isMesh) {
                                child.geometry.dispose();
                                if (child.material.isMaterial) {
                                    child.material.dispose();
                                } else if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                }
                            }
                        });
                        
                        // Ensure cloud spawning continues
                        ensureCloudSpawning();
                    }
                }, 3000);
            }, 600);
        }
        
        function createTreasureSparkles(cloudGroup) {
            const sparkleGroup = new THREE.Group();
            const sparkleCount = 15;
            
            for (let i = 0; i < sparkleCount; i++) {
                const sparkleGeo = new THREE.SphereGeometry(0.02, 6, 6);
                const sparkleMat = new THREE.MeshBasicMaterial({ 
                    color: 0xffd700,
                    transparent: true,
                    opacity: 0.8
                });
                const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
                
                // Position sparkles around chest
                sparkle.position.set(
                    (Math.random() - 0.5) * 1.5,
                    0.3 + Math.random() * 0.5,
                    (Math.random() - 0.5) * 1.5
                );
                
                sparkleGroup.add(sparkle);
                
                // Animate sparkles flying outward and upward
                anime({
                    targets: sparkle.position,
                    x: sparkle.position.x * 3,
                    y: sparkle.position.y + 2,
                    z: sparkle.position.z * 3,
                    duration: 1500,
                    easing: 'easeOutQuad'
                });
                
                // Fade out sparkles
                anime({
                    targets: sparkleMat,
                    opacity: [0.8, 0],
                    duration: 1500,
                    easing: 'easeOutQuad',
                    complete: () => {
                        sparkleGeo.dispose();
                        sparkleMat.dispose();
                    }
                });
            }
            
            cloudGroup.add(sparkleGroup);
            
            // Remove sparkle group after animation
            setTimeout(() => {
                cloudGroup.remove(sparkleGroup);
            }, 2000);
        }
        
        function showTreasureRewardPopup(rewardData, chestType) {
            debugLog('🎯 showTreasureRewardPopup called with:', rewardData, chestType);
            
            // Create popup overlay
            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.background = 'linear-gradient(135deg, #2c1810 0%, #5d3a1a 100%)';
            popup.style.border = `3px solid ${chestType.color === 'green' ? '#4CAF50' : chestType.color === 'yellow' ? '#FFE51B' : chestType.color === 'orange' ? '#FF9800' : '#F44336'}`;
            popup.style.borderRadius = '15px';
            popup.style.padding = '25px';
            popup.style.zIndex = '1000';
            popup.style.textAlign = 'center';
            popup.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)';
            popup.style.opacity = '0';
            popup.style.fontFamily = 'Arial, sans-serif';
            
            // Create content
            const title = document.createElement('h2');
            title.textContent = `🎁 ${chestType.color.charAt(0).toUpperCase() + chestType.color.slice(1)} Chest Treasure! 🎁`;
            title.style.color = chestType.color === 'green' ? '#4CAF50' : chestType.color === 'yellow' ? '#FFE51B' : chestType.color === 'orange' ? '#FF9800' : '#F44336';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '1.5em';
            title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
            
            const rewardImg = document.createElement('img');
            rewardImg.style.width = '80px';
            rewardImg.style.height = '80px';
            rewardImg.style.margin = '10px 0';
            rewardImg.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
            
            const rewardText = document.createElement('p');
            rewardText.style.color = '#fff';
            rewardText.style.margin = '10px 0';
            rewardText.style.fontSize = '1.2em';
            rewardText.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            
            // Set content based on reward data
            if (rewardData.type === 'lockpick') {
                switch (rewardData.subtype) {
                case 'wooden':
                rewardImg.src = 'assets/images/woodenlockpick.png';
                        rewardText.innerHTML = `You found <strong style="color: #8B4513;">Wooden Pick Key ×${rewardData.amount}</strong>!<br>Added to your key inventory.`;
                    break;
                case 'steel':
                rewardImg.src = 'assets/images/silverlockpick.png';
                        rewardText.innerHTML = `You found <strong style="color: #C0C0C0;">Steel Pick Key ×${rewardData.amount}</strong>!<br>Added to your key inventory.`;
                    break;
                case 'golden':
                rewardImg.src = 'assets/images/goldlockpick.png';
                        rewardText.innerHTML = `You found <strong style="color: #FFD700;">Golden Pick Key ×${rewardData.amount}</strong>!<br>Added to your key inventory.`;
                    break;
                }
            } else if (rewardData.type === 'bundle') {
                rewardImg.src = 'assets/images/goldlockpick.png'; // Use golden key as bundle icon
                rewardText.innerHTML = `You found a <strong style="color: #FFD700;">Triple Key Bundle</strong>!<br>Wooden ×1, Steel ×1, Golden ×1 added to inventory.`;
            } else if (rewardData.type === 'energy') {
                const svgContent = `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="40" cy="40" r="35" fill="#FFD700" stroke="#FFA000" stroke-width="3"/>
                        <text x="40" y="50" font-family="Arial" font-size="30" font-weight="bold" text-anchor="middle" fill="#FFF">E</text>
                    </svg>`;
                rewardImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
                rewardText.innerHTML = `You found <strong style="color: #FFD700;">Energy Points ×${rewardData.amount}</strong>!<br>Added to your energy.`;
            } else if (rewardData.type === 'pet_rescue') {
                const svgContent = `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="40" cy="40" r="35" fill="${rewardData.subtype === 'common' ? '#4CAF50' : rewardData.subtype === 'rare' ? '#2196F3' : '#9C27B0'}" stroke="#333" stroke-width="3"/>
                        <text x="40" y="50" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#FFF">P</text>
                    </svg>`;
                rewardImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
                rewardText.innerHTML = `Amazing! A <strong style="color: ${rewardData.subtype === 'common' ? '#4CAF50' : rewardData.subtype === 'rare' ? '#2196F3' : '#9C27B0'};">${rewardData.subtype.charAt(0).toUpperCase() + rewardData.subtype.slice(1)} Pet</strong> was rescued!<br>+1 to total score & +1 minute to timer!`;
            }
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Awesome! ✨';
            closeBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '8px';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.fontSize = '1.1em';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.marginTop = '15px';
            closeBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            closeBtn.style.transition = 'all 0.3s ease';
            
            closeBtn.onmouseover = () => {
                closeBtn.style.transform = 'translateY(-2px)';
                closeBtn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.transform = 'translateY(0)';
                closeBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            };
            
            closeBtn.onclick = () => {
                anime({
                    targets: popup,
                    opacity: [1, 0],
                    scale: [1, 0.8],
                    duration: 300,
                    easing: 'easeInBack',
                    complete: () => {
                        document.body.removeChild(popup);
                    }
                });
            };
            
            // Assemble popup
            popup.appendChild(title);
            popup.appendChild(rewardImg);
            popup.appendChild(rewardText);
            popup.appendChild(closeBtn);
            
            document.body.appendChild(popup);
            
            // Apply the reward effect
            applyTreasureReward(rewardData);
            
            // Animate popup entrance
            anime({
                targets: popup,
                opacity: [0, 1],
                scale: [0.5, 1],
                duration: 600,
                easing: 'easeOutBack'
            });
        }
        
        // Key inventory management functions
        function updateKeyQuantityDisplay(keyType) {
            const quantityDisplays = {
                wooden: document.getElementById('wooden-key-quantity'),
                steel: document.getElementById('steel-key-quantity'),
                golden: document.getElementById('golden-key-quantity')
            };
            
            const display = quantityDisplays[keyType];
            if (display) {
                const quantity = keyInventory[keyType];
                display.textContent = quantity;
                
                if (quantity > 0) {
                    display.classList.remove('empty');
                } else {
                    display.classList.add('empty');
                }
            }
            
            // Update button state based on availability
            updateLockPickButtonStates();
        }
        
        function updateAllKeyQuantityDisplays() {
            updateKeyQuantityDisplay('wooden');
            updateKeyQuantityDisplay('steel');
            updateKeyQuantityDisplay('golden');
        }
        
        function addKeyToInventory(keyType, quantity = 1) {
            if (keyInventory.hasOwnProperty(keyType)) {
                keyInventory[keyType] += quantity;
                updateKeyQuantityDisplay(keyType);
                
                // Add visual effect to show key was added
                const quantityDisplay = document.getElementById(`${keyType}-key-quantity`);
                if (quantityDisplay) {
                    quantityDisplay.style.animation = 'button-pulse-glow 1s ease-in-out 2';
                    setTimeout(() => {
                        quantityDisplay.style.animation = '';
                    }, 2000);
                }
                
                debugLog(`Added ${quantity} ${keyType} key(s). Total: ${keyInventory[keyType]}`);
            }
        }
        
        function useKeyFromInventory(keyType) {
            if (keyInventory.hasOwnProperty(keyType) && keyInventory[keyType] > 0) {
                keyInventory[keyType]--;
                updateKeyQuantityDisplay(keyType);
                debugLog(`Used 1 ${keyType} key. Remaining: ${keyInventory[keyType]}`);
                return true;
            }
            return false;
        }
        
        function updateLockPickButtonStates() {
            const buttonMappings = {
                wooden: document.getElementById('wooden-lockpick'),
                steel: document.getElementById('silver-lockpick'),
                golden: document.getElementById('golden-lockpick')
            };
            
            for (const [keyType, button] of Object.entries(buttonMappings)) {
                if (button) {
                    const hasKeys = keyInventory[keyType] > 0;
                    const isOnCooldown = button.classList.contains('on-cooldown');
                    const gameIsPlaying = gameState === 'PLAYING' && !currentPetRescued && !lockPickBoostActive;
                    
                    // Only enable if user has keys, not on cooldown, and game is playing
                    button.disabled = !hasKeys || isOnCooldown || !gameIsPlaying;
                }
            }
        }

        function showTooltipMessage(element, message) {
            // Remove any existing tooltip
            const existingTooltip = document.querySelector('.key-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
            }
            
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'key-tooltip';
            tooltip.textContent = message;
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
            tooltip.style.color = '#ff6b6b';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '0.85em';
            tooltip.style.fontWeight = 'bold';
            tooltip.style.zIndex = '10000';
            tooltip.style.whiteSpace = 'nowrap';
            tooltip.style.border = '1px solid #ff6b6b';
            tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'scale(0.8)';
            tooltip.style.transition = 'opacity 0.3s, transform 0.3s';
            
            // Position tooltip above the button
            const rect = element.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 10) + 'px';
            tooltip.style.transform = 'translateX(-50%) translateY(-100%) scale(0.8)';
            
            document.body.appendChild(tooltip);
            
            // Animate in
                setTimeout(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
            }, 10);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateX(-50%) translateY(-100%) scale(0.8)';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 300);
                }, 3000);
            }

        function applyTreasureReward(rewardData) {
            // Apply rewards based on type
            if (rewardData.type === 'lockpick') {
                addKeyToInventory(rewardData.subtype, rewardData.amount);
            } else if (rewardData.type === 'bundle') {
                // Triple key bundle: Wooden ×1, Steel ×1, Golden ×1
                addKeyToInventory('wooden', 1);
                addKeyToInventory('steel', 1);
                addKeyToInventory('golden', 1);
            } else if (rewardData.type === 'energy') {
                // Add energy points
                playerEnergy = Math.min(100, playerEnergy + rewardData.amount);
                updateHUD();
                debugLog(`Added ${rewardData.amount} energy points. Total energy: ${playerEnergy}`);
            } else if (rewardData.type === 'pet_rescue') {
                // Instant pet rescue with timer bonus - properly track in score system
                const petRarity = rewardData.subtype; // 'common', 'rare', or 'legendary'
                const rarityData = CONFIG.PET_RARITIES[petRarity];
                
                // Update score data using the proper tracking system
                scoreData.rescuedCounts[petRarity]++;
                scoreData.totalPointsByRarity[petRarity] += rarityData.points;
                scoreData.overallScore += rarityData.points;
                
                // Update the score display
                updateScorePanelDOM();

                // Update Level Progression
                incrementPetRescueCount();
                
                // Add 1 minute to timer (60 seconds)
                gameTime += 60;
                
                // If using real-time timer system, adjust the timer accordingly
                if (realTimeTimerStart > 0) {
                    initialGameTime += 60;
                    realTimeTimerStart += 60 * 1000; // Add 60 seconds in milliseconds
                }
                
                debugLog(`${petRarity.charAt(0).toUpperCase() + petRarity.slice(1)} pet rescued from treasure chest! Added ${rarityData.points} points and 1 minute to timer.`);
                
                // Trigger visual effect for rescued pet
                showPetRescueEffect(rewardData.subtype);
            }
        }
        
        function showPetRescueEffect(petType) {
            // Get the correct points for this pet rarity
            const rarityData = CONFIG.PET_RARITIES[petType];
            const points = rarityData ? rarityData.points : 50; // Fallback to 50 if not found
            
            // Create a visual effect to show pet rescue
            const effect = document.createElement('div');
            effect.style.cssText = `
                position: fixed;
                top: 15%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, ${petType === 'common' ? '#4CAF50' : petType === 'rare' ? '#2196F3' : '#9C27B0'} 0%, #fff 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                font-size: 1.3em;
                font-weight: bold;
                z-index: 1002;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                text-align: center;
                animation: bounce 0.6s ease-out;
            `;
            effect.innerHTML = `🐾 ${petType.charAt(0).toUpperCase() + petType.slice(1)} Pet Rescued! 🐾<br><small style="font-size: 0.8em;">+${points} Points +1 Minute</small>`;
            document.body.appendChild(effect);
            
            setTimeout(() => {
                effect.remove();
            }, 3000);
        }
        // ====== END FLOATING TREASURE CLOUD SYSTEM ======
        
        // Setup mouse click handling for treasure clouds (called after renderer is created)
        function setupTreasureCloudClickHandling() {
            if (!renderer || !renderer.domElement) {
                console.warn('⚠️ Cannot setup treasure cloud click handling - renderer not available');
                return;
            }
            
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            
            function onMouseClick(event) {
                debugLog('🖱️ Mouse click event triggered');
                debugLog('🖱️ Game state:', gameState);
                debugLog('🖱️ Camera available:', !!camera);
                debugLog('🖱️ Scene available:', !!scene);
                debugLog('🖱️ Treasure clouds count:', treasureClouds.length);
                
                if (gameState !== 'PLAYING' || !camera || !scene) {
                    debugLog('🖱️ Click ignored - game not playing or missing camera/scene');
                    return;
                }
                
                // Calculate mouse position in normalized device coordinates (-1 to +1)
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                
                debugLog('🖱️ Mouse coordinates:', mouse.x, mouse.y);
                
                // Update the picking ray with the camera and mouse position
                raycaster.setFromCamera(mouse, camera);
                
                // Calculate objects intersecting the picking ray
                const intersects = raycaster.intersectObjects(scene.children, true);
                
                // Check if any intersected object belongs to a treasure cloud
                debugLog('🖱️ Click detected, intersects:', intersects.length);
                
                if (intersects.length === 0) {
                    debugLog('🖱️ No objects intersected by click');
                    return;
                }
                
                for (let i = 0; i < intersects.length; i++) {
                    const intersectedObject = intersects[i].object;
                    debugLog('🖱️ Intersected object:', intersectedObject.type, intersectedObject.name);
                    debugLog('🖱️ Has cloudGroup userData:', !!intersectedObject.userData.cloudGroup);
                    
                    // Check if this object belongs to a treasure cloud
                    if (intersectedObject.userData.cloudGroup) {
                        const cloudGroup = intersectedObject.userData.cloudGroup;
                        debugLog('🖱️ Cloud group name:', cloudGroup.name);
                        debugLog('🖱️ Cloud already clicked:', cloudGroup.userData.clicked);
                        if (cloudGroup.name === 'treasureCloud' && !cloudGroup.userData.clicked) {
                            debugLog('🖱️ Valid treasure cloud click detected!');
                            handleCloudClick(cloudGroup);
                            break;
                        } else {
                            debugLog('🖱️ Cloud click ignored - wrong name or already clicked');
                        }
                    }
                }
                
                debugLog('🖱️ Click processing complete');
            }
            
            // Add mouse click event listener to the renderer's canvas
            renderer.domElement.addEventListener('click', onMouseClick, false);
            debugLog('✅ Treasure cloud click handling setup complete');
        }
        
        function createBackground() { 
            const skyGeo = new THREE.SphereGeometry(150, 32, 15); 
            const skyMat = new THREE.ShaderMaterial({ vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4( position, 1.0 ); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * viewMatrix * worldPosition; }`, fragmentShader: `varying vec3 vWorldPosition; uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; void main() { float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h*1.2, 0.0), exponent), 0.0)), 1.0); }`, uniforms: { topColor: { value: new THREE.Color(0x06081a) }, bottomColor: { value: new THREE.Color(0x888899) }, offset: { value: 20 }, exponent: { value: 0.4 } }, side: THREE.BackSide });
            const skyDome = new THREE.Mesh(skyGeo, skyMat); scene.add(skyDome); scene.background = new THREE.Color(0x010103); 
            const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x070504, roughness: 0.95, metalness: 0.05, emissive: 0x040508, emissiveIntensity: 0.1 });
            const numMountains = 32; let lastAngle = 0;
            for (let i = 0; i < numMountains; i++) { const isValley = Math.random() < 0.22 && i !== 0 && i !== numMountains-1; let groupCount = isValley ? Math.floor(Math.random()*2)+2 : 1; for (let g = 0; g < groupCount; g++) { const baseRadius = isValley ? (Math.random()*6+7) : (Math.random()*4+3); const height = isValley ? (Math.random()*8+6) : (Math.random()*22+18); const segments = Math.floor(Math.random()*3)+3; const mountainGeo = new THREE.ConeGeometry(baseRadius, height, segments); const mountain = new THREE.Mesh(mountainGeo, mountainMaterial); let angle = lastAngle + Math.random()*0.25 + 0.18; lastAngle = angle; let distance = 45 + Math.random()*30 + (isValley ? -8 : 0); let yOffset = isValley ? -Math.random()*8-4 : 0; mountain.position.set( Math.cos(angle) * distance + (isValley ? Math.random()*8-4 : 0), height/2 - 10 + yOffset, Math.sin(angle) * distance + (isValley ? Math.random()*8-4 : 0) ); mountain.rotation.y = Math.random()*Math.PI*2; mountain.rotation.x = (Math.random()-0.5)*0.18; mountain.rotation.z = (Math.random()-0.5)*0.18; mountain.scale.x = Math.random()*0.7+0.7; mountain.scale.z = Math.random()*0.7+0.7; if (isValley) mountain.scale.y = Math.random()*0.5+0.5; scene.add(mountain); } }
            const starVertices = [];
            for (let i = 0; i < 10000; i++) { let x,y,z,d; do { x = THREE.MathUtils.randFloatSpread(300); y = THREE.MathUtils.randFloat(5, 150); z = THREE.MathUtils.randFloatSpread(300); d = Math.sqrt(x*x + y*y + z*z); } while (d < 95 || d > 145); starVertices.push(x,y,z); }
            const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
            const starsMaterial = new THREE.PointsMaterial({ color: 0xbbbbee, size: Math.random() * 0.18 + 0.03, sizeAttenuation: true, transparent: true, opacity: Math.random() * 0.5 + 0.25 });
            stars = new THREE.Points(starsGeometry, starsMaterial); scene.add(stars);
            const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x0f111a, transparent: true, opacity: 0.35, roughness: 0.95, emissive: 0x05060b });
            const numCloudClusters = 12; 
            for (let i = 0; i < numCloudClusters; i++) { const clusterGroup = new THREE.Group(); const numPuffs = Math.floor(Math.random() * 7) + 5; for (let j = 0; j < numPuffs; j++) { const puffRadius = Math.random() * 3.5 + 2.5; const puffGeo = new THREE.SphereGeometry(puffRadius, 7, 5); const puff = new THREE.Mesh(puffGeo, cloudMaterial); puff.position.set( (Math.random() - 0.5) * puffRadius * 2.8, (Math.random() - 0.5) * puffRadius * 0.8, (Math.random() - 0.5) * puffRadius * 2.8 ); puff.scale.set( Math.random() * 0.6 + 0.7, Math.random() * 0.5 + 0.35, Math.random() * 0.6 + 0.7 ); clusterGroup.add(puff); } const angle = Math.random() * Math.PI * 2; const distance = 30 + Math.random() * 25; const height = 15 + Math.random() * 12; clusterGroup.position.set( Math.cos(angle) * distance, height, Math.sin(angle) * distance ); clusterGroup.rotation.y = Math.random() * Math.PI * 2; scene.add(clusterGroup); }
        }

        function createSilhouetteCage(index, rarityKey = 'common') {
            const rarityData = CONFIG.PET_RARITIES[rarityKey]; // Use actual rarity for slight size hint
            const baseScale = rarityData.cageScale;
            const effectiveScale = baseScale * Math.pow(CONFIG.SILHOUETTE_SCALE_STEP, index + 1); // Smaller further back

            const silhouetteMat = new THREE.MeshBasicMaterial({ 
                color: 0x050508, 
                transparent: true, 
                opacity: 0.4 - (index * 0.08), // Fade further back
                side: THREE.FrontSide // Render only front for silhouette effect
            });

            // Simplified cage geometry for silhouettes
            const frameSize = 1.2 * effectiveScale;
            const barHeight = 1.0 * effectiveScale;
            const cageGeo = new THREE.BoxGeometry(frameSize, barHeight + (0.1 * effectiveScale), frameSize); // Approximate overall size
            const silCage = new THREE.Mesh(cageGeo, silhouetteMat);
            
            silCage.position.set(
                0, // X position (directly behind)
                CONFIG.INITIAL_CAGE_BASE_Y + (barHeight + (0.1 * effectiveScale))/2 + 1.2, // Y: Raised higher to avoid appearing in lava
                -(index + 1) * CONFIG.SILHOUETTE_SPACING - (frameSize * 0.5) // Z: Position behind previous, factor in its depth
            );
            silCage.userData.originalY = silCage.position.y; // For bobbing animation
            return silCage;
        }

        function populateSilhouetteQueue() {
            if (silhouetteQueueGroup) {
                silhouetteCages.forEach(sc => {
                    silhouetteQueueGroup.remove(sc);
                    sc.geometry.dispose();
                    sc.material.dispose();
                });
                silhouetteCages = [];
            } else {
                silhouetteQueueGroup = new THREE.Group();
                scene.add(silhouetteQueueGroup);
            }
            
            for (let i = 0; i < CONFIG.NUM_SILHOUETTE_CAGES; i++) {
                // Always use 'common' for silhouette cages
                const silCage = createSilhouetteCage(i, 'common');
                silhouetteCages.push(silCage);
                silhouetteQueueGroup.add(silCage);
            }
        }


        function initThree() {
            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x06081a, 18, 65); 

            camera = new THREE.PerspectiveCamera(75, gameContainer.clientWidth / gameContainer.clientHeight, 0.1, 200); 
            camera.position.set(0, 2.05, 5.1);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.85;
            gameContainer.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false; controls.minDistance = 3; controls.maxDistance = 15;
            controls.maxPolarAngle = Math.PI / 2; controls.target.set(0, 1.15, 0); controls.update();

            ambientLight = new THREE.AmbientLight(0x304055, 0.15); scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0x9ab8f0, 0.18);
            directionalLight.position.set(8, 15, 10); directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50;
            scene.add(directionalLight);
            const centerFill = new THREE.PointLight(0xffeedd, 2.2, 50); centerFill.position.set(0, 3, 0); scene.add(centerFill);
            const spotLight1 = new THREE.SpotLight(0xfff2c0, 2.2); spotLight1.position.set(3.5, 6, 3.5); spotLight1.angle = Math.PI / 5; spotLight1.penumbra = 0.6; spotLight1.decay = 2.0; spotLight1.distance = 28; spotLight1.castShadow = true; spotLight1.target.position.set(0, 1, 0); scene.add(spotLight1); scene.add(spotLight1.target);
            const spotLight2 = new THREE.SpotLight(0xfff2c0, 2.2); spotLight2.position.set(-3.5, 6, 3.5); spotLight2.angle = Math.PI / 5; spotLight2.penumbra = 0.6; spotLight2.decay = 2.0; spotLight2.distance = 28; spotLight2.castShadow = true; spotLight2.target.position.set(0, 1, 0); scene.add(spotLight2); scene.add(spotLight2.target);
            const fillLight = new THREE.PointLight(0x222244, 0.28, 110); fillLight.position.set(0, 10, 0); scene.add(fillLight);
            skyLight = new THREE.DirectionalLight(0xeef6ff, 2.8); skyLight.position.set(0, 30, 0); skyLight.target.position.set(0, 0, 0); skyLight.castShadow = true; skyLight.shadow.mapSize.width = 2048; skyLight.shadow.mapSize.height = 2048; skyLight.shadow.camera.near = 10; skyLight.shadow.camera.far = 60; skyLight.shadow.camera.left = -15; skyLight.shadow.camera.right = 15; skyLight.shadow.camera.top = 15; skyLight.shadow.camera.bottom = -15; scene.add(skyLight); scene.add(skyLight.target);
            const lavaGlowLight = new THREE.PointLight(0xff4500, 1.8, 30); lavaGlowLight.position.set(0, -2, 0); scene.add(lavaGlowLight);

            // Objects are created in resetGameState/startGame/transitionToNextPet
            createLava(); createBackground(); 
            populateSilhouetteQueue(); // Create initial queue
            
            // Setup treasure cloud click handling now that renderer is available
            setupTreasureCloudClickHandling();
        }
        
        // VII. UI MANAGEMENT
        // Separate system time tracker for ensuring consistent real-time display
        let realTimeTimerStart = 0;
        let realTimeElapsed = 0;
        let lastTimerUpdateTime = 0;

        // Variable to store the initial timer setting for this game session
        let initialGameTime = CONFIG.TIMER_DEFAULT;
        
        // Function to update the timer display using real time
        function updateTimerDisplay() {
            // Use performance.now() for high precision timing
            const now = performance.now();
            
            // Only update timer display at most once per frame to avoid unnecessary calculations
            // 16ms is approximately a 60fps frame, which is sufficient for a smooth timer
            if (now - lastTimerUpdateTime < 16) return;
            lastTimerUpdateTime = now;
            
            // Calculate elapsed time from the start of the current game session
            if (realTimeTimerStart === 0 && gameState === 'PLAYING' && !isGamePaused) {
                // Initialize real-time timer with the current game time
                // which should match what the user set in settings
                realTimeTimerStart = now;
                initialGameTime = gameTime;
                realTimeElapsed = gameTime;
                debugLog(`Starting timer with ${initialGameTime} seconds`);
            } else if (realTimeTimerStart > 0 && gameState === 'PLAYING' && !isGamePaused) {
                // Calculate time elapsed in seconds based on actual wall-clock time
                // Divide by exactly 1000 to convert milliseconds to seconds precisely
                const secondsElapsed = (now - realTimeTimerStart) / 1000;
                
                // Calculate remaining time by subtracting elapsed seconds from initial time
                realTimeElapsed = Math.max(0, initialGameTime - secondsElapsed);
                
                // Update the game time variable to match real time
                // This ensures all game logic uses the accurate time value
                gameTime = Math.floor(realTimeElapsed * 10) / 10; // Keep one decimal place for smoother display
                
                // Check for game over condition
                if (gameTime <= 0 && gameState === 'PLAYING') {
                    gameTime = 0;
                    loseGame("Time's up!");
                }
            }
            
            // Always update the timer display, regardless of game state
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Apply visual effects for critical time thresholds
            if (gameTime <= 30) {
                // Critical - 30 seconds or less - red pulsing
                timerDisplay.classList.remove('warning');
                timerDisplay.classList.add('critical');
            } else if (gameTime <= 60) {
                // Warning - 60 seconds or less - yellow pulsing
                timerDisplay.classList.remove('critical');
                timerDisplay.classList.add('warning');
            } else {
                // Normal - remove all warning effects
                timerDisplay.classList.remove('warning', 'critical');
            }
        }
        
        function updateHUD() {
            // Timer display is now updated separately by the updateTimerDisplay function
            // to ensure real-time consistency

            for (const stat in petStats) {
                if (statBars[stat]) {
                    const percentage = Math.max(0, petStats[stat]);
                    statBars[stat].style.width = `${percentage}%`;
                    
                    // Reset all classes first
                    statBars[stat].classList.remove('warning', 'critical', 'normal');
                    
                    // Apply appropriate color and animation classes based on percentage
                    if (percentage < 25) {
                        statBars[stat].style.backgroundColor = '#f44336'; 
                        statBars[stat].classList.add('critical'); // Add intense pulsing red effect
                    } 
                    else if (percentage < 50) {
                        statBars[stat].style.backgroundColor = '#ffeb3b'; 
                        statBars[stat].classList.add('warning'); // Add pulsing yellow effect
                    } 
                    else {
                        statBars[stat].style.backgroundColor = '#4CAF50';
                        statBars[stat].classList.add('normal'); // Add subtle green glow effect 
                    }
                }
            }
            
            const stressPercentage = Math.min(100, (chainStress / CONFIG.MAX_STRESS) * 100);
            stressBar.style.width = `${stressPercentage}%`;
            if (stressPercentage > 75) stressBar.style.backgroundColor = '#f44336';
            else if (stressPercentage > 50) stressBar.style.backgroundColor = '#ffeb3b';
            else stressBar.style.backgroundColor = '#03a9f4'; 

            if (energyDisplayMain) {
                energyDisplayMain.textContent = playerEnergy;
                
                // Update energy glow based on energy level
                energyDisplayMain.classList.remove('energy-high', 'energy-medium', 'energy-low');
                if (playerEnergy >= 10) {
                    energyDisplayMain.classList.add('energy-high');
                } else if (playerEnergy >= 5) {
                    energyDisplayMain.classList.add('energy-medium');
                } else {
                    energyDisplayMain.classList.add('energy-low');
                }
            }

            if (petStatusEnergyValue) {
                petStatusEnergyValue.textContent = playerEnergy;
            }
            
            // Update the new energy display in top-left panel
            const energyValue = document.getElementById('energy-value');
            if (energyValue) energyValue.textContent = playerEnergy;
            if (currentPetRarityText && CONFIG.PET_RARITIES[currentPetRarityKey]) {
                 currentPetRarityText.textContent = `${CONFIG.PET_RARITIES[currentPetRarityKey].symbol} ${currentPetRarityKey.charAt(0).toUpperCase() + currentPetRarityKey.slice(1)}`;
                 currentPetRarityText.style.color = CONFIG.PET_RARITIES[currentPetRarityKey].petAccentColor || '#ccc';
            }


            if (lockProgressBar) {
                 const lockProgressPercent = (lockPickingProgress / CONFIG.MAX_LOCK_PROGRESS) * 100;
                 lockProgressBar.style.width = `${lockProgressPercent}%`;
            }

            const now = Date.now();
            for (const action in actionButtons) {
                const button = actionButtons[action];
                if (!button) continue;
                const remainingCooldown = Math.max(0, (actionCooldowns[action] + CONFIG.ACTION_COOLDOWNS[action] - now) / 1000);
                const timerSpan = button.querySelector('.cooldown-timer');
                const hasEnoughEnergy = playerEnergy >= CONFIG.ACTION_ENERGY_COSTS[action];
                
                // Remove ready class first
                button.classList.remove('ready');
                
                if (remainingCooldown > 0 || !hasEnoughEnergy) {
                    button.disabled = true;
                    if (timerSpan) {
                        if (remainingCooldown > 0) { timerSpan.textContent = remainingCooldown.toFixed(1) + 's'; timerSpan.style.display = 'inline'; } 
                        else { timerSpan.style.display = 'none'; }
                    }
                    if (!hasEnoughEnergy && remainingCooldown <= 0) { button.style.outline = '2px solid orange'; } 
                    else { button.style.outline = 'none'; }
                } else {
                    // Button is ready: off cooldown and has enough energy
                    button.disabled = false;
                    if (timerSpan) timerSpan.style.display = 'none';
                    button.style.outline = 'none';
                    
                    // Add the ready class for the glowing green effect
                    button.classList.add('ready');
                    
                    // Play a sound when a button becomes ready (only once)
                    if (!button.dataset.wasReady) {
                        // Only play the sound if it wasn't ready before and game has started
                        if (gameStarted && gameTime < initialGameTime) {
                        SOUNDS.newPetReveal.play();
                        }
                        button.dataset.wasReady = 'true';
                    }
                }
                
                // Track the button's state for next update
                if (remainingCooldown > 0 || !hasEnoughEnergy) {
                    button.dataset.wasReady = 'false';
                }
            }
        }

        function updateScorePanelDOM() {
            const raritySymbols = { common: '🐾', rare: '🌟', legendary: '🔥' };
            commonScoreDisplay.innerHTML = `${raritySymbols.common} ${scoreData.rescuedCounts.common} (<span style="color:${CONFIG.PET_RARITIES.common.petAccentColor};">${scoreData.totalPointsByRarity.common}</span> pts)`;
            rareScoreDisplay.innerHTML = `${raritySymbols.rare} ${scoreData.rescuedCounts.rare} (<span style="color:${CONFIG.PET_RARITIES.rare.petAccentColor};">${scoreData.totalPointsByRarity.rare}</span> pts)`;
            legendaryScoreDisplay.innerHTML = `${raritySymbols.legendary} ${scoreData.rescuedCounts.legendary} (<span style="color:${CONFIG.PET_RARITIES.legendary.petAccentColor};">${scoreData.totalPointsByRarity.legendary}</span> pts)`;
            
            // Update lost pets display
            const lostPetsElement = document.getElementById('lost-pets-display');
            if (lostPetsElement) {
                lostPetsElement.innerHTML = `Lost: <span style="color: #ff3b30; font-weight: bold;">${scoreData.lostPetsCount} (${scoreData.lostPoints} pts)</span>`;
            }
            
            overallScoreDisplay.textContent = scoreData.overallScore - scoreData.lostPoints;
        }

        // Level Progression System Functions
        function calculateCurrentLevel() {
            // Players start at Level 1, each pet rescued increases level by 1
            return 1 + levelProgressData.totalPetsRescued;
        }

        function updateLevelDisplay() {
            const currentLevel = calculateCurrentLevel();
            const levelBadge = document.getElementById('current-level-badge');
            const petsRescuedCount = document.getElementById('pets-rescued-count');
            
            if (levelBadge) {
                levelBadge.textContent = `Level ${currentLevel}`;
                
                // Add visual effect when level increases
                if (currentLevel > levelProgressData.currentLevel) {
                    levelBadge.style.animation = 'none';
                    setTimeout(() => {
                        levelBadge.style.animation = 'levelGlow 2s ease-in-out infinite alternate';
                    }, 10);
                    
                    // Show level up notification
                    showLevelUpNotification(currentLevel);
                }
                
                levelProgressData.currentLevel = currentLevel;
            }
            
            if (petsRescuedCount) {
                petsRescuedCount.textContent = levelProgressData.totalPetsRescued;
            }
        }

        function showLevelUpNotification(newLevel) {
            // Create a visual effect to show level up
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 15px;
                font-size: 1.4em;
                font-weight: bold;
                z-index: 1003;
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                text-align: center;
                animation: bounce 0.8s ease-out;
                border: 3px solid #66BB6A;
            `;
            notification.innerHTML = `🎉 LEVEL UP! 🎉<br><span style="font-size: 1.2em;">Level ${newLevel}</span><br><small style="font-size: 0.7em;">Keep rescuing pets!</small>`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 4000);
        }

        function incrementPetRescueCount() {
            levelProgressData.totalPetsRescued++;
            updateLevelDisplay();
            debugLog(`🏆 Pet rescued! Total: ${levelProgressData.totalPetsRescued}, Level: ${calculateCurrentLevel()}`);
        }

        function openSettingsPanel() {
            loadSettingsDisplay();
            settingsPanel.classList.add('is-open');
            document.body.classList.add('settings-open');
            settingsButton?.setAttribute('aria-expanded', 'true');
        }

        function closeSettingsPanel() {
            settingsPanel.classList.remove('is-open');
            document.body.classList.remove('settings-open');
            settingsButton?.setAttribute('aria-expanded', 'false');
        }
        function loadSettingsDisplay() {
            // Get saved timer value from localStorage if available, or use default
            const savedTimer = localStorage.getItem('lavaCageGameTimer');
            const savedGameTime = savedTimer ? parseInt(savedTimer) : CONFIG.TIMER_DEFAULT;
            
            // Update hidden seconds value for compatibility
            timerSettingInput.value = savedGameTime;
            
            // Update MM:SS display with the saved time (not the current game time)
            const minutes = Math.floor(savedGameTime / 60);
            const seconds = Math.floor(savedGameTime % 60);
            timerSettingMinutes.value = minutes.toString().padStart(2, '0');
            timerSettingSeconds.value = seconds.toString().padStart(2, '0');
            lockPickDurationSettingInput.value = lockPickDurationSetting;
            difficultySettingSelect.value = currentDifficultySetting;
            
            // Only load Three.js related settings if the scene has been initialized
            if (typeof scene !== 'undefined' && scene) {
            if (ambientLight) document.getElementById('ambient-light-intensity').value = ambientLight.intensity;
            if (ambientLight) document.getElementById('ambient-light-color').value = '#' + ambientLight.color.getHexString();
            const dirLight = scene.children.find(c => c instanceof THREE.DirectionalLight && c !== skyLight);
            if (dirLight) { document.getElementById('directional-light-intensity').value = dirLight.intensity; document.getElementById('directional-light-color').value = '#' + dirLight.color.getHexString(); }
            const spotLights = scene.children.filter(c => c instanceof THREE.SpotLight);
            if (spotLights.length > 0) { document.getElementById('spot-light-intensity').value = spotLights[0].intensity; document.getElementById('spot-light-color').value = '#' + spotLights[0].color.getHexString(); }
            const lavaGlow = scene.children.find(c => c instanceof THREE.PointLight && c.position.y < 0);
            if (lavaGlow) { document.getElementById('lava-glow-intensity').value = lavaGlow.intensity; document.getElementById('lava-glow-color').value = '#' + lavaGlow.color.getHexString(); }
            if (scene.fog) { document.getElementById('fog-near').value = scene.fog.near; document.getElementById('fog-far').value = scene.fog.far; document.getElementById('fog-color').value = '#' + scene.fog.color.getHexString(); }
            if (renderer) document.getElementById('tone-mapping-exposure').value = renderer.toneMappingExposure;
            if (dirLight && dirLight.shadow.mapSize.width === 1024) document.getElementById('shadow-quality').value = 'low';
            else if (dirLight && dirLight.shadow.mapSize.width === 2048) document.getElementById('shadow-quality').value = 'medium';
            else if (dirLight && dirLight.shadow.mapSize.width === 4096) document.getElementById('shadow-quality').value = 'high';
            if(controls) { document.getElementById('camera-min-distance').value = controls.minDistance; document.getElementById('camera-max-distance').value = controls.maxDistance; document.getElementById('camera-damping').value = controls.dampingFactor; }
            }
        }
        function saveGameSettingsOnly() {
            // Calculate total seconds from MM:SS inputs
            const minutes = parseInt(timerSettingMinutes.value) || 0;
            const seconds = parseInt(timerSettingSeconds.value) || 0;
            const newTimer = (minutes * 60) + seconds;
            
            // Update the hidden input for backwards compatibility
            timerSettingInput.value = newTimer;
            
            // Validate and save the timer setting
            if (newTimer >= 60 && newTimer <= 600) { 
                localStorage.setItem('lavaCageGameTimer', newTimer.toString());
                debugLog(`Saved game timer: ${minutes}:${seconds.toString().padStart(2, '0')} (${newTimer}s)`);
            } else {
                // If invalid, reset to a valid value
                const defaultMinutes = Math.floor(CONFIG.TIMER_DEFAULT / 60);
                const defaultSeconds = CONFIG.TIMER_DEFAULT % 60;
                timerSettingMinutes.value = defaultMinutes.toString().padStart(2, '0');
                timerSettingSeconds.value = defaultSeconds.toString().padStart(2, '0');
                timerSettingInput.value = CONFIG.TIMER_DEFAULT;
                localStorage.setItem('lavaCageGameTimer', CONFIG.TIMER_DEFAULT.toString());
                debugLog(`Invalid timer, reset to default: ${defaultMinutes}:${defaultSeconds} (${CONFIG.TIMER_DEFAULT}s)`);
            }
            localStorage.setItem('lavaCageGameDifficulty', difficultySettingSelect.value);
            const newLockPickDuration = parseInt(lockPickDurationSettingInput.value);
            if (newLockPickDuration >= 5 && newLockPickDuration <= 60) { 
                localStorage.setItem('lavaCageLockPickDuration', newLockPickDuration.toString()); 
                // Save upgrades to localStorage
                localStorage.setItem('lavaCageUpgrades', JSON.stringify(playerUpgrades));
            }
            closeSettingsPanel();
            loadCoreGameSettings();
            // --- Apply settings to active game state immediately ---
            gameTime = newTimer;
            lockPickDurationSetting = newLockPickDuration;
            lockPickRate = CONFIG.MAX_LOCK_PROGRESS / lockPickDurationSetting / 10;
            currentDifficultySetting = difficultySettingSelect.value;
            updateHUD();
        }
        function restartToStartOverlay() {
            // Reset game state and show start overlay, requiring user to click Start
            resetGameState();
            gameStarted = false;
            startOverlay.style.opacity = 1;
            startOverlay.style.display = 'flex';
            gameContainer.style.opacity = 0.18;
            // Hide overlays and panels
            document.querySelectorAll('#top-left-panel, #lock-picking-panel, #right-side-panels, #top-center-stats').forEach(el => el.style.opacity = 0);
            closeSettingsPanel();
        }
        function loadCoreGameSettings() {
            // Load the saved timer and update both the gameTime and initialGameTime variables
            const savedTimer = localStorage.getItem('lavaCageGameTimer');
            gameTime = savedTimer ? parseInt(savedTimer) : CONFIG.TIMER_DEFAULT;
            
            // Update initialGameTime to match the saved value for real-time calculations
            initialGameTime = gameTime;
            
            // Also update the timer display immediately so it shows the correct time
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            if (timerDisplay) {
                timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            debugLog(`Loaded saved game timer: ${minutes}:${seconds.toString().padStart(2, '0')} (${gameTime}s)`);
            
            const savedLockPickDuration = localStorage.getItem('lavaCageLockPickDuration');
            lockPickDurationSetting = savedLockPickDuration ? parseInt(savedLockPickDuration) : CONFIG.LOCK_PICK_DURATION_DEFAULT;
            
            // Load saved upgrades
            const savedUpgrades = localStorage.getItem('lavaCageUpgrades');
            if (savedUpgrades) {
                try {
                    playerUpgrades = JSON.parse(savedUpgrades);
                } catch(e) {
                    console.error('Failed to parse saved upgrades:', e);
                    playerUpgrades = createDefaultPlayerUpgrades();
                }
            } else {
                playerUpgrades = createDefaultPlayerUpgrades();
            }
            
            // Ensure totalCooldownReduction exists even in loaded data
            if (typeof playerUpgrades.totalCooldownReduction === 'undefined') {
                playerUpgrades.totalCooldownReduction = 0;
            }
            
            // Update power level display after loading upgrades
            debugLog('🔥 Upgrades loaded, updating power level...');
            debugLog('Loaded playerUpgrades:', playerUpgrades);
            setTimeout(() => {
                updatePowerLevelScore();
                debugLog('✅ Power level updated after loading upgrades');
            }, 100);
            
            // Calculate lock pick rate with upgrade boost (or no boost if playerUpgrades is reset)
            const lockPickBoostMultiplier = playerUpgrades && playerUpgrades.lockPick ? 1 + (playerUpgrades.lockPick * 0.25) : 1; // 25% boost per level
            lockPickRate = (CONFIG.MAX_LOCK_PROGRESS / lockPickDurationSetting / 10) * lockPickBoostMultiplier;
            currentDifficultySetting = localStorage.getItem('lavaCageGameDifficulty') || 'easy';
            timerSettingInput.value = gameTime;
            lockPickDurationSettingInput.value = lockPickDurationSetting;
            difficultySettingSelect.value = currentDifficultySetting;
        }

        // VIII. MATH CHALLENGE SYSTEM (Largely unchanged)
        // ============================================
        // GLOBAL PROBLEM TRACKING SYSTEM
        // ============================================
        
        // Track all generated problems in the current session to prevent duplicates
        const globalProblemTracker = {
            // Store all generated problem signatures
            usedProblemSignatures: new Set(),
            
            // Generate a unique signature for a problem
            generateSignature: function(problemString, num1, num2, num3 = null, problemType = null, level = null) {
                // Create a more specific signature that captures the problem's essence
                // For different problem types, we need to handle them differently
                const normalizedProblem = problemString.trim().toLowerCase()
                    .replace(/\s+/g, ' ')  // Normalize whitespace
                    .replace(/[×\*]/g, '×')  // Standardize multiplication symbols
                    .replace(/[÷\/]/g, '÷');  // Standardize division symbols
                
                // For certain problem types, we need to be more specific
                let signature;
                
                switch(problemType) {
                    case PROBLEM_TYPES.ADDITION_DOUBLE_DIGIT:
                    case PROBLEM_TYPES.SUBTRACTION_DOUBLE_DIGIT:
                        // For basic operations, order matters (a+b is different from b+a)
                        signature = `${problemType}|${Math.min(num1, num2)}|${Math.max(num1, num2)}`;
                        break;
                        
                    case PROBLEM_TYPES.MULTIPLICATION_DOUBLE_DIGIT:
                        // For multiplication, order doesn't matter (a×b is same as b×a)
                        signature = `${problemType}|${num1}|${num2}|${num1 * num2}`;
                        break;
                        
                    case PROBLEM_TYPES.DIVISION_LONG_SINGLE_DIVISOR:
                        // For division, we want to track the specific division problem
                        signature = `${problemType}|${num1}|${num2}|${Math.floor(num1/num2)}`;
                        break;
                        
                    case PROBLEM_TYPES.SQUARE_ROOTS_PERFECT:
                        // For square roots, track the squared number (e.g., √25 = 5)
                        signature = `${problemType}|${num1 * num1}`;
                        break;
                        
                    case PROBLEM_TYPES.EXPONENTS_BASIC:
                        // For exponents, track base and power (e.g., 2^3 = 8)
                        signature = `${problemType}|${num1}|${num2}|${Math.pow(num1, num2)}`;
                        break;
                        

                        
                    default:
                        // Fallback for unknown types
                        signature = [problemType || 'unknown', normalizedProblem, num1, num2, num3].join('|');
                }
                
                return signature;
            },
            
            // Check if a problem has been used before
            isProblemUsed: function(problemString, num1, num2, num3 = null, problemType = null, level = null) {
                const signature = this.generateSignature(problemString, num1, num2, num3, problemType, level);
                const isUsed = this.usedProblemSignatures.has(signature);
                if (isUsed) {
                    debugLog('Duplicate problem detected:', signature);
                }
                return isUsed;
            },
            
            // Mark a problem as used
            markProblemAsUsed: function(problemString, num1, num2, num3 = null, problemType = null, level = null) {
                const signature = this.generateSignature(problemString, num1, num2, num3, problemType, level);
                this.usedProblemSignatures.add(signature);
                debugLog('Problem marked as used:', signature);
            },
            
            // Get the number of unique problems tracked
            getProblemCount: function() {
                return this.usedProblemSignatures.size;
            },
            
            // Clear all tracked problems (for new game)
            clear: function() {
                debugLog(`Clearing problem tracker (had ${this.usedProblemSignatures.size} problems)`);
                this.usedProblemSignatures.clear();
                debugLog('Global problem tracker cleared for new game session');
            }
        };

        // Track recently used numbers to avoid repetition
        const recentlyUsedNumbers = {
            level1: [], level2: [], level3: [], level4: [],
            level5: [], level6: [], level7: [], level8: []
        };
        
        // Track recently used problem types to avoid repetition
        const recentlyUsedProblemTypes = {
            level1: [], level2: [], level3: [], level4: [],
            level5: [], level6: [], level7: [], level8: []
        };
        
        // Maximum number of recent numbers to track per level
        const MAX_RECENT_NUMBERS = 8;
        // Maximum number of recent problem types to track per level
        const MAX_RECENT_PROBLEM_TYPES = 3;
        

        // Helper function to get a random number avoiding recent numbers
function getRandomIntAvoidRecent(min, max, level) {
    // Level key for accessing recentlyUsedNumbers
    const levelKey = `level${level}`;
    const recentNums = recentlyUsedNumbers[levelKey] || [];
    
    // Try a limited number of times to find a non-recent number
    let attempts = 0;
    let num;
    
    do {
        // Generate number with preference for certain ranges based on attempt count
        if (attempts < 3) {
            // Standard random generation
            num = getRandomInt(min, max);
        } else if (attempts < 6) {
            // Target upper half of the range on subsequent attempts
            const mid = Math.floor((max - min) / 2) + min;
            num = getRandomInt(mid, max);
        } else {
            // Target lower half of the range on later attempts
            const mid = Math.floor((max - min) / 2) + min;
            num = getRandomInt(min, mid);
        }
        
        attempts++;
    } while (recentNums.includes(num) && attempts < 10);
    
    // Add to recently used and maintain the list size
    recentlyUsedNumbers[levelKey].unshift(num);
    if (recentlyUsedNumbers[levelKey].length > MAX_RECENT_NUMBERS) {
        recentlyUsedNumbers[levelKey].pop();
    }
    
    return num;
}

// Helper function to get a random problem type avoiding recent ones
function getRandomProblemTypeAvoidRecent(types, level) {
    const levelKey = `level${level}`;
    if (!recentlyUsedProblemTypes[levelKey]) {
        recentlyUsedProblemTypes[levelKey] = [];
    }
    
    // For level 8, we want to ensure better variety across problem types
    if (level >= 8) {
        // Count occurrences of each problem type in recent history
        const typeCounts = {};
        types.forEach(type => typeCounts[type] = 0);
        recentlyUsedProblemTypes[levelKey].forEach(type => {
            if (typeCounts.hasOwnProperty(type)) {
                typeCounts[type]++;
            }
        });
        
        // Find the least used types
        const minCount = Math.min(...Object.values(typeCounts));
        const leastUsedTypes = types.filter(type => typeCounts[type] === minCount);
        
        // Select from the least used types if possible
        if (leastUsedTypes.length > 0) {
            const selectedType = leastUsedTypes[Math.floor(Math.random() * leastUsedTypes.length)];
            
            // Add to recently used
            recentlyUsedProblemTypes[levelKey].push(selectedType);
            
            // Keep only the last few used types (more for higher levels)
            const maxRecent = level >= 8 ? Math.min(types.length - 1, 5) : MAX_RECENT_PROBLEM_TYPES;
            if (recentlyUsedProblemTypes[levelKey].length > maxRecent) {
                recentlyUsedProblemTypes[levelKey].shift();
            }
            
            return selectedType;
        }
    }
    
    // Fallback to standard random selection for other levels or if something went wrong
    const availableTypes = types.filter(type => !recentlyUsedProblemTypes[levelKey].includes(type));
    
    // If all types have been used recently, clear the recent list
    if (availableTypes.length === 0) {
        debugLog('All problem types used recently, resetting...');
        recentlyUsedProblemTypes[levelKey] = [];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    // Select a random type from available ones
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Add to recently used
    recentlyUsedProblemTypes[levelKey].push(selectedType);
    
    // Keep only the last few used types
    const maxRecent = level >= 8 ? Math.min(types.length - 1, 5) : MAX_RECENT_PROBLEM_TYPES;
    if (recentlyUsedProblemTypes[levelKey].length > maxRecent) {
        recentlyUsedProblemTypes[levelKey].shift();
    }
    
    return selectedType;
}

function generateProblemForCurrentLevel(boxIndex) { 
    if (currentChallengeLevel === 0 || !levelProblemConfig[currentChallengeLevel]) { 
        return { problemString: "Select Difficulty", answer: null, type: null, requiresTextInput: false }; 
    } 
    
    const config = levelProblemConfig[currentChallengeLevel]; 
    if (!config || !config.types || !config.ranges) { 
        console.error(`Error: Missing or invalid config for level ${currentChallengeLevel}`, config); 
        return { problemString: "Config Error!", answer: "0", type: null, requiresTextInput: false }; 
    } 
    
    // Initialize tracking arrays if they don't exist
    const levelKey = `level${currentChallengeLevel}`;
    if (!recentlyUsedNumbers[levelKey]) recentlyUsedNumbers[levelKey] = [];
    if (!recentlyUsedProblemTypes[levelKey]) recentlyUsedProblemTypes[levelKey] = [];
    
    // Get a problem type avoiding recent ones
    const problemType = getRandomProblemTypeAvoidRecent(config.types, currentChallengeLevel);
    let num1, num2, num3, num4, answer, problemString = "", requiresTextInput = false;
    const ranges = config.ranges;
    
    // Increase max attempts for higher levels where problem space is larger
    const MAX_ATTEMPTS = currentChallengeLevel >= 8 ? 50 : 20;
    let attempts = 0;
    let problemGenerated = false;
    
    // Debug info
    debugLog(`Generating level ${currentChallengeLevel} problem, type: ${problemType}`);
    
    // Keep generating problems until we get a unique one or hit max attempts
    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        // Reset variables for new attempt
        num1 = num2 = num3 = num4 = answer = undefined;
        problemString = "";
        
        // Generate a new problem
        switch (problemType) { case PROBLEM_TYPES.ADDITION_SINGLE_DIGIT: if (ranges && ranges.singleDigit && ranges.singleDigit.length === 2) { 
                // Use the new function that avoids recent numbers
                num1 = getRandomIntAvoidRecent(ranges.singleDigit[0], ranges.singleDigit[1], currentChallengeLevel); 
                num2 = getRandomIntAvoidRecent(ranges.singleDigit[0], ranges.singleDigit[1], currentChallengeLevel); 
                answer = num1 + num2; 
                problemString = `${num1} + ${num2} = ?`; 
            } else { 
                console.error("Error: Invalid ranges for ADDITION_SINGLE_DIGIT. Level:", currentChallengeLevel, "Ranges:", ranges); 
                num1 = 1; num2 = 1; answer = 2; 
                problemString = "1 + 1 = ?"; 
            } break; case PROBLEM_TYPES.SUBTRACTION_SINGLE_DIGIT: if (ranges && ranges.singleDigit && ranges.singleDigit.length === 2) { 
                // Use enhanced random number generation
                num1 = getRandomIntAvoidRecent(ranges.singleDigit[0], ranges.singleDigit[1], currentChallengeLevel); 
                // Make sure num2 doesn't exceed num1 for subtraction
                num2 = getRandomIntAvoidRecent(ranges.singleDigit[0], num1, currentChallengeLevel); 
                answer = num1 - num2; 
                problemString = `${num1} - ${num2} = ?`; 
            } else { 
                console.error("Error: Invalid ranges for SUBTRACTION_SINGLE_DIGIT. Level:", currentChallengeLevel, "Ranges:", ranges); 
                num1 = 2; num2 = 1; answer = 1; 
                problemString = "2 - 1 = ?"; 
            } break; case PROBLEM_TYPES.MULTIPLICATION_SINGLE_DIGIT: if (ranges && ranges.smallSingle && ranges.smallSingle.length === 2) { 
                // Use enhanced random number generation
                num1 = getRandomIntAvoidRecent(ranges.smallSingle[0], ranges.smallSingle[1], currentChallengeLevel); 
                num2 = getRandomIntAvoidRecent(ranges.smallSingle[0], ranges.smallSingle[1], currentChallengeLevel); 
                answer = num1 * num2; 
                problemString = `${num1} × ${num2} = ?`; 
            } else { 
                console.error("Error: Invalid ranges for MULTIPLICATION_SINGLE_DIGIT. Level:", currentChallengeLevel, "Ranges:", ranges); 
                num1 = 2; num2 = 2; answer = 4; 
                problemString = "2 × 2 = ?"; 
            } break; case PROBLEM_TYPES.DIVISION_SINGLE_DIGIT_NO_REMAINDER: if (ranges && ranges.smallSingle && ranges.smallSingle.length === 2) { 
                // First choose a divisor - avoid 9 since it often gives repeating decimals
                const safeDivisors = [2, 3, 4, 5, 6, 7, 8];
                const validDivisors = safeDivisors.filter(n => 
                    n >= ranges.smallSingle[0] && n <= ranges.smallSingle[1]);
                
                // Use a more varied approach to select divisors
                let divisorIndex;
                const levelKey = `level${currentChallengeLevel}`;
                const recentDivisors = recentlyUsedNumbers[levelKey + '_divisors'] || [];
                
                // Initialize the recent divisors array if it doesn't exist
                if (!recentlyUsedNumbers[levelKey + '_divisors']) {
                    recentlyUsedNumbers[levelKey + '_divisors'] = [];
                }
                
                // Try to avoid recently used divisors
                const availableDivisors = validDivisors.filter(d => !recentDivisors.includes(d));
                
                if (availableDivisors.length > 0) {
                    divisorIndex = Math.floor(Math.random() * availableDivisors.length);
                    num2 = availableDivisors[divisorIndex];
                } else {
                    divisorIndex = Math.floor(Math.random() * validDivisors.length);
                    num2 = validDivisors[divisorIndex];
                }
                
                if (!num2) { 
                    num2 = getRandomIntAvoidRecent(ranges.smallSingle[0] === 1 ? 2 : 2, ranges.smallSingle[1], currentChallengeLevel); 
                }
                
                // Ensure divisor is not 9 to avoid repeating decimals
                if (num2 === 9) { num2 = 8; }
                
                // Track this divisor as recently used
                recentlyUsedNumbers[levelKey + '_divisors'].unshift(num2);
                if (recentlyUsedNumbers[levelKey + '_divisors'].length > 3) {
                    recentlyUsedNumbers[levelKey + '_divisors'].pop();
                }
                
                // Pick a varied answer that will work with this divisor
                // Avoid recently used answers
                const recentAnswers = recentlyUsedNumbers[levelKey + '_divAnswers'] || [];
                
                // Initialize the recent answers array if it doesn't exist
                if (!recentlyUsedNumbers[levelKey + '_divAnswers']) {
                    recentlyUsedNumbers[levelKey + '_divAnswers'] = [];
                }
                
                let possibleAnswers = [];
                for (let i = 1; i <= 9; i++) {
                    if (!recentAnswers.includes(i)) {
                        possibleAnswers.push(i);
                    }
                }
                
                if (possibleAnswers.length === 0) {
                    possibleAnswers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                }
                
                const answerIndex = Math.floor(Math.random() * possibleAnswers.length);
                answer = possibleAnswers[answerIndex];
                
                // Track this answer as recently used
                recentlyUsedNumbers[levelKey + '_divAnswers'].unshift(answer);
                if (recentlyUsedNumbers[levelKey + '_divAnswers'].length > 3) {
                    recentlyUsedNumbers[levelKey + '_divAnswers'].pop();
                }
                
                // Calculate dividend to ensure clean division
                num1 = num2 * answer;
                problemString = `${num1} ÷ ${num2} = ?`;
            } else { 
                console.error("Error: Invalid ranges for DIVISION_SINGLE_DIGIT_NO_REMAINDER", ranges); 
                num1 = 4; num2 = 2; answer = 2; 
                problemString = "4 ÷ 2 = ?"; 
            } 
            break; case PROBLEM_TYPES.ADDITION_DOUBLE_DIGIT: if (ranges && ranges.doubleDigit && ranges.doubleDigit.length === 2) {
                // Use enhanced random number generation
                num1 = getRandomIntAvoidRecent(ranges.doubleDigit[0], ranges.doubleDigit[1], currentChallengeLevel); 
                num2 = getRandomIntAvoidRecent(ranges.doubleDigit[0], ranges.doubleDigit[1], currentChallengeLevel);
                
                // Introduce more variability with interesting number patterns
                // Every third problem, introduce numbers with specific patterns
                const patternType = Math.floor(Math.random() * 10);
                if (patternType === 0) {
                    // Use numbers ending in 5 or 0 for cleaner additions
                    num1 = Math.floor(num1 / 10) * 10 + 5;
                    num2 = Math.floor(num2 / 10) * 10;
                } else if (patternType === 1) {
                    // Use numbers that sum to an even 10 (e.g., 47 + 53 = 100)
                    const targetSum = Math.floor(num1 / 10 + num2 / 10 + 2) * 10; // Round up to next 10
                    num1 = Math.min(num1, targetSum - ranges.doubleDigit[0]);
                    num2 = targetSum - num1;
                    if (num2 > ranges.doubleDigit[1] || num2 < ranges.doubleDigit[0]) {
                        num2 = getRandomIntAvoidRecent(ranges.doubleDigit[0], ranges.doubleDigit[1], currentChallengeLevel);
                    }
                }
                
                answer = num1 + num2;
                problemString = `${num1} + ${num2} = ?`;
            } else {
                console.error("Error: Invalid ranges for ADDITION_DOUBLE_DIGIT", ranges);
                num1 = 10; num2 = 10; answer = 20;
                problemString = "10 + 10 = ?";
            } break; case PROBLEM_TYPES.SUBTRACTION_DOUBLE_DIGIT: if (ranges && ranges.doubleDigit && ranges.doubleDigit.length === 2) {
                // Use enhanced random number generation
                num1 = getRandomIntAvoidRecent(ranges.doubleDigit[0], ranges.doubleDigit[1], currentChallengeLevel);
                
                // Introduce more variability with interesting number patterns
                const patternType = Math.floor(Math.random() * 10);
                if (patternType === 0) {
                    // Create round numbers for easier mental math
                    num1 = Math.floor(num1 / 10) * 10;
                    num2 = getRandomIntAvoidRecent(ranges.doubleDigit[0], num1 - 1, currentChallengeLevel);
                } else if (patternType === 1) {
                    // Create differences that end in 0 or 5
                    const targetDiff = Math.floor(Math.random() * 9) * 5 + 5; // 5, 10, 15, ..., 45
                    num2 = num1 - targetDiff;
                    if (num2 < ranges.doubleDigit[0] || num2 >= num1) {
                        num2 = getRandomIntAvoidRecent(ranges.doubleDigit[0], num1 - 1, currentChallengeLevel);
                    }
                } else {
                    // Standard approach but ensure variability
                    num2 = getRandomIntAvoidRecent(ranges.doubleDigit[0], num1 - 1, currentChallengeLevel);
                }

                answer = num1 - num2;
                problemString = `${num1} - ${num2} = ?`;
            } else {
                console.error("Error: Invalid ranges for SUBTRACTION_DOUBLE_DIGIT", ranges);
                num1 = 20; num2 = 10; answer = 10;
                problemString = "20 - 10 = ?";
            } break; case PROBLEM_TYPES.MULTIPLICATION_DOUBLE_BY_SINGLE: if (ranges && ranges.doubleDigit && ranges.doubleDigit.length === 2 && ranges.singleDigit && ranges.singleDigit.length === 2) {
                // Use enhanced random number generation
                num1 = getRandomIntAvoidRecent(ranges.doubleDigit[0], ranges.doubleDigit[1], currentChallengeLevel);
                num2 = getRandomIntAvoidRecent(ranges.singleDigit[0], ranges.singleDigit[1], currentChallengeLevel);
                
                // Introduce more interesting patterns for variety
                const patternType = Math.floor(Math.random() * 10);
                if (patternType === 0) {
                    // Create multiplication with multiples of 10 for variety
                    num1 = Math.floor(num1 / 10) * 10;
                } else if (patternType === 1) {
                    // Create multiplication with 5 as one factor
                    num2 = 5;
                } else if (patternType === 2) {
                    // Create multiplication with numbers ending in 5
                    if (num1 > 15) {
                        num1 = Math.floor(num1 / 10) * 10 + 5;
                    }
                }

                answer = num1 * num2;
                problemString = `${num1} × ${num2} = ?`;
            } else {
                console.error("Error: Invalid ranges for MULTIPLICATION_DOUBLE_BY_SINGLE", ranges);
                num1 = 10; num2 = 2; answer = 20;
                problemString = "10 × 2 = ?";
            } break; case PROBLEM_TYPES.DIVISION_NO_REMAINDER: if (ranges && ranges.factorsForDivision && ranges.factorsForDivision.length === 2) { 
                // Safe divisors that won't cause repeating decimals
                const safeDivisors = [2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25];
                const validDivisors = safeDivisors.filter(n => 
                    n >= ranges.factorsForDivision[0] && n <= ranges.factorsForDivision[1]/2);
                
                // Use a more varied approach to select divisors
                let divisorIndex;
                const levelKey = `level${currentChallengeLevel}`;
                const recentDivisors = recentlyUsedNumbers[levelKey + '_div_no_rem'] || [];
                
                // Initialize the recent divisors array if it doesn't exist
                if (!recentlyUsedNumbers[levelKey + '_div_no_rem']) {
                    recentlyUsedNumbers[levelKey + '_div_no_rem'] = [];
                }
                
                // Try to avoid recently used divisors
                const availableDivisors = validDivisors.filter(d => !recentDivisors.includes(d));
                
                if (availableDivisors.length > 0) {
                    divisorIndex = Math.floor(Math.random() * availableDivisors.length);
                    num2 = availableDivisors[divisorIndex];
                } else {
                    divisorIndex = Math.floor(Math.random() * validDivisors.length);
                    num2 = validDivisors[divisorIndex];
                }
                
                if (!num2) { num2 = 4; } // Default to 4 if no valid divisors
                
                // Track this divisor as recently used
                recentlyUsedNumbers[levelKey + '_div_no_rem'].unshift(num2);
                if (recentlyUsedNumbers[levelKey + '_div_no_rem'].length > 3) {
                    recentlyUsedNumbers[levelKey + '_div_no_rem'].pop();
                }
                
                // Vary the complexity of the answers
                const answerRange = Math.floor(Math.random() * 3);
                let answerMax;
                
                // Create different difficulties of division problems
                if (answerRange === 0) {
                    // Smaller quotients (easier)
                    answerMax = Math.min(6, ranges.factorsForDivision[1]/2);
                } else if (answerRange === 1) {
                    // Medium quotients
                    answerMax = Math.min(12, ranges.factorsForDivision[1]/2);
                } else {
                    // Larger quotients (harder but still within range)
                    answerMax = Math.min(20, ranges.factorsForDivision[1]/2);
                }
                
                // Track recently used answers
                const recentAnswers = recentlyUsedNumbers[levelKey + '_div_answers'] || [];
                if (!recentlyUsedNumbers[levelKey + '_div_answers']) {
                    recentlyUsedNumbers[levelKey + '_div_answers'] = [];
                }
                
                // Generate potential answers avoiding recently used ones
                let potentialAnswers = [];
                for (let i = 1; i <= answerMax; i++) {
                    if (!recentAnswers.includes(i)) {
                        potentialAnswers.push(i);
                    }
                }
                
                // If all possible answers were recently used, reset
                if (potentialAnswers.length === 0) {
                    potentialAnswers = Array.from({length: answerMax}, (_, i) => i + 1);
                }
                
                // Select answer and update tracking
                const answerIndex = Math.floor(Math.random() * potentialAnswers.length);
                answer = potentialAnswers[answerIndex];
                
                recentlyUsedNumbers[levelKey + '_div_answers'].unshift(answer);
                if (recentlyUsedNumbers[levelKey + '_div_answers'].length > 5) {
                    recentlyUsedNumbers[levelKey + '_div_answers'].pop();
                }
                
                num1 = num2 * answer;
                problemString = `${num1} ÷ ${num2} = ?`;
            } else {
                console.error("Error: Invalid ranges for DIVISION_NO_REMAINDER", ranges);
                num1 = 10; num2 = 2; answer = 5;
                problemString = "10 ÷ 2 = ?";
            }
            break; case PROBLEM_TYPES.MULTIPLICATION_DOUBLE_DIGIT: if (ranges && ranges.doubleDigit && ranges.doubleDigit.length === 2) {
                // Track recently used numbers and combinations for level 8 specifically
                const levelKey = `level${currentChallengeLevel}`;
                
                // Initialize tracking arrays if they don't exist
                if (!recentlyUsedNumbers[levelKey + '_mult1']) recentlyUsedNumbers[levelKey + '_mult1'] = [];
                if (!recentlyUsedNumbers[levelKey + '_mult2']) recentlyUsedNumbers[levelKey + '_mult2'] = [];
                if (!recentlyUsedNumbers[levelKey + '_multPairs']) recentlyUsedNumbers[levelKey + '_multPairs'] = [];
                if (!recentlyUsedNumbers[levelKey + '_multResults']) recentlyUsedNumbers[levelKey + '_multResults'] = [];
                
                const recentMult1 = recentlyUsedNumbers[levelKey + '_mult1'];
                const recentMult2 = recentlyUsedNumbers[levelKey + '_mult2'];
                const recentPairs = recentlyUsedNumbers[levelKey + '_multPairs']; // Track specific number pairs
                const recentResults = recentlyUsedNumbers[levelKey + '_multResults'];
                
                // Define number ranges with more variety for level 8
                const rangeTypes = [
                    // Small numbers (10-30)
                    {min: Math.max(ranges.doubleDigit[0], 10), max: Math.min(ranges.doubleDigit[1], 30), weight: 2},
                    // Medium numbers (31-70)
                    {min: Math.max(ranges.doubleDigit[0], 31), max: Math.min(ranges.doubleDigit[1], 70), weight: 3},
                    // Large numbers (71-150)
                    {min: Math.max(ranges.doubleDigit[0], 71), max: Math.min(ranges.doubleDigit[1], 150), weight: 2},
                    // Very large numbers (151+)
                    {min: Math.max(ranges.doubleDigit[0], 151), max: ranges.doubleDigit[1], weight: 1},
                    // Numbers ending in 5 or 0 (easier to multiply)
                    {special: 'roundNumbers', weight: 2}
                ];
                
                // Filter ranges to be within the configured bounds
                const validRanges = rangeTypes.filter(range => 
                    !range.special && range.min <= ranges.doubleDigit[1] && range.max >= ranges.doubleDigit[0]
                );
                
                // Add the special range type if it's valid
                if (ranges.doubleDigit[1] >= 10) {
                    validRanges.push(rangeTypes[4]); // Add the round numbers option
                }
                
                // If no valid ranges, use the full range
                if (validRanges.length === 0) {
                    validRanges.push({
                        min: ranges.doubleDigit[0],
                        max: ranges.doubleDigit[1],
                        weight: 1
                    });
                }
                
                // Calculate total weight for random selection
                const totalWeight = validRanges.reduce((sum, range) => sum + (range.weight || 1), 0);
                let randomWeight = Math.random() * totalWeight;
                
                // Select a range based on weight
                let selectedRange = validRanges[0];
                for (const range of validRanges) {
                    if (randomWeight <= (range.weight || 1)) {
                        selectedRange = range;
                        break;
                    }
                    randomWeight -= (range.weight || 1);
                }
                
                // Get all possible number pairs that haven't been used recently
                let availablePairs = [];
                let attemptsToFindPair = 0;
                
                while (availablePairs.length === 0 && attemptsToFindPair < 10) {
                    attemptsToFindPair++;
                    
                    // Generate candidate pairs
                    let candidatePairs = [];
                    
                    // Try up to 20 different candidate pairs
                    for (let i = 0; i < 20; i++) {
                        let n1, n2;
                        
                        if (selectedRange.special === 'roundNumbers') {
                            // Generate a number ending in 0 or 5
                            const baseMin = Math.floor(ranges.doubleDigit[0]/10);
                            const baseMax = Math.floor(ranges.doubleDigit[1]/10);
                            const base1 = getRandomInt(baseMin, baseMax);
                            const base2 = getRandomInt(baseMin, baseMax);
                            n1 = base1 * 10 + (Math.random() < 0.5 ? 0 : 5);
                            n2 = base2 * 10 + (Math.random() < 0.5 ? 0 : 5);
                        } else {
                            n1 = getRandomInt(selectedRange.min, selectedRange.max);
                            
                            // Make second number from a different part of the range
                            const rangeSize = selectedRange.max - selectedRange.min;
                            let minOffset = Math.max(Math.floor(rangeSize * 0.2), 5);
                            let secondRange;
                            
                            if (Math.random() < 0.5) {
                                // Higher than n1
                                secondRange = {
                                    min: Math.min(n1 + minOffset, selectedRange.max),
                                    max: selectedRange.max
                                };
                            } else {
                                // Lower than n1
                                secondRange = {
                                    min: selectedRange.min,
                                    max: Math.max(selectedRange.min, n1 - minOffset)
                                };
                            }
                            
                            if (secondRange.min <= secondRange.max) {
                                n2 = getRandomInt(secondRange.min, secondRange.max);
                            } else {
                                n2 = getRandomInt(selectedRange.min, selectedRange.max);
                            }
                        }
                        
                        const pair = [Math.min(n1, n2), Math.max(n1, n2)];
                        const pairString = pair.join(',');
                        
                        // Check if this pair has been used recently
                        if (!recentPairs.includes(pairString) && 
                            !recentResults.includes(n1 * n2)) {
                            candidatePairs.push({
                                n1: n1,
                                n2: n2,
                                pair: pairString,
                                product: n1 * n2
                            });
                        }
                    }
                    
                    // Further filter to avoid numbers that appear individually too much
                    availablePairs = candidatePairs.filter(p => 
                        !recentMult1.includes(p.n1) && 
                        !recentMult1.includes(p.n2) && 
                        !recentMult2.includes(p.n1) && 
                        !recentMult2.includes(p.n2)
                    );
                    
                    // If we have no valid pairs, relax the constraints
                    if (availablePairs.length === 0 && attemptsToFindPair >= 5) {
                        availablePairs = candidatePairs;
                    }
                    
                    // If still no valid pairs after many attempts, reset tracking
                    if (availablePairs.length === 0 && attemptsToFindPair >= 8) {
                        debugLog('Resetting multiplication tracking due to limited options');
                        recentlyUsedNumbers[levelKey + '_mult1'] = [];
                        recentlyUsedNumbers[levelKey + '_mult2'] = [];
                        recentlyUsedNumbers[levelKey + '_multPairs'] = [];
                        recentlyUsedNumbers[levelKey + '_multResults'] = [];
                        
                        // Just pick some random numbers as a fallback
                        num1 = getRandomInt(ranges.doubleDigit[0], ranges.doubleDigit[1]);
                        num2 = getRandomInt(ranges.doubleDigit[0], ranges.doubleDigit[1]);
                        answer = num1 * num2;
                        problemString = `${num1} × ${num2} = ?`;
                        break;
                    }
                }
                
                // If we found valid pairs, use one randomly
                if (availablePairs.length > 0) {
                    const selectedPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
                    num1 = selectedPair.n1;
                    num2 = selectedPair.n2;
                    
                    // Update tracking for recently used numbers and pairs
                    recentMult1.unshift(num1);
                    recentMult2.unshift(num2);
                    recentPairs.unshift(selectedPair.pair);
                    recentResults.unshift(selectedPair.product);
                    
                    // Keep tracking lists from getting too long (increased from 10 to 20)
                    if (recentMult1.length > 20) recentMult1.pop();
                    if (recentMult2.length > 20) recentMult2.pop();
                    if (recentPairs.length > 20) recentPairs.pop();
                    if (recentResults.length > 20) recentResults.pop();
                    
                    answer = num1 * num2;
                    problemString = `${num1} × ${num2} = ?`;
                }
                // Note: If neither condition was met, num1, num2, answer, and problemString
                // have already been set in the fallback case
            } else {
                console.error("Error: Invalid ranges for MULTIPLICATION_DOUBLE_DIGIT", ranges);
                num1 = 10; num2 = 10; answer = 100;
                problemString = "10 × 10 = ?";
            } break; case PROBLEM_TYPES.DIVISION_LONG_SINGLE_DIVISOR: if (ranges && ranges.singleDivisor && ranges.singleDivisor.length === 2 && ranges.dividendMax) {
                // Track recently used values for level 8 specifically
                const levelKey = `level${currentChallengeLevel}`;
                
                // Initialize tracking arrays if they don't exist
                if (!recentlyUsedNumbers[levelKey + '_longDivisors']) recentlyUsedNumbers[levelKey + '_longDivisors'] = [];
                if (!recentlyUsedNumbers[levelKey + '_longDividends']) recentlyUsedNumbers[levelKey + '_longDividends'] = [];
                if (!recentlyUsedNumbers[levelKey + '_longQuotients']) recentlyUsedNumbers[levelKey + '_longQuotients'] = [];
                if (!recentlyUsedNumbers[levelKey + '_divPairs']) recentlyUsedNumbers[levelKey + '_divPairs'] = [];
                
                const recentDivisors = recentlyUsedNumbers[levelKey + '_longDivisors'];
                const recentDividends = recentlyUsedNumbers[levelKey + '_longDividends'];
                const recentQuotients = recentlyUsedNumbers[levelKey + '_longQuotients'];
                const recentDivPairs = recentlyUsedNumbers[levelKey + '_divPairs']; // Track specific division pairs
                
                // Expanded list of safe divisors that won't cause repeating decimals
                // Added more variety for level 8
                const safeDivisors = [
                    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 
                    14, 15, 16, 18, 20, 21, 22, 24, 25, 28, 30, 32, 35, 36, 40, 42, 45, 48, 50
                ];
                
                // Filter divisors that are within the specified range
                const validDivisors = safeDivisors.filter(n => 
                    n >= ranges.singleDivisor[0] && n <= ranges.singleDivisor[1]);
                
                // Group divisors by size for more varied selection
                const smallDivisors = validDivisors.filter(d => d <= 10);
                const mediumDivisors = validDivisors.filter(d => d > 10 && d <= 25);
                const largeDivisors = validDivisors.filter(d => d > 25);
                
                // Select a divisor category with weighted probability
                let selectedGroup;
                const rand = Math.random();
                
                if (rand < 0.35 && smallDivisors.length > 0) {
                    selectedGroup = smallDivisors;
                } else if (rand < 0.8 && mediumDivisors.length > 0) {
                    selectedGroup = mediumDivisors;
                } else if (largeDivisors.length > 0) {
                    selectedGroup = largeDivisors;
                } else {
                    // Fallback to all valid divisors if any category is empty
                    selectedGroup = validDivisors;
                }
                
                // Further filter to prioritize divisors that haven't been used recently
                let availableDivisors = selectedGroup.filter(d => !recentDivisors.includes(d));
                
                // If all divisors in this group were recently used, fall back to the group
                if (availableDivisors.length === 0) {
                    availableDivisors = selectedGroup;
                }
                
                // If no valid divisors at all, reset tracking
                if (availableDivisors.length === 0) {
                    debugLog('No valid divisors available, resetting tracking');
                    recentlyUsedNumbers[levelKey + '_longDivisors'] = [];
                    availableDivisors = selectedGroup.length > 0 ? selectedGroup : [5]; // Default to 5 if still empty
                }
                
                // Select a random divisor from the available ones
                const divisorIndex = Math.floor(Math.random() * availableDivisors.length);
                num2 = availableDivisors[divisorIndex];
                
                if (!num2) { num2 = 5; } // Default to 5 if no valid divisors
                
                // Define different ranges of quotients for more variety
                const quotientRanges = [
                    {min: 3, max: 6, weight: 1}, // Very small quotients
                    {min: 7, max: 12, weight: 3}, // Small quotients
                    {min: 13, max: 20, weight: 4}, // Medium quotients 
                    {min: 21, max: 30, weight: 2}, // Large quotients
                    {min: 31, max: Math.min(50, Math.floor(ranges.dividendMax / num2)), weight: 1} // Very large quotients
                ];
                
                // Filter ranges to be within the maximum dividend constraint
                const validQuotientRanges = quotientRanges.filter(range => 
                    range.min * num2 <= ranges.dividendMax &&
                    range.max >= 1);
                
                // Adjust the upper bound of the last range if needed
                if (validQuotientRanges.length > 0) {
                    const lastRange = validQuotientRanges[validQuotientRanges.length - 1];
                    lastRange.max = Math.min(lastRange.max, Math.floor(ranges.dividendMax / num2));
                }
                
                // If no valid ranges, create a default one
                if (validQuotientRanges.length === 0) {
                    validQuotientRanges.push({
                        min: 1,
                        max: Math.floor(ranges.dividendMax / num2),
                        weight: 1
                    });
                }
                
                // Select a range based on weights
                let totalWeight = validQuotientRanges.reduce((sum, range) => sum + (range.weight || 1), 0);
                let randomWeight = Math.random() * totalWeight;
                let selectedRange = validQuotientRanges[0];
                
                for (const range of validQuotientRanges) {
                    if (randomWeight <= (range.weight || 1)) {
                        selectedRange = range;
                        break;
                    }
                    randomWeight -= (range.weight || 1);
                }
                
                // Get all valid division problems that haven't been used recently
                let availablePairs = [];
                let attemptsToFindPair = 0;
                
                while (availablePairs.length === 0 && attemptsToFindPair < 5) {
                    attemptsToFindPair++;
                    
                    // Generate candidate quotients within the selected range
                    for (let q = selectedRange.min; q <= selectedRange.max; q++) {
                        // Calculate the dividend
                        const dividend = num2 * q;
                        const pairString = `${dividend},${num2}`;
                        
                        // Check if this pair hasn't been used recently
                        if (!recentDivPairs.includes(pairString) && 
                            !recentQuotients.includes(q) && 
                            !recentDividends.includes(dividend)) {
                            availablePairs.push({
                                divisor: num2,
                                quotient: q,
                                dividend: dividend,
                                pairString: pairString
                            });
                        }
                    }
                    
                    // If we can't find any good pairs in this range, try another range
                    if (availablePairs.length === 0 && validQuotientRanges.length > 1) {
                        // Remove the current range and select a new one
                        const otherRanges = validQuotientRanges.filter(r => r !== selectedRange);
                        if (otherRanges.length > 0) {
                            selectedRange = otherRanges[Math.floor(Math.random() * otherRanges.length)];
                        }
                    }
                }
                
                // If still no available pairs after multiple attempts, reset tracking
                if (availablePairs.length === 0) {
                    debugLog('Resetting division tracking due to limited options');
                    recentlyUsedNumbers[levelKey + '_longDivisors'] = [];
                    recentlyUsedNumbers[levelKey + '_longDividends'] = [];
                    recentlyUsedNumbers[levelKey + '_longQuotients'] = [];
                    recentlyUsedNumbers[levelKey + '_divPairs'] = [];
                    
                    // Generate a random quotient and dividend as fallback
                    const q = getRandomInt(selectedRange.min, selectedRange.max);
                    num1 = num2 * q;
                    answer = q;
                } else {
                    // Select a random pair from the available ones
                    const selectedPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
                    num1 = selectedPair.dividend;
                    answer = selectedPair.quotient;
                    
                    // Track all components for future reference
                    recentDivisors.unshift(num2);
                    recentDividends.unshift(num1);
                    recentQuotients.unshift(answer);
                    recentDivPairs.unshift(selectedPair.pairString);
                    
                    // Keep tracking arrays from getting too long
                    if (recentDivisors.length > 15) recentDivisors.pop();
                    if (recentDividends.length > 15) recentDividends.pop();
                    if (recentQuotients.length > 15) recentQuotients.pop();
                    if (recentDivPairs.length > 15) recentDivPairs.pop();
                }
                
                problemString = `${num1} ÷ ${num2} = ?`;
            } else {
                console.error("Error: Invalid ranges for DIVISION_LONG_SINGLE_DIVISOR", ranges);
                num1 = 50; num2 = 5; answer = 10;
                problemString = "50 ÷ 5 = ?";
            }
            break; case PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC: if (ranges && ranges.doubleDigit && ranges.doubleDigit.length === 2 && ranges.singleDigit && ranges.singleDigit.length === 2) { 
      const opType = getRandomInt(0, 5);
      if (opType === 0) {
        // Addition and subtraction with larger numbers
        num1 = getRandomInt(ranges.doubleDigit[0], ranges.doubleDigit[1]);
        num2 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num3 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        answer = num1 + num2 - num3;
        problemString = `${num1} + ${num2} - ${num3} = ?`;
      } else if (opType === 1) {
        // Multiplication and addition
        num1 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num2 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num3 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        answer = num1 * num2 + num3;
        problemString = `${num1} × ${num2} + ${num3} = ?`;
      } else if (opType === 2) {
        // Subtraction and multiplication
        num1 = getRandomInt(ranges.doubleDigit[0], ranges.doubleDigit[1]);
        num2 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num3 = getRandomInt(1, 5);
        answer = (num1 - num2) * num3;
        problemString = `(${num1} - ${num2}) × ${num3} = ?`;
      } else if (opType === 3) {
        // Division and addition
        num3 = getRandomInt(2, 10);
        num2 = getRandomInt(1, 9);
        num1 = num3 * num2;
        num4 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        answer = num2 + num4;
        problemString = `${num1} ÷ ${num3} + ${num4} = ?`;
      } else if (opType === 4) {
        // Three operations
        num1 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num2 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num3 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num4 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        answer = num1 + num2 * num3 - num4;
        problemString = `${num1} + ${num2} × ${num3} - ${num4} = ?`;
      } else {
        // Three operations with parentheses
        num1 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num2 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num3 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        num4 = getRandomInt(ranges.singleDigit[0], ranges.singleDigit[1]);
        answer = (num1 + num2) * (num3 - num4);
        problemString = `(${num1} + ${num2}) × (${num3} - ${num4}) = ?`;
      }
    } else { 
      console.error("Error: Invalid ranges for MULTI_STEP_ARITHMETIC_BASIC", ranges); 
      num1 = 10; num2 = 5; num3 = 2; answer = 13; 
      problemString = "10 + 5 - 2 = ?"; 
    } 
                        break;
            
        case PROBLEM_TYPES.MONEY_OPERATIONS: 
                requiresTextInput = true;
            const problemType = getRandomInt(0, 1); // Only money operations now
            if (problemType === 0) {
        // Money addition - ensure precise calculations without floating point errors
        const dollars1 = getRandomInt(1, 20);
        const cents1 = getRandomInt(0, 99);
        const dollars2 = getRandomInt(1, 20);
        const cents2 = getRandomInt(0, 99);
        
        // Use cents-based calculation to avoid floating point errors
        const totalCents = (dollars1 * 100 + cents1) + (dollars2 * 100 + cents2);
        const totalDollars = Math.floor(totalCents / 100);
        const resultCents = totalCents % 100;
        
        answer = totalDollars + "." + (resultCents < 10 ? "0" + resultCents : resultCents);
        problemString = `$${dollars1}.${cents1 < 10 ? "0" + cents1 : cents1} + $${dollars2}.${cents2 < 10 ? "0" + cents2 : cents2} = ?`;
      } else {
        // Money subtraction - using integer-based calculation to avoid floating point errors
        let dollars1 = getRandomInt(10, 50);
        let cents1 = getRandomInt(0, 99);
        let dollars2 = getRandomInt(1, dollars1);
        let cents2 = getRandomInt(0, 99);
        
        // Convert to cents for reliable calculation
        let money1Cents = dollars1 * 100 + cents1;
        let money2Cents = dollars2 * 100 + cents2;
        
        // Ensure we don't have negative results
        if (money1Cents <= money2Cents) {
          // Use fallback values to guarantee a positive result
          dollars1 = 20;
          cents1 = 50;
          dollars2 = 10;
          cents2 = 25;
          // Recalculate cents values
          money1Cents = dollars1 * 100 + cents1;
          money2Cents = dollars2 * 100 + cents2;
        }
        
        // Perform the subtraction with integer math
        const resultCents = money1Cents - money2Cents;
        const totalDollars = Math.floor(resultCents / 100);
        const remainingCents = resultCents % 100;
        
        answer = totalDollars + "." + (remainingCents < 10 ? "0" + remainingCents : remainingCents);
        problemString = `$${dollars1}.${cents1 < 10 ? "0" + cents1 : cents1} - $${dollars2}.${cents2 < 10 ? "0" + cents2 : cents2} = ?`;
      }
      break;
      
    case PROBLEM_TYPES.INTEGER_ADDITION:
      if (ranges && ranges.integerRange && ranges.integerRange.length === 2) {
        num1 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        num2 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        answer = num1 + num2;
        problemString = `${num1} + ${num2} = ?`;
      } else {
        console.error("Error: Invalid ranges for INTEGER_ADDITION", ranges);
        num1 = -2; num2 = 5; answer = 3;
        problemString = "-2 + 5 = ?";
      }
      break;
      
    case PROBLEM_TYPES.INTEGER_SUBTRACTION:
      if (ranges && ranges.integerRange && ranges.integerRange.length === 2) {
        num1 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        num2 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        answer = num1 - num2;
        problemString = `${num1} - ${num2} = ?`;
      } else {
        console.error("Error: Invalid ranges for INTEGER_SUBTRACTION", ranges);
        num1 = 5; num2 = -3; answer = 8;
        problemString = "5 - (-3) = ?";
      }
      break;
      
    case PROBLEM_TYPES.INTEGER_MULTIPLICATION:
      if (ranges && ranges.integerRange && ranges.integerRange.length === 2) {
        num1 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        num2 = getRandomInt(ranges.integerRange[0], ranges.integerRange[1]);
        answer = num1 * num2;
        problemString = `${num1} × ${num2} = ?`;
      } else {
        console.error("Error: Invalid ranges for INTEGER_MULTIPLICATION", ranges);
        num1 = -2; num2 = -3; answer = 6;
        problemString = "-2 × (-3) = ?";
      }
      break;
      
    case PROBLEM_TYPES.EQUATION_ONE_STEP:
      if (ranges && ranges.equationVars && ranges.equationVars.length === 2 && ranges.equationConst && ranges.equationConst.length === 2) {
        // Randomly decide operation type: 0=+, 1=-, 2=*, 3=/
        const opType = getRandomInt(0, 3);
        
        // Handle the division case separately to avoid variable reassignment issues
        if (opType === 3) {
          // For division, ensure clean integer results
          const constant = getRandomInt(ranges.equationConst[0], ranges.equationConst[1]);
          // Avoid division by zero by ensuring constant isn't zero
          const safeConstant = constant === 0 ? 1 : constant;
          
          // Generate the result first (will be the answer)
          const result = getRandomInt(1, 10);
          
          // Calculate the value that, when divided by the constant, gives the result
          const xValue = result * safeConstant;
          
          answer = result;
          problemString = `${xValue} ÷ ${safeConstant} = ?`;
        }
        else {
          // For other operations, proceed as before
          const varValue = getRandomInt(ranges.equationVars[0], ranges.equationVars[1]);
          const constant = getRandomInt(ranges.equationConst[0], ranges.equationConst[1]);
          
          // Calculate result based on the operation
          if (opType === 0) {
            // x + constant = result
            answer = varValue;
            problemString = `x + ${constant} = ${varValue + constant}`;
          } else if (opType === 1) {
            // x - constant = result
            answer = varValue;
            problemString = `x - ${constant} = ${varValue - constant}`;
          } else if (opType === 2) {
            // x * constant = result
            answer = varValue;
            problemString = `${constant}x = ${varValue * constant}`;
          }
        }
      } else {
        console.error("Error: Invalid ranges for EQUATION_ONE_STEP", ranges);
        answer = 5;
        problemString = "x + 3 = 8";
      }
      break;
      
    case PROBLEM_TYPES.EQUATION_TWO_STEP:
      if (ranges && ranges.equationVars && ranges.equationVars.length === 2 && 
          ranges.equationConst && ranges.equationConst.length === 2 &&
          ranges.equationCoeff && ranges.equationCoeff.length === 2) {
        
        // Track recently used values for level 8
        const levelKey = `level${currentChallengeLevel}`;
        
        // Initialize tracking arrays if they don't exist
        if (!recentlyUsedNumbers[levelKey + '_eqVars']) recentlyUsedNumbers[levelKey + '_eqVars'] = [];
        if (!recentlyUsedNumbers[levelKey + '_eqCoeffs']) recentlyUsedNumbers[levelKey + '_eqCoeffs'] = [];
        if (!recentlyUsedNumbers[levelKey + '_eqConsts']) recentlyUsedNumbers[levelKey + '_eqConsts'] = [];
        
        // Get recent value tracking arrays
        const recentVars = recentlyUsedNumbers[levelKey + '_eqVars'];
        const recentCoeffs = recentlyUsedNumbers[levelKey + '_eqCoeffs'];
        const recentConsts = recentlyUsedNumbers[levelKey + '_eqConsts'];
        
        // Generate variable value (x) avoiding recently used values if possible
        let varValue;
        let varAttempts = 0;
        do {
          varValue = getRandomInt(ranges.equationVars[0], ranges.equationVars[1]);
          varAttempts++;
        } while (recentVars.includes(varValue) && varAttempts < 10);
        
        // Generate coefficient (a) avoiding recently used values if possible
        let coefficient;
        let coeffAttempts = 0;
        do {
          coefficient = getRandomInt(ranges.equationCoeff[0], ranges.equationCoeff[1]);
          coeffAttempts++;
        } while (recentCoeffs.includes(coefficient) && coeffAttempts < 10);
        
        // Generate constant (b) avoiding recently used values if possible
        let constant;
        let constAttempts = 0;
        do {
          constant = getRandomInt(ranges.equationConst[0], ranges.equationConst[1]);
          constAttempts++;
        } while (recentConsts.includes(constant) && constAttempts < 10);
        
        // Track the used values
        recentVars.unshift(varValue);
        recentCoeffs.unshift(coefficient);
        recentConsts.unshift(constant);
        
        // Keep tracking lists from getting too long
        if (recentVars.length > 20) recentVars.pop();
        if (recentCoeffs.length > 20) recentCoeffs.pop();
        if (recentConsts.length > 20) recentConsts.pop();
        
        // Ensure all calculations result in integers to avoid floating point issues
        // Calculate the right side of the equation: a*x + b = c
        const rightSide = (coefficient * varValue) + constant;
        
        // Create different equation formats for variety
        const formats = [
          // ax + b = c
          `${coefficient}x + ${constant} = ${rightSide}`,
          // ax + b = c (but with parentheses around coefficient)
          `(${coefficient}x) + ${constant} = ${rightSide}`,
          // b + ax = c
          `${constant} + ${coefficient}x = ${rightSide}`,
          // c = ax + b
          `${rightSide} = ${coefficient}x + ${constant}`,
          // c = b + ax
          `${rightSide} = ${constant} + ${coefficient}x`
        ];
        
        // Choose a random format
        const formatIndex = Math.floor(Math.random() * formats.length);
        
        answer = varValue.toString();
        problemString = formats[formatIndex];
      } else {
        console.error("Error: Invalid ranges for EQUATION_TWO_STEP", ranges);
        answer = 2;
        problemString = "3x + 4 = 10";
      }
      break;
      
    case PROBLEM_TYPES.SQUARE_ROOTS_PERFECT:
      if (ranges && ranges.perfectSquareMax) {
        // Track recently used square roots for level 8
        const levelKey = `level${currentChallengeLevel}`;
        
        // Initialize tracking arrays if they don't exist
        if (!recentlyUsedNumbers[levelKey + '_sqrtRoots']) recentlyUsedNumbers[levelKey + '_sqrtRoots'] = [];
        if (!recentlyUsedNumbers[levelKey + '_sqrtValues']) recentlyUsedNumbers[levelKey + '_sqrtValues'] = [];
        
        const recentRoots = recentlyUsedNumbers[levelKey + '_sqrtRoots'];
        const recentValues = recentlyUsedNumbers[levelKey + '_sqrtValues'];
        
        // Define the complete set of perfect squares within range
        const maxRoot = Math.floor(Math.sqrt(ranges.perfectSquareMax));
        
        // For level 8, use a wider and more balanced range of square roots
        // Define segments of the range for better distribution
        const rangeSegments = [
          // Very small roots (2-4)
          {min: 2, max: 4, weight: 1},
          // Small roots (5-7)
          {min: 5, max: 7, weight: 1.5},
          // Medium roots (8-10)
          {min: 8, max: 10, weight: 2},
          // Large roots (11-15)
          {min: 11, max: 15, weight: 1.5},
          // Very large roots (16+)
          {min: 16, max: maxRoot, weight: 1}
        ];
        
        // Filter segments that are within our max range
        const validSegments = rangeSegments.filter(segment => 
          segment.min <= maxRoot && segment.max >= 2
        );
        
        // Adjust segment bounds to stay within max range
        validSegments.forEach(segment => {
          segment.min = Math.max(2, segment.min);
          segment.max = Math.min(maxRoot, segment.max);
        });
        
        // Create a full list of all possible roots within range
        const allPossibleRoots = [];
        for (let i = 2; i <= maxRoot; i++) {
          // Skip roots that have been used recently, unless they're all used
          if (!recentRoots.includes(i) || recentRoots.length >= (maxRoot - 1)) {
            allPossibleRoots.push(i);
          }
        }
        
        // If we're running out of options, reset the tracking
        if (allPossibleRoots.length < 3) {
          debugLog('Resetting square root history due to limited options');
          recentlyUsedNumbers[levelKey + '_sqrtRoots'] = [];
          recentlyUsedNumbers[levelKey + '_sqrtValues'] = [];
          for (let i = 2; i <= maxRoot; i++) {
            allPossibleRoots.push(i);
          }
        }
        
        // Select a segment using weighted random choice, but only if we have enough options
        let root;
        
        // If we have plenty of options, use segment-based selection
        if (allPossibleRoots.length > 5) {
          let totalWeight = validSegments.reduce((sum, segment) => sum + segment.weight, 0);
          let randomWeight = Math.random() * totalWeight;
          
          let selectedSegment = validSegments[0]; // Default to first segment
          for (const segment of validSegments) {
            if (randomWeight <= segment.weight) {
              selectedSegment = segment;
              break;
            }
            randomWeight -= segment.weight;
          }
          
          // Filter possible roots to only include those in the selected segment
          const segmentRoots = allPossibleRoots.filter(num => 
            num >= selectedSegment.min && num <= selectedSegment.max
          );
          
          // If we have roots in this segment, pick one, otherwise fall back to any available root
          if (segmentRoots.length > 0) {
            root = segmentRoots[Math.floor(Math.random() * segmentRoots.length)];
          } else {
            root = allPossibleRoots[Math.floor(Math.random() * allPossibleRoots.length)];
          }
        } else {
          // Just pick any available root if options are limited
          root = allPossibleRoots[Math.floor(Math.random() * allPossibleRoots.length)];
        }
        
        // Calculate the square
        const square = root * root;
        
        // Track used values
        recentRoots.unshift(root);
        recentValues.unshift(square);
        
        // Keep tracking lists from getting too long (increased from 6 to 15)
        if (recentRoots.length > 15) recentRoots.pop();
        if (recentValues.length > 15) recentValues.pop();
        
        answer = root.toString();
        problemString = `√${square} = ?`;
      } else {
        console.error("Error: Invalid ranges for SQUARE_ROOTS_PERFECT", ranges);
        answer = "5";
        problemString = "√25 = ?";
      }
      break;
      
    case PROBLEM_TYPES.EXPONENTS_BASIC:
      if (ranges && ranges.exponentBase && ranges.exponentBase.length === 2 &&
          ranges.exponentPower && ranges.exponentPower.length === 1) {
        // Track recently used bases for level 8
        const levelKey = `level${currentChallengeLevel}`;
        
        // Initialize tracking arrays if they don't exist
        if (!recentlyUsedNumbers[levelKey + '_expBases']) recentlyUsedNumbers[levelKey + '_expBases'] = [];
        if (!recentlyUsedNumbers[levelKey + '_expResults']) recentlyUsedNumbers[levelKey + '_expResults'] = [];
        
        const recentBases = recentlyUsedNumbers[levelKey + '_expBases'];
        const recentResults = recentlyUsedNumbers[levelKey + '_expResults'];
        
        // For level 8, create different segments of the base range for better distribution
        const baseSegments = [
          // Small bases (2-5)
          {min: Math.max(2, ranges.exponentBase[0]), max: Math.min(5, ranges.exponentBase[1]), weight: 1},
          // Medium bases (6-9)
          {min: Math.max(6, ranges.exponentBase[0]), max: Math.min(9, ranges.exponentBase[1]), weight: 2},
          // Larger bases (10-12)
          {min: Math.max(10, ranges.exponentBase[0]), max: ranges.exponentBase[1], weight: 3}
        ];
        
        // Filter segments that are valid for our range
        const validSegments = baseSegments.filter(segment => 
          segment.min <= ranges.exponentBase[1] && segment.max >= ranges.exponentBase[0]
        );
        
        // Select a segment using weighted random choice
        let totalWeight = validSegments.reduce((sum, segment) => sum + segment.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        
        let selectedSegment = validSegments[0]; // Default to first segment
        for (let i = 0; i < validSegments.length; i++) {
          if (randomWeight <= validSegments[i].weight) {
            selectedSegment = validSegments[i];
            break;
          }
          randomWeight -= validSegments[i].weight;
        }
        
        // Generate all possible bases in the selected segment
        let possibleBases = [];
        for (let i = selectedSegment.min; i <= selectedSegment.max; i++) {
          if (!recentBases.includes(i)) {
            possibleBases.push(i);
          }
        }
        
        // If all bases in this segment were recently used, use all of them
        if (possibleBases.length === 0) {
          possibleBases = Array.from(
            {length: selectedSegment.max - selectedSegment.min + 1},
            (_, i) => i + selectedSegment.min
          );
        }
        
        // Select a random base
        const baseIndex = Math.floor(Math.random() * possibleBases.length);
        const base = possibleBases[baseIndex];
        
        // For level 8, we're focusing on squaring (power=2)
        const power = 2;
        
        // Calculate result
        const result = Math.pow(base, power);
        
        // Track used values
        recentBases.unshift(base);
        recentResults.unshift(result);
        
        // Keep tracking lists from getting too long
        if (recentBases.length > 7) recentBases.pop();
        if (recentResults.length > 7) recentResults.pop();
        
        answer = result.toString();
        problemString = `${base}² = ?`;
      } else {
        console.error("Error: Invalid ranges for EXPONENTS_BASIC", ranges);
        answer = "9";
        problemString = "3² = ?";
      }
      break;
      
    case PROBLEM_TYPES.PEMDAS_SIMPLE:
      // Use predefined PEMDAS problems for level 8 to avoid potential issues
      // These are carefully selected to ensure clean integer results and clear PEMDAS application
      const pemdas_problems = [
        { problem: "3 + 4 × 2 = ?", answer: 11 },
        { problem: "10 - 2 × 3 = ?", answer: 4 },
        { problem: "2 × 3 + 8 = ?", answer: 14 },
        { problem: "20 - 5 × 3 = ?", answer: 5 },
        { problem: "(2 + 3) × 4 = ?", answer: 20 },
        { problem: "(8 - 3) × 2 = ?", answer: 10 },
        { problem: "6 + 8 ÷ 4 = ?", answer: 8 },
        { problem: "12 ÷ 4 + 5 = ?", answer: 8 },
        { problem: "16 - 8 ÷ 4 = ?", answer: 14 },
        { problem: "6 × 3 - 5 = ?", answer: 13 },
        { problem: "7 + 3 × 4 = ?", answer: 19 },
        { problem: "5 × (2 + 1) = ?", answer: 15 },
        { problem: "(9 + 3) ÷ 4 = ?", answer: 3 },
        { problem: "4 × 2 + 6 = ?", answer: 14 },
        { problem: "10 - 2 + 4 = ?", answer: 12 }
      ];
      
      // Select a random problem from the list
      const selectedProblem = pemdas_problems[getRandomInt(0, pemdas_problems.length - 1)];
      problemString = selectedProblem.problem;
      answer = selectedProblem.answer;
      break;
    }
    
        // Check if this problem has been used before
        if (globalProblemTracker.isProblemUsed(problemString, num1, num2, num3, problemType, currentChallengeLevel)) {
            // If we've tried enough times, just log it and continue (better than infinite loop)
            if (attempts >= MAX_ATTEMPTS) {
                console.warn(`Could not generate unique problem after ${MAX_ATTEMPTS} attempts. Problem count: ${globalProblemTracker.getProblemCount()}.`);
                // For level 8, try to force a different problem type before giving up
                if (currentChallengeLevel >= 8 && config.types.length > 1) {
                    debugLog('Attempting to force a different problem type...');
                    // Remove the current problem type from the recent list to force a different one
                    const levelKey = `level${currentChallengeLevel}`;
                    const recentTypes = recentlyUsedProblemTypes[levelKey] || [];
                    const typeIndex = recentTypes.indexOf(problemType);
                    if (typeIndex > -1) {
                        recentTypes.splice(typeIndex, 1);
                        debugLog(`Removed problem type ${problemType} from recent list`);
                    }
                    continue;
                }
            } else {
                // Try generating a new problem
                continue;
            }
        }
        
        // If we get here, we have a unique problem
        problemGenerated = true;
        
        // Mark this problem as used
        globalProblemTracker.markProblemAsUsed(problemString, num1, num2, num3, problemType, currentChallengeLevel);
        
        return {
            problemString,
            answer: answer !== null ? answer.toString() : null,
            type: problemType,
            requiresTextInput
        };
    }
    
    // If we get here, we failed to generate a unique problem after max attempts
    console.error(`Failed to generate unique problem after ${MAX_ATTEMPTS} attempts. Returning fallback problem.`);
    return {
        problemString: "2 + 2",
        answer: "4",
        type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
        requiresTextInput: false
    };
  }
        
  function ensureButtonClickability() {
    // This helper function ensures all math buttons remain clickable
    document.querySelectorAll('.mc-choice-btn').forEach(btn => {
      // Reset any potential issues with pointer events
      btn.style.pointerEvents = 'auto';
      
      // Make sure z-index is high enough
      btn.style.zIndex = '20';
    });
  }
        
        // Helper function to properly format numeric values to prevent floating point issues
        function formatNumberForDisplay(value) {
            // If it's already a string and looks like a negative integer, return as is
            if (typeof value === 'string' && /^-\d+$/.test(value)) {
                return value;
            }
            
            // First check if it's a numeric value
            const num = parseFloat(value);
            if (isNaN(num)) return value; // Not a number, return as is
            
            // Check if it's an integer (whole number)
            if (Number.isInteger(num)) {
                return num.toString(); // Return integers as-is without decimal places
            }
            
            // Special handling for integers that might be represented as floats (e.g., -7.0)
            if (Math.abs(num - Math.round(num)) < 0.000001) {
                return Math.round(num).toString();
            }
            
            // For level 8 equations, always ensure clean integer display
            if (currentChallengeLevel === 8) {
                // If it's very close to an integer, round it
                if (Math.abs(num - Math.round(num)) < 0.001) {
                    return Math.round(num).toString();
                }
                
                // Try to identify repeating decimals (like 0.0909...) and avoid them
                const strNum = num.toString();
                if (strNum.length > 10) { // Long decimal, could be repeating
                    // Try to round to a reasonable value
                    return Math.round(num).toString();
                }
            }
            
            // Handle decimal numbers
            // For currency problems (level 5), use 2 decimal places
            if (Math.abs(num) < 100 && num.toString().includes('.')) {
                // Format with 2 decimal places for consistency
                return num.toFixed(2);
            }
            
            // For other decimals, use a reasonable precision that doesn't show floating point errors
            // First try to round to 2 decimal places
            const rounded = Math.round(num * 100) / 100;
            
            // If the rounded value is very close to the original, use it
            if (Math.abs(rounded - num) < 0.0001) {
                // For numbers that are integers after rounding, don't show decimal points
                if (Number.isInteger(rounded)) {
                    return rounded.toString();
                }
                return rounded.toFixed(2);
            }
            
            // Otherwise, limit to a maximum of 2 decimal places (was 3, reduced to avoid repeating decimals)
            const result = parseFloat(num.toFixed(2));
            // Again, for numbers that are integers after rounding, don't show decimal points
            if (Number.isInteger(result)) {
                return result.toString();
            }
            return result.toString();
        }
        
        function displayProblemInBox(boxIndex, problemData) { 
            if (mathProblemTimers[boxIndex]) { 
                clearTimeout(mathProblemTimers[boxIndex]); 
                mathProblemTimers[boxIndex] = null; 
            } 
            
            let currentProblemData = problemData; 
            let retries = 0; 
            
            while (!currentProblemData || !currentProblemData.problemString || 
                   currentProblemData.answer === null || currentProblemData.answer === undefined || 
                   (activeChallengeProblems.some((p, idx) => idx !== boxIndex && p && 
                    p.problemString === currentProblemData.problemString))) { 
                currentProblemData = generateProblemForCurrentLevel(boxIndex); 
                retries++; 
                
                if (retries > CONFIG.MAX_PROBLEM_GENERATION_RETRIES) { 
                    console.warn(`Max retries reached for box ${boxIndex}, using potentially non-unique or fallback problem.`); 
                    if (!currentProblemData || !currentProblemData.problemString) { 
                        currentProblemData = { 
                            problemString: "1 + 1 = ?", 
                            answer: "2", 
                            type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT, 
                            requiresTextInput: false 
                        }; 
                    } 
                    break; 
                } 
            } 
            
            activeChallengeProblems[boxIndex] = currentProblemData; 
            
            const config = levelProblemConfig[currentChallengeLevel]; 
            const epValue = config ? config.ep : 0; 
            
            mathHeaderElements[boxIndex].textContent = `Problem ${boxIndex + 1} (+${epValue}⚡ EP)`; 
            mathProblemElements[boxIndex].textContent = currentProblemData.problemString; 
            
            const grid = mathMCGridElements[boxIndex]; 
            grid.innerHTML = ''; 
            
            if (!currentProblemData.answer || currentChallengeLevel === 0) { 
                grid.innerHTML = ''; 
                if (currentChallengeLevel === 0 || retries > CONFIG.MAX_PROBLEM_GENERATION_RETRIES) { 
                    mathProblemElements[boxIndex].textContent = "Select Difficulty"; 
                } 
                scheduleCompactMathDeckFit();
                return; 
            } 
            
            // Format the correct answer properly
            const rawCorrect = currentProblemData.answer;
            const correct = formatNumberForDisplay(rawCorrect);
            
            let wrongs = []; 
            let correctNum = parseFloat(rawCorrect); 
            let isNumeric = !isNaN(correctNum); 
            let used = new Set([correct]); 
            let tryCount = 0; 
            
            while (wrongs.length < 3 && tryCount < 50) { 
                let wrong; 
                
                if (isNumeric) { 
                    // For negative numbers, we need special handling to ensure sensible wrong answers
                    if (correctNum < 0) {
                        // For negative number questions, use sensible wrong answers:
                        // 1. Same absolute value but positive
                        // 2. Value with wrong sign in multiplication (-7 × -1 = -7 instead of 7)
                        // 3. Value with a small offset
                        
                        // Create distinct wrong answers based on known patterns that students make with negatives
                        let wrongOptions = [
                            -correctNum,                // Mistake: wrong sign
                            correctNum - 1,            // Off by 1 on negative side
                            correctNum + 1,            // Off by 1 on positive side
                            correctNum * 2,            // Doubled wrong (common error)
                            // For questions involving addition or subtraction of negatives:
                            Math.abs(correctNum)       // Forgot to maintain the sign
                        ];
                        
                        // Pick randomly from the wrong options
                        const randomIndex = Math.floor(Math.random() * wrongOptions.length);
                        let wrongValue = wrongOptions[randomIndex];
                        
                        // Ensure the wrong answer doesn't match the correct one
                        if (formatNumberForDisplay(wrongValue) === correct) {
                            wrongValue = correctNum - 2; // Try a different offset
                        }
                        
                        // Format the wrong answer properly
                        wrong = formatNumberForDisplay(wrongValue);
                    } else {
                        // For positive numbers, use the normal approach
                        let delta = Math.max(1, Math.round(Math.abs(correctNum) * 0.15) || 1); 
                        let sign = Math.random() < 0.5 ? -1 : 1; 
                        let offset = delta * (Math.floor(Math.random()*3)+1) * sign; 
                        
                        // Format the wrong answer properly
                        wrong = formatNumberForDisplay(correctNum + offset);
                        
                        if (wrong === correct) {
                            // Still a duplicate, try with a different offset
                            wrong = formatNumberForDisplay(correctNum + offset + 1);
                        }
                    }
                } else if (rawCorrect.includes('/')) { 
                    // Handle fraction type answers
                    let [num, den] = rawCorrect.split('/').map(Number); 
                    if (Math.random() < 0.5) 
                        num += Math.random() < 0.5 ? 1 : -1; 
                    else 
                        den += Math.random() < 0.5 ? 1 : -1; 
                    
                    if (den === 0) den = 2; 
                    wrong = `${num}/${den}`; 
                } else if (rawCorrect.match(/^\d*\.\d+$/)) { 
                    // Handle explicit decimal format
                    let val = parseFloat(rawCorrect); 
                    wrong = formatNumberForDisplay(val + (Math.random() < 0.5 ? 0.1 : -0.1));
                } else { 
                    // Handle non-numeric answers - add a character
                    wrong = rawCorrect + String.fromCharCode(65 + Math.floor(Math.random()*3)); 
                } 
                
                if (!used.has(wrong)) { 
                    wrongs.push(wrong); 
                    used.add(wrong); 
                } 
                tryCount++; 
            } 
            
            // Shuffle the choices
            let choices = [correct, ...wrongs]; 
            for (let i = choices.length - 1; i > 0; i--) { 
                const j = Math.floor(Math.random() * (i + 1)); 
                [choices[i], choices[j]] = [choices[j], choices[i]]; 
            } 
            
            // Create the choice buttons
            const labels = ['A', 'B', 'C', 'D']; 
            choices.forEach((choice, idx) => { 
                const btn = document.createElement('button'); 
                btn.className = 'mc-choice-btn'; 
                btn.innerHTML = `<span class='mc-choice-btn-label'>${labels[idx]}.</span> <span class='mc-choice-btn-answer'>${choice}</span>`; 
                btn.onclick = () => handleMCAnswer(boxIndex, choice, btn); 
                grid.appendChild(btn); 
            }); 
            
            // Set up problem timeout if needed
            if (currentProblemData.answer !== null && gameState === 'PLAYING' && currentChallengeLevel > 0) { 
                mathProblemTimers[boxIndex] = setTimeout(() => { 
                    if (gameState !== 'PLAYING') { 
                        if (mathProblemTimers[boxIndex]) 
                            clearTimeout(mathProblemTimers[boxIndex]); 
                        mathProblemTimers[boxIndex] = null; 
                        return; 
                    } 
                    
                    animateProblemTimeoutFlash(boxIndex); 
                    const newProblemData = generateProblemForCurrentLevel(boxIndex); 
                    activeChallengeProblems[boxIndex] = newProblemData; 
                    displayProblemInBox(boxIndex, newProblemData); 
                }, CONFIG.MATH_PROBLEM_TIMEOUT_MS); 
            } 

            scheduleCompactMathDeckFit();
        }
        // Pre-generated problem templates to eliminate complex calculation on selection
        const problemTemplates = {
            // Level 7 templates - pre-configured problems that satisfy Mixed Operations: Up to Two Digits
            7: [
                { problemString: "36 ÷ 6 - 3 = ?", answer: "3", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "12 + 18 ÷ 6 = ?", answer: "15", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "9 × 2 + 7 = ?", answer: "25", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "24 ÷ 8 × 3 = ?", answer: "9", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "50 - 10 × 3 = ?", answer: "20", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "(15 + 5) ÷ 4 = ?", answer: "5", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "27 + 24 ÷ 8 = ?", answer: "30", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false },
                { problemString: "60 ÷ (6 + 4) = ?", answer: "6", type: PROBLEM_TYPES.MULTI_STEP_ARITHMETIC_BASIC, requiresTextInput: false }
            ],
            // Level 8 templates - two-step equation problems
            8: [
                { problemString: "3x + 7 = 22", answer: "5", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "7x - 14 = 35", answer: "7", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "2x + 9 = 21", answer: "6", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "4x - 6 = 26", answer: "8", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "6x + 5 = 35", answer: "5", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "8x - 20 = 28", answer: "6", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "10x + 3 = 53", answer: "5", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "9x - 12 = 60", answer: "8", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "(5x) + 10 = 35", answer: "5", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "12 + 4x = 36", answer: "6", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "48 = 6x + 6", answer: "7", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false },
                { problemString: "75 = 25 + 5x", answer: "10", type: PROBLEM_TYPES.EQUATION_TWO_STEP, requiresTextInput: false }
            ]
        };
        
        function generateAndDisplayNewSetOfProblems() {
            if (currentChallengeLevel === 0) {
                clearAllMathProblemsDisplay();
                return;
            }
            
            // Ensure buttons are clickable whenever problems are generated
            setTimeout(ensureButtonClickability, 100);
            
            const newProblems = [];
            const usedProblemStrings = new Set();
            
            // Fast path for levels 7 and 8 - use pre-generated templates
            if (currentChallengeLevel === 7 || currentChallengeLevel === 8) {
                // Get 4 random problems from the templates without repetition
                const templates = [...problemTemplates[currentChallengeLevel]];
                for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) {
                    if (templates.length > 0) {
                        // Select a random template
                        const randomIndex = Math.floor(Math.random() * templates.length);
                        const template = templates.splice(randomIndex, 1)[0];
                        newProblems.push(template);
                    } else {
                        // Fallback if we run out of templates
                        const fallbackProblem = generateProblemForCurrentLevel(i);
                        newProblems.push(fallbackProblem);
                    }
                }
            } else {
                // Regular path for levels 1-6
                const MAX_TOTAL_RETRIES = 30;
                let totalRetries = 0;
                
                for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) {
                    let problemData;
                    let singleProblemRetries = 0;
                    const MAX_SINGLE_RETRIES = 5;
                    
                    do {
                        problemData = generateProblemForCurrentLevel(i);
                        singleProblemRetries++;
                        totalRetries++;
                        
                        if (singleProblemRetries > MAX_SINGLE_RETRIES && 
                            (!problemData || !problemData.problemString || usedProblemStrings.has(problemData.problemString))) {
                            
                            // Simple fallback for lower levels
                            problemData = {
                                problemString: `${i+1} + ${i+1} = ?`,
                                answer: ((i+1)*2).toString(),
                                type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
                                requiresTextInput: false
                            };
                            
                            let fallbackRetry = 0;
                            while (usedProblemStrings.has(problemData.problemString) && 
                                   fallbackRetry < CONFIG.NUM_CHALLENGE_PROBLEMS) {
                                
                                problemData.problemString = `${i+1} + ${i+1+fallbackRetry} = ?`;
                                problemData.answer = (i+1+i+1+fallbackRetry).toString();
                                fallbackRetry++;
                            }
                        }
                    } while (totalRetries <= MAX_TOTAL_RETRIES && 
                             (!problemData || !problemData.problemString || 
                              problemData.answer === null || problemData.answer === undefined || 
                              usedProblemStrings.has(problemData.problemString)));
                    
                    if (problemData && problemData.problemString) {
                        usedProblemStrings.add(problemData.problemString);
                        newProblems.push(problemData);
                    } else {
                        console.error(`Failed to generate unique problem for box ${i} after max retries.`);
                        const fallbackProblem = {
                            problemString: "Error!",
                            answer: "0",
                            type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
                            requiresTextInput: false
                        };
                        newProblems.push(fallbackProblem);
                        usedProblemStrings.add(fallbackProblem.problemString);
                    }
                }
            }
            
            // Update the active problems
            activeChallengeProblems = [...newProblems];
            
            // Display all the problems
            for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) {
                if (activeChallengeProblems[i]) {
                    displayProblemInBox(i, activeChallengeProblems[i]);
                } else {
                    console.error(`Problem for box ${i} is missing in activeChallengeProblems.`);
                    displayProblemInBox(i, {
                        problemString: "Select Difficulty",
                        answer: null,
                        type: null
                    });
                }
            }
        }
        function clearAllMathProblemsDisplay() { for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) { if (mathProblemTimers[i]) { clearTimeout(mathProblemTimers[i]); mathProblemTimers[i] = null; } mathHeaderElements[i].textContent = `Problem ${i + 1}`; mathProblemElements[i].textContent = "Select Difficulty"; mathMCGridElements[i].innerHTML = ''; } updateChallengeUI(); }
        function selectChallengeLevel(level, skipCost = false) { 
            // Prevent multiple rapid clicks from causing issues
            if (window.isSelectingChallengeLevel) {
                return;
            }
            
            // Set flag to prevent multiple concurrent executions
            window.isSelectingChallengeLevel = true;
            
            // Keep track of whether this is the first selection
            const isFirstSelection = currentChallengeLevel === 0;
            
            // Charge 1 EP for every difficulty selection/change EXCEPT:
            // 1. The very first difficulty selection (when currentChallengeLevel is 0)
            // 2. When skipCost is true (for math wizard animation)
            if (!isFirstSelection && !skipCost) {
                // Deduct 1 EP for clicking any difficulty level
                playerEnergy -= 1; 
                if (playerEnergy < 0) playerEnergy = 0;
                updateHUD();
            }
            
            // Set the level (whether same or different)
            currentChallengeLevel = level; 
            
            // Update the UI to highlight the selected button
            updateChallengeUI(); 
            
            // Provide immediate visual feedback
            const buttons = document.querySelectorAll('.difficulty-level-button');
            if (buttons && buttons[level-1]) {
                anime({
                    targets: buttons[level-1],
                    scale: [1, 1.2, 1],
                    duration: 300,
                    easing: 'easeInOutQuad'
                });
            }
            
            // Play a sound effect for feedback immediately
            // Use a try-catch to prevent any sound errors from breaking functionality
            try {
                playSound('lockClick');
            } catch (e) {
                console.error('Error playing sound:', e);
            }
            
            // For levels 7-8, show a brief loading indicator
            if (level >= 7) {
                for (let i = 0; i < CONFIG.NUM_CHALLENGE_PROBLEMS; i++) {
                    if (mathProblemElements[i]) {
                        mathProblemElements[i].textContent = "Loading...";
                    }
                }
            }
            
            // Generate problems based on template selection
            // No need for delay with the optimized templates for levels 7-8
            generateAndDisplayNewSetOfProblems();
            
            // Clear the flag after processing
            window.isSelectingChallengeLevel = false;
            
            // Ensure background music is playing
            // This section ensures audio context is resumed if browser has suspended it
            try {
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                    Howler.ctx.resume().then(() => {
                        // Make sure ambient music is playing after UI interaction
                        if (SOUNDS.ambient && !SOUNDS.ambient.playing()) {
                            SOUNDS.ambient.play();
                        }
                        // Make sure legendary music is playing if needed
                        const isLegendaryPet = currentPetRarityKey === 'legendary';
                        if (isLegendaryPet && SOUNDS.legendaryPet && !SOUNDS.legendaryPet.playing()) {
                            SOUNDS.legendaryPet.play();
                        }
                    }).catch(e => console.error('Failed to resume audio context:', e));
                } else {
                    // Direct check without context resume
                    if (SOUNDS.ambient && !SOUNDS.ambient.playing()) {
                        SOUNDS.ambient.play();
                    }
                    const isLegendaryPet = currentPetRarityKey === 'legendary';
                    if (isLegendaryPet && SOUNDS.legendaryPet && !SOUNDS.legendaryPet.playing()) {
                        SOUNDS.legendaryPet.play();
                    }
                }
            } catch (e) {
                console.error('Error handling audio:', e);
            }
        }
        function handleMCAnswer(boxIndex, userAnswer, btn) { 
            // Ensure this function responds to clicks even during animation phases
            // Only reject if game isn't in a state to accept answers
            if (gameState !== 'PLAYING') {
                debugLog('Math answer ignored: game not in PLAYING state');
                return;
            }
            
            if (currentChallengeLevel === 0 || !activeChallengeProblems[boxIndex] || activeChallengeProblems[boxIndex].answer === null) {
                debugLog('Math answer ignored: challenge level issue or no active problem');
                return;
            }
            
            // Log the answer attempt for debugging
            debugLog(`Math answer attempt: box=${boxIndex}, answer=${userAnswer}, correct=${activeChallengeProblems[boxIndex].answer}`);
            
            // Immediately show visual feedback by changing button appearance
            if (btn) {
                btn.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    if (btn) btn.style.transform = '';
                }, 150);
            } 
            
            // Get the correct answer and format it consistently
            const rawCorrectAnswer = activeChallengeProblems[boxIndex].answer.toString();
            const correctAnswer = formatNumberForDisplay(rawCorrectAnswer);
            const formattedUserAnswer = formatNumberForDisplay(userAnswer);
            const problemType = activeChallengeProblems[boxIndex].type; 
            
            // Clear any existing timer for this problem
            if (mathProblemTimers[boxIndex]) { 
                clearTimeout(mathProblemTimers[boxIndex]); 
                mathProblemTimers[boxIndex] = null; 
            } 
            
            // Check if the answer is correct
            let isCorrect = false; 
            
            // Compare the formatted answers for consistency
            if (formattedUserAnswer === correctAnswer) { 
                isCorrect = true; 
            } 
            // Handle special cases for money operations that need additional comparison
            else if (activeChallengeProblems[boxIndex].requiresTextInput && 
                      problemType === PROBLEM_TYPES.MONEY_OPERATIONS) { 
                // For numeric answers, try parsing and comparing as numbers for floating point tolerance
                const userNum = parseFloat(userAnswer);
                const correctNum = parseFloat(rawCorrectAnswer);
                if (!isNaN(userNum) && !isNaN(correctNum) && Math.abs(userNum - correctNum) < 0.0001) {
                    isCorrect = true;
                }
            } 
            
            // Disable all buttons in this grid after an answer is selected
            const grid = mathMCGridElements[boxIndex]; 
            Array.from(grid.children).forEach(b => b.disabled = true); 
            
            if (isCorrect) { 
                // Check if Math Wizard is currently solving problems
                // If so, don't award individual points as they'll be awarded as a bulk sum later
                if (!window.mathWizardSolvingProblems) {
                    // Only award energy points if the Math Wizard is not active
                    playerEnergy += levelProblemConfig[currentChallengeLevel].ep;
                }
                
                // Show animation and play correct answer sound
                animateMathFeedback(boxIndex, true); 
                
                // Play the correct answer sound effect
                playSound('correctAnswer'); 
                
                // Generate new problem after a delay
                setTimeout(() => { 
                    let newProblemData; 
                    let regenRetries = 0; 
                    do { 
                        newProblemData = generateProblemForCurrentLevel(boxIndex); 
                        regenRetries++; 
                        if (regenRetries > CONFIG.MAX_PROBLEM_GENERATION_RETRIES && 
                            (!newProblemData || !newProblemData.problemString)) { 
                            newProblemData = { 
                                problemString: "1 + 1 = ?", 
                                answer: "2", 
                                type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT, 
                                requiresTextInput: false 
                            }; 
                            break; 
                        } 
                    } while (regenRetries <= CONFIG.MAX_PROBLEM_GENERATION_RETRIES && 
                             activeChallengeProblems.some((p, idx) => 
                                idx !== boxIndex && p && p.problemString === newProblemData.problemString)); 
                    
                    activeChallengeProblems[boxIndex] = newProblemData; 
                    displayProblemInBox(boxIndex, newProblemData); 
                    updateHUD(); 
                }, 600); 
            } else { 
                // Wrong answer handling
                animateElementShake(mathBoxElements[boxIndex]); 
                
                // Apply stress penalty with rarity-specific multiplier
                let penalty = CONFIG.JOLT_STRESS_INCREASE; 
                if (currentChallengeLevel >= 2) { 
                    penalty = CONFIG.JOLT_STRESS_INCREASE * (1 + 0.25 * (currentChallengeLevel - 1)); 
                }
                const rarityStressMultiplier = CONFIG.PET_RARITIES[currentPetRarityKey]?.stressMultiplier || 1.0;
                chainStress += penalty * rarityStressMultiplier; 
                chainStress = Math.min(chainStress, CONFIG.MAX_STRESS); 
                updateHUD(); 
                animateCageJolt(); 
                
                // Generate new problem after a delay
                setTimeout(() => { 
                    let newProblemData; 
                    let regenRetries = 0; 
                    do { 
                        newProblemData = generateProblemForCurrentLevel(boxIndex); 
                        regenRetries++; 
                        if (regenRetries > CONFIG.MAX_PROBLEM_GENERATION_RETRIES && 
                            (!newProblemData || !newProblemData.problemString)) { 
                            newProblemData = { 
                                problemString: "2 + 2 = ?", 
                                answer: "4", 
                                type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT, 
                                requiresTextInput: false 
                            }; 
                            break; 
                        } 
                    } while (regenRetries <= CONFIG.MAX_PROBLEM_GENERATION_RETRIES && 
                             activeChallengeProblems.some((p, idx) => 
                                idx !== boxIndex && p && p.problemString === newProblemData.problemString)); 
                    
                    activeChallengeProblems[boxIndex] = newProblemData; 
                    displayProblemInBox(boxIndex, newProblemData); 
                }, 900); 
            } 
        }
        function updateChallengeUI() {
            document.querySelectorAll('.difficulty-level-button').forEach((button) => {
                if (parseInt(button.dataset.level) === currentChallengeLevel) {
                    button.classList.add('active-difficulty-button');
                } else {
                    button.classList.remove('active-difficulty-button');
                }
            });

            const isAwaitingSelection = currentChallengeLevel === 0;
            if (epChallengePanel) {
                epChallengePanel.classList.toggle('is-awaiting-selection', isAwaitingSelection);
            }

            if (epChallengeButtonsContainer) {
                epChallengeButtonsContainer.setAttribute('data-awaiting-selection', isAwaitingSelection ? 'true' : 'false');
            }

            if (epDifficultyCallout) {
                epDifficultyCallout.textContent = 'Select Math Difficulty';
            }
        }

        // IX. ANIMATIONS
        // Variables to track legendary pet effects
        let legendaryJoltTimer = null;
        let petRarityEffects = null;

        function animateCageJolt(isLegendaryJolt = false) { 
            if (!cage || !pet || !pet.parent || pet.parent !== cage || isJolting) return; 
            isJolting = true;
            
            // Legendary pets rattle cage more intensely
            const intensityMultiplier = isLegendaryJolt ? 1.5 : 1.0;
            
            triggerJoltVisualEffect();
            playSound('jolt');
            
            // Add screen shake effect for legendary pets
            if (isLegendaryJolt) {
                animateScreenShake(intensityMultiplier);
            }
            // Apply rarity-specific stress multiplier to jolt stress
            const rarityStressMultiplier = CONFIG.PET_RARITIES[currentPetRarityKey]?.stressMultiplier || 1.0;
            chainStress += CONFIG.JOLT_STRESS_INCREASE * intensityMultiplier * rarityStressMultiplier;
            chainStress = Math.min(chainStress, CONFIG.MAX_STRESS);
            updateHUD();
            
            if (chainStress >= CONFIG.MAX_STRESS && gameState === 'PLAYING') {
                // Temporarily stop heartbeat
                stopHeartbeat();
                
                // Pet lost - chain snapped, but game continues
                handlePetLost("Chain snapped!");
                isJolting = false;
                return;
            }
            
            const currentCagePos = cage.position.clone();
            const currentCageRot = cage.rotation.clone();
            const initialPetPos = pet.position.clone();
            
            // Legendary pets have more intense jolts
            const joltIntensityPos = 0.3 * intensityMultiplier;
            const joltIntensityRot = 0.2 * intensityMultiplier;
            const petJumpHeight = 0.3 * intensityMultiplier;
            const joltDuration = isLegendaryJolt ? 450 : 350; // Longer animations for legendary pets
            
            anime.remove(cage.position);
            anime.remove(cage.rotation); 
            
            anime({ 
                targets: cage.position, 
                x: [
                    { value: currentCagePos.x + (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.2 }, 
                    { value: currentCagePos.x - (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.5 }, 
                    { value: currentCagePos.x, duration: joltDuration * 0.3 }
                ],
                y: [
                    { value: currentCagePos.y + (Math.random() - 0.5) * joltIntensityPos * 0.5, duration: joltDuration * 0.2 }, 
                    { value: currentCagePos.y - (Math.random() - 0.5) * joltIntensityPos * 0.5, duration: joltDuration * 0.5 }, 
                    { value: currentCagePos.y, duration: joltDuration * 0.3 }
                ],
                z: [
                    { value: currentCagePos.z + (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.2 }, 
                    { value: currentCagePos.z - (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.5 }, 
                    { value: currentCagePos.z, duration: joltDuration * 0.3 }
                ],
                easing: 'linear', 
                duration: joltDuration 
            }); 
            
            anime({ 
                targets: cage.rotation, 
                z: [
                    { value: currentCageRot.z + (Math.random() - 0.5) * joltIntensityRot, duration: joltDuration * 0.25 }, 
                    { value: currentCageRot.z - (Math.random() - 0.5) * joltIntensityRot, duration: joltDuration * 0.5 }, 
                    { value: currentCageRot.z, duration: joltDuration * 0.25 }
                ],
                easing: 'linear', 
                duration: joltDuration, 
                complete: () => { 
                    isJolting = false; 
                } 
            }); 
            
            const initialChainLinkTransforms = chainLinks.map(link => ({ 
                position: link.position.clone(), 
                rotation: link.rotation.clone() 
            })); 
            
            chainLinks.forEach((link, index) => { 
                anime.remove(link.position); 
                anime.remove(link.rotation); 
                
                anime({ 
                    targets: link.position, 
                    x: [
                        { value: initialChainLinkTransforms[index].position.x + (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.2 }, 
                        { value: initialChainLinkTransforms[index].position.x - (Math.random() - 0.5) * joltIntensityPos, duration: joltDuration * 0.5 }, 
                        { value: initialChainLinkTransforms[index].position.x, duration: joltDuration * 0.3 }
                    ],
                    y: [
                        { value: initialChainLinkTransforms[index].position.y + (Math.random() - 0.5) * joltIntensityPos * 0.5, duration: joltDuration * 0.2 }, 
                        { value: initialChainLinkTransforms[index].position.y - (Math.random() - 0.5) * joltIntensityPos * 0.5, duration: joltDuration * 0.5 }, 
                        { value: initialChainLinkTransforms[index].position.y, duration: joltDuration * 0.3 }
                    ],
                    z: [
                        { value: initialChainLinkTransforms[index].position.z + (Math.random() - 0.5) * joltIntensityPos * 0.2, duration: joltDuration * 0.2 }, 
                        { value: initialChainLinkTransforms[index].position.z, duration: joltDuration * 0.8 }
                    ],
                    easing: 'linear', 
                    duration: joltDuration 
                }); 
                
                anime({ 
                    targets: link.rotation, 
                    z: [
                        { value: initialChainLinkTransforms[index].rotation.z + (Math.random() - 0.5) * joltIntensityRot, duration: joltDuration * 0.25 }, 
                        { value: initialChainLinkTransforms[index].rotation.z - (Math.random() - 0.5) * joltIntensityRot, duration: joltDuration * 0.5 }, 
                        { value: initialChainLinkTransforms[index].rotation.z, duration: joltDuration * 0.25 }
                    ],
                    easing: 'linear', 
                    duration: joltDuration 
                }); 
            }); 
            
            anime.remove(pet.position); 
            anime({ 
                targets: pet.position, 
                y: [
                    { value: initialPetPos.y + petJumpHeight, duration: 100, easing: 'easeOutQuad' }, 
                    { value: initialPetPos.y, duration: 150, easing: 'easeInCubic' }
                ],
                complete: () => {
                    // Ensure pet returns to exact initial position to prevent sticking
                    if (pet && pet.position) {
                        pet.position.y = initialPetPos.y;
                        debugLog('🐾 Pet position reset after jolt to prevent sticking');
                    }
                }
            }); 
        }
        function animateStressFairy() { if (!scene || !cage || stressFairyObject) return; actionButtons.stressFairy.disabled = true; stressFairyObject = new THREE.Group(); const fairyCoreGeo = new THREE.SphereGeometry(0.1, 12, 8); const fairyCoreMat = new THREE.MeshBasicMaterial({ color: 0x87cefa, transparent: true, opacity: 0.8 }); const fairyCore = new THREE.Mesh(fairyCoreGeo, fairyCoreMat); stressFairyObject.add(fairyCore); const fairyLight = new THREE.PointLight(0xadd8e6, 1.5, 3); fairyLight.position.set(0, 0, 0); stressFairyObject.add(fairyLight); const particleCount = 50; const particlesGeo = new THREE.BufferGeometry(); const positions = new Float32Array(particleCount * 3); for (let i = 0; i < particleCount * 3; i++) { positions[i] = (Math.random() - 0.5) * 0.5; } particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, sizeAttenuation: true }); const fairyParticles = new THREE.Points(particlesGeo, particleMat); stressFairyObject.add(fairyParticles); stressFairyObject.position.set(-5, cage.position.y + 2, 0); scene.add(stressFairyObject); const tl = anime.timeline({ easing: 'easeInOutSine', duration: 4000, complete: () => { const reduction = CONFIG.MAX_STRESS * CONFIG.STRESS_REDUCTION_AMOUNT; chainStress = Math.max(0, chainStress - reduction); updateHUD(); scene.remove(stressFairyObject); fairyCoreGeo.dispose(); fairyCoreMat.dispose(); particlesGeo.dispose(); particleMat.dispose(); stressFairyObject = null; actionButtons.stressFairy.disabled = false; } }); const cageY = cage.position.y + 0.5, radiusX = 2.5, radiusZ = 1.5; tl.add({ targets: stressFairyObject.position, x: 0, y: cageY, z: radiusZ, duration: 1000, easing: 'easeOutQuad' }).add({ targets: stressFairyObject.position, x: (t) => Math.sin(t * Math.PI) * radiusX, z: (t) => Math.cos(t * Math.PI) * radiusZ, y: cageY + 0.2, duration: 1500, easing: 'linear', update: () => { fairyParticles.rotation.y += 0.1; fairyLight.intensity = 1.5 + Math.sin(performance.now() / 100) * 0.5; } }, '-=500').add({ targets: stressFairyObject.position, x: (t) => Math.sin(Math.PI + t * Math.PI) * radiusX, z: (t) => Math.cos(Math.PI + t * Math.PI) * radiusZ, y: cageY - 0.2, duration: 1500, easing: 'linear', update: () => { fairyParticles.rotation.y += 0.1; fairyLight.intensity = 1.5 + Math.sin(performance.now() / 100) * 0.5; } }, '-=500').add({ targets: stressFairyObject.position, x: 5, y: cageY + 1, z: 0, duration: 1000, easing: 'easeInQuad' }, '-=500'); tl.add({ targets: [fairyCoreMat, particleMat], opacity: 0, duration: 500, easing: 'linear' }, '-=700').add({ targets: fairyLight, intensity: 0, duration: 500, easing: 'linear' }, '-=700'); }
        function animateElementShake(element) { if (!element) return; playSound('errorSound'); const originalBorder = element.style.borderColor; const originalInlineTransform = element.style.transform; anime.remove(element); anime({ targets: element, translateX: [{ value: 8, duration: 50 }, { value: -8, duration: 100 }, { value: 8, duration: 100 }, { value: -8, duration: 100 }, { value: 0, duration: 50 }], borderColor: ['#ff0000', originalBorder || 'rgba(100, 100, 150, 0.5)'], duration: 400, easing: 'easeInOutSine', complete: () => { if (originalInlineTransform) { element.style.transform = originalInlineTransform; } else { element.style.removeProperty('transform'); } element.style.borderColor = originalBorder || ''; } }); }
        function triggerJoltVisualEffect() { if (!scene || !ambientLight || !cage) return; const originalAmbientIntensity = ambientLight.intensity; ambientLight.intensity = Math.min(2.5, originalAmbientIntensity + 1.5); const joltFlashLight = new THREE.PointLight(0xccddff, 5, 50); joltFlashLight.position.copy(cage.position).add(new THREE.Vector3(0, 1, 0)); scene.add(joltFlashLight); setTimeout(() => { ambientLight.intensity = originalAmbientIntensity; scene.remove(joltFlashLight); joltFlashLight.dispose(); }, 100); }
        
        // Handle pet lost without ending the game
        function handlePetLost(reason) {
            if (gameState !== 'PLAYING' || gameState === 'TRANSITIONING') return;
            
            // Update lost pets counter and deduct points
            scoreData.lostPetsCount++;
            const pointsLost = 200; // 200 points lost per pet
            scoreData.lostPoints = scoreData.lostPetsCount * pointsLost;
            
            // Update the score display
            updateScorePanelDOM();
            
            // Update game state to transitioning to prevent further interactions
            gameState = 'TRANSITIONING';
            
            // Clear legendary jolt timer if it exists
            if (legendaryJoltTimer) {
                clearInterval(legendaryJoltTimer);
                legendaryJoltTimer = null;
            }
            
            // Clean up any pet rarity visual effects
            cleanupPetRarityEffects();
            
            // Show temporary notification that pet was lost
            const petLostMessage = document.createElement('div');
            petLostMessage.style.position = 'absolute';
            petLostMessage.style.top = '40%';
            petLostMessage.style.left = '50%';
            petLostMessage.style.transform = 'translate(-50%, -50%)';
            petLostMessage.style.color = '#ff3b30';
            petLostMessage.style.fontSize = '2em';
            petLostMessage.style.fontWeight = 'bold';
            petLostMessage.style.textShadow = '0 0 10px rgba(0,0,0,0.7)';
            petLostMessage.style.zIndex = '100';
            petLostMessage.style.backgroundColor = 'rgba(0,0,0,0.5)';
            petLostMessage.style.padding = '15px 25px';
            petLostMessage.style.borderRadius = '10px';
            petLostMessage.textContent = 'Pet Lost: ' + reason;
            document.body.appendChild(petLostMessage);
            
            // Play the chain snap sound with increased volume for dramatic effect
            if (SOUNDS.chainSnap) {
                SOUNDS.chainSnap.volume(0.8);
                playSound('chainSnap');
            }
            
            // Handle special audio transition for legendary pets
            if (currentPetRarityKey === 'legendary') {
                // Use a short fade-out for the legendary pet sound just like in successful rescues
                if (SOUNDS.legendaryPet && SOUNDS.legendaryPet.playing()) {
                    // Save current volume for smoother transition
                    const currentVolume = SOUNDS.legendaryPet.volume();
                    
                    // Quick fade-out (300ms) to match the dramatic moment of chain breaking
                    SOUNDS.legendaryPet.fade(currentVolume, 0, 300);
                    
                    // Ensure sound stops completely after fade-out
                    setTimeout(() => {
                        if (SOUNDS.legendaryPet.playing()) {
                            SOUNDS.legendaryPet.stop();
                            debugLog('Legendary pet sound stopped after chain snap');
                        }
                    }, 350);
                }
                
                // Restore background music with a nice fade-in after a short delay
                setTimeout(() => {
                    if (SOUNDS.ambient) {
                        // First, ensure any currently playing ambient sound is stopped
                        if (SOUNDS.ambient.playing()) {
                            SOUNDS.ambient.stop();
                        }
                        
                        // Check if we have saved music state to restore
                        if (window.savedMusicState && window.savedMusicState.wasPlaying) {
                            // Start a fresh instance from the saved position
                            SOUNDS.ambient.volume(0); // Start silent
                            SOUNDS.ambient.play();
                            
                            // Try to seek to the saved position if available
                            try {
                                if (window.savedMusicState.position) {
                                    SOUNDS.ambient.seek(window.savedMusicState.position);
                                }
                            } catch (e) {
                                console.warn('Could not seek to saved position:', e);
                            }
                            
                            // Fade to the original saved volume or default if unavailable
                            const targetVolume = window.savedMusicState.volume || CONFIG.MUSIC_VOLUME;
                            SOUNDS.ambient.fade(0, targetVolume, 1000); // 1 second fade-in for dramatic effect
                        } else {
                            // No saved state, just start background music normally
                            SOUNDS.ambient.volume(0);
                            SOUNDS.ambient.play();
                            SOUNDS.ambient.fade(0, CONFIG.MUSIC_VOLUME, 1000);
                        }
                    }
                }, 600); // Slightly longer delay for more dramatic effect between sounds
            }
            
            // Create a dramatic screen shake effect
            animateScreenShake(3.0); // Higher intensity for chain breaking
            
            // Animate the chain links breaking and flying off
            if (chainLinks && chainLinks.length > 0) {
                chainLinks.forEach((link, index) => {
                    // Stop any existing animations
                    anime.remove(link.position);
                    anime.remove(link.rotation);
                    
                    // Create random directions for chain links to scatter
                    const randomX = (Math.random() - 0.5) * 5;
                    const randomZ = (Math.random() - 0.5) * 5;
                    
                    // Animate the links flying off in random directions
                    anime({
                        targets: link.position,
                        x: [link.position.x, link.position.x + randomX],
                        y: [link.position.y, link.position.y - (5 + index * 0.5)],
                        z: [link.position.z, link.position.z + randomZ],
                        duration: 1500,
                        delay: index * 50, // Sequential breaking effect
                        easing: 'easeInQuad'
                    });
                    
                    // Add spin to the links as they fall
                    anime({
                        targets: link.rotation,
                        x: link.rotation.x + Math.PI * 4 * (Math.random() - 0.5),
                        y: link.rotation.y + Math.PI * 4 * (Math.random() - 0.5),
                        z: link.rotation.z + Math.PI * 4 * (Math.random() - 0.5),
                        duration: 1500,
                        easing: 'easeInOutQuad'
                    });
                });
            }
            
            // Animate the cage falling into the lava with a dramatic effect
            if (pet && cage && pet.parent === cage) {
                // Flash the scene for dramatic effect
                const flashOverlay = document.createElement('div');
                flashOverlay.style.position = 'absolute';
                flashOverlay.style.top = '0';
                flashOverlay.style.left = '0';
                flashOverlay.style.width = '100%';
                flashOverlay.style.height = '100%';
                flashOverlay.style.backgroundColor = 'white';
                flashOverlay.style.opacity = '0';
                flashOverlay.style.pointerEvents = 'none';
                flashOverlay.style.zIndex = '99';
                document.body.appendChild(flashOverlay);
                
                // Flash effect
                anime({
                    targets: flashOverlay,
                    opacity: [0, 0.7, 0],
                    duration: 300,
                    easing: 'linear',
                    complete: () => {
                        document.body.removeChild(flashOverlay);
                    }
                });
                
                // Add spin and falling animation
                const fallTl = anime.timeline({
                    easing: 'easeInQuad',
                    complete: function() {
                        // Add a splash effect when the cage hits the lava
                        playSound('cageHit');
                        
                        // Fade out the message
                        anime({
                            targets: petLostMessage,
                            opacity: [1, 0],
                            duration: 800,
                            easing: 'easeOutQuad',
                            complete: () => {
                                if (document.body.contains(petLostMessage)) {
                                    document.body.removeChild(petLostMessage);
                                }
                            }
                        });
                        
                        // After the cage falls completely, transition to the next pet
                        setTimeout(() => {
                            // Determine the next pet rarity
                            const nextRarity = determineNextPetRarity();
                            transitionToNextPet(nextRarity);
                        }, 1000);
                    }
                });
                
                // Initial wobble before falling
                fallTl.add({
                    targets: cage.rotation,
                    z: [0, Math.PI/12, -Math.PI/8, Math.PI/10, 0],
                    duration: 600,
                    easing: 'easeInOutSine'
                })
                // Then start falling with increasing speed
                .add({
                    targets: cage.position,
                    y: [cage.position.y, -15],
                    duration: 1500,
                    easing: 'easeInQuad'
                }, '-=200')
                // Add rotation as it falls
                .add({
                    targets: cage.rotation,
                    x: [0, Math.PI/4 * (Math.random() > 0.5 ? 1 : -1)],
                    z: [cage.rotation.z, Math.PI * (Math.random() > 0.5 ? 1 : -1)],
                    duration: 1500
                }, '-=1500');
            } else {
                // If there's no cage to animate, just transition directly after a delay
                setTimeout(() => {
                    anime({
                        targets: petLostMessage,
                        opacity: [1, 0],
                        duration: 800,
                        easing: 'easeOutQuad',
                        complete: () => {
                            if (document.body.contains(petLostMessage)) {
                                document.body.removeChild(petLostMessage);
                            }
                            
                            // Determine the next pet rarity
                            const nextRarity = determineNextPetRarity();
                            transitionToNextPet(nextRarity);
                        }
                    });
                }, 1500);
            }
        }
        
        // Function to create a screen shake effect for legendary pets
        function animateScreenShake(intensityMultiplier = 1.0) {
            if (!camera || gameState !== 'PLAYING') return;
            
            // Save the original camera position
            const originalPosition = camera.position.clone();
            
            // Calculate shake intensity (stronger for legendary jolts)
            const shakeIntensity = 0.08 * intensityMultiplier;
            const shakeDuration = 400 * intensityMultiplier;
            
            // Create the screen shake animation
            anime.remove(camera.position);
            anime({
                targets: camera.position,
                x: [
                    { value: originalPosition.x + (Math.random() - 0.5) * shakeIntensity, duration: shakeDuration * 0.25 },
                    { value: originalPosition.x - (Math.random() - 0.5) * shakeIntensity, duration: shakeDuration * 0.25 },
                    { value: originalPosition.x + (Math.random() - 0.5) * shakeIntensity * 0.5, duration: shakeDuration * 0.25 },
                    { value: originalPosition.x, duration: shakeDuration * 0.25 }
                ],
                y: [
                    { value: originalPosition.y + (Math.random() - 0.5) * shakeIntensity, duration: shakeDuration * 0.25 },
                    { value: originalPosition.y - (Math.random() - 0.5) * shakeIntensity, duration: shakeDuration * 0.25 },
                    { value: originalPosition.y + (Math.random() - 0.5) * shakeIntensity * 0.5, duration: shakeDuration * 0.25 },
                    { value: originalPosition.y, duration: shakeDuration * 0.25 }
                ],
                easing: 'easeInOutSine',
                duration: shakeDuration
            });
        }
        
        // Create visual effects for rare and legendary pets
        function createPetRarityEffects(petRarity) {
            // Clean up any existing effects first
            cleanupPetRarityEffects();
            
            if (!pet || !scene) return;
            
            // Create a group to hold all effects
            petRarityEffects = new THREE.Group();
            petRarityEffects.name = 'rarityEffects';
            
            if (petRarity === 'rare') {
                // Rare pets get a subtle glow
                const glow = new THREE.PointLight(0x6495ED, 0.8, 1.5);
                petRarityEffects.add(glow);
                
                // Add a subtle pulsing animation to the glow
                const glowAnimation = anime({
                    targets: glow,
                    intensity: [0.8, 1.2, 0.8],
                    duration: 2000,
                    easing: 'easeInOutSine',
                    loop: true
                });
                
                // Store the animation for later cleanup
                petRarityEffects.userData.animations = [glowAnimation];
                
            } else if (petRarity === 'legendary') {
                // Legendary pets get a more dramatic effect
                
                // Add intense glow
                const glow = new THREE.PointLight(0xffd700, 1.0, 2);
                petRarityEffects.add(glow);
                
                // Add particle system for sparkles
                const particleCount = 30;
                const particlesGeo = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                
                // Position particles in a sphere around the pet
                for (let i = 0; i < particleCount * 3; i += 3) {
                    const radius = 0.5 + Math.random() * 0.3;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    
                    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[i+1] = radius * Math.sin(phi) * Math.sin(theta) + 0.2; // Lift slightly above pet center
                    positions[i+2] = radius * Math.cos(phi);
                }
                
                particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                
                // Use additive blending for a glowing effect
                const particleMat = new THREE.PointsMaterial({
                    color: 0xffd700,
                    size: 0.035,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending,
                    sizeAttenuation: true
                });
                
                const particles = new THREE.Points(particlesGeo, particleMat);
                petRarityEffects.add(particles);
                
                // Add rotating animation to particles
                const particleRotation = { y: 0 };
                const particleAnimation = anime({
                    targets: particleRotation,
                    y: Math.PI * 2,
                    duration: 10000,
                    easing: 'linear',
                    loop: true,
                    update: () => {
                        if (particles) particles.rotation.y = particleRotation.y;
                    }
                });
                
                // Pulse animation for glow
                const glowAnimation = anime({
                    targets: glow,
                    intensity: [1.0, 1.8, 1.0],
                    duration: 1500,
                    easing: 'easeInOutSine',
                    loop: true
                });
                
                // Store animations for later cleanup
                petRarityEffects.userData.animations = [particleAnimation, glowAnimation];
                petRarityEffects.userData.geometries = [particlesGeo];
                petRarityEffects.userData.materials = [particleMat];
            }
            
            // Attach effects to the pet
            if (petRarityEffects.children.length > 0) {
                pet.add(petRarityEffects);
            }
        }
        
        // Clean up rarity effects
        function cleanupPetRarityEffects() {
            if (!petRarityEffects) return;
            
            // Stop all animations
            if (petRarityEffects.userData.animations) {
                petRarityEffects.userData.animations.forEach(animation => {
                    if (animation) animation.pause();
                });
            }
            
            // Remove from scene
            if (petRarityEffects.parent) {
                petRarityEffects.parent.remove(petRarityEffects);
            }
            
            // Dispose of geometries and materials
            if (petRarityEffects.userData.geometries) {
                petRarityEffects.userData.geometries.forEach(geo => {
                    if (geo) geo.dispose();
                });
            }
            
            if (petRarityEffects.userData.materials) {
                petRarityEffects.userData.materials.forEach(mat => {
                    if (mat) mat.dispose();
                });
            }
            
            // Clear reference
            petRarityEffects = null;
        }
        function animateMathFeedback(boxIndex, isCorrect) { const cell = mathBoxElements[boxIndex]; if (!cell) return; const color = isCorrect ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'; const originalColor = 'rgba(20, 20, 30, 0.65)'; anime({ targets: cell, backgroundColor: [color, originalColor], duration: 400, easing: 'easeOutQuad' }); }
        function animateProblemTimeoutFlash(boxIndex) { const cell = mathBoxElements[boxIndex]; if (!cell) return; const defaultGlow = '0 0 12px 3px rgba(255, 255, 255, 0.7)'; const intenseBlueGlow = '0 0 40px 16px rgba(0, 60, 255, 1)'; const blueBg = 'rgba(0, 60, 255, 0.22)'; const originalBg = 'rgba(20, 20, 30, 0.65)'; anime.remove(cell); cell.style.boxShadow = defaultGlow; cell.style.backgroundColor = originalBg; anime({ targets: cell, boxShadow: [ { value: intenseBlueGlow, duration: 500, easing: 'easeOutQuad' }, { value: defaultGlow, duration: 1000, easing: 'easeInQuad' } ], backgroundColor: [ { value: blueBg, duration: 500, easing: 'easeOutQuad' }, { value: originalBg, duration: 1000, easing: 'easeInQuad' } ], loop: false }); playSound('newRandomQuestion'); }
        function triggerButtonActivationEffect(buttonElement) { if (!buttonElement) return; anime({ targets: buttonElement, scale: [1, 1.1, 1], duration: 200, easing: 'easeInOutSine' }); }

        // X. GAME LOGIC & CORE MECHANICS
        function startGame() {
            // Reset game state (which now includes resetting all upgrades)
            resetGameState(); 
            gameState = 'INTRO';
            const heroFraming = getCageHeroFraming();
            if (heroFraming) {
                camera.position.copy(heroFraming.introPosition);
                if (controls) {
                    controls.target.copy(heroFraming.target);
                    controls.update();
                } else {
                    camera.lookAt(heroFraming.target);
                }
            } else {
                camera.position.set(5.2, 2, 1.2);
                camera.lookAt(0, 1, 0);
                if (controls) {
                    controls.target.set(0, 1, 0);
                    controls.update();
                }
            }
            swingPhaseOffset = Math.PI / 2; lastFrameTime = performance.now(); swingBaseTime = performance.now();

            const introCameraTargets = heroFraming || {
                target: new THREE.Vector3(0, 1, 0),
                position: new THREE.Vector3(0, 2, 5.1),
            };
            const introCameraState = {
                camX: camera.position.x,
                camY: camera.position.y,
                camZ: camera.position.z,
                targetX: controls ? controls.target.x : introCameraTargets.target.x,
                targetY: controls ? controls.target.y : introCameraTargets.target.y,
                targetZ: controls ? controls.target.z : introCameraTargets.target.z,
            };

            anime({
                targets: introCameraState,
                camX: introCameraTargets.position.x,
                camY: introCameraTargets.position.y,
                camZ: introCameraTargets.position.z,
                targetX: introCameraTargets.target.x,
                targetY: introCameraTargets.target.y,
                targetZ: introCameraTargets.target.z,
                duration: 3000,
                easing: 'easeInOutQuad',
                update: () => {
                    camera.position.set(introCameraState.camX, introCameraState.camY, introCameraState.camZ);
                    if (controls) {
                        controls.target.set(introCameraState.targetX, introCameraState.targetY, introCameraState.targetZ);
                        controls.update();
                    } else {
                        camera.lookAt(introCameraState.targetX, introCameraState.targetY, introCameraState.targetZ);
                    }
                },
                complete: () => {
                    if (controls) {
                        controls.target.set(introCameraTargets.target.x, introCameraTargets.target.y, introCameraTargets.target.z);
                        controls.update();
                    } else {
                        camera.lookAt(introCameraTargets.target);
                    }
                    gameState = 'PLAYING'; lastFrameTime = performance.now();
                    const now = performance.now(); const elapsed = (now - swingBaseTime) / 1000;
                    const swingFrequency = 0.5 + (isGrumpy ? 0.5 : 0);
                    const currentPhase = elapsed * swingFrequency + swingPhaseOffset;
                    swingBaseTime = now - (currentPhase - swingPhaseOffset) / swingFrequency * 1000;

                    // Reset real-time timer tracking with the saved timer value
                    realTimeTimerStart = performance.now();
                    realTimeElapsed = gameTime; // gameTime should already have the saved value from loadCoreGameSettings
                    initialGameTime = gameTime; // Ensure initialGameTime matches the saved value
                    
                    // Update timer display immediately to show correct time
                    const minutes = Math.floor(gameTime / 60);
                    const seconds = Math.floor(gameTime % 60);
                    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    debugLog(`Game starting with timer: ${minutes}:${seconds.toString().padStart(2, '0')} (${gameTime}s)`);
                    
                    // We no longer need this interval since we're using the animation frame
                    // for real-time timer updates, but keep a placeholder for compatibility
                    timerInterval = setInterval(() => {
                        // This interval is now just a backup and doesn't actually update the timer
                        // The real timer update happens in the animation loop via updateTimerDisplay()
                    }, 1000);
                    
                    mathBoxElements.forEach(cell => cell.style.opacity = 1);
                    if (currentChallengeLevel > 0) { generateAndDisplayNewSetOfProblems(); } 
                    else { clearAllMathProblemsDisplay(); }

                    if (SOUNDS.ambient && SOUNDS.ambient.state() === 'loaded') { if (!SOUNDS.ambient.playing()) SOUNDS.ambient.play(); SOUNDS.ambient.fade(SOUNDS.ambient.volume(), 0.3, 500); }
                    if (SOUNDS.lava && SOUNDS.lava.state() === 'loaded') { if (!SOUNDS.lava.playing()) SOUNDS.lava.play(); SOUNDS.lava.fade(SOUNDS.lava.volume(), 0.2, 500); }
                    if (SOUNDS.chainSwing && SOUNDS.chainSwing.state() === 'loaded') { if (!SOUNDS.chainSwing.playing()) SOUNDS.chainSwing.play(); SOUNDS.chainSwing.fade(SOUNDS.chainSwing.volume(), 0.1, 500); }

                    if (lightningTimeoutId) clearTimeout(lightningTimeoutId);
        if (cloudSpawnTimeoutId) clearTimeout(cloudSpawnTimeoutId);
                    const initialLightningDelay = CONFIG.LIGHTNING_MIN_INTERVAL / 2 + Math.random() * (CONFIG.LIGHTNING_MAX_INTERVAL - CONFIG.LIGHTNING_MIN_INTERVAL);
                    lightningTimeoutId = setTimeout(triggerLightning, initialLightningDelay);
                    
                    // Initialize treasure cloud system
                    initializeTreasureCloudSystem();
                    queueHeroFramingRefresh();
                }
            });
            anime({ targets: ['#top-left-panel', '#lock-picking-panel', '#right-side-panels', '#top-center-stats', '#ep-challenge-panel'], opacity: [0, 1], duration: 1000, delay: 2000, easing: 'linear' });
        }

        function handleSuccessfulRescue() { 
            if (currentPetRescued || gameState === 'LOSE' || gameState === 'TRANSITIONING') return;
            currentPetRescued = true; 
            gameState = 'TRANSITIONING'; // Prevent other actions during transition
            
            // Reset all lock pick cooldowns to prepare for next pet
            if (typeof clearAllLockPickCooldowns === 'function') {
                clearAllLockPickCooldowns();
            }

            mathProblemTimers.forEach((timerId, index) => { if (timerId) { clearTimeout(timerId); mathProblemTimers[index] = null; } });
            
            stopSound('lockPickClick'); playSound('lockPickSuccess');

            // Update Score
            const rarityData = CONFIG.PET_RARITIES[currentPetRarityKey];
            scoreData.rescuedCounts[currentPetRarityKey]++;
            scoreData.totalPointsByRarity[currentPetRarityKey] += rarityData.points;
            scoreData.overallScore += rarityData.points;
            updateScorePanelDOM();

            // Update Level Progression
            incrementPetRescueCount();

            // Pet escape animation, then transition
            if (cage && cage.door && cage.visualLock && pet) {
                const tl = anime.timeline({ easing: 'easeInOutQuad' });
                const frameSize = 1.2 * rarityData.cageScale, barRadius = 0.04 * rarityData.cageScale;
                const doorWidthVal = frameSize - (2*barRadius);
                const initialLockPos = { x: cage.visualLock.position.x, y: cage.visualLock.position.y, z: cage.visualLock.position.z };
                const initialLockRot = { x: cage.visualLock.rotation.x, y: cage.visualLock.rotation.y, z: cage.visualLock.rotation.z };
                
                // If legendary pet sound is playing, stop it at the end of the animation and restart background music
                const isLegendaryPet = currentPetRarityKey === 'legendary';

                tl.add({ targets: cage.visualLock.rotation, x: initialLockRot.x + Math.PI * 0.5, y: initialLockRot.y + Math.PI * 0.7, z: initialLockRot.z + Math.PI * 1.2, duration: 500, easing: 'easeInCubic', begin: () => playSound('lockOpen') })
                .add({ targets: cage.visualLock.position, y: initialLockPos.y - (0.7 * rarityData.cageScale), x: initialLockPos.x + (Math.random() - 0.5) * 0.5, z: initialLockPos.z + (Math.random() - 0.5) * 0.5, duration: 600, easing: 'easeInCubic' }, '-=400')
                .add({ targets: cage.visualLock, opacity_dummy: [1, 0], duration: 400, easing: 'linear', update: anim => { const currentOpacity = 1 - anim.progress / 100; if (cage.visualLock.children) { cage.visualLock.children.forEach(child => { if (child.material) { child.material.transparent = true; child.material.opacity = currentOpacity; } }); } }, complete: () => { cage.visualLock.visible = false; } }, '-=500');
                
                tl.add({ 
                    targets: cage.door.rotation, 
                    y: Math.PI / 1.8, 
                    duration: 1500, 
                    easing: 'easeOutElastic(1, 0.6)', 
                    begin: () => { 
                        playSound('victory'); 
                        
                        // If this is a legendary pet, smoothly transition from legendary sound to background music
                        // when the cage opens
                        if (currentPetRarityKey === 'legendary') {
                            // Use a short fade-out for the legendary pet sound
                            if (SOUNDS.legendaryPet && SOUNDS.legendaryPet.playing()) {
                                // Save current volume for smoother transition
                                const currentVolume = SOUNDS.legendaryPet.volume();
                                
                                // Fast but smooth fade-out (400ms)
                                SOUNDS.legendaryPet.fade(currentVolume, 0, 400);
                                
                                // Ensure sound stops completely after fade-out
                                setTimeout(() => {
                                    if (SOUNDS.legendaryPet.playing()) {
                                        SOUNDS.legendaryPet.stop();
                                        debugLog('Legendary pet sound fully stopped after fade');
                                    }
                                }, 450);
                                
                                debugLog('Legendary pet sound fading out');
                            }
                            
                            // Restore background music with a nice fade-in
                            setTimeout(() => {
                                if (SOUNDS.ambient) {
                                    // First, ensure any currently playing ambient sound is stopped
                                    // to prevent multiple instances from playing simultaneously
                                    if (SOUNDS.ambient.playing()) {
                                        SOUNDS.ambient.stop();
                                        debugLog('Stopped any currently playing ambient sound');
                                    }
                                    
                                    // Check if we have saved music state to restore
                                    if (window.savedMusicState && window.savedMusicState.wasPlaying) {
                                        debugLog('Restoring saved music state:', window.savedMusicState);
                                        
                                        // Start a fresh instance from the saved position
                                        SOUNDS.ambient.volume(0); // Start silent
                                        SOUNDS.ambient.play();
                                        
                                        // Try to seek to the saved position if available
                                        try {
                                            if (window.savedMusicState.position) {
                                                SOUNDS.ambient.seek(window.savedMusicState.position);
                                                debugLog('Successfully restored to position:', window.savedMusicState.position);
                                            }
                                        } catch (e) {
                                            console.warn('Could not seek to saved position:', e);
                                        }
                                        
                                        // Fade to the original saved volume or default if unavailable
                                        const targetVolume = window.savedMusicState.volume || CONFIG.MUSIC_VOLUME;
                                        SOUNDS.ambient.fade(0, targetVolume, 1500); // Smooth 1.5 second fade-in
                                        
                                        debugLog('Background music restored with fade-in');
                                    } else {
                                        // No saved state, just start normally
                                        SOUNDS.ambient.volume(0);
                                        SOUNDS.ambient.play();
                                        SOUNDS.ambient.fade(0, CONFIG.MUSIC_VOLUME, 1800); // Smooth 1.8 second fade-in
                                        debugLog('Background music starting with fade-in (no saved state)');
                                    }
                                }
                            }, 300); // Small delay for better sound transition
                        }
                    } 
                });

                const petInitialY = pet.position.y, petInitialZ = pet.position.z;
                tl.add({ targets: pet.position, y: [petInitialY, petInitialY + 0.3 * rarityData.petScale, petInitialY + 0.1 * rarityData.petScale], z: [petInitialZ, petInitialZ + 1.0 * rarityData.petScale, petInitialZ + 1.8 * rarityData.petScale], duration: 800, easing: 'easeOutQuad' }, "-=700")
                .add({ targets: pet.position, x: [pet.position.x, pet.position.x + (Math.random()-0.5) * 2], y: [petInitialY + 0.1 * rarityData.petScale, petInitialY + 5 * rarityData.petScale], z: [petInitialZ + 1.8 * rarityData.petScale, petInitialZ + 4 * rarityData.petScale + (Math.random()-0.5) * 2], duration: 2200, easing: 'easeOutQuad',
                    begin: () => { if (pet.leftWing && pet.rightWing) { if (pet.flapAnimation) pet.flapAnimation.pause(); pet.flapAnimation = anime({ targets: [pet.leftWing.rotation, pet.rightWing.rotation], x: [{ value: -Math.PI / 3, duration: 150, easing: 'easeInOutSine' }, { value: -Math.PI / 8, duration: 150, easing: 'easeInOutSine' }], loop: true, direction: 'alternate', autoplay: true }); } },
                    complete: () => { if (pet.flapAnimation) { pet.flapAnimation.pause(); } }
                })
                .add({ targets: pet.rotation, y: pet.rotation.y + Math.PI * 2.5, duration: 2200, easing: 'easeInOutQuad' }, "-=2200");
                
                tl.add({ duration: 500 }); // Pause before next pet
                tl.complete = () => {
                    // Sound transitions are now handled when the cage door opens
                    // This avoids redundant sound management and ensures cleaner transitions
                    
                    const nextRarity = determineNextPetRarity();
                    transitionToNextPet(nextRarity);
                };
            } else { // Fallback if objects missing
                playSound('victory');
                
                // If this is a legendary pet flying away, smoothly transition sounds
                if (currentPetRarityKey === 'legendary') {
                    // Use a short fade-out for the legendary pet sound
                    if (SOUNDS.legendaryPet && SOUNDS.legendaryPet.playing()) {
                        // Save current volume for smoother transition
                        const currentVolume = SOUNDS.legendaryPet.volume();
                        
                        // Fast but smooth fade-out (400ms)
                        SOUNDS.legendaryPet.fade(currentVolume, 0, 400);
                        
                        // Ensure sound stops completely after fade-out
                        setTimeout(() => {
                            if (SOUNDS.legendaryPet.playing()) {
                                SOUNDS.legendaryPet.stop();
                                debugLog('Legendary pet sound fully stopped after fade (fallback)');
                            }
                        }, 450);
                        
                        debugLog('Legendary pet sound fading out (fallback)');
                    }
                    
                    // Restore background music with a nice fade-in
                    setTimeout(() => {
                        if (SOUNDS.ambient) {
                            // First, ensure any currently playing ambient sound is stopped
                            // to prevent multiple instances from playing simultaneously
                            if (SOUNDS.ambient.playing()) {
                                SOUNDS.ambient.stop();
                                debugLog('Stopped any currently playing ambient sound (fallback)');
                            }
                            
                            // Check if we have saved music state to restore
                            if (window.savedMusicState && window.savedMusicState.wasPlaying) {
                                debugLog('Restoring saved music state (fallback):', window.savedMusicState);
                                
                                // Start a fresh instance from the saved position
                                SOUNDS.ambient.volume(0); // Start silent
                                SOUNDS.ambient.play();
                                
                                // Try to seek to the saved position if available
                                try {
                                    if (window.savedMusicState.position) {
                                        SOUNDS.ambient.seek(window.savedMusicState.position);
                                        debugLog('Successfully restored to position (fallback):', window.savedMusicState.position);
                                    }
                                } catch (e) {
                                    console.warn('Could not seek to saved position (fallback):', e);
                                }
                                
                                // Fade to the original saved volume or default if unavailable
                                const targetVolume = window.savedMusicState.volume || CONFIG.MUSIC_VOLUME;
                                SOUNDS.ambient.fade(0, targetVolume, 1500); // Smooth 1.5 second fade-in
                                
                                debugLog('Background music restored with fade-in (fallback)');
                            } else {
                                // No saved state, just start normally
                                SOUNDS.ambient.volume(0);
                                SOUNDS.ambient.play();
                                SOUNDS.ambient.fade(0, CONFIG.MUSIC_VOLUME, 1800); // Smooth 1.8 second fade-in
                                debugLog('Background music starting with fade-in (fallback, no saved state)');
                            }
                        }
                    }, 300); // Small delay for better sound transition
                }
                
                const nextRarity = determineNextPetRarity();
                setTimeout(() => transitionToNextPet(nextRarity), 1000);
            }
        }

        function transitionToNextPet(newRarityKey) {
            gameState = 'TRANSITIONING';
            
            // Clean up any existing pet rarity effects
            cleanupPetRarityEffects();
            
            // Handle special legendary pet sound transition
            const isLegendaryPet = newRarityKey === 'legendary';
            
            // If this is a legendary pet coming up, pause background music for dramatic effect
            if (isLegendaryPet && SOUNDS.ambient.playing()) {
                // Save background music state before fading out
                // Store in a global variable so it can be accessed when restoring
                window.savedMusicState = {
                    wasPlaying: true,
                    volume: SOUNDS.ambient.volume(),
                    position: SOUNDS.ambient.seek()
                };
                debugLog('Saved music state:', window.savedMusicState);
                
                // Slow fade out for the ambient music (2 seconds)
                SOUNDS.ambient.fade(SOUNDS.ambient.volume(), 0, 2000);
                
                // Wait longer (3 seconds total) after music fades before playing the legendary sound
                setTimeout(() => {
                    // Start with a dramatic lightning effect
                    createLegendaryLightningEffect(() => {
                        // Fade in the legendary pet sound after lightning completes
                        if (SOUNDS.legendaryPet) {
                            SOUNDS.legendaryPet.volume(0);
                            SOUNDS.legendaryPet.play();
                            SOUNDS.legendaryPet.fade(0, 0.7, 1500); // Fade in over 1.5 seconds
                        }
                    });
                }, 2000); // Slightly shorter pause before lightning effect starts
            } else {
                // If it's not a legendary pet, ensure we note that no music state was saved
                window.savedMusicState = null;
            }
            
            // 1. Fade out old cage (pet is already flying away or gone)
            let fadeOutPromises = [];
            if (cage) {
                const p = new Promise(resolve => {
                    anime({
                        targets: cage.children.map(c => c.material).filter(m => m), // Target materials for opacity
                        opacity: 0, duration: 700, easing: 'linear',
                        complete: () => {
                            removeCurrentPetAndCage(); // Disposes after fade
                            resolve();
                        }
                    });
                });
                fadeOutPromises.push(p);
            }
            Promise.all(fadeOutPromises).then(() => {
                // 2. Update current pet rarity
                currentPetRarityKey = newRarityKey;
                updateHUD(); // Update rarity display

                // 3. Create new pet and cage
                pet = createPet(currentPetRarityKey);
                cage = createCage(currentPetRarityKey);
                // --- Ensure perfect alignment: set to INITIAL_CAGE_BASE_Y before chain ---
                cage.position.y = CONFIG.INITIAL_CAGE_BASE_Y;
                cage.add(pet); // Add pet to new cage
                scene.add(cage);
                createChain(); // Recreate chain for the new cage (this also positions links initially)
                populateSilhouetteQueue(); // Refresh silhouette queue
                const nextPetHeroFraming = getCageHeroFraming();
                if (nextPetHeroFraming) {
                    animateCameraToHeroFraming(nextPetHeroFraming, 700);
                }
                queueHeroFramingRefresh();

                // Get the final Y after chain system positions the cage
                const finalY = cage.position.y;
                // No vertical animation, just fade in at final position

                // 4. Reset relevant game states for the new pet with randomized stats based on rarity
                // Generate random stats instead of always starting at full bars
                // Different rarities have different min values to make gameplay more interesting
                const rarityMinValues = {
                    common: { hunger: 40, hydration: 50, joy: 30, rest: 45 },      // Common pets can be in worse shape
                    rare: { hunger: 60, hydration: 65, joy: 55, rest: 60 },        // Rare pets are in better condition
                    legendary: { hunger: 75, hydration: 80, joy: 70, rest: 85 }     // Legendary pets are well cared for
                };
                
                // Get min values for current pet rarity
                const minValues = rarityMinValues[currentPetRarityKey];
                
                // Create randomized stats between min values and 100
                petStats = {
                    hunger: Math.floor(Math.random() * (100 - minValues.hunger + 1)) + minValues.hunger,
                    hydration: Math.floor(Math.random() * (100 - minValues.hydration + 1)) + minValues.hydration,
                    joy: Math.floor(Math.random() * (100 - minValues.joy + 1)) + minValues.joy,
                    rest: Math.floor(Math.random() * (100 - minValues.rest + 1)) + minValues.rest
                };
                
                lockPickingProgress = 0;
                chainStress = 0;
                isGrumpy = false;
                timeGrumpy = 0;
                currentPetRescued = false;

                // 5. Fade in new cage and pet only (no movement)
                // Only play newPetReveal for non-legendary pets as legendary pets have their own sound
                if (!isLegendaryPet) {
                    // Only play the sound if game has started and is in progress
                    if (gameStarted && gameTime < initialGameTime) {
                    playSound('newPetReveal');
                    }
                    
                    // Standard fade-in for normal pets
                    let fadeInTargets = [];
                    if (cage) cage.traverse(child => { if(child.isMesh && child.material) fadeInTargets.push(child.material); });
                    if (pet) pet.traverse(child => { if(child.isMesh && child.material) fadeInTargets.push(child.material); });
                    // Set initial opacity
                    fadeInTargets.forEach(mat => { mat.transparent = true; mat.opacity = 0; });
                    anime({
                        targets: fadeInTargets,
                        opacity: [0, 1],
                        duration: 900,
                        easing: 'linear',
                        complete: () => {
                            fadeInTargets.forEach(mat => { mat.transparent = false; });
                            gameState = 'PLAYING'; // Resume gameplay
                            document.querySelectorAll('.lock-pick-tool').forEach(tool => {
                                if (tool) tool.disabled = false;
                            });
                            // Ensure cloud spawning continues after pet transition
                            ensureCloudSpawning();
                        }
                    });
                } else {
                    // For legendary pets, initially everything is invisible
                    let fadeInTargets = [];
                    if (cage) cage.traverse(child => { if(child.isMesh && child.material) fadeInTargets.push(child.material); });
                    if (pet) pet.traverse(child => { if(child.isMesh && child.material) fadeInTargets.push(child.material); });
                    fadeInTargets.forEach(mat => { mat.transparent = true; mat.opacity = 0; });
                    
                    // Delayed fade in that starts AFTER lightning effect completes
                    // The timing of this timeout must match the total duration of the lightning effect
                    setTimeout(() => {
                        anime({
                            targets: fadeInTargets,
                            opacity: [0, 1],
                            duration: 1200, // Slightly longer dramatic reveal
                            easing: 'easeOutQuad',
                            complete: () => {
                                fadeInTargets.forEach(mat => { mat.transparent = false; });
                                gameState = 'PLAYING'; // Resume gameplay
                                document.querySelectorAll('.lock-pick-tool').forEach(tool => {
                                    if (tool) tool.disabled = false;
                                });
                                // Lock pick tools already enabled in previous block
                                
                                // Ensure cloud spawning continues after pet transition
                                ensureCloudSpawning();
                                
                                // Apply visual effects based on pet rarity
                                if (isLegendaryPet || currentPetRarityKey === 'rare') {
                                    // Add visual particle effects for the pet's rarity
                                    createPetRarityEffects(currentPetRarityKey);
                                }
                                
                                // Trigger an initial intense cage jolt for legendary pets
                                if (isLegendaryPet) {
                                    // Jolt with a slight delay to ensure everything is visible
                                    setTimeout(() => {
                                        if (gameState === 'PLAYING' && pet) {
                                            // Trigger an initial legendary cage jolt
                                            animateCageJolt(true);
                                        }
                                    }, 500);
                                    
                                    // Clear any existing legendary jolt timer
                                    if (legendaryJoltTimer) {
                                        clearInterval(legendaryJoltTimer);
                                        legendaryJoltTimer = null;
                                    }
                                    
                                    // Schedule periodic cage jolts for legendary pets (every 15-20 seconds)
                                    const joltInterval = 15000 + Math.random() * 5000;
                                    legendaryJoltTimer = setInterval(() => {
                                        if (gameState === 'PLAYING' && pet && currentPetRarityKey === 'legendary') {
                                            animateCageJolt(true); // Use legendary jolt parameter
                                        } else {
                                            // If game state changed or pet changed, clear the interval
                                            clearInterval(legendaryJoltTimer);
                                            legendaryJoltTimer = null;
                                        }
                                    }, joltInterval);
                                }
                            }
                        });
                    }, 4000); // Wait for lightning effect to complete before showing pet
                }
                swingBaseTime = performance.now(); // Reset swing timer for smooth transition
                updateHUD(); // Update HUD for new pet stats
            });
        }


        function loseGame(reason) { 
            if (gameState === 'LOSE' || gameState === 'TRANSITIONING') return; // Prevent multiple lose calls or during transition
            
            // Clear legendary jolt timer if it exists
            if (legendaryJoltTimer) {
                clearInterval(legendaryJoltTimer);
                legendaryJoltTimer = null;
            }
            
            // Clean up any pet rarity visual effects
            cleanupPetRarityEffects();

            mathProblemTimers.forEach((timerId, index) => { if (timerId) { clearTimeout(timerId); mathProblemTimers[index] = null; } });
            gameState = 'LOSE';
            clearInterval(timerInterval); if (lightningTimeoutId) clearTimeout(lightningTimeoutId); if (cloudSpawnTimeoutId) clearTimeout(cloudSpawnTimeoutId);
            if(SOUNDS.ambient.playing()) SOUNDS.ambient.fade(SOUNDS.ambient.volume(), 0, 1000);
            if(SOUNDS.lava.playing()) SOUNDS.lava.fade(SOUNDS.lava.volume(), 0, 1000);
            if(SOUNDS.chainSwing.playing()) SOUNDS.chainSwing.fade(SOUNDS.chainSwing.volume(), 0, 1000);
            
            // Fade out legendary pet music if playing (same pattern as when freeing a legendary pet)
            if(SOUNDS.legendaryPet && SOUNDS.legendaryPet.playing()) {
                // Save current volume for smoother transition
                const currentVolume = SOUNDS.legendaryPet.volume();
                
                // Fast but smooth fade-out (400ms)
                SOUNDS.legendaryPet.fade(currentVolume, 0, 400);
                
                // Ensure sound stops completely after fade-out
                setTimeout(() => {
                    if (SOUNDS.legendaryPet.playing()) {
                        SOUNDS.legendaryPet.stop();
                        debugLog('Legendary pet sound fully stopped after game over');
                    }
                    
                    // Restore background music with a nice fade-in
                    setTimeout(() => {
                        if (SOUNDS.ambient) {
                            // First, ensure any currently playing ambient sound is stopped
                            // to prevent multiple instances from playing simultaneously
                            if (SOUNDS.ambient.playing()) {
                                SOUNDS.ambient.stop();
                                debugLog('Stopped any currently playing ambient sound');
                            }
                            
                            // Check if we have saved music state to restore
                            if (window.savedMusicState && window.savedMusicState.wasPlaying) {
                                debugLog('Restoring saved music state after game over:', window.savedMusicState);
                                
                                // Start a fresh instance from the saved position
                                SOUNDS.ambient.volume(0); // Start silent
                                SOUNDS.ambient.play();
                                
                                // Try to seek to the saved position if available
                                try {
                                    if (window.savedMusicState.position) {
                                        SOUNDS.ambient.seek(window.savedMusicState.position);
                                        debugLog('Successfully restored to position:', window.savedMusicState.position);
                                    }
                                } catch (e) {
                                    console.warn('Could not seek to saved position:', e);
                                }
                                
                                // Fade to the original saved volume or default if unavailable
                                const targetVolume = window.savedMusicState.volume || CONFIG.MUSIC_VOLUME;
                                SOUNDS.ambient.fade(0, targetVolume, 1500); // Smooth 1.5 second fade-in
                                
                                debugLog('Background music restored with fade-in after game over');
                            } else {
                                // No saved state, just start normally
                                SOUNDS.ambient.volume(0);
                                SOUNDS.ambient.play();
                                SOUNDS.ambient.fade(0, CONFIG.MUSIC_VOLUME, 1800); // Smooth 1.8 second fade-in
                                debugLog('Background music starting with fade-in after game over (no saved state)');
                            }
                        }
                    }, 300); // Small delay for better sound transition
                }, 450);
            }
            
            stopHeartbeat(); stopSound('lockPickClick'); 
            
            playSound('lose'); gameOverMessage.textContent = reason;
            if (reason === "Chain snapped!") { playSound('chainSnap'); if (chainLinks && chainLinks.length > 0 && lavaPlane) { chainLinks.forEach((link, index) => { anime({ targets: link.position, y: lavaPlane.position.y - 2 - index * 0.1, x: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2, duration: 1000 + Math.random() * 500, delay: index * 50, easing: 'easeInCubic' }); }); } }
            if (cage && lavaPlane) { let fallTargets = { y: cage.position.y }; anime({ targets: fallTargets, y: lavaPlane.position.y - 0.5, duration: (reason === "Chain snapped!") ? 1500 : (reason === "Time's up!" ? 1000 : 1500), delay: (reason === "Time's up!" ? 1000 : (reason === "Chain snapped!" ? 500 : 0)), easing: 'easeInCubic', update: () => { cage.position.y = fallTargets.y; if (reason !== "Chain snapped!" && chainLinks && chainLinks.length > 0 && scene.chainHangingHeight && cage.chainAttachPoint) { chainAttachRotatedOffset.copy(cage.chainAttachPoint.position).applyAxisAngle(CHAIN_SWING_AXIS, cage.rotation.z); const targetAttachCenterY = fallTargets.y + chainAttachRotatedOffset.y; const lengthToAttachCenter = (CONFIG.CHAIN_LINKS - 0.5) * CONFIG.LINK_EFFECTIVE_LENGTH; const yOffsetFromIdealPivot = targetAttachCenterY - (scene.chainHangingHeight - lengthToAttachCenter); for (let i = 0; i < chainLinks.length; i++) { const distToThisLinkCenter = (i + 0.5) * CONFIG.LINK_EFFECTIVE_LENGTH; chainLinks[i].position.y = (scene.chainHangingHeight - distToThisLinkCenter) + yOffsetFromIdealPivot; } } }, complete: () => { playSound('cageHit'); anime({ targets: gameOverOverlay, opacity: [0, 1], duration: 500, easing: 'linear', complete: () => gameOverOverlay.style.pointerEvents = 'auto'}); } });
            } else { anime({ targets: gameOverOverlay, opacity: [0, 1], duration: 500, easing: 'linear', complete: () => gameOverOverlay.style.pointerEvents = 'auto'}); }
        }
        
        // Complete reset function - clears ALL progress including upgrades
        function resetGameCompletely() {
            debugLog('Performing complete game reset - clearing all progress and upgrades');
            scoreData = createDefaultScoreData();
            levelProgressData = createDefaultLevelProgressData();
            updateLevelDisplay();
            
            // Reset player energy
            playerEnergy = 25;
            
            // Clear the global problem tracker for a fresh game
            if (typeof globalProblemTracker !== 'undefined' && globalProblemTracker.clear) {
                globalProblemTracker.clear();
            }
            
            // Update all UI elements that display upgrades
            if (typeof updateUpgradeDisplay === 'function') {
                updateUpgradeDisplay();
            }
            
            debugLog('Game reset complete - problem history cleared');
        }

        // Clear All function - completely wipes all game data for fresh start
        function clearAllGameData() {
            debugLog('🗑️ Clearing ALL game data for fresh start...');
            
            // Show confirmation dialog
            const confirmed = confirm(
                "⚠️ WARNING: This will permanently delete ALL your game progress!\n\n" +
                "This includes:\n" +
                "• All upgrades and levels\n" +
                "• Total score and rescued pets\n" +
                "• Game settings (timer, difficulty, etc.)\n" +
                "• Custom pet rarity rates\n" +
                "• Custom sound uploads\n\n" +
                "Are you absolutely sure you want to continue?\n\n" +
                "This action CANNOT be undone!"
            );
            
            if (!confirmed) {
                debugLog('🗑️ Clear All cancelled by user');
                return;
            }
            
            // Second confirmation for safety
            const doubleConfirmed = confirm(
                "🚨 FINAL WARNING 🚨\n\n" +
                "This is your last chance to cancel!\n\n" +
                "Clicking OK will PERMANENTLY DELETE all your progress.\n\n" +
                "Are you 100% sure you want to clear everything?"
            );
            
            if (!doubleConfirmed) {
                debugLog('🗑️ Clear All cancelled by user on second confirmation');
                return;
            }
            
            try {
                // Clear all localStorage data
                debugLog('🗑️ Clearing localStorage data...');
                
                // Game settings
                localStorage.removeItem('lavaCageGameTimer');
                localStorage.removeItem('lavaCageGameDifficulty');
                localStorage.removeItem('lavaCageLockPickDuration');
                
                // Upgrades and progress
                localStorage.removeItem('lavaCageUpgrades');
                
                // Pet rarity rates
                localStorage.removeItem('petRescue3_petRarityRates');
                
                // Custom sounds
                CUSTOM_SOUND_TYPES.forEach(type => {
                    localStorage.removeItem(`customSound_${type}`);
                });
                
                // Reset all game variables to defaults
                debugLog('🗑️ Resetting game variables...');
                
                playerUpgrades = createDefaultPlayerUpgrades();
                scoreData = createDefaultScoreData();
                levelProgressData = createDefaultLevelProgressData();
                customPetRarityRates = createDefaultCustomPetRarityRates();
                
                // Reset energy
                playerEnergy = 25;
                
                keyInventory = createDefaultKeyInventory();
                
                // Reset settings to defaults
                gameTime = CONFIG.TIMER_DEFAULT;
                lockPickDurationSetting = CONFIG.LOCK_PICK_DURATION_DEFAULT;
                currentDifficultySetting = 'easy';
                
                // Clear problem tracker
                if (typeof globalProblemTracker !== 'undefined' && globalProblemTracker.clear) {
                    globalProblemTracker.clear();
                }
                
                // Update all UI displays
                debugLog('🗑️ Updating UI displays...');
                updateScorePanelDOM();
                updateLevelDisplay();
                updateAllKeyQuantityDisplays();
                
                // Force update upgrades display
                debugLog('🗑️ Forcing upgrades panel update...');
                if (typeof updateUpgradeDisplay === 'function') {
                    updateUpgradeDisplay();
                }
                
                // Also manually update all upgrade level displays
                const upgradeElementMappings = {
                    'lockPick': 'lockpick',
                    'luckyCharms': 'luckycharms', 
                    'chainStrength': 'chainstrength',
                    'mathCooldown': 'cooldown',
                    'food': 'food',
                    'water': 'water',
                    'play': 'play',
                    'sing': 'sing'
                };
                
                for (const upgradeType in playerUpgrades) {
                    const elementId = upgradeElementMappings[upgradeType] || upgradeType.toLowerCase();
                    
                    // Reset level displays
                    const levelElement = document.getElementById(`level-${elementId}`);
                    if (levelElement) {
                        levelElement.textContent = '0';
                        debugLog(`🗑️ Reset ${upgradeType} level display to 0`);
                    }
                    
                    // Reset effect displays
                    const effectElement = document.getElementById(`effect-${elementId}`);
                    if (effectElement) {
                        effectElement.textContent = '0';
                        debugLog(`🗑️ Reset ${upgradeType} effect display to 0`);
                    }
                    
                    // Reset button costs to level 1 costs
                    const button = document.querySelector(`.upgrade-button[data-upgrade="${upgradeType}"]`);
                    if (button) {
                        const baseCost = Math.pow(2, 1); // Level 1 cost
                        button.textContent = `Buy (-${baseCost} EP)`;
                        debugLog(`🗑️ Reset ${upgradeType} button cost to ${baseCost} EP`);
                    }
                    
                    // Special handling for the cooldown upgrade button (different ID)
                    if (upgradeType === 'mathCooldown') {
                        const cooldownButton = document.getElementById('cooldown-upgrade-btn');
                        if (cooldownButton) {
                            cooldownButton.textContent = 'Buy (-2 EP)';
                            debugLog(`🗑️ Reset cooldown upgrade button cost to 2 EP`);
                        }
                    }
                }
                
                if (typeof updatePetRaritySliders === 'function') {
                    updatePetRaritySliders();
                }
                
                // Reset settings panel inputs to defaults
                if (timerSettingMinutes) timerSettingMinutes.value = Math.floor(CONFIG.TIMER_DEFAULT / 60);
                if (timerSettingSeconds) timerSettingSeconds.value = CONFIG.TIMER_DEFAULT % 60;
                if (lockPickDurationSettingInput) lockPickDurationSettingInput.value = CONFIG.LOCK_PICK_DURATION_DEFAULT;
                if (difficultySettingSelect) difficultySettingSelect.value = 'easy';
                
                // Reset pet rarity sliders
                if (commonRateSlider) commonRateSlider.value = 60;
                if (rareRateSlider) rareRateSlider.value = 30;
                if (legendaryRateSlider) legendaryRateSlider.value = 10;
                
                // Update slider displays
                if (commonRateValueDisplay) commonRateValueDisplay.textContent = '60%';
                if (rareRateValueDisplay) rareRateValueDisplay.textContent = '30%';
                if (legendaryRateValueDisplay) legendaryRateValueDisplay.textContent = '10%';
                
                debugLog('🗑️ Clear All completed successfully!');
                
                // Show success message and restart
                alert(
                    "✅ SUCCESS!\n\n" +
                    "All game data has been cleared successfully.\n\n" +
                    "The game will now restart with fresh settings.\n\n" +
                    "Welcome to your brand new game!"
                );
                
                // Restart the game to start overlay
                if (typeof restartToStartOverlay === 'function') {
                    restartToStartOverlay();
                } else {
                    // Fallback: reload the page
                    location.reload();
                }
                
            } catch (error) {
                console.error('🗑️ Error during Clear All operation:', error);
                alert(
                    "❌ ERROR!\n\n" +
                    "An error occurred while clearing game data:\n" +
                    error.message + "\n\n" +
                    "Some data may not have been cleared properly.\n" +
                    "You may need to refresh the page manually."
                );
            }
        }
        
        function resetGameState() {
            // Perform complete reset including upgrades
            resetGameCompletely();
            
            // Reset all lock pick cooldowns
            if (typeof clearAllLockPickCooldowns === 'function') {
                clearAllLockPickCooldowns();
            }
            
            loadCoreGameSettings(); 
            petStats = { ...CONFIG.INITIAL_STATS };
            isGrumpy = false; timeGrumpy = 0; chainStress = 0;
            lockPickingProgress = 0; currentPetRescued = false;
            
            updateScorePanelDOM(); // Update score panel on reset
            updateLevelDisplay(); // Update level display on reset
            
            currentPetRarityKey = 'common'; // Always start with common pet
            updateHUD(); // Update rarity display early

            if(timerInterval) clearInterval(timerInterval); if (lightningTimeoutId) clearTimeout(lightningTimeoutId); if (cloudSpawnTimeoutId) clearTimeout(cloudSpawnTimeoutId);
            isJolting = false; 
            Object.values(SOUNDS).forEach(sound => { if (sound.playing()) { sound.stop(); } });
            
            // Clean up treasure clouds
            treasureClouds.forEach(cloud => {
                scene.remove(cloud);
                // Clean up geometry and materials
                cloud.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.isMaterial) {
                            child.material.dispose();
                        } else if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        }
                    }
                });
            });
            treasureClouds = [];
            
            keyInventory = createDefaultKeyInventory();
            updateAllKeyQuantityDisplays();
            
            gameOverOverlay.style.opacity = 0; gameOverOverlay.style.pointerEvents = 'none';
            // winOverlay.style.opacity = 0; winOverlay.style.pointerEvents = 'none'; // No longer used per rescue
            document.querySelectorAll('#top-left-panel, #lock-picking-panel, #right-side-panels, #top-center-stats').forEach(el => el.style.opacity = 0);
            
            document.querySelectorAll('.lock-pick-tool').forEach(tool => {
                if (tool) tool.disabled = false;
            });
            
            removeCurrentPetAndCage(); // Clear any existing pet/cage
            if(pet && pet.flapAnimation) { pet.flapAnimation.pause(); anime.remove([pet.leftWing.rotation, pet.rightWing.rotation]); pet.flapAnimation = null; }

            // Create initial pet and cage based on new rarity system
            pet = createPet(currentPetRarityKey);
            cage = createCage(currentPetRarityKey);
            cage.position.y = CONFIG.INITIAL_CAGE_BASE_Y; // Set initial position
            cage.add(pet);
            scene.add(cage);
            
            // Make initial cage & pet visible (they are created transparent for transitions)
             let initialFadeTargets = [];
             if (cage) cage.traverse(child => { if(child.isMesh && child.material) initialFadeTargets.push(child.material); });
             if (pet) pet.traverse(child => { if(child.isMesh && child.material) initialFadeTargets.push(child.material); });
             initialFadeTargets.forEach(mat => mat.opacity = 1);


            if (scene && typeof createChain === 'function') { createChain(); }
            if (scene && typeof populateSilhouetteQueue === 'function') { populateSilhouetteQueue(); }
            
            joltOffsets = { x: 0, y: 0, z: 0, rotZ: 0 }; 
            if (cage && cage.door) cage.door.rotation.y = 0;
            if (cage && cage.visualLock) {
                cage.visualLock.visible = true;
                const rarityData = CONFIG.PET_RARITIES[currentPetRarityKey];
                const frameSize = 1.2 * rarityData.cageScale, barRadius = 0.04 * rarityData.cageScale;
                const doorWidthVal = frameSize - (2*barRadius);
                cage.visualLock.position.set(-doorWidthVal + 0.03 * rarityData.cageScale, 0, 0.04 * rarityData.cageScale);
                cage.visualLock.rotation.set(0,0,0);
                cage.visualLock.scale.set(1,1,1); // Already scaled with cage
                cage.visualLock.children.forEach(child => { if (child.material) { child.material.transparent = false; child.material.opacity = 1; } });
            }
            
            activeChallengeProblems = [];
            mathProblemTimers.forEach((tid, i) => { if(tid) clearTimeout(tid); mathProblemTimers[i] = null; });
            clearAllMathProblemsDisplay();
            
            anime.running.forEach(anim => anim.pause()); 
            anime.remove(camera.position); 
            if (cage) { anime.remove(cage.position); if (cage.door) anime.remove(cage.door.rotation); if (cage.visualLock) anime.remove(cage.visualLock.position, cage.visualLock.rotation, cage.visualLock); }
            if (pet) { 
                anime.remove(pet.position, pet.rotation); 
                // Reset pet to initial position to prevent sticking issues
                if (pet.userData && pet.userData.initialPosition) {
                    pet.position.copy(pet.userData.initialPosition);
                    debugLog('🐾 Pet position reset during game reset');
                }
                // Also remove any head animations
                if (pet.head) anime.remove(pet.head.position);
            } 
            if (chainLinks) chainLinks.forEach(link => anime.remove(link.position));
            updateHUD(); 
            // Apply lock pick speed boost from upgrades
            const lockPickBoostMultiplier = 1 + (playerUpgrades.lockPick * 0.25); // 25% boost per level
            lockPickRate = (CONFIG.MAX_LOCK_PROGRESS / lockPickDurationSetting / 10) * lockPickBoostMultiplier;
        }

        function updateGameLogic(deltaTime) {
            if (gameState !== 'PLAYING') return;

            const decayRates = CONFIG.STAT_DECAY_RATES[currentDifficultySetting];
            
            // Apply rarity-based decay rate multipliers
            // Common pets: stats decay 25% slower than normal
            // Rare pets: stats decay 1.5x faster than normal
            // Legendary pets: stats decay 3.25x faster than normal
            let rarityDecayMultiplier = 0.75; // Slower decay for common pets (25% reduction)
            
            if (currentPetRarityKey === 'rare') {
                rarityDecayMultiplier = 1.5; // 50% faster decay for rare pets
            } else if (currentPetRarityKey === 'legendary') {
                rarityDecayMultiplier = 3.25; // 225% faster decay for legendary pets
            }
            
            let wasGrumpy = isGrumpy;
            isGrumpy = false;
            for (const stat in petStats) {
                // Apply the rarity multiplier to the decay rate
                petStats[stat] -= decayRates[stat] * deltaTime * rarityDecayMultiplier;
                if (petStats[stat] <= 0) {
                    petStats[stat] = 0;
                    isGrumpy = true;
                }
            }

            const currentRarityData = CONFIG.PET_RARITIES[currentPetRarityKey];
            if (isGrumpy) {
                timeGrumpy += deltaTime;
                if(!wasGrumpy && pet && pet.head && pet.head.material) { 
                    const startColor = new THREE.Color(currentRarityData.petColor); 
                    const endColor = new THREE.Color(CONFIG.PET_COLOR_GRUMPY);
                    const colorObj = { r: startColor.r, g: startColor.g, b: startColor.b };
                    anime({ targets: colorObj, r: endColor.r, g: endColor.g, b: endColor.b, duration: 500, easing: 'easeInOutQuad', update: () => { pet.head.material.color.setRGB(colorObj.r, colorObj.g, colorObj.b); } });
                    
                    // Store initial head position to prevent drift
                    const initialHeadY = pet.head.position.y;
                    anime.remove(pet.head.position); // Remove any existing head animations
                    anime({ 
                        targets: pet.head.position, 
                        y: [initialHeadY, initialHeadY + 0.05 * currentRarityData.petScale, initialHeadY], 
                        duration: 300, 
                        easing: 'easeInOutSine', 
                        loop: true,
                        complete: () => {
                            // Ensure head returns to initial position when animation stops
                            if (pet && pet.head) {
                                pet.head.position.y = initialHeadY;
                            }
                        }
                    });
                    startHeartbeat();
                }
            } else {
                timeGrumpy = 0;
                if(wasGrumpy && pet && pet.head && pet.head.material) { 
                    const startColor = new THREE.Color(CONFIG.PET_COLOR_GRUMPY); 
                    const endColor = new THREE.Color(currentRarityData.petColor);
                    const colorObj = { r: startColor.r, g: startColor.g, b: startColor.b };
                    anime({ targets: colorObj, r: endColor.r, g: endColor.g, b: endColor.b, duration: 500, easing: 'easeInOutQuad', update: () => { pet.head.material.color.setRGB(colorObj.r, colorObj.g, colorObj.b); } });
                    anime.remove(pet.head.position); 
                    stopHeartbeat();
                }
            }
            
            // Apply stress reduction based on chain strength upgrade level with diminishing returns
            const chainStrengthLevel = playerUpgrades.chainStrength || 0;
            
            // Advanced formula for chain strength effect with diminishing returns
            // Formula: 1 - (baseEffect * level) / (level + effectDampener)
            // This gives a curve that approaches but never reaches 100% reduction
            const baseEffect = 0.15; // Base effect (15% at level 1)
            const effectDampener = 1.5; // Controls how quickly diminishing returns kick in
            
            // Calculate the reduction percentage (caps at ~75% at very high levels)
            const stressReduction = chainStrengthLevel > 0 ? 
                (baseEffect * chainStrengthLevel) / (chainStrengthLevel + effectDampener) : 0;
            
            // Apply the reduction to all sources of chain stress
            const stressMultiplier = Math.max(0.25, 1 - stressReduction); // Never below 25% (cap at 75% reduction)
            
            // Calculate dynamic stress multiplier based on depleted resources
            // 1.0 when resources are full, scaling up as they deplete
            let resourceDepletion = 0;
            let hasFullyDepletedStat = false;
            let totalResourcePercentage = 0;
            let statCount = 0;
            
            // Check all pet stats to calculate resource depletion
            for (const stat in petStats) {
                totalResourcePercentage += petStats[stat];
                statCount++;
                
                // Check if any stat is fully depleted
                if (petStats[stat] <= 0) {
                    hasFullyDepletedStat = true;
                }
            }
            
            // Calculate average resource level (0-100%)
            const avgResourceLevel = totalResourcePercentage / (statCount * 100);
            
            // Calculate depletion factor: 100% when full resources, increases as resources deplete
            // Base formula: starts at 1.0 with full resources, reaches 4.0 when resources are empty
            resourceDepletion = 1.0 + (3.0 * (1.0 - avgResourceLevel));
            
            // Apply additional multiplier when any resource is completely depleted
            if (hasFullyDepletedStat) {
                resourceDepletion *= 1.5; // 50% more stress when any resource is empty
            }
            
            // Apply final dynamic stress rate multiplier
            const stressRateMultiplier = resourceDepletion;
            
            // Update the stress multiplier display
            const stressMultiplierDisplay = document.getElementById('stress-multiplier');
            const multiplierContainer = document.getElementById('stress-multiplier-container');
            
            if (stressMultiplierDisplay && multiplierContainer) {
                // Format to one decimal place for cleaner display
                const displayValue = stressRateMultiplier.toFixed(1);
                stressMultiplierDisplay.textContent = `x${displayValue}`;
                
                // Remove all previous classes
                multiplierContainer.classList.remove('multiplier-low', 'multiplier-medium', 'multiplier-high', 'multiplier-critical');
                
                // Apply appropriate class based on severity
                if (stressRateMultiplier >= 4.0) {
                    // Critical level - extreme danger
                    multiplierContainer.classList.add('multiplier-critical');
                    stressMultiplierDisplay.style.fontSize = '16px';
                    stressMultiplierDisplay.style.color = '#ff3333';
                    stressMultiplierDisplay.style.textShadow = '0 0 8px rgba(255,80,80,0.8)';
                    stressMultiplierDisplay.style.animation = 'pulse-text 0.8s infinite';
                } else if (stressRateMultiplier >= 2.5) {
                    // High level - significant danger
                    multiplierContainer.classList.add('multiplier-high');
                    stressMultiplierDisplay.style.fontSize = '15px';
                    stressMultiplierDisplay.style.color = '#ff6666';
                    stressMultiplierDisplay.style.textShadow = '0 0 5px rgba(255,80,80,0.6)';
                    stressMultiplierDisplay.style.animation = 'pulse-text 1.2s infinite';
                } else if (stressRateMultiplier >= 1.5) {
                    // Medium level - moderate danger
                    multiplierContainer.classList.add('multiplier-medium');
                    stressMultiplierDisplay.style.fontSize = '14px';
                    stressMultiplierDisplay.style.color = '#ffbb33';
                    stressMultiplierDisplay.style.textShadow = '0 0 4px rgba(255,180,60,0.5)';
                    stressMultiplierDisplay.style.animation = '';
                } else {
                    // Low level - minimal danger
                    multiplierContainer.classList.add('multiplier-low');
                    stressMultiplierDisplay.style.fontSize = '14px';
                    stressMultiplierDisplay.style.color = '#ffffff';
                    stressMultiplierDisplay.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
                    stressMultiplierDisplay.style.animation = '';
                }
            }

            // Update the NEW kid-friendly speed display panel
            const speedDisplayPanel = document.getElementById('stress-speed-display');
            const speedValueDisplay = document.getElementById('stress-speed-value');
            
            if (speedDisplayPanel && speedValueDisplay) {
                // Format to one decimal place for cleaner display
                const displayValue = stressRateMultiplier.toFixed(1);
                speedValueDisplay.textContent = `${displayValue}x`;
                
                // Remove all previous speed classes
                speedDisplayPanel.classList.remove('speed-low', 'speed-medium', 'speed-high', 'speed-critical');
                
                // Apply appropriate visual state based on severity - kid-friendly thresholds
                if (stressRateMultiplier >= 3.5) {
                    // Critical level - purple with intense pulsing
                    speedDisplayPanel.classList.add('speed-critical');
                } else if (stressRateMultiplier >= 2.5) {
                    // High level - red for danger
                    speedDisplayPanel.classList.add('speed-high');
                } else if (stressRateMultiplier >= 1.8) {
                    // Medium level - orange for caution
                    speedDisplayPanel.classList.add('speed-medium');
                } else {
                    // Low level - green for safe
                    speedDisplayPanel.classList.add('speed-low');
                }
            }
            
            // Show visual feedback for high stress (subtle red glow on cage when stress is high)
            if (cage && cage.material) {
                const intensityFactor = Math.min(1.0, chainStress / (CONFIG.MAX_STRESS * 0.7));
                const baseColor = 0.2 + (intensityFactor * 0.4); // Range: 0.2-0.6
                cage.material.emissive.setRGB(baseColor, 0, 0);
            }
            
            // Get rarity-specific stress multiplier
            const rarityStressMultiplier = CONFIG.PET_RARITIES[currentPetRarityKey]?.stressMultiplier || 1.0;
            
            if(isGrumpy) { 
                chainStress += CONFIG.CHAIN_STRESS_PER_GRUMPY_SECOND * deltaTime * stressMultiplier * stressRateMultiplier * rarityStressMultiplier; 
            }
            const swingIntensity = cage ? Math.abs(cage.rotation.z) / (Math.PI / 8) : 0; 
            chainStress += CONFIG.CHAIN_STRESS_PER_SWING * swingIntensity * deltaTime * stressMultiplier * stressRateMultiplier * rarityStressMultiplier;
            chainStress = Math.min(chainStress, CONFIG.MAX_STRESS);

            if (chainStress >= CONFIG.MAX_STRESS) { stopHeartbeat(); handlePetLost("Chain snapped!"); }

            if (!currentPetRescued && gameState === 'PLAYING') {
                let prevProgress = lockPickingProgress;
                lockPickingProgress += lockPickRate * deltaTime;
                lockPickingProgress = Math.min(lockPickingProgress, CONFIG.MAX_LOCK_PROGRESS);
                if (Math.floor(lockPickingProgress / 5) > Math.floor(prevProgress / 5)) { playSound('lockPickClick', 'click'); }
                if (lockPickingProgress >= CONFIG.MAX_LOCK_PROGRESS) {
                    handleSuccessfulRescue(); 
                     document.querySelectorAll('.lock-pick-tool').forEach(tool => {
                         if (tool) tool.disabled = true;
                     });
                     // Lock pick tools already disabled in previous block
                    stopSound('lockPickClick');
                }
            }
            
            // Update treasure clouds (only if game is not paused)
            if (!isGamePaused) {
                updateTreasureClouds(deltaTime);
                
                // Periodic failsafe check to ensure cloud spawning continues (every ~30 seconds)
                if (Math.random() < 0.0005) { // Very low probability per frame
                    debugLog('🌤️ Periodic cloud spawning check...');
                    ensureCloudSpawning();
                }
                
                // Periodic check for stuck treasure chest popups (every ~10 seconds)
                if (Math.random() < 0.0015) { // Slightly higher probability
                    const stuckPopup = document.querySelector('div[style*="position: fixed"][style*="z-index: 1001"]');
                    if (stuckPopup && stuckPopup.innerHTML.includes('Chest Challenge')) {
                        debugLog('🚨 Detected potentially stuck treasure chest popup, checking...');
                        // Check if popup has been open for too long (look for timer display)
                        const timerDisplay = stuckPopup.querySelector('div[style*="color: #FF4444"]');
                        if (timerDisplay && timerDisplay.innerHTML.includes("Time's Up")) {
                            debugLog('🚨 Found stuck timeout popup, force-closing...');
                            stuckPopup.remove();
                            resumeGame();
                            ensureCloudSpawning();
                        }
                    }
                }
                
                // Periodic check for stuck pet position (every ~15 seconds)
                if (Math.random() < 0.001) { // Low probability per frame
                    if (pet && cage && pet.parent === cage && pet.userData && pet.userData.initialPosition) {
                        const expectedPetY = pet.userData.initialPosition.y; // Use stored initial position
                        const currentPetY = pet.position.y;
                        const tolerance = 0.02; // Small tolerance for normal variations
                        
                        // Check if pet is stuck significantly higher than expected
                        if (currentPetY > expectedPetY + tolerance) {
                            debugLog(`🐾 Detected stuck pet position: current=${currentPetY.toFixed(3)}, expected=${expectedPetY.toFixed(3)}`);
                            
                            // Gently animate pet back to correct position
                            anime.remove(pet.position);
                            anime({
                                targets: pet.position,
                                y: expectedPetY,
                                duration: 500,
                                easing: 'easeOutQuad',
                                complete: () => {
                                    debugLog('🐾 Pet position corrected');
                                }
                            });
                        }
                    }
                }
            }
        }

        function handlePlayerAction(actionType) {
            if (gameState !== 'PLAYING') return;
            const energyCost = CONFIG.ACTION_ENERGY_COSTS[actionType];
            const cooldownDuration = CONFIG.ACTION_COOLDOWNS[actionType];
            const now = Date.now();
            if (playerEnergy < energyCost) { playSound('errorSound'); if (actionButtons[actionType]) { animateElementShake(actionButtons[actionType]); } return; }
            if (now < actionCooldowns[actionType] + cooldownDuration) { return; }
            playerEnergy -= energyCost; actionCooldowns[actionType] = now; updateHUD(); 
            switch (actionType) {
                case 'feed': case 'water': case 'play': case 'sing': handleStatBoostingAction(actionType); break;
                case 'extendTime': handleExtendTimeAction(); break;
                case 'stressFairy': handleStressFairyAction(); break;
            }
        }
        function handleStatBoostingAction(actionType) { 
            playSound(actionType); 
            if (SOUNDS.animal && (actionType === 'feed' || actionType === 'play')) playSound('animal'); 
            
            let statToUpdate; 
            switch (actionType) { 
                case 'feed': statToUpdate = 'hunger'; break; 
                case 'water': statToUpdate = 'hydration'; break; 
                case 'play': statToUpdate = 'joy'; break; 
                case 'sing': statToUpdate = 'rest'; break; 
            } 
            
            if (statToUpdate && petStats) {
                // Get the base value from CONFIG
                const baseValue = CONFIG.ACTION_VALUES[actionType];
                
                // Get the upgrade level for this action type
                const upgradeLevel = playerUpgrades[actionType] || 0;
                
                // Calculate the boost multiplier using a scaled formula
                // Formula pattern: 1 + (baseBoost * level) / (level + dampener)
                // This gives diminishing returns but still meaningful progression
                const baseBoost = 0.15; // 15% boost per level
                const dampener = 1.0;    // Controls curve steepness - lower = steeper
                
                // Different action types have slightly different scaling to make them feel unique
                let boostMultiplier = 1.0; // Default: no boost
                
                if (upgradeLevel > 0) {
                    if (actionType === 'feed') {
                        // Food scales well at early levels for immediate satisfaction
                        boostMultiplier = 1.0 + (baseBoost * upgradeLevel) / (upgradeLevel * 0.8 + dampener);
                    } else if (actionType === 'water') {
                        // Water has consistent scaling throughout
                        boostMultiplier = 1.0 + (baseBoost * upgradeLevel) / (upgradeLevel * 0.9 + dampener);
                    } else if (actionType === 'play') {
                        // Play has slightly better scaling at mid-levels
                        boostMultiplier = 1.0 + ((baseBoost * 1.05) * upgradeLevel) / (upgradeLevel * 0.85 + dampener);
                    } else if (actionType === 'sing') {
                        // Sing has the best late-game scaling
                        boostMultiplier = 1.0 + ((baseBoost * 1.1) * upgradeLevel) / (upgradeLevel * 0.75 + dampener);
                    }
                }
                
                // Calculate the final boost value with the multiplier
                const boostValue = Math.round(baseValue * boostMultiplier);
                
                // Apply the boosted value to the pet stat (capped at 100)
                petStats[statToUpdate] = Math.min(100, petStats[statToUpdate] + boostValue);
            } 
            
            triggerButtonActivationEffect(actionButtons[actionType]); 
            
            if (pet) { 
                // Make the pet hop animation more energetic based on upgrade level
                const upgradeLevel = playerUpgrades[actionType] || 0;
                const hopHeight = 0.1 * (1 + upgradeLevel * 0.1); // Slightly higher hop with upgrades
                const initialPetY = pet.position.y; // Store initial position
                
                // Remove any existing pet position animations to prevent conflicts
                anime.remove(pet.position);
                
                anime({ 
                    targets: pet.position, 
                    y: [initialPetY, initialPetY + hopHeight, initialPetY], 
                    duration: 300, 
                    easing: 'easeInOutSine',
                    complete: () => {
                        // Ensure pet returns to exact initial position to prevent sticking
                        if (pet && pet.position) {
                            pet.position.y = initialPetY;
                            debugLog('🐾 Pet position reset after hop to prevent sticking');
                        }
                    }
                }); 
            } 
            
            updateHUD(); 
        }
        function handleExtendTimeAction() { 
            // Add time to the game clock
            gameTime += CONFIG.TIME_EXTENSION_AMOUNT;
            
            // If using real-time timer system, adjust the initial time and start time to account for the extension
            if (realTimeTimerStart > 0) {
                // Also extend the initialGameTime, so future calculations use the extended total
                initialGameTime += CONFIG.TIME_EXTENSION_AMOUNT;
                
                // Add the extension time to our real-time tracking (in milliseconds)
                realTimeTimerStart += CONFIG.TIME_EXTENSION_AMOUNT * 1000;
                debugLog(`Extended time by ${CONFIG.TIME_EXTENSION_AMOUNT}s, new total: ${initialGameTime}s`);
            }
            
            playSound('correctAnswer'); 
            triggerButtonActivationEffect(actionButtons.extendTime); 
            
            // Force immediate timer display update
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        function handleStressFairyAction() { playSound('fairy'); triggerButtonActivationEffect(actionButtons.stressFairy); animateStressFairy(); }
        
        // Create a dramatic lightning strike effect for legendary pet reveal
        function createLegendaryLightningEffect(onCompleteCallback) {
            if (!scene || !camera) {
                if (onCompleteCallback) onCompleteCallback();
                return;
            }
            
            // Play legendary thunder sound effect
            playSound('legendaryLightning');
            
            // Create a full-screen lightning flash overlay
            const flashOverlay = document.createElement('div');
            flashOverlay.style.position = 'absolute';
            flashOverlay.style.top = '0';
            flashOverlay.style.left = '0';
            flashOverlay.style.width = '100%';
            flashOverlay.style.height = '100%';
            flashOverlay.style.backgroundColor = '#ffffff';
            flashOverlay.style.opacity = '0';
            flashOverlay.style.pointerEvents = 'none';
            flashOverlay.style.zIndex = '1000';
            document.body.appendChild(flashOverlay);
            
            // We're removing the gold burst effect as requested
            
            // Store original scene lighting
            const originalAmbientIntensity = ambientLight.intensity;
            
            // Create lightning bolt in 3D scene
            const createLightningBolt = () => {
                const lightningGroup = new THREE.Group();
                const lightningMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.9 });
                
                // Create a jagged lightning path from top of scene to cage
                const numSegments = 7;
                const maxOffset = 1.5;
                const segmentLength = 2;
                
                let prevPoint = new THREE.Vector3(0, 15, 0);
                const points = [prevPoint.clone()];
                
                for (let i = 1; i < numSegments; i++) {
                    let nextPoint = new THREE.Vector3(
                        prevPoint.x + (Math.random() - 0.5) * maxOffset, 
                        prevPoint.y - segmentLength, 
                        prevPoint.z + (Math.random() - 0.5) * maxOffset
                    );
                    
                    // Final segment aims at cage
                    if (i === numSegments - 1 && cage) {
                        nextPoint.x = cage.position.x;
                        nextPoint.z = cage.position.z;
                        nextPoint.y = cage.position.y + 1;
                    }
                    
                    points.push(nextPoint.clone());
                    prevPoint = nextPoint;
                }
                
                // Create lightning segments
                for (let i = 0; i < points.length - 1; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    
                    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
                    const distance = p1.distanceTo(p2);
                    
                    // Create bolt segment
                    const thickness = 0.2 - (i * 0.02); // Taper thickness
                    const boltGeo = new THREE.CylinderGeometry(thickness, thickness, distance, 6);
                    const bolt = new THREE.Mesh(boltGeo, lightningMat);
                    
                    // Position and orient segment
                    bolt.position.copy(p1);
                    bolt.position.lerp(p2, 0.5);
                    
                    // Orient cylinder to point from p1 to p2
                    bolt.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        direction
                    );
                    
                    lightningGroup.add(bolt);
                    
                    // Add small branches occasionally
                    if (Math.random() > 0.5 && i < points.length - 2) {
                        const branchLength = distance * 0.6;
                        const branchEnd = new THREE.Vector3(
                            p1.x + (Math.random() - 0.5) * 2,
                            p1.y - branchLength * 0.7,
                            p1.z + (Math.random() - 0.5) * 2
                        );
                        
                        const branchDir = new THREE.Vector3().subVectors(branchEnd, p1).normalize();
                        const branchDist = p1.distanceTo(branchEnd);
                        
                        const branchGeo = new THREE.CylinderGeometry(thickness * 0.6, thickness * 0.3, branchDist, 5);
                        const branch = new THREE.Mesh(branchGeo, lightningMat);
                        
                        branch.position.copy(p1);
                        branch.position.lerp(branchEnd, 0.5);
                        
                        branch.quaternion.setFromUnitVectors(
                            new THREE.Vector3(0, 1, 0),
                            branchDir
                        );
                        
                        lightningGroup.add(branch);
                    }
                }
                
                // Create a point light that follows down the lightning bolt
                const lightningLight = new THREE.PointLight(0xffffdd, 5, 15);
                lightningLight.position.copy(points[0]);
                lightningGroup.add(lightningLight);
                
                // Animate light moving down bolt
                anime({
                    targets: lightningLight.position,
                    x: [points.map(p => p.x)],
                    y: [points.map(p => p.y)],
                    z: [points.map(p => p.z)],
                    duration: 700,
                    easing: 'linear'
                });
                
                scene.add(lightningGroup);
                
                return { lightningGroup, lightningLight };
            };
            
            // Sequence of lightning effects
            anime.timeline({
                easing: 'easeOutQuad',
                complete: () => {
                    // Clean up DOM elements
                    document.body.removeChild(flashOverlay);
                    // No need to remove goldBurst as we no longer create it
                    
                    // Reset scene lighting to original
                    if (ambientLight) ambientLight.intensity = originalAmbientIntensity;
                    
                    // Trigger callback when effect is complete
                    if (onCompleteCallback) onCompleteCallback();
                }
            })
            .add({
                // Initial distant lightning flash
                begin: () => {
                    ambientLight.intensity = Math.min(2.5, originalAmbientIntensity + 1.5);
                },
                targets: flashOverlay,
                opacity: [0, 0.7, 0],
                duration: 300,
                complete: () => {
                    ambientLight.intensity = originalAmbientIntensity;
                }
            })
            .add({
                // Short pause before main strike
                duration: 600
            })
            .add({
                // Main lightning strike
                begin: () => {
                    const { lightningGroup, lightningLight } = createLightningBolt();
                    
                    // Intense flash
                    ambientLight.intensity = Math.min(4.0, originalAmbientIntensity + 3.0);
                    
                    // Cleanup after effect
                    setTimeout(() => {
                        scene.remove(lightningGroup);
                        lightningGroup.traverse(child => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) child.material.dispose();
                        });
                    }, 1500);
                },
                targets: flashOverlay,
                opacity: [0, 0.9, 0.7, 0],
                duration: 800,
                complete: () => {
                    ambientLight.intensity = originalAmbientIntensity * 1.2; // Slightly brighter than original
                }
            })
            // Removed gold burst effect
        }
        
        function triggerLightning() {
            if (gameState !== 'PLAYING' || !ambientLight) return;
            playSound('lightning');
            const originalAmbientIntensity = ambientLight.intensity;
            ambientLight.intensity = Math.min(3.0, originalAmbientIntensity + 1.8); 
            const lightningFlash = new THREE.DirectionalLight(0xddddff, 4); 
            lightningFlash.position.set((Math.random()-0.5)*15, 15, (Math.random()-0.5)*15);
            scene.add(lightningFlash);
            setTimeout(() => { ambientLight.intensity = originalAmbientIntensity; scene.remove(lightningFlash); lightningFlash.dispose(); }, 120); 
            animateCageJolt(); 
            // Apply chain strength reduction to lightning stress using the advanced formula
            const chainStrengthLevel = playerUpgrades.chainStrength || 0;
            
            // Advanced formula for chain strength effect with diminishing returns
            // Formula: 1 - (baseEffect * level) / (level + effectDampener)
            const baseEffect = 0.15; // Base effect (15% at level 1)
            const effectDampener = 1.5; // Controls how quickly diminishing returns kick in
            
            // Calculate the reduction percentage (caps at ~75% at very high levels)
            const stressReduction = chainStrengthLevel > 0 ? 
                (baseEffect * chainStrengthLevel) / (chainStrengthLevel + effectDampener) : 0;
            
            // Apply the reduction with a minimum 25% of original damage (maximum 75% reduction)
            const stressMultiplier = Math.max(0.25, 1 - stressReduction);
            
            // Apply rarity-specific stress multiplier to lightning stress
            const rarityStressMultiplier = CONFIG.PET_RARITIES[currentPetRarityKey]?.stressMultiplier || 1.0;
            chainStress += CONFIG.LIGHTNING_STRESS_INCREASE * stressMultiplier * rarityStressMultiplier;
            chainStress = Math.min(chainStress, CONFIG.MAX_STRESS);
            updateHUD(); 
            if (chainStress >= CONFIG.MAX_STRESS && gameState === 'PLAYING') { stopHeartbeat(); handlePetLost("Chain snapped!"); }
            if (gameState === 'PLAYING') { const nextStrikeDelay = CONFIG.LIGHTNING_MIN_INTERVAL + Math.random() * (CONFIG.LIGHTNING_MAX_INTERVAL - CONFIG.LIGHTNING_MIN_INTERVAL); lightningTimeoutId = setTimeout(triggerLightning, nextStrikeDelay); }
        }

        // XI. EVENT HANDLERS
        // Initialize pet rarity slider controls and add event listeners
        function initPetRarityControls() {
            if (!commonRateSlider || !rareRateSlider || !legendaryRateSlider) return;
            
            // Load saved pet rarity rates from localStorage first
            loadPetRarityRates();
            
            // Initialize sliders with the current values
            commonRateSlider.value = Math.round(customPetRarityRates.common * 100);
            rareRateSlider.value = Math.round(customPetRarityRates.rare * 100);
            legendaryRateSlider.value = Math.round(customPetRarityRates.legendary * 100);
            
            // Update display values
            updatePetRarityDisplayValues();
            
            // Add event listeners to the sliders
            commonRateSlider.addEventListener('input', updatePetRarityRates);
            rareRateSlider.addEventListener('input', updatePetRarityRates);
            legendaryRateSlider.addEventListener('input', updatePetRarityRates);
        }
        
        // Update pet rarity rates when sliders change
        function updatePetRarityRates() {
            // Get values from sliders
            const commonValue = parseInt(commonRateSlider.value);
            const rareValue = parseInt(rareRateSlider.value);
            const legendaryValue = parseInt(legendaryRateSlider.value);
            
            // Update display values
            commonRateValueDisplay.textContent = commonValue;
            rareRateValueDisplay.textContent = rareValue;
            legendaryRateValueDisplay.textContent = legendaryValue;
            
            // Calculate total - should be 100%
            const total = commonValue + rareValue + legendaryValue;
            
            // Show warning if total is not 100%
            if (total !== 100) {
                rarityRateWarning.style.display = 'block';
                rarityRateWarning.textContent = `Warning: Total is ${total}%. Should be 100%. Adjusting values...`;
                
                // Adjust values proportionally to make total 100%
                const scaleFactor = 100 / total;
                let adjustedCommon = Math.round(commonValue * scaleFactor);
                let adjustedRare = Math.round(rareValue * scaleFactor);
                let adjustedLegendary = Math.round(legendaryValue * scaleFactor);
                
                // Make sure they add up to exactly 100% after rounding
                const newTotal = adjustedCommon + adjustedRare + adjustedLegendary;
                if (newTotal !== 100) {
                    // Add/subtract the difference from the largest value
                    const diff = 100 - newTotal;
                    if (adjustedCommon >= adjustedRare && adjustedCommon >= adjustedLegendary) {
                        adjustedCommon += diff;
                    } else if (adjustedRare >= adjustedCommon && adjustedRare >= adjustedLegendary) {
                        adjustedRare += diff;
                    } else {
                        adjustedLegendary += diff;
                    }
                }
                
                // Store adjusted values in the customPetRarityRates object
                customPetRarityRates.common = adjustedCommon / 100;
                customPetRarityRates.rare = adjustedRare / 100;
                customPetRarityRates.legendary = adjustedLegendary / 100;
            } else {
                // If total is 100%, hide warning and store values directly
                rarityRateWarning.style.display = 'none';
                
                // Store values in the customPetRarityRates object
                customPetRarityRates.common = commonValue / 100;
                customPetRarityRates.rare = rareValue / 100;
                customPetRarityRates.legendary = legendaryValue / 100;
            }
            
            // Save the pet rarity rates to localStorage
            savePetRarityRates();
        }
        
        // Save pet rarity rates to localStorage
        function savePetRarityRates() {
            try {
                localStorage.setItem('petRescue3_petRarityRates', JSON.stringify(customPetRarityRates));
            } catch (e) {
                console.error('Error saving pet rarity rates:', e);
            }
        }
        
        // Load pet rarity rates from localStorage
        function loadPetRarityRates() {
            try {
                const savedRates = localStorage.getItem('petRescue3_petRarityRates');
                if (savedRates) {
                    const parsedRates = JSON.parse(savedRates);
                    // Make sure all three rates are present
                    if (parsedRates.common !== undefined && 
                        parsedRates.rare !== undefined && 
                        parsedRates.legendary !== undefined) {
                        
                        customPetRarityRates = parsedRates;
                        
                        // Update the sliders with loaded values
                        if (commonRateSlider && rareRateSlider && legendaryRateSlider) {
                            commonRateSlider.value = Math.round(customPetRarityRates.common * 100);
                            rareRateSlider.value = Math.round(customPetRarityRates.rare * 100);
                            legendaryRateSlider.value = Math.round(customPetRarityRates.legendary * 100);
                            
                            // Update display values
                            updatePetRarityDisplayValues();
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading pet rarity rates:', e);
                // Reset to default values if there's an error
                customPetRarityRates = createDefaultCustomPetRarityRates();
            }
        }
        
        // Update the display values for pet rarity rates
        function updatePetRarityDisplayValues() {
            commonRateValueDisplay.textContent = Math.round(customPetRarityRates.common * 100);
            rareRateValueDisplay.textContent = Math.round(customPetRarityRates.rare * 100);
            legendaryRateValueDisplay.textContent = Math.round(customPetRarityRates.legendary * 100);
        }

        // Auto mode functionality - check stat bars and auto-activate buttons
        function setupAutoMode() {
            const autoToggle = document.getElementById('auto-toggle');
            const petStatusPanel = document.getElementById('pet-status-section'); // Select the Pet Status panel
            
            // Add event listener to the toggle button
            autoToggle.addEventListener('change', function() {
                autoModeEnabled = this.checked;
                debugLog('Auto mode ' + (autoModeEnabled ? 'enabled' : 'disabled'));
                
                // Add or remove the glowing border class based on auto mode state
                if (autoModeEnabled) {
                    petStatusPanel.classList.add('auto-mode-active');
                } else {
                    petStatusPanel.classList.remove('auto-mode-active');
                }
            });
            
            // Set up interval to periodically check stat bars when auto mode is enabled
            setInterval(checkStatBarsForAuto, 1000); // Check every second
        }
        
        // Function to check stat bars and auto-activate buttons if needed
        function checkStatBarsForAuto() {
            // Don't do anything if auto mode is disabled or game is not in playing state
            if (!autoModeEnabled || gameState !== 'PLAYING') return;
            
            // Check each stat bar and activate corresponding button if yellow or red
            checkAndActivateButton('hunger-bar', 'feed');
            checkAndActivateButton('hydration-bar', 'water');
            checkAndActivateButton('joy-bar', 'play');
            checkAndActivateButton('rest-bar', 'sing');
        }
        
        // Function to check a specific stat bar and activate its button if needed
        function checkAndActivateButton(barId, actionType) {
            const bar = document.getElementById(barId);
            const button = actionButtons[actionType];
            
            // Check if bar exists and has the warning class (yellow) OR critical class (red)
            if (bar && (bar.classList.contains('warning') || bar.classList.contains('critical'))) {
                // Check if button is not disabled and not on cooldown
                if (button && !button.disabled) {
                    // Check if we have enough energy points
                    const cost = CONFIG.ACTION_ENERGY_COSTS[actionType];
                    
                    if (playerEnergy >= cost) {
                        // Simulate button click
                        handlePlayerAction(actionType);
                    } else {
                        // Not enough energy points, play error sound
                        playSound('errorSound');
                    }
                }
            }
        }
        
        function setupEventListeners() {
            window.addEventListener('resize', handleViewportResize, { passive: true });
            Object.keys(actionButtons).forEach(action => { if (actionButtons[action]) { actionButtons[action].addEventListener('click', () => handlePlayerAction(action)); } });
            window.addEventListener('keydown', (e) => { if (gameState !== 'PLAYING' || mathBoxElements.some(input => document.activeElement === input) ) return; const keyActionMap = { 'f': 'feed', 'w': 'water', 'p': 'play', 's': 'sing', 'e': 'extendTime', 't': 'stressFairy' }; const action = keyActionMap[e.key.toLowerCase()]; if (action) handlePlayerAction(action); });
            
            // Initialize pet rarity controls
            initPetRarityControls();
            
            // Note: Mouse click handling for treasure clouds is set up in setupTreasureCloudClickHandling()
            // which is called after the renderer is created
            
            document.getElementById('restart-button-lose').addEventListener('click', startGame);
            // document.getElementById('restart-button-win').addEventListener('click', startGame); // Not used per rescue
            
            settingsButton.addEventListener('click', openSettingsPanel);
            document.getElementById('save-settings-button').addEventListener('click', saveGameSettingsOnly);
            document.getElementById('close-settings-button').addEventListener('click', closeSettingsPanel);
            
            // MM:SS timer input event handlers
            timerSettingMinutes.addEventListener('input', function(e) {
                // Keep only numeric values
                this.value = this.value.replace(/[^0-9]/g, '');
                
                // Force values between 0-60
                let val = parseInt(this.value);
                if (val > 10) {
                    this.value = '10'; // Maximum 10 minutes (600 seconds)
                }
                
                // Auto-advance to seconds input when 2 digits are entered
                if (this.value.length >= 2) {
                    timerSettingSeconds.focus();
                }
            });
            
            timerSettingSeconds.addEventListener('input', function(e) {
                // Keep only numeric values
                this.value = this.value.replace(/[^0-9]/g, '');
                
                // Force values between 0-59
                let val = parseInt(this.value);
                if (val > 59) {
                    this.value = '59';
                }
            });
            
            // Tab control for timer settings
            timerSettingMinutes.addEventListener('keydown', function(e) {
                // If backspace on empty field, go to previous field
                if (e.key === 'Backspace' && this.value === '') {
                    // No previous field in this case
                }
            });
            
            timerSettingSeconds.addEventListener('keydown', function(e) {
                // If backspace on empty field, go to previous field
                if (e.key === 'Backspace' && this.value === '') {
                    timerSettingMinutes.focus();
                }
            });
            document.getElementById('save-settings-button').addEventListener('click', saveGameSettingsOnly);
            document.getElementById('restart-settings-button').addEventListener('click', restartToStartOverlay);
            document.getElementById('clear-all-button').addEventListener('click', clearAllGameData);
            
            document.getElementById('sound-uploads-button').addEventListener('click', () => {
                const section = document.getElementById('sound-uploads-section');
                const isHidden = window.getComputedStyle(section).display === 'none';
                section.style.display = isHidden ? 'block' : 'none';
            });
            document.getElementById('visual-edits-button').addEventListener('click', () => {
                const section = document.getElementById('visual-edits-section');
                const isHidden = window.getComputedStyle(section).display === 'none';
                section.style.display = isHidden ? 'block' : 'none';
            });
            document.getElementById('save-custom-sounds-button').addEventListener('click', () => { let savedCount = 0; for (const type in stagedCustomSounds) { if (stagedCustomSounds.hasOwnProperty(type) && stagedCustomSounds[type]) { try { localStorage.setItem(`customSound_${type}`, stagedCustomSounds[type]); savedCount++; } catch (e) { console.error(`Error saving sound ${type}:`, e); alert(`Could not save ${type}.`); } } } if (savedCount > 0) alert(`${savedCount} sound(s) saved! Apply & Restart or refresh to ensure all sounds are used if game is running.`); else alert('No new sounds staged to save.'); stagedCustomSounds = {}; });
            const visualSettingsHandlers = { 'ambient-light-intensity': (v) => { if (ambientLight) ambientLight.intensity = parseFloat(v);}, 'directional-light-intensity': (v) => { const dL = scene.children.find(c => c instanceof THREE.DirectionalLight && c !== skyLight); if (dL) dL.intensity = parseFloat(v);}, 'spot-light-intensity': (v) => { scene.children.filter(c => c instanceof THREE.SpotLight).forEach(l => l.intensity = parseFloat(v));}, 'lava-glow-intensity': (v) => { const lL = scene.children.find(c => c instanceof THREE.PointLight && c.position.y < 0); if (lL) lL.intensity = parseFloat(v);}, 'ambient-light-color': (v) => { if (ambientLight) ambientLight.color.set(v);}, 'directional-light-color': (v) => { const dL = scene.children.find(c => c instanceof THREE.DirectionalLight && c !== skyLight); if (dL) dL.color.set(v);}, 'spot-light-color': (v) => { scene.children.filter(c => c instanceof THREE.SpotLight).forEach(l => l.color.set(v));}, 'lava-glow-color': (v) => { const lL = scene.children.find(c => c instanceof THREE.PointLight && c.position.y < 0); if (lL) lL.color.set(v);}, 'fog-near': (v) => { if (scene.fog) scene.fog.near = parseFloat(v);}, 'fog-far': (v) => { if (scene.fog) scene.fog.far = parseFloat(v);}, 'fog-color': (v) => { if (scene.fog) scene.fog.color.set(v);}, 'tone-mapping-exposure': (v) => { if (renderer) renderer.toneMappingExposure = parseFloat(v);}, 'shadow-quality': (v) => { const q = {'low':1024,'medium':2048,'high':4096}[v]; scene.traverse(c => { if (c instanceof THREE.Light && c.castShadow) { c.shadow.mapSize.width = q; c.shadow.mapSize.height = q; if (c.shadow.map) { c.shadow.map.dispose(); c.shadow.map = null;}}});}, 'camera-min-distance': (v) => { if (controls) controls.minDistance = parseFloat(v);}, 'camera-max-distance': (v) => { if (controls) controls.maxDistance = parseFloat(v);}, 'camera-damping': (v) => { if (controls) controls.dampingFactor = parseFloat(v);} };
            Object.entries(visualSettingsHandlers).forEach(([id, handler]) => { const el = document.getElementById(id); if (el) { el.addEventListener('input', (e) => { if(scene && renderer) handler(e.target.value); }); } });
            Object.entries(soundUploadInputs).forEach(([type, input]) => { if (input) { input.addEventListener('change', async (e) => { if (e.target.files && e.target.files[0]) { await handleSoundUpload(type, e.target.files[0]); } }); } });
            for (let i = 1; i <= 8; i++) { 
                const button = document.createElement('button'); 
                button.classList.add('difficulty-level-button'); 
                button.textContent = i; 
                button.dataset.level = i; 
                // Add tooltip with the level description
                if (levelProblemConfig[i] && levelProblemConfig[i].description) {
                    button.title = levelProblemConfig[i].description;
                }
                // Always call with skipCost=false so it costs 1 EP every time a button is clicked by user
                button.addEventListener('click', () => selectChallengeLevel(i, false)); 
                epChallengeButtonsContainer.appendChild(button); 
            }
            updateChallengeUI();
            // DISABLED: This conflicting event listener was preventing sounds from working
            // startButton.addEventListener('click', () => { if (gameStarted && gameState !== 'INIT' && gameState !== 'LOSE' && gameState !== 'INTRO') { if (gameState === 'PLAYING' || gameState === 'TRANSITIONING') return; } if (Howler.ctx && Howler.ctx.state && Howler.ctx.state === "suspended") { Howler.ctx.resume().catch(e => {console.warn("Audio context resume failed", e)}); } Howler.autoUnlock = true; gameStarted = true; startOverlay.style.opacity = 0; setTimeout(() => { startOverlay.style.display = 'none'; }, 600); gameContainer.style.opacity = 1; const settingsPanelRight = parseInt(window.getComputedStyle(settingsPanel).right); if (settingsPanelRight === 0) { closeSettingsPanel(); } startGame(); });
            const mathWizardBtn = document.getElementById('math-wizard-button');
            
            // Lock Pick Boost Buttons
            const lockPickBoostButtons = document.querySelectorAll('.lock-pick-boost-button');
            const lockProgressBar = document.getElementById('lock-progress-bar');
            let activeBoostTimer = null;
            
            // Function to activate lock pick boost
            function activateLockBoost(multiplier, energyCost, duration) {
                // Clear any existing boost timer
                if (activeBoostTimer) {
                    clearTimeout(activeBoostTimer);
                    activeBoostTimer = null;
                }
                
                // Apply energy cost
                playerEnergy -= energyCost;
                updateHUD();
                
                // Play activation sound
                playSound('lockPickClick');
                
                // Set boost multiplier
                currentBoostMultiplier = multiplier;
                
                // Add visual boost effect
                if (lockProgressBar) {
                    lockProgressBar.classList.add('boosted');
                }
                
                // Set timer to end boost
                activeBoostTimer = setTimeout(() => {
                    endBoost();
                }, duration);
            }
            
            // Function to end boost effect
            function endBoost() {
                currentBoostMultiplier = 1;
                if (lockProgressBar) {
                    lockProgressBar.classList.remove('boosted');
                }
                activeBoostTimer = null;
                playSound('lockPickClick'); // Play sound when boost ends
            }

            // Math Wizard cooldown tracking (variables moved to top of file)
            
            // Default cooldown duration in seconds
            const DEFAULT_MATH_WIZARD_COOLDOWN = 60;
            
            // Function to display notifications (for upgrades, achievements, etc.)
            function displayNotification(message, type = 'default') {
                const notificationContainer = document.getElementById('notification-container') || (() => {
                    // Create notification container if it doesn't exist
                    const container = document.createElement('div');
                    container.id = 'notification-container';
                    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:1000;';
                    document.body.appendChild(container);
                    return container;
                })();
                
                // Create notification element
                const notification = document.createElement('div');
                notification.className = `game-notification ${type}-notification`;
                notification.innerHTML = message;
                notification.style.cssText = 'background:rgba(0,0,0,0.75);color:#fff;padding:10px 15px;border-radius:5px;margin:10px 0;' + 
                                          'animation:fadeInOut 3s ease-in-out;opacity:0;max-width:300px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
                
                // Add color based on type
                if (type === 'upgrade') {
                    notification.style.borderLeft = '4px solid #4CAF50';
                } else if (type === 'warning') {
                    notification.style.borderLeft = '4px solid #FFC107';
                } else if (type === 'error') {
                    notification.style.borderLeft = '4px solid #F44336';
                } else {
                    notification.style.borderLeft = '4px solid #2196F3';
                }
                
                // Add keyframe animation if it doesn't exist
                if (!document.getElementById('notification-animation')) {
                    const style = document.createElement('style');
                    style.id = 'notification-animation';
                    style.innerHTML = `
                        @keyframes fadeInOut {
                            0% { opacity: 0; transform: translateX(50px); }
                            15% { opacity: 1; transform: translateX(0); }
                            85% { opacity: 1; transform: translateX(0); }
                            100% { opacity: 0; transform: translateX(50px); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Add to container and remove after animation
                notificationContainer.appendChild(notification);
                setTimeout(() => {
                    notification.remove();
                    // Clean up container if empty
                    if (notificationContainer.children.length === 0) {
                        notificationContainer.remove();
                    }
                }, 3000);
            }
            
            if (mathWizardBtn) {
                mathWizardBtn.addEventListener('click', async () => {
                    // Check if on cooldown
                    if (mathWizardCooldown > 0) {
                        playSound('errorSound');
                        animateElementShake(mathWizardBtn);
                        return;
                    }
                    
                    // Use the accumulated total cooldown reduction from all upgrades
                    const cooldownReduction = playerUpgrades.totalCooldownReduction || 0;
                    
                    // Apply cooldown (minimum 1 second)
                    mathWizardCooldown = Math.max(1, DEFAULT_MATH_WIZARD_COOLDOWN - cooldownReduction);
                    mathWizardBtn.disabled = true;
                    
                    // Update cooldown display
                    const cooldownDisplay = mathWizardBtn.querySelector('.cooldown-timer');
                    if (cooldownDisplay) cooldownDisplay.textContent = mathWizardCooldown + 's';
                    
                    // Start cooldown timer
                    if (mathWizardCooldownTimer) clearInterval(mathWizardCooldownTimer);
                    mathWizardCooldownTimer = setInterval(() => {
                        mathWizardCooldown--;
                        if (cooldownDisplay) cooldownDisplay.textContent = mathWizardCooldown > 0 ? mathWizardCooldown + 's' : '';
                        
                        if (mathWizardCooldown <= 0) {
                            clearInterval(mathWizardCooldownTimer);
                            mathWizardCooldownTimer = null;
                            mathWizardBtn.disabled = false;
                            if (cooldownDisplay) cooldownDisplay.textContent = '';
                            // Play glimmer_converted sound when cooldown ends (but not during initial game setup)
                            if (gameStarted && gameTime < initialGameTime) {
                            playSound('newPetReveal');
                            }
                        }
                    }, 1000);
                    
                    playSound('mathWizard'); // Play Math Wizard sound
                    await animateMathWizardFairy();
                });
            }

            // --- Math Wizard Fairy Animation ---
            let mathWizardFairyObject = null;
            let previouslySelectedDifficultyLevel = null; // Store the previously selected difficulty level
            
            async function animateMathWizardFairy() {
                if (mathWizardFairyObject) return; // Prevent double activation
                
                // Store the currently selected difficulty level before starting the animation
                previouslySelectedDifficultyLevel = currentChallengeLevel;
                debugLog(`🧙‍♀️ Math Wizard storing original difficulty level: ${previouslySelectedDifficultyLevel}`);
                // 1. Fairy Activation Animation
                mathWizardFairyObject = new THREE.Group();

                // Fairy core: bright, emissive green with standard material for lighting
                const fairyCoreGeo = new THREE.SphereGeometry(0.12, 14, 10);
                const fairyCoreMat = new THREE.MeshStandardMaterial({
                    color: 0x00ff88,
                    emissive: 0x00ff88, // Stronger green
                    emissiveIntensity: 2.2, // Match Stress Fairy's glow
                    metalness: 0.25,
                    roughness: 0.18,
                    transparent: true,
                    opacity: 0.97
                });
                const fairyCore = new THREE.Mesh(fairyCoreGeo, fairyCoreMat);
                mathWizardFairyObject.add(fairyCore);

                // Add a strong point light to the fairy (like Stress Fairy)
                const fairyLight = new THREE.PointLight(0x33ffaa, 2.5, 5); // Increased intensity and range
                fairyLight.position.set(0, 0, 0);
                mathWizardFairyObject.add(fairyLight);

                // Fairy sparkle particles - more vibrant and animated
                const particleCount = 70; // Increased particle count
                const particlesGeo = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const opacities = new Float32Array(particleCount); // For individual particle opacity
                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3 + 0] = (Math.random() - 0.5) * 0.8; // Slightly wider spread
                    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                    opacities[i] = Math.random() * 0.5 + 0.3; // Random initial opacity
                }
                particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                particlesGeo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1)); // Custom attribute for opacity

                const particleMat = new THREE.PointsMaterial({
                    color: 0x77ffdd, // Brighter particle color
                    size: 0.06,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: true, // Prevents particles from occluding each other harshly
                    sizeAttenuation: true
                });
                const fairyParticles = new THREE.Points(particlesGeo, particleMat);
                mathWizardFairyObject.add(fairyParticles);

                // Fairy wand (simple glowing stick)
                const wandGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
                const wandMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: 0xccffee,
                    emissiveIntensity: 0.8, // Increased wand emissive intensity
                    metalness: 0.1,
                    roughness: 0.4
                });
                const wand = new THREE.Mesh(wandGeo, wandMat);
                wand.position.set(0.13, -0.1, 0);
                wand.rotation.z = -Math.PI/6;
                mathWizardFairyObject.add(wand);

                // Wand tip glow
                const wandTipGeo = new THREE.SphereGeometry(0.05, 8, 8);
                const wandTipMat = new THREE.MeshStandardMaterial({
                    color: 0x99ffcc,
                    emissive: 0x77ffbb,
                    emissiveIntensity: 1.8, // Increased tip emissive intensity
                    transparent: true,
                    opacity: 0.9
                });
                const wandTip = new THREE.Mesh(wandTipGeo, wandTipMat);
                wandTip.position.set(0.13, 0.15, 0); // Position relative to wand's top
                mathWizardFairyObject.add(wandTip);
                
                // Add to scene, start below screen
                mathWizardFairyObject.position.set(-3, -2, 2);
                scene.add(mathWizardFairyObject);

                // --- Non-stop spinning ---
                let spinning = true;
                function spinFairy() {
                    if (!spinning || !mathWizardFairyObject) return;
                    mathWizardFairyObject.rotation.y += 0.035;
                    requestAnimationFrame(spinFairy);
                }
                spinFairy();

                // 1. Fairy flies to the right side of EP Challenge Credits area (above lava)
                const epPanel = document.getElementById('ep-challenge-panel');
                const epRect = epPanel.getBoundingClientRect();
                const gameRect = gameContainer.getBoundingClientRect();
                
                // Target: Right side of EP Challenge Credits area, above the lava
                const epCenterX = ((epRect.left + epRect.right) / 2 - gameRect.width/2) / 80;
                const rightSideTargetX = epCenterX + 3; // 1.5 units to the right of EP panel
                const rightSideTargetY = 4.0; // Above the lava level
                
                await new Promise(resolve => {
                    anime({
                        targets: mathWizardFairyObject.position,
                        x: [mathWizardFairyObject.position.x, rightSideTargetX],
                        y: [mathWizardFairyObject.position.y, rightSideTargetY],
                        z: [2, 0],
                        duration: 3000,
                        easing: 'easeInOutSine',
                        update: anim => {
                            // Gentle sway while flying
                            mathWizardFairyObject.position.x = rightSideTargetX + Math.sin(anim.progress/100*2*Math.PI*1.5) * 0.3;
                            // Animate particles & light
                            fairyParticles.rotation.y += 0.06;
                            fairyLight.intensity = 2.5 + Math.sin(performance.now() / 150) * 0.5;
                            // Continuous spinning
                            if (mathWizardFairyObject) {
                                mathWizardFairyObject.rotation.y += 0.03; 
                            }
                        },
                        complete: resolve
                    });
                });
                
                // Pause for a moment in the right side area
                await new Promise(resolve => setTimeout(resolve, 800));

                // 2. Random Difficulty Selection (weighted, modified by wizardIQ upgrade)
                const baseWeights = [30, 22, 16, 12, 8, 6, 4, 2]; // 1-8
                
                // Apply wizardIQ effect - shift weights toward higher difficulty levels
                const wizardIQLevel = playerUpgrades.wizardIQ || 0;
                let adjustedWeights = [...baseWeights]; // Make a copy of the weights array
                
                // Calculate the total energy points to award based on difficulty level
                // We'll use this later after selecting the difficulty level
                // For each difficulty level, award points for all 4 math problems
                let totalEnergyToAward = 0;
                
                if (wizardIQLevel > 0) {
                    // Calculate how much weight to shift from lower to higher difficulties
                    // Each level shifts more weight to higher difficulties
                    const shiftPercentage = Math.min(0.5, wizardIQLevel * 0.06); // Max 50% shift at level ~8-9
                    
                    // Apply shift from lower difficulties to higher difficulties
                    for (let i = 0; i < 4; i++) { // Lower difficulties (1-4)
                        const reduction = Math.floor(baseWeights[i] * shiftPercentage);
                        adjustedWeights[i] -= reduction;
                        
                        // Distribute this reduction to higher difficulties (5-8) proportionally
                        const totalHigherWeights = baseWeights.slice(4).reduce((a,b)=>a+b,0);
                        for (let j = 4; j < 8; j++) {
                            const proportion = baseWeights[j] / totalHigherWeights;
                            adjustedWeights[j] += Math.floor(reduction * proportion);
                        }
                    }
                }
                
                // Ensure no weight is below 1
                adjustedWeights = adjustedWeights.map(w => Math.max(1, w));
                
                // Use the adjusted weights for selection
                const total = adjustedWeights.reduce((a,b)=>a+b,0);
                let r = Math.random() * total, chosen = 1;
                for (let i=0; i<adjustedWeights.length; ++i) {
                    if (r < adjustedWeights[i]) { chosen = i+1; break; }
                    r -= adjustedWeights[i];
                }
                
                // Calculate the total energy points to award for all 4 math problems at this difficulty level
                const pointsPerProblem = chosen; // Each level awards its level number in EP (1-8)
                totalEnergyToAward = pointsPerProblem * 4; // For all 4 math problems
                
                debugLog(`Math Wizard selected difficulty level ${chosen}, will award ${totalEnergyToAward} energy points total`);
                
                // Highlight the button
                const diffBtns = epPanel.querySelectorAll('.difficulty-level-button');
                if (diffBtns[chosen-1]) {
                    diffBtns[chosen-1].classList.add('active-difficulty-button');
                    anime({ targets: diffBtns[chosen-1], scale: [1,1.2,1], duration: 400, easing: 'easeInOutSine' });
                }
                // Fairy hovers and sparkles
                await new Promise(resolve => setTimeout(resolve, 400));
                // Simulate click but don't charge EP (skipCost = true)
                selectChallengeLevel(chosen, true);
                debugLog(`🧙‍♀️ Math Wizard selected difficulty ${chosen}, original was ${previouslySelectedDifficultyLevel}`);
                await new Promise(resolve => setTimeout(resolve, 400));

                // 3. Fairy to center, raise wand, emit orbs
                const centerX = 0, centerY = 1.8, centerZ = 0;
                await new Promise(resolve => {
                    anime({
                        targets: mathWizardFairyObject.position,
                        x: centerX, y: centerY, z: centerZ,
                        duration: 900, easing: 'easeInOutCubic', complete: resolve
                    });
                });
                // Raise wand
                anime({ targets: wand.rotation, z: [-Math.PI/6, -Math.PI/2], duration: 400, easing: 'easeOutBack' });
                // 4. Emit orbs to math boxes
                // First, prevent the normal answer handling from awarding points
                // by creating a flag that will be checked in handleMCAnswer
                window.mathWizardSolvingProblems = true;
                
                // Track when all orbs are done
                let orbsCompleted = 0;
                const totalOrbs = 4;
                
                for (let i = 0; i < totalOrbs; i++) {
                    await new Promise(resolve => setTimeout(resolve, 180));
                    const orbGeo = new THREE.SphereGeometry(0.08, 10, 10);
                    const orbMat = new THREE.MeshStandardMaterial({
                        color: 0x99ffcc,
                        emissive: 0x66ffaa,
                        emissiveIntensity: 0.7,
                        transparent: true,
                        opacity: 0.85,
                        metalness: 0.1,
                        roughness: 0.4
                    });
                    const orb = new THREE.Mesh(orbGeo, orbMat);
                    orb.position.copy(mathWizardFairyObject.position);
                    scene.add(orb);
                    
                    // Get DOM math box position so the orb targets the current responsive layout.
                    const mathBox = document.getElementById(`math-box-${i}`);
                    if (!mathBox) {
                        console.warn(`Math box ${i} not found!`);
                        continue;
                    }
                    const worldTarget = getMathDeckWorldTarget(mathBox, 0);
                    const boxTargetX = worldTarget?.x ?? 0;
                    const boxTargetY = worldTarget?.y ?? 0;
                    const boxTargetZ = worldTarget?.z ?? 0;
                    
                    debugLog(`Problem ${i + 1} Target: x=${boxTargetX.toFixed(3)}, y=${boxTargetY.toFixed(3)}, z=${boxTargetZ}`);
                    
                    // Direct trajectory to math box center - perfectly straight flight
                    anime({
                        targets: orb.position,
                        x: boxTargetX,
                        y: boxTargetY,
                        z: boxTargetZ,
                        duration: 800, // Slightly longer for more visible flight
                        easing: 'easeInOutQuad', // Smooth direct motion
                        update: function(anim) {
                            // Add rotation to the orb for magical effect
                            orb.rotation.x += 0.08;
                            orb.rotation.y += 0.06;
                            orb.rotation.z += 0.04;
                        },
                        complete: () => {
                            // Auto-fill answer but no need to award EP here
                            // since we'll award all points at once after all orbs are done
                            const problem = activeChallengeProblems[i];
                            if (problem && mathMCGridElements[i]) {
                                // Find the correct button
                                const btns = mathMCGridElements[i].querySelectorAll('.mc-choice-btn');
                                for (const btn of btns) {
                                    if (btn.textContent.includes(problem.answer)) {
                                        // Instead of btn.click(), which would award points individually,
                                        // we'll just show the visual feedback
                                        btn.style.transform = 'scale(1.1)';
                                        setTimeout(() => {
                                            if (btn) btn.style.transform = '';
                                        }, 150);
                                        
                                        // Disable all buttons in this grid
                                        Array.from(mathMCGridElements[i].children).forEach(b => b.disabled = true);
                                        
                                        // Show the animation but don't award points yet
                                        animateMathFeedback(i, true);
                                        
                                        // Play the correct answer sound
                                        playSound('correctAnswer');
                                        
                                        // Generate new problem after a delay
                                        // We're using a shorter timeout and more reliable problem generation
                                        setTimeout(() => {
                                            let newProblemData;
                                            
                                            // For difficulty level 8, use a faster approach
                                            if (currentChallengeLevel === 8) {
                                                // Simply generate a new problem without complex validation
                                                // This is faster and less likely to get stuck
                                                newProblemData = generateProblemForCurrentLevel(i);
                                            } else {
                                                // For other levels, use standard approach but with improved reliability
                                                let regenRetries = 0;
                                                do {
                                                    newProblemData = generateProblemForCurrentLevel(i);
                                                    regenRetries++;
                                                    
                                                    // Use a simpler fallback after fewer retries to avoid getting stuck
                                                    if (regenRetries > 5) {
                                                        const fallbackProblems = [
                                                            { str: "5 + 7 = ?", ans: "12", type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT },
                                                            { str: "8 - 3 = ?", ans: "5", type: PROBLEM_TYPES.SUBTRACTION_SINGLE_DIGIT },
                                                            { str: "6 × 4 = ?", ans: "24", type: PROBLEM_TYPES.MULTIPLICATION_SINGLE_DIGIT },
                                                            { str: "10 ÷ 2 = ?", ans: "5", type: PROBLEM_TYPES.DIVISION_SINGLE_DIGIT_NO_REMAINDER }
                                                        ];
                                                        
                                                        // Pick a random fallback problem
                                                        const fallback = fallbackProblems[Math.floor(Math.random() * fallbackProblems.length)];
                                                        newProblemData = {
                                                            problemString: fallback.str,
                                                            answer: fallback.ans,
                                                            type: fallback.type,
                                                            requiresTextInput: false
                                                        };
                                                        break;
                                                    }
                                                } while (regenRetries <= 10 && 
                                                         activeChallengeProblems.some((p, idx) => 
                                                            idx !== i && p && p.problemString === newProblemData.problemString));
                                            }
                                            
                                            // Ensure we have valid problem data
                                            if (!newProblemData || !newProblemData.problemString) {
                                                newProblemData = {
                                                    problemString: "1 + 1 = ?",
                                                    answer: "2",
                                                    type: PROBLEM_TYPES.ADDITION_SINGLE_DIGIT,
                                                    requiresTextInput: false
                                                };
                                            }
                                            
                                            activeChallengeProblems[i] = newProblemData;
                                            displayProblemInBox(i, newProblemData);
                                        }, 400); // Reduced delay for faster problem regeneration
                                        
                                        break;
                                    }
                                }
                            }
                            
                            // Remove the orb and track completion
                            scene.remove(orb);
                            orbsCompleted++;
                            
                            // If this was the last orb, award the total energy points
                            if (orbsCompleted === totalOrbs) {
                                debugLog(`All ${totalOrbs} math problems solved, awarding ${totalEnergyToAward} energy points`);
                                
                                // Create and show a visual pop-up for the EP reward
                                showMathWizardRewardPopup(totalEnergyToAward);
                                
                                // Add points after a small delay so the animation can be seen first
                                setTimeout(() => {
                                    playerEnergy += totalEnergyToAward;
                                    updateHUD();
                                    
                                    // Still animate the energy counter as before
                                    const epCounter = document.getElementById('energy-counter');
                                    if (epCounter) {
                                        anime({
                                            targets: epCounter,
                                            scale: [1, 1.3, 1],
                                            duration: 600,
                                            easing: 'easeInOutBack'
                                        });
                                    }
                                }, 1200); // Delayed to let the popup animation play first
                                
                                // Reset the flag now that all problems are handled
                                window.mathWizardSolvingProblems = false;
                            }
                        }
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 1200));

                // 5. Fairy returns to right side of EP panel area, simulates click on previous button, flies off
                await new Promise(resolve => {
                    anime({
                        targets: mathWizardFairyObject.position,
                        x: rightSideTargetX, y: rightSideTargetY, z: 0,
                        duration: 900, easing: 'easeInOutCubic', complete: resolve
                    });
                });
                
                // Return to the previously selected difficulty level if it was stored
                if (previouslySelectedDifficultyLevel !== null && previouslySelectedDifficultyLevel !== chosen) {
                    debugLog(`Math Wizard is returning to previously selected difficulty level: ${previouslySelectedDifficultyLevel}`);
                    
                    // Find and highlight the original button
                    const diffBtns = epPanel.querySelectorAll('.difficulty-level-button');
                    if (diffBtns[chosen-1]) {
                        // Remove highlight from current button
                        diffBtns[chosen-1].classList.remove('active-difficulty-button');
                    }
                    
                    if (diffBtns[previouslySelectedDifficultyLevel-1]) {
                        // Highlight the original button
                        diffBtns[previouslySelectedDifficultyLevel-1].classList.add('active-difficulty-button');
                        anime({ 
                            targets: diffBtns[previouslySelectedDifficultyLevel-1], 
                            scale: [1,1.2,1], 
                            duration: 400, 
                            easing: 'easeInOutSine' 
                        });
                    }
                    
                    // Select the previous challenge level (with skipCost=true to avoid charging EP)
                    selectChallengeLevel(previouslySelectedDifficultyLevel, true);
                    debugLog(`✅ Math Wizard successfully restored difficulty to level ${previouslySelectedDifficultyLevel}`);
                } else {
                    // If the previous level is the same as chosen, or no previous level stored, stay with chosen
                    debugLog(`⚠️ Previous difficulty level (${previouslySelectedDifficultyLevel}) same as chosen (${chosen}) or not stored, staying with chosen level ${chosen}`);
                    // No need to call selectChallengeLevel again since it's already set to chosen
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Calculate position towards bottom right of screen
                const gameContainerRect = gameContainer.getBoundingClientRect();
                const exitTargetX = 4; // Far right side of screen
                const exitTargetY = -3; // Down towards bottom
                
                anime({
                    targets: mathWizardFairyObject.position,
                    x: exitTargetX,
                    y: exitTargetY,
                    z: 2,
                    duration: 2500,
                    easing: 'easeInSine',
                    update: anim => { // Combined update for opacity of all children
                        const currentOpacity = 1 - anim.progress / 100;
                        if (mathWizardFairyObject && mathWizardFairyObject.children) {
                            mathWizardFairyObject.children.forEach(child => {
                                if (child.material && child.material.transparent !== undefined) {
                                    child.material.transparent = true; // Ensure transparent is true
                                    child.material.opacity = currentOpacity;
                                }
                                if (child instanceof THREE.PointLight) { // Fade out light intensity
                                    child.intensity = (2.5 * currentOpacity); // Use base intensity for fade
                                }
                            });
                        }
                        // Continuous spinning during fade out
                        if (mathWizardFairyObject) {
                           mathWizardFairyObject.rotation.y += 0.03;
                        }
                    },
                    complete: () => {
                        spinning = false;
                        if (scene && mathWizardFairyObject) scene.remove(mathWizardFairyObject);
                        // Dispose of geometries and materials to free up resources
                        fairyCoreGeo.dispose();
                        fairyCoreMat.dispose();
                        particlesGeo.dispose();
                        particleMat.dispose();
                        wandGeo.dispose();
                        wandMat.dispose();
                        wandTipGeo.dispose();
                        wandTipMat.dispose();
                        mathWizardFairyObject = null;
                        
                        // Final safeguard: Ensure difficulty is properly restored
                        if (previouslySelectedDifficultyLevel !== null && currentChallengeLevel !== previouslySelectedDifficultyLevel) {
                            debugLog(`🧙‍♀️ Final safeguard: Restoring difficulty from ${currentChallengeLevel} to ${previouslySelectedDifficultyLevel}`);
                            selectChallengeLevel(previouslySelectedDifficultyLevel, true);
                        }
                        
                        // Reset the stored level
                        previouslySelectedDifficultyLevel = null;
                    }
                });
            }

            // --- Upgrades Modal Logic ---
            let gameWasPaused = false;
            let originalGameState = null;
            let pendingUpgrades = {};
            let pendingCooldownReductions = []; // Store actual rolled cooldown reduction values
            
            // Math Wizard gambling system with specified probabilities
            function rollCooldownReduction() {
                const random = Math.random();
                if (random < 0.50) {
                    return 1; // 50% chance for 1 second
                } else if (random < 0.85) {
                    return 2; // 35% chance for 2 seconds (50% + 35% = 85%)
                } else {
                    return 3; // 15% chance for 3 seconds (remaining 15%)
                }
            }
            
            // Show visual feedback for cooldown reduction roll
            function showCooldownRollFeedback(reduction, cardElement) {
                // Create feedback element
                const feedback = document.createElement('div');
                feedback.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 14px;
                    z-index: 10000;
                    pointer-events: none;
                    animation: rollFeedback 2.5s ease-out forwards;
                `;
                
                // Style based on the roll result
                if (reduction === 3) {
                    feedback.textContent = 'JACKPOT! +3s! ⚡';
                    feedback.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
                    feedback.style.color = '#8b4513';
                    feedback.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                } else if (reduction === 2) {
                    feedback.textContent = 'Nice! +2s! ⚡';
                    feedback.style.background = 'linear-gradient(45deg, #c0c0c0, #e8e8e8)';
                    feedback.style.color = '#333';
                    feedback.style.boxShadow = '0 0 15px rgba(192, 192, 192, 0.6)';
                } else {
                    feedback.textContent = '+1s ⚡';
                    feedback.style.background = 'linear-gradient(45deg, #cd7f32, #daa520)';
                    feedback.style.color = '#fff';
                    feedback.style.boxShadow = '0 0 10px rgba(205, 127, 50, 0.5)';
                }
                
                // Add to the card
                cardElement.style.position = 'relative';
                cardElement.appendChild(feedback);
                
                // Remove after animation
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.parentNode.removeChild(feedback);
                    }
                }, 2500);
            }

            function openUpgradesModal() {
                debugLog('🛒 openUpgradesModal function called');
                
                // Ensure totalCooldownReduction is properly initialized
                ensureTotalCooldownReduction();
                
                // Store current game state and pause manually (without overlay)
                originalGameState = gameState;
                gameWasPaused = isGamePaused;
                
                // Pause game manually without creating overlay (modal has its own dimming)
                isGamePaused = true;
                pauseStartTime = performance.now();
                
                // Pause all cooldown timers (same logic as pauseGame but without overlay)
                pausedTimers = [];
                
                // Pause math wizard cooldown timer
                if (mathWizardCooldownTimer) {
                    pausedTimers.push({
                        type: 'mathWizard',
                        timer: mathWizardCooldownTimer,
                        remainingTime: mathWizardCooldown
                    });
                    clearInterval(mathWizardCooldownTimer);
                    mathWizardCooldownTimer = null;
                }
                
                // Pause lock pick cooldown timers
                for (const [buttonId, timer] of Object.entries(lockPickCooldownTimers)) {
                    if (timer) {
                        const button = document.getElementById(buttonId);
                        const timerElement = button?.querySelector('.cooldown-timer');
                        const remainingText = timerElement?.textContent || '';
                        const remainingTime = parseFloat(remainingText.replace('s', '')) || 0;
                        
                        pausedTimers.push({
                            type: 'lockPick',
                            buttonId: buttonId,
                            timer: timer,
                            remainingTime: remainingTime
                        });
                        clearInterval(timer);
                        delete lockPickCooldownTimers[buttonId];
                    }
                }
                
                debugLog('🛒 Game paused manually for Power-Up Shop (no overlay conflict)');
                
                // Hide math problems to prevent overlap (they should already be paused, but hide for safety)
                const mathCells = document.querySelectorAll('.math-cell');
                mathCells.forEach(cell => {
                    cell.style.display = 'none';
                });
                debugLog('🛒 Math problems hidden');
                
                // Show modal
                const modal = document.getElementById('upgrades-modal-overlay');
                debugLog('🛒 Modal element found:', modal);
                
                if (modal) {
                    modal.classList.remove('is-hidden');
                    modal.style.display = 'flex';
                    document.body.classList.add('shop-open');
                    debugLog('🛒 Modal display set to flex');
                } else {
                    console.error('❌ Modal overlay not found!');
                    return;
                }
                
                // Update energy display in modal
                const modalEnergyValue = document.getElementById('modal-energy-value');
                if (modalEnergyValue) {
                    modalEnergyValue.textContent = playerEnergy;
                    debugLog('🛒 Modal energy updated to:', playerEnergy);
                }
                
                // Clear pending upgrades and cooldown reductions first
                pendingUpgrades = {};
                pendingCooldownReductions = [];
                
                // Sync modal values with current upgrade levels
                syncModalWithUpgrades();
                
                // Update Power Level Score immediately when modal opens
                updatePowerLevelScore();
                forcePowerLevelUpdate();
                debugLog('🔥 Power Level updated when modal opened');
                
                // Debug: Log current cooldown values
                debugLog('🛒 Current playerUpgrades.totalCooldownReduction:', playerUpgrades.totalCooldownReduction);
                debugLog('🛒 Current playerUpgrades.mathCooldown:', playerUpgrades.mathCooldown);
                
                debugLog('🛒 Upgrades modal opened successfully, game fully paused');
            }

            openUpgradesModalHandler = openUpgradesModal;

            function closeUpgradesModal() {
                // Hide modal
                const modal = document.getElementById('upgrades-modal-overlay');
                modal.style.display = 'none';
                modal.classList.add('is-hidden');
                document.body.classList.remove('shop-open');
                
                // Show math problems again
                const mathCells = document.querySelectorAll('.math-cell');
                mathCells.forEach(cell => {
                    cell.style.display = '';
                });
                debugLog('🛒 Math problems restored');
                
                // Resume game manually (same logic as resumeGame but without overlay removal)
                isGamePaused = false;
                
                // Calculate how long we were paused and adjust the timer
                if (pauseStartTime > 0) {
                    const pauseDuration = performance.now() - pauseStartTime;
                    totalPauseTime += pauseDuration;
                    
                    // Adjust the real-time timer start to account for pause time
                    if (realTimeTimerStart > 0) {
                        realTimeTimerStart += pauseDuration;
                    }
                    
                    pauseStartTime = 0;
                    debugLog(`🛒 Game resumed after ${(pauseDuration / 1000).toFixed(1)}s pause`);
                }
                
                // Resume all paused timers
                for (const pausedTimer of pausedTimers) {
                    if (pausedTimer.type === 'mathWizard' && pausedTimer.remainingTime > 0) {
                        // Resume math wizard cooldown
                        mathWizardCooldown = pausedTimer.remainingTime;
                        const mathWizardBtn = document.getElementById('math-wizard-button');
                        const cooldownDisplay = mathWizardBtn?.querySelector('.cooldown-timer');
                        
                        if (mathWizardBtn && cooldownDisplay) {
                            mathWizardBtn.disabled = true;
                            cooldownDisplay.textContent = mathWizardCooldown + 's';
                            
                            mathWizardCooldownTimer = setInterval(() => {
                                mathWizardCooldown--;
                                cooldownDisplay.textContent = mathWizardCooldown > 0 ? mathWizardCooldown + 's' : '';
                                
                                if (mathWizardCooldown <= 0) {
                                    clearInterval(mathWizardCooldownTimer);
                                    mathWizardCooldownTimer = null;
                                    mathWizardBtn.disabled = false;
                                    cooldownDisplay.textContent = '';
                                    // Play glimmer_converted sound when cooldown ends (but not during initial game setup)
                                    if (gameStarted && gameTime < initialGameTime) {
                                        playSound('newPetReveal');
                                    }
                                }
                            }, 1000);
                        }
                    } else if (pausedTimer.type === 'lockPick' && pausedTimer.remainingTime > 0) {
                        // Resume lock pick cooldown
                        const button = document.getElementById(pausedTimer.buttonId);
                        const timerElement = button?.querySelector('.cooldown-timer');
                        
                        if (button && timerElement) {
                            let remainingTime = pausedTimer.remainingTime;
                            timerElement.textContent = remainingTime.toFixed(1) + 's';
                            
                            lockPickCooldownTimers[pausedTimer.buttonId] = setInterval(() => {
                                remainingTime -= 0.1;
                                timerElement.textContent = remainingTime > 0 ? remainingTime.toFixed(1) + 's' : '';
                                
                                if (remainingTime <= 0) {
                                    clearInterval(lockPickCooldownTimers[pausedTimer.buttonId]);
                                    delete lockPickCooldownTimers[pausedTimer.buttonId];
                                    button.classList.remove('on-cooldown');
                                    timerElement.textContent = '';
                                    updateLockPickButtonStates();
                                }
                            }, 100);
                        }
                    }
                }
                
                // Clear paused timers array
                pausedTimers = [];
                
                debugLog('🛒 Upgrades modal closed, game manually resumed (no overlay to remove)');
            }

            function syncModalWithUpgrades() {
                debugLog('🛒 Syncing modal with current upgrades:', playerUpgrades);
                
                // Sync all upgrade levels and effects with modal using actual playerUpgrades data
                const upgradeMapping = {
                    'lockpick': 'lockPick',
                    'luckycharms': 'luckyCharms', 
                    'chainstrength': 'chainStrength',
                    'cooldown': 'mathCooldown',
                    'food': 'food',
                    'water': 'water',
                    'play': 'play',
                    'sing': 'sing'
                };
                
                Object.keys(upgradeMapping).forEach(modalType => {
                    const playerUpgradeKey = upgradeMapping[modalType];
                    const currentLevel = playerUpgrades[playerUpgradeKey] || 0;
                    
                    // Update level display
                    const levelElement = document.getElementById(`modal-level-${modalType}`);
                    if (levelElement) {
                        levelElement.textContent = currentLevel;
                    }
                    
                    // Update effect display using original formulas
                    const effectElement = document.getElementById(`modal-effect-${modalType}`);
                    if (effectElement) {
                        let effectValue = 0;
                        
                        switch(modalType) {
                            case 'lockpick':
                                // Original formula: 1 + (level * 0.25) = 25% boost per level
                                const lockPickMultiplier = 1 + (currentLevel * 0.25);
                                effectValue = Math.round((lockPickMultiplier - 1) * 100) + '%';
                                break;
                            case 'luckycharms':
                                // Original formula: 5% rare and 3% legendary per level
                                const rareIncrease = 5 * currentLevel;
                                const legendaryIncrease = 3 * currentLevel;
                                effectValue = `+${rareIncrease}% rare, +${legendaryIncrease}% legendary`;
                                break;
                            case 'chainstrength':
                                // Original formula: (baseEffect * level) / (level + dampener) with baseEffect=0.15, dampener=1.0
                                if (currentLevel > 0) {
                                    const baseEffect = 0.15;
                                    const dampener = 1.0;
                                    const stressReduction = (baseEffect * currentLevel) / (currentLevel + dampener);
                                    effectValue = Math.round(stressReduction * 100) + '%';
                                } else {
                                    effectValue = '0%';
                                }
                                break;
                            case 'cooldown':
                                // Show total accumulated cooldown reduction (varies due to randomness)
                                effectValue = (playerUpgrades.totalCooldownReduction || 0) + 's';
                                debugLog('🛒 Syncing cooldown effect:', effectValue, 'from totalCooldownReduction:', playerUpgrades.totalCooldownReduction);
                                break;
                            case 'food':
                                // Original formula for food: 1.0 + (baseBoost * level) / (level * 0.8 + dampener)
                                if (currentLevel > 0) {
                                    const baseBoost = 0.15;
                                    const dampener = 1.0;
                                    const boostMultiplier = 1.0 + (baseBoost * currentLevel) / (currentLevel * 0.8 + dampener);
                                    effectValue = Math.round((boostMultiplier - 1) * 100) + '%';
                                } else {
                                    effectValue = '0%';
                                }
                                break;
                            case 'water':
                                // Original formula for water: 1.0 + (baseBoost * level) / (level * 0.9 + dampener)
                                if (currentLevel > 0) {
                                    const baseBoost = 0.15;
                                    const dampener = 1.0;
                                    const boostMultiplier = 1.0 + (baseBoost * currentLevel) / (currentLevel * 0.9 + dampener);
                                    effectValue = Math.round((boostMultiplier - 1) * 100) + '%';
                                } else {
                                    effectValue = '0%';
                                }
                                break;
                            case 'play':
                                // Original formula for play: 1.0 + ((baseBoost * 1.05) * level) / (level * 0.85 + dampener)
                                if (currentLevel > 0) {
                                    const baseBoost = 0.15;
                                    const dampener = 1.0;
                                    const boostMultiplier = 1.0 + ((baseBoost * 1.05) * currentLevel) / (currentLevel * 0.85 + dampener);
                                    effectValue = Math.round((boostMultiplier - 1) * 100) + '%';
                                } else {
                                    effectValue = '0%';
                                }
                                break;
                            case 'sing':
                                // Original formula for sing: 1.0 + ((baseBoost * 1.1) * level) / (level * 0.75 + dampener)
                                if (currentLevel > 0) {
                                    const baseBoost = 0.15;
                                    const dampener = 1.0;
                                    const boostMultiplier = 1.0 + ((baseBoost * 1.1) * currentLevel) / (currentLevel * 0.75 + dampener);
                                    effectValue = Math.round((boostMultiplier - 1) * 100) + '%';
                                } else {
                                    effectValue = '0%';
                                }
                                break;
                        }
                        
                        effectElement.textContent = effectValue;
                    }
                    
                    // Update button cost display using exponential pricing
                    const buttonElement = document.querySelector(`[data-upgrade="${modalType}"]`);
                    if (buttonElement) {
                        const nextCost = Math.pow(2, currentLevel + 1); // 2, 4, 8, 16, 32, 64, etc.
                        buttonElement.textContent = `Buy (-${nextCost} EP)`;
                    }
                });
                
                // Update Power Level Score displays
                updatePowerLevelScore();
                
                debugLog('🛒 Modal sync completed');
            }

            function applyPendingUpgrades() {
                debugLog('🛒 Applying pending upgrades:', pendingUpgrades);
                
                // Apply all pending upgrades directly to playerUpgrades
                Object.keys(pendingUpgrades).forEach(upgradeType => {
                    const count = pendingUpgrades[upgradeType];
                    
                    // Map modal upgrade types to playerUpgrades keys
                    let playerUpgradeKey;
                    switch(upgradeType) {
                        case 'lockpick':
                            playerUpgradeKey = 'lockPick';
                            break;
                        case 'luckycharms':
                            playerUpgradeKey = 'luckyCharms';
                            break;
                        case 'chainstrength':
                            playerUpgradeKey = 'chainStrength';
                            break;
                        case 'cooldown':
                            playerUpgradeKey = 'mathCooldown';
                            break;
                        default:
                            playerUpgradeKey = upgradeType; // food, water, play, sing
                    }
                    
                    // Apply the upgrades
                    for (let i = 0; i < count; i++) {
                        if (playerUpgradeKey === 'mathCooldown') {
                            // Special handling for cooldown upgrade using pre-rolled values
                            playerUpgrades.mathCooldown = (playerUpgrades.mathCooldown || 0) + 1;
                            
                            // Use the pre-rolled cooldown reduction value
                            const cooldownReduction = pendingCooldownReductions[i] || rollCooldownReduction(); // Fallback to new roll if somehow missing
                            playerUpgrades.totalCooldownReduction = (playerUpgrades.totalCooldownReduction || 0) + cooldownReduction;
                            debugLog(`🛒 Applied cooldown upgrade. New level: ${playerUpgrades.mathCooldown}, Pre-rolled reduction: ${cooldownReduction}s, Total reduction: ${playerUpgrades.totalCooldownReduction}s`);
                        } else {
                            // Regular upgrades
                            playerUpgrades[playerUpgradeKey] = (playerUpgrades[playerUpgradeKey] || 0) + 1;
                            debugLog(`🛒 Applied ${playerUpgradeKey} upgrade. New level: ${playerUpgrades[playerUpgradeKey]}`);
                        }
                    }
                });
                
                // Save upgrades to localStorage
                localStorage.setItem('lavaCageUpgrades', JSON.stringify(playerUpgrades));
                debugLog('🛒 Upgrades saved to localStorage');
                
                // Update HUD to reflect new upgrades
                updateHUD();
                
                // Update upgrade displays including Power Level Score
                updateUpgradeDisplay();
                
                // Clear pending upgrades and cooldown reductions
                pendingUpgrades = {};
                pendingCooldownReductions = [];
                
                // Sync modal again after applying
                syncModalWithUpgrades();
                
                // Force update the cooldown effect display specifically
                const cooldownEffectElement = document.getElementById('modal-effect-cooldown');
                if (cooldownEffectElement) {
                    cooldownEffectElement.textContent = (playerUpgrades.totalCooldownReduction || 0) + 's';
                    debugLog('🛒 Updated cooldown effect display to:', playerUpgrades.totalCooldownReduction + 's');
                }
                
                debugLog('🛒 All pending upgrades applied successfully');
            }

            // Upgrades Panel Button Logic - Ensure DOM is ready
            function initializeUpgradesButton() {
                const upgradesPanelButton = document.getElementById('upgrades-panel-button');
                debugLog('🔍 Looking for Power-Up Shop button...', upgradesPanelButton);
                
                if (upgradesPanelButton) {
                    debugLog('🛒 Power-Up Shop button found, attaching event listener');
                    upgradesPanelButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        debugLog('🛒 Power-Up Shop button clicked!');
                        
                        // Play start button sound when opening Power-Up Shop
                        debugLog('🔊 Playing start button sound for Power-Up Shop...');
                        playSound('startButton');
                        
                        openUpgradesModal();
                    });
                } else {
                    console.error('❌ Power-Up Shop button not found!');
                    // Try again in a moment
                    setTimeout(initializeUpgradesButton, 100);
                }
            }
            
            // Modal Action Buttons
            const saveUpgradesBtn = document.getElementById('save-upgrades-btn');
            const cancelUpgradesBtn = document.getElementById('cancel-upgrades-btn');
            
            if (saveUpgradesBtn) {
                saveUpgradesBtn.addEventListener('click', () => {
                    debugLog('🛒 Save button clicked, applying pending upgrades...');
                    
                    // Play start button sound for Save Changes button
                    debugLog('🔊 Playing start button sound for Save Changes...');
                    playSound('startButton');
                    
                    applyPendingUpgrades();
                    
                    // Update main energy display
                    const energyValueElement = document.getElementById('energy-value');
                    if (energyValueElement) {
                        energyValueElement.textContent = playerEnergy;
                    }
                    
                    closeUpgradesModal();
                    
                    debugLog('🛒 Save completed successfully');
                });
            }
            
            if (cancelUpgradesBtn) {
                cancelUpgradesBtn.addEventListener('click', () => {
                    debugLog('🛒 Cancel button clicked, pending upgrades:', pendingUpgrades);
                    
                    // Play start button sound for Cancel button
                    debugLog('🔊 Playing start button sound for Cancel...');
                    playSound('startButton');
                    
                    // Restore energy points from pending upgrades using proper exponential pricing
                    let totalPendingCost = 0;
                    Object.keys(pendingUpgrades).forEach(upgradeType => {
                        const count = pendingUpgrades[upgradeType];
                        
                        // Map modal upgrade types to playerUpgrades keys
                        let playerUpgradeKey;
                        switch(upgradeType) {
                            case 'lockpick':
                                playerUpgradeKey = 'lockPick';
                                break;
                            case 'luckycharms':
                                playerUpgradeKey = 'luckyCharms';
                                break;
                            case 'chainstrength':
                                playerUpgradeKey = 'chainStrength';
                                break;
                            case 'cooldown':
                                playerUpgradeKey = 'mathCooldown';
                                break;
                            default:
                                playerUpgradeKey = upgradeType; // food, water, play, sing
                        }
                        
                        // Calculate the cost for each pending upgrade
                        const baseLevel = playerUpgrades[playerUpgradeKey] || 0;
                        for (let i = 0; i < count; i++) {
                            const levelCost = Math.pow(2, baseLevel + i + 1);
                            totalPendingCost += levelCost;
                        }
                    });
                    
                    playerEnergy += totalPendingCost;
                    debugLog(`🛒 Restored ${totalPendingCost} energy points. New total: ${playerEnergy}`);
                    
                    // Update main energy display
                    const energyValueElement = document.getElementById('energy-value');
                    if (energyValueElement) {
                        energyValueElement.textContent = playerEnergy;
                    }
                    
                    // Update HUD
                    updateHUD();
                    
                    // Clear pending upgrades and cooldown reductions, then resync modal
                    pendingUpgrades = {};
                    pendingCooldownReductions = [];
                    syncModalWithUpgrades();
                    closeUpgradesModal();
                    
                    debugLog('🛒 Cancel completed successfully');
                });
            }

            // Modal Upgrade Buttons Logic
            const modalUpgradeButtons = document.querySelectorAll('.modal-upgrade-button');
            modalUpgradeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const upgradeType = button.getAttribute('data-upgrade');
                    
                    // Map modal upgrade types to playerUpgrades keys for cost calculation
                    let playerUpgradeKey;
                    switch(upgradeType) {
                        case 'lockpick':
                            playerUpgradeKey = 'lockPick';
                            break;
                        case 'luckycharms':
                            playerUpgradeKey = 'luckyCharms';
                            break;
                        case 'chainstrength':
                            playerUpgradeKey = 'chainStrength';
                            break;
                        case 'cooldown':
                            playerUpgradeKey = 'mathCooldown';
                            break;
                        default:
                            playerUpgradeKey = upgradeType; // food, water, play, sing
                    }
                    
                    // Calculate current level including pending upgrades
                    const currentLevel = (playerUpgrades[playerUpgradeKey] || 0) + (pendingUpgrades[upgradeType] || 0);
                    
                    // Calculate upgrade cost using exponential pricing (2^(level+1))
                    const upgradeCost = Math.pow(2, currentLevel + 1); // 2, 4, 8, 16, 32, 64, etc.
                    
                    // Check if player has enough energy
                    if (playerEnergy >= upgradeCost) {
                        // Play correct answer sound for successful upgrade purchase
                        debugLog('🔊 Playing correct answer sound for modal upgrade...');
                        playSound('correctAnswer');
                        
                        // Special handling for cooldown (Math Wizard) upgrades
                        if (upgradeType === 'cooldown') {
                            // Roll for cooldown reduction using gambling system
                            const rolledReduction = rollCooldownReduction();
                            
                            // Store the actual rolled value
                            pendingCooldownReductions.push(rolledReduction);
                            
                            // Show visual feedback
                            const cardElement = button.closest('.modal-upgrade-card');
                            if (cardElement) {
                                showCooldownRollFeedback(rolledReduction, cardElement);
                            }
                            
                            debugLog(`🎰 Math Wizard upgrade rolled: ${rolledReduction}s cooldown reduction!`);
                        }
                        
                        // Add to pending upgrades
                        pendingUpgrades[upgradeType] = (pendingUpgrades[upgradeType] || 0) + 1;
                        
                        // Temporarily reduce energy points for preview
                        playerEnergy -= upgradeCost;
                        
                        // Update modal energy display
                        const modalEnergyValue = document.getElementById('modal-energy-value');
                        if (modalEnergyValue) {
                            modalEnergyValue.textContent = playerEnergy;
                        }
                        
                        // Update the level display in modal (preview)
                        const levelElement = document.getElementById(`modal-level-${upgradeType}`);
                        if (levelElement) {
                            const newLevel = parseInt(levelElement.textContent) + 1 || 1;
                            levelElement.textContent = newLevel;
                        }
                        
                        // Update effect display based on upgrade type
                        updateModalEffectDisplay(upgradeType);
                        
                        // Update power level again after effect display update
                        setTimeout(() => {
                            updatePowerLevelScore();
                            debugLog('🔄 Power level updated after effect display update');
                        }, 10);
                        
                        // Update Power Level Score in real-time with visual feedback
                        debugLog('🔥 BEFORE Power Level Update - Pending Upgrades:', pendingUpgrades);
                        debugLog('🔥 BEFORE Power Level Update - Player Upgrades:', playerUpgrades);
                        updatePowerLevelScore();
                        
                        // Add visual feedback for power level increase
                        const modalScoreDisplay = document.getElementById('modal-power-level-score');
                        if (modalScoreDisplay) {
                            debugLog('🔥 Current modal score display value:', modalScoreDisplay.textContent);
                            modalScoreDisplay.style.transform = 'scale(1.2)';
                            modalScoreDisplay.style.color = '#4CAF50';
                            setTimeout(() => {
                                modalScoreDisplay.style.transform = 'scale(1)';
                                modalScoreDisplay.style.color = '';
                            }, 300);
                        } else {
                            debugLog('❌ Modal score display element not found!');
                        }
                        
                        debugLog('🔥 Power Level updated after upgrade purchase!');
                        
                        // Force a second update to ensure display refreshes
                        setTimeout(() => {
                            debugLog('🔄 SECONDARY UPDATE - Pending Upgrades:', pendingUpgrades);
                            updatePowerLevelScore();
                            debugLog('🔄 Secondary power level update completed');
                        }, 50);
                        
                        // Force a third update to be absolutely sure
                        setTimeout(() => {
                            debugLog('🔄 TERTIARY UPDATE - Forcing final update');
                            updatePowerLevelScore();
                            const finalScore = calculatePowerLevelScore();
                            debugLog('🔄 Final calculated score:', finalScore);
                        }, 100);
                        
                        // Update button cost display for next purchase
                        const nextCost = Math.pow(2, currentLevel + 2); // Cost for next level
                        button.textContent = `Buy (-${nextCost} EP)`;
                        
                        debugLog(`🛒 Added ${upgradeType} to pending upgrades. Cost: ${upgradeCost} EP, Next cost: ${nextCost} EP`);
                        
                        // FINAL power level update - ensure this happens after all other DOM updates
                        setTimeout(() => {
                            debugLog('🔄 FINAL DEFINITIVE Power Level Update');
                            updatePowerLevelScore();
                            
                            // Double-check the modal display specifically
                            const finalModalScoreDisplay = document.getElementById('modal-power-level-score');
                            if (finalModalScoreDisplay) {
                                const currentScore = calculatePowerLevelScore();
                                finalModalScoreDisplay.textContent = currentScore;
                                debugLog(`🔄 FINAL: Manually set modal score to ${currentScore}`);
                            }
                        }, 200);
                    } else {
                        debugLog(`❌ Not enough energy points for upgrade. Need: ${upgradeCost} EP, Have: ${playerEnergy} EP`);
                        
                        // Play error sound when not enough energy
                        debugLog('🔊 Playing error sound for insufficient energy...');
                        playSound('errorSound');
                    }
                });
            });

            function updateModalEffectDisplay(upgradeType) {
                const effectElement = document.getElementById(`modal-effect-${upgradeType}`);
                if (!effectElement) return;
                
                // Get current level from modal (including pending upgrades)
                const levelElement = document.getElementById(`modal-level-${upgradeType}`);
                const currentLevel = parseInt(levelElement?.textContent) || 0;
                
                let newEffect;
                
                // Calculate effect based on upgrade type and current level using original formulas
                switch(upgradeType) {
                    case 'lockpick':
                        // Original formula: 1 + (level * 0.25) = 25% boost per level
                        const lockPickMultiplier = 1 + (currentLevel * 0.25);
                        newEffect = Math.round((lockPickMultiplier - 1) * 100) + '%';
                        break;
                    case 'luckycharms':
                        // Original formula: 5% rare and 3% legendary per level
                        const rareIncrease = 5 * currentLevel;
                        const legendaryIncrease = 3 * currentLevel;
                        newEffect = `+${rareIncrease}% rare, +${legendaryIncrease}% legendary`;
                        break;
                    case 'chainstrength':
                        // Original formula: (baseEffect * level) / (level + dampener) with baseEffect=0.15, dampener=1.0
                        if (currentLevel > 0) {
                            const baseEffect = 0.15;
                            const dampener = 1.0;
                            const stressReduction = (baseEffect * currentLevel) / (currentLevel + dampener);
                            newEffect = Math.round(stressReduction * 100) + '%';
                        } else {
                            newEffect = '0%';
                        }
                        break;
                    case 'cooldown':
                        // Calculate total cooldown reduction including actual rolled values
                        let totalCooldownReduction = playerUpgrades.totalCooldownReduction || 0;
                        
                        // Add actual rolled reductions from pending upgrades
                        if (pendingCooldownReductions.length > 0) {
                            const pendingTotal = pendingCooldownReductions.reduce((sum, reduction) => sum + reduction, 0);
                            totalCooldownReduction += pendingTotal;
                            debugLog('🎰 Pending cooldown reductions:', pendingCooldownReductions, 'Total pending:', pendingTotal);
                        }
                        
                        newEffect = totalCooldownReduction + 's';
                        debugLog('🛒 Cooldown effect calculated:', newEffect, 'base:', playerUpgrades.totalCooldownReduction, 'pending total:', totalCooldownReduction - (playerUpgrades.totalCooldownReduction || 0));
                        break;
                    case 'food':
                        // Original formula for food: 1.0 + (baseBoost * level) / (level * 0.8 + dampener)
                        if (currentLevel > 0) {
                            const baseBoost = 0.15;
                            const dampener = 1.0;
                            const boostMultiplier = 1.0 + (baseBoost * currentLevel) / (currentLevel * 0.8 + dampener);
                            newEffect = Math.round((boostMultiplier - 1) * 100) + '%';
                        } else {
                            newEffect = '0%';
                        }
                        break;
                    case 'water':
                        // Original formula for water: 1.0 + (baseBoost * level) / (level * 0.9 + dampener)
                        if (currentLevel > 0) {
                            const baseBoost = 0.15;
                            const dampener = 1.0;
                            const boostMultiplier = 1.0 + (baseBoost * currentLevel) / (currentLevel * 0.9 + dampener);
                            newEffect = Math.round((boostMultiplier - 1) * 100) + '%';
                        } else {
                            newEffect = '0%';
                        }
                        break;
                    case 'play':
                        // Original formula for play: 1.0 + ((baseBoost * 1.05) * level) / (level * 0.85 + dampener)
                        if (currentLevel > 0) {
                            const baseBoost = 0.15;
                            const dampener = 1.0;
                            const boostMultiplier = 1.0 + ((baseBoost * 1.05) * currentLevel) / (currentLevel * 0.85 + dampener);
                            newEffect = Math.round((boostMultiplier - 1) * 100) + '%';
                        } else {
                            newEffect = '0%';
                        }
                        break;
                    case 'sing':
                        // Original formula for sing: 1.0 + ((baseBoost * 1.1) * level) / (level * 0.75 + dampener)
                        if (currentLevel > 0) {
                            const baseBoost = 0.15;
                            const dampener = 1.0;
                            const boostMultiplier = 1.0 + ((baseBoost * 1.1) * currentLevel) / (currentLevel * 0.75 + dampener);
                            newEffect = Math.round((boostMultiplier - 1) * 100) + '%';
                        } else {
                            newEffect = '0%';
                        }
                        break;
                    default:
                        newEffect = currentLevel * 10; // Default fallback
                }
                
                effectElement.textContent = newEffect;
                
                // Update power level after effect display is updated
                setTimeout(() => {
                    updatePowerLevelScore();
                    debugLog('🔄 Power level updated after effect display change');
                }, 5);
            }

            // --- Minimize Button Logic ---
            const minimizeButtons = [
                { btn: document.getElementById('minimize-ep-challenge'), panel: document.getElementById('ep-challenge-panel') },
                { btn: document.getElementById('minimize-total-score'), panel: document.getElementById('total-score-panel') },
                { btn: document.getElementById('minimize-level-display'), panel: document.getElementById('level-display-panel') }
            ];
            minimizeButtons.forEach(({ btn, panel }) => {
                if (btn && panel) {
                    btn.addEventListener('click', () => {
                        panel.classList.toggle('minimized');
                    });
                }
            });

            // --- Draggable Panels Logic ---
            const draggablePanels = [
                document.getElementById('ep-challenge-panel'),
                document.getElementById('total-score-panel'),
                document.getElementById('level-display-panel'),
                document.querySelector('.hud')
            ];

            // Store default positions for reset
            const panelDefaultPositions = new Map();
            draggablePanels.forEach(panel => {
                if (panel) {
                    const rect = panel.getBoundingClientRect();
                    panelDefaultPositions.set(panel, {
                        left: panel.style.left || '',
                        top: panel.style.top || '',
                        right: panel.style.right || '',
                        bottom: panel.style.bottom || '',
                        width: panel.style.width || '',
                    });
                }
            });

            function makePanelDraggable(panel) {
                const handle = panel.querySelector('.drag-handle');
                if (!handle) return;
                let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
                handle.style.cursor = isDesktopInteractionLayout() ? 'grab' : 'default';
                handle.addEventListener('mousedown', (e) => {
                    if (!isDesktopInteractionLayout()) {
                        return;
                    }

                    isDragging = true;
                    handle.style.cursor = 'grabbing';
                    const rect = panel.getBoundingClientRect();
                    startX = e.clientX;
                    startY = e.clientY;
                    origLeft = rect.left;
                    origTop = rect.top;
                    panel.style.position = 'fixed';
                    panel.style.left = `${rect.left}px`;
                    panel.style.top = `${rect.top}px`;
                    panel.style.width = `${rect.width}px`;
                    panel.style.right = '';
                    panel.style.bottom = '';
                    panel.style.zIndex = 999;
                    e.preventDefault();
                });
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    panel.style.left = (origLeft + dx) + 'px';
                    panel.style.top = (origTop + dy) + 'px';
                });
                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        handle.style.cursor = isDesktopInteractionLayout() ? 'grab' : 'default';
                        // Optionally, lower z-index after drag
                        setTimeout(() => { panel.style.zIndex = ''; }, 200);
                    }
                });
            }
            draggablePanels.forEach(panel => { if (panel) makePanelDraggable(panel); });
            syncDraggablePanelsForLayout();

            // Reset panel positions on game start
            function resetPanelPositions() {
                draggablePanels.forEach(panel => {
                    if (panel && panelDefaultPositions.has(panel)) {
                        const pos = panelDefaultPositions.get(panel);
                        panel.style.left = pos.left;
                        panel.style.top = pos.top;
                        panel.style.right = pos.right;
                        panel.style.bottom = pos.bottom;
                        panel.style.width = pos.width;
                        panel.style.position = '';
                        panel.style.zIndex = '';
                    }
                });

                resetLockPickingDockPosition();
                syncDraggablePanelsForLayout();
            }
            // DISABLED: This conflicting event listener was also preventing sounds from working
            // Patch start button to reset panel positions
            // if (startButton) {
            //     const origStartHandler = startButton.onclick;
            //     startButton.addEventListener('click', () => {
            //         resetPanelPositions();
            //         if (typeof origStartHandler === 'function') origStartHandler();
            //     });
            // }
            
            // Function to show Math Wizard reward popup
            function showMathWizardRewardPopup(amount) {
                // Create reward popup container if it doesn't exist
                let popupContainer = document.getElementById('math-wizard-reward-popup');
                if (!popupContainer) {
                    popupContainer = document.createElement('div');
                    popupContainer.id = 'math-wizard-reward-popup';
                    document.body.appendChild(popupContainer);
                    
                    // Add CSS for the popup if not already present
                    if (!document.getElementById('math-wizard-reward-popup-style')) {
                        const style = document.createElement('style');
                        style.id = 'math-wizard-reward-popup-style';
                        style.textContent = `
                            #math-wizard-reward-popup {
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                pointer-events: none;
                                z-index: 9999;
                                perspective: 1000px;
                            }
                            .math-wizard-reward {
                                background: linear-gradient(135deg, #3a6eff, #5271f5);
                                border: 3px solid #64B5F6;
                                border-radius: 15px;
                                padding: 20px 40px;
                                box-shadow: 0 0 30px rgba(33, 150, 243, 0.8), 0 0 60px rgba(33, 150, 243, 0.4);
                                text-align: center;
                                color: white;
                                font-family: 'Arial Rounded MT Bold', 'Arial', sans-serif;
                                transform-origin: center;
                                opacity: 0;
                                transform: scale(0.3) translateY(40px) rotateX(-20deg);
                                animation: reward-appear 0.7s forwards cubic-bezier(0.23, 1, 0.32, 1),
                                           reward-float 3s 0.7s ease-in-out infinite alternate;
                                max-width: 90%;
                            }
                            .math-wizard-reward .title {
                                font-size: 1.8rem;
                                margin: 0 0 5px 0;
                                text-shadow: 0 2px 5px rgba(0,0,0,0.4);
                                color: #fff;
                            }
                            .math-wizard-reward .amount {
                                font-size: 4.5rem;
                                font-weight: bold;
                                margin: 5px 0 15px 0;
                                color: #ffc107;
                                text-shadow: 0 0 10px rgba(255, 193, 7, 0.7),
                                             0 2px 3px rgba(0,0,0,0.5);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .math-wizard-reward .amount span {
                                display: inline-block;
                                animation: digit-pop 0.5s 0.8s both;
                                animation-delay: calc(0.8s + var(--digit-index) * 0.1s);
                            }
                            .math-wizard-reward .amount .energy-icon {
                                font-size: 3.8rem;
                                margin-left: 10px;
                                animation: energy-spin 2s 1s ease-in-out infinite;
                                display: inline-block;
                                transform-origin: center;
                            }
                            .math-wizard-reward .subtitle {
                                font-size: 1.2rem;
                                margin: 0;
                                opacity: 0.9;
                                color: #b3e5fc;
                            }
                            .multiplier-box span {
                                font-size: 0.9em;
                                margin: 0;
                                padding: 0;
                            }
                            /* Auto Toggle Switch Styles */
                            .auto-toggle-container {
                                display: inline-block;
                                margin-left: 10px;
                                vertical-align: middle;
                            }
                            .auto-toggle-label {
                                font-size: 0.8em;
                                color: #ccc;
                                margin-right: 5px;
                            }
                            .toggle-switch {
                                position: relative;
                                display: inline-block;
                                width: 40px;
                                height: 20px;
                                vertical-align: middle;
                            }
                            .toggle-switch input {
                                opacity: 0;
                                width: 0;
                                height: 0;
                            }
                            .toggle-slider {
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background-color: #555;
                                transition: .4s;
                                border-radius: 20px;
                            }
                            .toggle-slider:before {
                                position: absolute;
                                content: "";
                                height: 16px;
                                width: 16px;
                                left: 2px;
                                bottom: 2px;
                                background-color: white;
                                transition: .4s;
                                border-radius: 50%;
                            }
                            input:checked + .toggle-slider {
                                background-color: #4CAF50;
                            }
                            input:focus + .toggle-slider {
                                box-shadow: 0 0 1px #4CAF50;
                            }
                            input:checked + .toggle-slider:before {
                                transform: translateX(20px);
                            }
                            @keyframes reward-appear {
                                0% { opacity: 0; transform: scale(0.3) translateY(40px) rotateX(-20deg); }
                                60% { opacity: 1; transform: scale(1.1) translateY(-5px) rotateX(10deg); }
                                100% { opacity: 1; transform: scale(1) translateY(0) rotateX(0); }
                            }
                            @keyframes reward-float {
                                0% { transform: translateY(0) scale(1); }
                                100% { transform: translateY(-15px) scale(1.03); }
                            }
                            @keyframes digit-pop {
                                0% { transform: scale(0); opacity: 0; }
                                60% { transform: scale(1.4); opacity: 1; }
                                100% { transform: scale(1); opacity: 1; }
                            }
                            @keyframes energy-spin {
                                0% { transform: rotate(0deg) scale(1); }
                                50% { transform: rotate(180deg) scale(1.2); }
                                100% { transform: rotate(360deg) scale(1); }
                            }
                            .math-wizard-sparkle {
                                position: absolute;
                                width: 6px;
                                height: 6px;
                                border-radius: 50%;
                                background-color: white;
                                opacity: 0;
                                pointer-events: none;
                                animation: sparkle-fade 1.5s ease-out forwards;
                            }
                            @keyframes sparkle-fade {
                                0% { transform: scale(0); opacity: 0; }
                                20% { transform: scale(1); opacity: 1; }
                                100% { transform: scale(0); opacity: 0; }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                }
                
                // Clear previous popup content
                popupContainer.innerHTML = '';
                
                // Create the reward element
                const reward = document.createElement('div');
                reward.className = 'math-wizard-reward';
                
                // Create title
                const title = document.createElement('div');
                title.className = 'title';
                title.textContent = 'Math Wizard Reward!';
                reward.appendChild(title);
                
                // Create amount with animated digits
                const amountDiv = document.createElement('div');
                amountDiv.className = 'amount';
                
                // Convert amount to string and create span for each digit
                const amountStr = amount.toString();
                for (let i = 0; i < amountStr.length; i++) {
                    const digitSpan = document.createElement('span');
                    digitSpan.textContent = amountStr[i];
                    digitSpan.style.setProperty('--digit-index', i);
                    amountDiv.appendChild(digitSpan);
                }
                
                // Add energy icon
                const energyIcon = document.createElement('span');
                energyIcon.className = 'energy-icon';
                energyIcon.textContent = '⚡';
                amountDiv.appendChild(energyIcon);
                reward.appendChild(amountDiv);
                
                // Create subtitle
                const subtitle = document.createElement('div');
                subtitle.className = 'subtitle';
                subtitle.textContent = 'Energy Points Added!';
                reward.appendChild(subtitle);
                
                // Add to container
                popupContainer.appendChild(reward);
                
                // Create sparkles
                for (let i = 0; i < 30; i++) {
                    setTimeout(() => {
                        if (!popupContainer.parentNode) return; // Safety check
                        
                        const sparkle = document.createElement('div');
                        sparkle.className = 'math-wizard-sparkle';
                        
                        // Random position around the reward
                        const theta = Math.random() * Math.PI * 2;
                        const radius = 100 + Math.random() * 150;
                        const x = Math.cos(theta) * radius;
                        const y = Math.sin(theta) * radius;
                        
                        // Random color
                        const hue = 180 + Math.random() * 60; // Blue to cyan range
                        sparkle.style.backgroundColor = `hsl(${hue}, 100%, 75%)`;
                        sparkle.style.boxShadow = `0 0 8px 2px hsl(${hue}, 100%, 65%)`;
                        
                        // Random size
                        const size = 3 + Math.random() * 6;
                        sparkle.style.width = `${size}px`;
                        sparkle.style.height = `${size}px`;
                        
                        // Position relative to reward center
                        const rewardRect = reward.getBoundingClientRect();
                        const centerX = rewardRect.left + rewardRect.width / 2;
                        const centerY = rewardRect.top + rewardRect.height / 2;
                        
                        sparkle.style.left = `${centerX + x}px`;
                        sparkle.style.top = `${centerY + y}px`;
                        
                        document.body.appendChild(sparkle);
                        
                        // Remove sparkle after animation completes
                        setTimeout(() => sparkle.remove(), 1500);
                    }, 100 + i * 100); // Stagger sparkle creation
                }
                
                // Remove popup after animation complete (2 seconds display time)
                setTimeout(() => {
                    if (popupContainer && popupContainer.parentNode) {
                        anime({
                            targets: reward,
                            opacity: 0,
                            scale: 1.2,
                            duration: 800,
                            easing: 'easeInExpo',
                            complete: () => {
                                if (popupContainer && popupContainer.parentNode) {
                                    popupContainer.innerHTML = '';
                                }
                            }
                        });
                    }
                }, 2000);
            }
            
            // Function to initialize all upgrade buttons
            function initializeUpgradeButtons() {
                debugLog('Initializing upgrade buttons');
                // Find all upgrade buttons
                const upgradeButtons = document.querySelectorAll('.upgrade-button');
                debugLog('Found ' + upgradeButtons.length + ' upgrade buttons');
                
                // Clear any existing event listeners
                upgradeButtons.forEach(button => {
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                });
                
                // Re-get all buttons after replacement
                const freshButtons = document.querySelectorAll('.upgrade-button');
                freshButtons.forEach(button => {
                    const upgradeType = button.getAttribute('data-upgrade');
                    debugLog('Adding click handler for button with data-upgrade="' + upgradeType + '"');
                    button.addEventListener('click', () => {
                        debugLog('Button clicked: ' + upgradeType);
                    // Calculate current upgrade cost (2^level, starting at 2 EP)
                    const currentLevel = playerUpgrades[upgradeType];
                    const upgradeCost = Math.pow(2, currentLevel + 1); // 2, 4, 8, 16, etc.
                    
                    // Check if player has enough energy
                    if (playerEnergy >= upgradeCost) {
                        // Deduct energy
                        playerEnergy -= upgradeCost;
                        
                        // Increment upgrade level
                        playerUpgrades[upgradeType]++;
                        
                        // Update the button text to show next upgrade cost
                        const nextUpgradeCost = Math.pow(2, playerUpgrades[upgradeType] + 1);
                        button.textContent = `Buy (-${nextUpgradeCost} EP)`;
                        
                        // Save to localStorage
                        localStorage.setItem('lavaCageUpgrades', JSON.stringify(playerUpgrades));
                        
                        // Special handling for lockPick upgrade
                        if (upgradeType === 'lockPick') {
                            // Recalculate lock pick rate with new boost
                            const lockPickBoostMultiplier = 1 + (playerUpgrades.lockPick * 0.25);
                            lockPickRate = (CONFIG.MAX_LOCK_PROGRESS / lockPickDurationSetting / 10) * lockPickBoostMultiplier;
                        }
                        
                        // Special handling for mathCooldown upgrade - Math Wizard cooldown reduction
                        if (upgradeType === 'mathCooldown') {
                            // Random cooldown reduction between 1-3 seconds
                            const cooldownReduction = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 seconds (equal probability)
                            
                            // Add to total cooldown reduction
                            if (typeof playerUpgrades.totalCooldownReduction === 'undefined') {
                                playerUpgrades.totalCooldownReduction = 0;
                            }
                            playerUpgrades.totalCooldownReduction = parseInt(playerUpgrades.totalCooldownReduction || 0) + cooldownReduction;
                            
                            // Display a notification about the cooldown reduction
                            try {
                                displayNotification(`Wizard Upgrade: -${cooldownReduction}s cooldown!`, 'upgrade');
                            } catch(e) {
                                debugLog('Notification error:', e);
                            }
                            
                            debugLog(`Applied cooldown upgrade. New level: ${playerUpgrades.mathCooldown}, Random reduction: ${cooldownReduction}s, Total reduction: ${playerUpgrades.totalCooldownReduction}s`);
                        }
                        
                                // Play the buy upgrade sound
                        playSound('buyUpgrade');
                        
                        // Update displays
                        updateUpgradeDisplay();
                        updateHUD();
                    }
                });
            });
        }
        
        function scheduleUpgradeButtonInitialization() {
            debugLog('Scheduling upgrade button initialization');
            setTimeout(initializeUpgradeButtons, 500);
        }
            
            // Function to update upgrade level displays
            function updateUpgradeDisplay() {
                // Update Power Level Score first
                updatePowerLevelScore();
                
                // Update all upgrade displays
                for (const upgradeType in playerUpgrades) {
                    // Generate correct ID based on HTML structure (all lowercase)
                    const idPrefix = upgradeType.toLowerCase();
                    
                    // Update level displays
                    const levelElement = document.getElementById(`level-${idPrefix}`);
                    if (levelElement) levelElement.textContent = playerUpgrades[upgradeType];
                    
                    // Update effect displays
                    const effectElement = document.getElementById(`effect-${idPrefix}`);
                    if (effectElement) {
                        if (upgradeType === 'lockPick') {
                            effectElement.textContent = playerUpgrades[upgradeType] * 25;
                        } else if (upgradeType === 'luckyCharms') {
                            // Each level increases rare by 5% and legendary by 3%
                            const rareIncrease = 5 * playerUpgrades[upgradeType];
                            const legendaryIncrease = 3 * playerUpgrades[upgradeType];
                            effectElement.textContent = `${rareIncrease}/${legendaryIncrease}`;
                        } else if (upgradeType === 'chainStrength') {
                            // Calculate resistance using the same formula from the game logic
                            const level = playerUpgrades[upgradeType];
                            const baseEffect = 0.15;
                            const effectDampener = 1.0; // Corrected to match game logic
                            
                            // Get the reduction percentage (same formula as in game logic)
                            const stressReduction = level > 0 ?
                                (baseEffect * level) / (level + effectDampener) : 0;
                            
                            // Display as percentage, rounded to nearest whole number
                            effectElement.textContent = Math.round(stressReduction * 100);
                        } else if (upgradeType === 'mathCooldown') {
                            // Display the total accumulated cooldown reduction (varies due to randomness)
                            effectElement.textContent = playerUpgrades.totalCooldownReduction || 0;
                        } else if (['food', 'water', 'play', 'sing'].includes(upgradeType)) {
                            // Calculate the actual boost percentage for care actions based on the same formula
                            // used in handleStatBoostingAction
                            const level = playerUpgrades[upgradeType];
                            const baseBoost = 0.15; // 15% boost per level
                            const dampener = 1.0;   // Controls curve steepness
                            
                            let boostPercentage = 0;
                            if (level > 0) {
                                let multiplier;
                                if (upgradeType === 'food') {
                                    // Food scales well at early levels for immediate satisfaction
                                    multiplier = 1.0 + (baseBoost * level) / (level * 0.8 + dampener);
                                } else if (upgradeType === 'water') {
                                    // Water has consistent scaling throughout
                                    multiplier = 1.0 + (baseBoost * level) / (level * 0.9 + dampener);
                                } else if (upgradeType === 'play') {
                                    // Play has slightly better scaling at mid-levels
                                    multiplier = 1.0 + ((baseBoost * 1.05) * level) / (level * 0.85 + dampener);
                                } else if (upgradeType === 'sing') {
                                    // Sing has the best late-game scaling
                                    multiplier = 1.0 + ((baseBoost * 1.1) * level) / (level * 0.75 + dampener);
                                }
                                
                                // Convert to percentage increase (original was 1.0)
                                boostPercentage = Math.round((multiplier - 1.0) * 100);
                            }
                            
                            effectElement.textContent = boostPercentage;
                        }
                    }
                    
                    // Update button costs
                    const button = document.querySelector(`.upgrade-button[data-upgrade="${upgradeType}"]`);
                    if (button) {
                        const nextCost = Math.pow(2, playerUpgrades[upgradeType] + 1);
                        button.textContent = `Buy (-${nextCost} EP)`;
                    }
                }
            }
            
            // Initial update of upgrade displays
            updateUpgradeDisplay();
            
            // Explicitly reset all button costs to match their correct levels
            debugLog('Initializing upgrade buttons with costs:');
            for (const upgradeType in playerUpgrades) {
                const button = document.querySelector(`.upgrade-button[data-upgrade="${upgradeType}"]`);
                if (button) {
                    const nextCost = Math.pow(2, playerUpgrades[upgradeType] + 1);
                    debugLog(`${upgradeType}: Level ${playerUpgrades[upgradeType]}, Next cost: ${nextCost}`);
                    button.textContent = `Buy (-${nextCost} EP)`;
                }
            }
        }

        // Game pause system for treasure chest challenges
        let isGamePaused = false;
        let pauseOverlay = null;
        let pauseStartTime = 0;
        let totalPauseTime = 0;
        let pausedTimers = []; // Store paused timer info for resuming
        
        // Cooldown timer variables (moved here to avoid reference errors)
        let mathWizardCooldownTimer = null;
        let mathWizardCooldown = 0;
        const lockPickCooldownTimers = {}; // Store countdown intervals
        
        function pauseGame() {
            isGamePaused = true;
            pauseStartTime = performance.now();
            
            // Pause all cooldown timers
            pausedTimers = [];
            
            // Handle cloud spawn timeout during pause
            if (cloudSpawnTimeoutId) {
                debugLog('🌤️ Pausing cloud spawn timeout during game pause');
                // Don't clear the timeout, let it reschedule itself when it fires
            }
            
            // Pause math wizard cooldown timer
            if (mathWizardCooldownTimer) {
                pausedTimers.push({
                    type: 'mathWizard',
                    timer: mathWizardCooldownTimer,
                    remainingTime: mathWizardCooldown
                });
                clearInterval(mathWizardCooldownTimer);
                mathWizardCooldownTimer = null;
            }
            
            // Pause lock pick cooldown timers
            for (const [buttonId, timer] of Object.entries(lockPickCooldownTimers)) {
                if (timer) {
                    const button = document.getElementById(buttonId);
                    const timerElement = button?.querySelector('.cooldown-timer');
                    const remainingText = timerElement?.textContent || '';
                    const remainingTime = parseFloat(remainingText.replace('s', '')) || 0;
                    
                    pausedTimers.push({
                        type: 'lockPick',
                        buttonId: buttonId,
                        timer: timer,
                        remainingTime: remainingTime
                    });
                    clearInterval(timer);
                    delete lockPickCooldownTimers[buttonId];
                }
            }
            
            // Create dark overlay to dim the background
            pauseOverlay = document.createElement('div');
            pauseOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.85);
                z-index: 999;
                pointer-events: none;
            `;
            document.body.appendChild(pauseOverlay);
            
            debugLog('🎮 Game paused for treasure chest challenge - paused', pausedTimers.length, 'timers');
        }
        
        function resumeGame() {
            isGamePaused = false;
            
            // Calculate how long we were paused and adjust the timer
            if (pauseStartTime > 0) {
                const pauseDuration = performance.now() - pauseStartTime;
                totalPauseTime += pauseDuration;
                
                // Adjust the real-time timer start to account for pause time
                if (realTimeTimerStart > 0) {
                    realTimeTimerStart += pauseDuration;
                }
                
                pauseStartTime = 0;
                debugLog(`🎮 Game resumed after ${(pauseDuration / 1000).toFixed(1)}s pause`);
            }
            
            // Resume all paused timers
            for (const pausedTimer of pausedTimers) {
                if (pausedTimer.type === 'mathWizard' && pausedTimer.remainingTime > 0) {
                    // Resume math wizard cooldown
                    mathWizardCooldown = pausedTimer.remainingTime;
                    const mathWizardBtn = document.getElementById('math-wizard-button');
                    const cooldownDisplay = mathWizardBtn?.querySelector('.cooldown-timer');
                    
                    if (mathWizardBtn && cooldownDisplay) {
                        mathWizardBtn.disabled = true;
                        cooldownDisplay.textContent = mathWizardCooldown + 's';
                        
                        mathWizardCooldownTimer = setInterval(() => {
                            mathWizardCooldown--;
                            cooldownDisplay.textContent = mathWizardCooldown > 0 ? mathWizardCooldown + 's' : '';
                            
                            if (mathWizardCooldown <= 0) {
                                clearInterval(mathWizardCooldownTimer);
                                mathWizardCooldownTimer = null;
                                mathWizardBtn.disabled = false;
                                cooldownDisplay.textContent = '';
                                // Play glimmer_converted sound when cooldown ends (but not during initial game setup)
                                if (gameStarted && gameTime < initialGameTime) {
                                playSound('newPetReveal');
                                }
                            }
                        }, 1000);
                    }
                } else if (pausedTimer.type === 'lockPick' && pausedTimer.remainingTime > 0) {
                    // Resume lock pick cooldown
                    const button = document.getElementById(pausedTimer.buttonId);
                    const timerElement = button?.querySelector('.cooldown-timer');
                    
                    if (button && timerElement) {
                        let remainingTime = pausedTimer.remainingTime;
                        timerElement.textContent = remainingTime.toFixed(1) + 's';
                        
                        lockPickCooldownTimers[pausedTimer.buttonId] = setInterval(() => {
                            remainingTime -= 0.1;
                            timerElement.textContent = remainingTime > 0 ? remainingTime.toFixed(1) + 's' : '';
                            
                            if (remainingTime <= 0) {
                                clearInterval(lockPickCooldownTimers[pausedTimer.buttonId]);
                                delete lockPickCooldownTimers[pausedTimer.buttonId];
                                button.classList.remove('on-cooldown');
                                timerElement.textContent = '';
                                updateLockPickButtonStates();
                            }
                        }, 100);
                    }
                }
            }
            
            // Clear paused timers array
            pausedTimers = [];
            
            // Remove dark overlay
            if (pauseOverlay) {
                document.body.removeChild(pauseOverlay);
                pauseOverlay = null;
            }
            
            // Ensure cloud spawning continues after resume
            debugLog('🌤️ Checking cloud spawning after game resume...');
            ensureCloudSpawning();
            
            debugLog('🎮 Game resumed from treasure chest challenge');
        }
        
        function evaporateCloudAnimation(cloudGroup) {
            debugLog('☁️ Starting cloud evaporation animation');
            
            // Log chest type for debugging
            if (cloudGroup.userData && cloudGroup.userData.chestType) {
                debugLog('☁️ Evaporating', cloudGroup.userData.chestType.color, 'chest cloud');
            }
            
            // Create evaporation effect
            anime({
                targets: cloudGroup.scale,
                x: [1, 0.1],
                y: [1, 0.1],
                z: [1, 0.1],
                duration: 1500,
                easing: 'easeInCubic'
            });
            
            anime({
                targets: cloudGroup.position,
                y: cloudGroup.position.y + 2,
                duration: 1500,
                easing: 'easeOutQuad'
            });
            
            // Fade out effect with error handling
            try {
                cloudGroup.traverse(child => {
                    if (child.isMesh && child.material) {
                        const originalOpacity = child.material.opacity !== undefined ? child.material.opacity : 1;
                        child.material.transparent = true;
                        
                        anime({
                            targets: child.material,
                            opacity: [originalOpacity, 0],
                            duration: 1500,
                            easing: 'easeInCubic'
                        });
                    }
                });
            } catch (error) {
                console.error('☁️ Error in evaporation fade effect:', error);
            }
            
            // Remove cloud after animation with enhanced error handling
            setTimeout(() => {
                try {
                    removeCloudWithoutReward(cloudGroup);
                    // Ensure cloud spawning continues (in case removeCloudWithoutReward doesn't trigger it)
                    ensureCloudSpawning();
                } catch (error) {
                    console.error('☁️ Error in evaporation cleanup:', error);
                    // Force cleanup even if there's an error
                    const index = treasureClouds.indexOf(cloudGroup);
                    if (index > -1) {
                        scene.remove(cloudGroup);
                        treasureClouds.splice(index, 1);
                    }
                    ensureCloudSpawning();
                }
            }, 1500);
        }

        // XII. MAIN GAME LOOP
        function animate(time) { 
            // Periodically check that math buttons are clickable
            // This helps ensure that even during intense animations or transitions,
            // the math buttons remain responsive
            if (Math.random() < 0.05) { // Random check, approximately every 20 frames
                ensureButtonClickability();
            }
            
            requestAnimationFrame(animate); 
            if (!gameStarted && gameState === 'INIT') return; 
            
            const deltaTime = Math.min(0.05, (time - (lastFrameTime || time)) / 1000); 
            lastFrameTime = time;
            
            // Update the timer display every frame to ensure smooth, real-time movement (only when not paused)
            if (!isGamePaused) {
            updateTimerDisplay();
            }
            
            if (lavaPlane && lavaPlane.material.uniforms.uTime) { lavaPlane.material.uniforms.uTime.value = time / 1000; }
            if (controls) controls.update();
            
            if (!isJolting && cage && scene.chainHangingHeight !== undefined && chainLinks.length > 0 && (gameState === 'PLAYING' || gameState === 'INTRO') && cage.chainAttachPoint) {
                const L_link = CONFIG.LINK_EFFECTIVE_LENGTH; const hangingHeight = scene.chainHangingHeight; 
                const swingFrequency = 0.5 + (isGrumpy ? 0.5 : 0); const swingAmplitude = (isGrumpy ? Math.PI / 10 : Math.PI / 20) * CONFIG.SWING_FACTORS[currentDifficultySetting];
                const swingTime = (time - swingBaseTime) / 1000; const angle = Math.sin(swingTime * swingFrequency + swingPhaseOffset) * swingAmplitude;
                // The top of the chain is fixed at (0, hangingHeight, 0)
                // Each link hangs from the previous, so we compute the world position of the last link
                for (let i = 0; i < chainLinks.length; i++) {
                    const distToThisLinkCenter = (i + 0.5) * L_link;
                    const x = Math.sin(angle) * distToThisLinkCenter;
                    const y_projected = Math.cos(angle) * distToThisLinkCenter;
                    const y = hangingHeight - y_projected;
                    chainLinks[i].position.set(x, y, 0);
                    chainLinks[i].rotation.z = angle;
                }
                const lastLink = chainLinks[chainLinks.length - 1];
                lastLink.getWorldPosition(chainLastLinkWorld);
                cage.rotation.z = angle;
                chainAttachRotatedOffset.copy(cage.chainAttachPoint.position).applyAxisAngle(CHAIN_SWING_AXIS, angle);
                cage.position.set(
                    chainLastLinkWorld.x - chainAttachRotatedOffset.x,
                    chainLastLinkWorld.y - chainAttachRotatedOffset.y,
                    chainLastLinkWorld.z - chainAttachRotatedOffset.z
                );
                if (SOUNDS.chainSwing && SOUNDS.chainSwing.state() === 'loaded' && SOUNDS.chainSwing.playing()) { const swingIntensity = Math.abs(angle) / (Math.PI / 8); SOUNDS.chainSwing.volume(Math.min(0.3, swingIntensity * 0.15)); }
            }
            
            if (pet && pet.head && pet.tail) { 
                const petScale = CONFIG.PET_RARITIES[currentPetRarityKey].petScale;
                if (gameState === 'PLAYING' && isGrumpy) { pet.head.rotation.y = Math.sin(time / 150) * 0.3; pet.tail.rotation.x = Math.PI / 2.5 + Math.sin(time / 200) * 0.4; } 
                else if (gameState === 'PLAYING') { pet.head.rotation.y = Math.sin(time / 500) * 0.1; pet.tail.rotation.x = Math.PI / 2.5 + Math.sin(time / 700) * 0.2; } 
            }

            // Animate silhouette queue
            if (silhouetteQueueGroup) {
                silhouetteQueueGroup.position.z += deltaTime * 0.1; // Slow movement towards player
                if (silhouetteQueueGroup.position.z > CONFIG.SILHOUETTE_SPACING / 2) { // Reset if moved too far
                    // This simple reset might be jarring. Better to shift cages and add new one at back.
                    // For now, just reset position and re-populate for simplicity of this iteration.
                    silhouetteQueueGroup.position.z = 0;
                    populateSilhouetteQueue();
                }
                silhouetteCages.forEach((sc, index) => {
                    sc.position.y = sc.userData.originalY + Math.sin(time / 1000 + index * 0.5) * 0.1; // Bobbing
                });
            }
            
            if (gameState === 'PLAYING' && !isGamePaused) { 
                updateGameLogic(deltaTime); 
            }
            updateHUD();
            if (renderer && scene && camera) renderer.render(scene, camera);
        }

        function bootstrapRuntime() {
            initializeResponsiveLayout();
            settingsPanel?.classList.remove('is-open');
            document.body.classList.remove('settings-open');
            settingsButton?.setAttribute('aria-expanded', 'false');
            loadCoreGameSettings();
            forcePowerLevelUpdate();
            updateLevelDisplay();
            setupEventListeners();
            setupAutoMode();
            bindUpgradesPanelButton({
                debugLog,
                playSound,
                openUpgradesModal: () => {
                    if (typeof openUpgradesModalHandler === 'function') {
                        openUpgradesModalHandler();
                    }
                }
            });
            initializeIntroBackgroundAudio();
            loadCustomSoundsFromStorage().then(() => {
                debugLog('Custom sounds loaded (if any). Ready to start.');
            });
        }

        // XIII. INITIALIZATION & START
        bootstrapRuntime();
        // initThree(); // MOVED: Now called only when start button is clicked to prevent lava flash
        // animate(0); // MOVED: Now called only after Three.js is initialized 

        // Lock pick tool buttons - updated with three image-based tools
        const woodenLockpickBtn = document.getElementById('wooden-lockpick');
        const silverLockpickBtn = document.getElementById('silver-lockpick');
        const goldenLockpickBtn = document.getElementById('golden-lockpick');
                    lockPickTools = document.querySelectorAll('.lock-pick-tool');
        let lockPickBoostTimeout = null;
        let lockPickBoostActive = false;
        let activePickButton = null;
        const lockPickCooldowns = {}; // Store cooldown timers for each tool
        // lockPickCooldownTimers moved to top of file to avoid reference errors

        // Add cooldown timer elements to each lock pick tool
        lockPickTools.forEach(tool => {
            const timerElement = document.createElement('span');
            timerElement.className = 'cooldown-timer';
            tool.appendChild(timerElement);
        });

        // Track the base lock pick rate and boost end time
        let baseLockPickRate = null;
        let boostEndTimerId = null;

        function applyLockPickBoost(button) {
            // Get multiplier and cooldown from data attributes
            const multiplier = parseFloat(button.dataset.multiplier);
            const cooldownTime = parseInt(button.dataset.cooldown);
            const boostDuration = 5000; // Exactly 5 seconds for all tools
            
            // Determine which key type this button needs
            let keyType;
            if (button.id === 'wooden-lockpick') {
                keyType = 'wooden';
            } else if (button.id === 'silver-lockpick') {
                keyType = 'steel';
            } else if (button.id === 'golden-lockpick') {
                keyType = 'golden';
            }
            
            // Check if tool is on cooldown, boost is already active, or no keys available
            if (button.classList.contains('on-cooldown') || lockPickBoostActive || currentPetRescued || gameState !== 'PLAYING') {
                if (button.classList.contains('on-cooldown')) {
                    playSound('errorSound');
                    animateElementShake(button);
                }
                return;
            }
            
            // Check if user has keys for this tool
            if (!keyType || keyInventory[keyType] <= 0) {
                playSound('errorSound');
                animateElementShake(button);
                
                // Show message about needing keys
                showTooltipMessage(button, `No ${keyType} keys available! Find treasure clouds to get keys.`);
                return;
            }
            
            // Consume one key from inventory
            if (!useKeyFromInventory(keyType)) {
                // This shouldn't happen if we checked above, but safety check
                playSound('errorSound');
                animateElementShake(button);
                return;
            }
            
            lockPickBoostActive = true;
            activePickButton = button;
            
            // Add visual glow effect to the button
            button.classList.add('active-boost');
            
            // Also add the boosted class to the progress bar for visual feedback
            if (lockProgressBar) {
                lockProgressBar.classList.add('boosted');
            }
            
            // Store base rate if not set yet
            if (baseLockPickRate === null) {
                baseLockPickRate = lockPickRate;
            }
            
            // Apply multiplier to the base rate, not the current rate
            const originalRate = baseLockPickRate;
            // Apply the boost
            lockPickRate = originalRate * multiplier;
            
            // Disable all buttons while boost is active
            lockPickTools.forEach(tool => {
                tool.disabled = true;
            });

            // Play activation sound
            playSound('lockPickClick');

            // Show an enhanced, eye-catching activation effect
            const toolName = button.querySelector('.tool-name').textContent;
            
            // Create a dynamic, visually stunning flash element
            const flashContainer = document.createElement('div');
            flashContainer.style.position = 'absolute';
            
            // Position it closer to the Lock Picking panel (at bottom of screen)
            // to keep it completely out of the cage swinging area
            const lockPanel = document.getElementById('lock-picking-panel');
            if (lockPanel) {
                const panelRect = lockPanel.getBoundingClientRect();
                // Position above the Lock Picking panel but ensuring it's in bottom 1/3 of screen
                // to completely avoid cage area
                flashContainer.style.bottom = (window.innerHeight - panelRect.top + 5) + 'px';
                flashContainer.style.left = '50%';
                flashContainer.style.transform = 'translateX(-50%)';
            } else {
                // Fallback position if panel not found - place in bottom area
                flashContainer.style.bottom = '120px';
                flashContainer.style.left = '50%';
                flashContainer.style.transform = 'translateX(-50%)';
            }
            
            flashContainer.style.zIndex = '9999';
            document.body.appendChild(flashContainer);
            
            // Create the message element with enhanced styling - now as a wide rectangle
            const flashMsg = document.createElement('div');
            
            // Text content with fancier format and horizontal layout
            const iconChar = button.id.includes('wooden') ? '🪵' : 
                           button.id.includes('silver') ? '⚙️' : '✨';
            
            // Wider, shorter rectangle layout without icons
            flashMsg.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                                   <div style="display:flex;align-items:center;gap:10px;">
                                     <span style="font-size:1.1em;font-weight:bold;">${toolName}</span>
                                     <span style="font-weight:bold;color:#FFD700;text-transform:uppercase;letter-spacing:1px;">ACTIVATED!</span>
                                   </div>
                                   <div style="display:flex;align-items:center;gap:15px;">
                                     <span style="font-weight:bold;font-size:1.2em;color:#FFD700;">x${multiplier} speed</span>
                                     <span class="countdown-timer" style="display:inline-flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:20px;min-width:40px;font-size:1.2em;font-weight:bold;color:white;border:1px solid rgba(255,255,255,0.2);">5</span>
                                   </div>
                                </div>`;
            
            // Apply stunning visual styles for a wider, shorter rectangle
            flashMsg.style.textAlign = 'left';
            flashMsg.style.fontFamily = '"Arial", sans-serif';
            flashMsg.style.padding = '8px 20px'; // Reduced padding for shorter height
            flashMsg.style.borderRadius = '50px'; // More rounded for a flatter look
            flashMsg.style.minWidth = '400px'; // Wider minimum width
            flashMsg.style.maxWidth = '70%'; // More horizontal space
            flashMsg.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 215, 0, 0.4)';
            flashMsg.style.color = '#FFF';
            flashMsg.style.opacity = '0';
            flashMsg.style.scale = '0.9';
            flashMsg.style.pointerEvents = 'none'; // Make sure it doesn't interfere with clicks
            
            // Color based on the tool
            if (button.id.includes('wooden')) {
                flashMsg.style.background = 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)';
                flashMsg.style.border = '2px solid #CD853F';
            } else if (button.id.includes('silver')) {
                flashMsg.style.background = 'linear-gradient(135deg, #708090 0%, #A9A9A9 100%)';
                flashMsg.style.border = '2px solid #C0C0C0';
            } else { // golden
                flashMsg.style.background = 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)';
                flashMsg.style.border = '2px solid #FFD700';
            }
            
            flashContainer.appendChild(flashMsg);
            
            // Create an animation sequence with countdown
            const timeline = [];
            
            // Appear with scaling effect
            timeline.push(setTimeout(() => {
                flashMsg.style.transition = 'opacity 0.3s, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                flashMsg.style.opacity = '1';
                flashMsg.style.transform = 'scale(1.1)';
            }, 10));
            
            // Settle to normal size
            timeline.push(setTimeout(() => {
                flashMsg.style.transform = 'scale(1)';
            }, 300));
            
            // Add a pulse effect
            timeline.push(setTimeout(() => {
                flashMsg.style.animation = 'pulse-glow 1s infinite alternate';
                
                // Create the pulse animation if it doesn't exist
                if (!document.getElementById('pulse-animation')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'pulse-animation';
                    styleEl.textContent = `
                        @keyframes pulse-glow {
                            0% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.4); }
                            100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.9), 0 0 50px rgba(255, 215, 0, 0.6); }
                        }
                    `;
                    document.head.appendChild(styleEl);
                }
            }, 400));
            
            // Create a countdown from 5 to 0
            const countdownElement = flashMsg.querySelector('.countdown-timer');
            let secondsLeft = 5;
            
            // Update every second
            const countdownInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft >= 0) {
                    countdownElement.textContent = secondsLeft;
                    
                    // Make the countdown more urgent in the last 2 seconds
                    if (secondsLeft <= 2) {
                        countdownElement.style.color = '#FF5252';
                        countdownElement.style.animation = 'pulse 0.5s infinite alternate';
                        
                        if (!document.getElementById('pulse-animation-countdown')) {
                            const pulseStyle = document.createElement('style');
                            pulseStyle.id = 'pulse-animation-countdown';
                            pulseStyle.textContent = `
                                @keyframes pulse {
                                    0% { transform: scale(1); }
                                    100% { transform: scale(1.2); }
                                }
                            `;
                            document.head.appendChild(pulseStyle);
                        }
                    }
                }
            }, 1000);
            
            // Fade out and remove after exactly 5 seconds
            timeline.push(setTimeout(() => {
                clearInterval(countdownInterval);
                flashMsg.style.transition = 'opacity 0.5s, transform 0.5s';
                flashMsg.style.opacity = '0';
                flashMsg.style.transform = 'scale(0.8) translateY(-20px)';
            }, 5000));
            
            timeline.push(setTimeout(() => {
                if (flashContainer && flashContainer.parentNode) {
                    document.body.removeChild(flashContainer);
                }
            }, 5500));
            
            // Store timeline for cleanup if needed
            const cleanupAnimation = () => {
                timeline.forEach(id => clearTimeout(id));
                clearInterval(countdownInterval);
                if (flashContainer && flashContainer.parentNode) {
                    document.body.removeChild(flashContainer);
                }
            };
            
            // In case we need to cancel the animation early
            button.flashCleanup = cleanupAnimation;

            // Cancel any existing boost timeout
            if (boostEndTimerId) {
                clearTimeout(boostEndTimerId);
            }
            
            // Set exact 5-second duration for boost
            const endTime = Date.now() + boostDuration;
            
            // Create a function to end the boost
            const endBoost = () => {
                // Remove visual effects
                button.classList.remove('active-boost');
                if (lockProgressBar) {
                    lockProgressBar.classList.remove('boosted');
                }
                
                // CRITICAL: Restore the original base rate
                lockPickRate = baseLockPickRate;
                
                // Update state
                lockPickBoostActive = false;
                activePickButton = null;
                
                // Start cooldown for this button
                startCooldown(button, cooldownTime);
                
                // Re-enable other buttons if appropriate
                if (gameState === 'PLAYING' && !currentPetRescued) {
                    lockPickTools.forEach(tool => {
                        if (!tool.classList.contains('on-cooldown')) {
                            tool.disabled = false;
                        }
                    });
                }
            };
            
            // Schedule the boost to end at the exact time
            boostEndTimerId = setTimeout(endBoost, boostDuration);
        }

        function startCooldown(button, cooldownTime) {
            const buttonId = button.id;
            const timerElement = button.querySelector('.cooldown-timer');
            
            // Apply cooldown class and disable button
            button.classList.add('on-cooldown');
            button.disabled = true;
            
            // Set initial timer display
            let timeLeft = cooldownTime;
            timerElement.textContent = timeLeft;
            
            // Clear any existing cooldown
            if (lockPickCooldowns[buttonId]) {
                clearTimeout(lockPickCooldowns[buttonId]);
            }
            if (lockPickCooldownTimers[buttonId]) {
                clearInterval(lockPickCooldownTimers[buttonId]);
            }
            
            // Set up the countdown display
            lockPickCooldownTimers[buttonId] = setInterval(() => {
                timeLeft -= 1;
                timerElement.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    clearInterval(lockPickCooldownTimers[buttonId]);
                }
            }, 1000);
            
            // Set up the actual cooldown
            lockPickCooldowns[buttonId] = setTimeout(() => {
                button.classList.remove('on-cooldown');
                timerElement.textContent = '';
                
                // Only enable if no boost is currently active and game is still playing
                if (!lockPickBoostActive && gameState === 'PLAYING' && !currentPetRescued) {
                    button.disabled = false;
                }
                
                clearInterval(lockPickCooldownTimers[buttonId]);
                delete lockPickCooldowns[buttonId];
                delete lockPickCooldownTimers[buttonId];
            }, cooldownTime * 1000);
        }

        // Function to clear all cooldowns and reset boost state (used when resetting game)
        function clearAllLockPickCooldowns() {
            // Clear all tool cooldowns (only if lockPickTools is initialized)
            if (lockPickTools) {
                lockPickTools.forEach(tool => {
                const buttonId = tool.id;
                if (lockPickCooldowns[buttonId]) {
                    clearTimeout(lockPickCooldowns[buttonId]);
                }
                if (lockPickCooldownTimers[buttonId]) {
                    clearInterval(lockPickCooldownTimers[buttonId]);
                }
                tool.classList.remove('on-cooldown');
                tool.classList.remove('active-boost');
                const timerElement = tool.querySelector('.cooldown-timer');
                if (timerElement) timerElement.textContent = '';
                });
            }
            
            // Reset boost state
            lockPickBoostActive = false;
            
            // Clear any active boost timer
            if (boostEndTimerId) {
                clearTimeout(boostEndTimerId);
                boostEndTimerId = null;
            }
            
            // If a boost was active, restore base rate
            if (activePickButton && baseLockPickRate !== null) {
                lockPickRate = baseLockPickRate;
            }
            
            activePickButton = null;
            
            // Reset progress bar
            if (lockProgressBar) {
                lockProgressBar.classList.remove('boosted');
            }
        }

        // Add event listeners to the new lock pick tool buttons
        if (woodenLockpickBtn) {
            woodenLockpickBtn.onclick = () => applyLockPickBoost(woodenLockpickBtn);
        }
        
        if (silverLockpickBtn) {
            silverLockpickBtn.onclick = () => applyLockPickBoost(silverLockpickBtn);
        }
        
        if (goldenLockpickBtn) {
            goldenLockpickBtn.onclick = () => applyLockPickBoost(goldenLockpickBtn);
        }
