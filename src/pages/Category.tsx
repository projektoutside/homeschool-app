import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONTENT_ITEMS } from '../data/mockContent';
import { ContentGrid } from '../components/ContentGrid';
import { SearchBar } from '../components/SearchBar';
import '../styles/variables.css';

const CategoryPage: React.FC = () => {
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    // Determine category/type based on URL path
    const pageType = useMemo(() => {
        const path = location.pathname.substring(1); // remove leading slash
        // Map route to content type or category logic
        if (path === 'worksheets') return 'worksheet';
        if (path === 'games') return 'game';
        if (path === 'tools') return 'tool';
        if (path === 'files') return 'resource'; // 'Files' maps to 'resource' or generic generic
        return 'all';
    }, [location.pathname]);

    const pageTitle = pageType.charAt(0).toUpperCase() + pageType.slice(1) + 's';

    const filteredItems = useMemo(() => {
        const filtered = CONTENT_ITEMS.filter(item => {
            // 1. Filter by Page Type (if applicable)
            const typeMatch = pageType === 'all' || item.type === pageType || (pageType === 'resource' && item.type === 'worksheet'); // Quick fix: files can be worksheets for now

            // 2. Filter by Search Query
            const searchLower = searchQuery.toLowerCase();
            const searchMatch =
                item.title.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower) ||
                item.subjects.some(s => s.toLowerCase().includes(searchLower));

            return typeMatch && searchMatch;
        });
        
        return filtered;
    }, [pageType, searchQuery]);

    return (
        <div className="page-container category-page">
            <div className="page-header">
                <h1>{pageTitle}</h1>
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={`Search ${pageTitle}...`} />
            </div>

            <ContentGrid items={filteredItems} />
        </div>
    );
};

export default CategoryPage;
