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

/** Symmetric log about the threshold the bucket layout implies. All-zero
 *  boundaries have no magnitude to scale against and stay linear. */
function resolveSymlogTransform(bounds: number[]): AxisTransform {
	if (!bounds.some((bound) => bound !== 0)) {
		return LINEAR_TRANSFORM;
	}
	return createSymlogTransform(resolveLinearThreshold(bounds));
}

/** One typical bucket, in axis space — the mean ratio between adjacent positive
 *  boundaries, which on a geometric layout is exactly one bucket. */
function resolveLogGap(positive: number[]): number {
	const axisFirst = Math.log10(positive[0]);
	const axisLast = Math.log10(positive[positive.length - 1]);
	const gap =
		positive.length > 1
			? (axisLast - axisFirst) / (positive.length - 1)
			: Math.log10(FALLBACK_LOG_RATIO);
	return gap > 0 ? gap : Math.log10(FALLBACK_LOG_RATIO);
}

/**
 * Plain log10, with the boundaries a logarithm has no answer for — zero and
 * below — pinned one bucket beneath the smallest positive one. They keep their
 * own rows, ticks and labels; only their height is synthetic, and it is the
 * height of a bucket rather than the decade a symmetric log would spend on them.
 *
 * Several of them share that one edge, which squashes them together: a layout
 * that straddles zero wants `Symlog`. This is the scale for the one non-positive
 * boundary an explicit-bounds histogram routinely carries — its zero bucket.
 */
function createFloorLogTransform(positive: number[]): AxisTransform {
	const floor = Math.log10(positive[0]) - resolveLogGap(positive);
	return {
		toAxisValue: (value) => (value > 0 ? Math.log10(value) : floor),
		toBucketValue: (axisValue) => 10 ** axisValue,
	};
}

function resolveAxisTransform(
	bounds: number[],
	scale: HeatmapAxisScale,
): AxisTransform {
	if (scale === HeatmapAxisScale.Linear) {
		return LINEAR_TRANSFORM;
	}
	if (scale === HeatmapAxisScale.Symlog) {
		return resolveSymlogTransform(bounds);
	}
	if (canUseLogAxis(bounds)) {
		return LOG_TRANSFORM;
	}
	// A plain log is still a plain log where the boundaries allow one; `Auto`
	// instead reads the layout and answers with the scale that fits it.
	if (scale === HeatmapAxisScale.Log) {
		const positive = bounds.filter((bound) => bound > 0);
		return positive.length > 0
			? createFloorLogTransform(positive)
			: LINEAR_TRANSFORM;
	}
	return resolveSymlogTransform(bounds);
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

/** Where uPlot switches from a fixed increment to a calendar walk. */
const MONTH_INCR_SECONDS = 3600 * 24 * 28;
const YEAR_INCR_SECONDS = 3600 * 24 * 365;

/** Shifts a timestamp into the axis timezone, as uPlot's `tzDate` does: the
 *  returned date's *local* fields read as that timezone's wall clock. */
type ToAxisDate = (timestamp: number) => Date;

const BROWSER_DATE: ToAxisDate = (timestamp) => new Date(timestamp * 1e3);

/**
 * Real epoch seconds of the midnight at or before `timestamp`, in the axis
 * timezone. The browser's own offset cancels: it is inside the shifted date's
 * fields and inside the correction.
 */
function resolveDayOrigin(timestamp: number, toDate: ToAxisDate): number {
	const shifted = toDate(timestamp);
	const midnight = new Date(
		shifted.getFullYear(),
		shifted.getMonth(),
		shifted.getDate(),
	);
	const correction = Math.floor(timestamp) - Math.floor(shifted.getTime() / 1e3);
	return Math.floor(midnight.getTime() / 1e3) + correction;
}

function fromAxisDate(wall: Date, toDate: ToAxisDate): number {
	const wallTs = Math.floor(wall.getTime() / 1e3);
	return wallTs + (wallTs - Math.floor(toDate(wallTs).getTime() / 1e3));
}

function snapToColumnEdge(value: number, phase: number, width: number): number {
	return phase + Math.round((value - phase) / width) * width;
}

/**
 * Month and year ticks, walked as calendar dates the way uPlot walks them — no
 * fixed increment expresses a month. Their spacing is uneven to begin with, so
 * each tick is snapped to its own nearest column edge.
 */
function resolveCalendarSplits({
	incr,
	min,
	max,
	toDate,
	phase,
	columnWidth,
}: {
	incr: number;
	min: number;
	max: number;
	toDate: ToAxisDate;
	phase: number;
	columnWidth: number;
}): number[] {
	const isYear = incr >= YEAR_INCR_SECONDS;
	const monthsPerTick = Math.max(
		1,
		isYear
			? Math.round(incr / YEAR_INCR_SECONDS) * 12
			: Math.round(incr / MONTH_INCR_SECONDS),
	);

	const start = toDate(min);
	const baseYear = start.getFullYear();
	const baseMonth = isYear ? 0 : start.getMonth();

	const splits: number[] = [];
	for (let index = 0; ; index += 1) {
		const wall = new Date(baseYear, baseMonth + monthsPerTick * index, 1);
		const value = snapToColumnEdge(
			fromAxisDate(wall, toDate),
			phase,
			columnWidth,
		);
		if (value > max) {
			break;
		}
		if (value >= min && value !== splits[splits.length - 1]) {
			splits.push(value);
		}
	}
	return splits;
}

/**
 * Time ticks placed on column edges, so a vertical grid line falls in the gap
 * between two cells instead of through one. uPlot's increment is rounded up to a
 * whole number of columns, and the sequence starts at the column edge nearest
 * the timezone's midnight — the closest the grid can get to the ticks uPlot
 * would have drawn. Where midnight is itself an edge, they are those ticks.
 */
export function resolveColumnAlignedSplits({
	anchor,
	step,
	incr,
	min,
	max,
	toDate = BROWSER_DATE,
}: {
	/** Any column start: every edge sits at `anchor + n * step`. */
	anchor: number;
	/** Column width in seconds. */
	step: number;
	/** Increment uPlot picked for the axis, in seconds. */
	incr: number;
	min: number;
	max: number;
	toDate?: ToAxisDate;
}): number[] {
	if (!(incr > 0) || !(max > min)) {
		return [];
	}

	const columnWidth = step > 0 ? step : incr;
	const phase = step > 0 ? ((anchor % step) + step) % step : 0;

	if (incr >= MONTH_INCR_SECONDS) {
		return resolveCalendarSplits({
			incr,
			min,
			max,
			toDate,
			phase,
			columnWidth,
		});
	}

	const tickIncr = Math.ceil(incr / columnWidth) * columnWidth;
	const origin = snapToColumnEdge(
		resolveDayOrigin(min, toDate),
		phase,
		columnWidth,
	);

	const splits: number[] = [];
	for (let index = Math.ceil((min - origin) / tickIncr); ; index += 1) {
		const value = origin + index * tickIncr;
		if (value > max) {
			break;
		}
		splits.push(value);
	}
	return splits;
}
