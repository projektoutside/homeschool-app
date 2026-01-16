import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ContentItem } from '../types/content';
import { ContentCard } from './ContentCard';
import './ContentGrid.css';

interface ContentGridProps {
    items: ContentItem[];
    emptyMessage?: string;
}

const ITEMS_PER_PAGE = 12;

export const ContentGrid: React.FC<ContentGridProps> = React.memo(({
    items,
    emptyMessage = "No content found matching your criteria."
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when items change (e.g. search filter)
    useEffect(() => {
        setCurrentPage(1);
    }, [items]);

    const totalPages = useMemo(() => Math.ceil(items.length / ITEMS_PER_PAGE), [items.length]);
    const currentItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [items, currentPage]);

    const handlePageChange = useCallback((newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handlePrevious = useCallback(() => {
        if (currentPage > 1) {
            handlePageChange(currentPage - 1);
        }
    }, [currentPage, handlePageChange]);

    const handleNext = useCallback(() => {
        if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
        }
    }, [currentPage, totalPages, handlePageChange]);

    if (items.length === 0) {
        return (
            <div className="empty-state" role="status" aria-live="polite">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="content-grid-container">
            <div className="content-grid" role="list">
                {currentItems.map(item => (
                    <ContentCard key={item.id} item={item} />
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="pagination-controls" aria-label="Pagination">
                    <button
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={handlePrevious}
                        aria-label={`Go to previous page, page ${currentPage - 1}`}
                    >
                        Previous
                    </button>
                    <span className="pagination-info" aria-current="page">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={handleNext}
                        aria-label={`Go to next page, page ${currentPage + 1}`}
                    >
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
});
