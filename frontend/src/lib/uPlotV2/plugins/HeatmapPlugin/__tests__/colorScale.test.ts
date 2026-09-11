import {
	clampColorSteps,
	createHeatmapColorResolver,
	DEFAULT_COLOR_STEPS,
	DEFAULT_HEATMAP_COLORS,
	getMaxCount,
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

describe('resolveCountDomain', () => {
	it('floors at 0 on auto so a zero count sits at the bottom of the scale', () => {
		expect(
			resolveCountDomain({ minCount: null, maxCount: null }, [[5, 20]]),
		).toStrictEqual({
			min: 0,
			max: 20,
		});
	});

	it('honours explicit clamps', () => {
		expect(
			resolveCountDomain({ minCount: 10, maxCount: 100 }, [[5, 20]]),
		).toStrictEqual({
			min: 10,
			max: 100,
		});
	});

	it('collapses a max at or below min', () => {
		expect(
			resolveCountDomain({ minCount: 50, maxCount: 10 }, [[5]]),
		).toStrictEqual({
			min: 50,
			max: 50,
		});
	});
});

describe('normalizeCount', () => {
	const domain = { min: 0, max: 1000 };

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
				domain: { min: 0, max: 1000 },
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
				domain: { min: 7, max: 7 },
				scale: HeatmapColorScale.Log,
			}),
		).toBe(0);
	});

	it('handles a log domain whose min and max share a decade floor', () => {
		expect(
			normalizeCount({
				count: 1,
				domain: { min: 0, max: 1 },
				scale: HeatmapColorScale.Log,
			}),
		).toBe(0);
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
			domain: { min: 0, max: 1000 },
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
		expect(build().domain).toStrictEqual({ min: 0, max: 1000 });
	});
});
