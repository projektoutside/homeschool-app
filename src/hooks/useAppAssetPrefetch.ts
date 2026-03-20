import { useEffect } from 'react';

type UseAppAssetPrefetchOptions = {
  loading: boolean;
  homePageAppUrl: string;
  homePageThreeModuleUrl: string;
};

const ensurePrefetchLink = (
  selector: string,
  configure: () => HTMLLinkElement,
) => {
  const existingLink = document.querySelector<HTMLLinkElement>(selector);
  if (existingLink) {
    return;
  }

  document.head.appendChild(configure());
};

export const useAppAssetPrefetch = ({
  loading,
  homePageAppUrl,
  homePageThreeModuleUrl,
}: UseAppAssetPrefetchOptions) => {
  useEffect(() => {
    if (loading) {
      return;
    }

    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const normalizedPath = window.location.pathname.replace(/\/$/, '') || '/';
    const authPath = basePath ? `${basePath}/auth` : '/auth';
    const installPath = basePath ? `${basePath}/install` : '/install';
    const shouldPrimeHomepageSession = normalizedPath !== authPath && normalizedPath !== installPath;

    if (!shouldPrimeHomepageSession) {
      return;
    }

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-preconnect"]', () => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = `${window.location.origin}/`;
      preconnectLink.setAttribute('data-prefetch', 'homeschool-home-app-preconnect');
      return preconnectLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-external-unpkg-preconnect"]', () => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://unpkg.com';
      preconnectLink.crossOrigin = 'anonymous';
      preconnectLink.setAttribute('data-prefetch', 'homeschool-home-app-external-unpkg-preconnect');
      return preconnectLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-external-fonts-preconnect"]', () => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://fonts.googleapis.com';
      preconnectLink.setAttribute('data-prefetch', 'homeschool-home-app-external-fonts-preconnect');
      return preconnectLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-external-fonts-static-preconnect"]', () => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://fonts.gstatic.com';
      preconnectLink.crossOrigin = 'anonymous';
      preconnectLink.setAttribute('data-prefetch', 'homeschool-home-app-external-fonts-static-preconnect');
      return preconnectLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-prefetch"]', () => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = homePageAppUrl;
      prefetchLink.setAttribute('data-prefetch', 'homeschool-home-app-prefetch');
      return prefetchLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-external-three-preload"]', () => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'script';
      preloadLink.href = homePageThreeModuleUrl;
      preloadLink.crossOrigin = 'anonymous';
      preloadLink.setAttribute('data-prefetch', 'homeschool-home-app-external-three-preload');
      return preloadLink;
    });
  }, [
    homePageAppUrl,
    homePageThreeModuleUrl,
    loading,
  ]);

  useEffect(() => {
    return () => {
      document
        .querySelectorAll<HTMLLinkElement>(
          'link[data-prefetch^="homeschool-home-app-"], link[data-prefetch^="homeschool-home-app-external-"]',
        )
        .forEach((link) => link.remove());
    };
  }, []);
};
