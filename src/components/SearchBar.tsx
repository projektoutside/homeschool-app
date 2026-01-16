import React, { useCallback } from 'react';
import './SearchBar.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(({
    value,
    onChange,
    placeholder = "Search resources..."
}) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <div className="search-container">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
                type="text"
                className="search-input"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
            />
        </div>
    );
});
