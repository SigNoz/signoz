/* eslint-disable sonarjs/cognitive-complexity */
import { SpantypesFlamegraphSpanDTO as FlamegraphSpan } from 'api/generated/services/sigNoz.schemas';

export interface ConnectorLine {
	parentRow: number;
	childRow: number;
	timestampMs: number;
	// Snapshot of the child span's resource so draw-time can resolve the
	// `colorByField` group value without crossing the worker boundary.
	resource?: Record<string, string>;
}

export interface VisualLayout {
	visualRows: FlamegraphSpan[][];
	spanToVisualRow: Record<string, number>;
	connectors: ConnectorLine[];
	totalVisualRows: number;
}

// Above this many siblings under one parent, the connector-avoidance refinement
// (Checks 2 & 3) is both visually meaningless — the row is already a dense wall —
// and quadratic: every child deposits a connector point on each intermediate row,
// which pushes later children even higher, which deposits more points. That
// feedback loop inflates a layout needing ~50 rows to thousands and never
// finishes on wide traces. Past the threshold we pack by overlap only.
// Exported so the regression tests stay anchored to the real gate value.
export const WIDE_GROUP_THRESHOLD = 512;

/**
 * Segment tree over rows that answers "lowest row index >= `from` whose smallest
 * span start-time is >= `end`" in O(log rows). Used to place a large group of
 * leaf siblings by overlap only: because siblings are processed in descending
 * start order, every already-placed span on a row starts at or after the current
 * one, so [start, end] overlaps a row iff some span there starts before `end` —
 * i.e. the row is free iff its minimum start >= end. Each node stores the max of
 * its subtree's per-row minimum starts so a free row can be found by descent.
 */
class LowestFreeRow {
	private readonly size: number;

	private readonly tree: Float64Array;

	constructor(rows: number) {
		let size = 1;
		while (size < rows) {
			size *= 2;
		}
		this.size = size;
		this.tree = new Float64Array(size * 2).fill(Infinity);
	}

	place(row: number, start: number): void {
		let i = row + this.size;
		// A row's key is the minimum start among its spans. Children are processed
		// in descending start order so a leaf's start is the new minimum, but a
		// non-leaf subtree's descendant can land on a row out of order — take min.
		if (start >= this.tree[i]) {
			return;
		}
		this.tree[i] = start;
		for (i >>= 1; i >= 1; i >>= 1) {
			const next = Math.max(this.tree[2 * i], this.tree[2 * i + 1]);
			if (this.tree[i] === next) {
				break;
			}
			this.tree[i] = next;
		}
	}

	lowestFrom(from: number, end: number): number {
		return this.descend(1, 0, this.size - 1, from, end);
	}

	private descend(
		node: number,
		lo: number,
		hi: number,
		from: number,
		end: number,
	): number {
		if (hi < from || this.tree[node] < end) {
			return -1;
		}
		if (lo === hi) {
			return lo;
		}
		const mid = (lo + hi) >> 1;
		const left = this.descend(2 * node, lo, mid, from, end);
		if (left !== -1) {
			return left;
		}
		return this.descend(2 * node + 1, mid + 1, hi, from, end);
	}
}

/**
 * Computes an overlap-safe visual layout for flamegraph spans using DFS ordering.
 *
 * Builds a parent→children tree from parentSpanId, then traverses in DFS pre-order.
 * Each span is placed at parentRow+1 if free, otherwise scans upward row-by-row
 * until finding a non-overlapping row. This keeps children visually close to their
 * parents and avoids the BFS problem where distant siblings push children far down.
 */
export function computeVisualLayout(spans: FlamegraphSpan[][]): VisualLayout {
	const spanToVisualRow = new Map<string, number>();
	const visualRowsMap = new Map<number, FlamegraphSpan[]>();
	let maxRow = -1;

	// Per-row interval list for overlap detection
	// Each entry: [startTime, endTime]
	const rowIntervals = new Map<number, Array<[number, number]>>();

	// function hasOverlap(row: number, startTime: number, endTime: number): boolean {
	// 	const intervals = rowIntervals.get(row);
	// 	if (!intervals) {
	// 		return false;
	// 	}
	// 	for (const [s, e] of intervals) {
	// 		if (startTime < e && endTime > s) {
	// 			return true;
	// 		}
	// 	}
	// 	return false;
	// }

	function addToRow(row: number, span: FlamegraphSpan): void {
		spanToVisualRow.set(span.spanId, row);
		let arr = visualRowsMap.get(row);
		if (!arr) {
			arr = [];
			visualRowsMap.set(row, arr);
		}
		arr.push(span);

		const startTime = span.timestamp;
		const endTime = span.timestamp + span.durationNano / 1e6;
		let intervals = rowIntervals.get(row);
		if (!intervals) {
			intervals = [];
			rowIntervals.set(row, intervals);
		}
		intervals.push([startTime, endTime]);

		if (row > maxRow) {
			maxRow = row;
		}
	}

	// Flatten all spans and build lookup + children map
	const spanMap = new Map<string, FlamegraphSpan>();
	const childrenMap = new Map<string, FlamegraphSpan[]>();
	const allSpans: FlamegraphSpan[] = [];

	for (const level of spans) {
		for (const span of level) {
			allSpans.push(span);
			spanMap.set(span.spanId, span);
		}
	}

	function getParentId(span: FlamegraphSpan): string {
		return span.parentSpanId || '';
	}

	// Build children map and identify roots
	const roots: FlamegraphSpan[] = [];

	for (const span of allSpans) {
		const parentId = getParentId(span);
		if (!parentId || !spanMap.has(parentId)) {
			roots.push(span);
		} else {
			let children = childrenMap.get(parentId);
			if (!children) {
				children = [];
				childrenMap.set(parentId, children);
			}
			children.push(span);
		}
	}

	// Sort children by timestamp for deterministic ordering
	for (const [, children] of childrenMap) {
		children.sort((a, b) => b.timestamp - a.timestamp);
	}

	// --- Subtree-unit placement ---
	// Compute each subtree's layout in isolation, then place as a unit
	// to guarantee parent-child adjacency within subtrees.

	interface ShapeEntry {
		span: FlamegraphSpan;
		relativeRow: number;
	}

	function hasOverlapIn(
		intervals: Map<number, Array<[number, number]>>,
		row: number,
		startTime: number,
		endTime: number,
	): boolean {
		const rowIntervals = intervals.get(row);
		if (!rowIntervals) {
			return false;
		}
		for (const [s, e] of rowIntervals) {
			if (startTime < e && endTime > s) {
				return true;
			}
		}
		return false;
	}

	function addIntervalTo(
		intervals: Map<number, Array<[number, number]>>,
		row: number,
		startTime: number,
		endTime: number,
	): void {
		let arr = intervals.get(row);
		if (!arr) {
			arr = [];
			intervals.set(row, arr);
		}
		arr.push([startTime, endTime]);
	}

	function hasConnectorConflict(
		intervals: Map<number, Array<[number, number]>>,
		row: number,
		point: number,
	): boolean {
		const rowIntervals = intervals.get(row);
		if (!rowIntervals) {
			return false;
		}
		for (const [s, e] of rowIntervals) {
			if (point >= s && point < e) {
				return true;
			}
		}
		return false;
	}

	function hasPointInSpan(
		connectorPoints: Map<number, number[]>,
		row: number,
		startTime: number,
		endTime: number,
	): boolean {
		const points = connectorPoints.get(row);
		if (!points) {
			return false;
		}
		for (const p of points) {
			if (p >= startTime && p < endTime) {
				return true;
			}
		}
		return false;
	}

	function addConnectorPoint(
		connectorPoints: Map<number, number[]>,
		row: number,
		point: number,
	): void {
		let arr = connectorPoints.get(row);
		if (!arr) {
			arr = [];
			connectorPoints.set(row, arr);
		}
		arr.push(point);
	}

	// Fast path for a parent with a very large group of children: pack by overlap
	// only (descending greedy), skipping the quadratic connector-avoidance that
	// spirals at this scale. Leaf children — the bulk of a wide trace — are placed
	// in O(log rows) via the segment tree; the rare non-leaf subtree falls back to
	// findPlacement against the shared interval map. Both structures are kept in
	// sync so each placement sees all prior occupancy. Same ShapeEntry[] contract.
	function computeWideShape(
		rootSpan: FlamegraphSpan,
		children: FlamegraphSpan[],
	): ShapeEntry[] {
		const shape: ShapeEntry[] = [{ span: rootSpan, relativeRow: 0 }];
		const localIntervals = new Map<number, Array<[number, number]>>();
		// Children occupy relative rows 1..children.length in the worst case.
		const finder = new LowestFreeRow(children.length + 2);

		const occupy = (row: number, span: FlamegraphSpan): void => {
			const s = span.timestamp;
			const e = span.timestamp + span.durationNano / 1e6;
			shape.push({ span, relativeRow: row });
			addIntervalTo(localIntervals, row, s, e);
			finder.place(row, s);
		};

		for (const child of children) {
			if (childrenMap.has(child.spanId)) {
				// Non-leaf: place its whole subtree shape as a unit via findPlacement.
				const childShape = computeSubtreeShape(child);
				const offset = findPlacement(childShape, 1, localIntervals);
				for (const entry of childShape) {
					occupy(entry.relativeRow + offset, entry.span);
				}
			} else {
				const end = child.timestamp + child.durationNano / 1e6;
				occupy(finder.lowestFrom(1, end), child);
			}
		}

		return shape;
	}

	function computeSubtreeShape(rootSpan: FlamegraphSpan): ShapeEntry[] {
		const children = childrenMap.get(rootSpan.spanId);

		if (children && children.length > WIDE_GROUP_THRESHOLD) {
			return computeWideShape(rootSpan, children);
		}

		const localIntervals = new Map<number, Array<[number, number]>>();
		const localConnectorPoints = new Map<number, number[]>();
		const shape: ShapeEntry[] = [];

		// Place root span at relative row 0
		const rootStart = rootSpan.timestamp;
		const rootEnd = rootSpan.timestamp + rootSpan.durationNano / 1e6;
		shape.push({ span: rootSpan, relativeRow: 0 });
		addIntervalTo(localIntervals, 0, rootStart, rootEnd);

		if (children) {
			for (const child of children) {
				const childShape = computeSubtreeShape(child);
				const connectorX = child.timestamp;
				const offset = findPlacement(
					childShape,
					1,
					localIntervals,
					localConnectorPoints,
					connectorX,
				);

				// Record connector points for intermediate rows (1 to offset-1)
				for (let r = 1; r < offset; r++) {
					addConnectorPoint(localConnectorPoints, r, connectorX);
				}

				// Place child shape into local state at offset
				for (const entry of childShape) {
					const actualRow = entry.relativeRow + offset;
					shape.push({ span: entry.span, relativeRow: actualRow });
					const s = entry.span.timestamp;
					const e = entry.span.timestamp + entry.span.durationNano / 1e6;
					addIntervalTo(localIntervals, actualRow, s, e);
				}
			}
		}

		return shape;
	}

	function findPlacement(
		shape: ShapeEntry[],
		minOffset: number,
		intervals: Map<number, Array<[number, number]>>,
		connectorPoints?: Map<number, number[]>,
		connectorX?: number,
	): number {
		// Track the first offset that passes Checks 1 & 2 as a fallback.
		// Check 3 (connector vs span) is monotonically failing: once it fails
		// at offset K, all offsets > K also fail (more intermediate rows).
		// If we can't satisfy Check 3, fall back to the best offset without it.
		let fallbackOffset = -1;

		for (let offset = minOffset; ; offset++) {
			let passesSpanChecks = true;

			// Check 1: span vs span (existing)
			for (const entry of shape) {
				const targetRow = entry.relativeRow + offset;
				const s = entry.span.timestamp;
				const e = entry.span.timestamp + entry.span.durationNano / 1e6;
				if (hasOverlapIn(intervals, targetRow, s, e)) {
					passesSpanChecks = false;
					break;
				}
			}

			// Check 2: span vs existing connector points
			if (passesSpanChecks && connectorPoints) {
				for (const entry of shape) {
					const targetRow = entry.relativeRow + offset;
					const s = entry.span.timestamp;
					const e = entry.span.timestamp + entry.span.durationNano / 1e6;
					if (hasPointInSpan(connectorPoints, targetRow, s, e)) {
						passesSpanChecks = false;
						break;
					}
				}
			}

			if (!passesSpanChecks) {
				continue;
			}

			// This offset passes Checks 1 & 2 — record as fallback
			if (fallbackOffset === -1) {
				fallbackOffset = offset;
			}

			// Check 3: new connector vs existing spans
			if (connectorX !== undefined) {
				let connectorClear = true;
				for (let r = 1; r < offset; r++) {
					if (hasConnectorConflict(intervals, r, connectorX)) {
						connectorClear = false;
						break;
					}
				}
				if (!connectorClear) {
					// Check 3 will fail for all larger offsets too.
					// Fall back to the first offset that passed Checks 1 & 2.
					return fallbackOffset;
				}
			}

			return offset;
		}
	}

	// Process roots sorted by timestamp
	roots.sort((a, b) => a.timestamp - b.timestamp);
	for (const root of roots) {
		const shape = computeSubtreeShape(root);
		const offset = findPlacement(shape, 0, rowIntervals);
		for (const entry of shape) {
			addToRow(entry.relativeRow + offset, entry.span);
		}
	}

	// Build the visualRows array
	const totalVisualRows = maxRow + 1;
	const visualRows: FlamegraphSpan[][] = [];
	for (let i = 0; i < totalVisualRows; i++) {
		visualRows.push(visualRowsMap.get(i) || []);
	}

	// Build connector lines for parent-child pairs with row gap > 1
	const connectors: ConnectorLine[] = [];
	for (const [parentId, children] of childrenMap) {
		const parentRow = spanToVisualRow.get(parentId);
		if (parentRow === undefined) {
			continue;
		}
		for (const child of children) {
			const childRow = spanToVisualRow.get(child.spanId);
			if (childRow === undefined || childRow - parentRow <= 1) {
				continue;
			}
			connectors.push({
				parentRow,
				childRow,
				timestampMs: child.timestamp,
				resource: child.resource,
			});
		}
	}

	return {
		visualRows,
		spanToVisualRow: Object.fromEntries(spanToVisualRow),
		connectors,
		totalVisualRows,
	};
}
