import type uPlot from 'uplot';
import { DistributionType } from 'lib/uPlotV2/config/types';

import {
	buildScatterConfig,
	getCursorHit,
	prepareScatterChartData,
	resolveAxisDistribution,
	ScatterAxisScale,
	ScatterSeries,
} from '../utils';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils', () => ({
	getStoredSeriesVisibility: jest.fn(),
}));

const SERIES: ScatterSeries[] = [
	{ label: 'cart', xs: [10, 20], ys: [100, 200], sizes: [1, null] },
	{ label: 'checkout', xs: [30], ys: [0] },
];

describe('prepareScatterChartData', () => {
	it('lays series out as facets behind an empty x slot', () => {
		expect(prepareScatterChartData(SERIES)).toStrictEqual([
			null,
			[
				[10, 20],
				[100, 200],
				[1, null],
			],
			[[30], [0]],
		]);
	});
});

describe('getCursorHit', () => {
	const plotWith = (idxs: Array<number | null>): uPlot =>
		({ cursor: { idxs } }) as unknown as uPlot;

	it('reads the series the scatter plugin answered for', () => {
		expect(getCursorHit(plotWith([null, null, 4, null]))).toStrictEqual({
			seriesIndex: 2,
			dataIndex: 4,
		});
	});

	it('takes a data index of 0 as a hit', () => {
		expect(getCursorHit(plotWith([0, 0]))).toStrictEqual({
			seriesIndex: 1,
			dataIndex: 0,
		});
	});

	it('is null off every dot', () => {
		expect(getCursorHit(plotWith([null, null]))).toBeNull();
		expect(getCursorHit({ cursor: {} } as unknown as uPlot)).toBeNull();
	});
});

describe('resolveAxisDistribution', () => {
	it('is linear when asked, whatever the values', () => {
		expect(
			resolveAxisDistribution([1, 1e6], ScatterAxisScale.Linear),
		).toStrictEqual({ distribution: DistributionType.Linear });
	});

	it('is a plain log when every value is positive', () => {
		expect(resolveAxisDistribution([1, 100], ScatterAxisScale.Log)).toStrictEqual(
			{ distribution: DistributionType.Logarithmic },
		);
	});

	it('falls back from log to a symmetric log around the smallest magnitude when zero is present', () => {
		expect(
			resolveAxisDistribution([0, 0.05, 300], ScatterAxisScale.Log),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 0.01,
		});
	});

	it('is a symmetric log when asked, even with only positive values', () => {
		expect(
			resolveAxisDistribution([2, 300], ScatterAxisScale.SymLog),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 1,
		});
	});

	it('uses a unit threshold when nothing is positive', () => {
		expect(
			resolveAxisDistribution([0, -5], ScatterAxisScale.SymLog),
		).toStrictEqual({
			distribution: DistributionType.SymmetricLog,
			asinhThreshold: 1,
		});
	});

	describe('auto', () => {
		it.each([
			[
				'positive values spanning three decades',
				[1, 1000],
				DistributionType.Logarithmic,
			],
			['positive values spanning less', [1, 999], DistributionType.Linear],
			['a wide span that includes zero', [0, 1, 1e6], DistributionType.Linear],
			['no finite values', [Number.NaN], DistributionType.Linear],
		])('picks a scale for %s', (_, values, distribution) => {
			expect(resolveAxisDistribution(values, ScatterAxisScale.Auto)).toStrictEqual(
				{ distribution },
			);
		});

		it('is the default', () => {
			expect(resolveAxisDistribution([1, 1e4])).toStrictEqual({
				distribution: DistributionType.Logarithmic,
			});
		});
	});
});

describe('buildScatterConfig', () => {
	const build = (
		overrides: Partial<Parameters<typeof buildScatterConfig>[0]> = {},
	): ReturnType<typeof buildScatterConfig> =>
		buildScatterConfig({
			id: 'scatter',
			series: SERIES,
			isDarkMode: true,
			x: { unit: 'reqps' },
			y: { unit: 'ms', scale: ScatterAxisScale.Log },
			...overrides,
		});

	it('titles each axis with its label, and leaves an unlabelled one bare', () => {
		const config = build({
			x: { unit: 'reqps', label: 'Throughput' },
			y: { unit: 'ms', label: '' },
		}).getConfig();
		const [xAxis, yAxis] = config.axes ?? [];

		expect(xAxis?.label).toBe('Throughput');
		expect(yAxis?.label).toBeUndefined();
	});

	it('emits a faceted plot with two value scales', () => {
		const config = build().getConfig();

		expect(config.mode).toBe(2);
		expect(config.scales?.x).toMatchObject({ time: false, distr: 1 });
		// The y column has a 0, so log becomes the symmetric variant.
		expect(config.scales?.y).toMatchObject({ time: false, distr: 4 });
	});

	it('draws one faceted series per group with the plugin path builder', () => {
		const config = build().getConfig();
		const [, cart, checkout] = config.series ?? [];

		expect(config.series).toHaveLength(3);
		expect(cart).toMatchObject({
			label: 'cart',
			facets: [
				{ scale: 'x', auto: true },
				{ scale: 'y', auto: true },
			],
		});
		expect(typeof cart?.paths).toBe('function');
		expect(cart?.paths).toBe(checkout?.paths);
		expect(cart?.points?.show).toBe(false);
	});

	it('formats both axes with their units', () => {
		const config = build().getConfig();
		const [xAxis, yAxis] = config.axes ?? [];

		expect(xAxis).toMatchObject({ scale: 'x', side: 2, space: 90 });
		expect(yAxis).toMatchObject({ scale: 'y', side: 3 });
		expect(typeof xAxis?.values).toBe('function');
		expect(typeof yAxis?.values).toBe('function');
	});

	it('registers a y threshold draw hook when thresholds are given', () => {
		const config = build({
			thresholds: [{ thresholdValue: 300, thresholdUnit: 'ms' }],
		}).getConfig();

		expect(config.hooks?.draw).toHaveLength(1);
		expect(build().getConfig().hooks?.draw).toBeUndefined();
	});
});
