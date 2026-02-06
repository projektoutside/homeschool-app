import React, { useEffect, useMemo, useState } from 'react';
import { CONTENT_ITEMS } from '../data/mockContent';
import { useManagerConfig } from '../hooks/useManagerConfig';
import type { ContentType } from '../types/content';
import './ManagerPage.css';

const ManagerPage: React.FC = () => {
    const {
        config,
        allItems,
        resolvedItems,
        createTab,
        updateTab,
        deleteTab,
        createFolder,
        updateFolder,
        deleteFolder,
        assignItemToTabRoot,
        assignItemToFolder,
        updateItemOverride,
        createItem,
        deleteItem,
        restoreBaseItem,
        importConfigJson,
        resetConfig,
    } = useManagerConfig();

    const [selectedTabId, setSelectedTabId] = useState(config.tabs[0]?.id ?? '');
    const [newTabLabel, setNewTabLabel] = useState('');
    const [newTabIcon, setNewTabIcon] = useState('📁');
    const [newFolderName, setNewFolderName] = useState('');
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemType, setNewItemType] = useState<ContentType>('tool');
    const [newItemPath, setNewItemPath] = useState('');
    const [newItemExternalUrl, setNewItemExternalUrl] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [selectedItemTabTarget, setSelectedItemTabTarget] = useState('');
    const [selectedItemFolderTarget, setSelectedItemFolderTarget] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [jsonStatus, setJsonStatus] = useState('');

    useEffect(() => {
        if (!config.tabs.find(tab => tab.id === selectedTabId)) {
            setSelectedTabId(config.tabs[0]?.id ?? '');
        }
    }, [config.tabs, selectedTabId]);

    useEffect(() => {
        setJsonText(JSON.stringify(config, null, 2));
    }, [config]);

    const foldersForTab = useMemo(
        () => config.folders.filter(folder => folder.tabId === selectedTabId),
        [config.folders, selectedTabId],
    );

    const availableItems = useMemo(() => {
        return [...allItems]
            .map(item => resolvedItems.get(item.id) ?? item)
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [allItems, resolvedItems]);

    const deletedBaseItems = useMemo(() => {
        return config.deletedItemIds
            .map(id => CONTENT_ITEMS.find(item => item.id === id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [config.deletedItemIds]);

    const selectedItem = selectedItemId ? resolvedItems.get(selectedItemId) : null;

    useEffect(() => {
        if (!selectedItemId) {
            setSelectedItemTabTarget('');
            setSelectedItemFolderTarget('');
            return;
        }

        const tabWithItem = config.tabs.find(tab => (config.tabItems[tab.id] ?? []).includes(selectedItemId));
        const folderWithItem = config.folders.find(folder => folder.itemIds.includes(selectedItemId));

        setSelectedItemTabTarget(tabWithItem?.id ?? folderWithItem?.tabId ?? selectedTabId);
        setSelectedItemFolderTarget(folderWithItem?.id ?? '');
    }, [config.folders, config.tabItems, config.tabs, selectedItemId, selectedTabId]);

    return (
        <div className="manager-page">
            <header className="manager-header">
                <h1>Manager Lab</h1>
                <p>Hidden Developer Mode • Drag & drop files into tabs and folders</p>
            </header>

            <section className="manager-row">
                <div className="manager-card">
                    <h2>Create Tab</h2>
                    <div className="manager-inline-form">
                        <input value={newTabLabel} onChange={e => setNewTabLabel(e.target.value)} placeholder="Tab label" />
                        <input value={newTabIcon} onChange={e => setNewTabIcon(e.target.value)} placeholder="Icon" maxLength={2} />
                        <button
                            type="button"
                            onClick={() => {
                                if (!newTabLabel.trim()) return;
                                createTab(newTabLabel, newTabIcon);
                                setNewTabLabel('');
                            }}
                        >
                            Add
                        </button>
                    </div>

                    <div className="manager-stack-list">
                        {config.tabs.map(tab => (
                            <div key={tab.id} className="manager-inline-form">
                                <input
                                    value={tab.label}
                                    onChange={e => updateTab(tab.id, { label: e.target.value })}
                                    aria-label={`Edit label for ${tab.label}`}
                                />
                                <input
                                    value={tab.icon}
                                    onChange={e => updateTab(tab.id, { icon: e.target.value })}
                                    aria-label={`Edit icon for ${tab.label}`}
                                />
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => deleteTab(tab.id)}
                                    disabled={config.tabs.length <= 1}
                                    title={config.tabs.length <= 1 ? 'At least one tab is required' : 'Delete tab'}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="manager-card">
                    <h2>Create Folder in Active Tab</h2>
                    <div className="manager-inline-form">
                        <select aria-label="Choose active tab" value={selectedTabId} onChange={e => setSelectedTabId(e.target.value)}>
                            {config.tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>{tab.icon} {tab.label}</option>
                            ))}
                        </select>
                        <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" />
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedTabId || !newFolderName.trim()) return;
                                createFolder(selectedTabId, newFolderName);
                                setNewFolderName('');
                            }}
                        >
                            Add
                        </button>
                    </div>

                    <div className="manager-stack-list">
                        {foldersForTab.map(folder => (
                            <div key={folder.id} className="manager-inline-form">
                                <input
                                    value={folder.name}
                                    onChange={e => updateFolder(folder.id, { name: e.target.value })}
                                    aria-label={`Edit folder ${folder.name}`}
                                />
                                <button type="button" className="btn-danger" onClick={() => deleteFolder(folder.id)}>
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="manager-grid-layout">
                <div className="manager-card">
                    <h2>File Library</h2>
                    <div className="item-pool">
                        {availableItems.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                draggable
                                onDragStart={() => setDraggingItemId(item.id)}
                                onClick={() => setSelectedItemId(item.id)}
                                className="file-chip"
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="manager-card">
                    <h2>Tab Root Drop Zone</h2>
                    <div
                        className="drop-zone"
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                            if (!draggingItemId || !selectedTabId) return;
                            assignItemToTabRoot(draggingItemId, selectedTabId);
                            setDraggingItemId(null);
                        }}
                    >
                        {(config.tabItems[selectedTabId] ?? []).map(id => {
                            const item = resolvedItems.get(id);
                            if (!item) return null;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    draggable
                                    onDragStart={() => setDraggingItemId(id)}
                                    onClick={() => setSelectedItemId(id)}
                                    className="file-chip"
                                >
                                    {item.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>Folders in Active Tab</h2>
                    <div className="folder-grid">
                        {foldersForTab.map(folder => (
                            <div
                                key={folder.id}
                                className="folder-drop-zone"
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => {
                                    if (!draggingItemId) return;
                                    assignItemToFolder(draggingItemId, folder.id);
                                    setDraggingItemId(null);
                                }}
                            >
                                <h3>📁 {folder.name}</h3>
                                <div className="item-pool">
                                    {folder.itemIds.map(id => {
                                        const item = resolvedItems.get(id);
                                        if (!item) return null;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                draggable
                                                onDragStart={() => setDraggingItemId(id)}
                                                onClick={() => setSelectedItemId(id)}
                                                className="file-chip"
                                            >
                                                {item.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="manager-row">
                <div className="manager-card manager-card-wide">
                    <h2>Create App/File</h2>
                    <div className="editor-form">
                        <input
                            value={newItemTitle}
                            onChange={e => setNewItemTitle(e.target.value)}
                            placeholder="Title"
                            aria-label="New item title"
                        />
                        <select
                            value={newItemType}
                            onChange={e => setNewItemType(e.target.value as ContentType)}
                            aria-label="New item type"
                        >
                            <option value="game">Game</option>
                            <option value="worksheet">Worksheet</option>
                            <option value="tool">Tool</option>
                            <option value="resource">Resource</option>
                        </select>
                        <input
                            value={newItemPath}
                            onChange={e => setNewItemPath(e.target.value)}
                            placeholder="Custom HTML path (/Worksheets/.../index.html)"
                            aria-label="New item local html path"
                        />
                        <input
                            value={newItemExternalUrl}
                            onChange={e => setNewItemExternalUrl(e.target.value)}
                            placeholder="External URL (optional)"
                            aria-label="New item external url"
                        />
                        <textarea
                            value={newItemDescription}
                            onChange={e => setNewItemDescription(e.target.value)}
                            placeholder="Description"
                            aria-label="New item description"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (!newItemTitle.trim()) return;
                                createItem({
                                    title: newItemTitle,
                                    type: newItemType,
                                    customHtmlPath: newItemPath,
                                    externalUrl: newItemExternalUrl,
                                    description: newItemDescription,
                                    tabId: selectedTabId,
                                });
                                setNewItemTitle('');
                                setNewItemPath('');
                                setNewItemExternalUrl('');
                                setNewItemDescription('');
                            }}
                        >
                            Create Item
                        </button>
                    </div>
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>Quick Code/Data Editor</h2>
                    {selectedItem ? (
                        <div className="editor-form">
                            <input
                                value={selectedItem.title}
                                onChange={e => updateItemOverride(selectedItem.id, { title: e.target.value })}
                                placeholder="Title"
                            />
                            <input
                                value={selectedItem.customHtmlPath ?? ''}
                                onChange={e => updateItemOverride(selectedItem.id, { customHtmlPath: e.target.value })}
                                placeholder="Local HTML Path"
                            />
                            <input
                                value={selectedItem.externalUrl ?? ''}
                                onChange={e => updateItemOverride(selectedItem.id, { externalUrl: e.target.value })}
                                placeholder="External URL"
                            />
                            <select
                                value={selectedItem.type}
                                onChange={e => updateItemOverride(selectedItem.id, { type: e.target.value as ContentType })}
                                aria-label="Selected item type"
                            >
                                <option value="game">Game</option>
                                <option value="worksheet">Worksheet</option>
                                <option value="tool">Tool</option>
                                <option value="resource">Resource</option>
                            </select>
                            <input
                                value={selectedItem.category ?? ''}
                                onChange={e => updateItemOverride(selectedItem.id, { category: e.target.value })}
                                placeholder="Category"
                                aria-label="Selected item category"
                            />
                            <textarea
                                value={selectedItem.description}
                                onChange={e => updateItemOverride(selectedItem.id, { description: e.target.value })}
                                placeholder="Description"
                            />
                            <div className="location-editor-row">
                                <select
                                    value={selectedItemTabTarget}
                                    onChange={e => {
                                        setSelectedItemTabTarget(e.target.value);
                                        setSelectedItemFolderTarget('');
                                    }}
                                    aria-label="Move selected item to tab"
                                >
                                    {config.tabs.map(tab => (
                                        <option key={tab.id} value={tab.id}>{tab.icon} {tab.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedItemTabTarget) return;
                                        assignItemToTabRoot(selectedItem.id, selectedItemTabTarget);
                                    }}
                                >
                                    Move to Tab Root
                                </button>
                            </div>

                            <div className="location-editor-row">
                                <select
                                    value={selectedItemFolderTarget}
                                    onChange={e => setSelectedItemFolderTarget(e.target.value)}
                                    aria-label="Move selected item to folder"
                                >
                                    <option value="">Select folder in chosen tab</option>
                                    {config.folders
                                        .filter(folder => folder.tabId === selectedItemTabTarget)
                                        .map(folder => (
                                            <option key={folder.id} value={folder.id}>📁 {folder.name}</option>
                                        ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedItemFolderTarget) return;
                                        assignItemToFolder(selectedItem.id, selectedItemFolderTarget);
                                    }}
                                    disabled={!selectedItemFolderTarget}
                                >
                                    Move to Folder
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={() => {
                                    deleteItem(selectedItem.id);
                                    setSelectedItemId('');
                                }}
                            >
                                Delete App/File
                            </button>
                        </div>
                    ) : (
                        <p>Select a file chip to edit.</p>
                    )}
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>Restore Deleted Built-in Items</h2>
                    <div className="item-pool">
                        {deletedBaseItems.length === 0 && <p>No built-in items deleted.</p>}
                        {deletedBaseItems.map(item => (
                            <button key={item.id} type="button" onClick={() => restoreBaseItem(item.id)}>
                                Restore {item.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>JSON Config Console</h2>
                    <textarea aria-label="Manager JSON config" value={jsonText} onChange={e => setJsonText(e.target.value)} className="json-area" />
                    <div className="manager-inline-form">
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    importConfigJson(jsonText);
                                    setJsonStatus('Config applied');
                                } catch {
                                    setJsonStatus('Invalid JSON');
                                }
                            }}
                        >
                            Apply JSON
                        </button>
                        <button type="button" onClick={() => setJsonText(JSON.stringify(config, null, 2))}>Refresh</button>
                        <button type="button" onClick={resetConfig}>Reset</button>
                    </div>
                    {jsonStatus && <p className="json-status">{jsonStatus}</p>}
                </div>
            </section>
        </div>
    );
};

export default ManagerPage;
