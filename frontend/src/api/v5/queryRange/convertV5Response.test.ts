import { SuccessResponse } from 'types/api';
import {
	MetricRangePayloadV5,
	QueryBuilderFormula,
	QueryRangeRequestV5,
	QueryRangeResponseV5,
	RequestType,
	ScalarData,
	TelemetryFieldKey,
	TimeSeries,
	TimeSeriesData,
	TimeSeriesValue,
} from 'types/api/v5/queryRange';

import { convertV5ResponseToLegacy } from './convertV5Response';

describe('convertV5ResponseToLegacy', () => {
	function makeBaseSuccess<T>(
		payload: T,
		params: QueryRangeRequestV5,
	): SuccessResponse<T, QueryRangeRequestV5> {
		return {
			statusCode: 200,
			message: 'success',
			payload,
			error: null,
			params,
		};
	}

	function makeBaseParams(
		requestType: RequestType,
		queries: QueryRangeRequestV5['compositeQuery']['queries'],
	): QueryRangeRequestV5 {
		return {
			schemaVersion: 'v1',
			start: 1,
			end: 2,
			requestType,
			compositeQuery: { queries },
			variables: {},
			formatOptions: { formatTableResultForUI: false, fillGaps: false },
		};
	}

	it('converts time_series response into legacy series structure', () => {
		const timeSeries: TimeSeriesData = {
			queryName: 'A',
			aggregations: [
				{
					index: 0,
					alias: '__result_0',
					meta: {},
					series: [
						{
							labels: [
								{
									key: { name: 'service.name' } as unknown as TelemetryFieldKey,
									value: 'adservice',
								},
							],
							values: [
								{ timestamp: 1000, value: 10 } as unknown as TimeSeriesValue,
								{ timestamp: 2000, value: 12 } as unknown as TimeSeriesValue,
							],
						} as unknown as TimeSeries,
					],
				},
			],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'time_series',
			data: { results: [timeSeries] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
		};

		const params = makeBaseParams('time_series', [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					stepInterval: 60,
					disabled: false,
					aggregations: [{ expression: 'count()' }],
				},
			},
		]);

		const input: SuccessResponse<MetricRangePayloadV5, QueryRangeRequestV5> =
			makeBaseSuccess({ data: v5Data }, params);

		const legendMap = { A: '{{service.name}}' };
		const result = convertV5ResponseToLegacy(input, legendMap, false);

		expect(result.payload.data.resultType).toBe('time_series');
		expect(result.payload.data.result).toHaveLength(1);
		const q = result.payload.data.result[0];
		expect(q.queryName).toBe('A');
		expect(q.legend).toBe('{{service.name}}');
		expect(q.series?.[0]).toStrictEqual(
			expect.objectContaining({
				labels: { 'service.name': 'adservice' },
				values: [
					{ timestamp: 1000, value: '10' },
					{ timestamp: 2000, value: '12' },
				],
				metaData: expect.objectContaining({
					alias: '__result_0',
					index: 0,
					queryName: 'A',
				}),
			}),
		);
	});

	it('converts heatmap response: standard scalar values plus dedicated heatmapValues/bounds', () => {
		const heatmap: TimeSeriesData = {
			queryName: 'A',
			aggregations: [
				{
					index: 0,
					alias: '__result_0',
					meta: {},
					series: [
						{
							labels: [],
							bounds: [0, 1, 2, 3],
							values: [
								{
									timestamp: 1000,
									value: 0,
									values: [5, 10, 15],
								} as unknown as TimeSeriesValue,
								{
									timestamp: 2000,
									value: 0,
									values: [8, 12, 18],
								} as unknown as TimeSeriesValue,
							],
						} as unknown as TimeSeries,
					],
				},
			],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'heatmap',
			data: { results: [heatmap] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
		};

		const params = makeBaseParams('heatmap', [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					stepInterval: 60,
					disabled: false,
					aggregations: [{ expression: 'heatmap(duration_nano, 10)' }],
				},
			},
		]);

		const input: SuccessResponse<MetricRangePayloadV5, QueryRangeRequestV5> =
			makeBaseSuccess({ data: v5Data }, params);

		const result = convertV5ResponseToLegacy(input, { A: 'A' }, false);

		expect(result.payload.data.resultType).toBe('heatmap');
		const series = result.payload.data.result[0].series?.[0];
		// `values` keeps the standard scalar mapping, not the bucket arrays.
		expect(series?.values).toStrictEqual([
			{ timestamp: 1000, value: '0' },
			{ timestamp: 2000, value: '0' },
		]);
		// Heatmap bucket data lives in its own field alongside `bounds`.
		expect(series?.bounds).toStrictEqual([0, 1, 2, 3]);
		expect(series?.heatmapValues).toStrictEqual([
			{ timestamp: 1000, values: [5, 10, 15] },
			{ timestamp: 2000, values: [8, 12, 18] },
		]);
	});

	it('converts scalar to legacy table (formatForWeb=false) with names/ids resolved from aggregations', () => {
		const scalar: ScalarData = {
			columns: [
				// group column
				{
					name: 'service.name',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'group',
				} as unknown as ScalarData['columns'][number],
				// aggregation 0
				{
					name: '__result_0',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
				// aggregation 1
				{
					name: '__result_1',
					queryName: 'A',
					aggregationIndex: 1,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
				// formula F1
				{
					name: '__result',
					queryName: 'F1',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
			],
			data: [['adservice', 606, 1.452, 151.5]],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'scalar',
			data: { results: [scalar] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
		};

		const params = makeBaseParams('scalar', [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					stepInterval: 60,
					disabled: false,
					aggregations: [
						{ expression: 'count()' },
						{ expression: 'avg(app.ads.count)', alias: 'avg' },
					],
				},
			},
			{
				type: 'builder_formula',
				spec: {
					name: 'F1',
					expression: 'A * 0.25',
				} as unknown as QueryBuilderFormula,
			},
		]);

		const input: SuccessResponse<MetricRangePayloadV5, QueryRangeRequestV5> =
			makeBaseSuccess({ data: v5Data }, params);
		const legendMap = { A: '{{service.name}}', F1: '' };
		const result = convertV5ResponseToLegacy(input, legendMap, false);

		expect(result.payload.data.resultType).toBe('scalar');
		const [tableEntry] = result.payload.data.result;
		expect(tableEntry.table?.columns).toStrictEqual([
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			{ name: 'count()', queryName: 'A', isValueColumn: true, id: 'A.count()' },
			{
				name: 'avg',
				queryName: 'A',
				isValueColumn: true,
				id: 'A.avg(app.ads.count)',
			},
			{ name: 'F1', queryName: 'F1', isValueColumn: true, id: 'F1' },
		]);
		expect(tableEntry.table?.rows?.[0]).toStrictEqual({
			data: {
				'service.name': 'adservice',
				'A.count()': 606,
				'A.avg(app.ads.count)': 1.452,
				F1: 151.5,
			},
		});
	});

	it('converts scalar with formatForWeb=true to UI-friendly table', () => {
		const scalar: ScalarData = {
			columns: [
				{
					name: 'service.name',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'group',
				} as any,
				{
					name: '__result_0',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as any,
			],
			data: [['adservice', 580]],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'scalar',
			data: { results: [scalar] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
		};

		const params = makeBaseParams('scalar', [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					stepInterval: 60,
					disabled: false,
					aggregations: [{ expression: 'count()' }],
				},
			},
		]);

		const input: SuccessResponse<MetricRangePayloadV5, QueryRangeRequestV5> =
			makeBaseSuccess({ data: v5Data }, params);
		const legendMap = { A: '{{service.name}}' };
		const result = convertV5ResponseToLegacy(input, legendMap, true);

		expect(result.payload.data.resultType).toBe('scalar');
		const [tableEntry] = result.payload.data.result;
		expect(tableEntry.table?.columns).toStrictEqual([
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			// Single aggregation: name resolves to legend, id resolves to queryName
			{ name: '{{service.name}}', queryName: 'A', isValueColumn: true, id: 'A' },
		]);
		expect(tableEntry.table?.rows?.[0]).toStrictEqual({
			data: {
				'service.name': 'adservice',
				A: 580,
			},
		});
	});

	it('clickhouse_sql scalar keeps each value column distinct (regression: all-"A" collapse)', () => {
		const scalar: ScalarData = {
			columns: [
				{
					name: 'service.name',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'group',
				} as unknown as ScalarData['columns'][number],
				{
					name: 'current_availability',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
				{
					name: 'error_budget_remaining',
					queryName: 'A',
					aggregationIndex: 1,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
				{
					name: 'budget_status',
					queryName: 'A',
					aggregationIndex: 2,
					columnType: 'group',
				} as unknown as ScalarData['columns'][number],
				{
					name: 'total_requests',
					queryName: 'A',
					aggregationIndex: 4,
					columnType: 'aggregation',
				} as unknown as ScalarData['columns'][number],
			],
			data: [['kuja-api_gateway-service', 99.985, 0.985, 'Healthy ✅', 2181216]],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'scalar',
			data: { results: [scalar] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0, stepIntervals: {} },
		};

		// A clickhouse_sql envelope contributes no aggregation metadata.
		const params = makeBaseParams('scalar', [
			{
				type: 'clickhouse_sql',
				spec: {
					name: 'A',
					query: 'SELECT ...',
					disabled: false,
				},
			} as unknown as QueryRangeRequestV5['compositeQuery']['queries'][number],
		]);

		const input: SuccessResponse<MetricRangePayloadV5, QueryRangeRequestV5> =
			makeBaseSuccess({ data: v5Data }, params);
		// formatForWeb=true is the table-panel path.
		const result = convertV5ResponseToLegacy(input, { A: '' }, true);

		const [tableEntry] = result.payload.data.result;
		// Headers keep their real names instead of collapsing to "A".
		expect(tableEntry.table?.columns).toStrictEqual([
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			{
				name: 'current_availability',
				queryName: 'A',
				isValueColumn: true,
				id: 'current_availability',
			},
			{
				name: 'error_budget_remaining',
				queryName: 'A',
				isValueColumn: true,
				id: 'error_budget_remaining',
			},
			{
				name: 'budget_status',
				queryName: 'A',
				isValueColumn: false,
				id: 'budget_status',
			},
			{
				name: 'total_requests',
				queryName: 'A',
				isValueColumn: true,
				id: 'total_requests',
			},
		]);
		// Ids are unique, so value columns don't overwrite each other in the row.
		expect(tableEntry.table?.rows?.[0]).toStrictEqual({
			data: {
				'service.name': 'kuja-api_gateway-service',
				current_availability: 99.985,
				error_budget_remaining: 0.985,
				budget_status: 'Healthy ✅',
				total_requests: 2181216,
			},
		});
	});
});
