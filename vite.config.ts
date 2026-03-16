import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa' // Temporarily disabled - see note below
import { createContentManagerPlugin } from './scripts/vite/contentManagerPlugin';

// Use absolute path for GitHub Pages to support client-side routing with deep links
// Respect BASE_PATH env var if set (by GitHub Actions workflow)
const base = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/homeschool-app/' : '/');
const devAllowedHosts = ['localhost', '127.0.0.1', '.ngrok-free.app', '.ngrok.app'];

// https://vite.dev/config/
export default defineConfig({
  base,
  server: {
    allowedHosts: devAllowedHosts,
  },
  plugins: [
    react(),
    createContentManagerPlugin(__dirname),
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
