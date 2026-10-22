import type { ModuleDefinition } from '../../types/appAreas';
import { isMultiplayerGameModule, isSinglePlayerGameModule } from '../../data/moduleRegistry';

export const GAMES_AREA_ID = 'games';

export const getVisibleArcadeGames = (items: ModuleDefinition[]): ModuleDefinition[] => {
    return items.filter((item) => item.areaId === GAMES_AREA_ID && item.type === 'game' && item.visibility !== 'hidden');
};

export const getSinglePlayerArcadeGames = (items: ModuleDefinition[]): ModuleDefinition[] => {
    return items.filter((item) => isSinglePlayerGameModule(item));
};

export const getMultiplayerArcadeGames = (items: ModuleDefinition[]): ModuleDefinition[] => {
    return items.filter((item) => isMultiplayerGameModule(item));
};

export const pickDailyDoubleGames = (items: ModuleDefinition[]): ModuleDefinition[] => {
    if (items.length === 0) {
        return [];
    }

    const now = new Date();
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let hash = 0;
    for (let index = 0; index < dayKey.length; index += 1) {
        hash = ((hash << 5) - hash) + dayKey.charCodeAt(index);
        hash |= 0;
    }

    const gameIndex = Math.abs(hash) % items.length;
    return [items[gameIndex]];
};
