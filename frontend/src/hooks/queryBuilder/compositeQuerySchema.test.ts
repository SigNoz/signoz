import {
	initialQueriesMap,
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	buildPageQuerySchema,
	normalizeCompositeQuery,
	QueryConstraints,
} from './compositeQuerySchema';

const LOGS: QueryConstraints = {
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.LOGS,
	traceOperator: false,
};
const TRACES: QueryConstraints = {
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.TRACES,
	traceOperator: true,
};
const METER: QueryConstraints = {
	queryTypes: [EQueryType.QUERY_BUILDER],
	dataSource: DataSource.METRICS,
	source: 'meter',
	traceOperator: false,
};

const logsSchema = buildPageQuerySchema(LOGS);

const builderlessUrlQuery = {
	queryType: 'clickhouse_sql',
	promql: [{ name: 'A', query: '', legend: '', disabled: false }],
	clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
	id: 'b8084e0c-c13d-4172-a775-f61aedadb79e',
	unit: '',
};

const logsItem = (overrides: Partial<IBuilderQuery> | object): object => ({
	...initialQueryBuilderFormValuesMap.logs,
	...overrides,
});

const logsQuery = (queryData: unknown[], builder: object = {}): object => ({
	...initialQueriesMap.logs,
	builder: { ...initialQueriesMap.logs.builder, queryData, ...builder },
});

const withoutSignal = (item: object): object => {
	const { dataSource: _, ...rest } = item as IBuilderQuery;
	return rest;
};

describe('normalizeCompositeQuery shape layer', () => {
	it('fills a missing builder block and keeps everything else', () => {
		const { query, changed } = normalizeCompositeQuery(builderlessUrlQuery);

		expect(query.builder).toStrictEqual(initialQueryState.builder);
		expect(query.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(query.id).toBe(builderlessUrlQuery.id);
		expect(changed).toBe(true);
	});

	it('leaves a missing or invalid signal out for the provider to fill', () => {
		const missing = normalizeCompositeQuery(
			logsQuery([withoutSignal(logsItem({}))]),
		);
		const invalid = normalizeCompositeQuery(
			logsQuery([logsItem({ dataSource: 'metric' })]),
		);

		expect('dataSource' in missing.query.builder.queryData[0]).toBe(false);
		expect('dataSource' in invalid.query.builder.queryData[0]).toBe(false);
	});

	it('leaves a missing source alone', () => {
		const { source: _, ...withoutSource } = initialQueriesMap.logs.builder
			.queryData[0] as IBuilderQuery;
		const raw = {
			...initialQueriesMap.logs,
			builder: { ...initialQueriesMap.logs.builder, queryData: [withoutSource] },
		};
		const { query, changed } = normalizeCompositeQuery(raw);

		expect('source' in query.builder.queryData[0]).toBe(false);
		expect(changed).toBe(false);
		expect(normalizeCompositeQuery(raw, buildPageQuerySchema(LOGS)).changed).toBe(
			false,
		);
	});

	it('does not hand out the shared default query', () => {
		const before = JSON.stringify(initialQueryState.builder);
		const { query } = normalizeCompositeQuery({ queryType: 'builder' });
		query.builder.queryData = [];
		query.builder.queryFormulas.push(
			{} as (typeof query.builder.queryFormulas)[number],
		);

		expect(JSON.stringify(initialQueryState.builder)).toBe(before);
	});

	it('keeps keys the schema does not model', () => {
		const { query } = normalizeCompositeQuery({
			...logsQuery([logsItem({ builderQueryType: 'builder_ai_query' })]),
			extra: 'kept',
		});

		expect(query.builder.queryData[0].builderQueryType).toBe('builder_ai_query');
		expect((query as { extra?: string }).extra).toBe('kept');
	});

	it('resets queryData holding a non-object to the default query', () => {
		const { query, changed } = normalizeCompositeQuery(
			logsQuery([5, logsItem({ queryName: 'B' })]),
		);

		expect(query.builder.queryData).toStrictEqual(
			initialQueryState.builder.queryData,
		);
		expect(changed).toBe(true);
	});

	it('fills missing formula and trace operator arrays', () => {
		const { query, changed } = normalizeCompositeQuery({
			...initialQueriesMap.logs,
			builder: { queryData: initialQueriesMap.logs.builder.queryData },
		});

		expect(query.builder.queryFormulas).toStrictEqual([]);
		expect(query.builder.queryTraceOperator).toStrictEqual([]);
		expect(changed).toBe(true);
	});

	it('resets an empty queryData to the default query', () => {
		const { query, changed } = normalizeCompositeQuery(logsQuery([]));

		expect(query.builder.queryData).toStrictEqual(
			initialQueryState.builder.queryData,
		);
		expect(changed).toBe(true);
	});

	it('gives a missing id a stable id per content', () => {
		const { id: _, ...withoutId } = initialQueriesMap.logs;
		const first = normalizeCompositeQuery(withoutId).query.id;
		const again = normalizeCompositeQuery(withoutId).query.id;
		const other = normalizeCompositeQuery({
			...withoutId,
			queryType: EQueryType.PROM,
		}).query.id;

		expect(first).toHaveLength(36);
		expect(again).toBe(first);
		expect(other).not.toBe(first);
	});

	it('passes a valid query through unchanged', () => {
		const { query, changed } = normalizeCompositeQuery(initialQueriesMap.logs);

		expect(query).toStrictEqual(initialQueriesMap.logs);
		expect(changed).toBe(false);
	});
});

describe('normalizeCompositeQuery page constraints', () => {
	it('coerces an unsupported query type and the filled-in metrics item on logs', () => {
		const { query, changed } = normalizeCompositeQuery(
			builderlessUrlQuery,
			logsSchema,
		);

		expect(query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(query.builder.queryData).toStrictEqual([
			{ ...initialQueryBuilderFormValuesMap.logs, source: '' },
		]);
		expect(changed).toBe(true);
	});

	it('fills blocks the url omits without resetting the query', () => {
		const { query, changed } = normalizeCompositeQuery(
			{
				queryType: EQueryType.QUERY_BUILDER,
				builder: { queryData: [logsItem({})], queryFormulas: [] },
			},
			logsSchema,
		);

		expect(query.promql).toStrictEqual(initialQueryState.promql);
		expect(query.clickhouse_sql).toStrictEqual(initialQueryState.clickhouse_sql);
		expect(query.builder.queryTraceOperator).toStrictEqual([]);
		expect(changed).toBe(true);
	});

	it('clears sql and promql text the page cannot run', () => {
		const { query, changed } = normalizeCompositeQuery(
			{
				...initialQueriesMap.logs,
				clickhouse_sql: [
					{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
				],
				promql: [{ name: 'A', legend: '', disabled: false, query: 'up' }],
			},
			logsSchema,
		);

		expect(query.clickhouse_sql).toStrictEqual(initialQueryState.clickhouse_sql);
		expect(query.promql).toStrictEqual(initialQueryState.promql);
		expect(changed).toBe(true);
	});

	it('fills a missing signal with the page signal and keeps the filter', () => {
		const { query, changed } = normalizeCompositeQuery(
			logsQuery([
				withoutSignal(
					logsItem({ filter: { expression: "severity_text='ERROR'" } }),
				),
			]),
			logsSchema,
		);

		expect(query.builder.queryData[0].dataSource).toBe(DataSource.LOGS);
		expect(query.builder.queryData[0].filter?.expression).toBe(
			"severity_text='ERROR'",
		);
		expect(changed).toBe(true);
	});

	it('resets only the item whose signal does not match the page', () => {
		const { query, changed } = normalizeCompositeQuery(
			logsQuery([
				logsItem({
					dataSource: DataSource.TRACES,
					filter: { expression: "name='GET /api'" },
				}),
				logsItem({ queryName: 'B', filter: { expression: "severity='error'" } }),
			]),
			logsSchema,
		);

		expect(query.builder.queryData[0]).toStrictEqual({
			...initialQueryBuilderFormValuesMap.logs,
			source: '',
		});
		expect(query.builder.queryData[1].filter?.expression).toBe(
			"severity='error'",
		);
		expect(changed).toBe(true);
	});

	it('keeps the name of a reset item so formulas still point at it', () => {
		const { query } = normalizeCompositeQuery(
			logsQuery([
				logsItem({
					dataSource: DataSource.TRACES,
					queryName: 'B',
					expression: 'B',
				}),
				logsItem({ queryName: 'A', expression: 'A' }),
			]),
			logsSchema,
		);

		expect(query.builder.queryData.map((item) => item.queryName)).toStrictEqual([
			'B',
			'A',
		]);
		expect(query.builder.queryData[0].expression).toBe('B');
		expect(query.builder.queryData[0].dataSource).toBe(DataSource.LOGS);
	});

	it('fills the page source on meter and keeps the rest of the item', () => {
		const { source: _, ...withoutSource } = initialQueriesMap.metrics.builder
			.queryData[0] as IBuilderQuery;
		const { query } = normalizeCompositeQuery(
			{
				...initialQueriesMap.metrics,
				builder: {
					...initialQueriesMap.metrics.builder,
					queryData: [{ ...withoutSource, filter: { expression: "x='y'" } }],
				},
			},
			buildPageQuerySchema(METER),
		);

		expect(query.builder.queryData[0].source).toBe('meter');
		expect(query.builder.queryData[0].filter?.expression).toBe("x='y'");
	});

	it('replaces a non-object item with the page item', () => {
		const { query, changed } = normalizeCompositeQuery(
			logsQuery([null, logsItem({ queryName: 'B' })]),
			logsSchema,
		);

		expect(query.builder.queryData[0].dataSource).toBe(DataSource.LOGS);
		expect(changed).toBe(true);
	});

	it('clears a trace operator on logs', () => {
		const { query, changed } = normalizeCompositeQuery(
			logsQuery([logsItem({})], {
				queryTraceOperator: [initialQueryBuilderFormValuesMap.traces],
			}),
			logsSchema,
		);

		expect(query.builder.queryTraceOperator).toStrictEqual([]);
		expect(changed).toBe(true);
	});

	it('coerces clickhouse and promql query types to builder on traces', () => {
		const clickhouse = normalizeCompositeQuery(
			{ ...initialQueriesMap.traces, queryType: EQueryType.CLICKHOUSE },
			buildPageQuerySchema(TRACES),
		);
		const promql = normalizeCompositeQuery(
			{ ...initialQueriesMap.traces, queryType: EQueryType.PROM },
			buildPageQuerySchema(TRACES),
		);

		expect(clickhouse.query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(promql.query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(clickhouse.changed).toBe(true);
		expect(promql.changed).toBe(true);
	});

	it('allows every query type and keeps sql text when queryTypes is omitted', () => {
		const { query, changed } = normalizeCompositeQuery(
			{
				...initialQueriesMap.logs,
				queryType: EQueryType.CLICKHOUSE,
				clickhouse_sql: [
					{ name: 'A', legend: '', disabled: false, query: 'SELECT 1' },
				],
			},
			buildPageQuerySchema({ dataSource: DataSource.LOGS, traceOperator: false }),
		);

		expect(query.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(query.clickhouse_sql[0].query).toBe('SELECT 1');
		expect(changed).toBe(false);
	});

	it('keeps a trace operator on traces', () => {
		const { query, changed } = normalizeCompositeQuery(
			{
				...initialQueriesMap.traces,
				builder: {
					...initialQueriesMap.traces.builder,
					queryTraceOperator: [initialQueryBuilderFormValuesMap.traces],
				},
			},
			buildPageQuerySchema(TRACES),
		);

		expect(query.builder.queryTraceOperator).toHaveLength(1);
		expect(changed).toBe(false);
	});

	it('tells meter apart from metrics by source', () => {
		const { query, changed } = normalizeCompositeQuery(
			initialQueriesMap.metrics,
			buildPageQuerySchema(METER),
		);

		expect(query.builder.queryData[0].source).toBe('meter');
		expect(changed).toBe(true);
	});

	it('passes a valid logs query through unchanged', () => {
		const { query, changed } = normalizeCompositeQuery(
			initialQueriesMap.logs,
			logsSchema,
		);

		expect(query).toStrictEqual(initialQueriesMap.logs);
		expect(changed).toBe(false);
	});
});
