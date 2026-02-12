import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'; // Reuse home styles

const ClassroomPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="os-desktop-shell">
            <section className="os-icon-area" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '2rem',
                height: '100%' 
            }}>
                <button
                    type="button"
                    className="desktop-app-icon"
                    onClick={() => navigate('/html-viewer')}
                    aria-label="Open Worksheets"
                    style={{ flexDirection: 'column', gap: '1rem', width: 'auto', height: 'auto' }}
                >
                    <div className="desktop-app-icon-inner" style={{ width: '120px', height: '120px' }}>
                        <span className="desktop-app-fallback" style={{ fontSize: '3.5rem' }}>📄</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Worksheets</span>
                </button>

                <button
                    type="button"
                    className="desktop-app-icon"
                    onClick={() => navigate('/apps?tab=tools')}
                    aria-label="Open Tools"
                    style={{ flexDirection: 'column', gap: '1rem', width: 'auto', height: 'auto' }}
                >
                    <div className="desktop-app-icon-inner" style={{ width: '120px', height: '120px' }}>
                        <span className="desktop-app-fallback" style={{ fontSize: '3.5rem' }}>🧰</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Tools</span>
                </button>
            </section>
        </div>
    );
};

export default ClassroomPage;
