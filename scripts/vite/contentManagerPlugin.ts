import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import type { Connect, Plugin, ViteDevServer } from 'vite';

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

type ContentSavePayload = {
  category: string;
  item: unknown;
};

type BulkUploadFile = {
  name: string;
  content: string;
};

type BulkUploadPayload = {
  category: string;
  files: BulkUploadFile[];
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

const injectClassroomStateIntoIndex = (
  indexHtml: string,
  state: ClassroomEmbeddedState,
): string => {
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

const isBulkUploadFile = (value: unknown): value is BulkUploadFile => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.content === 'string';
};

const readJsonBody = (req: Connect.IncomingMessage, onComplete: (body: string) => void) => {
  let body = '';
  req.on('data', (chunk: Buffer | string) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    onComplete(body);
  });
};

export const createContentManagerPlugin = (rootDir: string): Plugin => {
  const classroomIndexFile = path.resolve(rootDir, 'public/3dClass/index.html');
  const contentDirectory = path.resolve(rootDir, 'src/data/content');
  const worksheetsDirectory = path.resolve(rootDir, 'public/Worksheets');

  return {
    name: 'content-manager',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/classroom-3d/save-index-state', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        readJsonBody(req, (body) => {
          try {
            if (!fs.existsSync(classroomIndexFile)) {
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

            const currentHtml = fs.readFileSync(classroomIndexFile, 'utf-8');
            const updatedHtml = injectClassroomStateIntoIndex(currentHtml, nextState);
            fs.writeFileSync(classroomIndexFile, updatedHtml, 'utf-8');

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

      server.middlewares.use('/api/save-content', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        readJsonBody(req, (body) => {
          try {
            const parsedBody = body ? JSON.parse(body) as Partial<ContentSavePayload> : {};
            const category = typeof parsedBody.category === 'string' ? parsedBody.category : '';
            const item = parsedBody.item ?? {};
            if (!category) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Category is required' }));
              return;
            }

            const targetFile = path.resolve(contentDirectory, `${category}.ts`);
            if (!fs.existsSync(targetFile)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Category file not found' }));
              return;
            }

            const content = fs.readFileSync(targetFile, 'utf-8');
            const closingBracketIndex = content.lastIndexOf('];');
            if (closingBracketIndex === -1) {
              throw new Error('Could not find array closing bracket');
            }

            const newItemString = `  ${JSON.stringify(item, null, 4)},\n`;
            const newContent = content.slice(0, closingBracketIndex) + newItemString + content.slice(closingBracketIndex);
            fs.writeFileSync(targetFile, newContent);

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save content' }));
          }
        });
      });

      server.middlewares.use('/api/upload-bulk', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        readJsonBody(req, (body) => {
          try {
            const parsedBody = body ? JSON.parse(body) as Partial<BulkUploadPayload> : {};
            const category = typeof parsedBody.category === 'string' ? parsedBody.category : '';
            const files = Array.isArray(parsedBody.files)
              ? parsedBody.files.filter(isBulkUploadFile)
              : [];

            if (!category) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Category is required' }));
              return;
            }

            if (files.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'No valid files to upload' }));
              return;
            }

            const targetDataFile = path.resolve(contentDirectory, `${category}.ts`);
            if (!fs.existsSync(targetDataFile)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Category not found' }));
              return;
            }

            const newItems: Array<Record<string, unknown>> = [];
            if (!fs.existsSync(worksheetsDirectory)) {
              fs.mkdirSync(worksheetsDirectory, { recursive: true });
            }

            files.forEach((file) => {
              const safeName = file.name
                .replace(/\.[^/.]+$/, '')
                .replace(/[^a-z0-9]/gi, '-')
                .toLowerCase();
              const folderPath = path.join(worksheetsDirectory, safeName);
              if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
              }

              fs.writeFileSync(path.join(folderPath, 'index.html'), file.content);

              newItems.push({
                id: `${category}-${safeName}-${Date.now()}`,
                title: file.name.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
                description: 'Start auto-uploaded worksheet.',
                type: 'worksheet',
                category,
                subjects: ['General'],
                gradeLevels: ['All'],
                customHtmlPath: `/Worksheets/${safeName}/index.html`,
                dateAdded: new Date().toISOString().split('T')[0],
              });
            });

            const tsContent = fs.readFileSync(targetDataFile, 'utf-8');
            const closingIndex = tsContent.lastIndexOf('];');
            if (closingIndex === -1) {
              throw new Error('Data file format error');
            }

            const fileBeforeArray = tsContent.slice(0, closingIndex).trim();
            const needsComma = fileBeforeArray.endsWith('}');
            const prefix = needsComma ? ',' : '';
            const injection = prefix + '\n' + newItems.map((item) => `  ${JSON.stringify(item, null, 4)}`).join(',\n') + ',';
            const finalContent = tsContent.slice(0, closingIndex) + injection + '\n' + tsContent.slice(closingIndex);
            fs.writeFileSync(targetDataFile, finalContent);

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: newItems.length }));
          } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Bulk upload failed' }));
          }
        });
      });
    },
  };
};
