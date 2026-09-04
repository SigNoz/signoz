import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas';

import {
	flattenTimeSeries,
	getExecStats,
	getRawResults,
	getScalarResults,
	getTimeSeriesResults,
} from '../v5ResponseData';

// Test fixtures are cast at the outer boundary; the generated response union
// erases `results` to unknown[] anyway.

function timeSeriesResponse(
	results: Record<string, unknown>[],
	meta?: Record<string, unknown>,
): QueryRangeV5200 {
	return {
		status: 'success',
		data: { type: 'time_series', data: { results }, meta },
	} as unknown as QueryRangeV5200;
}

const SERIES_A = {
	queryName: 'A',
	aggregations: [
		{
			index: 0,
			alias: 'p99',
			meta: { unit: 'ms' },
			series: [
				{
					labels: [{ key: { name: 'host' }, value: 'h1' }],
					values: [
						{ timestamp: 1000, value: 1.5 },
						{ timestamp: 2000, value: 2.5, partial: true },
					],
				},
			],
		},
	],
};

describe('narrowing accessors', () => {
	it('getTimeSeriesResults returns results only for time_series responses', () => {
		expect(getTimeSeriesResults(timeSeriesResponse([SERIES_A]))).toHaveLength(1);
		expect(
			getTimeSeriesResults({
				status: 'success',
				data: { type: 'scalar', data: { results: [{}] } },
			} as unknown as QueryRangeV5200),
		).toStrictEqual([]);
		expect(getTimeSeriesResults(undefined)).toStrictEqual([]);
	});

	it('getScalarResults returns results only for scalar responses', () => {
		const scalar = {
			status: 'success',
			data: { type: 'scalar', data: { results: [{ queryName: 'A' }] } },
		} as unknown as QueryRangeV5200;
		expect(getScalarResults(scalar)).toStrictEqual([{ queryName: 'A' }]);
		expect(getScalarResults(timeSeriesResponse([SERIES_A]))).toStrictEqual([]);
	});

	it('getRawResults accepts both raw and trace responses', () => {
		const make = (type: string): QueryRangeV5200 =>
			({
				status: 'success',
				data: { type, data: { results: [{ queryName: 'A', rows: [] }] } },
			}) as unknown as QueryRangeV5200;
		expect(getRawResults(make('raw'))).toHaveLength(1);
		expect(getRawResults(make('trace'))).toHaveLength(1);
		expect(getRawResults(make('time_series'))).toStrictEqual([]);
	});

	it('getExecStats surfaces top-level meta (incl. stepIntervals)', () => {
		const response = timeSeriesResponse([], { stepIntervals: { A: 60 } });
		expect(getExecStats(response)?.stepIntervals).toStrictEqual({ A: 60 });
	});
});

describe('flattenTimeSeries', () => {
	it('flattens aggregations × series with numeric ms values and labels record', () => {
		const [series] = flattenTimeSeries(
			getTimeSeriesResults(timeSeriesResponse([SERIES_A])),
			{ A: 'CPU {{host}}' },
		);
		expect(series).toStrictEqual({
			queryName: 'A',
			legend: 'CPU {{host}}',
			labels: { host: 'h1' },
			kind: 'series',
			values: [
				{ timestamp: 1000, value: 1.5 },
				{ timestamp: 2000, value: 2.5, partial: true },
			],
			aggregation: { index: 0, alias: 'p99', unit: 'ms' },
		});
	});

	it('tags anomaly companion series with their kind', () => {
		const result = {
			queryName: 'A',
			aggregations: [
				{
					index: 0,
					alias: '',
					series: [{ labels: [], values: [] }],
					predictedSeries: [{ labels: [], values: [] }],
					upperBoundSeries: [{ labels: [], values: [] }],
				},
			],
		};
		const kinds = flattenTimeSeries(
			getTimeSeriesResults(timeSeriesResponse([result])),
			{},
		).map((s) => s.kind);
		expect(kinds.sort()).toStrictEqual(['predicted', 'series', 'upperBound']);
	});

	// V1 parity: convertV5ResponseToLegacy + GetMetricQueryRange backfill.
	it('falls back legend to queryName and mirrors it into labels when the series has no labels', () => {
		const result = {
			queryName: 'A',
			aggregations: [{ index: 0, series: [{ labels: [], values: [] }] }],
		};
		const [series] = flattenTimeSeries(
			getTimeSeriesResults(timeSeriesResponse([result])),
			{},
		);
		expect(series.legend).toBe('A');
		expect(series.labels).toStrictEqual({ A: 'A' });
	});

	it('keeps a user legend without touching labels when labels exist', () => {
		const [series] = flattenTimeSeries(
			getTimeSeriesResults(timeSeriesResponse([SERIES_A])),
			{},
		);
		expect(series.legend).toBe('');
		expect(series.labels).toStrictEqual({ host: 'h1' });
	});

	it('handles multiple aggregation buckets per query', () => {
		const result = {
			queryName: 'A',
			aggregations: [
				{ index: 0, alias: 'avg', series: [{ labels: [], values: [] }] },
				{ index: 1, alias: 'max', series: [{ labels: [], values: [] }] },
			],
		};
		const flattened = flattenTimeSeries(
			getTimeSeriesResults(timeSeriesResponse([result])),
			{},
		);
		expect(flattened.map((s) => s.aggregation)).toStrictEqual([
			{ index: 0, alias: 'avg', unit: undefined },
			{ index: 1, alias: 'max', unit: undefined },
		]);
	});
});
