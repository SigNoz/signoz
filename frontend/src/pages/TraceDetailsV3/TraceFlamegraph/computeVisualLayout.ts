/* eslint-disable sonarjs/cognitive-complexity */
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

export interface ConnectorLine {
	parentRow: number;
	childRow: number;
	timestampMs: number;
	serviceName: string;
}

export interface VisualLayout {
	visualRows: FlamegraphSpan[][];
	spanToVisualRow: Record<string, number>;
	connectors: ConnectorLine[];
	totalVisualRows: number;
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

	// Extract parentSpanId — the field may be missing at runtime when the API
	// returns `references` instead.  Fall back to the first CHILD_OF reference.
	function getParentId(span: FlamegraphSpan): string {
		if (span.parentSpanId) {
			return span.parentSpanId;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const refs = (span as any).references as
			| Array<{ spanId?: string; refType?: string }>
			| undefined;
		if (refs) {
			for (const ref of refs) {
				if (ref.refType === 'CHILD_OF' && ref.spanId) {
					return ref.spanId;
				}
			}
		}
		return '';
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

	function computeSubtreeShape(rootSpan: FlamegraphSpan): ShapeEntry[] {
		const localIntervals = new Map<number, Array<[number, number]>>();
		const localConnectorPoints = new Map<number, number[]>();
		const shape: ShapeEntry[] = [];

		// Place root span at relative row 0
		const rootStart = rootSpan.timestamp;
		const rootEnd = rootSpan.timestamp + rootSpan.durationNano / 1e6;
		shape.push({ span: rootSpan, relativeRow: 0 });
		addIntervalTo(localIntervals, 0, rootStart, rootEnd);

		const children = childrenMap.get(rootSpan.spanId);
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
				serviceName: child.serviceName,
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
