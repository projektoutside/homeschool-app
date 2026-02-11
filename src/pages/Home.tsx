import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentType } from '../types/content';
import type { ManagerTab } from '../types/manager';
import { useManagerConfig } from '../hooks/useManagerConfig';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { config, resolvedItems } = useManagerConfig();
    const [activeTab, setActiveTab] = useState<string>(config.tabs[0]?.id ?? '');
    const [openFolderId, setOpenFolderId] = useState<string | null>(null);

    const currentTabId = useMemo(
        () => (config.tabs.find(tab => tab.id === activeTab)?.id ?? config.tabs[0]?.id ?? ''),
        [activeTab, config.tabs],
    );

    const foldersForTab = useMemo(
        () => config.folders.filter(folder => folder.tabId === currentTabId),
        [config.folders, currentTabId],
    );

    const rootItems = useMemo(() => {
        const itemIds = config.tabItems[currentTabId] ?? [];
        return itemIds
            .map(id => resolvedItems.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .slice(0, 30);
    }, [config.tabItems, currentTabId, resolvedItems]);

    const folderItems = useMemo(() => {
        if (!openFolderId) return [];
        const folder = foldersForTab.find(f => f.id === openFolderId);
        if (!folder) return [];

        return folder.itemIds
            .map(id => resolvedItems.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [foldersForTab, openFolderId, resolvedItems]);

    const visibleItems = openFolderId ? folderItems : rootItems;
    const userDisplayName = (user?.user_metadata?.home_label as string | undefined)?.trim()
        || (user?.user_metadata?.username as string | undefined)?.trim()
        || user?.email?.split('@')[0]
        || 'HOME';

    const orderedTabs = useMemo<ManagerTab[]>(() => {
        const byLabelPriority = (tab: ManagerTab): number => {
            const label = tab.label.trim().toLowerCase();
            if (label === 'games') return 0;
            if (label === 'worksheets') return 1;
            if (label === 'tools') return 2;
            return 3;
        };

        return [...config.tabs].sort((a, b) => {
            const diff = byLabelPriority(a) - byLabelPriority(b);
            if (diff !== 0) return diff;
            return a.label.localeCompare(b.label);
        });
    }, [config.tabs]);

    useEffect(() => {
        const requestedTab = new URLSearchParams(location.search).get('tab')?.trim().toLowerCase();
        if (!requestedTab) return;

        const tabFromQuery = config.tabs.find(tab => tab.label.trim().toLowerCase() === requestedTab);
        if (!tabFromQuery) return;

        setActiveTab(tabFromQuery.id);
        setOpenFolderId(null);
    }, [location.search, config.tabs]);

    const getFallbackIcon = (type: ContentType): string => {
        if (type === 'game') return '🎮';
        if (type === 'worksheet') return '📄';
        if (type === 'tool') return '🧰';
        return '📁';
    };

    return (
        <div className="os-desktop-shell">
            <section className="os-icon-area" aria-label={`${currentTabId} apps`}>
                {!openFolderId && foldersForTab.map(folder => (
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

                {openFolderId && (
                    <button
                        type="button"
                        className="desktop-app-icon desktop-app-folder"
                        onClick={() => setOpenFolderId(null)}
                        aria-label="Back to tab root"
                    >
                        <span className="desktop-app-icon-inner" aria-hidden="true">
                            <span className="desktop-app-fallback folder-glyph">↩️</span>
                        </span>
                    </button>
                )}

                {visibleItems.map(item => {
                    const iconPath = item.thumbnail ? buildAssetPath(item.thumbnail) : null;

                    // Handle navigation based on item properties
                    const handleItemClick = () => {
                        // If item has externalUrl, navigate directly to it
                        if (item.externalUrl) {
                            navigate(item.externalUrl);
                            return;
                        }
                        // Otherwise, use type-based routing
                        const targetPath = item.type === 'game'
                            ? `/play/${item.id}`
                            : (item.type === 'worksheet' || item.type === 'tool')
                                ? `/open/${item.id}`
                                : `/resource/${item.id}`;
                        navigate(targetPath);
                    };

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="desktop-app-icon"
                            onClick={handleItemClick}
                            aria-label={`Open ${item.title}`}
                        >
                            <span className="desktop-app-icon-inner" aria-hidden="true">
                                {iconPath ? (
                                    <img
                                        src={iconPath}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.nextElementSibling?.removeAttribute('hidden');
                                        }}
                                    />
                                ) : null}
                                <span className="desktop-app-fallback" hidden={!!iconPath}>{getFallbackIcon(item.type)}</span>
                            </span>
                        </button>
                    );
                })}
            </section>

            <nav
                className="os-bottom-dock"
                aria-label="Main tabs"
                style={{ gridTemplateColumns: `repeat(${Math.max(orderedTabs.length + 1, 1)}, minmax(0, 1fr))` }}
            >
                <button
                    type="button"
                    className={`dock-tab-btn ${location.pathname === '/home-profile' ? 'active' : ''}`}
                    onClick={() => navigate('/home-profile')}
                    aria-label={`Open ${userDisplayName} home`}
                >
                    <span className="dock-tab-icon" aria-hidden="true">🏠</span>
                    <span>{userDisplayName}</span>
                </button>

                {orderedTabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`dock-tab-btn ${currentTabId === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            if (tab.label === 'Worksheets') {
                                navigate('/html-viewer');
                                return;
                            }
                            setActiveTab(tab.id);
                            setOpenFolderId(null);
                        }}
                        aria-label={`Show ${tab.label}`}
                    >
                        <span className="dock-tab-icon" aria-hidden="true">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default HomePage;
