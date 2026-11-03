import {
	Querybuildertypesv5QueryTypeDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
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

function withBuilderQueries(
	query: Query,
	queryData: unknown[],
	builder: object = {},
): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: queryData as IBuilderQuery[],
			...builder,
		},
	};
}

function firstBuilderQuery(
	query: Query,
	queryData: unknown[],
	pathname: string,
): IBuilderQuery {
	return normalizeCompositeQuery(withBuilderQueries(query, queryData), pathname)
		.query.builder.queryData[0];
}

function without(builderQuery: object, key: keyof IBuilderQuery): object {
	const { [key]: _, ...rest } = builderQuery as IBuilderQuery;
	return rest;
}

const traceOperator = { queryTraceOperator: [tracesQuery] };

describe('normalizeCompositeQuery', () => {
	it('leaves complete queries untouched', () => {
		const clickhouse = {
			...initialQueriesMap.logs,
			queryType: EQueryType.CLICKHOUSE,
			extra: 'kept',
		};
		const aiQuery = withBuilderQueries(initialQueriesMap.traces, [
			{ ...tracesQuery, builderQueryType: QueryMode.AI_QUERY_BUILDER },
		]);

		[NOT_AN_EXPLORER, ROUTES.LOGS_EXPLORER].forEach((pathname) =>
			expect(
				normalizeCompositeQuery(initialQueriesMap.logs, pathname),
			).toStrictEqual({ query: initialQueriesMap.logs, changed: false }),
		);
		expect(normalizeCompositeQuery(clickhouse, NOT_AN_EXPLORER)).toStrictEqual({
			query: clickhouse,
			changed: false,
		});
		expect(
			normalizeCompositeQuery(
				withBuilderQueries(initialQueriesMap.logs, [without(logsQuery, 'source')]),
				ROUTES.LOGS_EXPLORER,
			).changed,
		).toBe(false);
		expect(
			normalizeCompositeQuery(aiQuery, ROUTES.AI_OBSERVABILITY_EXPLORER).changed,
		).toBe(false);
	});

	it('adds missing blocks and a stable id without changing its inputs', () => {
		const { builder: _, ...builderless } = {
			...initialQueriesMap.logs,
			queryType: EQueryType.CLICKHOUSE,
		};
		const urlQueryBefore = JSON.stringify(builderless);
		const defaultsBefore = JSON.stringify(initialQueryState.builder);
		const repaired = normalizeCompositeQuery(builderless, NOT_AN_EXPLORER);
		repaired.query.builder.queryData[0].queryName = 'changed';
		const {
			promql: _p,
			clickhouse_sql: _c,
			...withoutText
		} = initialQueriesMap.logs;
		const withoutLists = normalizeCompositeQuery(
			{
				...initialQueriesMap.logs,
				builder: { queryData: initialQueriesMap.logs.builder.queryData },
			},
			NOT_AN_EXPLORER,
		);
		const { id: _id, ...withoutId } = initialQueriesMap.logs;
		const { id } = normalizeCompositeQuery(withoutId, NOT_AN_EXPLORER).query;

		expect(repaired.query.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(repaired.changed).toBe(true);
		expect(JSON.stringify(builderless)).toBe(urlQueryBefore);
		expect(JSON.stringify(initialQueryState.builder)).toBe(defaultsBefore);
		expect(
			normalizeCompositeQuery(withoutText, NOT_AN_EXPLORER).query,
		).toMatchObject({
			promql: initialQueryState.promql,
			clickhouse_sql: initialQueryState.clickhouse_sql,
		});
		expect(withoutLists.query.builder.queryFormulas).toStrictEqual([]);
		expect(withoutLists.query.builder.queryTraceOperator).toStrictEqual([]);
		expect(withoutLists.changed).toBe(true);
		[[], [5, logsQuery]].forEach((queryData) =>
			expect(
				normalizeCompositeQuery(
					withBuilderQueries(initialQueriesMap.logs, queryData),
					NOT_AN_EXPLORER,
				).query.builder.queryData,
			).toStrictEqual(initialQueryState.builder.queryData),
		);
		expect(id).toHaveLength(36);
		expect(normalizeCompositeQuery(withoutId, NOT_AN_EXPLORER).query.id).toBe(id);
		expect(
			normalizeCompositeQuery(
				{ ...withoutId, queryType: EQueryType.PROM },
				NOT_AN_EXPLORER,
			).query.id,
		).not.toBe(id);
	});

	it('switches explorer queries to the query builder and clears their text', () => {
		const withText = normalizeCompositeQuery(
			{
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
				clickhouse_sql: [
					{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
				],
				promql: [{ name: 'A', legend: '', disabled: false, query: 'up' }],
			},
			ROUTES.LOGS_EXPLORER,
		);
		const { builder: _, ...builderless } = {
			...initialQueriesMap.logs,
			queryType: EQueryType.CLICKHOUSE,
		};

		expect(withText.query).toMatchObject({
			queryType: EQueryType.QUERY_BUILDER,
			clickhouse_sql: initialQueryState.clickhouse_sql,
			promql: initialQueryState.promql,
		});
		expect(withText.changed).toBe(true);
		expect(
			normalizeCompositeQuery(builderless, ROUTES.LOGS_EXPLORER).query,
		).toMatchObject({
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ ...logsQuery, source: '' }] },
		});
		[EQueryType.CLICKHOUSE, EQueryType.PROM].forEach((queryType) =>
			expect(
				normalizeCompositeQuery(
					{ ...initialQueriesMap.traces, queryType },
					ROUTES.TRACES_EXPLORER,
				).query.queryType,
			).toBe(EQueryType.QUERY_BUILDER),
		);
	});

	it('resets builder queries that do not match the explorer, keeping their names', () => {
		const logs = initialQueriesMap.logs;
		const traces = initialQueriesMap.traces;
		const ai = ROUTES.AI_OBSERVABILITY_EXPLORER;
		const severityFilter = { filter: { expression: "severity='error'" } };
		const llmFilter = { filter: { expression: "name='llm'" } };

		expect(
			firstBuilderQuery(
				logs,
				[{ ...tracesQuery, queryName: 'B', expression: 'B', ...llmFilter }],
				ROUTES.LOGS_EXPLORER,
			),
		).toStrictEqual({
			...logsQuery,
			source: '',
			queryName: 'B',
			expression: 'B',
		});
		expect(
			firstBuilderQuery(
				logs,
				[{ ...without(logsQuery, 'dataSource'), ...severityFilter }],
				ROUTES.LOGS_EXPLORER,
			),
		).toMatchObject({ dataSource: DataSource.LOGS, ...severityFilter });
		expect(
			firstBuilderQuery(
				logs,
				[{ ...logsQuery, builderQueryType: QueryMode.AI_QUERY_BUILDER }],
				ROUTES.LOGS_EXPLORER,
			).builderQueryType,
		).toBeUndefined();
		expect(
			firstBuilderQuery(
				traces,
				[
					{
						...tracesQuery,
						queryName: 'D',
						builderQueryType: QueryMode.AI_QUERY_BUILDER,
						...llmFilter,
					},
				],
				ROUTES.TRACES_EXPLORER,
			),
		).toStrictEqual({ ...tracesQuery, source: '', queryName: 'D' });
		expect(
			firstBuilderQuery(
				initialQueriesMap.metrics,
				[{ ...without(metricsQuery, 'source'), filter: { expression: "x='y'" } }],
				ROUTES.METER_EXPLORER,
			),
		).toMatchObject({
			source: TelemetrytypesSourceDTO.meter,
			filter: { expression: "x='y'" },
		});
		expect(
			normalizeCompositeQuery(initialQueriesMap.metrics, ROUTES.METER_EXPLORER)
				.query.builder.queryData[0].source,
		).toBe(TelemetrytypesSourceDTO.meter);
		expect(
			firstBuilderQuery(traces, [{ ...tracesQuery, ...llmFilter }], ai),
		).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			...llmFilter,
		});
		expect(
			firstBuilderQuery(
				traces,
				[
					{
						...tracesQuery,
						queryName: 'B',
						builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
						...llmFilter,
					},
				],
				ai,
			),
		).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			queryName: 'B',
			filter: { expression: '' },
		});
		expect(
			firstBuilderQuery(traces, [{ ...logsQuery, queryName: 'C' }], ai),
		).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			dataSource: DataSource.TRACES,
			queryName: 'C',
		});
	});

	it('drops a trace operator everywhere but the traces explorer', () => {
		const withOperator = (
			query: Query,
			pathname: string,
		): ReturnType<typeof normalizeCompositeQuery> =>
			normalizeCompositeQuery(
				withBuilderQueries(query, query.builder.queryData, traceOperator),
				pathname,
			);
		const onLogs = withOperator(initialQueriesMap.logs, ROUTES.LOGS_EXPLORER);
		const onTraces = withOperator(
			initialQueriesMap.traces,
			ROUTES.TRACES_EXPLORER,
		);

		expect(onLogs.query.builder.queryTraceOperator).toStrictEqual([]);
		expect(onLogs.changed).toBe(true);
		expect(onTraces.query.builder.queryTraceOperator).toHaveLength(1);
		expect(onTraces.changed).toBe(false);
	});
});
