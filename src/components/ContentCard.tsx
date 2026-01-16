import React from 'react';
import type { ContentItem } from '../types/content';
import './ContentCard.css';
import { useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';

interface ContentCardProps {
    item: ContentItem;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        // Prevent iframe clicks from bubbling up
        const target = e.target as HTMLElement;
        if (target.closest('iframe') || target.closest('.iframe-preview-wrapper')) {
            e.preventDefault();
            e.stopPropagation();
            // Only navigate if clicking outside the iframe
            return;
        }
        
        console.log('ContentCard - Navigating to game:', {
            id: item.id,
            title: item.title,
            type: item.type,
            path: `/resource/${item.id}`
        });
        
        navigate(`/resource/${item.id}`);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'game': return '🎮';
            case 'worksheet': return '📝';
            case 'tool': return '🛠️';
            default: return '📄';
        }
    };

    // Build preview path with base URL for GitHub Pages compatibility
    // Uses utility function to ensure paths work on both desktop and mobile browsers
    const getPreviewPath = () => {
        if (item.thumbnail) {
            return buildAssetPath(item.thumbnail);
        }
        if (item.customHtmlPath) {
            return buildAssetPath(item.customHtmlPath);
        }
        return null;
    };

    const previewPath = getPreviewPath();
    // Show iframe preview for any item with customHtmlPath (worksheets, games, tools)
    const showIframePreview = !!item.customHtmlPath && !item.thumbnail;

    return (
        <div className="content-card" onClick={handleClick} role="button" tabIndex={0}>
            <div className="card-thumbnail">
                {item.thumbnail ? (
                    <img src={previewPath || buildAssetPath(item.thumbnail)} alt={item.title} loading="lazy" />
                ) : showIframePreview && previewPath ? (
                    <div className="iframe-preview-wrapper">
                        <iframe
                            src={previewPath}
                            title={`Preview of ${item.title}`}
                            className="preview-iframe"
                            tabIndex={-1}
                            loading="lazy"
                            sandbox="allow-same-origin allow-scripts"
                        />
                        <div className="preview-overlay"></div>
                    </div>
                ) : (
                    <div className="placeholder-thumb" data-type={item.type}>
                        {getIcon(item.type)}
                    </div>
                )}
                <div className="card-badges">
                    <span className="badge type-badge">{item.type}</span>
                </div>
            </div>
            <div className="card-body">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-desc">{item.description}</p>
                <div className="card-meta">
                    <div className="meta-tags">
                        {item.gradeLevels.slice(0, 2).map(grade => (
                            <span key={grade} className="tag">{grade}</span>
                        ))}
                        {item.gradeLevels.length > 2 && <span className="tag">...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};
