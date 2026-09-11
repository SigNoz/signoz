import type {
	Querybuildertypesv5TimeSeriesDataDTO,
	Querybuildertypesv5TimeSeriesDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	FALLBACK_STEP_SECONDS,
	prepareHeatmapData,
	resolveHeatmapStep,
} from '../prepareData';

/** One result carrying a single aggregation with `buckets` on its meta. */
function result({
	queryName = 'A',
	buckets = [1, 2, 4],
	series = [],
}: {
	queryName?: string;
	buckets?: number[];
	series?: Querybuildertypesv5TimeSeriesDTO[];
} = {}): Querybuildertypesv5TimeSeriesDataDTO {
	return { queryName, aggregations: [{ index: 0, meta: { buckets }, series }] };
}

describe('prepareHeatmapData', () => {
	it('reads the bucket bounds and pivots each series into seconds', () => {
		const { buckets, series, queryName } = prepareHeatmapData({
			results: [
				result({
					series: [
						{
							labels: [{ key: { name: 'service' }, value: 'redis' }],
							values: [
								{ timestamp: 1_700_000_000_000, values: [1, 2, 0, 3] },
								{ timestamp: 1_700_000_060_000, values: [0, 0, 0, 0] },
							],
						},
					],
				}),
			],
			legendMap: {},
		});

		expect(buckets).toStrictEqual([1, 2, 4]);
		expect(queryName).toBe('A');
		expect(series).toStrictEqual([
			{
				label: '{service="redis"}',
				labels: [{ key: 'service', value: 'redis' }],
				points: [
					{ timestamp: 1_700_000_000, counts: [1, 2, 0, 3] },
					{ timestamp: 1_700_000_060, counts: [0, 0, 0, 0] },
				],
			},
		]);
	});

	it('names an ungrouped series after its query, so the legend can name it', () => {
		const { series } = prepareHeatmapData({
			results: [
				result({ series: [{ values: [{ timestamp: 0, values: [1, 0, 0, 0] }] }] }),
			],
			legendMap: { A: '' },
		});

		expect(series).toHaveLength(1);
		expect(series[0].label).toBe('A');
	});

	it('applies the query legend as the group label template', () => {
		const { series } = prepareHeatmapData({
			results: [
				result({
					series: [
						{
							labels: [{ key: { name: 'host' }, value: 'web-1' }],
							values: [],
						},
					],
				}),
			],
			legendMap: { A: '{{host}}' },
		});

		expect(series[0].label).toBe('web-1');
	});

	it('keeps 0 a count and turns a non-finite one into "no data"', () => {
		const { series } = prepareHeatmapData({
			results: [
				result({
					series: [
						{ values: [{ timestamp: 0, values: [0, Number.NaN, Infinity, 2] }] },
					],
				}),
			],
			legendMap: {},
		});

		expect(series[0].points[0].counts).toStrictEqual([0, null, null, 2]);
	});

	it('skips aggregations with no bounds — those carry no bucket axis', () => {
		const { buckets, queryName } = prepareHeatmapData({
			results: [
				{ queryName: 'A', aggregations: [{ index: 0, series: [] }] },
				result({ queryName: 'B', buckets: [8, 16] }),
			],
			legendMap: {},
		});

		expect(buckets).toStrictEqual([8, 16]);
		expect(queryName).toBe('B');
	});

	it('answers empty for a response with no results', () => {
		expect(prepareHeatmapData({ results: [], legendMap: {} })).toStrictEqual({
			buckets: [],
			series: [],
			queryName: '',
		});
	});
});

describe('resolveHeatmapStep', () => {
	const series = [
		{
			label: '',
			points: [
				{ timestamp: 100, counts: [1] },
				{ timestamp: 130, counts: [1] },
			],
		},
	];

	it('prefers the step the server reports', () => {
		expect(resolveHeatmapStep({ series, stepInterval: 60 })).toBe(60);
	});

	it('falls back to the first positive gap between columns', () => {
		expect(resolveHeatmapStep({ series, stepInterval: undefined })).toBe(30);
	});

	it('falls back to a minute when nothing says how wide a column is', () => {
		expect(
			resolveHeatmapStep({
				series: [{ label: '', points: [{ timestamp: 100, counts: [1] }] }],
				stepInterval: 0,
			}),
		).toBe(FALLBACK_STEP_SECONDS);
	});
});
