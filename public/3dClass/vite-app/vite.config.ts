import { promises as fs } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

type HotspotId = 'laptop' | 'redbackpack';

type HotspotLayout = {
  left: number;
  top: number;
  width: number;
};

type LayoutState = Record<HotspotId, HotspotLayout>;
type ClassroomEmbeddedState = {
  layout: Record<string, HotspotLayout>;
  locked: boolean;
  componentFiles: string[];
};

const STORAGE_FILE = new URL('./shared-layout.json', import.meta.url);
const CLASSROOM_INDEX_FILE = new URL('../index.html', import.meta.url);
const CLASSROOM_STATE_START_MARKER = '<!-- CLASSROOM_EMBEDDED_STATE_START -->';
const CLASSROOM_STATE_END_MARKER = '<!-- CLASSROOM_EMBEDDED_STATE_END -->';
const CLASSROOM_STATE_BLOCK_PATTERN = /<!-- CLASSROOM_EMBEDDED_STATE_START -->[\s\S]*?<!-- CLASSROOM_EMBEDDED_STATE_END -->/;

const DEFAULT_LAYOUT: LayoutState = {
  laptop: { left: 16, top: 59, width: 20 },
  redbackpack: { left: 72, top: 56, width: 12 },
};
const REDBACKPACK_LAYOUT_KEYS = ['redbackpack', 'component-redbackpack'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const sanitizeLayout = (raw: unknown): LayoutState => {
  const parsed =
    raw && typeof raw === 'object' ? (raw as Partial<Record<HotspotId, Partial<HotspotLayout>>>) : {};

  return {
    laptop: {
      left: clamp(Number(parsed?.laptop?.left ?? DEFAULT_LAYOUT.laptop.left), 0, 95),
      top: clamp(Number(parsed?.laptop?.top ?? DEFAULT_LAYOUT.laptop.top), 0, 95),
      width: clamp(Number(parsed?.laptop?.width ?? DEFAULT_LAYOUT.laptop.width), 6, 60),
    },
    redbackpack: {
      left: clamp(Number(parsed?.redbackpack?.left ?? DEFAULT_LAYOUT.redbackpack.left), 0, 95),
      top: clamp(Number(parsed?.redbackpack?.top ?? DEFAULT_LAYOUT.redbackpack.top), 0, 95),
      width: clamp(Number(parsed?.redbackpack?.width ?? DEFAULT_LAYOUT.redbackpack.width), 6, 60),
    },
  };
};

const sanitizeLooseLayout = (raw: unknown): Record<string, HotspotLayout> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const parsed = raw as Record<string, unknown>;
  const result: Record<string, HotspotLayout> = {};
  Object.entries(parsed).forEach(([key, value]) => {
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

    result[key] = {
      left: clamp(left, 0, 95),
      top: clamp(top, 0, 95),
      width: clamp(width, 6, 60),
    };
  });

  return result;
};

const sanitizeComponentFiles = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const isRedbackpackLayoutKey = (key: string): boolean => key.toLowerCase().includes('redbackpack');

const resolveRedbackpackLayout = (layout: Record<string, HotspotLayout>): HotspotLayout => {
  for (const key of REDBACKPACK_LAYOUT_KEYS) {
    if (layout[key]) {
      return layout[key];
    }
  }

  const fallbackKey = Object.keys(layout).find(isRedbackpackLayoutKey);
  if (fallbackKey && layout[fallbackKey]) {
    return layout[fallbackKey];
  }

  return DEFAULT_LAYOUT.redbackpack;
};

const parseClassroomEmbeddedStateFromHtml = (html: string): ClassroomEmbeddedState | null => {
  const blockMatch = html.match(CLASSROOM_STATE_BLOCK_PATTERN);
  if (!blockMatch) {
    return null;
  }

  const scriptMatch = blockMatch[0].match(
    /<script[^>]*id=["']classroomEmbeddedState["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!scriptMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(scriptMatch[1]);
    const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
    if (!record) {
      return null;
    }
    return {
      layout: sanitizeLooseLayout(record.layout),
      locked: typeof record.locked === 'boolean' ? record.locked : true,
      componentFiles: sanitizeComponentFiles(record.componentFiles),
    };
  } catch {
    return null;
  }
};

const readClassroomEmbeddedState = async (): Promise<ClassroomEmbeddedState | null> => {
  try {
    const html = await fs.readFile(CLASSROOM_INDEX_FILE, 'utf8');
    return parseClassroomEmbeddedStateFromHtml(html);
  } catch {
    return null;
  }
};

const writeClassroomEmbeddedState = async (state: ClassroomEmbeddedState): Promise<void> => {
  const currentHtml = await fs.readFile(CLASSROOM_INDEX_FILE, 'utf8');
  if (!CLASSROOM_STATE_BLOCK_PATTERN.test(currentHtml)) {
    throw new Error('Embedded classroom state block markers were not found in ../index.html.');
  }

  const replacementBlock = `${CLASSROOM_STATE_START_MARKER}
  <script id="classroomEmbeddedState" type="application/json">
${JSON.stringify(state, null, 2)}
  </script>
  ${CLASSROOM_STATE_END_MARKER}`;

  const nextHtml = currentHtml.replace(CLASSROOM_STATE_BLOCK_PATTERN, replacementBlock);
  await fs.writeFile(CLASSROOM_INDEX_FILE, nextHtml, 'utf8');
};

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const readStoredLayout = async (): Promise<LayoutState> => {
  const embedded = await readClassroomEmbeddedState();
  if (embedded && Object.keys(embedded.layout).length > 0) {
    return sanitizeLayout({
      laptop: embedded.layout.laptop ?? DEFAULT_LAYOUT.laptop,
      redbackpack: resolveRedbackpackLayout(embedded.layout),
    });
  }

  try {
    const raw = await fs.readFile(STORAGE_FILE, 'utf8');
    return sanitizeLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_LAYOUT;
  }
};

const writeStoredLayout = async (layout: LayoutState) => {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(layout, null, 2), 'utf8');
};

const writeLayoutIntoClassroomIndex = async (layout: LayoutState) => {
  const existing = await readClassroomEmbeddedState();
  const nextLayout: Record<string, HotspotLayout> = {
    ...(existing?.layout ?? {}),
    laptop: layout.laptop,
    redbackpack: layout.redbackpack,
  };

  const redbackpackKeys = new Set<string>(REDBACKPACK_LAYOUT_KEYS);
  Object.keys(nextLayout).forEach((key) => {
    if (isRedbackpackLayoutKey(key)) {
      redbackpackKeys.add(key);
    }
  });

  redbackpackKeys.forEach((key) => {
    nextLayout[key] = layout.redbackpack;
  });

  const nextState: ClassroomEmbeddedState = {
    layout: nextLayout,
    locked: existing?.locked ?? true,
    componentFiles: existing?.componentFiles ?? [],
  };
  await writeClassroomEmbeddedState(nextState);
};

const isLayoutPath = (url: string | undefined) => {
  if (!url) {
    return false;
  }
  return url.split('?')[0] === '/api/layout';
};

const handleLayoutRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void
) => {
  if (!isLayoutPath(req.url)) {
    next();
    return;
  }

  try {
    if (req.method === 'GET') {
      const stored = await readStoredLayout();
      sendJson(res, 200, stored);
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' });
        return;
      }
      const nextLayout = sanitizeLayout(parsed);
      await writeStoredLayout(nextLayout);
      await writeLayoutIntoClassroomIndex(nextLayout);
      sendJson(res, 200, nextLayout);
      return;
    }

    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.end('Method Not Allowed');
  } catch (error) {
    next(error);
  }
};

const sharedLayoutPlugin = (): Plugin => ({
  name: 'shared-layout-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      void handleLayoutRequest(req, res, next);
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      void handleLayoutRequest(req, res, next);
    });
  },
});

export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  plugins: [sharedLayoutPlugin()],
});
