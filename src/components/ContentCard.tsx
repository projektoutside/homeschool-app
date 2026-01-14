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

    return (
        <div className="content-card" onClick={handleClick} role="button" tabIndex={0}>
            <div className="card-thumbnail">
                {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} loading="lazy" />
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
