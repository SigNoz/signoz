import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	IBuilderQuery,
	Query,
	QueryMode,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { normalizeCompositeQuery } from './normalizeCompositeQuery';

const NOT_AN_EXPLORER = ROUTES.HOME;

const logsQuery = initialQueryBuilderFormValuesMap.logs;
const tracesQuery = initialQueryBuilderFormValuesMap.traces;
const metricsQuery = initialQueryBuilderFormValuesMap.metrics;

function withBuilderQueries(query: Query, queryData: unknown[]): Query {
	return {
		...query,
		builder: { ...query.builder, queryData: queryData as IBuilderQuery[] },
	};
}

describe('normalizeCompositeQuery', () => {
	describe('on any page', () => {
		it('leaves a complete query untouched', () => {
			const result = normalizeCompositeQuery(
				initialQueriesMap.logs,
				NOT_AN_EXPLORER,
			);

			expect(result).toStrictEqual({
				query: initialQueriesMap.logs,
				changed: false,
			});
		});

		it('keeps the query type and fields it does not know', () => {
			const clickhouse = {
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
				extra: 'kept',
			};

			const result = normalizeCompositeQuery(clickhouse, NOT_AN_EXPLORER);

			expect(result).toStrictEqual({ query: clickhouse, changed: false });
		});

		it('adds a builder to a ClickHouse link that has none', () => {
			const { builder: _, ...builderless } = {
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
			};

			const result = normalizeCompositeQuery(builderless, NOT_AN_EXPLORER);

			expect(result.query.queryType).toBe(EQueryType.CLICKHOUSE);
			expect(result.query.builder).toStrictEqual(initialQueryState.builder);
			expect(result.changed).toBe(true);
		});

		it('adds missing promql and clickhouse_sql blocks', () => {
			const { promql: _p, clickhouse_sql: _c, ...query } = initialQueriesMap.logs;

			const result = normalizeCompositeQuery(query, NOT_AN_EXPLORER);

			expect(result.query.promql).toStrictEqual(initialQueryState.promql);
			expect(result.query.clickhouse_sql).toStrictEqual(
				initialQueryState.clickhouse_sql,
			);
		});

		it('adds missing queryFormulas and queryTraceOperator as empty lists', () => {
			const query = {
				...initialQueriesMap.logs,
				builder: { queryData: initialQueriesMap.logs.builder.queryData },
			};

			const result = normalizeCompositeQuery(query, NOT_AN_EXPLORER);

			expect(result.query.builder.queryFormulas).toStrictEqual([]);
			expect(result.query.builder.queryTraceOperator).toStrictEqual([]);
			expect(result.changed).toBe(true);
		});

		it.each([
			['is empty', []],
			['holds something that is not a query', [5, logsQuery]],
		])('uses the default builder query when queryData %s', (_, queryData) => {
			const query = withBuilderQueries(initialQueriesMap.logs, queryData);

			const result = normalizeCompositeQuery(query, NOT_AN_EXPLORER);

			expect(result.query.builder.queryData).toStrictEqual(
				initialQueryState.builder.queryData,
			);
		});

		it('gives a link without id the same id on every read', () => {
			const { id: _, ...withoutId } = initialQueriesMap.logs;

			const first = normalizeCompositeQuery(withoutId, NOT_AN_EXPLORER);
			const second = normalizeCompositeQuery(withoutId, NOT_AN_EXPLORER);
			const otherLink = normalizeCompositeQuery(
				{ ...withoutId, queryType: EQueryType.PROM },
				NOT_AN_EXPLORER,
			);

			expect(first.query.id).toHaveLength(36);
			expect(second.query.id).toBe(first.query.id);
			expect(otherLink.query.id).not.toBe(first.query.id);
		});

		it('does not change the url query or the shared defaults', () => {
			const { builder: _, ...builderless } = initialQueriesMap.logs;
			const urlQueryBefore = JSON.stringify(builderless);
			const defaultsBefore = JSON.stringify(initialQueryState.builder);

			const result = normalizeCompositeQuery(builderless, ROUTES.LOGS_EXPLORER);
			result.query.builder.queryData[0].queryName = 'changed';

			expect(JSON.stringify(builderless)).toBe(urlQueryBefore);
			expect(JSON.stringify(initialQueryState.builder)).toBe(defaultsBefore);
		});
	});

	describe('on the logs explorer', () => {
		it('leaves a logs query without source untouched', () => {
			const { source: _, ...withoutSource } = logsQuery;
			const query = withBuilderQueries(initialQueriesMap.logs, [withoutSource]);

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.changed).toBe(false);
		});

		it('switches a ClickHouse query to the query builder and clears its text', () => {
			const query = {
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
				clickhouse_sql: [
					{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
				],
				promql: [{ name: 'A', legend: '', disabled: false, query: 'up' }],
			};

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.query.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(result.query.clickhouse_sql).toStrictEqual(
				initialQueryState.clickhouse_sql,
			);
			expect(result.query.promql).toStrictEqual(initialQueryState.promql);
			expect(result.changed).toBe(true);
		});

		it('gives a builder-less ClickHouse link the default logs query', () => {
			const { builder: _, ...builderless } = {
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
			};

			const result = normalizeCompositeQuery(builderless, ROUTES.LOGS_EXPLORER);

			expect(result.query.queryType).toBe(EQueryType.QUERY_BUILDER);
			expect(result.query.builder.queryData).toStrictEqual([
				{ ...logsQuery, source: '' },
			]);
		});

		it('replaces a traces query with the default logs query, keeping its name', () => {
			const query = withBuilderQueries(initialQueriesMap.logs, [
				{
					...tracesQuery,
					queryName: 'B',
					expression: 'B',
					filter: { expression: "name='GET /api'" },
				},
			]);

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.query.builder.queryData).toStrictEqual([
				{ ...logsQuery, source: '', queryName: 'B', expression: 'B' },
			]);
		});

		it('reads a query without dataSource as a logs query', () => {
			const { dataSource: _, ...withoutDataSource } = {
				...logsQuery,
				filter: { expression: "severity='error'" },
			};
			const query = withBuilderQueries(initialQueriesMap.logs, [
				withoutDataSource,
			]);

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.query.builder.queryData[0]).toMatchObject({
				dataSource: DataSource.LOGS,
				filter: { expression: "severity='error'" },
			});
		});

		it('replaces an AI query', () => {
			const query = withBuilderQueries(initialQueriesMap.logs, [
				{ ...logsQuery, builderQueryType: QueryMode.AI_QUERY_BUILDER },
			]);

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.query.builder.queryData[0].builderQueryType).toBeUndefined();
			expect(result.changed).toBe(true);
		});

		it('drops a trace operator', () => {
			const query = {
				...initialQueriesMap.logs,
				builder: {
					...initialQueriesMap.logs.builder,
					queryTraceOperator: [tracesQuery],
				},
			};

			const result = normalizeCompositeQuery(query, ROUTES.LOGS_EXPLORER);

			expect(result.query.builder.queryTraceOperator).toStrictEqual([]);
			expect(result.changed).toBe(true);
		});
	});

	describe('on the traces explorer', () => {
		it('keeps a trace operator', () => {
			const query = {
				...initialQueriesMap.traces,
				builder: {
					...initialQueriesMap.traces.builder,
					queryTraceOperator: [tracesQuery],
				},
			};

			const result = normalizeCompositeQuery(query, ROUTES.TRACES_EXPLORER);

			expect(result.query.builder.queryTraceOperator).toHaveLength(1);
			expect(result.changed).toBe(false);
		});

		it.each([EQueryType.CLICKHOUSE, EQueryType.PROM])(
			'switches a %s query to the query builder',
			(queryType) => {
				const query = { ...initialQueriesMap.traces, queryType };

				const result = normalizeCompositeQuery(query, ROUTES.TRACES_EXPLORER);

				expect(result.query.queryType).toBe(EQueryType.QUERY_BUILDER);
			},
		);

		it('replaces an AI query with the default traces query, keeping its name', () => {
			const query = withBuilderQueries(initialQueriesMap.traces, [
				{
					...tracesQuery,
					queryName: 'D',
					builderQueryType: QueryMode.AI_QUERY_BUILDER,
					filter: { expression: "name='llm'" },
				},
			]);

			const result = normalizeCompositeQuery(query, ROUTES.TRACES_EXPLORER);

			expect(result.query.builder.queryData).toStrictEqual([
				{ ...tracesQuery, source: '', queryName: 'D' },
			]);
		});
	});

	describe('on the meter explorer', () => {
		it('reads a metrics query without source as a meter query', () => {
			const { source: _, ...withoutSource } = {
				...metricsQuery,
				filter: { expression: "x='y'" },
			};
			const query = withBuilderQueries(initialQueriesMap.metrics, [withoutSource]);

			const result = normalizeCompositeQuery(query, ROUTES.METER_EXPLORER);

			expect(result.query.builder.queryData[0]).toMatchObject({
				source: 'meter',
				filter: { expression: "x='y'" },
			});
		});

		it('replaces a metrics query whose source is empty', () => {
			const result = normalizeCompositeQuery(
				initialQueriesMap.metrics,
				ROUTES.METER_EXPLORER,
			);

			expect(result.query.builder.queryData[0].source).toBe('meter');
			expect(result.changed).toBe(true);
		});
	});

	describe('on the AI explorer', () => {
		it('reads a traces query without builderQueryType as an AI query', () => {
			const query = withBuilderQueries(initialQueriesMap.traces, [
				{ ...tracesQuery, filter: { expression: "name='llm'" } },
			]);

			const result = normalizeCompositeQuery(
				query,
				ROUTES.AI_OBSERVABILITY_EXPLORER,
			);

			expect(result.query.builder.queryData[0]).toMatchObject({
				builderQueryType: QueryMode.AI_QUERY_BUILDER,
				filter: { expression: "name='llm'" },
			});
		});

		it('replaces a plain builder query, keeping its name', () => {
			const query = withBuilderQueries(initialQueriesMap.traces, [
				{
					...tracesQuery,
					queryName: 'B',
					builderQueryType: 'builder_query',
					filter: { expression: "name='llm'" },
				},
			]);

			const result = normalizeCompositeQuery(
				query,
				ROUTES.AI_OBSERVABILITY_EXPLORER,
			);

			expect(result.query.builder.queryData[0]).toMatchObject({
				builderQueryType: QueryMode.AI_QUERY_BUILDER,
				queryName: 'B',
				filter: { expression: '' },
			});
		});

		it('replaces a logs query with the default AI query', () => {
			const query = withBuilderQueries(initialQueriesMap.traces, [
				{ ...logsQuery, queryName: 'C' },
			]);

			const result = normalizeCompositeQuery(
				query,
				ROUTES.AI_OBSERVABILITY_EXPLORER,
			);

			expect(result.query.builder.queryData[0]).toMatchObject({
				builderQueryType: QueryMode.AI_QUERY_BUILDER,
				dataSource: DataSource.TRACES,
				queryName: 'C',
			});
		});
	});
});
