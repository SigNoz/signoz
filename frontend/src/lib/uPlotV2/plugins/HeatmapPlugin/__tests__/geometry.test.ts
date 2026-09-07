import {
	canUseLogAxis,
	decimateAxisSplits,
	formatRowLabel,
	resolveColumnIndex,
	resolveHeatmapYAxis,
	resolveRowIndex,
} from '../geometry';
import { HeatmapAxisScale } from '../types';

const BOUNDS = [128, 256, 1024, 4096];

describe('canUseLogAxis', () => {
	it('accepts strictly positive bounds', () => {
		expect(canUseLogAxis(BOUNDS)).toBe(true);
	});

	it('rejects a zero or negative bound', () => {
		expect(canUseLogAxis([0, 128])).toBe(false);
		expect(canUseLogAxis([-1, 128])).toBe(false);
	});

	it('rejects empty bounds', () => {
		expect(canUseLogAxis([])).toBe(false);
	});
});

describe('resolveHeatmapYAxis', () => {
	it('turns N bounds into N+1 rows with underflow and overflow at the ends', () => {
		const { rows } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Log);

		expect(rows).toHaveLength(BOUNDS.length + 1);
		expect(rows[0]).toMatchObject({
			upper: 128,
			isUnderflow: true,
			isOverflow: false,
		});
		expect(rows[1]).toMatchObject({ lower: 128, upper: 256 });
		expect(rows[4]).toMatchObject({
			lower: 4096,
			isOverflow: true,
			isUnderflow: false,
		});
	});

	it('exposes one edge per row boundary, ascending', () => {
		const { rows, edges } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Log);

		expect(edges).toHaveLength(rows.length + 1);
		expect([...edges].sort((a, b) => a - b)).toStrictEqual(edges);
	});

	it('places bounds in log space so row heights are log-proportional', () => {
		const { splits, min, max } = resolveHeatmapYAxis(
			BOUNDS,
			HeatmapAxisScale.Log,
		);

		expect(splits).toStrictEqual(BOUNDS.map((bound) => Math.log10(bound)));
		// Outer edges extend by the geometric mean ratio, (4096/128)^(1/3) = 3.174…
		expect(10 ** min).toBeCloseTo(128 / (4096 / 128) ** (1 / 3), 6);
		expect(10 ** max).toBeCloseTo(4096 * (4096 / 128) ** (1 / 3), 6);
	});

	it('keeps bounds in value space on a linear axis', () => {
		const { splits, min } = resolveHeatmapYAxis(
			[10, 20, 30],
			HeatmapAxisScale.Linear,
		);

		expect(splits).toStrictEqual([10, 20, 30]);
		// Mean gap is 10, and the underflow edge never crosses zero.
		expect(min).toBe(0);
	});

	it('sorts and de-duplicates bounds', () => {
		const { rows, splits } = resolveHeatmapYAxis(
			[256, 128, 256, Number.NaN],
			HeatmapAxisScale.Log,
		);

		expect(splits).toStrictEqual([Math.log10(128), Math.log10(256)]);
		expect(rows).toHaveLength(3);
	});

	it('gives a single bound an underflow and an overflow row', () => {
		const { rows, edges } = resolveHeatmapYAxis([100], HeatmapAxisScale.Log);

		expect(rows).toHaveLength(2);
		expect(rows[0].isUnderflow).toBe(true);
		expect(rows[1].isOverflow).toBe(true);
		expect(edges).toHaveLength(3);
	});

	it('degrades to an empty axis with no bounds', () => {
		expect(resolveHeatmapYAxis([], HeatmapAxisScale.Log).rows).toStrictEqual([]);
	});

	it('puts the overflow label on the row"s upper edge, clear of the last boundary', () => {
		const { overflowSplit, edges } = resolveHeatmapYAxis(
			BOUNDS,
			HeatmapAxisScale.Log,
		);

		// A full row above the last boundary tick, so the two labels cannot collide.
		expect(overflowSplit).toBe(edges[edges.length - 1]);
	});
});

describe('resolveRowIndex', () => {
	const { edges } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Linear);

	it('finds the row containing a value', () => {
		expect(resolveRowIndex(edges, 200)).toBe(1);
		expect(resolveRowIndex(edges, 2000)).toBe(3);
	});

	it('assigns a boundary to the row it opens', () => {
		expect(resolveRowIndex(edges, 256)).toBe(2);
	});

	it('returns the last row on the top edge', () => {
		expect(resolveRowIndex(edges, edges[edges.length - 1])).toBe(
			edges.length - 2,
		);
	});

	it('returns null outside the grid', () => {
		expect(resolveRowIndex(edges, edges[0] - 1)).toBeNull();
		expect(resolveRowIndex(edges, edges[edges.length - 1] + 1)).toBeNull();
	});

	it('returns null without at least one row', () => {
		expect(resolveRowIndex([5], 5)).toBeNull();
	});
});

describe('resolveColumnIndex', () => {
	const timestamps = [100, 160, 220, 280];
	const step = 60;

	it('resolves by containment, not proximity', () => {
		// 155 is nearer to 160, but the observations at 155 belong to column 0.
		expect(resolveColumnIndex(timestamps, 155, step)).toBe(0);
		expect(resolveColumnIndex(timestamps, 160, step)).toBe(1);
	});

	it('includes the column start and excludes its end', () => {
		expect(resolveColumnIndex(timestamps, 100, step)).toBe(0);
		expect(resolveColumnIndex(timestamps, 159.9, step)).toBe(0);
	});

	it('covers the trailing column using the step, not the next timestamp', () => {
		expect(resolveColumnIndex(timestamps, 330, step)).toBe(3);
		expect(resolveColumnIndex(timestamps, 340, step)).toBeNull();
	});

	it('returns null before the first column', () => {
		expect(resolveColumnIndex(timestamps, 99, step)).toBeNull();
	});

	it('returns null with no columns', () => {
		expect(resolveColumnIndex([], 100, step)).toBeNull();
	});

	it('leaves the last column open when the step is unknown', () => {
		expect(resolveColumnIndex(timestamps, 10_000, 0)).toBe(3);
	});
});

describe('formatRowLabel', () => {
	const format = (value: number): string => `${value}ms`;
	const { rows } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Log);

	it('labels the underflow row by its only real bound', () => {
		expect(formatRowLabel(rows[0], format)).toBe('≤ 128ms');
	});

	it('labels the overflow row by its only real bound', () => {
		expect(formatRowLabel(rows[rows.length - 1], format)).toBe('> 4096ms');
	});

	it('labels an interior row as a range', () => {
		expect(formatRowLabel(rows[1], format)).toBe('128ms – 256ms');
	});
});

describe('decimateAxisSplits', () => {
	const splits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	const domain = { min: 0, max: 10 };

	it('keeps every tick when they all fit', () => {
		expect(
			decimateAxisSplits({ ...domain, splits, plotHeight: 400, minGapPx: 18 }),
		).toStrictEqual(splits);
	});

	it('thins to whatever fits at the available height', () => {
		// 11 ticks over 100px is 10px apart; an 18px floor keeps every other one.
		expect(
			decimateAxisSplits({ ...domain, splits, plotHeight: 100, minGapPx: 18 }),
		).toStrictEqual([0, 2, 4, 6, 8, 10]);
	});

	it('always keeps the topmost tick, so the overflow edge survives thinning', () => {
		const thinned = decimateAxisSplits({
			...domain,
			splits,
			plotHeight: 40,
			minGapPx: 18,
		});

		expect(thinned[thinned.length - 1]).toBe(10);
	});

	it('returns ascending positions', () => {
		const thinned = decimateAxisSplits({
			...domain,
			splits,
			plotHeight: 60,
			minGapPx: 18,
		});

		expect([...thinned].sort((a, b) => a - b)).toStrictEqual(thinned);
	});

	it('thins by pixel distance, not index, so uneven rows are handled', () => {
		// Three boundaries bunched at the bottom of a wide linear domain: only the
		// first and the far-away last are far enough apart to both get labels.
		expect(
			decimateAxisSplits({
				splits: [1, 2, 3, 1000],
				min: 0,
				max: 1000,
				plotHeight: 200,
				minGapPx: 18,
			}),
		).toStrictEqual([3, 1000]);
	});

	it('leaves the tick set alone when it cannot measure', () => {
		expect(
			decimateAxisSplits({ ...domain, splits, plotHeight: 0, minGapPx: 18 }),
		).toStrictEqual(splits);
		expect(
			decimateAxisSplits({
				splits,
				min: 5,
				max: 5,
				plotHeight: 400,
				minGapPx: 18,
			}),
		).toStrictEqual(splits);
	});
});

describe('resolveHeatmapYAxis — the scale auto picks', () => {
	// The OTel SDK default explicit bucket boundaries, which start at zero.
	const OTEL = [
		0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000,
	];
	// Clock skew in ms — a logs/traces field that straddles zero.
	const SKEW = [-1000, -100, -10, -1, 0, 1, 10, 100, 1000];

	const PLOT_HEIGHT = 250;

	/** Row heights in axis units, which map linearly to pixels. */
	function rowHeights(bounds: number[]): number[] {
		const { edges } = resolveHeatmapYAxis(bounds, HeatmapAxisScale.Auto);
		return edges.slice(1).map((edge, index) => edge - edges[index]);
	}

	/** Shortest row, in pixels, for a plot of `PLOT_HEIGHT`. */
	function shortestRowPx(bounds: number[], scale: HeatmapAxisScale): number {
		const { edges } = resolveHeatmapYAxis(bounds, scale);
		const span = edges[edges.length - 1] - edges[0];
		const heights = edges
			.slice(1)
			.map((edge, index) => ((edge - edges[index]) / span) * PLOT_HEIGHT);
		return Math.min(...heights);
	}

	it('keeps a zero boundary on a log axis instead of giving up to linear', () => {
		const { splits } = resolveHeatmapYAxis([0, 5, 10], HeatmapAxisScale.Auto);

		// A linear fallback would leave the boundaries untransformed.
		expect(splits).not.toStrictEqual([0, 5, 10]);
	});

	it('is what an all-positive layout does NOT get — that stays a plain log', () => {
		const { splits } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Auto);

		expect(splits).toStrictEqual(BOUNDS.map((bound) => Math.log10(bound)));
	});

	it('gives every row a usable height for the OTel default boundaries', () => {
		// Linear squeezes the 0–100ms buckets — where the data is — under a pixel.
		expect(shortestRowPx(OTEL, HeatmapAxisScale.Linear)).toBeLessThan(1);
		expect(shortestRowPx(OTEL, HeatmapAxisScale.Auto)).toBeGreaterThan(4);
	});

	it('gives the zero-crossing row a full decade, since it cannot be compressed', () => {
		const heights = rowHeights(OTEL);
		const { rows } = resolveHeatmapYAxis(OTEL, HeatmapAxisScale.Auto);
		const nearZero = rows.findIndex((row) => row.lower === 0 && row.upper === 5);

		// One axis unit — the same space a decade gets above the threshold.
		expect(heights[nearZero]).toBeCloseTo(1, 6);
	});

	it('places boundaries either side of zero symmetrically', () => {
		const heights = rowHeights(SKEW);

		expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(0, 6);
	});

	it('keeps negative boundaries ascending', () => {
		const { edges } = resolveHeatmapYAxis(SKEW, HeatmapAxisScale.Auto);

		expect([...edges].sort((a, b) => a - b)).toStrictEqual(edges);
	});

	it('round-trips a boundary back to its bucket value', () => {
		const { splits, toBucketValue } = resolveHeatmapYAxis(
			SKEW,
			HeatmapAxisScale.Auto,
		);

		expect(
			splits.map((split) => Math.round(toBucketValue(split) * 1e6) / 1e6),
		).toStrictEqual(SKEW);
	});

	it('derives the linear threshold from the smallest non-zero boundary', () => {
		// Threshold 10 puts -10 at -1 and 0 at 0 in axis space.
		const { edges, rows } = resolveHeatmapYAxis(
			[-100, -10, 0, 10, 100],
			HeatmapAxisScale.Auto,
		);
		const crossing = rows.findIndex(
			(row) => row.lower === -10 && row.upper === 0,
		);

		expect(edges[crossing]).toBeCloseTo(-1, 6);
		expect(edges[crossing + 1]).toBeCloseTo(0, 6);
	});

	it('leaves an all-positive layout on a plain log axis', () => {
		const { splits } = resolveHeatmapYAxis(
			[128, 256, 1024],
			HeatmapAxisScale.Auto,
		);

		expect(splits).toStrictEqual([128, 256, 1024].map((b) => Math.log10(b)));
	});

	it('falls back to linear when every boundary is zero', () => {
		const { splits } = resolveHeatmapYAxis([0], HeatmapAxisScale.Auto);

		expect(splits).toStrictEqual([0]);
	});
});

describe('resolveHeatmapYAxis — an explicitly chosen scale', () => {
	// The low end of the OTel SDK defaults: a zero bucket, then positive bounds.
	const ZERO_HEAD = [0, 5, 10, 25];
	// Clock skew in ms — a field that straddles zero.
	const SKEW = [-100, -10, 0, 10, 100];

	/** Row heights in axis units, which map linearly to pixels. */
	function rowHeights(bounds: number[], scale: HeatmapAxisScale): number[] {
		const { edges } = resolveHeatmapYAxis(bounds, scale);
		return edges.slice(1).map((edge, index) => edge - edges[index]);
	}

	it('log stays a plain log10 for a positive layout', () => {
		const { splits } = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Log);

		expect(splits).toStrictEqual(BOUNDS.map((bound) => Math.log10(bound)));
	});

	it('log keeps its own answer for a zero bucket rather than becoming a symlog', () => {
		const { splits } = resolveHeatmapYAxis(ZERO_HEAD, HeatmapAxisScale.Log);
		// One bucket below the smallest positive bound, where a symlog would put it
		// a whole decade below.
		const gap = (Math.log10(25) - Math.log10(5)) / 2;

		expect(splits[0]).toBeCloseTo(Math.log10(5) - gap, 6);
		expect(splits.slice(1)).toStrictEqual([5, 10, 25].map((b) => Math.log10(b)));
	});

	it('log spends a bucket on the zero-crossing row where symlog spends a decade', () => {
		const gap = (Math.log10(25) - Math.log10(5)) / 2;

		// Row 1 is (0, 5] — the row above the zero bucket.
		expect(rowHeights(ZERO_HEAD, HeatmapAxisScale.Log)[1]).toBeCloseTo(gap, 6);
		expect(rowHeights(ZERO_HEAD, HeatmapAxisScale.Symlog)[1]).toBeCloseTo(1, 6);
	});

	it('log leaves every edge ascending with a zero bucket in the layout', () => {
		const { edges } = resolveHeatmapYAxis(ZERO_HEAD, HeatmapAxisScale.Log);

		expect([...edges].sort((a, b) => a - b)).toStrictEqual(edges);
	});

	it('log squashes several non-positive boundaries onto one edge — what symlog is for', () => {
		const { edges } = resolveHeatmapYAxis(SKEW, HeatmapAxisScale.Log);

		// -100, -10 and 0 have no logarithm and share the floor.
		expect(edges[1]).toBe(edges[2]);
		expect(edges[2]).toBe(edges[3]);
		expect([...edges].sort((a, b) => a - b)).toStrictEqual(edges);
	});

	it('log has nothing to compress without a positive boundary and stays linear', () => {
		const { splits } = resolveHeatmapYAxis([-5, 0], HeatmapAxisScale.Log);

		expect(splits).toStrictEqual([-5, 0]);
	});

	it('symlog is a choice for a positive layout too, and is not the log axis', () => {
		const positive = [1, 10, 100];

		expect(
			resolveHeatmapYAxis(positive, HeatmapAxisScale.Log).splits,
		).toStrictEqual([0, 1, 2]);
		// Threshold 1: the boundaries sit a decade apart, one unit above the linear band.
		expect(
			resolveHeatmapYAxis(positive, HeatmapAxisScale.Symlog).splits,
		).toStrictEqual([1, 2, 3]);
	});

	it('symlog places boundaries either side of zero symmetrically', () => {
		const heights = rowHeights(SKEW, HeatmapAxisScale.Symlog);

		expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(0, 6);
	});

	it('symlog has no magnitude to scale against when every boundary is zero', () => {
		const { splits } = resolveHeatmapYAxis([0], HeatmapAxisScale.Symlog);

		expect(splits).toStrictEqual([0]);
	});
});
