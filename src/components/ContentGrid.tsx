import React from 'react';
import type { ContentItem } from '../types/content';
import { ContentCard } from './ContentCard';
import './ContentGrid.css';

interface ContentGridProps {
    items: ContentItem[];
    emptyMessage?: string;
}

export const ContentGrid: React.FC<ContentGridProps> = ({
    items,
    emptyMessage = "No content found matching your criteria."
}) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 12;

    // Reset to page 1 when items change (e.g. search filter)
    React.useEffect(() => {
        setCurrentPage(1);
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="empty-state">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="content-grid-container">
            <div className="content-grid">
                {currentItems.map(item => (
                    <ContentCard key={item.id} item={item} />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                    >
                        Previous
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};
