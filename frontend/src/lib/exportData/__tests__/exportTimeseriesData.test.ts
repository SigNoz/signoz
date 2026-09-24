import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { TimeSeries, TimeSeriesData } from 'types/api/v5/queryRange';

import { exportTimeseriesData } from '../exportTimeseriesData';

const iso = (ms: number): string => new Date(ms).toISOString();

function makeSeries(
	labels: Record<string, string>,
	values: [number, number][],
): TimeSeries {
	return {
		labels: Object.entries(labels).map(([name, value]) => ({
			key: { name },
			value,
		})),
		values: values.map(([timestamp, value]) => ({ timestamp, value })),
	};
}

function makeQuery(
	queryName: string,
	buckets: { index?: number; alias?: string; series: TimeSeries[] }[],
): TimeSeriesData {
	return {
		queryName,
		aggregations: buckets.map((bucket, i) => ({
			index: bucket.index ?? i,
			alias: bucket.alias ?? '',
			meta: {},
			series: bucket.series,
		})),
	};
}

describe('exportTimeseriesData', () => {
	it('one row per point: query column, label columns, unit in value header, legend naming', () => {
		const data = [
			makeQuery('A', [
				{
					series: [
						makeSeries({ service_name: 'frontend' }, [
							[1000, 12],
							[2000, 15],
						]),
					],
				},
			]),
		];

		const table = exportTimeseriesData({
			data,
			yAxisUnit: 'ms',
			legendMap: { A: '{{service_name}}' },
		});

		expect(table.headers).toStrictEqual([
			'timestamp',
			'query',
			'series',
			'service_name',
			'value (ms)',
		]);
		expect(table.rows).toStrictEqual([
			[iso(1000), 'A', 'frontend', 'frontend', 12],
			[iso(2000), 'A', 'frontend', 'frontend', 15],
		]);
	});

	it('no legend falls back to the label-set name from getLabelName', () => {
		const data = [
			makeQuery('A', [
				{ series: [makeSeries({ service_name: 'frontend' }, [[1000, 12]])] },
			]),
		];

		const table = exportTimeseriesData({ data });

		expect(table.rows).toStrictEqual([
			[iso(1000), 'A', '{service_name="frontend"}', 'frontend', 12],
		]);
	});

	it('omits display-only format ids (short/none) from headers', () => {
		const data = [
			makeQuery('A', [{ series: [makeSeries({ service: 'a' }, [[1000, 1]])] }]),
		];

		const short = exportTimeseriesData({ data, yAxisUnit: 'short' });
		expect(short.headers[short.headers.length - 1]).toBe('value');

		const none = exportTimeseriesData({ data, yAxisUnit: 'none' });
		expect(none.headers[none.headers.length - 1]).toBe('value');
	});

	it('multi-query: query is its own column; label keys are unioned', () => {
		const data = [
			makeQuery('A', [{ series: [makeSeries({ service: 'x' }, [[1000, 1]])] }]),
			makeQuery('B', [{ series: [makeSeries({ service: 'y' }, [[1000, 2]])] }]),
		];

		const table = exportTimeseriesData({
			data,
			legendMap: { A: '{{service}}', B: '{{service}}' },
		});

		expect(table.headers).toStrictEqual([
			'timestamp',
			'query',
			'series',
			'service',
			'value',
		]);
		expect(table.rows).toStrictEqual([
			[iso(1000), 'A', 'x', 'x', 1],
			[iso(1000), 'B', 'y', 'y', 2],
		]);
	});

	it('multi-aggregation with the builder query: names match the chart legend', () => {
		const data = [
			makeQuery('A', [
				{ index: 0, alias: '__result_0', series: [makeSeries({}, [[1000, 5]])] },
				{
					index: 1,
					alias: '__result_1',
					series: [makeSeries({}, [[1000, 300]])],
				},
			]),
			makeQuery('B', [
				{
					index: 0,
					alias: '__result_0',
					series: [
						makeSeries({ 'cloud.account.id': 'signoz-staging' }, [[1000, 7]]),
					],
				},
			]),
		];

		const query = {
			queryType: 'builder',
			builder: {
				queryData: [
					{
						queryName: 'A',
						dataSource: 'logs',
						aggregations: [
							{ expression: 'count()' },
							{ expression: 'avg(code.lineno)' },
						],
						groupBy: [],
					},
					{
						queryName: 'B',
						dataSource: 'logs',
						aggregations: [{ expression: 'count()' }],
						groupBy: [{ key: 'cloud.account.id' }],
					},
				],
				queryFormulas: [],
			},
		} as unknown as Query;

		const table = exportTimeseriesData({ data, query });

		expect(table.rows).toStrictEqual([
			[iso(1000), 'A', 'count()-A', '', 5],
			[iso(1000), 'A', 'avg(code.lineno)-A', '', 300],
			[iso(1000), 'B', '{cloud.account.id="signoz-staging"}', 'signoz-staging', 7],
		]);
	});

	it('multi-aggregation without the builder query: falls back to base names', () => {
		const data = [
			makeQuery('A', [
				{ index: 0, alias: '__result_0', series: [makeSeries({}, [[1000, 5]])] },
				{
					index: 1,
					alias: '__result_1',
					series: [makeSeries({}, [[1000, 300]])],
				},
			]),
		];

		const table = exportTimeseriesData({ data });

		expect(table.rows).toStrictEqual([
			[iso(1000), 'A', 'A', 5],
			[iso(1000), 'A', 'A', 300],
		]);
	});

	it('empty data: returns a headers-only table', () => {
		expect(exportTimeseriesData({ data: [] })).toStrictEqual({
			headers: ['timestamp', 'query', 'series', 'value'],
			rows: [],
		});
	});
});
