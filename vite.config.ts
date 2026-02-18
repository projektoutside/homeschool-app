import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa' // Temporarily disabled - see note below
import fs from 'fs';
import path from 'path';

const CLASSROOM_INDEX_FILE = path.resolve(__dirname, 'public/3dClass/index.html');
const CLASSROOM_EMBEDDED_STATE_START = '<!-- CLASSROOM_EMBEDDED_STATE_START -->';
const CLASSROOM_EMBEDDED_STATE_END = '<!-- CLASSROOM_EMBEDDED_STATE_END -->';

type ClassroomLayoutEntry = {
  left: number;
  top: number;
  width: number;
};

type ClassroomEmbeddedState = {
  layout: Record<string, ClassroomLayoutEntry>;
  locked: boolean;
  componentFiles: string[];
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const sanitizeClassroomEmbeddedState = (rawState: unknown): ClassroomEmbeddedState | null => {
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    return null;
  }

  const record = rawState as Record<string, unknown>;
  const rawLayout = record.layout;
  if (!rawLayout || typeof rawLayout !== 'object' || Array.isArray(rawLayout)) {
    return null;
  }

  const layout: Record<string, ClassroomLayoutEntry> = {};
  Object.entries(rawLayout as Record<string, unknown>).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }
    const entry = value as Record<string, unknown>;
    const left = Number(entry.left);
    const top = Number(entry.top);
    const width = Number(entry.width);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width)) {
      return;
    }
    layout[key] = {
      left: clamp(left, 0, 95),
      top: clamp(top, 0, 95),
      width: clamp(width, 6, 60),
    };
  });

  const componentFiles = Array.isArray(record.componentFiles)
    ? record.componentFiles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    : [];

  return {
    layout,
    locked: typeof record.locked === 'boolean' ? record.locked : true,
    componentFiles,
  };
};

const injectClassroomStateIntoIndex = (indexHtml: string, state: ClassroomEmbeddedState): string => {
  const replacementBlock = `${CLASSROOM_EMBEDDED_STATE_START}
  <script id="classroomEmbeddedState" type="application/json">
${JSON.stringify(state, null, 2)}
  </script>
  ${CLASSROOM_EMBEDDED_STATE_END}`;

  const markerPattern = /<!-- CLASSROOM_EMBEDDED_STATE_START -->[\s\S]*?<!-- CLASSROOM_EMBEDDED_STATE_END -->/;
  if (!markerPattern.test(indexHtml)) {
    throw new Error('Embedded classroom state block markers were not found in public/3dClass/index.html.');
  }
  return indexHtml.replace(markerPattern, replacementBlock);
};

// Custom middleware to save content to files
const contentManagerPlugin = () => {
  return {
    name: 'content-manager',
    configureServer(server: any) {
      server.middlewares.use('/api/classroom-3d/save-index-state', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            if (!fs.existsSync(CLASSROOM_INDEX_FILE)) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Classroom index file was not found.' }));
              return;
            }

            const payload = body ? JSON.parse(body) : {};
            const nextState = sanitizeClassroomEmbeddedState(payload?.state);
            if (!nextState) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid classroom state payload.' }));
              return;
            }

            const currentHtml = fs.readFileSync(CLASSROOM_INDEX_FILE, 'utf-8');
            const updatedHtml = injectClassroomStateIntoIndex(currentHtml, nextState);
            fs.writeFileSync(CLASSROOM_INDEX_FILE, updatedHtml, 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, state: nextState }));
          } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to persist classroom state to index.html.' }));
          }
        });
      });

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

// Use absolute path for GitHub Pages to support client-side routing with deep links
// Respect BASE_PATH env var if set (by GitHub Actions workflow)
const base = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/homeschool-app/' : '/');

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
