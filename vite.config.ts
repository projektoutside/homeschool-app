import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa' // Temporarily disabled - see note below
import fs from 'fs';
import path from 'path';

// Custom middleware to save content to files
const contentManagerPlugin = () => {
  return {
    name: 'content-manager',
    configureServer(server: any) {
      server.middlewares.use('/api/save-content', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { category, item } = JSON.parse(body);
              const targetFile = path.resolve(__dirname, `src/data/content/${category}.ts`);

              if (fs.existsSync(targetFile)) {
                let content = fs.readFileSync(targetFile, 'utf-8');
                // Find the end of the array to inject the new item
                // Looking for the last closing bracket inside the array definition
                const closingBracketIndex = content.lastIndexOf('];');
                if (closingBracketIndex !== -1) {
                  const newItemString = `  ${JSON.stringify(item, null, 4)},\n`;
                  // Insert before the closing bracket
                  const newContent = content.slice(0, closingBracketIndex) + newItemString + content.slice(closingBracketIndex);
                  fs.writeFileSync(targetFile, newContent);
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } else {
                  throw new Error('Could not find array closing bracket');
                }
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Category file not found' }));
              }
            } catch (error) {
              console.error(error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save content' }));
            }
          });
        } else {
          next();
        }
      });

      // New Endpoint: Bulk Upload
      server.middlewares.use('/api/upload-bulk', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            // Basic body accumulation (Note: strictly for text/small payloads in this dev tool context)
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              // Parse JSON body containing file data and category
              const { category, files } = JSON.parse(body); // files: [{ name: 'sheet.html', content: '<html>...' }]
              const targetDataFile = path.resolve(__dirname, `src/data/content/${category}.ts`);

              if (!fs.existsSync(targetDataFile)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Category not found' }));
                return;
              }

              const newItems: any[] = [];
              const publicBase = path.resolve(__dirname, 'public/Worksheets');
              if (!fs.existsSync(publicBase)) fs.mkdirSync(publicBase, { recursive: true });

              // Process each file
              files.forEach((file: any) => {
                const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '-').toLowerCase();
                const folderPath = path.join(publicBase, safeName);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

                // Write HTML file
                fs.writeFileSync(path.join(folderPath, 'index.html'), file.content);

                // Create Item Entry
                newItems.push({
                  id: `${category}-${safeName}-${Date.now()}`,
                  title: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, ' '), // Simple titleification
                  description: 'Start auto-uploaded worksheet.',
                  type: 'worksheet',
                  category: category,
                  subjects: ['General'],
                  gradeLevels: ['All'],
                  customHtmlPath: `/Worksheets/${safeName}/index.html`,
                  dateAdded: new Date().toISOString().split('T')[0]
                });
              });

              // Write to TS file
              let tsContent = fs.readFileSync(targetDataFile, 'utf-8');
              const idx = tsContent.lastIndexOf('];');
              if (idx !== -1) {
                // Check if we need a preceeding comma
                const fileBeforeArr = tsContent.slice(0, idx).trim();
                const needsComma = fileBeforeArr.endsWith('}');

                const prefix = needsComma ? ',' : '';
                const injection = prefix + '\n' + newItems.map(item => `  ${JSON.stringify(item, null, 4)}`).join(',\n') + ','; // trailing comma for future safety

                const finalContent = tsContent.slice(0, idx) + injection + '\n' + tsContent.slice(idx);
                fs.writeFileSync(targetDataFile, finalContent);

                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, count: newItems.length }));
              } else {
                throw new Error('Data file format error');
              }
            } catch (err) {
              console.error(err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Bulk upload failed' }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

// Determine base path based on environment
// For GitHub Pages: use repository name from environment variable
// For local dev: /
// To set custom base path, use: BASE_PATH=/your-repo-name/ npm run build
// Note: BASE_PATH should end with a slash for GitHub Pages subdirectory deployments
const getBasePath = () => {
  if (process.env.NODE_ENV !== 'production') {
    return '/';
  }
  // Use BASE_PATH env var if set (from GitHub Actions workflow)
  // Default to '/' if not set (for user/organization pages)
  const basePath = process.env.BASE_PATH || process.env.VITE_BASE || '/';
  // Ensure it ends with / if not root
  return basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : `${basePath}/`;
};

const base = getBasePath();

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    contentManagerPlugin(),
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
