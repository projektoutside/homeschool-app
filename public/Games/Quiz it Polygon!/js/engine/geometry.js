export const SHAPE_LABELS = {
    triangle: 'Triangle',
    'right-triangle': 'Right Triangle',
    'acute-triangle': 'Acute Triangle',
    'obtuse-triangle': 'Obtuse Triangle',
    square: 'Square',
    rectangle: 'Rectangle',
    parallelogram: 'Parallelogram',
    rhombus: 'Rhombus',
    trapezoid: 'Trapezoid',
    pentagon: 'Pentagon',
    hexagon: 'Hexagon',
    heptagon: 'Heptagon',
    octagon: 'Octagon'
};

const EXACT_LABEL_PRIORITY = [
    'Square',
    'Equilateral Triangle',
    'Right Triangle',
    'Obtuse Triangle',
    'Acute Triangle',
    'Rectangle',
    'Rhombus',
    'Parallelogram',
    'Isosceles Trapezoid',
    'Trapezoid',
    'Kite',
    'Dart',
    'Isosceles Triangle',
    'Scalene Triangle'
];

export class Polygon {
    constructor(vertices = [], options = {}) {
        this.vertices = vertices.map(clonePoint);
        this.color = options.color || '#4c8dff';
        this.name = options.name || 'Polygon';
        this.role = options.role || 'main';
        this.locked = options.locked === true;
        this.label = options.label || '';
    }

    clone() {
        return new Polygon(this.vertices, {
            color: this.color,
            name: this.name,
            role: this.role,
            locked: this.locked,
            label: this.label
        });
    }

    containsPoint(point) {
        let inside = false;
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x;
            const yi = this.vertices[i].y;
            const xj = this.vertices[j].x;
            const yj = this.vertices[j].y;
            const intersects = ((yi > point.y) !== (yj > point.y))
                && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi);
            if (intersects) inside = !inside;
        }
        return inside;
    }

    move(dx, dy) {
        this.vertices = this.vertices.map((vertex) => ({ x: vertex.x + dx, y: vertex.y + dy }));
    }
}

export function clonePoint(point) {
    return { x: point.x, y: point.y };
}

export function cloneDefinition(definition = {}) {
    return JSON.parse(JSON.stringify(definition));
}

export function getShapeLabel(shapeType) {
    return SHAPE_LABELS[shapeType] || `${shapeType.charAt(0).toUpperCase()}${shapeType.slice(1)}`;
}

export function createShapeVertices(shapeType, options = {}) {
    const center = options.center || { x: 0, y: 0 };
    const grid = options.grid || 24;
    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    const withScale = (value) => Math.round((value * scale) / grid) * grid;
    const centerX = center.x;
    const centerY = center.y;
    let vertices = [];

    switch (shapeType) {
        case 'triangle': {
            const size = withScale(60);
            vertices = [
                { x: centerX, y: centerY - size * 0.577 },
                { x: centerX - size * 0.5, y: centerY + size * 0.289 },
                { x: centerX + size * 0.5, y: centerY + size * 0.289 }
            ];
            break;
        }
        case 'right-triangle': {
            const width = withScale(96);
            const height = withScale(72);
            vertices = [
                { x: centerX - width / 2, y: centerY + height / 2 },
                { x: centerX + width / 2, y: centerY + height / 2 },
                { x: centerX - width / 2, y: centerY - height / 2 }
            ];
            break;
        }
        case 'acute-triangle': {
            const width = withScale(88);
            const height = withScale(84);
            vertices = [
                { x: centerX, y: centerY - height / 2 },
                { x: centerX - width / 2, y: centerY + height / 2 },
                { x: centerX + width / 2, y: centerY + height / 2 }
            ];
            break;
        }
        case 'obtuse-triangle': {
            const width = withScale(136);
            const height = withScale(66);
            vertices = [
                { x: centerX - width / 2, y: centerY + height / 2 },
                { x: centerX + width / 2, y: centerY + height / 2 },
                { x: centerX, y: centerY }
            ];
            break;
        }
        case 'square': {
            const size = withScale(72);
            const half = size / 2;
            vertices = [
                { x: centerX - half, y: centerY - half },
                { x: centerX + half, y: centerY - half },
                { x: centerX + half, y: centerY + half },
                { x: centerX - half, y: centerY + half }
            ];
            break;
        }
        case 'rectangle': {
            const width = withScale(96);
            const height = withScale(72);
            vertices = [
                { x: centerX - width / 2, y: centerY - height / 2 },
                { x: centerX + width / 2, y: centerY - height / 2 },
                { x: centerX + width / 2, y: centerY + height / 2 },
                { x: centerX - width / 2, y: centerY + height / 2 }
            ];
            break;
        }
        case 'parallelogram': {
            const width = withScale(120);
            const height = withScale(84);
            const skew = withScale(42);
            vertices = [
                { x: centerX - width / 2, y: centerY - height / 2 },
                { x: centerX + width / 2, y: centerY - height / 2 },
                { x: centerX + width / 2 + skew, y: centerY + height / 2 },
                { x: centerX - width / 2 + skew, y: centerY + height / 2 }
            ];
            break;
        }
        case 'rhombus': {
            const horizontal = withScale(72);
            const vertical = withScale(96);
            vertices = [
                { x: centerX, y: centerY - vertical / 2 },
                { x: centerX + horizontal / 2, y: centerY },
                { x: centerX, y: centerY + vertical / 2 },
                { x: centerX - horizontal / 2, y: centerY }
            ];
            break;
        }
        case 'trapezoid': {
            const topWidth = withScale(84);
            const baseWidth = withScale(144);
            const height = withScale(84);
            vertices = [
                { x: centerX - topWidth / 2, y: centerY - height / 2 },
                { x: centerX + topWidth / 2, y: centerY - height / 2 },
                { x: centerX + baseWidth / 2, y: centerY + height / 2 },
                { x: centerX - baseWidth / 2, y: centerY + height / 2 }
            ];
            break;
        }
        case 'pentagon':
            vertices = createRegularPolygon(5, withScale(56), centerX, centerY);
            break;
        case 'hexagon':
            vertices = createRegularPolygon(6, withScale(48), centerX, centerY);
            break;
        case 'heptagon':
            vertices = createRegularPolygon(7, withScale(42), centerX, centerY);
            break;
        case 'octagon':
            vertices = createRegularPolygon(8, withScale(40), centerX, centerY);
            break;
        default:
            vertices = createShapeVertices('triangle', options);
            break;
    }

    return vertices.map((vertex) => snapPointToGrid(vertex, grid));
}

export function createPolygonFromDefinition(definition = {}, options = {}) {
    const grid = options.grid || 24;
    const color = definition.color || options.color || '#4c8dff';
    const name = definition.name || getShapeLabel(definition.shapeType || 'triangle');
    const vertices = Array.isArray(definition.vertices)
        ? definition.vertices.map((vertex) => snapPointToGrid(vertex, grid))
        : createShapeVertices(definition.shapeType || 'triangle', {
            center: definition.center || options.center || { x: 0, y: 0 },
            scale: definition.scale,
            grid
        });

    return new Polygon(vertices, {
        color,
        name,
        locked: definition.locked === true,
        role: definition.role || 'main',
        label: definition.label || ''
    });
}

export function snapPointToGrid(point, grid) {
    return {
        x: Math.round(point.x / grid) * grid,
        y: Math.round(point.y / grid) * grid
    };
}

export function getPolygonSummary(polygon, grid) {
    if (!polygon) return null;
    const analysis = getPolygonAnalysis(polygon, grid);
    return {
        polygon,
        analysis,
        vertices: polygon.vertices.length,
        area: Math.abs(getSignedArea(polygon.vertices)) / (grid * grid),
        perimeter: getPerimeter(polygon.vertices) / grid
    };
}

export function getPerimeter(vertices) {
    let total = 0;
    for (let i = 0; i < vertices.length; i += 1) {
        total += distance(vertices[i], vertices[(i + 1) % vertices.length]);
    }
    return total;
}

export function distance(pointA, pointB) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

export function getPolygonCenter(polygon) {
    const vertices = polygon.vertices;
    if (!vertices.length) return { x: 0, y: 0 };
    const total = vertices.reduce((acc, vertex) => ({
        x: acc.x + vertex.x,
        y: acc.y + vertex.y
    }), { x: 0, y: 0 });
    return {
        x: total.x / vertices.length,
        y: total.y / vertices.length
    };
}

export function areValuesClose(a, b, tolerance) {
    return Math.abs(a - b) <= tolerance;
}

function createRegularPolygon(sides, radius, centerX, centerY) {
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;
    return Array.from({ length: sides }, (_, index) => ({
        x: centerX + (Math.cos(startAngle + angleStep * index) * radius),
        y: centerY + (Math.sin(startAngle + angleStep * index) * radius)
    }));
}

function getSignedArea(vertices) {
    let area = 0;
    for (let i = 0; i < vertices.length; i += 1) {
        const next = vertices[(i + 1) % vertices.length];
        area += vertices[i].x * next.y;
        area -= next.x * vertices[i].y;
    }
    return area / 2;
}

function getPolygonFamilyName(sideCount) {
    const names = {
        3: 'Triangle',
        4: 'Quadrilateral',
        5: 'Pentagon',
        6: 'Hexagon',
        7: 'Heptagon',
        8: 'Octagon',
        9: 'Nonagon',
        10: 'Decagon'
    };
    return names[sideCount] || `${sideCount}-gon`;
}

function getLengthTolerance(lengths, grid) {
    const validLengths = lengths.filter((length) => Number.isFinite(length) && length > 0);
    if (!validLengths.length) {
        return Math.max(0.5, grid * 0.04);
    }

    const average = validLengths.reduce((sum, length) => sum + length, 0) / validLengths.length;
    return Math.max(0.5, grid * 0.04, average * 0.015);
}

function getSegmentOrientation(a, b, c, epsilon = 1e-6) {
    const value = ((b.y - a.y) * (c.x - b.x)) - ((b.x - a.x) * (c.y - b.y));
    if (Math.abs(value) <= epsilon) return 0;
    return value > 0 ? 1 : -1;
}

function isPointOnSegment(point, start, end, epsilon = 1e-6) {
    return point.x <= Math.max(start.x, end.x) + epsilon
        && point.x >= Math.min(start.x, end.x) - epsilon
        && point.y <= Math.max(start.y, end.y) + epsilon
        && point.y >= Math.min(start.y, end.y) - epsilon;
}

function segmentsIntersect(a, b, c, d, epsilon = 1e-6) {
    const o1 = getSegmentOrientation(a, b, c, epsilon);
    const o2 = getSegmentOrientation(a, b, d, epsilon);
    const o3 = getSegmentOrientation(c, d, a, epsilon);
    const o4 = getSegmentOrientation(c, d, b, epsilon);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && isPointOnSegment(c, a, b, epsilon)) return true;
    if (o2 === 0 && isPointOnSegment(d, a, b, epsilon)) return true;
    if (o3 === 0 && isPointOnSegment(a, c, d, epsilon)) return true;
    if (o4 === 0 && isPointOnSegment(b, c, d, epsilon)) return true;
    return false;
}

function isSelfIntersecting(vertices) {
    if (vertices.length < 4) return false;
    for (let i = 0; i < vertices.length; i += 1) {
        const nextI = (i + 1) % vertices.length;
        for (let j = i + 1; j < vertices.length; j += 1) {
            const nextJ = (j + 1) % vertices.length;
            const sharesEndpoint = i === j || i === nextJ || nextI === j;
            const closesLoop = i === 0 && nextJ === 0;
            if (sharesEndpoint || closesLoop) continue;
            if (segmentsIntersect(vertices[i], vertices[nextI], vertices[j], vertices[nextJ])) {
                return true;
            }
        }
    }
    return false;
}

function isParallel(vecA, vecB, tolerance = 0.035) {
    const lenA = Math.hypot(vecA.x, vecA.y);
    const lenB = Math.hypot(vecB.x, vecB.y);
    if (lenA === 0 || lenB === 0) return false;
    const cross = (vecA.x * vecB.y) - (vecA.y * vecB.x);
    return Math.abs(cross / (lenA * lenB)) <= tolerance;
}

function getInteriorAngles(vertices) {
    const signedArea = getSignedArea(vertices);
    const orientationSign = signedArea >= 0 ? 1 : -1;
    const angles = [];

    for (let i = 0; i < vertices.length; i += 1) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const current = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const toPrev = { x: prev.x - current.x, y: prev.y - current.y };
        const toNext = { x: next.x - current.x, y: next.y - current.y };
        const prevLength = Math.hypot(toPrev.x, toPrev.y);
        const nextLength = Math.hypot(toNext.x, toNext.y);

        if (prevLength === 0 || nextLength === 0) {
            angles.push(Number.NaN);
            continue;
        }

        const dot = (toPrev.x * toNext.x) + (toPrev.y * toNext.y);
        const cross = (toPrev.x * toNext.y) - (toPrev.y * toNext.x);
        const cosine = Math.min(1, Math.max(-1, dot / (prevLength * nextLength)));
        const baseAngle = Math.acos(cosine) * 180 / Math.PI;
        const isReflex = (cross * orientationSign) > 1e-6;
        angles.push(isReflex ? 360 - baseAngle : baseAngle);
    }

    return angles;
}

export function getPolygonAnalysis(polygon, grid = 24) {
    const vertices = polygon?.vertices || [];
    const sideCount = vertices.length;
    const familyName = getPolygonFamilyName(sideCount);
    const familyLabels = ['Polygon', familyName];
    const exactMatches = [];
    const traits = [];
    const notes = [];

    const sideLengths = vertices.map((vertex, index) => distance(vertex, vertices[(index + 1) % sideCount]));
    const lengthTolerance = getLengthTolerance(sideLengths, grid);
    const angleTolerance = 1.5;
    const areaMagnitude = Math.abs(getSignedArea(vertices));
    const areaTolerance = Math.max(1, grid * grid * 0.01);
    const hasZeroLengthSide = sideLengths.some((length) => length <= Math.max(0.5, lengthTolerance * 0.5));
    const isSimple = !isSelfIntersecting(vertices);
    const interiorAngles = isSimple ? getInteriorAngles(vertices) : [];
    const hasInvalidAngles = interiorAngles.some((angle) => !Number.isFinite(angle));
    const isDegenerate = areaMagnitude <= areaTolerance || hasZeroLengthSide || hasInvalidAngles;
    const isConvex = isSimple && !isDegenerate && interiorAngles.every((angle) => angle < (180 + angleTolerance));
    const isConcave = isSimple && !isDegenerate && !isConvex;
    const equilateral = sideLengths.length > 0 && sideLengths.every((length) => areValuesClose(length, sideLengths[0], lengthTolerance));
    const equiangular = interiorAngles.length === sideCount
        && interiorAngles.every((angle) => areValuesClose(angle, interiorAngles[0], angleTolerance));
    const isRegular = isSimple && !isDegenerate && isConvex && equilateral && equiangular;

    traits.push(isSimple ? (isConcave ? 'Concave' : 'Convex') : 'Complex Polygon');
    if (!isSimple) notes.push('Self-crossing shape');
    if (isDegenerate) {
        traits.push('Degenerate');
        notes.push('Move the corners so the shape holds area.');
    }
    if (equilateral && !isDegenerate) traits.push('Equal Sides');
    if (equiangular && !isDegenerate) traits.push('Equal Angles');
    traits.push(isRegular ? 'Regular Polygon' : 'Irregular Polygon');

    if (sideCount === 3 && isSimple && !isDegenerate) {
        const equalPairs = [
            areValuesClose(sideLengths[0], sideLengths[1], lengthTolerance),
            areValuesClose(sideLengths[1], sideLengths[2], lengthTolerance),
            areValuesClose(sideLengths[0], sideLengths[2], lengthTolerance)
        ];

        if (equilateral) {
            exactMatches.push('Equilateral Triangle', 'Isosceles Triangle');
        } else if (equalPairs.some(Boolean)) {
            exactMatches.push('Isosceles Triangle');
        } else {
            exactMatches.push('Scalene Triangle');
        }

        if (interiorAngles.some((angle) => areValuesClose(angle, 90, angleTolerance))) {
            exactMatches.push('Right Triangle');
        } else if (interiorAngles.some((angle) => angle > (90 + angleTolerance))) {
            exactMatches.push('Obtuse Triangle');
        } else {
            exactMatches.push('Acute Triangle');
        }
    }

    if (sideCount === 4 && isSimple && !isDegenerate) {
        const edges = vertices.map((vertex, index) => ({
            x: vertices[(index + 1) % sideCount].x - vertex.x,
            y: vertices[(index + 1) % sideCount].y - vertex.y
        }));

        const oppositeParallelA = isParallel(edges[0], edges[2]);
        const oppositeParallelB = isParallel(edges[1], edges[3]);
        const parallelPairCount = Number(oppositeParallelA) + Number(oppositeParallelB);
        const rightAngleCount = interiorAngles.filter((angle) => areValuesClose(angle, 90, angleTolerance)).length;
        const rectangle = rightAngleCount === 4;
        const rhombus = equilateral;
        const parallelogram = oppositeParallelA && oppositeParallelB;
        const trapezoid = parallelPairCount === 1;
        const legLengths = oppositeParallelA ? [sideLengths[1], sideLengths[3]] : [sideLengths[0], sideLengths[2]];
        const isoscelesTrapezoid = trapezoid && areValuesClose(legLengths[0], legLengths[1], lengthTolerance);
        const adjacentPairPattern = (
            (areValuesClose(sideLengths[0], sideLengths[1], lengthTolerance)
                && areValuesClose(sideLengths[2], sideLengths[3], lengthTolerance))
            || (areValuesClose(sideLengths[1], sideLengths[2], lengthTolerance)
                && areValuesClose(sideLengths[3], sideLengths[0], lengthTolerance))
        );
        const kite = adjacentPairPattern && !equilateral && !parallelogram;

        if (rectangle && rhombus) exactMatches.push('Square');
        if (rectangle) exactMatches.push('Rectangle');
        if (rhombus) exactMatches.push('Rhombus');
        if (parallelogram) exactMatches.push('Parallelogram');
        if (isoscelesTrapezoid) exactMatches.push('Isosceles Trapezoid');
        if (trapezoid) exactMatches.push('Trapezoid');
        if (kite) exactMatches.push(isConvex ? 'Kite' : 'Dart');
    }

    if (sideCount >= 5 && isRegular) {
        exactMatches.push(`Regular ${familyName}`);
    }

    const prioritizedExactMatches = [...new Set(exactMatches.filter(Boolean))].sort((left, right) => {
        const leftIndex = EXACT_LABEL_PRIORITY.indexOf(left);
        const rightIndex = EXACT_LABEL_PRIORITY.indexOf(right);
        const leftRank = leftIndex === -1 ? EXACT_LABEL_PRIORITY.length : leftIndex;
        const rightRank = rightIndex === -1 ? EXACT_LABEL_PRIORITY.length : rightIndex;
        return leftRank - rightRank;
    });
    const primaryLabel = prioritizedExactMatches[0] || (isRegular ? `Regular ${familyName}` : familyName);
    return {
        primaryLabel,
        familyLabels: [...new Set(familyLabels.filter(Boolean))],
        exactMatches: prioritizedExactMatches,
        traits: [...new Set(traits.filter(Boolean))],
        notes: [...new Set(notes.filter(Boolean))]
    };
}
