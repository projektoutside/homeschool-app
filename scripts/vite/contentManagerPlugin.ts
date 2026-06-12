import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import type { Connect, Plugin, ViteDevServer } from 'vite';

const CLASSROOM_EMBEDDED_STATE_START = '<!-- CLASSROOM_EMBEDDED_STATE_START -->';
const CLASSROOM_EMBEDDED_STATE_END = '<!-- CLASSROOM_EMBEDDED_STATE_END -->';
const MAX_JSON_BODY_BYTES = 256 * 1024;

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

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1';
};

const getRequestHost = (req: Connect.IncomingMessage): string => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  return (host || req.headers.host || '').trim().toLowerCase();
};

const getRequestProtocol = (req: Connect.IncomingMessage): string => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return (protocol || 'http').split(',')[0].trim().toLowerCase();
};

const isTrustedDevWriteRequest = (req: Connect.IncomingMessage): boolean => {
  const host = getRequestHost(req);
  if (!host) {
    return false;
  }

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const expectedProtocol = getRequestProtocol(req);
      return originUrl.protocol.replace(':', '') === expectedProtocol && originUrl.host.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  const fetchSite = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'].toLowerCase() : '';
  if (fetchSite === 'cross-site') {
    return false;
  }

  try {
    return isLoopbackHostname(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
};

const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const readJsonBody = (
  req: Connect.IncomingMessage,
  res: ServerResponse,
  onComplete: (body: string) => void,
) => {
  const contentType = typeof req.headers['content-type'] === 'string' ? req.headers['content-type'].toLowerCase() : '';
  if (!contentType.includes('application/json')) {
    sendJson(res, 415, { error: 'Expected an application/json request body.' });
    return;
  }

  let body = '';
  let byteLength = 0;
  let didReject = false;

  req.on('data', (chunk: Buffer | string) => {
    if (didReject) {
      return;
    }

    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_JSON_BODY_BYTES) {
      didReject = true;
      sendJson(res, 413, { error: 'Request body is too large.' });
      return;
    }

    body += buffer.toString();
  });
  req.on('end', () => {
    if (didReject || res.writableEnded) {
      return;
    }

    onComplete(body);
  });
};

export const createContentManagerPlugin = (rootDir: string): Plugin => {
  const classroomIndexFile = path.resolve(rootDir, 'public/3dClass/index.html');

  return {
    name: 'content-manager',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/classroom-3d/save-index-state', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        if (!isTrustedDevWriteRequest(req)) {
          sendJson(res, 403, { error: 'Untrusted classroom state write request.' });
          return;
        }

        readJsonBody(req, res, (body) => {
          try {
            if (!fs.existsSync(classroomIndexFile)) {
              sendJson(res, 500, { error: 'Classroom index file was not found.' });
              return;
            }

            const payload = body ? JSON.parse(body) : {};
            const nextState = sanitizeClassroomEmbeddedState(payload?.state);
            if (!nextState) {
              sendJson(res, 400, { error: 'Invalid classroom state payload.' });
              return;
            }

            const currentHtml = fs.readFileSync(classroomIndexFile, 'utf-8');
            const updatedHtml = injectClassroomStateIntoIndex(currentHtml, nextState);
            fs.writeFileSync(classroomIndexFile, updatedHtml, 'utf-8');

            sendJson(res, 200, { success: true, state: nextState });
          } catch (error) {
            console.error(error);
            sendJson(res, 500, { error: 'Failed to persist classroom state to index.html.' });
          }
        });
      });

      server.middlewares.use('/api/save-content', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        readJsonBody(req, res, () => {
          sendJson(res, 410, {
            error: 'The legacy category-based content writer is disabled. Update modules through the fixed Games/Classroom registry instead.',
          });
        });
      });

      server.middlewares.use('/api/upload-bulk', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        readJsonBody(req, res, () => {
          sendJson(res, 410, {
            error: 'The legacy bulk worksheet uploader is disabled. Publish classroom modules through the new registry-managed flow instead.',
          });
        });
      });
    },
  };
};
