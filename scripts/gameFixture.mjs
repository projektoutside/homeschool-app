import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const fixtureOrigin = 'https://homeschool-fixture.invalid';
const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2' };
async function localResponse(url) {
    const parsed = new URL(url);
    if (parsed.origin !== fixtureOrigin) return new Response(null, { status: 404 });
    const target = path.resolve(publicRoot, '.' + decodeURIComponent(parsed.pathname));
    if (!target.startsWith(publicRoot + path.sep)) return new Response(null, { status: 403 });
    try { return new Response(await readFile(target), { headers: { 'content-type':types[path.extname(target)] || 'application/octet-stream' } }); }
    catch { return new Response(null, { status: 404 }); }
}
export async function fixtureContext(browser, options = {}) {
    const context = await browser.newContext(options);
    await context.route('**/*', async route => {
        const response = await localResponse(route.request().url());
        await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    return context;
}
// Optional test-only preload lets existing drivers run against synthetic files,
// without contacting the app preview, providers, accounts, or the network.
if (process.env.GAMES_TEST_FIXTURE === '1') {
    process.env.GAMES_TEST_URL = fixtureOrigin;
    globalThis.fetch = localResponse;
    const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
    for (const engine of [engines.chromium, engines.webkit, engines.firefox]) {
        const launch = engine.launch.bind(engine);
        engine.launch = async (...args) => {
            const browser = await launch(...args), original = browser.newContext.bind(browser);
            browser.newContext = async (...options) => {
                const context = await original(...options);
                await context.route('**/*', async route => {
                    const response = await localResponse(route.request().url());
                    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
                });
                return context;
            };
            return browser;
        };
    }
}
