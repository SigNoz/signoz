import type uPlot from 'uplot';

import { ScatterAxisScale, type ScatterSeries } from '../types';
import { buildScatterConfig } from '../utils';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils', () => ({
	getStoredSeriesVisibility: jest.fn(),
}));

const SERIES: ScatterSeries[] = [
	{ label: 'cart', xs: [10, 20], ys: [100, 200], sizes: [1, null] },
	{ label: 'checkout', xs: [30], ys: [0] },
];

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

	it('draws a line along both plot edges', () => {
		const [xAxis, yAxis] = build().getConfig().axes ?? [];

		expect(xAxis?.border?.show).toBe(true);
		expect(yAxis?.border?.show).toBe(true);
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
			y: {
				unit: 'ms',
				thresholds: [{ thresholdValue: 300, thresholdUnit: 'ms' }],
			},
		}).getConfig();

		expect(config.hooks?.draw).toHaveLength(1);
		expect(build().getConfig().hooks?.draw).toBeUndefined();
	});

	it('registers one draw hook per axis with thresholds', () => {
		const config = build({
			x: { unit: 'reqps', thresholds: [{ thresholdValue: 15 }] },
			y: { unit: 'ms', thresholds: [{ thresholdValue: 300 }] },
		}).getConfig();

		expect(config.hooks?.draw).toHaveLength(2);
	});

	it('stretches the x range to reach an x threshold', () => {
		const config = build({
			x: { unit: 'reqps', thresholds: [{ thresholdValue: 1000 }] },
		}).getConfig();
		const range = config.scales?.x?.range as uPlot.Range.Function;
		const plot = { bbox: { width: 0, height: 0 } } as uPlot;
		const [, max] = range(plot, 10, 30, 'x');

		expect(max).toBeGreaterThanOrEqual(1000);
	});
});
