import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app container');
}

app.innerHTML = `
  <div class="app-shell">
    <button id="managerToggleBtn" class="manager-toggle-launch" type="button" aria-label="Toggle manager panel">Manager</button>

    <main class="stage" aria-label="MainBackground page">
      <img class="bg" src="/NEWmainbackground.png" alt="Classroom main background" />

      <a id="hotspotLaptop" class="hotspot" href="/Laptop/index.html" aria-label="Open laptop page">
        <img src="/Laptop.png" alt="Laptop" />
      </a>

      <a id="hotspotRedbackpack" class="hotspot" href="/Redbackpack/index.html" aria-label="Open red backpack page">
        <img src="/Redbackpack.png" alt="Red backpack" />
      </a>

      <div class="hud">
        <span>MainBackground home</span>
        <span>Click Laptop or Redbackpack</span>
      </div>
    </main>

    <section id="managerPanel" class="manager-panel" hidden aria-live="polite">
      <header class="manager-header">
        <h2>Manager Tool</h2>
        <button id="managerCloseBtn" type="button" class="manager-close" aria-label="Close manager">x</button>
      </header>

      <label for="managerTarget">Component</label>
      <select id="managerTarget">
        <option value="laptop">Laptop</option>
        <option value="redbackpack">Redbackpack</option>
      </select>

      <div class="manager-row">
        <span>Position</span>
        <output id="managerPositionValue">x 0.0%, y 0.0%</output>
      </div>

      <div class="manager-row">
        <label for="managerWidth">Width</label>
        <output id="managerWidthValue">0%</output>
      </div>
      <input id="managerWidth" type="range" min="6" max="60" step="0.1" />

      <div class="manager-actions">
        <button id="managerSaveBtn" type="button">Save</button>
        <button id="managerResetBtn" type="button" class="secondary">Reset</button>
      </div>

      <p id="managerStatus" class="manager-status">Use Ctrl+Shift+D, Alt+Shift+D, or F2.</p>
    </section>
  </div>
`;

type HotspotId = 'laptop' | 'redbackpack';

type HotspotLayout = {
  left: number;
  top: number;
  width: number;
};

type LayoutState = Record<HotspotId, HotspotLayout>;
type DragState = {
  hotspotId: HotspotId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const STORAGE_LAYOUT_KEY = 'vite.mainbackground.layout.v1';

const DEFAULT_LAYOUT: LayoutState = {
  laptop: { left: 16, top: 59, width: 20 },
  redbackpack: { left: 72, top: 56, width: 12 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const cloneDefaultLayout = (): LayoutState => ({
  laptop: { ...DEFAULT_LAYOUT.laptop },
  redbackpack: { ...DEFAULT_LAYOUT.redbackpack },
});

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

const parseSavedLayout = (): LayoutState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_LAYOUT_KEY);
    if (!raw) {
      return cloneDefaultLayout();
    }
    return sanitizeLayout(JSON.parse(raw));
  } catch {
    return cloneDefaultLayout();
  }
};

const hotspots: Record<HotspotId, HTMLAnchorElement> = {
  laptop: document.getElementById('hotspotLaptop') as HTMLAnchorElement,
  redbackpack: document.getElementById('hotspotRedbackpack') as HTMLAnchorElement,
};
const stage = document.querySelector('.stage') as HTMLElement;
const backgroundImage = document.querySelector('.bg') as HTMLImageElement;
const appShell = app.querySelector('.app-shell') as HTMLElement;

const managerToggleBtn = document.getElementById('managerToggleBtn') as HTMLButtonElement;
const managerPanel = document.getElementById('managerPanel') as HTMLElement;
const managerCloseBtn = document.getElementById('managerCloseBtn') as HTMLButtonElement;
const managerTarget = document.getElementById('managerTarget') as HTMLSelectElement;
const managerPositionValue = document.getElementById('managerPositionValue') as HTMLOutputElement;
const managerWidth = document.getElementById('managerWidth') as HTMLInputElement;
const managerWidthValue = document.getElementById('managerWidthValue') as HTMLOutputElement;
const managerSaveBtn = document.getElementById('managerSaveBtn') as HTMLButtonElement;
const managerResetBtn = document.getElementById('managerResetBtn') as HTMLButtonElement;
const managerStatus = document.getElementById('managerStatus') as HTMLParagraphElement;

let managerOpen = false;
let selected: HotspotId = 'laptop';
let layout: LayoutState = parseSavedLayout();
let layoutSnapshot = JSON.stringify(layout);
let dragState: DragState | null = null;

const updateStatus = (message: string) => {
  managerStatus.textContent = message;
};

const saveLocalLayout = () => {
  window.localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(layout));
  layoutSnapshot = JSON.stringify(layout);
};

const fetchServerLayout = async (): Promise<LayoutState | null> => {
  try {
    const response = await fetch('/api/layout', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return sanitizeLayout(await response.json());
  } catch {
    return null;
  }
};

const saveServerLayout = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const getBackgroundRenderRect = () => {
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const naturalWidth = backgroundImage.naturalWidth;
  const naturalHeight = backgroundImage.naturalHeight;

  if (!stageWidth || !stageHeight || !naturalWidth || !naturalHeight) {
    return {
      left: 0,
      top: 0,
      width: Math.max(stageWidth, 1),
      height: Math.max(stageHeight, 1),
    };
  }

  const scale = Math.max(stageWidth / naturalWidth, stageHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;

  return {
    left: (stageWidth - renderedWidth) / 2,
    top: (stageHeight - renderedHeight) / 2,
    width: renderedWidth,
    height: renderedHeight,
  };
};

const applyLayout = () => {
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  if (!stageWidth || !stageHeight) {
    return;
  }

  const bgRect = getBackgroundRenderRect();

  (Object.keys(layout) as HotspotId[]).forEach((id) => {
    const node = hotspots[id];
    const state = layout[id];
    const leftPx = bgRect.left + (state.left / 100) * bgRect.width;
    const topPx = bgRect.top + (state.top / 100) * bgRect.height;
    const widthPx = (state.width / 100) * bgRect.width;

    node.style.left = `${(leftPx / stageWidth) * 100}%`;
    node.style.top = `${(topPx / stageHeight) * 100}%`;
    node.style.width = `${(widthPx / stageWidth) * 100}%`;
  });
};

const syncControls = () => {
  const state = layout[selected];
  managerTarget.value = selected;
  managerPositionValue.textContent = `x ${state.left.toFixed(1)}%, y ${state.top.toFixed(1)}%`;
  managerWidth.value = state.width.toFixed(1);
  managerWidthValue.textContent = `${state.width.toFixed(1)}%`;
};

const setManagerOpen = (open: boolean) => {
  if (!open && dragState) {
    const activeNode = hotspots[dragState.hotspotId];
    if (activeNode.hasPointerCapture(dragState.pointerId)) {
      activeNode.releasePointerCapture(dragState.pointerId);
    }
    activeNode.classList.remove('is-dragging');
    dragState = null;
  }
  managerOpen = open;
  appShell.classList.toggle('manager-active', managerOpen);
  managerPanel.hidden = !managerOpen;
  managerToggleBtn.textContent = managerOpen ? 'Close Manager' : 'Manager';
  if (managerOpen) {
    syncControls();
    updateStatus('Manager open. Drag hotspots to move, adjust width, then Save.');
  }
};

const updateSelectedWidth = () => {
  layout[selected].width = clamp(Number(managerWidth.value), 6, 60);
  applyLayout();
  syncControls();
};

const beginHotspotDrag = (event: PointerEvent, hotspotId: HotspotId) => {
  if (!managerOpen) {
    return;
  }
  if (event.button !== 0) {
    return;
  }

  selected = hotspotId;
  syncControls();

  const bgRect = getBackgroundRenderRect();
  const stageRect = stage.getBoundingClientRect();
  const hotspot = hotspots[hotspotId];
  const current = layout[hotspotId];
  const hotspotWidthPx = (current.width / 100) * bgRect.width;
  const hotspotHeightPx = hotspot.getBoundingClientRect().height;
  const hotspotLeftPx = bgRect.left + (current.left / 100) * bgRect.width;
  const hotspotTopPx = bgRect.top + (current.top / 100) * bgRect.height;

  const maxLeft = Math.max(bgRect.left, bgRect.left + bgRect.width - hotspotWidthPx);
  const maxTop = Math.max(bgRect.top, bgRect.top + bgRect.height - hotspotHeightPx);
  const clampedLeftPx = clamp(hotspotLeftPx, bgRect.left, maxLeft);
  const clampedTopPx = clamp(hotspotTopPx, bgRect.top, maxTop);

  dragState = {
    hotspotId,
    pointerId: event.pointerId,
    offsetX: event.clientX - (stageRect.left + clampedLeftPx),
    offsetY: event.clientY - (stageRect.top + clampedTopPx),
  };

  hotspot.classList.add('is-dragging');
  hotspot.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const moveHotspotDrag = (event: PointerEvent) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const hotspotId = dragState.hotspotId;
  const current = layout[hotspotId];
  const bgRect = getBackgroundRenderRect();
  const stageRect = stage.getBoundingClientRect();
  const hotspot = hotspots[hotspotId];
  const hotspotRect = hotspot.getBoundingClientRect();
  const hotspotWidthPx = (current.width / 100) * bgRect.width;
  const hotspotHeightPx = hotspotRect.height;

  const nextLeftPx = clamp(
    event.clientX - stageRect.left - dragState.offsetX,
    bgRect.left,
    Math.max(bgRect.left, bgRect.left + bgRect.width - hotspotWidthPx),
  );
  const nextTopPx = clamp(
    event.clientY - stageRect.top - dragState.offsetY,
    bgRect.top,
    Math.max(bgRect.top, bgRect.top + bgRect.height - hotspotHeightPx),
  );

  current.left = clamp(((nextLeftPx - bgRect.left) / bgRect.width) * 100, 0, 95);
  current.top = clamp(((nextTopPx - bgRect.top) / bgRect.height) * 100, 0, 95);

  applyLayout();
  syncControls();
  updateStatus(`${hotspotId} position: x ${current.left.toFixed(1)}%, y ${current.top.toFixed(1)}%`);
  event.preventDefault();
};

const endHotspotDrag = (event: PointerEvent) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const hotspot = hotspots[dragState.hotspotId];
  if (hotspot.hasPointerCapture(event.pointerId)) {
    hotspot.releasePointerCapture(event.pointerId);
  }
  hotspot.classList.remove('is-dragging');
  dragState = null;
};

const persistLayout = async () => {
  saveLocalLayout();
  const saved = await saveServerLayout();
  if (saved) {
    updateStatus('Layout saved and embedded into ../index.html.');
    return;
  }
  updateStatus('Saved only on this device. Server is not reachable or index write failed.');
};

const resetLayout = async () => {
  layout = cloneDefaultLayout();
  applyLayout();
  syncControls();
  saveLocalLayout();
  const saved = await saveServerLayout();
  if (saved) {
    updateStatus('Layout reset and embedded into ../index.html.');
    return;
  }
  updateStatus('Layout reset locally. Server is not reachable or index write failed.');
};

const pullServerLayout = async (silent: boolean) => {
  const remote = await fetchServerLayout();
  if (!remote) {
    return;
  }
  const remoteSnapshot = JSON.stringify(remote);
  if (remoteSnapshot === layoutSnapshot) {
    return;
  }
  layout = remote;
  saveLocalLayout();
  applyLayout();
  syncControls();
  if (!silent) {
    updateStatus('Layout synced from server.');
  }
};

const bootstrapLayout = async () => {
  const remote = await fetchServerLayout();
  if (!remote) {
    applyLayout();
    syncControls();
    updateStatus('Using local layout. Server sync unavailable.');
    return;
  }
  layout = remote;
  saveLocalLayout();
  applyLayout();
  syncControls();
  updateStatus('Loaded shared layout from server.');
};

managerToggleBtn.addEventListener('click', () => {
  setManagerOpen(!managerOpen);
});

managerCloseBtn.addEventListener('click', () => {
  setManagerOpen(false);
});

managerTarget.addEventListener('change', () => {
  selected = managerTarget.value as HotspotId;
  syncControls();
});

managerWidth.addEventListener('input', updateSelectedWidth);

(Object.keys(hotspots) as HotspotId[]).forEach((hotspotId) => {
  const hotspot = hotspots[hotspotId];
  hotspot.addEventListener('click', (event) => {
    selected = hotspotId;
    syncControls();
    if (managerOpen) {
      event.preventDefault();
    }
  });
  hotspot.addEventListener('pointerdown', (event) => beginHotspotDrag(event, hotspotId));
  hotspot.addEventListener('pointermove', moveHotspotDrag);
  hotspot.addEventListener('pointerup', endHotspotDrag);
  hotspot.addEventListener('pointercancel', endHotspotDrag);
});

managerSaveBtn.addEventListener('click', () => {
  void persistLayout();
});
managerResetBtn.addEventListener('click', () => {
  void resetLayout();
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;
  if (isEditable) {
    return;
  }

  if (event.key === 'Escape' && managerOpen) {
    setManagerOpen(false);
    return;
  }

  const key = event.key.toLowerCase();
  const primary = event.ctrlKey && event.shiftKey && key === 'd';
  const fallback = (event.altKey && event.shiftKey && key === 'd') || event.key === 'F2';

  if (primary || fallback) {
    event.preventDefault();
    setManagerOpen(!managerOpen);
  }
});

void bootstrapLayout();
setInterval(() => {
  if (managerOpen) {
    return;
  }
  void pullServerLayout(true);
}, 3000);

backgroundImage.addEventListener('load', applyLayout);
window.addEventListener('resize', applyLayout);
window.addEventListener('orientationchange', applyLayout);
