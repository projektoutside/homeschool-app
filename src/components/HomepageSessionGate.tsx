import React from 'react';
import { useHomepageSession } from '../context/homepageSessionContext';

export const HomepageSessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isReady } = useHomepageSession();
    return isReady ? <>{children}</> : null;
};
