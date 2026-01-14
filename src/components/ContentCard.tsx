import React from 'react';
import type { ContentItem } from '../types/content';
import './ContentCard.css';
import { useNavigate } from 'react-router-dom';

interface ContentCardProps {
    item: ContentItem;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
    const navigate = useNavigate();

    const handleClick = () => {
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
    const getPreviewPath = () => {
        if (item.thumbnail) {
            return item.thumbnail.startsWith('/')
                ? `${import.meta.env.BASE_URL}${item.thumbnail.slice(1)}`
                : `${import.meta.env.BASE_URL}${item.thumbnail}`;
        }
        if (item.customHtmlPath) {
            return item.customHtmlPath.startsWith('/')
                ? `${import.meta.env.BASE_URL}${item.customHtmlPath.slice(1)}`
                : `${import.meta.env.BASE_URL}${item.customHtmlPath}`;
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
                    <img src={previewPath || item.thumbnail} alt={item.title} loading="lazy" />
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
