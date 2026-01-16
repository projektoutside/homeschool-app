import React, { useCallback, useMemo } from 'react';
import type { ContentItem } from '../types/content';
import './ContentCard.css';
import { useNavigate } from 'react-router-dom';
import { buildAssetPath } from '../utils/pathUtils';

interface ContentCardProps {
    item: ContentItem;
}

const ContentCardComponent: React.FC<ContentCardProps> = ({ item }) => {
    const navigate = useNavigate();

    const handleClick = useCallback((e: React.MouseEvent) => {
        // Prevent iframe clicks from bubbling up
        const target = e.target as HTMLElement;
        if (target.closest('iframe') || target.closest('.iframe-preview-wrapper')) {
            e.preventDefault();
            e.stopPropagation();
            // Only navigate if clicking outside the iframe
            return;
        }
        
        navigate(`/resource/${item.id}`);
    }, [item.id, navigate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/resource/${item.id}`);
        }
    }, [item.id, navigate]);

    const getIcon = useCallback((type: string) => {
        switch (type) {
            case 'game': return '🎮';
            case 'worksheet': return '📝';
            case 'tool': return '🛠️';
            default: return '📄';
        }
    }, []);

    // Build preview path with base URL for GitHub Pages compatibility
    // Uses utility function to ensure paths work on both desktop and mobile browsers
    const previewPath = useMemo(() => {
        if (item.thumbnail) {
            return buildAssetPath(item.thumbnail);
        }
        if (item.customHtmlPath) {
            return buildAssetPath(item.customHtmlPath);
        }
        return null;
    }, [item.thumbnail, item.customHtmlPath]);

    // Show iframe preview for any item with customHtmlPath (worksheets, games, tools)
    const showIframePreview = !!item.customHtmlPath && !item.thumbnail;
    const icon = useMemo(() => getIcon(item.type), [item.type, getIcon]);

    return (
        <div 
            className="content-card" 
            onClick={handleClick} 
            onKeyDown={handleKeyDown}
            role="button" 
            tabIndex={0}
            aria-label={`View ${item.title} - ${item.type}`}
        >
            <div className="card-thumbnail">
                {item.thumbnail ? (
                    <img 
                        src={previewPath || buildAssetPath(item.thumbnail)} 
                        alt={`${item.title} thumbnail`} 
                        loading="lazy"
                        decoding="async"
                    />
                ) : showIframePreview && previewPath ? (
                    <div className="iframe-preview-wrapper">
                        <iframe
                            src={previewPath}
                            title={`Preview of ${item.title}`}
                            className="preview-iframe"
                            tabIndex={-1}
                            loading="lazy"
                            sandbox="allow-same-origin allow-scripts"
                            aria-hidden="true"
                        />
                        <div className="preview-overlay" aria-hidden="true"></div>
                    </div>
                ) : (
                    <div className="placeholder-thumb" data-type={item.type} aria-hidden="true">
                        {icon}
                    </div>
                )}
                <div className="card-badges">
                    <span className="badge type-badge" aria-label={`Type: ${item.type}`}>{item.type}</span>
                </div>
            </div>
            <div className="card-body">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-desc">{item.description}</p>
                <div className="card-meta">
                    <div className="meta-tags" role="list">
                        {item.gradeLevels.slice(0, 2).map(grade => (
                            <span key={grade} className="tag" role="listitem">{grade}</span>
                        ))}
                        {item.gradeLevels.length > 2 && <span className="tag" aria-label={`${item.gradeLevels.length - 2} more grades`}>...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

ContentCardComponent.displayName = 'ContentCard';

const areEqual = (prevProps: ContentCardProps, nextProps: ContentCardProps) => {
    // Custom comparison for memoization
    return prevProps.item.id === nextProps.item.id &&
           prevProps.item.title === nextProps.item.title &&
           prevProps.item.description === nextProps.item.description;
};

export const ContentCard = React.memo(ContentCardComponent, areEqual);
