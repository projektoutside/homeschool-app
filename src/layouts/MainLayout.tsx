import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import '../styles/variables.css';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="layout-container">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
                    ☰
                </button>
                <span className="logo-text">Homeschool Hub</span>
            </header>

            {/* Sidebar Navigation */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="logo-text">Homeschool Hub</span>
                    <button className="close-btn" onClick={toggleSidebar} aria-label="Close menu">
                        ×
                    </button>
                </div>
                <nav className="nav-links">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/worksheets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        Worksheets
                    </NavLink>
                    <NavLink to="/games" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        Games
                    </NavLink>
                    <NavLink to="/tools" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        Tools
                    </NavLink>
                    <NavLink to="/files" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        Files
                    </NavLink>
                    <div className="nav-divider"></div>
                    <NavLink to="/admin" className={({ isActive }) => `nav-item nav-item-admin ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                        ⚙️ Manager
                    </NavLink>
                </nav>
            </aside>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div className="overlay" onClick={() => setIsSidebarOpen(false)} />}

            {/* Main Content Area */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
