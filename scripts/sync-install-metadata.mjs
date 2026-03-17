import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const installConfigPath = resolve(repoRoot, 'src/config/install.config.json');
const manifestPath = resolve(repoRoot, 'public/manifest.json');
const indexHtmlPath = resolve(repoRoot, 'index.html');
const capacitorConfigPath = resolve(repoRoot, 'capacitor.config.json');

const installConfig = JSON.parse(readFileSync(installConfigPath, 'utf8'));

const manifest = {
  name: installConfig.appName,
  short_name: installConfig.shortName,
  description: installConfig.description,
  id: installConfig.manifestId,
  start_url: installConfig.startUrl,
  scope: installConfig.scope,
  display: installConfig.display,
  orientation: installConfig.orientation,
  background_color: installConfig.backgroundColor,
  theme_color: installConfig.themeColor,
  categories: installConfig.categories,
  lang: 'en',
  dir: 'ltr',
  prefer_related_applications: false,
  icons: installConfig.icons,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const capacitorConfig = {
  appId: installConfig.appId,
  appName: installConfig.appName,
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: installConfig.backgroundColor,
    },
    StatusBar: {
      overlaysWebView: true,
      backgroundColor: installConfig.themeColor,
      style: 'LIGHT',
    },
  },
};

writeFileSync(capacitorConfigPath, `${JSON.stringify(capacitorConfig, null, 2)}\n`, 'utf8');

const icon180 = installConfig.icons.find((icon) => icon.sizes === '180x180')?.src ?? 'icons/icon-180x180.png';
const icon192 = installConfig.icons.find((icon) => icon.sizes === '192x192')?.src ?? 'icons/icon-192x192.png';
const icon144 = installConfig.icons.find((icon) => icon.sizes === '144x144')?.src ?? 'icons/icon-144x144.png';

const replaceTag = (input, pattern, replacement) => {
  if (pattern.test(input)) {
    return input.replace(pattern, replacement);
  }
  return input;
};

let indexHtml = readFileSync(indexHtmlPath, 'utf8');
indexHtml = replaceTag(indexHtml, /<title>[\s\S]*?<\/title>/, `<title>${installConfig.appName}</title>`);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="description" content="[^"]*"\s*\/?>/,
  `<meta name="description" content="${installConfig.description}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="theme-color" content="[^"]*"\s*\/?>/,
  `<meta name="theme-color" content="${installConfig.themeColor}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="apple-mobile-web-app-title" content="[^"]*"\s*\/?>/,
  `<meta name="apple-mobile-web-app-title" content="${installConfig.shortName}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="application-name" content="[^"]*"\s*\/?>/,
  `<meta name="application-name" content="${installConfig.shortName}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="msapplication-TileColor" content="[^"]*"\s*\/?>/,
  `<meta name="msapplication-TileColor" content="${installConfig.themeColor}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<meta name="msapplication-TileImage" content="[^"]*"\s*\/?>/,
  `<meta name="msapplication-TileImage" content="${icon144}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<link rel="icon" type="image\/png" sizes="192x192" href="[^"]*"\s*\/?>/,
  `<link rel="icon" type="image/png" sizes="192x192" href="${icon192}" />`,
);
indexHtml = replaceTag(
  indexHtml,
  /<link rel="apple-touch-icon" sizes="180x180" href="[^"]*"\s*\/?>/,
  `<link rel="apple-touch-icon" sizes="180x180" href="${icon180}" />`,
);

writeFileSync(indexHtmlPath, indexHtml, 'utf8');
