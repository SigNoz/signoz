import { HeatmapAxisScale, HeatmapRow, HeatmapYAxis } from './types';

/** Used when the ratio cannot be inferred, i.e. a single boundary. */
const FALLBACK_LOG_RATIO = 2;

const EMPTY_Y_AXIS: HeatmapYAxis = {
	rows: [],
	edges: [],
	splits: [],
	overflowSplit: null,
	toBucketValue: (axisValue: number): number => axisValue,
	min: 0,
	max: 1,
};

/** Ascending, finite, de-duplicated boundaries. */
function normalizeBounds(bounds: number[]): number[] {
	const sorted = bounds
		.filter((bound) => Number.isFinite(bound))
		.sort((a, b) => a - b);
	return sorted.filter(
		(bound, index) => index === 0 || bound !== sorted[index - 1],
	);
}

/** True when a plain log axis can place every boundary. */
export function canUseLogAxis(bounds: number[]): boolean {
	return bounds.length > 0 && bounds.every((bound) => bound > 0);
}

interface AxisTransform {
	toAxisValue: (value: number) => number;
	toBucketValue: (axisValue: number) => number;
}

const LINEAR_TRANSFORM: AxisTransform = {
	toAxisValue: (value) => value,
	toBucketValue: (axisValue) => axisValue,
};

const LOG_TRANSFORM: AxisTransform = {
	toAxisValue: (value) => Math.log10(value),
	toBucketValue: (axisValue) => 10 ** axisValue,
};

/**
 * Where "near zero" starts, taken as the smallest non-zero boundary magnitude. The
 * bucket layout already declares it, so it never needs to be configured.
 */
function resolveLinearThreshold(bounds: number[]): number {
	let threshold = Number.POSITIVE_INFINITY;
	for (const bound of bounds) {
		const magnitude = Math.abs(bound);
		if (magnitude > 0 && magnitude < threshold) {
			threshold = magnitude;
		}
	}
	return Number.isFinite(threshold) ? threshold : 1;
}

/**
 * Symmetric log: linear within ±threshold, logarithmic beyond, mirrored across
 * zero. Bucketing an arbitrary logs/traces field can straddle zero — clock skew,
 * deltas, balances — which a plain log cannot place at all, and which a linear axis
 * squeezes into sub-pixel rows exactly where the interesting data sits.
 *
 * The gradient kink at ±threshold is invisible here: the threshold *is* a boundary,
 * so it lands on a row edge, and row edges are already discrete.
 */
function createSymlogTransform(threshold: number): AxisTransform {
	return {
		toAxisValue: (value) =>
			Math.abs(value) <= threshold
				? value / threshold
				: Math.sign(value) * (1 + Math.log10(Math.abs(value) / threshold)),
		toBucketValue: (axisValue) =>
			Math.abs(axisValue) <= 1
				? axisValue * threshold
				: Math.sign(axisValue) * threshold * 10 ** (Math.abs(axisValue) - 1),
	};
}

function resolveAxisTransform(
	bounds: number[],
	scale: HeatmapAxisScale,
): AxisTransform {
	if (scale !== HeatmapAxisScale.Log) {
		return LINEAR_TRANSFORM;
	}
	if (canUseLogAxis(bounds)) {
		return LOG_TRANSFORM;
	}
	// All-zero bounds have no magnitude to scale against.
	if (!bounds.some((bound) => bound !== 0)) {
		return LINEAR_TRANSFORM;
	}
	return createSymlogTransform(resolveLinearThreshold(bounds));
}

/**
 * The open-ended rows still need a height, so each gets the grid's typical bucket
 * width — the mean gap in axis space, which on a geometric layout is exactly one
 * bucket ratio. Linear stays in value space so it can refuse to cross zero.
 */
function resolveOuterEdges(
	bounds: number[],
	transform: AxisTransform,
	isLinear: boolean,
): { lower: number; upper: number } {
	const first = bounds[0];
	const last = bounds[bounds.length - 1];

	if (isLinear) {
		const gap = bounds.length > 1 ? (last - first) / (bounds.length - 1) : 0;
		const safeGap = gap > 0 ? gap : Math.abs(first) || 1;
		// Never extend below zero unless the boundaries already do.
		const lower = first > 0 ? Math.max(0, first - safeGap) : first - safeGap;
		return { lower, upper: last + safeGap };
	}

	const axisFirst = transform.toAxisValue(first);
	const axisLast = transform.toAxisValue(last);
	const fallback = Math.log10(FALLBACK_LOG_RATIO);
	const gap =
		bounds.length > 1 ? (axisLast - axisFirst) / (bounds.length - 1) : fallback;
	const safeGap = gap > 0 ? gap : fallback;

	return {
		lower: transform.toBucketValue(axisFirst - safeGap),
		upper: transform.toBucketValue(axisLast + safeGap),
	};
}

/** N boundaries produce N+1 rows: an underflow row below the first, and the
 *  `+Inf` overflow row above the last. */
export function resolveHeatmapYAxis(
	bounds: number[],
	scale: HeatmapAxisScale,
): HeatmapYAxis {
	const normalized = normalizeBounds(bounds);
	if (normalized.length === 0) {
		return EMPTY_Y_AXIS;
	}

	const transform = resolveAxisTransform(normalized, scale);
	const isLinear = transform === LINEAR_TRANSFORM;
	const { toAxisValue, toBucketValue } = transform;

	const { lower, upper } = resolveOuterEdges(normalized, transform, isLinear);
	const last = normalized[normalized.length - 1];

	const rows: HeatmapRow[] = [
		{ lower, upper: normalized[0], isUnderflow: true, isOverflow: false },
	];
	for (let index = 1; index < normalized.length; index += 1) {
		rows.push({
			lower: normalized[index - 1],
			upper: normalized[index],
			isUnderflow: false,
			isOverflow: false,
		});
	}
	rows.push({ lower: last, upper, isUnderflow: false, isOverflow: true });

	const edges = [
		toAxisValue(lower),
		...normalized.map(toAxisValue),
		toAxisValue(upper),
	];

	return {
		rows,
		edges,
		splits: normalized.map(toAxisValue),
		overflowSplit: toAxisValue(upper),
		toBucketValue,
		min: edges[0],
		max: edges[edges.length - 1],
	};
}

/** Row containing `axisValue`, or `null` when it falls outside the grid. */
export function resolveRowIndex(
	edges: number[],
	axisValue: number,
): number | null {
	if (edges.length < 2) {
		return null;
	}
	if (axisValue < edges[0] || axisValue > edges[edges.length - 1]) {
		return null;
	}

	let low = 0;
	let high = edges.length - 2;
	while (low <= high) {
		const mid = (low + high) >> 1;
		if (axisValue < edges[mid]) {
			high = mid - 1;
		} else if (axisValue >= edges[mid + 1]) {
			low = mid + 1;
		} else {
			return mid;
		}
	}
	// Exactly on the top edge.
	return edges.length - 2;
}

/**
 * A containment test, not a nearest-timestamp lookup: uPlot's own `cursor.idx`
 * snaps to the closest boundary and would report the next column as soon as the
 * cursor passed a cell's midpoint.
 */
export function resolveColumnIndex(
	timestamps: ArrayLike<number>,
	xValue: number,
	step: number,
): number | null {
	if (timestamps.length === 0) {
		return null;
	}

	let low = 0;
	let high = timestamps.length - 1;
	let candidate = -1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		if (timestamps[mid] <= xValue) {
			candidate = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	if (candidate < 0) {
		return null;
	}
	const width = step > 0 ? step : Number.POSITIVE_INFINITY;
	return xValue < timestamps[candidate] + width ? candidate : null;
}

/** The open-ended rows are labelled by their one real boundary; the synthetic
 *  edge is a drawing device, not a value. */
export function formatRowLabel(
	row: HeatmapRow,
	formatValue: (value: number) => string,
): string {
	if (row.isOverflow) {
		return `> ${formatValue(row.lower)}`;
	}
	if (row.isUnderflow) {
		return `≤ ${formatValue(row.upper)}`;
	}
	return `${formatValue(row.lower)} – ${formatValue(row.upper)}`;
}

/**
 * Drops boundary ticks that would overlap. Filters by pixel distance rather than
 * index, since linear rows are not the same height, and walks down from the top
 * so the `∞` edge survives whatever else is dropped.
 */
export function decimateAxisSplits({
	splits,
	min,
	max,
	plotHeight,
	minGapPx,
}: {
	/** Candidates in axis space, ascending. */
	splits: number[];
	min: number;
	max: number;
	/** Plotting area height, in CSS pixels. */
	plotHeight: number;
	minGapPx: number;
}): number[] {
	if (splits.length < 2 || plotHeight <= 0 || minGapPx <= 0 || !(max > min)) {
		return splits;
	}

	const pixelsPerUnit = plotHeight / (max - min);
	const kept: number[] = [];
	let lastPosition = 0;

	for (let index = splits.length - 1; index >= 0; index -= 1) {
		// Axis values grow upward, pixel offsets downward.
		const position = (max - splits[index]) * pixelsPerUnit;
		if (kept.length === 0 || position - lastPosition >= minGapPx) {
			kept.push(splits[index]);
			lastPosition = position;
		}
	}

	return kept.reverse();
}
