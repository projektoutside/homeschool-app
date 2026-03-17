import {
    Polygon,
    cloneDefinition,
    createPolygonFromDefinition,
    createShapeVertices,
    distance,
    getPolygonCenter,
    getPolygonSummary,
    getShapeLabel,
    snapPointToGrid
} from './geometry.js';

const DEFAULT_COLORS = ['#4f8cff', '#ff8a5b', '#27b07d', '#8c63ff', '#ffbf47'];

function createEmptyActionStats() {
    return {
        shapeCreates: 0,
        plottedPoints: 0,
        drawnPolygons: 0,
        vertexMoves: 0,
        shapeMoves: 0
    };
}

export class PolygonBoard {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onChange = typeof options.onChange === 'function' ? options.onChange : () => { };
        this.gridSize = 24;
        this.polygons = [];
        this.selectedPolygon = null;
        this.selectedVertexIndex = -1;
        this.mode = 'move';
        this.readonly = false;
        this.taskGuide = null;
        this.hintStage = 0;
        this.initialDefinitions = [];
        this.history = [];
        this.historyIndex = -1;
        this.drag = null;
        this.pointerId = null;
        this.activePointerType = 'mouse';
        this.pendingDragPoint = null;
        this.dragFrame = 0;
        this.resizeObserver = null;
        this.draftVertices = [];
        this.actionStats = createEmptyActionStats();

        this.boundHandlePointerDown = this.handlePointerDown.bind(this);
        this.boundHandlePointerMove = this.handlePointerMove.bind(this);
        this.boundHandlePointerUp = this.handlePointerUp.bind(this);
        this.boundHandleResize = this.resize.bind(this);

        this.attach();
        this.resize();
        this.render();
    }

    attach() {
        this.canvas.addEventListener('pointerdown', this.boundHandlePointerDown);
        window.addEventListener('pointermove', this.boundHandlePointerMove);
        window.addEventListener('pointerup', this.boundHandlePointerUp);
        window.addEventListener('pointercancel', this.boundHandlePointerUp);
        window.addEventListener('resize', this.boundHandleResize);

        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.canvas);
        }
    }

    destroy() {
        this.canvas.removeEventListener('pointerdown', this.boundHandlePointerDown);
        window.removeEventListener('pointermove', this.boundHandlePointerMove);
        window.removeEventListener('pointerup', this.boundHandlePointerUp);
        window.removeEventListener('pointercancel', this.boundHandlePointerUp);
        window.removeEventListener('resize', this.boundHandleResize);
        if (this.dragFrame) {
            window.cancelAnimationFrame(this.dragFrame);
            this.dragFrame = 0;
        }
        this.resizeObserver?.disconnect();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
        this.gridSize = this.width < 500 ? 20 : this.width < 900 ? 22 : 24;
        this.render();
    }

    worldToScreen(point) {
        return {
            x: (this.width / 2) + point.x,
            y: (this.height / 2) + point.y
        };
    }

    screenToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left - (rect.width / 2),
            y: clientY - rect.top - (rect.height / 2)
        };
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'draw') {
            this.selectedVertexIndex = -1;
        }
        this.render();
    }

    setReadonly(readonly) {
        this.readonly = readonly;
        this.render();
    }

    setHintStage(stage) {
        this.hintStage = stage;
        this.render();
    }

    loadTaskBoard(taskBoard = {}) {
        this.taskGuide = {
            ...taskBoard,
            guideDefinitions: (taskBoard.guideDefinitions || []).map(cloneDefinition),
            helperBadges: Array.isArray(taskBoard.helperBadges) ? taskBoard.helperBadges.slice() : [],
            showLiveMetric: taskBoard.showLiveMetric || null,
            allowDraw: taskBoard.allowDraw !== false,
            allowShapePicker: taskBoard.allowShapePicker !== false,
            preferredTool: taskBoard.preferredTool || 'move'
        };

        const starterDefinitions = (taskBoard.starterDefinitions || []).map(cloneDefinition);
        this.initialDefinitions = starterDefinitions.map(cloneDefinition);
        this.setDefinitions(starterDefinitions, {
            preserveHistory: false,
            clearDraft: true,
            resetActions: true
        });
        this.setReadonly(taskBoard.editable === false ? true : false);
        this.setMode(taskBoard.editable === false ? 'move' : (this.taskGuide.preferredTool || 'move'));
    }

    setDefinitions(definitions = [], options = {}) {
        this.polygons = definitions.map((definition, index) => createPolygonFromDefinition({
            ...definition,
            color: definition.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            role: definition.role || 'main',
            label: definition.label || ''
        }, {
            grid: this.gridSize
        }));

        this.selectedPolygon = this.polygons.find((polygon) => !polygon.locked) || this.polygons[0] || null;
        this.selectedVertexIndex = -1;
        if (options.clearDraft === true) {
            this.draftVertices = [];
        }
        if (options.resetActions === true) {
            this.resetActionStats();
        }

        if (options.preserveHistory !== true) {
            this.history = [];
            this.historyIndex = -1;
            this.saveHistory();
        }

        this.notifyChange();
    }

    createOrReplaceShape(shapeType) {
        const definition = {
            shapeType,
            color: DEFAULT_COLORS[0],
            name: getShapeLabel(shapeType)
        };

        const freshPolygon = createPolygonFromDefinition(definition, { grid: this.gridSize });
        const lockedPolygons = this.polygons.filter((polygon) => polygon.locked).map((polygon) => polygon.clone());
        this.polygons = [freshPolygon, ...lockedPolygons];
        this.selectedPolygon = freshPolygon;
        this.selectedVertexIndex = -1;
        this.draftVertices = [];
        this.actionStats.shapeCreates += 1;
        this.saveHistory();
        this.notifyChange();
    }

    reset() {
        this.setDefinitions(this.initialDefinitions.map(cloneDefinition), {
            preserveHistory: false,
            clearDraft: true,
            resetActions: true
        });
    }

    undo() {
        if (this.draftVertices.length) {
            this.draftVertices = this.draftVertices.slice(0, -1);
            this.notifyChange();
            return;
        }
        if (this.historyIndex <= 0) return;
        this.historyIndex -= 1;
        this.restoreHistoryState(this.history[this.historyIndex]);
    }

    resetActionStats() {
        this.actionStats = createEmptyActionStats();
    }

    getActionStats() {
        return { ...this.actionStats };
    }

    clearDraft(options = {}) {
        if (!this.draftVertices.length) return;
        this.draftVertices = [];
        if (options.notify !== false) {
            this.notifyChange();
        }
    }

    finishDraft() {
        if (this.draftVertices.length < 3) {
            return false;
        }

        const freshPolygon = new Polygon(this.draftVertices, {
            color: DEFAULT_COLORS[0],
            name: 'Drawn Polygon',
            role: 'main'
        });
        const lockedPolygons = this.polygons.filter((polygon) => polygon.locked).map((polygon) => polygon.clone());
        this.polygons = [freshPolygon, ...lockedPolygons];
        this.selectedPolygon = freshPolygon;
        this.selectedVertexIndex = -1;
        this.draftVertices = [];
        this.actionStats.drawnPolygons += 1;
        this.mode = 'move';
        this.saveHistory();
        this.notifyChange();
        return true;
    }

    saveHistory() {
        const payload = JSON.stringify(this.polygons.map((polygon) => ({
            vertices: polygon.vertices,
            color: polygon.color,
            name: polygon.name,
            role: polygon.role,
            locked: polygon.locked,
            label: polygon.label
        })));

        if (this.historyIndex >= 0 && this.history[this.historyIndex] === payload) {
            return;
        }

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(payload);
        this.historyIndex += 1;

        if (this.history.length > 40) {
            this.history.shift();
            this.historyIndex -= 1;
        }
    }

    restoreHistoryState(payload) {
        const data = JSON.parse(payload);
        this.polygons = data.map((definition) => new Polygon(definition.vertices, definition));
        this.selectedPolygon = this.polygons.find((polygon) => !polygon.locked) || this.polygons[0] || null;
        this.selectedVertexIndex = -1;
        this.notifyChange();
    }

    getSummaries() {
        return this.polygons.map((polygon) => getPolygonSummary(polygon, this.gridSize));
    }

    getPrimarySummary() {
        const editable = this.polygons.find((polygon) => !polygon.locked);
        return editable ? getPolygonSummary(editable, this.gridSize) : this.getSummaries()[0] || null;
    }

    getDebugState() {
        return {
            readonly: this.readonly,
            mode: this.mode,
            polygonCount: this.polygons.length,
            selectedName: this.selectedPolygon?.name || null,
            draftVertexCount: this.draftVertices.length,
            actionStats: this.getActionStats(),
            summaries: this.getSummaries().map((summary) => ({
                name: summary.polygon.name,
                area: Number(summary.area.toFixed(2)),
                perimeter: Number(summary.perimeter.toFixed(2)),
                primaryLabel: summary.analysis.primaryLabel,
                exactMatches: summary.analysis.exactMatches
            })),
            hintStage: this.hintStage
        };
    }

    notifyChange() {
        this.render();
        this.onChange(this.getDebugState());
    }

    getVertexHitThreshold(pointerType = this.activePointerType) {
        if (pointerType === 'touch') {
            return Math.max(20, this.gridSize * 0.92);
        }
        if (pointerType === 'pen') {
            return Math.max(16, this.gridSize * 0.72);
        }
        return Math.max(14, this.gridSize * 0.55);
    }

    getDraftCloseThreshold(pointerType = this.activePointerType) {
        if (pointerType === 'touch') {
            return Math.max(20, this.gridSize * 0.95);
        }
        if (pointerType === 'pen') {
            return Math.max(16, this.gridSize * 0.78);
        }
        return Math.max(14, this.gridSize * 0.7);
    }

    snapPolygonToGrid(polygon) {
        polygon.vertices = polygon.vertices.map((vertex) => snapPointToGrid(vertex, this.gridSize));
    }

    hitVertex(worldPoint, pointerType = this.activePointerType) {
        const threshold = this.getVertexHitThreshold(pointerType);
        for (let i = this.polygons.length - 1; i >= 0; i -= 1) {
            const polygon = this.polygons[i];
            if (polygon.locked) continue;
            for (let vertexIndex = polygon.vertices.length - 1; vertexIndex >= 0; vertexIndex -= 1) {
                if (distance(worldPoint, polygon.vertices[vertexIndex]) <= threshold) {
                    return { polygon, vertexIndex };
                }
            }
        }
        return null;
    }

    hitPolygon(worldPoint) {
        for (let i = this.polygons.length - 1; i >= 0; i -= 1) {
            const polygon = this.polygons[i];
            if (polygon.locked) continue;
            if (polygon.containsPoint(worldPoint)) {
                return polygon;
            }
        }
        return null;
    }

    handlePointerDown(event) {
        if (this.readonly) return;
        if (event.button !== 0 && event.pointerType !== 'touch') return;
        if (event.cancelable) {
            event.preventDefault();
        }

        this.activePointerType = event.pointerType || 'mouse';

        const worldPoint = this.screenToWorld(event.clientX, event.clientY);
        if (this.mode === 'draw') {
            this.handleDrawPointerDown(worldPoint, this.activePointerType);
            return;
        }
        const hitVertex = this.hitVertex(worldPoint, this.activePointerType);

        if (hitVertex) {
            const anchor = hitVertex.polygon.vertices[hitVertex.vertexIndex];
            this.selectedPolygon = hitVertex.polygon;
            this.selectedVertexIndex = hitVertex.vertexIndex;
            this.drag = {
                type: 'vertex',
                polygon: hitVertex.polygon,
                vertexIndex: hitVertex.vertexIndex,
                moved: false,
                pointerType: this.activePointerType,
                offset: {
                    x: anchor.x - worldPoint.x,
                    y: anchor.y - worldPoint.y
                }
            };
            this.pointerId = event.pointerId;
            this.canvas.setPointerCapture?.(event.pointerId);
            this.render();
            return;
        }

        const polygon = this.hitPolygon(worldPoint);
        if (polygon) {
            this.selectedPolygon = polygon;
            this.selectedVertexIndex = -1;
            this.drag = {
                type: 'shape',
                polygon,
                start: worldPoint,
                moved: false,
                pointerType: this.activePointerType
            };
            this.pointerId = event.pointerId;
            this.canvas.setPointerCapture?.(event.pointerId);
            this.render();
            return;
        }

        this.selectedPolygon = this.polygons.find((entry) => !entry.locked) || null;
        this.selectedVertexIndex = -1;
        this.render();
    }

    handleDrawPointerDown(worldPoint, pointerType = this.activePointerType) {
        const snappedPoint = snapPointToGrid(worldPoint, this.gridSize);
        const closeThreshold = this.getDraftCloseThreshold(pointerType);

        if (this.draftVertices.length >= 3 && distance(snappedPoint, this.draftVertices[0]) <= closeThreshold) {
            this.finishDraft();
            return;
        }

        const lastPoint = this.draftVertices[this.draftVertices.length - 1];
        if (lastPoint && distance(snappedPoint, lastPoint) <= 1) {
            return;
        }

        this.draftVertices = [...this.draftVertices, snappedPoint];
        this.actionStats.plottedPoints += 1;
        this.notifyChange();
    }

    flushPendingDrag() {
        if (!this.drag || !this.pendingDragPoint) return;

        const worldPoint = this.pendingDragPoint;
        this.pendingDragPoint = null;

        if (this.drag.type === 'vertex') {
            const adjustedPoint = {
                x: worldPoint.x + (this.drag.offset?.x || 0),
                y: worldPoint.y + (this.drag.offset?.y || 0)
            };
            const nextPoint = this.drag.pointerType === 'touch'
                ? adjustedPoint
                : snapPointToGrid(adjustedPoint, this.gridSize);
            const currentPoint = this.drag.polygon.vertices[this.drag.vertexIndex];

            if (distance(currentPoint, nextPoint) <= 0.25) {
                return;
            }

            this.drag.polygon.vertices[this.drag.vertexIndex] = nextPoint;
            this.drag.moved = true;
            this.notifyChange();
            return;
        }

        if (this.drag.type === 'shape') {
            const nextPoint = this.drag.pointerType === 'touch'
                ? worldPoint
                : snapPointToGrid(worldPoint, this.gridSize);
            const deltaX = nextPoint.x - this.drag.start.x;
            const deltaY = nextPoint.y - this.drag.start.y;
            if (Math.abs(deltaX) < 0.25 && Math.abs(deltaY) < 0.25) {
                return;
            }
            this.drag.polygon.move(deltaX, deltaY);
            this.drag.start = nextPoint;
            this.drag.moved = true;
            this.notifyChange();
        }
    }

    handlePointerMove(event) {
        if (!this.drag) return;
        if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
        if (event.cancelable) {
            event.preventDefault();
        }

        this.pendingDragPoint = this.screenToWorld(event.clientX, event.clientY);
        if (!this.dragFrame) {
            this.dragFrame = window.requestAnimationFrame(() => {
                this.dragFrame = 0;
                this.flushPendingDrag();
            });
        }
    }

    handlePointerUp(event) {
        if (!this.drag) return;
        if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
        if (event.cancelable) {
            event.preventDefault();
        }
        if (this.dragFrame) {
            window.cancelAnimationFrame(this.dragFrame);
            this.dragFrame = 0;
        }
        this.flushPendingDrag();
        if (this.drag.pointerType === 'touch') {
            if (this.drag.type === 'vertex') {
                const currentPoint = this.drag.polygon.vertices[this.drag.vertexIndex];
                this.drag.polygon.vertices[this.drag.vertexIndex] = snapPointToGrid(currentPoint, this.gridSize);
            } else if (this.drag.type === 'shape') {
                this.snapPolygonToGrid(this.drag.polygon);
            }
        }
        if (this.drag.moved) {
            if (this.drag.type === 'vertex') {
                this.actionStats.vertexMoves += 1;
            } else if (this.drag.type === 'shape') {
                this.actionStats.shapeMoves += 1;
            }
        }
        this.pendingDragPoint = null;
        this.pointerId = null;
        this.drag = null;
        this.canvas.releasePointerCapture?.(event.pointerId);
        this.saveHistory();
        this.notifyChange();
    }

    drawGrid() {
        const cols = Math.ceil(this.width / this.gridSize) + 4;
        const rows = Math.ceil(this.height / this.gridSize) + 4;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(21, 74, 123, 0.11)';
        this.ctx.lineWidth = 1;

        for (let col = -cols; col <= cols; col += 1) {
            const x = (this.width / 2) + (col * this.gridSize);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let row = -rows; row <= rows; row += 1) {
            const y = (this.height / 2) + (row * this.gridSize);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(15, 103, 184, 0.18)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawGuide() {
        if (this.hintStage < 2 || !this.taskGuide) return;

        const guidePolygons = (this.taskGuide.guideDefinitions || []).map((definition) => createPolygonFromDefinition(definition, {
            grid: this.gridSize
        }));

        if (!guidePolygons.length && this.taskGuide.guideShape) {
            guidePolygons.push(new Polygon(createShapeVertices(this.taskGuide.guideShape, {
                grid: this.gridSize,
                center: this.taskGuide.guideCenter || { x: 0, y: 0 },
                scale: this.taskGuide.guideScale
            }), {
                color: '#ffbf47',
                name: getShapeLabel(this.taskGuide.guideShape),
                locked: true,
                role: 'guide'
            }));
        }

        this.ctx.save();
        this.ctx.setLineDash([10, 7]);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(255, 174, 51, 0.9)';
        this.ctx.fillStyle = 'rgba(255, 174, 51, 0.12)';
        guidePolygons.forEach((polygon) => this.drawPolygonShape(polygon, { fill: true, handles: false, dashedOnly: true }));
        this.ctx.restore();
    }

    drawDraftShape() {
        if (!this.draftVertices.length) return;

        const screenVertices = this.draftVertices.map((vertex) => this.worldToScreen(vertex));
        this.ctx.save();
        this.ctx.setLineDash([8, 6]);
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeStyle = 'rgba(15, 103, 184, 0.92)';
        this.ctx.beginPath();
        this.ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
        for (let i = 1; i < screenVertices.length; i += 1) {
            this.ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
        }
        if (screenVertices.length >= 3) {
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(15, 103, 184, 0.12)';
            this.ctx.fill();
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        screenVertices.forEach((point, index) => {
            const isFirst = index === 0 && screenVertices.length >= 3;
            this.ctx.beginPath();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = isFirst ? '#ff7c3c' : '#0f67b8';
            this.ctx.lineWidth = isFirst ? 3 : 2;
            this.ctx.arc(point.x, point.y, isFirst ? 7 : 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    drawPolygonShape(polygon, options = {}) {
        if (!polygon.vertices.length) return;
        const screenVertices = polygon.vertices.map((vertex) => this.worldToScreen(vertex));

        this.ctx.beginPath();
        this.ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
        for (let i = 1; i < screenVertices.length; i += 1) {
            this.ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
        }
        this.ctx.closePath();

        if (options.fill !== false) {
            this.ctx.fillStyle = options.fillStyle || `${polygon.color}33`;
            this.ctx.fill();
        }

        this.ctx.strokeStyle = options.strokeStyle || polygon.color;
        this.ctx.lineWidth = options.lineWidth || 2.5;
        this.ctx.stroke();

        if (options.handles === false) return;

        polygon.vertices.forEach((vertex, index) => {
            const point = this.worldToScreen(vertex);
            const isSelected = polygon === this.selectedPolygon && index === this.selectedVertexIndex;
            this.ctx.beginPath();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = isSelected ? '#16314d' : polygon.color;
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.arc(point.x, point.y, isSelected ? 7 : 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    drawPolygonLabels() {
        this.ctx.save();
        this.ctx.font = '800 14px "Trebuchet MS", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.polygons.forEach((polygon) => {
            if (!polygon.label) return;
            const center = this.worldToScreen(getPolygonCenter(polygon));
            this.ctx.beginPath();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
            this.ctx.strokeStyle = 'rgba(22, 49, 77, 0.12)';
            this.ctx.arc(center.x, center.y - 10, 18, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#16314d';
            this.ctx.fillText(polygon.label, center.x, center.y - 10);
        });
        this.ctx.restore();
    }

    drawMetricBadge() {
        if (this.hintStage < 2 || !this.taskGuide?.showLiveMetric) return;
        const summary = this.getPrimarySummary();
        if (!summary) return;
        const label = this.taskGuide.showLiveMetric === 'area'
            ? `Area ${summary.area.toFixed(summary.area % 1 === 0 ? 0 : 1)}`
            : `Around ${summary.perimeter.toFixed(summary.perimeter % 1 === 0 ? 0 : 1)}`;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        this.ctx.strokeStyle = 'rgba(22, 49, 77, 0.12)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.roundedRect(16, 16, 118, 44, 16);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = '#16314d';
        this.ctx.font = '800 14px "Trebuchet MS", sans-serif';
        this.ctx.fillText(label, 28, 42);
        this.ctx.restore();
    }

    roundedRect(x, y, width, height, radius) {
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.ctx.arcTo(x, y + height, x, y, radius);
        this.ctx.arcTo(x, y, x + width, y, radius);
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawGrid();
        this.drawGuide();
        this.drawDraftShape();
        this.polygons.forEach((polygon) => {
            const isSelected = polygon === this.selectedPolygon && !this.readonly;
            this.drawPolygonShape(polygon, {
                strokeStyle: isSelected ? '#16314d' : polygon.color,
                fillStyle: polygon.locked ? `${polygon.color}20` : `${polygon.color}35`,
                lineWidth: isSelected ? 3 : 2.5,
                handles: !polygon.locked && !this.readonly
            });
        });
        this.drawPolygonLabels();
        this.drawMetricBadge();
    }
}
