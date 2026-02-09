import React from 'react';
import { InstallCard } from '../components/InstallButton';
import '../components/InstallButton.css';

/**
 * Install Page
 * A dedicated page for customers to install the app
 * Accessible at /install route
 */
const InstallPage: React.FC = () => {
  return (
    <div className="install-page">
      <InstallCard />
      
      <footer style={{ 
        marginTop: '2rem', 
        textAlign: 'center', 
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}>
        <p>Compatible with Chrome, Edge, Safari, and Firefox</p>
        <p style={{ marginTop: '0.5rem' }}>
          Works on Windows, macOS, iOS, and Android
        </p>
      </footer>
    </div>
  );
};

export default InstallPage;