import { COINS, ORDER } from './game-core.mjs';
const art = new Map();
let preparation;
const photos = {
  penny: ['penny-obverse.png', 'penny-reverse.jpg'],
  nickel: ['nickel-obverse.png', 'nickel-reverse.jpg'],
  dime: ['dime-obverse.png', 'dime-reverse.png'],
  quarter: ['quarter-obverse.jpg', 'quarter-reverse.jpg'],
};
export const coinArtUrl = (id, reverse = false) => art.get(`${id}-${reverse ? 1 : 0}`) || art.get(id);
export function coinFace(id) {
  return `<span class="coin-face coin-${id}" data-art="${id}" aria-hidden="true"><span class="coin-fallback">${COINS[id].value}¢</span>${art.has(id) ? `<img src="${art.get(id)}" alt="" draggable="false">` : ''}</span>`;
}
function cleanCoin(id, side = 0, legacy = false) {
  return new Promise(resolve => {
    const image = new Image(); image.decoding = 'async'; image.onerror = () => resolve(null);
    image.onload = () => {
      try {
        const width = 512, canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = width;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(image, 0, 0, width, width);
        const pixels = ctx.getImageData(0, 0, width, width), { data } = pixels, palette = [];
        for (let n = 0; n < width; n += 20) for (const [x, y] of [[n, 0], [n, width - 1], [0, n], [width - 1, n]]) {
          const offset = (y * width + x) * 4; palette.push([data[offset], data[offset + 1], data[offset + 2]]);
        }
        const threshold = (legacy ? COINS[id].threshold : 12) ** 2, seen = new Uint8Array(width * width), queue = [];
        const visit = position => {
          if (seen[position]) return;
          const offset = position * 4;
          if (data[offset + 3] < 7 || palette.some(rgb => rgb.reduce((sum, value, channel) => sum + (value - data[offset + channel]) ** 2, 0) <= threshold)) { seen[position] = 1; queue.push(position); }
        };
        for (let n = 0; n < width; n++) { visit(n); visit((width - 1) * width + n); visit(n * width); visit(n * width + width - 1); }
        for (let head = 0; head < queue.length; head++) {
          const pos = queue[head], x = pos % width, y = Math.floor(pos / width); data[pos * 4 + 3] = 0;
          if (x > 0) visit(pos - 1); if (x < width - 1) visit(pos + 1);
          if (y > 0) visit(pos - width); if (y < width - 1) visit(pos + width);
        }
        ctx.putImageData(pixels, 0, 0);
        let left = width, top = width, right = 0, bottom = 0;
        for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 14) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        if (right <= left || bottom <= top) return resolve(null);
        const out = document.createElement('canvas'), size = Math.max(right - left + 1, bottom - top + 1) + 6;
        out.width = size; out.height = size;
        out.getContext('2d').drawImage(canvas, left, top, right - left + 1, bottom - top + 1, (size - right + left - 1) / 2, (size - bottom + top - 1) / 2, right - left + 1, bottom - top + 1);
        out.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
      } catch { resolve(null); }
    };
    image.src = encodeURI(legacy ? COINS[id].asset : `assets/coins/${photos[id][side]}`);
  });
}
export function prepareCoinArt() {
  preparation ||= Promise.all(ORDER.flatMap(id => [0, 1].map(async side => {
    const src = await cleanCoin(id, side) || await cleanCoin(id, 0, true);
    if (src) { art.set(`${id}-${side}`, src); if (!side) art.set(id, src); }
  }))).then(refreshCoinArt);
  return preparation;
}
export function refreshCoinArt() {
  document.querySelectorAll('[data-art]').forEach(element => {
    if (!art.has(element.dataset.art) || element.querySelector('img')) return;
    const image = new Image(); image.alt = ''; image.draggable = false; image.src = art.get(element.dataset.art); element.append(image);
  });
}
