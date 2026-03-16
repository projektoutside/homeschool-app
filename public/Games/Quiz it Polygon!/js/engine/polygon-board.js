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
        this.resizeObserver = null;

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
            showLiveMetric: taskBoard.showLiveMetric || null
        };

        const starterDefinitions = (taskBoard.starterDefinitions || []).map(cloneDefinition);
        this.initialDefinitions = starterDefinitions.map(cloneDefinition);
        this.setDefinitions(starterDefinitions, { preserveHistory: false });
        this.setReadonly(taskBoard.editable === false ? true : false);
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
        this.saveHistory();
        this.notifyChange();
    }

    reset() {
        this.setDefinitions(this.initialDefinitions.map(cloneDefinition), { preserveHistory: false });
    }

    undo() {
        if (this.historyIndex <= 0) return;
        this.historyIndex -= 1;
        this.restoreHistoryState(this.history[this.historyIndex]);
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

    hitVertex(worldPoint) {
        const threshold = Math.max(14, this.gridSize * 0.55);
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

        const worldPoint = this.screenToWorld(event.clientX, event.clientY);
        const hitVertex = this.hitVertex(worldPoint);

        if (hitVertex) {
            this.selectedPolygon = hitVertex.polygon;
            this.selectedVertexIndex = hitVertex.vertexIndex;
            this.drag = {
                type: 'vertex',
                polygon: hitVertex.polygon,
                vertexIndex: hitVertex.vertexIndex
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
                start: worldPoint
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

    handlePointerMove(event) {
        if (!this.drag) return;
        if (this.pointerId !== null && event.pointerId !== this.pointerId) return;

        const worldPoint = snapPointToGrid(this.screenToWorld(event.clientX, event.clientY), this.gridSize);

        if (this.drag.type === 'vertex') {
            this.drag.polygon.vertices[this.drag.vertexIndex] = worldPoint;
            this.notifyChange();
            return;
        }

        if (this.drag.type === 'shape') {
            const deltaX = worldPoint.x - this.drag.start.x;
            const deltaY = worldPoint.y - this.drag.start.y;
            if (deltaX === 0 && deltaY === 0) return;
            this.drag.polygon.move(deltaX, deltaY);
            this.drag.start = worldPoint;
            this.notifyChange();
        }
    }

    handlePointerUp(event) {
        if (!this.drag) return;
        if (this.pointerId !== null && event.pointerId !== this.pointerId) return;
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
