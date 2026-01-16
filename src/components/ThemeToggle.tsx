import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            <div className={`theme-toggle-icon ${theme}`}>
                {theme === 'light' ? (
                    <span role="img" aria-label="sun">☀️</span>
                ) : (
                    <span role="img" aria-label="moon">🌙</span>
                )}
            </div>
        </button>
    );
};
