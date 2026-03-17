import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findBaseModuleById } from '../data/moduleRegistry';
import { useManagerConfig } from '../hooks/useManagerConfig';
import type { AppAreaId, ModuleDefinition } from '../types/appAreas';
import type { ContentType } from '../types/content';
import './ManagerPage.css';

const ManagerPage: React.FC = () => {
    const {
        areas,
        config,
        allItems,
        resolvedItems,
        createFolder,
        updateFolder,
        deleteFolder,
        assignItemToAreaRoot,
        assignItemToFolder,
        updateItemOverride,
        createItem,
        deleteItem,
        restoreBaseItem,
        importConfigJson,
        resetConfig,
    } = useManagerConfig();

    const manageableAreas = useMemo(
        () => areas.filter((area) => area.supportsModules),
        [areas],
    );
    const [selectedAreaId, setSelectedAreaId] = useState<AppAreaId>('games');
    const [newFolderName, setNewFolderName] = useState('');
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemType, setNewItemType] = useState<ContentType>('tool');
    const [newItemAreaId, setNewItemAreaId] = useState<AppAreaId>('classroom');
    const [newItemPath, setNewItemPath] = useState('');
    const [newItemExternalUrl, setNewItemExternalUrl] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [selectedItemAreaTarget, setSelectedItemAreaTarget] = useState<AppAreaId>('games');
    const [selectedItemFolderTarget, setSelectedItemFolderTarget] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [jsonStatus, setJsonStatus] = useState('');

    useEffect(() => {
        if (!manageableAreas.some((area) => area.id === selectedAreaId)) {
            setSelectedAreaId(manageableAreas[0]?.id ?? 'games');
        }
    }, [manageableAreas, selectedAreaId]);

    useEffect(() => {
        setJsonText(JSON.stringify(config, null, 2));
    }, [config]);

    const foldersForArea = useMemo(
        () => config.folders.filter((folder) => folder.areaId === selectedAreaId),
        [config.folders, selectedAreaId],
    );

    const areaRootItems = useMemo(() => {
        return (config.areaItems[selectedAreaId] ?? [])
            .map((id) => resolvedItems.get(id))
            .filter((item): item is ModuleDefinition => Boolean(item));
    }, [config.areaItems, resolvedItems, selectedAreaId]);

    const availableItems = useMemo(() => {
        return [...allItems].sort((a, b) => a.title.localeCompare(b.title));
    }, [allItems]);

    const deletedBaseItems = useMemo(() => {
        return config.deletedItemIds
            .map((id) => findBaseModuleById(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [config.deletedItemIds]);

    const selectedItem = selectedItemId ? resolvedItems.get(selectedItemId) ?? null : null;

    const createItemAreaOptions = useMemo(() => {
        return manageableAreas.filter((area) => {
            if (newItemType === 'game') {
                return area.id === 'games';
            }
            return area.id === 'classroom';
        });
    }, [manageableAreas, newItemType]);

    const selectedItemAreaOptions = useMemo(() => {
        if (!selectedItem) {
            return manageableAreas;
        }

        return manageableAreas.filter((area) => {
            if (selectedItem.type === 'game') {
                return area.id === 'games';
            }
            return area.id === 'classroom';
        });
    }, [manageableAreas, selectedItem]);

    useEffect(() => {
        if (!createItemAreaOptions.some((area) => area.id === newItemAreaId)) {
            setNewItemAreaId(createItemAreaOptions[0]?.id ?? 'games');
        }
    }, [createItemAreaOptions, newItemAreaId]);

    useEffect(() => {
        if (!selectedItemId) {
            setSelectedItemAreaTarget(selectedAreaId);
            setSelectedItemFolderTarget('');
            return;
        }

        const areaWithItem = manageableAreas.find((area) => (config.areaItems[area.id] ?? []).includes(selectedItemId));
        const folderWithItem = config.folders.find((folder) => folder.itemIds.includes(selectedItemId));
        const fallbackAreaId = selectedItem?.type === 'game' ? 'games' : 'classroom';
        const nextAreaId = folderWithItem?.areaId ?? areaWithItem?.id ?? fallbackAreaId;

        setSelectedItemAreaTarget(nextAreaId);
        setSelectedItemFolderTarget(folderWithItem?.id ?? '');
    }, [config.areaItems, config.folders, manageableAreas, selectedAreaId, selectedItem, selectedItemId]);

    const areaSummaries = useMemo(() => {
        return manageableAreas.map((area) => {
            const rootCount = (config.areaItems[area.id] ?? []).length;
            const folderCount = config.folders.filter((folder) => folder.areaId === area.id).length;
            const folderItemCount = config.folders
                .filter((folder) => folder.areaId === area.id)
                .reduce((total, folder) => total + folder.itemIds.length, 0);

            return {
                ...area,
                moduleCount: rootCount + folderItemCount,
                rootCount,
                folderCount,
            };
        });
    }, [config.areaItems, config.folders, manageableAreas]);

    return (
        <div className="manager-page">
            <header className="manager-header">
                <h1>Manager Lab</h1>
                <p>Fixed-area registry controls for Games and Classroom. Homepage stays a dedicated root experience.</p>
                <div className="manager-inline-form">
                    <Link to="/character-creator" className="file-chip" style={{ textDecoration: 'none' }}>
                        Open XiO Studio
                    </Link>
                </div>
            </header>

            <section className="manager-row">
                <div className="manager-card">
                    <h2>Fixed Areas</h2>
                    <div className="manager-area-list">
                        {areas.map((area) => {
                            const summary = areaSummaries.find((entry) => entry.id === area.id);
                            const isSelected = selectedAreaId === area.id;

                            return (
                                <button
                                    key={area.id}
                                    type="button"
                                    className={`manager-area-pill ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => {
                                        if (area.supportsModules) {
                                            setSelectedAreaId(area.id);
                                        }
                                    }}
                                    disabled={!area.supportsModules}
                                >
                                    <span>{area.icon} {area.label}</span>
                                    <span className="manager-area-pill__meta">
                                        {area.supportsModules && summary
                                            ? `${summary.moduleCount} modules · ${summary.folderCount} folders`
                                            : 'Dedicated root'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="manager-card">
                    <h2>Create Folder in Active Area</h2>
                    <div className="manager-inline-form">
                        <select aria-label="Choose active area" value={selectedAreaId} onChange={(e) => setSelectedAreaId(e.target.value as AppAreaId)}>
                            {manageableAreas.map((area) => (
                                <option key={area.id} value={area.id}>{area.icon} {area.label}</option>
                            ))}
                        </select>
                        <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" />
                        <button
                            type="button"
                            onClick={() => {
                                if (!newFolderName.trim()) return;
                                createFolder(selectedAreaId, newFolderName);
                                setNewFolderName('');
                            }}
                        >
                            Add
                        </button>
                    </div>

                    <div className="manager-stack-list">
                        {foldersForArea.map((folder) => (
                            <div key={folder.id} className="manager-inline-form">
                                <input
                                    value={folder.name}
                                    onChange={(e) => updateFolder(folder.id, { name: e.target.value })}
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
                    <h2>Module Library</h2>
                    <div className="item-pool">
                        {availableItems.map((item) => (
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
                    <h2>Active Area Root</h2>
                    <div
                        className="drop-zone"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                            if (!draggingItemId) return;
                            assignItemToAreaRoot(draggingItemId, selectedAreaId);
                            setDraggingItemId(null);
                        }}
                    >
                        {areaRootItems.map((item) => (
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

                <div className="manager-card manager-card-wide">
                    <h2>Folders in Active Area</h2>
                    <div className="folder-grid">
                        {foldersForArea.map((folder) => (
                            <div
                                key={folder.id}
                                className="folder-drop-zone"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (!draggingItemId) return;
                                    assignItemToFolder(draggingItemId, folder.id);
                                    setDraggingItemId(null);
                                }}
                            >
                                <h3>📁 {folder.name}</h3>
                                <div className="item-pool">
                                    {folder.itemIds.map((id) => {
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
                    <h2>Create Module</h2>
                    <div className="editor-form">
                        <input
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="Title"
                            aria-label="New item title"
                        />
                        <select
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value as ContentType)}
                            aria-label="New item type"
                        >
                            <option value="game">Game</option>
                            <option value="worksheet">Worksheet</option>
                            <option value="tool">Tool</option>
                            <option value="resource">Resource</option>
                        </select>
                        <select
                            value={newItemAreaId}
                            onChange={(e) => setNewItemAreaId(e.target.value as AppAreaId)}
                            aria-label="New item area"
                        >
                            {createItemAreaOptions.map((area) => (
                                <option key={area.id} value={area.id}>{area.icon} {area.label}</option>
                            ))}
                        </select>
                        <input
                            value={newItemPath}
                            onChange={(e) => setNewItemPath(e.target.value)}
                            placeholder="Custom HTML path (/Worksheets/.../index.html)"
                            aria-label="New item local html path"
                        />
                        <input
                            value={newItemExternalUrl}
                            onChange={(e) => setNewItemExternalUrl(e.target.value)}
                            placeholder="External URL (optional)"
                            aria-label="New item external url"
                        />
                        <textarea
                            value={newItemDescription}
                            onChange={(e) => setNewItemDescription(e.target.value)}
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
                                    areaId: newItemAreaId,
                                });
                                setNewItemTitle('');
                                setNewItemPath('');
                                setNewItemExternalUrl('');
                                setNewItemDescription('');
                            }}
                        >
                            Create Module
                        </button>
                    </div>
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>Module Editor</h2>
                    {selectedItem ? (
                        <div className="editor-form">
                            <input
                                value={selectedItem.title}
                                onChange={(e) => updateItemOverride(selectedItem.id, { title: e.target.value })}
                                placeholder="Title"
                            />
                            <input
                                value={selectedItem.customHtmlPath ?? ''}
                                onChange={(e) => updateItemOverride(selectedItem.id, { customHtmlPath: e.target.value })}
                                placeholder="Local HTML Path"
                            />
                            <input
                                value={selectedItem.externalUrl ?? ''}
                                onChange={(e) => updateItemOverride(selectedItem.id, { externalUrl: e.target.value })}
                                placeholder="External URL"
                            />
                            <select
                                value={selectedItem.type}
                                onChange={(e) => updateItemOverride(selectedItem.id, { type: e.target.value as ContentType })}
                                aria-label="Selected item type"
                            >
                                <option value="game">Game</option>
                                <option value="worksheet">Worksheet</option>
                                <option value="tool">Tool</option>
                                <option value="resource">Resource</option>
                            </select>
                            <input
                                value={selectedItem.category ?? ''}
                                onChange={(e) => updateItemOverride(selectedItem.id, { category: e.target.value })}
                                placeholder="Category"
                                aria-label="Selected item category"
                            />
                            <textarea
                                value={selectedItem.description}
                                onChange={(e) => updateItemOverride(selectedItem.id, { description: e.target.value })}
                                placeholder="Description"
                            />
                            <div className="location-editor-row">
                                <select
                                    value={selectedItemAreaTarget}
                                    onChange={(e) => {
                                        setSelectedItemAreaTarget(e.target.value as AppAreaId);
                                        setSelectedItemFolderTarget('');
                                    }}
                                    aria-label="Move selected item to area"
                                >
                                    {selectedItemAreaOptions.map((area) => (
                                        <option key={area.id} value={area.id}>{area.icon} {area.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => assignItemToAreaRoot(selectedItem.id, selectedItemAreaTarget)}
                                >
                                    Move to Area Root
                                </button>
                            </div>

                            <div className="location-editor-row">
                                <select
                                    value={selectedItemFolderTarget}
                                    onChange={(e) => setSelectedItemFolderTarget(e.target.value)}
                                    aria-label="Move selected item to folder"
                                >
                                    <option value="">Select folder in chosen area</option>
                                    {config.folders
                                        .filter((folder) => folder.areaId === selectedItemAreaTarget)
                                        .map((folder) => (
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
                                Delete Module
                            </button>
                        </div>
                    ) : (
                        <p>Select a module chip to edit.</p>
                    )}
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>Restore Deleted Built-in Modules</h2>
                    <div className="item-pool">
                        {deletedBaseItems.length === 0 && <p>No built-in modules deleted.</p>}
                        {deletedBaseItems.map((item) => (
                            <button key={item.id} type="button" onClick={() => restoreBaseItem(item.id)}>
                                Restore {item.title}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="manager-card manager-card-wide">
                    <h2>JSON Config Console</h2>
                    <textarea aria-label="Manager JSON config" value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="json-area" />
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
