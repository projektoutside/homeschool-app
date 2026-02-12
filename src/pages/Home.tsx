import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';
import type { ContentType } from '../types/content';
import { useManagerConfig } from '../hooks/useManagerConfig';
import './Home.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
    const visibleIconPaths = useMemo(
        () => visibleItems
            .slice(0, 16)
            .map(item => item.thumbnail ? buildAssetPath(item.thumbnail) : null)
            .filter((path): path is string => Boolean(path)),
        [visibleItems],
    );

    useEffect(() => {
        const requestedTab = new URLSearchParams(location.search).get('tab')?.trim().toLowerCase();
        if (!requestedTab) return;

        // Always route worksheets tab requests to the dedicated HTML viewer.
        if (requestedTab === 'worksheets') {
            navigate('/html-viewer', { replace: true });
            return;
        }

        const tabFromQuery = config.tabs.find(tab => tab.label.trim().toLowerCase() === requestedTab);
        if (!tabFromQuery) return;

        setActiveTab(tabFromQuery.id);
        setOpenFolderId(null);
    }, [location.search, config.tabs, navigate]);

    // Prime the most visible icons for faster first paint on slower connections/devices.
    useEffect(() => {
        visibleIconPaths.forEach(src => {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
        });
    }, [visibleIconPaths]);

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

                {visibleItems.map((item, index) => {
                    const iconPath = item.thumbnail ? buildAssetPath(item.thumbnail) : null;
                    const prioritizeIcon = index < 12;

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
                                        loading={prioritizeIcon ? 'eager' : 'lazy'}
                                        fetchPriority={prioritizeIcon ? 'high' : 'auto'}
                                        decoding={prioritizeIcon ? 'sync' : 'async'}
                                        width={66}
                                        height={66}
                                        draggable={false}
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
        </div>
    );
};

export default HomePage;
