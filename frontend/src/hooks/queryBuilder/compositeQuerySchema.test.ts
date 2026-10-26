import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import {
	Querybuildertypesv5QueryTypeDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	IBuilderQuery,
	QueryMode,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	buildPageQuerySchema,
	normalizeCompositeQuery,
} from './compositeQuerySchema';

const logsSchema = buildPageQuerySchema({
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.LOGS,
});
const tracesSchema = buildPageQuerySchema({
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.TRACES,
	traceOperator: true,
});
const meterSchema = buildPageQuerySchema({
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.METRICS,
	source: TelemetrytypesSourceDTO.meter,
});
const aiSchema = buildPageQuerySchema({
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.TRACES,
	builderQueryType: QueryMode.AI_QUERY_BUILDER,
});

const builderlessUrlQuery = {
	queryType: 'clickhouse_sql',
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	id: 'b8084e0c-c13d-4172-a775-f61aedadb79e',
	unit: '',
};

const logsItem = (overrides: object = {}): object => ({
	...initialQueryBuilderFormValuesMap.logs,
	...overrides,
});

const queryOf = (
	base: typeof initialQueriesMap.logs,
	queryData: unknown[],
	builder: object = {},
): object => ({
	...base,
	builder: { ...base.builder, queryData, ...builder },
});

const logsQuery = (queryData: unknown[], builder?: object): object =>
	queryOf(initialQueriesMap.logs, queryData, builder);

const without = (item: object, key: keyof IBuilderQuery): object => {
	const { [key]: _, ...rest } = item as IBuilderQuery;
	return rest;
};

describe('normalizeCompositeQuery', () => {
	it('passes valid queries through unchanged', () => {
		const withoutSource = logsQuery([
			without(initialQueriesMap.logs.builder.queryData[0], 'source'),
		]);
		const clickhouse = {
			...initialQueriesMap.logs,
			queryType: EQueryType.CLICKHOUSE,
			clickhouse_sql: [
				{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
			],
		};
		const unmodeled = normalizeCompositeQuery({
			...logsQuery([logsItem({ builderQueryType: QueryMode.AI_QUERY_BUILDER })]),
			extra: 'kept',
		}).query;

		expect(normalizeCompositeQuery(initialQueriesMap.logs)).toStrictEqual({
			query: initialQueriesMap.logs,
			changed: false,
		});
		expect(
			normalizeCompositeQuery(initialQueriesMap.logs, logsSchema),
		).toStrictEqual({ query: initialQueriesMap.logs, changed: false });
		expect(normalizeCompositeQuery(withoutSource, logsSchema).changed).toBe(
			false,
		);
		expect(
			normalizeCompositeQuery(
				clickhouse,
				buildPageQuerySchema({ dataSource: DataSource.LOGS }),
			),
		).toStrictEqual({ query: clickhouse, changed: false });
		expect(unmodeled.builder.queryData[0].builderQueryType).toBe(
			QueryMode.AI_QUERY_BUILDER,
		);
		expect((unmodeled as { extra?: string }).extra).toBe('kept');
	});

	it('fills missing blocks with defaults and a stable id', () => {
		const sharedBefore = JSON.stringify(initialQueryState.builder);
		const builderless = normalizeCompositeQuery(builderlessUrlQuery);
		builderless.query.builder.queryFormulas.push(
			{} as (typeof builderless.query.builder.queryFormulas)[number],
		);
		const noArrays = normalizeCompositeQuery({
			...initialQueriesMap.logs,
			builder: { queryData: initialQueriesMap.logs.builder.queryData },
		});
		const omittedBlocks = normalizeCompositeQuery(
			{
				queryType: EQueryType.QUERY_BUILDER,
				builder: { queryData: [logsItem()], queryFormulas: [] },
			},
			logsSchema,
		);
		const { id: _, ...withoutId } = initialQueriesMap.logs;
		const id = normalizeCompositeQuery(withoutId).query.id;

		expect(builderless.query.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(builderless.query.id).toBe(builderlessUrlQuery.id);
		expect(builderless.changed).toBe(true);
		expect(JSON.stringify(initialQueryState.builder)).toBe(sharedBefore);
		expect(noArrays.query.builder.queryFormulas).toStrictEqual([]);
		expect(noArrays.query.builder.queryTraceOperator).toStrictEqual([]);
		expect(noArrays.changed).toBe(true);
		[[], [5, logsItem({ queryName: 'B' })]].forEach((queryData) =>
			expect(
				normalizeCompositeQuery(logsQuery(queryData)).query.builder.queryData,
			).toStrictEqual(initialQueryState.builder.queryData),
		);
		expect(omittedBlocks.query.promql).toStrictEqual(initialQueryState.promql);
		expect(omittedBlocks.query.clickhouse_sql).toStrictEqual(
			initialQueryState.clickhouse_sql,
		);
		expect(omittedBlocks.query.builder.queryData[0].dataSource).toBe(
			DataSource.LOGS,
		);
		expect(id).toHaveLength(36);
		expect(normalizeCompositeQuery(withoutId).query.id).toBe(id);
		expect(
			normalizeCompositeQuery({ ...withoutId, queryType: EQueryType.PROM }).query
				.id,
		).not.toBe(id);
	});

	it('resets query types and text the page cannot run', () => {
		const builderless = normalizeCompositeQuery(builderlessUrlQuery, logsSchema);
		const withText = normalizeCompositeQuery(
			{
				...initialQueriesMap.logs,
				clickhouse_sql: [
					{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
				],
				promql: [{ name: 'A', legend: '', disabled: false, query: 'up' }],
			},
			logsSchema,
		);

		expect(builderless.query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(builderless.query.builder.queryData).toStrictEqual([
			{ ...initialQueryBuilderFormValuesMap.logs, source: '' },
		]);
		expect(withText.query.clickhouse_sql).toStrictEqual(
			initialQueryState.clickhouse_sql,
		);
		expect(withText.query.promql).toStrictEqual(initialQueryState.promql);
		expect(withText.changed).toBe(true);
		[EQueryType.CLICKHOUSE, EQueryType.PROM].forEach((queryType) =>
			expect(
				normalizeCompositeQuery(
					{ ...initialQueriesMap.traces, queryType },
					tracesSchema,
				).query.queryType,
			).toBe(EQueryType.QUERY_BUILDER),
		);
	});

	it('resets items that do not match the page and keeps their names', () => {
		const mixed = normalizeCompositeQuery(
			logsQuery([
				logsItem({
					dataSource: DataSource.TRACES,
					queryName: 'B',
					expression: 'B',
					filter: { expression: "name='GET /api'" },
				}),
				without(
					logsItem({ filter: { expression: "severity='error'" } }),
					'dataSource',
				),
			]),
			logsSchema,
		).query.builder.queryData;
		const meterFilled = normalizeCompositeQuery(
			queryOf(initialQueriesMap.metrics, [
				{
					...without(initialQueriesMap.metrics.builder.queryData[0], 'source'),
					filter: { expression: "x='y'" },
				},
			]),
			meterSchema,
		).query.builder.queryData[0];
		const metricsOnMeter = normalizeCompositeQuery(
			initialQueriesMap.metrics,
			meterSchema,
		);
		const tracesItem = {
			...initialQueryBuilderFormValuesMap.traces,
			filter: { expression: "name='llm'" },
		};
		const [aiMissing, aiWrong, aiLogs] = [
			[tracesItem],
			[
				{
					...tracesItem,
					queryName: 'B',
					builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
				},
			],
			[logsItem({ queryName: 'C' })],
		].map(
			(queryData) =>
				normalizeCompositeQuery(
					queryOf(initialQueriesMap.traces, queryData),
					aiSchema,
				).query.builder.queryData[0],
		);

		expect(mixed[0]).toStrictEqual({
			...initialQueryBuilderFormValuesMap.logs,
			source: '',
			queryName: 'B',
			expression: 'B',
		});
		expect(mixed[1]).toMatchObject({
			dataSource: DataSource.LOGS,
			filter: { expression: "severity='error'" },
		});
		expect(meterFilled).toMatchObject({
			source: TelemetrytypesSourceDTO.meter,
			filter: { expression: "x='y'" },
		});
		expect(metricsOnMeter.query.builder.queryData[0].source).toBe(
			TelemetrytypesSourceDTO.meter,
		);
		expect(metricsOnMeter.changed).toBe(true);
		expect(aiMissing).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			filter: { expression: "name='llm'" },
		});
		expect(aiWrong).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			queryName: 'B',
			filter: { expression: '' },
		});
		expect(aiLogs).toMatchObject({
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
			dataSource: DataSource.TRACES,
			queryName: 'C',
		});
	});

	it('clears a trace operator unless the page allows it', () => {
		const operator = {
			queryTraceOperator: [initialQueryBuilderFormValuesMap.traces],
		};
		const onLogs = normalizeCompositeQuery(
			logsQuery([logsItem()], operator),
			logsSchema,
		);
		const onTraces = normalizeCompositeQuery(
			queryOf(
				initialQueriesMap.traces,
				initialQueriesMap.traces.builder.queryData,
				operator,
			),
			tracesSchema,
		);

		expect(onLogs.query.builder.queryTraceOperator).toStrictEqual([]);
		expect(onLogs.changed).toBe(true);
		expect(onTraces.query.builder.queryTraceOperator).toHaveLength(1);
		expect(onTraces.changed).toBe(false);
	});
});
