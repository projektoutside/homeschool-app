(() => {
  'use strict';

  const CENTER = { left: 56, right: 304, top: 190, bottom: 490 };
  const BUILD = { left: 30, right: 330, top: 150, bottom: 540 };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = value => JSON.parse(JSON.stringify(value));
  const length = points => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
  const inside = (p, zone) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= zone.left && p.x <= zone.right && p.y >= zone.top && p.y <= zone.bottom;
  function segmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  const usedInk = map => map.strokes.reduce((sum, stroke) => sum + length(stroke), 0);
  function birdAllowed(map, p, except = -1) {
    return inside(p, CENTER)
      && map.birds.every((bird, i) => i === except || Math.hypot(bird.x - p.x, bird.y - p.y) >= 56)
      && map.strokes.every(stroke => stroke.slice(1).every((end, i) => segmentDistance(p, stroke[i], end) >= 38));
  }
  function validMap(map, config) {
    return map.birds.length === config.birds && map.birds.every((p, i) => birdAllowed(map, p, i))
      && map.strokes.length > 0 && usedInk(map) >= 12 && usedInk(map) <= config.platformInk + .01
      && map.strokes.every(stroke => stroke.length >= 2 && stroke.every(p => inside(p, BUILD)));
  }
  function resultFor({ hits, combo, clear, elapsedMs, inkLeft, reason }) {
    return { hits, combo, clear, elapsedMs: Math.round(elapsedMs), inkLeft, reason, points: hits * 100 + combo + (clear ? 100 : 0) };
  }
  function winner(results) {
    const [a, b] = results;
    if (a.points !== b.points) return a.points > b.points ? 0 : 1;
    if (!a.hits || Math.abs(a.elapsedMs - b.elapsedMs) < 100) return null;
    return a.elapsedMs < b.elapsedMs ? 0 : 1;
  }

  class WoodlandVersus {
    constructor(adapter) {
      this.adapter = adapter;
      this.active = false; this.phase = 'campaign'; this.dialogKind = '';
      this.config = { birds: 3, seconds: 60, platformInk: 360, solverInk: 480 };
      this.maps = []; this.results = []; this.player = 0; this.elapsedMs = 0;
      this.history = []; this.tool = 'birds'; this.pointer = null; this.preview = [];
      this.mount(); this.bind();
    }

    mount() {
      document.querySelector('.hud-cluster').insertAdjacentHTML('afterend', `<button id="versusButton" class="vs-launch" type="button" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 3 16 18M20 3 4 21M3 7l4-4m10 0 4 4M2 19l3 3m14 0 3-3"/></svg><span>2 Player VS Mode</span></button>
        <section class="vs-panel" id="versusPanel" hidden aria-label="VS match">
          <div class="vs-turn"><h2 id="vsTurnTitle"></h2><output id="vsClock" aria-label="Turn time remaining"></output></div>
          <div id="vsEditorTools">
            <div class="vs-tools" role="group" aria-label="Map tools"><button id="vsBirdTool" type="button" aria-pressed="true">Place birds</button><button id="vsBlockTool" type="button" aria-pressed="false">Draw platforms</button></div>
            <details class="vs-precision"><summary>Place birds precisely</summary><div class="vs-coordinates">
              <label>Bird<select id="vsSelectedBird" aria-label="Bird to place or move"></select></label>
              <label>X<input id="vsBirdX" type="number" min="56" max="304" value="180" inputmode="numeric"></label>
              <label>Y<input id="vsBirdY" type="number" min="190" max="490" value="250" inputmode="numeric"></label>
              <button id="vsPlaceBird" type="button">Place / move</button><button id="vsRemoveBird" type="button">Remove bird</button>
            </div></details>
          </div>
        </section>`);
      document.querySelector('.controls').insertAdjacentHTML('beforeend', `<div class="vs-editor-actions" id="vsEditorActions" hidden><button class="control-button" id="vsUndo" type="button">Undo edit</button><button class="control-button control-button--primary" id="vsReady" type="button">Ready map</button></div>`);
      document.body.insertAdjacentHTML('beforeend', `<dialog id="versusDialog" class="vs-dialog" aria-labelledby="vsDialogTitle"><header><div class="vs-duel-art" aria-hidden="true"><span></span><svg viewBox="0 0 24 24"><path d="m4 3 16 18M20 3 4 21M3 7l4-4m10 0 4 4"/></svg><span></span></div><h2 id="vsDialogTitle"></h2></header><div class="vs-dialog-body" id="vsDialogBody" tabindex="0"></div><footer id="vsDialogActions"></footer></dialog>`);
      const byId = id => document.getElementById(id);
      this.dom = Object.fromEntries(['versusButton','versusPanel','vsTurnTitle','vsClock','vsEditorTools','vsBirdTool','vsBlockTool','vsSelectedBird','vsBirdX','vsBirdY','vsPlaceBird','vsRemoveBird','vsEditorActions','vsUndo','vsReady','versusDialog','vsDialogTitle','vsDialogBody','vsDialogActions'].map(id => [id, byId(id)]));
    }

    bind() {
      const d = this.dom;
      d.versusButton.addEventListener('click', () => this.active ? this.pause() : this.setup());
      d.vsBirdTool.addEventListener('click', () => this.setTool('birds'));
      d.vsBlockTool.addEventListener('click', () => this.setTool('blocks'));
      d.vsUndo.addEventListener('click', () => {
        if (!this.editing || this.pointer || !this.history.length) return;
        this.draft = this.history.pop(); this.changed();
      });
      d.vsReady.addEventListener('click', () => this.ready());
      d.vsSelectedBird.addEventListener('change', () => this.selectBird());
      d.vsPlaceBird.addEventListener('click', () => {
        if (!this.editing || this.pointer) return;
        const p = { x: Number(d.vsBirdX.value), y: Number(d.vsBirdY.value) }, index = Number(d.vsSelectedBird.value);
        if (!birdAllowed(this.draft, p, index)) return this.message('Keep birds inside the center area, apart from each other and the gray platforms.');
        this.remember(); this.draft.birds[index] = p; this.changed();
      });
      d.vsRemoveBird.addEventListener('click', () => {
        const index = Number(d.vsSelectedBird.value);
        if (!this.editing || this.pointer || !this.draft.birds[index]) return;
        this.remember(); this.draft.birds.splice(index, 1); this.tool = 'birds'; this.changed();
      });
      d.versusDialog.addEventListener('cancel', event => {
        event.preventDefault();
        if (this.dialogKind === 'setup' || this.dialogKind === 'pause') this.closeDialog();
      });
      const keepFieldVisible = () => window.requestAnimationFrame(() => {
        const field = document.activeElement;
        if (!this.editing || !field?.closest('.vs-coordinates')) return;
        const hud = document.querySelector('.hud'), box = hud.getBoundingClientRect(), input = field.getBoundingClientRect();
        if (input.bottom > box.bottom - 6) hud.scrollTop += input.bottom - box.bottom + 6;
        else if (input.top < box.top + 6) hud.scrollTop -= box.top - input.top + 6;
      });
      window.addEventListener('resize', keepFieldVisible, { passive: true });
      window.visualViewport?.addEventListener('resize', keepFieldVisible, { passive: true });
    }

    get editing() { return this.active && this.phase === 'building'; }
    get playing() { return this.active && this.phase === 'playing'; }
    get paused() { return this.dom.versusDialog.open; }
    get platformUsed() { return this.draft ? usedInk(this.draft) + length(this.preview) : 0; }
    message(text) { this.adapter.status(text); }
    remember() { this.history.push(copy(this.draft)); if (this.history.length > 60) this.history.shift(); }

    dialog(kind, title, body, actions) {
      this.cancelPointer(); this.dialogKind = kind;
      this.dom.vsDialogTitle.textContent = title;
      this.dom.vsDialogBody.innerHTML = body;
      this.dom.vsDialogBody.scrollTop = 0;
      this.dom.vsDialogActions.replaceChildren();
      for (const action of actions) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = action.label;
        button.className = `overlay-button${action.primary ? ' overlay-button--primary' : ''}`;
        button.addEventListener('click', () => {
          if (button.disabled) return;
          this.dom.vsDialogActions.querySelectorAll('button').forEach(item => { item.disabled = true; });
          action.run();
        });
        this.dom.vsDialogActions.append(button);
      }
      if (!this.dom.versusDialog.open) this.dom.versusDialog.showModal();
      this.adapter.pauseChanged();
      (this.dom.vsDialogBody.querySelector('select') || this.dom.vsDialogActions.lastElementChild).focus({ preventScroll: true });
    }

    closeDialog() {
      this.dom.versusDialog.close(); this.dialogKind = ''; this.adapter.pauseChanged();
      (this.editing ? this.dom.vsBirdTool : this.dom.versusButton).focus({ preventScroll: true });
    }

    setup() {
      if (!this.adapter.canEnter()) return;
      const c = this.config;
      const select = (id, label, values, selected) => `<label>${label}<select id="${id}">${values.map(([value, text]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
      this.dialog('setup', 'Build a challenge. Trade maps.', `<p>Two players. One device. Each of you builds a woodland puzzle for the other to solve.</p><div class="vs-settings">
        ${select('vsBirdCount','Birds per map',[[1,'1 bird'],[2,'2 birds'],[3,'3 birds']],c.birds)}
        ${select('vsTimeLimit','Time per turn',[[30,'30 seconds'],[60,'60 seconds'],[90,'90 seconds'],[120,'2 minutes'],[0,'No time limit']],c.seconds)}
        ${select('vsPlatformInk','Platform ink',[[240,'240 · compact'],[360,'360 · standard'],[480,'480 · generous']],c.platformInk)}
        ${select('vsSolverInk','Solving ink',[[360,'360 · tricky'],[480,'480 · standard'],[600,'600 · generous']],c.solverInk)}
        </div><p class="vs-rules"><strong>Build → swap → drop.</strong> Place birds in the center, then draw gray platforms. Leave a clear route! Both players get equal supplies and one drop. The timer includes drawing and aiming; building is untimed.</p><p class="vs-rules">Score 100 per bird, combo bonuses and 100 for a full clear. Equal scores use the faster turn. Match points stay in this match.</p>`, [
        { label: 'Back to campaign', run: () => this.closeDialog() },
        { label: 'Player 1: build', primary: true, run: () => {
          const number = id => Number(document.getElementById(id).value);
          this.config = { birds: number('vsBirdCount'), seconds: number('vsTimeLimit'), platformInk: number('vsPlatformInk'), solverInk: number('vsSolverInk') };
          this.active = true; this.maps = []; this.results = []; this.player = 0;
          this.startBuild();
        } },
      ]);
    }

    startBuild() {
      this.phase = 'building'; this.tool = 'birds'; this.draft = { birds: [], strokes: [] }; this.history = []; this.preview = [];
      document.body.classList.add('vs-active'); document.body.classList.add('vs-building');
      this.dom.versusPanel.hidden = false; this.dom.vsEditorTools.hidden = false; this.dom.vsEditorActions.hidden = false;
      this.dom.versusButton.querySelector('span').textContent = 'Pause / leave VS';
      this.adapter.start(); this.closeDialog(); this.changed();
      this.message(`Player ${this.player + 1}: place ${this.config.birds} birds inside the marked center area, then draw gray platforms for Player ${2 - this.player}.`);
    }

    setTool(tool) {
      if (!this.editing || this.pointer || (tool === 'blocks' && this.draft.birds.length !== this.config.birds)) return;
      this.tool = tool; this.renderControls();
      this.message(tool === 'birds' ? 'Tap to place a bird; drag a bird to move it. Keep every bird inside the center.' : 'Draw gray platforms inside the dashed area. Leave space around birds and a route for the stone.');
    }

    selectBird() {
      const p = this.draft?.birds[Number(this.dom.vsSelectedBird.value)];
      if (p) { this.dom.vsBirdX.value = Math.round(p.x); this.dom.vsBirdY.value = Math.round(p.y); }
    }

    renderControls() {
      const d = this.dom;
      d.vsTurnTitle.textContent = this.editing ? `Player ${this.player + 1} builds for Player ${2 - this.player}` : `Player ${this.player + 1}'s turn`;
      d.vsClock.textContent = this.editing ? `${this.draft.birds.length}/${this.config.birds} placed` : this.clockText();
      d.vsClock.classList.toggle('is-urgent', this.playing && this.config.seconds > 0 && this.remainingMs <= 10000);
      if (!this.editing) return;
      d.vsBirdTool.setAttribute('aria-pressed', String(this.tool === 'birds'));
      d.vsBlockTool.setAttribute('aria-pressed', String(this.tool === 'blocks'));
      d.vsBlockTool.disabled = this.draft.birds.length !== this.config.birds;
      d.vsUndo.disabled = !this.history.length || !!this.pointer;
      d.vsReady.disabled = !!this.pointer || !validMap(this.draft, this.config);
      const selected = clamp(Number(d.vsSelectedBird.value) || 0, 0, Math.min(this.draft.birds.length, this.config.birds - 1));
      d.vsSelectedBird.replaceChildren();
      for (let i = 0; i < Math.min(this.config.birds, this.draft.birds.length + 1); i++) {
        const option = document.createElement('option'); option.value = i; option.textContent = `Bird ${i + 1}${i === this.draft.birds.length ? ' · new' : ''}`;
        d.vsSelectedBird.append(option);
      }
      d.vsSelectedBird.value = selected;
      d.vsRemoveBird.disabled = !this.draft.birds[selected] || !!this.pointer;
      d.vsPlaceBird.disabled = !!this.pointer;
    }

    changed() { this.renderControls(); this.adapter.editChanged(); }

    pointerDown(event, p, canvas) {
      if (!this.editing || this.paused || this.pointer || event.button > 0) return;
      if (this.tool === 'birds') {
        let index = this.draft.birds.findIndex(bird => Math.hypot(p.x - bird.x, p.y - bird.y) < 28);
        if (index < 0) {
          if (this.draft.birds.length >= this.config.birds) return this.message('All birds placed. Drag one to move it, or choose Draw platforms.');
          if (!birdAllowed(this.draft, p)) return this.message('Place birds inside the center, with room between them.');
          index = this.draft.birds.length;
        }
        this.pointer = { id: event.pointerId, index, before: copy(this.draft), canvas };
        this.draft.birds[index] = p;
      } else {
        if (!inside(p, BUILD) || this.platformUsed >= this.config.platformInk - .1) return;
        if (this.draft.birds.some(bird => Math.hypot(p.x - bird.x, p.y - bird.y) < 38)) return this.message('Leave a little space around each bird.');
        this.pointer = { id: event.pointerId, index: -1, before: copy(this.draft), canvas };
        this.preview = [p];
      }
      canvas.setPointerCapture(event.pointerId); event.preventDefault(); this.changed();
    }

    pointerMove(event, p) {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      event.preventDefault();
      if (this.pointer.index >= 0) {
        p = { x: clamp(p.x, CENTER.left, CENTER.right), y: clamp(p.y, CENTER.top, CENTER.bottom) };
        if (birdAllowed(this.draft, p, this.pointer.index)) this.draft.birds[this.pointer.index] = p;
      } else {
        p = { x: clamp(p.x, BUILD.left, BUILD.right), y: clamp(p.y, BUILD.top, BUILD.bottom) };
        const last = this.preview[this.preview.length - 1], distance = Math.hypot(p.x - last.x, p.y - last.y);
        if (distance < 3) return;
        const left = Math.max(0, this.config.platformInk - this.platformUsed), t = Math.min(1, left / distance);
        if (left < .01) return;
        p = { x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t };
        if (this.draft.birds.some(bird => segmentDistance(bird, last, p) < 38)) {
          this.message('That platform is too close to a bird. Draw around its clear space.'); return;
        }
        this.preview.push(p);
      }
      this.changed();
    }

    pointerFinish(event, cancelled = false) {
      if (!this.pointer || (event && this.pointer.id !== event.pointerId)) return;
      const pointer = this.pointer; this.pointer = null;
      if (cancelled) this.draft = pointer.before;
      else {
        if (this.preview.length > 1 && length(this.preview) >= .01) this.draft.strokes = [...this.draft.strokes, this.preview.slice()];
        if (JSON.stringify(this.draft) !== JSON.stringify(pointer.before)) this.history.push(pointer.before);
        if (this.history.length > 60) this.history.shift();
      }
      this.preview = [];
      if (pointer.canvas.hasPointerCapture(pointer.id)) pointer.canvas.releasePointerCapture(pointer.id);
      this.changed();
      if (!cancelled && this.platformUsed >= this.config.platformInk - .5 && validMap(this.draft, this.config)) this.ready();
      else if (!cancelled && this.draft.birds.length === this.config.birds && this.tool === 'birds') this.setTool('blocks');
    }

    cancelPointer() { if (this.pointer) this.pointerFinish(null, true); }

    ready() {
      if (!this.editing || this.pointer || !validMap(this.draft, this.config)) return;
      this.maps[this.player] = copy(this.draft); this.phase = 'handoff';
      this.adapter.conceal();
      if (this.player === 0) {
        this.dialog('handoff', 'Pass to Player 2', '<p>Player 1’s challenge is sealed. Player 2, build your own map for Player 1. No peeking!</p>', [{ label: 'Player 2: build', primary: true, run: () => { this.player = 1; this.startBuild(); } }]);
      } else this.offerTurn(0);
    }

    offerTurn(player) {
      this.player = player; this.phase = 'handoff'; this.adapter.conceal();
      const time = this.config.seconds ? `${this.config.seconds} seconds` : 'as much time as you like';
      this.dialog('handoff', `Pass to Player ${player + 1}`, `<p>Player ${player + 1}, solve the map Player ${2 - player} made for you.</p><p>You have <strong>${time}</strong>, ${this.config.solverInk} ink and <strong>one drop</strong>. Draw a path, slide the claw and clear the birds.</p><p>The clock starts when you press Begin.</p>`, [{ label: `Begin Player ${player + 1}'s turn`, primary: true, run: () => this.startTurn() }]);
    }

    startTurn() {
      if (!this.active || this.phase !== 'handoff') return;
      this.phase = 'playing'; this.elapsedMs = 0; this.captured = null;
      document.body.classList.remove('vs-building');
      this.dom.vsEditorTools.hidden = true; this.dom.vsEditorActions.hidden = true;
      this.adapter.start(); this.closeDialog(); this.renderControls();
      this.message(`Player ${this.player + 1}: draw your route and aim. One drop; ${this.config.seconds ? `${this.config.seconds} seconds including drawing.` : 'take your time.'}`);
    }

    get remainingMs() { return Math.max(0, this.config.seconds * 1000 - this.elapsedMs); }
    clockText() {
      const seconds = Math.ceil((this.config.seconds ? this.remainingMs : this.elapsedMs) / 1000);
      return `${this.config.seconds ? '' : '+'}${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
    tick(ms, paused) {
      if (!this.playing || paused || this.paused) return;
      this.elapsedMs += Math.max(0, ms); this.renderControls();
      if (this.config.seconds && this.remainingMs <= 0) this.adapter.timeout();
    }

    capture(data) {
      if (!this.playing) return false;
      this.captured = resultFor({ ...data, elapsedMs: this.elapsedMs }); this.phase = 'landing'; this.renderControls(); return true;
    }

    finishRound() {
      if (this.phase !== 'landing' || !this.captured) return;
      this.results[this.player] = this.captured; this.phase = 'round-result'; this.adapter.conceal();
      const r = this.captured;
      this.dialog('round-result', `Player ${this.player + 1}: ${r.points} points`, `<p>${r.clear ? 'A clean sweep. Every bird, one stone!' : r.reason}</p><dl class="vs-score"><div><dt>Birds cleared</dt><dd>${r.hits} / ${this.config.birds}</dd></div><div><dt>Bird combo</dt><dd>+${r.combo}</dd></div><div><dt>Full clear bonus</dt><dd>+${r.clear ? 100 : 0}</dd></div><div><dt>Turn time</dt><dd>${(r.elapsedMs / 1000).toFixed(1)}s</dd></div></dl>`, [{ label: this.player === 0 ? 'Pass to Player 2' : 'See match results', primary: true, run: () => this.player === 0 ? this.offerTurn(1) : this.showResults() }]);
    }

    showResults() {
      this.phase = 'results'; const won = winner(this.results);
      const title = won === null ? 'An even match!' : `Player ${won + 1} wins!`;
      const rows = this.results.map((r, i) => `<tr${i === won ? ' class="is-winner"' : ''}><th scope="row">Player ${i + 1}</th><td>${r.hits}/${this.config.birds}</td><td>${r.points}</td><td>${(r.elapsedMs / 1000).toFixed(1)}s</td></tr>`).join('');
      this.dialog('results', title, `<p>Two hand-built challenges. One woodland showdown.</p><table class="vs-results"><caption>Match scoreboard</caption><thead><tr><th>Player</th><th>Birds</th><th>Points</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table><p class="vs-rules">Higher points win. Equal scores use the faster turn; turns within 0.1 seconds tie. Zero-bird turns tie. Your campaign is ready where you left it.</p>`, [
        { label: 'Campaign', run: () => this.exit() },
        { label: 'Build new maps', primary: true, run: () => { this.maps = []; this.results = []; this.player = 0; this.startBuild(); } },
      ]);
    }

    pause() {
      if (this.paused) return;
      this.dialog('pause', 'Take a breather.', '<p>The match is paused. Continue when you’re both ready, or return to your campaign.</p>', [
        { label: 'Leave match', run: () => this.exit() }, { label: 'Continue match', primary: true, run: () => this.closeDialog() },
      ]);
    }

    exit() {
      this.cancelPointer(); this.active = false; this.phase = 'campaign'; this.maps = []; this.results = [];
      document.body.classList.remove('vs-active', 'vs-building');
      this.dom.versusPanel.hidden = true; this.dom.vsEditorActions.hidden = true;
      this.dom.versusButton.querySelector('span').textContent = '2 Player VS Mode';
      this.closeDialog(); this.adapter.exit();
    }

    level() {
      const map = this.editing ? this.draft : this.maps[1 - this.player];
      return { id: 'vs', title: `Player ${this.player + 1}'s ${this.editing ? 'workshop' : 'challenge'}`, chapter: '2 Player VS Mode', skill: 'Build and swap', note: '', inkBudget: this.editing ? this.config.platformInk : this.config.solverInk,
        hintAim: 180, hintSegments: [], staticLines: [], platformStrokes: map.strokes,
        birds: map.birds.map((p, index) => ({ index, baseX: p.x, x: p.x, prevX: p.x, y: p.y, laneY: p.y, range: this.editing ? 0 : 6, speed: 1.25 + index * .1, phase: 0, bobAmp: this.editing ? 0 : 2, bodyRadius: 11, alive: true, facing: 1,
          tint: index === 0 ? ['#c96f5e','#7f3d35'] : index === 1 ? ['#8c6b86','#56394e'] : ['#ad815e','#6a4732'] })) };
    }

    drawEditor(ctx) {
      if (!this.editing || this.paused) return;
      ctx.save();
      ctx.fillStyle = '#fffaf014'; ctx.fillRect(CENTER.left, CENTER.top, CENTER.right - CENTER.left, CENTER.bottom - CENTER.top);
      ctx.strokeStyle = this.tool === 'birds' ? '#245446' : '#fffaf0b0'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.strokeRect(CENTER.left, CENTER.top, CENTER.right - CENTER.left, CENTER.bottom - CENTER.top);
      if (this.tool === 'blocks') { ctx.strokeStyle = '#496c66'; ctx.strokeRect(BUILD.left, BUILD.top, BUILD.right - BUILD.left, BUILD.bottom - BUILD.top); }
      ctx.setLineDash([]); ctx.fillStyle = '#fffaf0ed'; ctx.beginPath(); ctx.roundRect(79, 155, 202, 25, 10); ctx.fill();
      ctx.fillStyle = '#173d36'; ctx.font = '800 11px Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.tool === 'birds' ? 'PLACE BIRDS IN THE CENTER' : 'DRAW GRAY PLATFORMS', 180, 172);
      this.draft.birds.forEach((p, i) => {
        ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#173d36'; ctx.beginPath(); ctx.arc(p.x, p.y - 25, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffaf0'; ctx.fillText(String(i + 1), p.x, p.y - 21);
      });
      ctx.restore();
    }

    snapshot() {
      return { active: this.active, phase: this.phase, player: this.player + 1, config: { ...this.config }, elapsedMs: Math.round(this.elapsedMs), remainingMs: this.config.seconds ? Math.round(this.remainingMs) : null,
        dialog: this.dom.versusDialog.open ? this.dialogKind : null, tool: this.tool, platformUsed: this.platformUsed, draft: this.editing ? copy(this.draft) : null, results: copy(this.results) };
    }
  }
  window.WoodlandVersus = WoodlandVersus;
  window.WoodlandVersusRules = Object.freeze({ CENTER, BUILD, length, usedInk, birdAllowed, validMap, resultFor, winner });
})();
