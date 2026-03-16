import { useEffect } from 'react';

type RouteLoader = () => Promise<unknown>;

type UseAppAssetPrefetchOptions = {
  loading: boolean;
  homePageAppUrl: string;
  classroomAppUrl: string;
  classroomDoorIntroUrl: string;
  classroomDoorAudioUrl: string;
  homePageThreeModuleUrl: string;
  loadHomeRoute: RouteLoader;
  loadClassroomRoute: RouteLoader;
  loadHTMLViewerRoute: RouteLoader;
  loadGamePlayerRoute: RouteLoader;
  loadViewerRoute: RouteLoader;
  loadCharacterCreatorRoute: RouteLoader;
  loadManagerRoute: RouteLoader;
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
  classroomAppUrl,
  classroomDoorIntroUrl,
  classroomDoorAudioUrl,
  homePageThreeModuleUrl,
  loadHomeRoute,
  loadClassroomRoute,
  loadHTMLViewerRoute,
  loadGamePlayerRoute,
  loadViewerRoute,
  loadCharacterCreatorRoute,
  loadManagerRoute,
}: UseAppAssetPrefetchOptions) => {
  useEffect(() => {
    if (loading) {
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

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-preload"]', () => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'document';
      preloadLink.href = homePageAppUrl;
      preloadLink.setAttribute('data-prefetch', 'homeschool-home-app-preload');
      preloadLink.setAttribute('fetchpriority', 'high');
      return preloadLink;
    });

    ensurePrefetchLink('link[data-prefetch="homeschool-home-app-prefetch"]', () => {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.as = 'document';
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

    ensurePrefetchLink('link[data-prefetch="homeschool-classroom-app-preload"]', () => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'document';
      preloadLink.href = classroomAppUrl;
      preloadLink.setAttribute('data-prefetch', 'homeschool-classroom-app-preload');
      preloadLink.setAttribute('fetchpriority', 'high');
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

    scheduleRouteWarmup(80, loadHomeRoute);
    scheduleRouteWarmup(140, loadClassroomRoute);
    scheduleRouteWarmup(220, loadHTMLViewerRoute);
    scheduleRouteWarmup(300, loadGamePlayerRoute);
    scheduleRouteWarmup(380, loadViewerRoute);
    scheduleRouteWarmup(460, loadCharacterCreatorRoute);
    scheduleRouteWarmup(520, loadManagerRoute);

    return () => {
      routeWarmupHandles.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    classroomAppUrl,
    classroomDoorAudioUrl,
    classroomDoorIntroUrl,
    homePageAppUrl,
    homePageThreeModuleUrl,
    loadCharacterCreatorRoute,
    loadClassroomRoute,
    loadGamePlayerRoute,
    loadHTMLViewerRoute,
    loadHomeRoute,
    loadManagerRoute,
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
