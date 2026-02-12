import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'; // Reuse home styles

const ClassroomPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="os-desktop-shell">
            <section className="os-icon-area" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', // Two equal columns
                gap: '2rem',
                padding: '3rem 2rem', // Top padding to position at top row
                alignContent: 'start', // Align grid content to the start (top)
                justifyItems: 'center', // Center items horizontally in their cells
                height: '100%',
                overflowX: 'visible', // Allow content to overflow horizontally if needed
                overflowY: 'auto'
            }}>
                <button
                    type="button"
                    className="desktop-app-icon"
                    onClick={() => navigate('/html-viewer')}
                    aria-label="Open Worksheets"
                    style={{ 
                        flexDirection: 'column', 
                        gap: '1rem', 
                        width: 'auto', 
                        height: 'auto',
                        overflow: 'visible', // Allow text to overflow if needed, prevents cutting off
                        padding: '1rem', // Add padding around button content
                        contentVisibility: 'visible', // Override CSS content-visibility
                        contain: 'none' // Override CSS containment
                    }}
                >
                    <div className="desktop-app-icon-inner" style={{ width: '120px', height: '120px' }}>
                        <span className="desktop-app-fallback" style={{ fontSize: '3.5rem' }}>📄</span>
                    </div>
                    <span style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem', 
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap', // Keep text on one line
                        display: 'block',
                        padding: '0 10px', // Extra padding to prevent character clipping
                        minWidth: 'min-content' // Ensure text takes full width it needs
                    }}>
                        Worksheets
                    </span>
                </button>

                <button
                    type="button"
                    className="desktop-app-icon"
                    onClick={() => navigate('/apps?tab=tools')}
                    aria-label="Open Tools"
                    style={{ 
                        flexDirection: 'column', 
                        gap: '1rem', 
                        width: 'auto', 
                        height: 'auto',
                        overflow: 'visible',
                        padding: '1rem',
                        contentVisibility: 'visible',
                        contain: 'none'
                    }}
                >
                    <div className="desktop-app-icon-inner" style={{ width: '120px', height: '120px' }}>
                        <span className="desktop-app-fallback" style={{ fontSize: '3.5rem' }}>🧰</span>
                    </div>
                    <span style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem', 
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        padding: '0 10px',
                        minWidth: 'min-content'
                    }}>
                        Tools
                    </span>
                </button>
            </section>
        </div>
    );
};

export default ClassroomPage;
