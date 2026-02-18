document.addEventListener('DOMContentLoaded', () => {
  const supportsFS = 'showDirectoryPicker' in window;

  const gallery = document.getElementById('gallery');
  const statusEl = document.getElementById('status');
  const managerStatusEl = document.getElementById('manager-status');

  const manifestBody = document.getElementById('manifest-body');
  const uploadPngInput = document.getElementById('upload-png');
  const addEntryButton = document.getElementById('add-entry');
  const downloadManifestButton = document.getElementById('download-manifest');
  const saveManifestButton = document.getElementById('save-manifest');
  const pickRootButton = document.getElementById('pick-root-folder');
  const rootStatus = document.getElementById('root-folder-status');

  const galleryPanel = document.getElementById('panel-gallery');
  const managerPanel = document.getElementById('panel-manager');
  const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));

  const state = {
    entries: [],
    rootHandle: null,
    folderCache: new Map(),
  };

  const toBaseName = (name) => name.replace(/\.[^.]+$/i, '');
  const labelFromName = (name) => toBaseName(name).replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const isPng = (name) => typeof name === 'string' && /\.png$/i.test(name);

  const toEntry = (value) => {
    if (typeof value === 'string') {
      return {
        image: value.trim(),
        label: '',
        target: '',
      };
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const image =
      typeof value.image === 'string'
        ? value.image.trim()
        : typeof value.name === 'string'
          ? value.name.trim()
          : '';

    if (!image) {
      return null;
    }

    return {
      image,
      label: typeof value.label === 'string' ? value.label.trim() : '',
      target: typeof value.target === 'string' ? value.target.trim() : '',
    };
  };

  const setStatus = (el, message, kind = 'normal') => {
    if (!el) {
      return;
    }

    el.textContent = message;
    el.classList.remove('ok', 'error');
    if (kind === 'ok') {
      el.classList.add('ok');
    }

    if (kind === 'error') {
      el.classList.add('error');
    }
  };

  const toTarget = (entry) => {
    if (entry.target && entry.target.trim().length > 0) {
      const explicit = entry.target.trim();
      const isAbsolute = /^[a-z]+:\/\//i.test(explicit) || explicit.startsWith('mailto:') || explicit.startsWith('tel:');

      if (isAbsolute) {
        return explicit;
      }

      const clean = `./${explicit.replace(/^\.\/+/, '')}`;
      if (/\.[A-Za-z0-9]+$/i.test(clean) || clean.includes('?') || clean.includes('#')) {
        return clean;
      }

      if (clean.endsWith('/')) {
        return `${clean}index.html`;
      }

      if (!clean.includes('/')) {
        return `${clean}/index.html`;
      }

      return `${clean}/index.html`;
    }

    return `./${encodeURIComponent(toBaseName(entry.image))}/index.html`;
  };

  const normalizeEntries = (items) => {
    const out = [];
    const seen = new Set();

    if (!Array.isArray(items)) {
      return out;
    }

    for (const item of items) {
      const parsed = toEntry(item);
      if (!parsed || !isPng(parsed.image)) {
        continue;
      }

      const key = parsed.image.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      if (!parsed.label) {
        parsed.label = labelFromName(parsed.image);
      }

      out.push({
        image: parsed.image,
        label: parsed.label,
        target: parsed.target,
      });

      seen.add(key);
    }

    return out;
  };

  const exportManifest = () =>
    state.entries.map((entry) => {
      if (!entry.label && !entry.target) {
        return entry.image;
      }

      const next = { image: entry.image };
      if (entry.label) {
        next.label = entry.label;
      }

      if (entry.target) {
        next.target = entry.target;
      }

      return next;
    });

  const toBootstrapScript = (manifestItems) =>
    `window.__IMAGE_MANIFEST__ = ${JSON.stringify(manifestItems, null, 2)};\n`;

  const makeTile = (entry) => {
    const target = toTarget(entry);
    const link = document.createElement('a');
    link.href = target;
    link.className = 'tile';
    link.target = '_blank';
    link.rel = 'noopener';

    const img = document.createElement('img');
    img.src = `./${encodeURI(entry.image)}`;
    img.alt = labelFromName(entry.image);
    img.loading = 'lazy';

    const caption = document.createElement('span');
    caption.textContent = entry.label || entry.image;

    link.append(img, caption);
    return link;
  };

  const renderGallery = () => {
    gallery.textContent = '';

    if (state.entries.length === 0) {
      setStatus(statusEl, 'Manifest loaded, but no PNG files were listed.', 'error');
      return;
    }

    for (const entry of state.entries) {
      gallery.appendChild(makeTile(entry));
    }

    setStatus(statusEl, `${state.entries.length} clickable PNG(s) ready.`, 'ok');
  };

  const writeToFile = async (directoryHandle, fileName, source) => {
    const handle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(source);
    await writable.close();
  };

  const ensureStarterPage = async (directoryHandle, entry) => {
    try {
      await directoryHandle.getFileHandle('index.html');
      return;
    } catch {
      // file missing
    }

    const title = entry.label || entry.image;
    const starter =
      `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${title}</title>\n</head>\n<body style="font-family: Arial, Helvetica, sans-serif; padding: 20px;">\n  <h1>${title}</h1>\n  <p>Place your game or app files here and keep this page as <code>index.html</code>.</p>\n  <p><a href="../index.html">Back to gallery</a></p>\n</body>\n</html>\n`;
    await writeToFile(directoryHandle, 'index.html', starter);
  };

  const getProjectDirectory = async (entry) => {
    if (!state.rootHandle) {
      throw new Error('No project folder connected.');
    }

    const folderName = toBaseName(entry.image);
    const cached = state.folderCache.get(folderName);
    if (cached) {
      return cached;
    }

    const dir = await state.rootHandle.getDirectoryHandle(folderName, { create: true });
    state.folderCache.set(folderName, dir);
    return dir;
  };

  const upsertEntry = (entryLike) => {
    const parsed = toEntry(entryLike);
    if (!parsed || !isPng(parsed.image)) {
      return null;
    }

    const index = state.entries.findIndex((x) => x.image.toLowerCase() === parsed.image.toLowerCase());
    const resolvedLabel = parsed.label || labelFromName(parsed.image);

    if (index === -1) {
      const entry = { image: parsed.image, label: resolvedLabel, target: parsed.target };
      state.entries.push(entry);
      return entry;
    }

    state.entries[index] = {
      ...state.entries[index],
      label: resolvedLabel,
      target: parsed.target || state.entries[index].target,
    };

    return state.entries[index];
  };

  const triggerFileDialog = () =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.style.display = 'none';

      input.addEventListener(
        'change',
        () => {
          const files = Array.from(input.files || []);
          input.remove();
          resolve(files);
        },
        { once: true }
      );

      document.body.appendChild(input);
      input.click();
    });

  const renderManifestTable = () => {
    manifestBody.textContent = '';

    if (state.entries.length === 0) {
      const empty = document.createElement('tr');
      const col = document.createElement('td');
      col.colSpan = 5;
      col.textContent = 'No entries yet.';
      empty.appendChild(col);
      manifestBody.appendChild(empty);
      return;
    }

    state.entries.forEach((entry, index) => {
      const tr = document.createElement('tr');

      const imageCell = document.createElement('td');
      imageCell.textContent = entry.image;

      const labelCell = document.createElement('td');
      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = entry.label;
      labelInput.addEventListener('input', () => {
        state.entries[index].label = labelInput.value;
        renderGallery();
      });
      labelCell.appendChild(labelInput);

      const targetCell = document.createElement('td');
      const targetInput = document.createElement('input');
      targetInput.type = 'text';
      targetInput.value = entry.target;
      targetInput.placeholder = `./${toBaseName(entry.image)}/index.html`;
      targetInput.addEventListener('input', () => {
        state.entries[index].target = targetInput.value;
      });
      targetCell.appendChild(targetInput);

      const filesCell = document.createElement('td');
      const uploadProjectBtn = document.createElement('button');
      uploadProjectBtn.type = 'button';
      uploadProjectBtn.textContent = 'Upload project files';
      uploadProjectBtn.disabled = !state.rootHandle;

      uploadProjectBtn.addEventListener('click', async () => {
        if (!state.rootHandle) {
          setStatus(managerStatusEl, 'Connect the folder first to upload project files.', 'error');
          return;
        }

        const files = await triggerFileDialog();
        if (!files.length) {
          return;
        }

        try {
          const dir = await getProjectDirectory(entry);
          for (const file of files) {
            await writeToFile(dir, file.name, file);
          }
          await ensureStarterPage(dir, entry);
          setStatus(managerStatusEl, `Uploaded ${files.length} file(s) to ${toBaseName(entry.image)} folder.`, 'ok');
        } catch (error) {
          console.error(error);
          setStatus(managerStatusEl, error.message || 'Upload to project folder failed.', 'error');
        }
      });
      filesCell.appendChild(uploadProjectBtn);

      const actionsCell = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        state.entries.splice(index, 1);
        renderAll();
        setStatus(managerStatusEl, `Removed ${entry.image}.`, 'ok');
      });
      actionsCell.appendChild(removeBtn);

      tr.append(imageCell, labelCell, targetCell, filesCell, actionsCell);
      manifestBody.appendChild(tr);
    });
  };

  const renderRootAvailability = () => {
    if (!supportsFS) {
      pickRootButton.disabled = true;
      rootStatus.textContent = 'Browser does not support direct folder editing.';
      return;
    }

    if (!state.rootHandle) {
      pickRootButton.disabled = false;
      rootStatus.textContent = 'Not connected';
      return;
    }

    rootStatus.textContent = `Connected: ${state.rootHandle.name || 'individual'}`;
  };

  const renderAll = () => {
    renderGallery();
    renderManifestTable();
    renderRootAvailability();
  };

  const addPngEntryFromFiles = async (files) => {
    if (!files.length) {
      setStatus(managerStatusEl, 'No PNG selected.', 'error');
      return;
    }

    let added = 0;
    let copied = 0;

    for (const file of files) {
      if (!isPng(file.name)) {
        continue;
      }

      const entry = upsertEntry({ image: file.name, label: labelFromName(file.name), target: '' });
      if (!entry) {
        continue;
      }

      added += 1;

      if (state.rootHandle) {
        const dir = await getProjectDirectory(entry);
        await ensureStarterPage(dir, entry);
        await writeToFile(state.rootHandle, file.name, file);
        copied += 1;
      }
    }

    if (added === 0) {
      setStatus(managerStatusEl, 'No PNG files were found in selected uploads.', 'error');
      return;
    }

    renderAll();
    if (state.rootHandle) {
      setStatus(managerStatusEl, `Added ${added} PNG(s) and copied ${copied} image file(s).`, 'ok');
    } else {
      setStatus(
        managerStatusEl,
        `Added ${added} PNG(s) to manifest in memory. Save manifest to disk to persist.`,
        'ok'
      );
    }
  };

  const loadManifest = () => {
    const bootstrapItems = Array.isArray(window.__IMAGE_MANIFEST__) ? window.__IMAGE_MANIFEST__ : [];
    let usedBootstrap = false;

    if (bootstrapItems.length > 0) {
      state.entries = normalizeEntries(bootstrapItems);
      usedBootstrap = state.entries.length > 0;
      renderAll();
      if (location.protocol === 'file:') {
        setStatus(statusEl, `Loaded ${state.entries.length} item(s) from local bootstrap data.`, 'ok');
      }
    }

    fetch('image-manifest.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Missing image-manifest.json');
        }
        return res.json();
      })
      .then((items) => {
        state.entries = normalizeEntries(items);
        renderAll();
      })
      .catch(() => {
        if (usedBootstrap) {
          return;
        }

        state.entries = [];
        renderAll();
        setStatus(statusEl, 'Could not load image-manifest.json. Use Manager > Connect folder to save your manifest.', 'error');
      });
  };

  const saveManifestLocal = (target) => {
    const manifestItems = exportManifest();
    const payload = JSON.stringify(manifestItems, null, 2);
    const bootstrapPayload = toBootstrapScript(manifestItems);
    const blob = new Blob([payload], { type: 'application/json' });

    if (target === 'download') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'image-manifest.json';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(managerStatusEl, 'Manifest download prepared.', 'ok');
      return;
    }

    if (!state.rootHandle) {
      setStatus(managerStatusEl, 'Connect local folder first to save manifest there.', 'error');
      return;
    }

    Promise.all([
      writeToFile(state.rootHandle, 'image-manifest.json', blob),
      writeToFile(state.rootHandle, 'image-manifest.bootstrap.js', bootstrapPayload),
    ])
      .then(() => {
        setStatus(managerStatusEl, 'Manifest files saved to connected folder.', 'ok');
      })
      .catch((error) => {
        console.error(error);
        setStatus(managerStatusEl, error.message || 'Could not save manifest.', 'error');
      });
  };

  pickRootButton.addEventListener('click', async () => {
    if (!supportsFS) {
      setStatus(managerStatusEl, 'File System Access API is not supported in this browser.', 'error');
      return;
    }

    try {
      state.rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.folderCache.clear();
      renderRootAvailability();
      setStatus(managerStatusEl, `Connected: ${state.rootHandle.name || 'individual'}`, 'ok');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus(managerStatusEl, error.message || 'Could not connect folder.', 'error');
      }
    }
  });

  uploadPngInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    try {
      await addPngEntryFromFiles(files);
    } catch (error) {
      console.error(error);
      setStatus(managerStatusEl, error.message || 'Upload failed.', 'error');
    } finally {
      uploadPngInput.value = '';
    }
  });

  addEntryButton.addEventListener('click', () => {
    const raw = prompt('PNG filename (for example: MyGame.png)');
    if (!raw) {
      return;
    }

    const name = raw.trim();
    const imageName = name.toLowerCase().endsWith('.png') ? name : `${name}.png`;
    const entry = upsertEntry({ image: imageName, label: labelFromName(imageName), target: '' });

    if (!entry) {
      setStatus(managerStatusEl, 'Invalid file name.', 'error');
      return;
    }

    renderAll();
    setStatus(managerStatusEl, `Added ${entry.image} to manifest list.`, 'ok');
  });

  downloadManifestButton.addEventListener('click', () => {
    saveManifestLocal('download');
  });

  saveManifestButton.addEventListener('click', () => {
    saveManifestLocal('disk');
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn === button));
      galleryPanel.hidden = target !== 'gallery';
      managerPanel.hidden = target !== 'manager';
    });
  });

  loadManifest();
  renderRootAvailability();
});
