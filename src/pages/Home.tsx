import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CONTENT_ITEMS, CATEGORIES } from '../data/mockContent';
import { ContentGrid } from '../components/ContentGrid';
import './Home.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const featuredItems = CONTENT_ITEMS.filter(item => item.isFeatured);

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <h1>Welcome to Homeschool Hub</h1>
                <p>A central place for all your educational resources, games, and tools.</p>
                <div className="hero-stats">
                    <div className="stat">
                        <span className="stat-value">{CONTENT_ITEMS.length}</span>
                        <span className="stat-label">Resources</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{CATEGORIES.length}</span>
                        <span className="stat-label">Subjects</span>
                    </div>
                </div>
            </section>

            {/* Categories Quick Links */}
            <section className="categories-section">
                <h2>Browse by Subject</h2>
                <div className="categories-grid">
                    {CATEGORIES.map(cat => (
                        <div 
                            key={cat.id} 
                            className="category-card" 
                            onClick={() => navigate('/worksheets')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate('/worksheets');
                                }
                            }}
                            aria-label={`Browse ${cat.label} resources`}
                        >
                            <h3>{cat.label}</h3>
                            <p>{cat.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Content */}
            <section className="featured-section">
                <h2>Featured Resources</h2>
                <ContentGrid items={featuredItems} />
            </section>
        </div>
    );
};

export default HomePage;
