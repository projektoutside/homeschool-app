import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentType } from '../types/content';
import { useManagerConfig } from '../hooks/useManagerConfig';
import './Home.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
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
                    const targetPath = item.type === 'game'
                        ? `/play/${item.id}`
                        : (item.type === 'worksheet' || item.type === 'tool')
                            ? `/open/${item.id}`
                            : `/resource/${item.id}`;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="desktop-app-icon"
                            onClick={() => navigate(targetPath)}
                            aria-label={`Open ${item.title}`}
                        >
                            <span className="desktop-app-icon-inner" aria-hidden="true">
                                {iconPath ? (
                                    <img src={iconPath} alt="" loading="lazy" decoding="async" />
                                ) : (
                                    <span className="desktop-app-fallback">{getFallbackIcon(item.type)}</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </section>

            <nav
                className="os-bottom-dock"
                aria-label="Main tabs"
                style={{ gridTemplateColumns: `repeat(${Math.max(config.tabs.length, 1)}, minmax(0, 1fr))` }}
            >
                {config.tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`dock-tab-btn ${currentTabId === tab.id ? 'active' : ''}`}
                        onClick={() => {
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
