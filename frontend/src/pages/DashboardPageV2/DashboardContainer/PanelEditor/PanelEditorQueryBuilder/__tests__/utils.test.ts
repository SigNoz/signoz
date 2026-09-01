import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	AI_QUERY_TAB,
	isAIQuery,
	resolveActiveQueryTab,
	toAIQuery,
	withAIQueryType,
} from '../utils';

function makeQuery(
	queryData: Record<string, unknown>[],
	queryType: EQueryType = EQueryType.QUERY_BUILDER,
): Query {
	return {
		queryType,
		builder: { queryData, queryFormulas: [], queryTraceOperator: [] },
		promql: [],
		clickhouse_sql: [],
		id: 'test',
	} as unknown as Query;
}

describe('isAIQuery', () => {
	it('is true when any builder query carries the AI envelope tag', () => {
		expect(
			isAIQuery(
				makeQuery([{ queryName: 'A' }, { builderQueryType: 'builder_ai_query' }]),
			),
		).toBe(true);
	});

	it('is false for plain builder queries and for an empty builder', () => {
		expect(isAIQuery(makeQuery([{ queryName: 'A' }]))).toBe(false);
		expect(isAIQuery(makeQuery([]))).toBe(false);
	});
});

describe('resolveActiveQueryTab', () => {
	it('selects the AI tab for a tagged builder query', () => {
		expect(
			resolveActiveQueryTab(makeQuery([{ builderQueryType: 'builder_ai_query' }])),
		).toBe(AI_QUERY_TAB);
	});

	it('selects the query type for an untagged query', () => {
		expect(resolveActiveQueryTab(makeQuery([{ queryName: 'A' }]))).toBe(
			EQueryType.QUERY_BUILDER,
		);
	});

	// A PromQL panel reads its queries from a different bucket, so a stale tag on the
	// builder bucket must not steal the active tab.
	it('keeps PromQL selected even if the builder bucket carries a tag', () => {
		expect(
			resolveActiveQueryTab(
				makeQuery([{ builderQueryType: 'builder_ai_query' }], EQueryType.PROM),
			),
		).toBe(EQueryType.PROM);
	});
});

describe('toAIQuery', () => {
	// The backend decodes a builder_ai_query spec as QueryBuilderQuery[TraceAggregation],
	// which has no `metricName` — a carried-over metrics aggregation fails the request.
	it('re-seeds a metrics query onto traces, dropping the metric aggregation', () => {
		const result = toAIQuery(
			makeQuery([
				{
					queryName: 'A',
					dataSource: DataSource.METRICS,
					aggregations: [{ metricName: 'signoz_latency_bucket' }],
				},
			]),
		);

		const [queryData] = result.builder.queryData;
		expect(queryData.dataSource).toBe(DataSource.TRACES);
		expect(queryData.aggregations).toStrictEqual([{ expression: 'count() ' }]);
		expect(queryData.builderQueryType).toBe('builder_ai_query');
	});

	it('keeps the filter on a query already using traces', () => {
		const result = toAIQuery(
			makeQuery([
				{
					queryName: 'A',
					dataSource: DataSource.TRACES,
					filter: { expression: "service.name = 'checkout'" },
				},
			]),
		);

		expect(result.builder.queryData[0].filter).toStrictEqual({
			expression: "service.name = 'checkout'",
		});
		expect(result.builder.queryData[0].builderQueryType).toBe('builder_ai_query');
	});

	it('preserves the query name when re-seeding', () => {
		const result = toAIQuery(
			makeQuery([{ queryName: 'B', dataSource: DataSource.LOGS }]),
		);

		expect(result.builder.queryData[0].queryName).toBe('B');
	});
});

describe('withAIQueryType', () => {
	it('stamps the tag onto every builder query', () => {
		const result = withAIQueryType(
			makeQuery([{ queryName: 'A' }, { queryName: 'B' }]),
			true,
		);

		expect(
			result.builder.queryData.map((item) => item.builderQueryType),
		).toStrictEqual(['builder_ai_query', 'builder_ai_query']);
	});

	it('deletes the key when clearing, rather than setting undefined', () => {
		const result = withAIQueryType(
			makeQuery([{ queryName: 'A', builderQueryType: 'builder_ai_query' }]),
			false,
		);

		expect(result.builder.queryData[0]).not.toHaveProperty('builderQueryType');
		expect(result.builder.queryData[0]).toStrictEqual({ queryName: 'A' });
	});

	it('returns the query untouched when it already matches', () => {
		const tagged = makeQuery([{ builderQueryType: 'builder_ai_query' }]);
		const plain = makeQuery([{ queryName: 'A' }]);

		expect(withAIQueryType(tagged, true)).toBe(tagged);
		expect(withAIQueryType(plain, false)).toBe(plain);
	});
});
