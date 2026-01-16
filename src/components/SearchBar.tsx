import React, { useCallback, useState, useEffect, useRef } from 'react';
import './SearchBar.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
}

const SearchBarComponent: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = "Search resources...",
    debounceMs = 300
}) => {
    // Local state for immediate input responsiveness
    const [localValue, setLocalValue] = useState(value);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external value changes to local state
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue); // Immediate local update for responsive feel

        // Debounce the external onChange callback
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            onChange(newValue);
        }, debounceMs);
    }, [onChange, debounceMs]);

    const handleClear = useCallback(() => {
        setLocalValue('');
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        onChange('');
    }, [onChange]);

    return (
        <div className="search-container">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
                type="text"
                className="search-input"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {localValue && (
                <button
                    className="search-clear-btn"
                    onClick={handleClear}
                    aria-label="Clear search"
                    type="button"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

SearchBarComponent.displayName = 'SearchBar';

export const SearchBar = React.memo(SearchBarComponent);
