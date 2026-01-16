import React from 'react';
import './Home.css';

const HomePage: React.FC = () => {
    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <h1>Welcome to La's Homeschool Projects</h1>
                <p className="hero-description">
                    Enjoy worksheets, games, and tools that I have created throughout the time when we were homeschooling our kids.
                    Feel free to look around and use anything that might help benefit your homeschooling experience.
                </p>
            </section>
        </div>
    );
};

export default HomePage;
