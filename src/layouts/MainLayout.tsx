import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { ThemeToggle } from '../components/ThemeToggle';
import '../styles/variables.css';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const isHomeRoute = location.pathname === '/';
    const isGamePlayerRoute = location.pathname.startsWith('/play/') || location.pathname.startsWith('/open/');
    const isManagerRoute = location.pathname === '/manager';
    const isImmersiveRoute = isHomeRoute || isGamePlayerRoute || isManagerRoute;

    const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                if (location.pathname === '/manager') {
                    navigate('/');
                } else {
                    navigate('/manager');
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [location.pathname, navigate]);

    // Calculate content counts
    const counts = useMemo(() => {
        return {
            worksheets: CONTENT_ITEMS.filter(item => item.type === 'worksheet').length,
            games: CONTENT_ITEMS.filter(item => item.type === 'game').length,
            tools: CONTENT_ITEMS.filter(item => item.type === 'tool').length
        };
    }, []);

    return (
        <div
            className={`layout-container ${isImmersiveRoute ? 'home-immersive' : ''} ${isGamePlayerRoute ? 'game-immersive' : ''}`}
        >
            {/* Skip to main content link for keyboard users */}
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>

            {!isImmersiveRoute && (
                <header className="mobile-header">
                    <button
                        className="menu-btn"
                        onClick={toggleSidebar}
                        aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-controls="sidebar-nav"
                    >
                        ☰
                    </button>
                    <span className="logo-text">Homeschool Hub</span>
                    <div className="header-actions">
                        <ThemeToggle />
                    </div>
                </header>
            )}

            {/* Sidebar Navigation */}
            {!isImmersiveRoute && (
                <aside
                    id="sidebar-nav"
                    className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
                    aria-label="Main navigation"
                >
                    <div className="sidebar-header">
                        <span className="logo-text">Homeschool Hub</span>
                        <button
                            className="close-btn"
                            onClick={closeSidebar}
                            aria-label="Close menu"
                        >
                            ×
                        </button>
                    </div>
                    <nav className="nav-links" role="navigation">
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/worksheets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            Worksheets ({counts.worksheets})
                        </NavLink>
                        <NavLink to="/games" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            Games ({counts.games})
                        </NavLink>
                        <NavLink to="/tools" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            Tools ({counts.tools})
                        </NavLink>
                        {import.meta.env.DEV && (
                            <>
                                <div className="nav-divider" role="separator"></div>
                                <NavLink to="/admin" className={({ isActive }) => `nav-item nav-item-admin ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                    ⚙️ Manager
                                </NavLink>
                            </>
                        )}
                    </nav>
                    <div className="sidebar-footer">
                        <ThemeToggle />
                    </div>
                </aside>
            )}

            {/* Overlay for mobile sidebar */}
            {!isImmersiveRoute && isSidebarOpen && (
                <div
                    className="overlay"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Main Content Area */}
            <main id="main-content" className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
