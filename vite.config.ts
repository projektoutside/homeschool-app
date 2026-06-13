import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa' // Temporarily disabled - see note below
import { createContentManagerPlugin } from './scripts/vite/contentManagerPlugin';

// Use absolute path for GitHub Pages to support client-side routing with deep links
// Respect BASE_PATH env var if set (by GitHub Actions workflow)
const base = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/homeschool-app/' : '/');
const devAllowedHosts = ['localhost', '127.0.0.1', '.ngrok-free.app', '.ngrok.app'];
const githubRepoUrl = 'https://github.com/projektoutside/homeschool-app';

const readGitValue = (command: string): string | null => {
  try {
    return execSync(command, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
};

const getBuildId = (): string => {
  return process.env.GITHUB_SHA
    || process.env.APP_BUILD_ID
    || readGitValue('git rev-parse HEAD')
    || `local-${Date.now()}`;
};

const getCommitMessage = (): string => {
  return process.env.APP_COMMIT_MESSAGE
    || readGitValue('git log -1 --pretty=%s')
    || 'Local build';
};

const replaceBuildToken = (source: string, token: string, value: string): string => {
  return source.replaceAll(token, JSON.stringify(value));
};

const createLiveUpdateMetadataPlugin = (): Plugin => ({
  name: 'homeschool-live-update-metadata',
  apply: 'build',
  generateBundle() {
    const buildId = getBuildId();
    const builtAt = process.env.APP_BUILD_TIME || new Date().toISOString();
    const commitMessage = getCommitMessage();
    const repoUrl = `${githubRepoUrl}/commit/${buildId}`;
    const serviceWorkerSourcePath = resolve(__dirname, 'src/service-worker.js');
    const serviceWorkerSource = readFileSync(serviceWorkerSourcePath, 'utf8');
    const stampedServiceWorker = replaceBuildToken(
      replaceBuildToken(
        replaceBuildToken(
          replaceBuildToken(serviceWorkerSource, '__APP_BUILD_ID__', buildId),
          '__APP_BUILT_AT__',
          builtAt,
        ),
        '__APP_COMMIT_MESSAGE__',
        commitMessage,
      ),
      '__APP_REPO_URL__',
      repoUrl,
    );
    const versionMetadata = {
      buildId,
      builtAt,
      commitMessage,
      repoUrl,
    };

    this.emitFile({
      type: 'asset',
      fileName: 'service-worker.js',
      source: stampedServiceWorker,
    });
    this.emitFile({
      type: 'asset',
      fileName: 'app-version.json',
      source: `${JSON.stringify(versionMetadata, null, 2)}\n`,
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  base,
  server: {
    allowedHosts: devAllowedHosts,
  },
  plugins: [
    react(),
    createContentManagerPlugin(__dirname),
    createLiveUpdateMetadataPlugin(),
    // Temporarily disabled VitePWA plugin due to path issues with spaces/apostrophes in directory name
    // The "La's Homeschool" directory causes workbox to fail when generating service worker imports
    // TODO: Re-enable after moving to a path without special characters, or after workbox fixes path handling
    // VitePWA({
    //   registerType: 'prompt',
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
    //   manifest: {
    //     name: 'Homeschool Educational Hub',
    //     short_name: 'HomeschoolHub',
    //     description: 'A central repository for homeschool educational materials, games, and tools.',
    //     theme_color: '#ffffff',
    //     start_url: base,
    //     scope: base,
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
    //     navigateFallback: base === '/' ? '/index.html' : `${base}index.html`,
    //     inlineWorkboxRuntime: true,
    //     sourcemap: false,
    //   }
    // })
  ],
})
