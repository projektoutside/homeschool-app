
class Geometry {
    static get EPS() {
        return {
            INTERSECTION: 1e-9,
            POINT: 1e-6,
            COLLINEAR: 1e-6,
            MIN_EDGE: 1e-6,
            MIN_AREA: 1e-8
        };
    }

    static isFinitePoint(p) {
        return !!p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y));
    }

    static robustArea(vertices, minAbsArea = Geometry.EPS.MIN_AREA) {
        if (!Array.isArray(vertices) || vertices.length < 3) return 0;
        const area = Math.abs(this.getArea(vertices));
        if (!Number.isFinite(area)) return 0;
        return area < minAbsArea ? 0 : area;
    }

    static sanitizePolygon(vertices, opts = {}) {
        if (!Array.isArray(vertices) || vertices.length < 3) return null;
        const pointEps = Number.isFinite(opts.pointEps) ? opts.pointEps : Geometry.EPS.POINT;
        const minEdgeSq = Math.max(Geometry.EPS.MIN_EDGE, Number(opts.minEdge || 0)) ** 2;
        const collinearEps = Number.isFinite(opts.collinearEps) ? opts.collinearEps : Geometry.EPS.COLLINEAR;
        const minAbsArea = Number.isFinite(opts.minAbsArea) ? opts.minAbsArea : Geometry.EPS.MIN_AREA;

        const base = vertices
            .map(v => ({ x: Number(v?.x), y: Number(v?.y) }))
            .filter(v => Number.isFinite(v.x) && Number.isFinite(v.y));
        if (base.length < 3) return null;

        // Remove consecutive duplicates / zero-length edges.
        const deduped = [];
        for (let i = 0; i < base.length; i++) {
            const v = base[i];
            const prev = deduped[deduped.length - 1];
            if (!prev || this.distSq(prev, v) > pointEps * pointEps) {
                deduped.push(v);
            }
        }
        while (deduped.length > 2 && this.distSq(deduped[0], deduped[deduped.length - 1]) <= pointEps * pointEps) {
            deduped.pop();
        }
        if (deduped.length < 3) return null;

        // Remove micro-edges.
        const edgeClean = [];
        for (let i = 0; i < deduped.length; i++) {
            const a = deduped[i];
            const b = deduped[(i + 1) % deduped.length];
            if (this.distSq(a, b) > minEdgeSq || deduped.length <= 3) {
                edgeClean.push(a);
            }
        }
        if (edgeClean.length < 3) return null;

        // Remove near-collinear points robustly.
        const out = [];
        const n = edgeClean.length;
        for (let i = 0; i < n; i++) {
            const prev = edgeClean[(i - 1 + n) % n];
            const curr = edgeClean[i];
            const next = edgeClean[(i + 1) % n];
            const v1x = curr.x - prev.x;
            const v1y = curr.y - prev.y;
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            const len1 = Math.hypot(v1x, v1y);
            const len2 = Math.hypot(v2x, v2y);
            if (len1 <= pointEps || len2 <= pointEps) continue;
            const cross = Math.abs(v1x * v2y - v1y * v2x) / (len1 * len2 + 1e-12);
            if (cross <= collinearEps && n > 3) continue;
            out.push(curr);
        }

        if (out.length < 3) return null;
        const area = this.robustArea(out, minAbsArea);
        if (!(area > 0)) return null;
        return out;
    }

    static sanitizePieces(pieces, totalArea = 0, opts = {}) {
        if (!Array.isArray(pieces) || pieces.length === 0) return [];
        const minAreaRatio = Number.isFinite(opts.minAreaRatio) ? opts.minAreaRatio : 0.0008;
        const minAbsArea = Math.max(
            Number.isFinite(opts.minAbsArea) ? opts.minAbsArea : Geometry.EPS.MIN_AREA,
            Math.max(0, Number(totalArea) || 0) * Math.max(0, minAreaRatio)
        );

        const out = [];
        const seen = new Set();
        pieces.forEach(piece => {
            const verts = this.sanitizePolygon(piece?.vertices, {
                pointEps: opts.pointEps,
                minEdge: opts.minEdge,
                collinearEps: opts.collinearEps,
                minAbsArea
            });
            if (!verts) return;
            const area = this.robustArea(verts, minAbsArea);
            if (!(area > 0)) return;

            const c = this.getPolygonCenter(verts) || { x: 0, y: 0 };
            const sig = `${Math.round(c.x * 1000)}:${Math.round(c.y * 1000)}:${Math.round(area * 1000)}:${verts.length}`;
            if (seen.has(sig)) return;
            seen.add(sig);

            out.push({ vertices: verts });
        });
        return out;
    }

    // --- Basic Geometric Primitives ---

    static getIntersectionInfiniteLine(segment, line) {
        const x1 = segment.p1.x, y1 = segment.p1.y;
        const x2 = segment.p2.x, y2 = segment.p2.y;
        const x3 = line.p1.x, y3 = line.p1.y;
        const x4 = line.p2.x, y4 = line.p2.y;

        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (Math.abs(denom) < 1e-9) return null; // Parallel

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;

        if (ua >= -1e-9 && ua <= 1 + 1e-9) {
            return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1)
            };
        }
        return null;
    }

    // --- Core Splitting Logic ---

    // Hybrid Split Algorithm:
    // 1. Precise Hit Detection (Vertex/Edge)
    // 2. If 1 Cut (2 hits) -> Use Fast "Simple Split" (Guarantees reliability)
    // 3. If Multi Cut (>2 hits) -> Use Advanced "Graph Split" (Handles holes/forks)
    static split(polygon, lineStart, lineEnd) {
        const vertices = polygon.vertices;
        const rawHits = [];
        const cutLine = { p1: lineStart, p2: lineEnd };

        // 1. Find all intersections
        for (let i = 0; i < vertices.length; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            const seg = { p1: current, p2: next };

            const inter = this.getIntersectionInfiniteLine(seg, cutLine);
            if (inter) {
                const distToStart = this.distSq(inter, current);
                const distToEnd = this.distSq(inter, next);

                if (distToStart < 1e-6) {
                    rawHits.push({ type: 'vertex', index: i, point: current, dist: this.projectDist(lineStart, lineEnd, current) });
                } else if (distToEnd < 1e-6) {
                    rawHits.push({ type: 'vertex', index: (i + 1) % vertices.length, point: next, dist: this.projectDist(lineStart, lineEnd, next) });
                } else {
                    rawHits.push({ type: 'edge', index: i, point: inter, dist: this.projectDist(lineStart, lineEnd, inter) });
                }
            }
        }

        rawHits.sort((a, b) => a.dist - b.dist);

        // Deduplicate
        const uniqueHits = [];
        if (rawHits.length > 0) {
            uniqueHits.push(rawHits[0]);
            for (let k = 1; k < rawHits.length; k++) {
                const prev = uniqueHits[uniqueHits.length - 1];
                const curr = rawHits[k];
                if (this.distSq(prev.point, curr.point) > 1e-6) {
                    uniqueHits.push(curr);
                } else {
                    if (curr.type === 'vertex' && prev.type !== 'vertex') {
                        uniqueHits[uniqueHits.length - 1] = curr;
                    }
                }
            }
        }

        if (uniqueHits.length < 2) return null;

        // Identify valid segments
        const cutSegments = [];
        for (let i = 0; i < uniqueHits.length - 1; i++) {
            const h1 = uniqueHits[i];
            const h2 = uniqueHits[i + 1];
            const mid = { x: (h1.point.x + h2.point.x) / 2, y: (h1.point.y + h2.point.y) / 2 };
            if (this.isPointInside(mid, vertices)) {
                cutSegments.push({ start: h1, end: h2 });
            }
        }

        if (cutSegments.length === 0) return null;

        // HYBRID PATH SELECTION
        // If it's a simple single cut (most common case), use the robust Simple Split
        if (uniqueHits.length === 2 && cutSegments.length === 1) {
            return this.splitSimple(polygon, uniqueHits);
        }

        // Otherwise use the advanced Graph Split
        return this.splitGraph(vertices, uniqueHits, cutSegments);
    }

    // --- Simple Split (Legacy-style Robustness) ---
    static splitSimple(polygon, hits) {
        const vertices = polygon.vertices;
        const hit1 = hits[0];
        const hit2 = hits[1];

        // Build circular list of points: Original Vertices + Inserted Hits
        const allPoints = [];
        let idx1 = -1, idx2 = -1;

        // We traverse original edges.
        // If a hit is on edge i, it goes AFTER vertex i.
        // If a hit IS vertex i, we mark vertex i as the split point.

        // Use a more unified approach: Just iterate vertices and check hits
        // We need to know 'hit1' corresponds to which edge/vertex.

        // Helper to insert
        const insertHit = (h) => {
            return { x: h.point.x, y: h.point.y, isSplit: true };
        };

        // There are 2 hits.
        // We know their 'index' (edge index or vertex index).
        // If hit is 'vertex', its index is the vertex index.
        // If hit is 'edge', its index is the edge starting at vertex index.

        // Sort hits by where they appear in the polygon perimeter order
        // Order: edge 0, edge 1, ...
        // If on same edge, sort by distance from start? (Only relevant if >2 hits, which is not this case)

        // Let's rely on 'index'. 
        // Note: uniqueHits are sorted by 'dist' (line order), NOT perimeter order.
        // We need them in perimeter order to construct 'allPoints' correctly.

        const perimHits = [...hits].sort((a, b) => {
            if (a.index !== b.index) return a.index - b.index;
            // Same index (shouldn't happen for 2 hits unless same edge)
            // If same edge, distance from vertex[a.index]
            return this.distSq(vertices[a.index], a.point) - this.distSq(vertices[b.index], b.point);
        });

        // Now construct list
        for (let i = 0; i < vertices.length; i++) {
            // Add vertex i
            // Check if any hit matches this vertex
            const vHit = perimHits.find(h => h.type === 'vertex' && h.index === i);

            if (vHit) {
                const pt = insertHit(vHit);
                if (vHit === hits[0]) idx1 = allPoints.length;
                else idx2 = allPoints.length;
                allPoints.push(pt);
            } else {
                allPoints.push({ x: vertices[i].x, y: vertices[i].y });
            }

            // Check if any hit is on edge i (and NOT vertex type)
            const eHit = perimHits.find(h => h.type === 'edge' && h.index === i);
            if (eHit) {
                const pt = insertHit(eHit);
                if (eHit === hits[0]) idx1 = allPoints.length;
                else idx2 = allPoints.length;
                allPoints.push(pt);
            }
        }

        if (idx1 === -1 || idx2 === -1) return null; // Should not happen

        // Ensure idx1 < idx2 for easier slicing logic
        // But hits[0] and hits[1] are arbitrary.
        // We need the indices in 'allPoints' corresponding to the CUT endpoints.

        // Slice!
        // Poly 1: idx1 -> idx2
        const poly1Pts = [];
        let curr = idx1;
        while (curr !== idx2) {
            poly1Pts.push(allPoints[curr]);
            curr = (curr + 1) % allPoints.length;
        }
        poly1Pts.push(allPoints[idx2]);

        // Poly 2: idx2 -> idx1
        const poly2Pts = [];
        curr = idx2;
        while (curr !== idx1) {
            poly2Pts.push(allPoints[curr]);
            curr = (curr + 1) % allPoints.length;
        }
        poly2Pts.push(allPoints[idx1]);

        return [poly1Pts, poly2Pts];
    }

    // --- Graph Split (Advanced) ---
    static splitGraph(vertices, uniqueHits, segments) {
        let nodes = vertices.map((v, i) => ({ id: i, x: v.x, y: v.y }));
        let nextNodeId = nodes.length;

        const edgeInsertions = {};
        uniqueHits.forEach(h => {
            if (h.type === 'vertex') {
                h.nodeId = h.index;
            } else {
                h.nodeId = nextNodeId++;
                if (!edgeInsertions[h.index]) edgeInsertions[h.index] = [];
                edgeInsertions[h.index].push(h);
            }
        });

        const finalNodeList = [];
        const nodeMap = {};

        for (let i = 0; i < vertices.length; i++) {
            const vNode = nodes[i];
            finalNodeList.push(vNode);
            nodeMap[vNode.id] = vNode;

            if (edgeInsertions[i]) {
                edgeInsertions[i].sort((a, b) => this.distSq(vertices[i], a.point) - this.distSq(vertices[i], b.point));
                edgeInsertions[i].forEach(h => {
                    const n = { id: h.nodeId, x: h.point.x, y: h.point.y };
                    finalNodeList.push(n);
                    nodeMap[n.id] = n;
                });
            }
        }

        const adj = {};
        finalNodeList.forEach(n => adj[n.id] = []);
        const L = finalNodeList.length;

        for (let i = 0; i < L; i++) {
            const curr = finalNodeList[i];
            const next = finalNodeList[(i + 1) % L];
            const prev = finalNodeList[(i - 1 + L) % L];
            adj[curr.id].push(next.id);
            adj[curr.id].push(prev.id);
        }

        segments.forEach(seg => {
            const u = seg.start.nodeId;
            const v = seg.end.nodeId;
            if (!adj[u].includes(v)) adj[u].push(v);
            if (!adj[v].includes(u)) adj[v].push(u);
        });

        const visitedEdges = new Set();
        const newPolygons = [];
        const getAngle = (u, v) => Math.atan2(v.y - u.y, v.x - u.x);
        const normalize = (a) => {
            a = a % (Math.PI * 2);
            return a < 0 ? a + Math.PI * 2 : a;
        };

        for (let i = 0; i < finalNodeList.length; i++) {
            const uNode = finalNodeList[i];
            for (let neighborId of adj[uNode.id]) {
                const u = uNode.id;
                const v = neighborId;
                if (visitedEdges.has(`${u}-${v}`)) continue;

                const cycle = [];
                let curr = u;
                let next = v;
                let steps = 0;
                let pathClosed = false;

                while (true) {
                    visitedEdges.add(`${curr}-${next}`);
                    cycle.push(nodeMap[curr]);
                    if (next === u) { pathClosed = true; break; }
                    if (steps++ > L * 4) break;

                    const prevNode = nodeMap[curr];
                    const centerNode = nodeMap[next];
                    const incomingAngle = getAngle(prevNode, centerNode);
                    const entryAngle = normalize(incomingAngle + Math.PI);

                    let bestNextId = null;
                    let minAngleDiff = Infinity;
                    for (let candId of adj[centerNode.id]) {
                        const candNode = nodeMap[candId];
                        const outgoingAngle = normalize(getAngle(centerNode, candNode));
                        let diff = normalize(outgoingAngle - entryAngle);
                        if (diff < minAngleDiff) {
                            minAngleDiff = diff;
                            bestNextId = candId;
                        }
                    }
                    if (bestNextId === null) break;
                    curr = next;
                    next = bestNextId;
                }

                if (pathClosed && cycle.length > 2) {
                    let area = 0;
                    for (let k = 0; k < cycle.length; k++) {
                        const c = cycle[k];
                        const d = cycle[(k + 1) % cycle.length];
                        area += (c.x * d.y - d.x * c.y);
                    }
                    area /= 2;
                    if (area > 1e-3) newPolygons.push(cycle.map(v => ({ x: v.x, y: v.y })));
                }
            }
        }
        return newPolygons.length > 0 ? newPolygons : null;
    }

    static projectDist(a, b, p) {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const ap = { x: p.x - a.x, y: p.y - a.y };
        return (ap.x * ab.x + ap.y * ab.y);
    }

    // --- Utilities ---

    static getPolygonCenter(vertices) {
        let x = 0, y = 0, area = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
            area += cross;
            x += (vertices[i].x + vertices[j].x) * cross;
            y += (vertices[i].y + vertices[j].y) * cross;
        }
        if (Math.abs(area) < 1e-9) return vertices[0];
        return { x: x / (3 * area), y: y / (3 * area) };
    }

    static isPointInside(p, vertices) {
        return this.pointRelation(p, vertices) === -1;
    }

    static pointRelation(p, vertices) {
        const EPSILON = 1e-6;
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const A = vertices[i];
            const B = vertices[j];

            if (this.distSq(p, A) < EPSILON || this.distSq(p, B) < EPSILON) return 0;

            if (this.isPointOnSegmentBlock(p, A, B)) return 0;

            if (((A.y > p.y) !== (B.y > p.y)) &&
                (p.x < (B.x - A.x) * (p.y - A.y) / (B.y - A.y) + A.x + 1e-9)) {
                inside = !inside;
            }
        }
        return inside ? -1 : 1;
    }

    static isPointOnSegmentBlock(p, a, b) {
        const cp = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
        if (Math.abs(cp) > 1e-3) return false;

        const dp = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
        if (dp < 0) return false;

        const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        if (dp > lenSq) return false;

        return true;
    }

    static ensureClockwise(vertices) {
        const area = this.getArea(vertices);
        return area > 0 ? vertices : vertices.reverse();
    }

    static getArea(vertices) {
        let area = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        return area / 2;
    }

    static distSq(p1, p2) {
        return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    }

    static getPerimeter(vertices) {
        let perimeter = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            perimeter += Math.sqrt(this.distSq(vertices[i], vertices[j]));
        }
        return perimeter;
    }

    static isGeometricallySimilar(vertsA, vertsB, tolerance = 0.05) {
        if (!vertsA || !vertsB) return false;
        if (vertsA.length !== vertsB.length) return false;

        const areaA = Math.abs(this.getArea(vertsA));
        const areaB = Math.abs(this.getArea(vertsB));
        const areaDiff = Math.abs(areaA - areaB);
        if (areaDiff / (Math.max(areaA, areaB) || 1) > tolerance) return false;

        const perimA = this.getPerimeter(vertsA);
        const perimB = this.getPerimeter(vertsB);
        const perimDiff = Math.abs(perimA - perimB);
        if (perimDiff / (Math.max(perimA, perimB) || 1) > tolerance) return false;

        return true;
    }

    static validateCut(polygon, p1, p2) {
        if (!polygon || !polygon.vertices || polygon.vertices.length < 3) {
            return { isValid: false, reason: "No valid shape to cut." };
        }
        if (this.distSq(p1, p2) < 1e-6) {
            return { isValid: false, reason: "Line is too short." };
        }
        return { isValid: true };
    }

    static cleanCollinearVertices(vertices) {
        if (vertices.length < 3) return vertices;
        const cleaned = [];
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const p1 = vertices[(i - 1 + n) % n];
            const p2 = vertices[i];
            const p3 = vertices[(i + 1) % n];
            const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
            const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            if (len1 > 1e-6 && len2 > 1e-6) {
                const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
                if (dot > 0.999) continue;
            }
            cleaned.push(p2);
        }
        return cleaned;
    }
}
