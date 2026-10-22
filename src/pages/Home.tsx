import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FAVORITE_GAMES_STORAGE_KEY, notifyFavoriteGamesUpdated, readFavoriteGameIds } from '../utils/favoriteGames';
import type { ContentItem, ContentType } from '../types/content';
import type { ModuleDefinition } from '../types/appAreas';
import { isLegacyClassroomTabRequest, resolveModuleLaunchTarget } from '../data/moduleRegistry';
import { useManagerConfig } from '../hooks/useManagerConfig';
import { ArcadeGamePanel, type FavoriteActionMode } from './home/ArcadeGamePanel';
import {
    GAMES_AREA_ID,
    getMultiplayerArcadeGames,
    getSinglePlayerArcadeGames,
    getVisibleArcadeGames,
    pickDailyDoubleGames,
} from './home/gameCollections';
import { resolveItemIconPath } from './home/gameArtwork';
import './Home.css';

const PANEL_TITLE_DEFAULTS = [
    'Daily Doubles',
    'Mystery Triple',
    'Newest Featured',
    'Single Player',
    'Multiplayer Games',
    'Favorites',
] as const;
const DAILY_DOUBLES_PANEL_INDEX = 0;
const MYSTERY_PANEL_INDEX = 1;
const NEWEST_FEATURED_PANEL_INDEX = 2;
const SINGLE_PLAYER_PANEL_INDEX = 3;
const MULTIPLAYER_PANEL_INDEX = 4;
const MYSTERY_SHAKE_DURATION_MS = 1500;
const MYSTERY_REVEAL_DURATION_MS = 3100;
const FAVORITES_PANEL_TITLE = 'Favorites';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { config, resolvedItems, allItems } = useManagerConfig();
    const [openFolderId, setOpenFolderId] = useState<string | null>(null);
    const [panelTitles, setPanelTitles] = useState<string[]>(() => [...PANEL_TITLE_DEFAULTS]);
    const [mysteryShakeActive, setMysteryShakeActive] = useState(false);
    const [mysteryTargetGameId, setMysteryTargetGameId] = useState<string | null>(null);
    const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>(() => readFavoriteGameIds());
    const mysteryShakeTimeoutRef = useRef<number | null>(null);
    const mysteryLaunchTimeoutRef = useRef<number | null>(null);

    const foldersForArea = useMemo(
        () => config.folders.filter((folder) => folder.areaId === GAMES_AREA_ID),
        [config.folders],
    );

    const rootItems = useMemo(() => {
        const itemIds = config.areaItems[GAMES_AREA_ID] ?? [];
        return itemIds
            .map((id) => resolvedItems.get(id))
            .filter((item): item is ModuleDefinition => Boolean(item))
            .filter((item) => item.visibility !== 'hidden')
            .slice(0, 30);
    }, [config.areaItems, resolvedItems]);

    const folderItems = useMemo(() => {
        if (!openFolderId) return [];

        const folder = foldersForArea.find((entry) => entry.id === openFolderId);
        if (!folder) return [];

        return folder.itemIds
            .map((id) => resolvedItems.get(id))
            .filter((item): item is ModuleDefinition => Boolean(item))
            .filter((item) => item.visibility !== 'hidden');
    }, [foldersForArea, openFolderId, resolvedItems]);

    const visibleItems = openFolderId ? folderItems : rootItems;

    const allGameItems = useMemo(
        () => getVisibleArcadeGames(allItems),
        [allItems],
    );
    const singlePlayerGames = useMemo(
        () => getSinglePlayerArcadeGames(allGameItems),
        [allGameItems],
    );
    const multiplayerGames = useMemo(
        () => getMultiplayerArcadeGames(allGameItems),
        [allGameItems],
    );
    const dailyDoubleGames = useMemo(
        () => pickDailyDoubleGames(allGameItems),
        [allGameItems],
    );
    const gamesForPanelByIndex = useMemo(() => {
        const map = new Map<number, ContentItem[]>();
        map.set(DAILY_DOUBLES_PANEL_INDEX, dailyDoubleGames);
        map.set(NEWEST_FEATURED_PANEL_INDEX, allGameItems);
        map.set(SINGLE_PLAYER_PANEL_INDEX, singlePlayerGames);
        map.set(MULTIPLAYER_PANEL_INDEX, multiplayerGames);
        return map;
    }, [allGameItems, dailyDoubleGames, multiplayerGames, singlePlayerGames]);
    const favoriteGames = useMemo(() => {
        const byId = new Map(allGameItems.map((item) => [item.id, item]));
        return favoriteGameIds
            .map((id) => byId.get(id))
            .filter((item): item is ModuleDefinition => Boolean(item));
    }, [allGameItems, favoriteGameIds]);
    const shouldRenderArcadePanels = !openFolderId && allGameItems.length > 0;

    const favoritesPanelIndex = useMemo(
        () => panelTitles.findIndex((title) => title.trim().toLowerCase() === FAVORITES_PANEL_TITLE.toLowerCase()),
        [panelTitles],
    );
    const itemsForPreload = useMemo(
        () => (shouldRenderArcadePanels ? [...allGameItems, ...favoriteGames] : visibleItems),
        [allGameItems, favoriteGames, shouldRenderArcadePanels, visibleItems],
    );
    const visibleIconPaths = useMemo(
        () => itemsForPreload
            .slice(0, 16)
            .map((item) => resolveItemIconPath(item))
            .filter((path): path is string => Boolean(path)),
        [itemsForPreload],
    );

    useEffect(() => {
        const requestedTab = new URLSearchParams(location.search).get('tab')?.trim().toLowerCase();
        if (!requestedTab) return;

        if (requestedTab === 'game' || requestedTab === 'games') {
            if (location.search === '?tab=game' || location.search === '?tab=games') {
                navigate('/apps', { replace: true });
            }
            return;
        }

        if (!isLegacyClassroomTabRequest(requestedTab)) return;
        navigate('/classroom', { replace: true });
    }, [location.search, navigate]);

    useEffect(() => {
        visibleIconPaths.forEach((src) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
        });
    }, [visibleIconPaths]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(FAVORITE_GAMES_STORAGE_KEY, JSON.stringify(favoriteGameIds));
        notifyFavoriteGamesUpdated(favoriteGameIds);
    }, [favoriteGameIds]);

    useEffect(() => {
        const validGameIds = new Set(allGameItems.map((item) => item.id));
        const frameId = window.requestAnimationFrame(() => {
            setFavoriteGameIds((prev) => {
                const filtered = prev.filter((id) => validGameIds.has(id));
                return filtered.length === prev.length ? prev : filtered;
            });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [allGameItems]);

    useEffect(() => {
        return () => {
            if (mysteryShakeTimeoutRef.current !== null) {
                window.clearTimeout(mysteryShakeTimeoutRef.current);
                mysteryShakeTimeoutRef.current = null;
            }

            if (mysteryLaunchTimeoutRef.current !== null) {
                window.clearTimeout(mysteryLaunchTimeoutRef.current);
                mysteryLaunchTimeoutRef.current = null;
            }
        };
    }, []);

    const handlePanelTitleChange = useCallback((panelIndex: number, nextTitle: string) => {
        setPanelTitles((prevTitles) => prevTitles.map((value, index) => (
            index === panelIndex ? nextTitle : value
        )));
    }, []);

    const openItem = useCallback((item: ContentItem) => {
        const launchTarget = resolveModuleLaunchTarget(item);
        if (launchTarget.kind === 'external') {
            if (typeof window !== 'undefined') {
                try {
                    const resolvedUrl = new URL(launchTarget.path, window.location.href);
                    const sameOriginRoute = resolvedUrl.origin === window.location.origin && launchTarget.path.startsWith('/');
                    if (!sameOriginRoute) {
                        window.location.assign(resolvedUrl.toString());
                        return;
                    }
                } catch {
                    // Fall through to client-side navigation for malformed or route-like paths.
                }
            }

            navigate(launchTarget.path, { state: { launchItem: item } });
            return;
        }

        navigate(launchTarget.path, { state: { launchItem: item } });
    }, [navigate]);

    const handleFavoriteHoldAction = useCallback((item: ContentItem, action: Exclude<FavoriteActionMode, 'none'>) => {
        setFavoriteGameIds((prev) => {
            if (action === 'add') {
                return prev.includes(item.id) ? prev : [...prev, item.id];
            }

            return prev.filter((id) => id !== item.id);
        });
    }, []);

    const activateMysteryPanel = useCallback(() => {
        if (allGameItems.length === 0 || mysteryShakeActive || mysteryTargetGameId) return;

        const randomGame = allGameItems[Math.floor(Math.random() * allGameItems.length)];
        setMysteryShakeActive(true);

        if (mysteryShakeTimeoutRef.current !== null) {
            window.clearTimeout(mysteryShakeTimeoutRef.current);
        }
        if (mysteryLaunchTimeoutRef.current !== null) {
            window.clearTimeout(mysteryLaunchTimeoutRef.current);
        }

        mysteryShakeTimeoutRef.current = window.setTimeout(() => {
            mysteryShakeTimeoutRef.current = null;
            setMysteryShakeActive(false);
            setMysteryTargetGameId(randomGame.id);
        }, MYSTERY_SHAKE_DURATION_MS);

        mysteryLaunchTimeoutRef.current = window.setTimeout(() => {
            mysteryLaunchTimeoutRef.current = null;
            navigate(`/play/${randomGame.id}`, { state: { launchItem: randomGame } });
        }, MYSTERY_REVEAL_DURATION_MS);
    }, [allGameItems, mysteryShakeActive, mysteryTargetGameId, navigate]);

    const getFallbackIcon = (type: ContentType): string => {
        if (type === 'game') return '🎮';
        if (type === 'worksheet') return '📄';
        if (type === 'tool') return '🧰';
        return '📁';
    };

    const mysteryGlyphStyles = useMemo(
        () => Array.from({ length: 64 }, (_, index) => {
            const xSeed = ((index * 37) % 101) / 100;
            const ySeed = ((index * 53) % 103) / 100;
            const x = (xSeed * 2 - 1) * 56;
            const y = (ySeed * 2 - 1) * 52;
            const size = 0.85 + ((index * 29) % 7) * 0.26;
            const delay = (index % 16) * 0.035;

            return {
                '--mx': `${x}vw`,
                '--my': `${y}vh`,
                '--msize': size.toFixed(2),
                '--mdelay': `${delay}s`,
            } as React.CSSProperties;
        }),
        [],
    );

    return (
        <div className="os-desktop-shell">
            <section
                className={`os-icon-area ${shouldRenderArcadePanels ? 'os-icon-area--arcade' : ''}`}
                aria-label="games area"
            >
                {shouldRenderArcadePanels ? (
                    <div className="arcade-games-board">
                        {panelTitles.map((title, index) => {
                            const isFavoritesPanel = index === favoritesPanelIndex && favoritesPanelIndex !== -1;
                            const isMysteryPanel = index === MYSTERY_PANEL_INDEX;
                            const gamesForPanel: ContentItem[] = isMysteryPanel
                                ? []
                                : (isFavoritesPanel ? favoriteGames : (gamesForPanelByIndex.get(index) ?? allGameItems));
                            const favoriteActionMode: FavoriteActionMode = isMysteryPanel
                                ? 'none'
                                : (isFavoritesPanel ? 'remove' : 'add');

                            return (
                                <ArcadeGamePanel
                                    key={`arcade-panel-${index}`}
                                    panelIndex={index}
                                    title={title}
                                    games={gamesForPanel}
                                    onTitleChange={(nextTitle) => handlePanelTitleChange(index, nextTitle)}
                                    onLaunchGame={openItem}
                                    favoriteActionMode={favoriteActionMode}
                                    onFavoriteHoldAction={handleFavoriteHoldAction}
                                    emptyMessage={isFavoritesPanel ? 'Press and hold any game to add it to Favorites. Your saved picks stay here for quick access.' : undefined}
                                    isFavoritesPanel={isFavoritesPanel}
                                    isMysteryPanel={isMysteryPanel}
                                    mysteryShakeActive={isMysteryPanel ? mysteryShakeActive : false}
                                    onMysteryActivate={isMysteryPanel ? activateMysteryPanel : undefined}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {!openFolderId && foldersForArea.map((folder) => (
                            <button
                                key={folder.id}
                                type="button"
                                className="desktop-app-icon desktop-app-folder"
                                onClick={() => setOpenFolderId(folder.id)}
                                aria-label={`Open folder ${folder.name}`}
                            >
                                <span className="desktop-app-icon-inner" aria-hidden="true">
                                    <span className="desktop-app-fallback folder-glyph">📁</span>
                                </span>
                            </button>
                        ))}

                        {openFolderId ? (
                            <button
                                type="button"
                                className="desktop-app-icon desktop-app-folder"
                                onClick={() => setOpenFolderId(null)}
                                aria-label="Back to games root"
                            >
                                <span className="desktop-app-icon-inner" aria-hidden="true">
                                    <span className="desktop-app-fallback folder-glyph">↩️</span>
                                </span>
                            </button>
                        ) : null}

                        {visibleItems.map((item, index) => {
                            const iconPath = resolveItemIconPath(item);
                            const prioritizeIcon = index < 12;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="desktop-app-icon"
                                    onClick={() => openItem(item)}
                                    aria-label={`Open ${item.title}`}
                                >
                                    <span className="desktop-app-icon-inner" aria-hidden="true">
                                        {iconPath ? (
                                            <img
                                                src={iconPath}
                                                alt=""
                                                loading={prioritizeIcon ? 'eager' : 'lazy'}
                                                fetchPriority={prioritizeIcon ? 'high' : 'auto'}
                                                decoding={prioritizeIcon ? 'sync' : 'async'}
                                                width={66}
                                                height={66}
                                                draggable={false}
                                                onError={(event) => {
                                                    event.currentTarget.style.display = 'none';
                                                    event.currentTarget.nextElementSibling?.removeAttribute('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <span className="desktop-app-fallback" hidden={!!iconPath}>{getFallbackIcon(item.type)}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </>
                )}
            </section>
            {mysteryTargetGameId ? (
                <div className="mystery-screen-transition" aria-hidden="true">
                    <div className="mystery-screen-fade"></div>
                    <div className="mystery-glyph-cloud">
                        {mysteryGlyphStyles.map((style, index) => (
                            <span key={`mystery-glyph-${index}`} className="mystery-glyph" style={style}>?</span>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default HomePage;
