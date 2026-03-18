export function createDefaultActionCooldowns() {
    return {
        feed: 0,
        water: 0,
        play: 0,
        sing: 0,
        extendTime: 0,
        stressFairy: 0,
    };
}

export function createDefaultPlayerUpgrades() {
    return {
        lockPick: 0,
        luckyCharms: 0,
        chainStrength: 0,
        food: 0,
        water: 0,
        play: 0,
        sing: 0,
        wizardIQ: 0,
        mathCooldown: 0,
        totalCooldownReduction: 0,
    };
}

export function createDefaultScoreData() {
    return {
        rescuedCounts: { common: 0, rare: 0, legendary: 0 },
        totalPointsByRarity: { common: 0, rare: 0, legendary: 0 },
        overallScore: 0,
        lostPetsCount: 0,
        lostPoints: 0,
    };
}

export function createDefaultLevelProgressData() {
    return {
        currentLevel: 1,
        totalPetsRescued: 0,
    };
}

export function createDefaultKeyInventory() {
    return {
        wooden: 0,
        steel: 0,
        golden: 0,
    };
}

export function createDefaultCustomPetRarityRates() {
    return {
        common: 0.60,
        rare: 0.30,
        legendary: 0.10,
    };
}
