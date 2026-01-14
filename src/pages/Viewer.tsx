import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import './Viewer.css';

const ViewerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const item = useMemo(() => CONTENT_ITEMS.find(i => i.id === id), [id]);

    if (!item) {
        return (
            <div className="empty-state">
                <p>Resource not found.</p>
                <button onClick={() => navigate('/')}>Go Home</button>
            </div>
        );
    }

    const renderContent = () => {
        // 1. Check for Local HTML Content (Legacy support)
        if (item.customHtmlPath) {
            return (
                <div className="iframe-container">
                    <iframe
                        src={item.customHtmlPath}
                        title={item.title}
                        allowFullScreen
                        className="content-iframe"
                    />
                </div>
            );
        }

        switch (item.type) {
            case 'game':
                // Placeholder for game component logic
                return (
                    <div className="game-container">
                        <div className="placeholder-game">
                            <span className="game-icon">🎮</span>
                            <h3>{item.title} - Game Wrapper</h3>
                            <p>Game Component: {item.componentName}</p>
                            <p>In a real implementation, the specific React component would dynamically load here.</p>
                        </div>
                    </div>
                );
            case 'tool':
                if (item.externalUrl) {
                    return (
                        <div className="iframe-container">
                            <iframe src={item.externalUrl} title={item.title} allowFullScreen />
                        </div>
                    );
                }
                return <div className="placeholder-tool">Tool component not found</div>;
            case 'worksheet':
            case 'resource':
                return (
                    <div className="resource-container">
                        <div className="pdf-preview">
                            <span>📄 Preview of {item.title}</span>
                        </div>
                        <div className="resource-actions">
                            {item.downloadUrl ? (
                                <a href={item.downloadUrl} className="download-btn" target="_blank" rel="noopener noreferrer">
                                    Download PDF
                                </a>
                            ) : (
                                <button className="download-btn" disabled>Download Unavailable</button>
                            )}
                        </div>
                    </div>
                );
            default:
                return <div>Unknown content type</div>;
        }
    };

    return (
        <div className="viewer-page">
            <button onClick={() => navigate(-1)} className="back-btn">← Back</button>

            <div className="viewer-header">
                <h1>{item.title}</h1>
                <p>{item.description}</p>
                <div className="tags">
                    {item.gradeLevels.map(g => <span key={g} className="tag">{g}</span>)}
                </div>
            </div>

            <div className="viewer-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default ViewerPage;
