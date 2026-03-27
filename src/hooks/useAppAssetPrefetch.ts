import { useEffect } from 'react';

type RouteLoader = () => Promise<unknown>;

type UseAppAssetPrefetchOptions = {
  loading: boolean;
  routePath: string;
  homePageAppUrl: string;
  classroomAppUrl: string;
  classroomDoorIntroUrl: string;
  classroomDoorAudioUrl: string;
  loadHomeRoute: RouteLoader;
  loadClassroomRoute: RouteLoader;
  loadHTMLViewerRoute: RouteLoader;
  loadViewerRoute: RouteLoader;
};

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

type DeferredHandle = {
  cancel: () => void;
};

const HOME_ROUTE_PATHS = new Set(['/', '/apps']);

const normalizeRoutePath = (value: string): string => {
  if (!value) {
    return '/';
  }

  if (value === '/') {
    return value;
  }

  return value.replace(/\/+$/, '') || '/';
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

const scheduleDeferredTask = (task: () => void, timeoutMs: number): DeferredHandle => {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => {
      task();
    }, { timeout: timeoutMs });

    return {
      cancel: () => {
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(handle);
        }
      },
    };
  }

  const timeoutId = window.setTimeout(task, Math.min(timeoutMs, 250));
  return {
    cancel: () => window.clearTimeout(timeoutId),
  };
};

export const useAppAssetPrefetch = ({
  loading,
  routePath,
  homePageAppUrl,
  classroomAppUrl,
  classroomDoorIntroUrl,
  classroomDoorAudioUrl,
  loadHomeRoute,
  loadClassroomRoute,
  loadHTMLViewerRoute,
  loadViewerRoute,
}: UseAppAssetPrefetchOptions) => {
  useEffect(() => {
    if (loading || typeof window === 'undefined') {
      return;
    }

    const normalizedRoutePath = normalizeRoutePath(routePath);
    const shouldWarmHomeAdjacentRoutes = HOME_ROUTE_PATHS.has(normalizedRoutePath);
    const shouldWarmClassroomAdjacentRoutes = normalizedRoutePath === '/classroom';
    const deferredTasks: DeferredHandle[] = [];

    const queueTask = (task: () => void, timeoutMs = 1500) => {
      deferredTasks.push(scheduleDeferredTask(task, timeoutMs));
    };

    if (shouldWarmHomeAdjacentRoutes) {
      queueTask(() => {
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
      });

      queueTask(() => {
        void loadHomeRoute();
        void loadClassroomRoute();
        void loadHTMLViewerRoute();
        void loadViewerRoute();
      }, 2500);
    } else if (shouldWarmClassroomAdjacentRoutes) {
      queueTask(() => {
        void loadHTMLViewerRoute();
        void loadViewerRoute();
      }, 2000);
    } else if (normalizedRoutePath === '/html-viewer') {
      queueTask(() => {
        void loadViewerRoute();
      }, 2000);
    } else if (normalizedRoutePath.startsWith('/play/') || normalizedRoutePath.startsWith('/open/')) {
      queueTask(() => {
        ensurePrefetchLink('link[data-prefetch="homeschool-home-app-prefetch"]', () => {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.as = 'document';
          prefetchLink.href = homePageAppUrl;
          prefetchLink.setAttribute('data-prefetch', 'homeschool-home-app-prefetch');
          return prefetchLink;
        });
      }, 2500);
    }

    return () => {
      deferredTasks.forEach((task) => task.cancel());
    };
  }, [
    classroomAppUrl,
    classroomDoorAudioUrl,
    classroomDoorIntroUrl,
    homePageAppUrl,
    loadClassroomRoute,
    loadHomeRoute,
    loadHTMLViewerRoute,
    loadViewerRoute,
    loading,
    routePath,
  ]);

  useEffect(() => {
    return () => {
      document
        .querySelectorAll<HTMLLinkElement>(
          'link[data-prefetch^="homeschool-home-app-"], link[data-prefetch^="homeschool-classroom-app-"], link[data-prefetch^="homeschool-classroom-door-"]',
        )
        .forEach((link) => link.remove());
    };
  }, []);
};
