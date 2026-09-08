import {
	clampColorSteps,
	createHeatmapColorResolver,
	DEFAULT_COLOR_STEPS,
	DEFAULT_HEATMAP_COLORS,
	getMaxCount,
	getSmallestPositiveCount,
	MAX_COLOR_STEPS,
	MIN_OPACITY_ALPHA,
	normalizeCount,
	resolveCountDomain,
} from '../colorScale';
import { HeatmapColorMode, HeatmapColorScale } from '../types';

const SERIES_COLOR = '#4e74f8';

describe('getMaxCount', () => {
	it('ignores null cells', () => {
		expect(
			getMaxCount([
				[1, null, 9],
				[null, 4],
			]),
		).toBe(9);
	});

	it('returns 0 for an empty or all-null grid', () => {
		expect(getMaxCount([])).toBe(0);
		expect(getMaxCount([[null, null]])).toBe(0);
	});

	it('ignores non-finite counts', () => {
		expect(getMaxCount([[3, Number.POSITIVE_INFINITY, Number.NaN]])).toBe(3);
	});
});

describe('getSmallestPositiveCount', () => {
	it('ignores nulls, zeros and non-finite counts', () => {
		expect(
			getSmallestPositiveCount([
				[0, null, 4],
				[Number.NaN, 2, -3],
			]),
		).toBe(2);
	});

	it('returns null when nothing is above zero', () => {
		expect(getSmallestPositiveCount([[0, null]])).toBeNull();
	});
});

describe('resolveCountDomain', () => {
	it('floors at 0 on auto so a zero count sits at the bottom of the scale', () => {
		expect(
			resolveCountDomain({ minCount: null, maxCount: null }, [[5, 20]]),
		).toStrictEqual({
			min: 0,
			max: 20,
			logFloor: 5,
		});
	});

	it('honours explicit clamps', () => {
		expect(
			resolveCountDomain({ minCount: 10, maxCount: 100 }, [[5, 20]]),
		).toStrictEqual({
			min: 10,
			max: 100,
			logFloor: 5,
		});
	});

	it('collapses a max at or below min', () => {
		expect(
			resolveCountDomain({ minCount: 50, maxCount: 10 }, [[5]]),
		).toStrictEqual({
			min: 50,
			max: 50,
			logFloor: 5,
		});
	});

	it('takes the log floor from the smallest positive count, below 1 included', () => {
		expect(
			resolveCountDomain({ minCount: null, maxCount: null }, [[0, 0.02, 0.8]])
				.logFloor,
		).toBeCloseTo(0.02, 6);
	});

	it('keeps the log floor within MAX_LOG_DECADES of the max', () => {
		expect(
			resolveCountDomain({ minCount: null, maxCount: null }, [[1, 1e9]]).logFloor,
		).toBe(1e3);
	});

	it('falls back to a floor of 1 for a grid without a positive count', () => {
		expect(
			resolveCountDomain({ minCount: null, maxCount: null }, [[null, 0]]).logFloor,
		).toBe(1);
	});
});

describe('normalizeCount', () => {
	const domain = { min: 0, max: 1000, logFloor: 1 };

	it('spreads low counts on a log scale where a linear one washes them out', () => {
		const log = (count: number): number =>
			normalizeCount({ count, domain, scale: HeatmapColorScale.Log });

		expect(log(10)).toBeCloseTo(1 / 3, 5);
		expect(log(20)).toBeCloseTo(Math.log10(20) / 3, 5);
		expect(
			normalizeCount({ count: 10, domain, scale: HeatmapColorScale.Linear }),
		).toBeCloseTo(0.01, 5);
	});

	it('puts 0 and 1 at the bottom of a log scale', () => {
		expect(
			normalizeCount({ count: 0, domain, scale: HeatmapColorScale.Log }),
		).toBe(0);
		expect(
			normalizeCount({ count: 1, domain, scale: HeatmapColorScale.Log }),
		).toBe(0);
	});

	it('reaches the top of the scale at max on every scale', () => {
		[
			HeatmapColorScale.Log,
			HeatmapColorScale.Sqrt,
			HeatmapColorScale.Linear,
		].forEach((scale) => {
			expect(normalizeCount({ count: 1000, domain, scale })).toBeCloseTo(1, 6);
		});
	});

	it('takes the square root of the linear position on a sqrt scale', () => {
		expect(
			normalizeCount({
				count: 250,
				domain: { min: 0, max: 1000, logFloor: 1 },
				scale: HeatmapColorScale.Sqrt,
			}),
		).toBeCloseTo(0.5, 6);
	});

	it('clamps counts outside the domain', () => {
		const scale = HeatmapColorScale.Linear;
		expect(normalizeCount({ count: -5, domain, scale })).toBe(0);
		expect(normalizeCount({ count: 5000, domain, scale })).toBe(1);
	});

	it('returns the bottom of the scale when min equals max', () => {
		expect(
			normalizeCount({
				count: 7,
				domain: { min: 7, max: 7, logFloor: 1 },
				scale: HeatmapColorScale.Log,
			}),
		).toBe(0);
	});

	it('spreads a log domain that sits entirely below a count of 1', () => {
		const fractional = { min: 0, max: 1, logFloor: 0.001 };
		const log = (count: number): number =>
			normalizeCount({
				count,
				domain: fractional,
				scale: HeatmapColorScale.Log,
			});

		expect(log(0.001)).toBe(0);
		expect(log(0.1)).toBeCloseTo(2 / 3, 5);
		expect(log(1)).toBeCloseTo(1, 6);
	});

	it('reads a log scale linearly when the floor reaches the top of the domain', () => {
		const domainAtFloor = { min: 0, max: 1, logFloor: 1 };

		expect(
			normalizeCount({
				count: 1,
				domain: domainAtFloor,
				scale: HeatmapColorScale.Log,
			}),
		).toBe(1);
		expect(
			normalizeCount({
				count: 0.5,
				domain: domainAtFloor,
				scale: HeatmapColorScale.Log,
			}),
		).toBe(0.5);
	});
});

describe('clampColorSteps', () => {
	it('clamps to the supported range', () => {
		expect(clampColorSteps(1)).toBe(2);
		expect(clampColorSteps(500)).toBe(MAX_COLOR_STEPS);
		expect(clampColorSteps(32)).toBe(32);
	});

	it('falls back to the default for a non-finite value', () => {
		expect(clampColorSteps(Number.NaN)).toBe(DEFAULT_COLOR_STEPS);
	});
});

describe('createHeatmapColorResolver', () => {
	const build = (
		overrides: Partial<typeof DEFAULT_HEATMAP_COLORS> = {},
		isDarkMode = true,
	): ReturnType<typeof createHeatmapColorResolver> =>
		createHeatmapColorResolver({
			options: { ...DEFAULT_HEATMAP_COLORS, ...overrides },
			domain: { min: 0, max: 1000, logFloor: 1 },
			isDarkMode,
			seriesColor: SERIES_COLOR,
		});

	it('leaves null cells uncoloured so they can be hatched', () => {
		const resolver = build();

		expect(resolver.colorFor(null)).toBeNull();
		expect(resolver.positionOf(null)).toBeNull();
	});

	it('gives a zero count the bottom colour, not the null treatment', () => {
		const resolver = build();

		expect(resolver.colorFor(0)).toBe(resolver.ramp[0]);
	});

	it('emits one ramp entry per step', () => {
		expect(build({ steps: 8 }).ramp).toHaveLength(8);
	});

	it('maps the max count to the top of the ramp', () => {
		const resolver = build({ steps: 8 });

		expect(resolver.colorFor(1000)).toBe(resolver.ramp[7]);
	});

	it('picks different stops per theme so low counts stay near the surface', () => {
		expect(build({}, true).ramp[0]).not.toBe(build({}, false).ramp[0]);
	});

	it('varies alpha in opacity mode, never below the visibility floor', () => {
		const resolver = build({ mode: HeatmapColorMode.Opacity, steps: 4 });

		expect(resolver.ramp[0]).toBe(`rgba(78, 116, 248, ${MIN_OPACITY_ALPHA})`);
		// `color` drops the alpha channel from the string once it reaches 1.
		expect(resolver.ramp[3]).toBe('rgb(78, 116, 248)');
	});

	it('prefers an explicit opacity fill over the series colour', () => {
		const resolver = build({
			mode: HeatmapColorMode.Opacity,
			fill: '#e5484d',
			steps: 2,
		});

		expect(resolver.ramp[1]).toBe('rgb(229, 72, 77)');
	});

	it('reports the domain it applied', () => {
		expect(build().domain).toStrictEqual({ min: 0, max: 1000, logFloor: 1 });
	});
});
