import type { PanelSeries } from '../types';
import {
	hasSingleVisiblePoint,
	prepareAlignedData,
	toClickPluginPayload,
} from '../uplotData';

function makeSeries(
	values: { timestamp: number; value: number }[],
	overrides: Partial<PanelSeries> = {},
): PanelSeries {
	return {
		queryName: 'A',
		legend: '',
		labels: {},
		kind: 'series',
		values,
		aggregation: { index: 0, alias: '' },
		...overrides,
	};
}

describe('prepareAlignedData', () => {
	it('converts ms timestamps to seconds and aligns series on the union x-axis', () => {
		const aligned = prepareAlignedData([
			makeSeries([
				{ timestamp: 1_000, value: 1 },
				{ timestamp: 2_000, value: 2 },
			]),
			makeSeries([
				{ timestamp: 2_000, value: 20 },
				{ timestamp: 3_000, value: 30 },
			]),
		]);
		expect(aligned).toStrictEqual([
			[1, 2, 3],
			[1, 2, null],
			[null, 20, 30],
		]);
	});

	it('replaces non-finite values with null', () => {
		const aligned = prepareAlignedData([
			makeSeries([
				{ timestamp: 1_000, value: NaN },
				{ timestamp: 2_000, value: Infinity },
				{ timestamp: 3_000, value: 3 },
			]),
		]);
		expect(aligned[1]).toStrictEqual([null, null, 3]);
	});

	it('yields an empty y-array for a series with no values (legacy parity)', () => {
		const aligned = prepareAlignedData([
			makeSeries([{ timestamp: 1_000, value: 1 }]),
			makeSeries([]),
		]);
		expect(aligned[2]).toStrictEqual([]);
	});

	it('returns a lone timestamp axis for no series', () => {
		expect(prepareAlignedData([])).toStrictEqual([[]]);
	});
});

describe('hasSingleVisiblePoint', () => {
	it('true for zero or one finite point', () => {
		expect(hasSingleVisiblePoint([])).toBe(true);
		expect(hasSingleVisiblePoint([{ timestamp: 1, value: 5 }])).toBe(true);
		expect(
			hasSingleVisiblePoint([
				{ timestamp: 1, value: NaN },
				{ timestamp: 2, value: 5 },
			]),
		).toBe(true);
	});

	it('false once two finite points exist', () => {
		expect(
			hasSingleVisiblePoint([
				{ timestamp: 1, value: 1 },
				{ timestamp: 2, value: 2 },
			]),
		).toBe(false);
	});
});

describe('toClickPluginPayload', () => {
	it('produces the tuple-shaped legacy result the shared click plugin reads', () => {
		const payload = toClickPluginPayload([
			makeSeries([{ timestamp: 5_000, value: 1.5 }], {
				labels: { host: 'h1' },
				legend: 'L',
				aggregation: { index: 1, alias: 'p99' },
			}),
		]);
		expect(payload.data.result).toStrictEqual([
			{
				metric: { host: 'h1' },
				queryName: 'A',
				legend: 'L',
				values: [[5, '1.5']],
				metaData: { alias: 'p99', index: 1, queryName: 'A' },
			},
		]);
	});
});
