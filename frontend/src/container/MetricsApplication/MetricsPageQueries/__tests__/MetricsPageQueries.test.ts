import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderData } from 'types/common/queryBuilder';
import { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

import {
	apDexMetricsQueryBuilderQueries,
	errorPercentage,
	latency,
} from '../OverviewQueries';

const toV5Queries = (builder: QueryBuilderData): QueryEnvelope[] =>
	prepareQueryRangePayloadV5({
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder,
			clickhouse_sql: [],
			id: 'query',
		},
		graphType: PANEL_TYPES.TIME_SERIES,
		selectedTime: 'GLOBAL_TIME',
	}).queryPayload.compositeQuery.queries;

const getAggregations = (queries: QueryEnvelope[]): unknown[] =>
	queries.map(
		(query) => (query.spec as { aggregations?: unknown[] }).aggregations,
	);

const getFilters = (queries: QueryEnvelope[]): unknown[] =>
	queries.map((query) => (query.spec as { filter?: unknown }).filter);

describe('service details queries on v5', () => {
	it('keeps the latency percentiles on the span metrics histogram', () => {
		const queries = toV5Queries(
			latency({
				servicename: 'frontend',
				tagFilterItems: [],
				isSpanMetricEnable: true,
				topLevelOperationsRoute: ['GET /'],
			}),
		);

		expect(getAggregations(queries)).toStrictEqual(
			['p50', 'p90', 'p99'].map((spaceAggregation) => [
				{
					metricName: 'signoz_latency.bucket',
					temporality: undefined,
					timeAggregation: '',
					spaceAggregation,
					reduceTo: undefined,
				},
			]),
		);
	});

	it('builds the traces latency percentiles from span duration', () => {
		const queries = toV5Queries(
			latency({
				servicename: 'frontend',
				tagFilterItems: [],
				topLevelOperationsRoute: ['GET /'],
			}),
		);

		expect(getAggregations(queries)).toStrictEqual([
			[{ expression: 'p50(duration_nano)' }],
			[{ expression: 'p90(duration_nano)' }],
			[{ expression: 'p99(duration_nano)' }],
		]);
		expect(getFilters(queries)[0]).toStrictEqual({
			expression: "service.name = 'frontend' AND name in ['GET /']",
		});
	});

	it('rates the error and total calls behind the error percentage', () => {
		const queries = toV5Queries(
			errorPercentage({
				servicename: 'frontend',
				tagFilterItems: [],
				topLevelOperations: ['GET /'],
			}),
		);

		expect(getAggregations(queries).slice(0, 2)).toStrictEqual(
			Array(2).fill([
				{
					metricName: 'signoz_calls_total',
					temporality: undefined,
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					reduceTo: undefined,
				},
			]),
		);
	});

	it('counts the apdex buckets at the threshold instead of filtering on le', () => {
		const queries = toV5Queries(
			apDexMetricsQueryBuilderQueries({
				servicename: 'frontend',
				tagFilterItems: [],
				topLevelOperationsRoute: ['GET /'],
				threashold: 0.5,
				delta: true,
				metricsBuckets: [100, 250, 500, 1000, 2000, 5000],
			}),
		);

		expect(getAggregations(queries).slice(0, 3)).toStrictEqual([
			[
				{
					metricName: 'signoz_latency.count',
					temporality: undefined,
					timeAggregation: 'increase',
					spaceAggregation: 'sum',
					reduceTo: undefined,
				},
			],
			...[500, 2000].map((threshold) => [
				{
					metricName: 'signoz_latency.bucket',
					temporality: undefined,
					timeAggregation: 'increase',
					spaceAggregation: 'count',
					reduceTo: undefined,
					comparisonSpaceAggregationParam: { operator: '<=', threshold },
				},
			]),
		]);
		expect(getFilters(queries).slice(1, 3)).toStrictEqual([
			{
				expression:
					"status.code != 'STATUS_CODE_ERROR' AND service.name = 'frontend' AND operation in ['GET /']",
			},
			{
				expression:
					"status.code != 'STATUS_CODE_ERROR' AND service.name = 'frontend' AND operation in ['GET /']",
			},
		]);
	});

	it('reads the count metric when the apdex threshold is past the largest bucket', () => {
		const queries = toV5Queries(
			apDexMetricsQueryBuilderQueries({
				servicename: 'frontend',
				tagFilterItems: [],
				topLevelOperationsRoute: ['GET /'],
				threashold: 0.5,
				delta: true,
				metricsBuckets: [100, 250, 500, 1000],
			}),
		);

		expect(getAggregations(queries)[2]).toStrictEqual([
			{
				metricName: 'signoz_latency.count',
				temporality: undefined,
				timeAggregation: 'increase',
				spaceAggregation: 'sum',
				reduceTo: undefined,
			},
		]);
	});

	it('leaves the metrics step to v5 on single and formula queries', () => {
		const queries = [
			...toV5Queries(
				latency({
					servicename: 'frontend',
					tagFilterItems: [],
					isSpanMetricEnable: true,
					topLevelOperationsRoute: ['GET /'],
				}),
			),
			...toV5Queries(
				errorPercentage({
					servicename: 'frontend',
					tagFilterItems: [],
					topLevelOperations: ['GET /'],
				}),
			),
		].filter((query) => query.type === 'builder_query');

		expect(
			queries.map(
				(query) => (query.spec as { stepInterval?: unknown }).stepInterval,
			),
		).toStrictEqual(Array(queries.length).fill(null));
	});

	it('keeps the card step on the traces latency', () => {
		const [p50] = toV5Queries(
			latency({
				servicename: 'frontend',
				tagFilterItems: [],
				topLevelOperationsRoute: ['GET /'],
			}),
		);

		expect((p50.spec as { stepInterval?: unknown }).stepInterval).toBe(60);
	});
});
