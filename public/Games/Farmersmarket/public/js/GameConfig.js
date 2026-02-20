// Farmers Market Frenzy 3D - Game Configuration
class GameConfig {
    static GAME_SETTINGS = {
        // Timing
        BASE_CUSTOMER_PATIENCE: 45000, // 45 seconds base patience
        CALCULATION_TIME_BONUS: 5000, // 5 seconds bonus for quick calculation
        MIN_CUSTOMER_PATIENCE: 15000, // Minimum 15 seconds
        MAX_CUSTOMER_PATIENCE: 60000, // Maximum 60 seconds
        
        // Customer spawning
        CUSTOMER_SPAWN_INTERVAL: 4000, // 4 s AI interval
        PLAYER_SPAWN_INTERVAL: 3000, // 3 s player interval (slightly quicker)
        MAX_CONCURRENT_CUSTOMERS: 1, // One customer at a time for educational focus
        ORDER_MIN_ITEMS: 1,
        ORDER_MAX_ITEMS: 6,
        
        // Scoring
        BASE_SCORE_PER_SALE: 100,
        ACCURACY_BONUS_MULTIPLIER: 2.0,
        SPEED_BONUS_MULTIPLIER: 1.5,
        STREAK_BONUS_THRESHOLD: 3,
        STREAK_BONUS_MULTIPLIER: 1.25,
        
        // Popularity system
        STARTING_POPULARITY: 3.0,
        MAX_POPULARITY: 5.0,
        MIN_POPULARITY: 0.5,
        POPULARITY_GAIN_PERFECT: 0.3,
        POPULARITY_GAIN_GOOD: 0.1,
        POPULARITY_LOSS_ERROR: -0.2,
        POPULARITY_LOSS_SLOW: -0.1,
        
        // Money tolerance for change calculation
        MONEY_TOLERANCE: 0.01, // 1 cent tolerance
        
        // Audio settings
        ENABLE_SOUND: true,
        MASTER_VOLUME: 0.7,
        
        // Visual settings
        ENABLE_PARTICLES: true,
        ENABLE_ANIMATIONS: true,
    };

    // Difficulty settings
    static DIFFICULTY_MODES = {
        easy: {
            name: 'Easy Mode',
            description: 'Whole dollar amounts only',
            icon: '🌱',
            priceStep: 1.00,
            minPrice: 1.00,
            maxPrice: 10.00,
            allowedCoins: [] // No coins for Easy Mode
        },
        medium: {
            name: 'Medium Mode', 
            description: 'Quarter-based amounts',
            icon: '🌿',
            priceStep: 0.25,
            minPrice: 0.25,
            maxPrice: 15.00,
            allowedCoins: [0.25] // Quarters only
        },
        hard: {
            name: 'Hard Mode',
            description: 'All standard coins included',
            icon: '🌳',
            priceStep: 0.01,
            minPrice: 0.01,
            maxPrice: 20.00,
            allowedCoins: [0.25, 0.10, 0.05, 0.01] // Quarter, dime, nickel, penny
        }
    };
    
    static MARKET_ITEMS = {
        vegetables: [
            { name: "Tomatoes", emoji: "🍅", basePrice: 2.50, seasonal: false, category: "vegetables" }
        ],
        
        fruits: [
            { name: "Apples", emoji: "🍎", basePrice: 2.75, seasonal: false, category: "fruits" },
            { name: "Bananas", emoji: "🍌", basePrice: 1.25, seasonal: false, category: "fruits" }
        ],
        
        baked_goods: [
            { name: "Fresh Bread", emoji: "🍞", basePrice: 3.50, seasonal: false, category: "baked_goods" },
            { name: "Cookies", emoji: "🍪", basePrice: 1.75, seasonal: false, category: "baked_goods" }
        ],
        
        preserves: [
            { name: "Honey", emoji: "🍯", basePrice: 6.50, seasonal: false, category: "preserves" }
        ]
    };

    // Complete emoji library for easy access in settings
    static EMOJI_LIBRARY = {
        vegetables: [
            { emoji: "🍅", name: "Tomatoes" },
            { emoji: "🥕", name: "Carrots" },
            { emoji: "🥦", name: "Broccoli" },
            { emoji: "🫑", name: "Bell Peppers" },
            { emoji: "🧅", name: "Onions" },
            { emoji: "🥬", name: "Lettuce" },
            { emoji: "🥔", name: "Potatoes" },
            { emoji: "🌽", name: "Corn" },
            { emoji: "🎃", name: "Pumpkin" },
            { emoji: "🥒", name: "Cucumber" },
            { emoji: "🍆", name: "Eggplant" },
            { emoji: "🥑", name: "Avocado" },
            { emoji: "🌶️", name: "Hot Pepper" },
            { emoji: "🥜", name: "Peanuts" },
            { emoji: "🫘", name: "Beans" }
        ],
        
        fruits: [
            { emoji: "🍎", name: "Apples" },
            { emoji: "🍌", name: "Bananas" },
            { emoji: "🍊", name: "Oranges" },
            { emoji: "🍓", name: "Strawberries" },
            { emoji: "🍇", name: "Grapes" },
            { emoji: "🍑", name: "Peaches" },
            { emoji: "🍉", name: "Watermelon" },
            { emoji: "🍍", name: "Pineapple" },
            { emoji: "🍒", name: "Cherries" },
            { emoji: "🫐", name: "Blueberries" },
            { emoji: "🥝", name: "Kiwi" },
            { emoji: "🍋", name: "Lemon" },
            { emoji: "🫒", name: "Olives" },
            { emoji: "🥭", name: "Mango" },
            { emoji: "🍈", name: "Melon" }
        ],
        
        baked_goods: [
            { emoji: "🍞", name: "Fresh Bread" },
            { emoji: "🥐", name: "Croissants" },
            { emoji: "🧁", name: "Muffins" },
            { emoji: "🥯", name: "Bagels" },
            { emoji: "🥧", name: "Pie Slice" },
            { emoji: "🍪", name: "Cookies" },
            { emoji: "🎂", name: "Cake" },
            { emoji: "🍰", name: "Cake Slice" },
            { emoji: "🥨", name: "Pretzel" },
            { emoji: "🍩", name: "Donut" },
            { emoji: "🧇", name: "Waffle" },
            { emoji: "🥞", name: "Pancakes" }
        ],
        
        preserves: [
            { emoji: "🍯", name: "Honey" },
            { emoji: "🍓", name: "Strawberry Jam" },
            { emoji: "🍎", name: "Apple Butter" },
            { emoji: "🥒", name: "Pickles" },
            { emoji: "🍁", name: "Maple Syrup" },
            { emoji: "🫙", name: "Jar" },
            { emoji: "🧈", name: "Butter" },
            { emoji: "🧀", name: "Cheese" },
            { emoji: "🥛", name: "Milk" },
            { emoji: "🍼", name: "Cream" }
        ]
    };
    
    // Difficulty-based pricing methods
    static adjustPriceForDifficulty(basePrice, difficulty) {
        const difficultyConfig = GameConfig.DIFFICULTY_MODES[difficulty];
        if (!difficultyConfig) {
            console.warn(`Unknown difficulty: ${difficulty}, using original price`);
            return basePrice;
        }
        
        const { priceStep, minPrice, maxPrice } = difficultyConfig;
        let adjustedPrice;
        
        switch (difficulty) {
            case 'easy':
                // Easy Mode: Whole dollar amounts only ($1.00, $2.00, $3.00, etc.)
                // Round to nearest whole dollar, ensuring minimum $1.00
                adjustedPrice = Math.max(1.00, Math.round(basePrice));
                
                // FORCE whole dollar - ensure no decimal places
                adjustedPrice = Math.floor(adjustedPrice) + (adjustedPrice % 1 >= 0.5 ? 1 : 0);
                adjustedPrice = Math.max(1.00, adjustedPrice); // Ensure minimum $1.00
                
                console.log(`🌱 Easy Mode: $${basePrice.toFixed(2)} → $${adjustedPrice.toFixed(2)} (WHOLE DOLLAR ONLY)`);
                break;
                
            case 'medium':
                // Medium Mode: Dollars and quarters only ($1.00, $1.25, $1.50, $1.75, $2.00, etc.)
                adjustedPrice = Math.round(basePrice * 4) / 4; // Round to nearest quarter
                adjustedPrice = Math.max(0.25, adjustedPrice); // Ensure minimum $0.25
                console.log(`🌿 Medium Mode: $${basePrice.toFixed(2)} → $${adjustedPrice.toFixed(2)} (rounded to quarter)`);
                break;
                
            case 'hard':
                // Hard Mode: All coin values included (keep original prices with penny precision)
                adjustedPrice = Math.round(basePrice * 100) / 100; // Round to nearest penny
                console.log(`🌳 Hard Mode: $${basePrice.toFixed(2)} → $${adjustedPrice.toFixed(2)} (original with penny precision)`);
                break;
                
            default:
                adjustedPrice = basePrice;
                break;
        }
        
        // Ensure price is within bounds
        adjustedPrice = Math.max(minPrice, Math.min(maxPrice, adjustedPrice));
        
        return parseFloat(adjustedPrice.toFixed(2));
    }
    



    // Get available coins for specific difficulty
    static getAvailableCoinsForDifficulty(difficulty) {
        const difficultyConfig = GameConfig.DIFFICULTY_MODES[difficulty];
        if (!difficultyConfig || !difficultyConfig.allowedCoins) {
            console.warn(`No coin configuration found for difficulty: ${difficulty}`);
            return GameConfig.MONEY_SYSTEM.coins; // Fallback to all coins
        }
        
        // Filter coins based on allowed values for this difficulty
        const allowedCoins = GameConfig.MONEY_SYSTEM.coins.filter(coin => 
            difficultyConfig.allowedCoins.includes(coin.value)
        );
        
        console.log(`Available coins for ${difficulty} mode:`, allowedCoins.map(c => c.label));
        return allowedCoins;
    }
    
    static MONEY_SYSTEM = {
        bills: [
            { value: 100, label: "$100", color: "#2ecc71" },
            { value: 50, label: "$50", color: "#e74c3c" },
            { value: 20, label: "$20", color: "#3498db" },
            { value: 10, label: "$10", color: "#f39c12" },
            { value: 5, label: "$5", color: "#9b59b6" },
            { value: 1, label: "$1", color: "#27ae60" }
        ],
        
        coins: [
            // Quarter – largest standard coin (silver) - Enhanced for cross-platform visibility
            { value: 0.25, label: "25¢", color: "#c0c0c0", name: "Quarter" },
            // Dime – smallest coin (bright silver) - Enhanced contrast for all displays
            { value: 0.10, label: "10¢", color: "#dfe4ea", name: "Dime" },
            // Nickel – medium-small coin (darker silver) - Optimized visibility
            { value: 0.05, label: "5¢", color: "#a0a0a0", name: "Nickel" },
            // Penny – copper coin - Enhanced copper appearance
            { value: 0.01, label: "1¢", color: "#b87333", name: "Penny" }
        ]
    };
    
    // Platform detection and optimization settings
    static PLATFORM_SETTINGS = {
        // Gaming console optimizations
        console: {
            inputFocusDelay: [300, 600, 1000, 1500],
            enhancedFocusIndicators: true,
            largerTouchTargets: true,
            fontSize: 'large'
        },
        
        // Mobile device optimizations
        mobile: {
            inputFocusDelay: [100, 300, 600],
            touchEvents: true,
            preventZoom: true,
            fontSize: 'medium'
        },
        
        // Tablet optimizations
        tablet: {
            inputFocusDelay: [200, 500, 800],
            touchEvents: true,
            enhancedSpacing: true,
            fontSize: 'medium-large'
        },
        
        // Desktop optimizations
        desktop: {
            inputFocusDelay: [100, 300],
            keyboardNavigation: true,
            fontSize: 'standard'
        },
        
        // Smart TV optimizations
        smartTV: {
            inputFocusDelay: [500, 1000, 1500, 2000],
            enhancedFocusIndicators: true,
            largerElements: true,
            fontSize: 'extra-large'
        }
    };
    
    static CUSTOMER_AVATARS = [
        "👨‍🌾", "👩‍🌾", "👨‍🍳", "👩‍🍳", "👨‍👩‍👧‍👦", "👵", "👴", 
        "👩‍💼", "👨‍💼", "👩‍🎓", "👨‍🎓", "👩‍⚕️", "👨‍⚕️", "👩‍🏫", "👨‍🏫",
        "🧑‍🦱", "👩‍🦰", "👨‍🦲", "👩‍🦳", "🧑‍🦰"
    ];
    
    static CUSTOMER_NAMES = [
        "Sarah", "Mike", "Emma", "John", "Lisa", "David", "Anna", "Chris",
        "Maria", "Robert", "Jennifer", "William", "Jessica", "Michael", "Ashley",
        "James", "Amanda", "Daniel", "Stephanie", "Matthew", "Nicole", "Anthony",
        "Elizabeth", "Mark", "Heather", "Steven", "Michelle", "Andrew", "Kimberly",
        "Brian", "Amy", "Joshua", "Kevin", "Thomas", "Catherine"
    ];
    
    static REVIEW_SYSTEM = {
        // Review ratings based on performance
        excellent: {
            threshold: 0.95,
            rating: 5,
            messages: [
                "Outstanding service! Lightning fast and perfect accuracy!",
                "Incredible! You're a natural at this!",
                "Perfect transaction! I'll definitely be back!",
                "Amazing speed and accuracy! Best market ever!",
                "Flawless service! You made my day!"
            ]
        },
        
        great: {
            threshold: 0.85,
            rating: 4,
            messages: [
                "Great job! Quick and accurate service!",
                "Very impressed with your skills!",
                "Excellent work! Keep it up!",
                "Really good service, thank you!",
                "Nice work! Very professional!"
            ]
        },
        
        good: {
            threshold: 0.70,
            rating: 3,
            messages: [
                "Good service, thanks!",
                "Not bad at all!",
                "Decent work, could be faster though.",
                "Okay service, room for improvement.",
                "Fair enough, thanks!"
            ]
        },
        
        poor: {
            threshold: 0.50,
            rating: 2,
            messages: [
                "Service was quite slow...",
                "You need to work on your speed.",
                "Not very impressed with the service.",
                "Could definitely be better.",
                "Disappointing experience."
            ]
        },
        
        terrible: {
            threshold: 0,
            rating: 1,
            messages: [
                "Very poor service! Too slow!",
                "Terrible experience, very disappointed.",
                "This took way too long!",
                "Awful service, won't be back.",
                "Completely unsatisfied with the service."
            ]
        }
    };
    
    // Utility functions
    static getRandomProduct(category = null) {
        let products = [];
        
        if (category) {
            products = this.MARKET_ITEMS[category] || [];
        } else {
            // Get all products from all categories
            Object.values(this.MARKET_ITEMS).forEach(categoryProducts => {
                products = products.concat(categoryProducts);
            });
        }
        
        if (products.length === 0) return null;
        
        return products[Math.floor(Math.random() * products.length)];
    }
    
    static getAllProducts() {
        const allProducts = [];
        Object.values(this.MARKET_ITEMS).forEach(categoryProducts => {
            allProducts.push(...categoryProducts);
        });
        return allProducts;
    }

    static generateOrder() {
        const minItems = Math.max(1, parseInt(this.GAME_SETTINGS.ORDER_MIN_ITEMS, 10) || 1);
        const maxItems = Math.max(minItems, parseInt(this.GAME_SETTINGS.ORDER_MAX_ITEMS, 10) || 6);
        const numItems = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
        const order = [];
        
        for (let i = 0; i < numItems; i++) {
            const product = this.getRandomProduct();
            if (product) {
                order.push({
                    ...product,
                    quantity: Math.floor(Math.random() * 3) + 1 // 1-3 quantity
                });
            }
        }
        
        return order;
    }

    static calculateOrderTotal(order) {
        if (!Array.isArray(order)) {
            console.warn('calculateOrderTotal called with non-array:', order);
            return 0;
        }
        
        return order.reduce((total, item) => {
            if (!item) {
                console.warn('calculateOrderTotal: null/undefined item in order');
                return total;
            }
            
            // Use item.price (current/adjusted price) instead of item.basePrice
            const itemPrice = parseFloat(item.price || item.basePrice || 0);
            const itemQuantity = parseInt(item.quantity || 0);
            
            if (isNaN(itemPrice) || isNaN(itemQuantity)) {
                console.warn('calculateOrderTotal: invalid price or quantity', { item, itemPrice, itemQuantity });
                return total;
            }
            
            return total + (itemPrice * itemQuantity);
        }, 0);
    }

    static formatMoney(amount) {
        // Handle undefined, null, or invalid amounts
        if (amount === null || amount === undefined || isNaN(amount)) {
            console.warn('formatMoney called with invalid amount:', amount);
            return '$0.00';
        }
        
        // Ensure amount is a number
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            console.warn('formatMoney could not parse amount:', amount);
            return '$0.00';
        }
        
        return `$${numAmount.toFixed(2)}`;
    }

    static getRandomCustomer() {
        const avatar = this.CUSTOMER_AVATARS[Math.floor(Math.random() * this.CUSTOMER_AVATARS.length)];
        const name = this.CUSTOMER_NAMES[Math.floor(Math.random() * this.CUSTOMER_NAMES.length)];
        return { avatar, name };
    }

    static calculateReview(accuracy, speedPercentage) {
        // Calculate overall performance score
        const performanceScore = (accuracy * 0.6) + (speedPercentage * 0.4);
        
        // Determine review category
        let reviewCategory;
        if (performanceScore >= this.REVIEW_SYSTEM.excellent.threshold) {
            reviewCategory = this.REVIEW_SYSTEM.excellent;
        } else if (performanceScore >= this.REVIEW_SYSTEM.great.threshold) {
            reviewCategory = this.REVIEW_SYSTEM.great;
        } else if (performanceScore >= this.REVIEW_SYSTEM.good.threshold) {
            reviewCategory = this.REVIEW_SYSTEM.good;
        } else if (performanceScore >= this.REVIEW_SYSTEM.poor.threshold) {
            reviewCategory = this.REVIEW_SYSTEM.poor;
        } else {
            reviewCategory = this.REVIEW_SYSTEM.terrible;
        }
        
        // Get random message from category
        const messages = reviewCategory.messages;
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        return {
            rating: reviewCategory.rating,
            message: message,
            performanceScore: performanceScore
        };
    }
    
    static calculateOptimalChange(amount) {
        // Calculate optimal change using largest denominations first (like real cashiers)
        const bills = [...this.MONEY_SYSTEM.bills].sort((a, b) => b.value - a.value); // Largest first
        const coins = [...this.MONEY_SYSTEM.coins].sort((a, b) => b.value - a.value); // Largest first
        const allMoney = [...bills, ...coins];
        
        const change = [];
        let remaining = Math.round(amount * 100) / 100; // Handle floating point precision
        
        // Use greedy algorithm - always take the largest denomination possible
        for (const money of allMoney) {
            if (remaining <= 0) break;
            
            const count = Math.floor(remaining / money.value);
            if (count > 0) {
                change.push({
                    ...money,
                    count: count,
                    total: Math.round(count * money.value * 100) / 100
                });
                remaining = Math.round((remaining - (count * money.value)) * 100) / 100;
            }
        }
        
        return change;
    }
    
    // New function to get a human-readable change breakdown for hints
    static getChangeBreakdown(amount) {
        const optimal = this.calculateOptimalChange(amount);
        if (optimal.length === 0) return "No change needed";
        
        const breakdown = optimal.map(item => {
            if (item.count === 1) {
                return `${item.label}`;
            } else {
                return `${item.count} × ${item.label}`;
            }
        }).join(', ');
        
        return `Give: ${breakdown}`;
    }
    
    // Enhanced function to check if player's change selection matches optimal change
    static isOptimalChange(playerSelection, expectedAmount) {
        const optimal = this.calculateOptimalChange(expectedAmount);
        const playerTotal = playerSelection.reduce((sum, money) => sum + money.value, 0);
        
        // First check if the total is correct
        if (!this.validateChange(expectedAmount, playerTotal)) {
            return { isOptimal: false, reason: 'incorrect_total', optimal: optimal };
        }
        
        // Count player's selection by denomination
        const playerCounts = {};
        playerSelection.forEach(money => {
            const key = money.value.toString();
            playerCounts[key] = (playerCounts[key] || 0) + 1;
        });
        
        // Count optimal selection by denomination
        const optimalCounts = {};
        optimal.forEach(item => {
            optimalCounts[item.value.toString()] = item.count;
        });
        
        // Compare selections
        const allDenominations = new Set([...Object.keys(playerCounts), ...Object.keys(optimalCounts)]);
        
        for (const denomination of allDenominations) {
            const playerCount = playerCounts[denomination] || 0;
            const optimalCount = optimalCounts[denomination] || 0;
            
            if (playerCount !== optimalCount) {
                return { 
                    isOptimal: false, 
                    reason: 'not_optimal', 
                    optimal: optimal,
                    suggestion: this.getChangeBreakdown(expectedAmount)
                };
            }
        }
        
        return { isOptimal: true, optimal: optimal };
    }
    
    static validateChange(expectedChange, givenChange) {
        const expectedTotal = Math.round(expectedChange * 100) / 100;
        const givenTotal = Math.round(givenChange * 100) / 100;
        
        return Math.abs(expectedTotal - givenTotal) <= this.GAME_SETTINGS.MONEY_TOLERANCE;
    }
    
    static getCurrentSeason() {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return "spring";
        if (month >= 6 && month <= 8) return "summer";
        if (month >= 9 && month <= 11) return "fall";
        return "winter";
    }
    
    static getSeasonalProducts(season = null) {
        const currentSeason = season || this.getCurrentSeason();
        const seasonalProducts = [];
        
        Object.values(this.MARKET_ITEMS).forEach(categoryProducts => {
            categoryProducts.forEach(product => {
                if (product.seasonal && product.seasons.includes(currentSeason)) {
                    seasonalProducts.push(product);
                }
            });
        });
        
        return seasonalProducts;
    }
    
    static calculateScore(baseScore, accuracy, speed, streak = 0) {
        let score = baseScore;
        
        // Accuracy bonus
        if (accuracy >= 1.0) {
            score *= this.GAME_SETTINGS.ACCURACY_BONUS_MULTIPLIER;
        }
        
        // Speed bonus (if completed in less than 30 seconds)
        if (speed > 0.7) {
            score *= this.GAME_SETTINGS.SPEED_BONUS_MULTIPLIER;
        }
        
        // Streak bonus
        if (streak >= this.GAME_SETTINGS.STREAK_BONUS_THRESHOLD) {
            score *= this.GAME_SETTINGS.STREAK_BONUS_MULTIPLIER;
        }
        
        return Math.round(score);
    }
    
    static saveGameData(gameData) {
        try {
            localStorage.setItem('farmersMarketFrenzy', JSON.stringify(gameData));
            return true;
        } catch (error) {
            console.warn('Could not save game data:', error);
            return false;
        }
    }
    
    static loadGameData() {
        try {
            const data = localStorage.getItem('farmersMarketFrenzy');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Could not load game data:', error);
            return null;
        }
    }
    
    static getDefaultGameData() {
        return {
            totalScore: 0,
            popularity: this.GAME_SETTINGS.STARTING_POPULARITY,
            customersServed: 0,
            totalEarnings: 0,
            currentStreak: 0,
            bestStreak: 0,
            averageRating: 0,
            totalRatings: 0,
            perfectSales: 0,
            achievements: [],
            difficulty: 'medium', // Default difficulty
            statistics: {
                totalPlayTime: 0,
                fastestSale: null,
                mostAccurateSale: null,
                biggestOrder: 0,
                favoriteProducts: {}
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.GameConfig = GameConfig;
}
