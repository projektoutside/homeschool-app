import { useEffect } from 'react';

type RouteLoader = () => Promise<unknown>;

type UseAppAssetPrefetchOptions = {
  loading: boolean;
  homePageAppUrl: string;
  classroomAppUrl: string;
  classroomDoorIntroUrl: string;
  classroomDoorAudioUrl: string;
  homePageThreeModuleUrl: string;
  loadClassroomRoute: RouteLoader;
  loadHTMLViewerRoute: RouteLoader;
  loadViewerRoute: RouteLoader;
};

const ensurePrefetchLink = (
  selector: string,
  configure: () => HTMLLinkElement,
) => {
  const nextLink = configure();
  const existingLink = document.querySelector<HTMLLinkElement>(selector);
  if (existingLink) {
    const shouldReplace =
      existingLink.rel !== nextLink.rel
      || existingLink.href !== nextLink.href
      || existingLink.as !== nextLink.as
      || existingLink.type !== nextLink.type
      || existingLink.crossOrigin !== nextLink.crossOrigin;

    if (shouldReplace) {
      existingLink.replaceWith(nextLink);
    }
    return;
  }

  document.head.appendChild(nextLink);
};

export const useAppAssetPrefetch = ({
  loading,
  homePageAppUrl,
  classroomAppUrl,
  classroomDoorIntroUrl,
  classroomDoorAudioUrl,
  homePageThreeModuleUrl,
  loadClassroomRoute,
  loadHTMLViewerRoute,
  loadViewerRoute,
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

    const routeWarmupHandles: number[] = [];
    const scheduleRouteWarmup = (delayMs: number, loader: RouteLoader) => {
      const timerId = window.setTimeout(() => {
        void loader();
      }, delayMs);
      routeWarmupHandles.push(timerId);
    };

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

    ensurePrefetchLink('link[data-prefetch="homeschool-classroom-app-prefetch"]', () => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.as = 'document';
      prefetchLink.href = classroomAppUrl;
      prefetchLink.setAttribute('data-prefetch', 'homeschool-classroom-app-prefetch');
      return prefetchLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-classroom-door-prefetch"]', () => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.as = 'document';
      prefetchLink.href = classroomDoorIntroUrl;
      prefetchLink.setAttribute('data-prefetch', 'homeschool-classroom-door-prefetch');
      return prefetchLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-classroom-door-audio-prefetch"]', () => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.as = 'audio';
      prefetchLink.href = classroomDoorAudioUrl;
      prefetchLink.type = 'audio/mpeg';
      prefetchLink.setAttribute('data-prefetch', 'homeschool-classroom-door-audio-prefetch');
      return prefetchLink;
    });

    scheduleRouteWarmup(140, loadClassroomRoute);
    scheduleRouteWarmup(220, loadHTMLViewerRoute);
    scheduleRouteWarmup(300, loadViewerRoute);

    return () => {
      routeWarmupHandles.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    classroomAppUrl,
    classroomDoorAudioUrl,
    classroomDoorIntroUrl,
    homePageAppUrl,
    homePageThreeModuleUrl,
    loadClassroomRoute,
    loadHTMLViewerRoute,
    loadViewerRoute,
    loading,
  ]);

  useEffect(() => {
    return () => {
      document
        .querySelectorAll<HTMLLinkElement>(
          'link[data-prefetch^="homeschool-home-app-"], link[data-prefetch^="homeschool-classroom-app-"], link[data-prefetch^="homeschool-classroom-door-"], link[data-prefetch^="homeschool-home-app-external-"]',
        )
        .forEach((link) => link.remove());
    };
  }, []);
};
