/* eslint-disable sonarjs/no-duplicate-string */
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
						({
							labels: [
								{
									key: ({ name: 'service.name' } as unknown) as TelemetryFieldKey,
									value: 'adservice',
								},
							],
							values: [
								({ timestamp: 1000, value: 10 } as unknown) as TimeSeriesValue,
								({ timestamp: 2000, value: 12 } as unknown) as TimeSeriesValue,
							],
						} as unknown) as TimeSeries,
					],
				},
			],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'time_series',
			data: { results: [timeSeries] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0 },
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

		const input: SuccessResponse<
			MetricRangePayloadV5,
			QueryRangeRequestV5
		> = makeBaseSuccess({ data: v5Data }, params);

		const legendMap = { A: '{{service.name}}' };
		const result = convertV5ResponseToLegacy(input, legendMap, false);

		expect(result.payload.data.resultType).toBe('time_series');
		expect(result.payload.data.result).toHaveLength(1);
		const q = result.payload.data.result[0];
		expect(q.queryName).toBe('A');
		expect(q.legend).toBe('{{service.name}}');
		expect(q.series?.[0]).toEqual(
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

	it('converts scalar to legacy table (formatForWeb=false) with names/ids resolved from aggregations', () => {
		const scalar: ScalarData = {
			columns: [
				// group column
				({
					name: 'service.name',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'group',
				} as unknown) as ScalarData['columns'][number],
				// aggregation 0
				({
					name: '__result_0',
					queryName: 'A',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as unknown) as ScalarData['columns'][number],
				// aggregation 1
				({
					name: '__result_1',
					queryName: 'A',
					aggregationIndex: 1,
					columnType: 'aggregation',
				} as unknown) as ScalarData['columns'][number],
				// formula F1
				({
					name: '__result',
					queryName: 'F1',
					aggregationIndex: 0,
					columnType: 'aggregation',
				} as unknown) as ScalarData['columns'][number],
			],
			data: [['adservice', 606, 1.452, 151.5]],
		};

		const v5Data: QueryRangeResponseV5 = {
			type: 'scalar',
			data: { results: [scalar] },
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0 },
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
				spec: ({
					name: 'F1',
					expression: 'A * 0.25',
				} as unknown) as QueryBuilderFormula,
			},
		]);

		const input: SuccessResponse<
			MetricRangePayloadV5,
			QueryRangeRequestV5
		> = makeBaseSuccess({ data: v5Data }, params);
		const legendMap = { A: '{{service.name}}', F1: '' };
		const result = convertV5ResponseToLegacy(input, legendMap, false);

		expect(result.payload.data.resultType).toBe('scalar');
		const [tableEntry] = result.payload.data.result;
		expect(tableEntry.table?.columns).toEqual([
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
		expect(tableEntry.table?.rows?.[0]).toEqual({
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
			meta: { rowsScanned: 0, bytesScanned: 0, durationMs: 0 },
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

		const input: SuccessResponse<
			MetricRangePayloadV5,
			QueryRangeRequestV5
		> = makeBaseSuccess({ data: v5Data }, params);
		const legendMap = { A: '{{service.name}}' };
		const result = convertV5ResponseToLegacy(input, legendMap, true);

		expect(result.payload.data.resultType).toBe('scalar');
		const [tableEntry] = result.payload.data.result;
		expect(tableEntry.table?.columns).toEqual([
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			// Single aggregation: name resolves to legend, id resolves to queryName
			{ name: '{{service.name}}', queryName: 'A', isValueColumn: true, id: 'A' },
		]);
		expect(tableEntry.table?.rows?.[0]).toEqual({
			data: {
				'service.name': 'adservice',
				A: 580,
			},
		});
	});
});
