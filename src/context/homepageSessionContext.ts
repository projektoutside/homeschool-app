import { createContext, useContext } from 'react';

type HomepageSessionContextValue = {
    isReady: boolean;
};

const HomepageSessionContext = createContext<HomepageSessionContextValue | null>(null);

export const HomepageSessionProvider = HomepageSessionContext.Provider;

export const useHomepageSession = (): HomepageSessionContextValue => {
    const context = useContext(HomepageSessionContext);
    if (!context) {
        throw new Error('useHomepageSession must be used within HomepageSessionProvider.');
    }
    return context;
};
