import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	Querybuildertypesv5ScalarDataDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	extractAggregationsPerQuery,
	extractClickhouseQueryNames,
	prepareScalarTables,
} from '../prepareScalarTables';

// Test fixtures are cast at the outer boundary; the generated envelope union
// erases spec to unknown anyway.

function requestWith(
	envelopes: Record<string, unknown>[],
): Querybuildertypesv5QueryRangeRequestDTO {
	return {
		schemaVersion: 'v1',
		compositeQuery: { queries: envelopes },
	} as unknown as Querybuildertypesv5QueryRangeRequestDTO;
}

function scalarResult(
	columns: Record<string, unknown>[],
	data: unknown[][],
): Querybuildertypesv5ScalarDataDTO {
	return { columns, data } as unknown as Querybuildertypesv5ScalarDataDTO;
}

const SINGLE_AGG_REQUEST = requestWith([
	{
		type: 'builder_query',
		spec: {
			name: 'A',
			aggregations: [{ expression: 'count()', alias: '' }],
		},
	},
]);

describe('extractAggregationsPerQuery', () => {
	it('maps builder query names to their aggregations, ignoring other envelope types', () => {
		const request = requestWith([
			{
				type: 'builder_query',
				spec: { name: 'A', aggregations: [{ expression: 'count()' }] },
			},
			{ type: 'promql', spec: { name: 'P', query: 'up' } },
		]);
		expect(extractAggregationsPerQuery(request)).toStrictEqual({
			A: [{ expression: 'count()' }],
		});
	});

	it('returns empty for an undefined payload', () => {
		expect(extractAggregationsPerQuery(undefined)).toStrictEqual({});
	});
});

describe('extractClickhouseQueryNames', () => {
	it('collects names of clickhouse_sql queries, ignoring other envelope types', () => {
		const request = requestWith([
			{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT 1' } },
			{
				type: 'builder_query',
				spec: { name: 'B', aggregations: [{ expression: 'count()' }] },
			},
			{ type: 'promql', spec: { name: 'P', query: 'up' } },
		]);
		expect(extractClickhouseQueryNames(request)).toStrictEqual(new Set(['A']));
	});

	it('returns an empty set for an undefined payload', () => {
		expect(extractClickhouseQueryNames(undefined)).toStrictEqual(new Set());
	});
});

describe('prepareScalarTables', () => {
	it('builds keyed rows with group + aggregation columns (V1 getColName/getColId parity)', () => {
		const [table] = prepareScalarTables({
			results: [
				scalarResult(
					[
						{ name: 'service.name', queryName: 'A', columnType: 'group' },
						{
							name: '__result_0',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 0,
						},
					],
					[
						['frontend', 42],
						['backend', 7],
					],
				),
			],
			legendMap: { A: '' },
			requestPayload: SINGLE_AGG_REQUEST,
		});

		expect(table.queryName).toBe('A');
		expect(table.columns).toStrictEqual([
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			// Single aggregation, no alias/legend → expression as display name,
			// queryName as id.
			{ name: 'count()', queryName: 'A', isValueColumn: true, id: 'A' },
		]);
		expect(table.rows).toStrictEqual([
			{ data: { 'service.name': 'frontend', A: 42 } },
			{ data: { 'service.name': 'backend', A: 7 } },
		]);
	});

	it('single aggregation resolves name as alias > legend > expression', () => {
		const columns = [
			{
				name: '__result_0',
				queryName: 'A',
				columnType: 'aggregation',
				aggregationIndex: 0,
			},
		];
		const withAlias = prepareScalarTables({
			results: [scalarResult(columns, [])],
			legendMap: { A: 'My legend' },
			requestPayload: requestWith([
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						aggregations: [{ expression: 'count()', alias: 'hits' }],
					},
				},
			]),
		});
		expect(withAlias[0].columns[0].name).toBe('hits');

		const withLegend = prepareScalarTables({
			results: [scalarResult(columns, [])],
			legendMap: { A: 'My legend' },
			requestPayload: SINGLE_AGG_REQUEST,
		});
		expect(withLegend[0].columns[0].name).toBe('My legend');
	});

	it('multiple aggregations skip the legend and key columns by queryName.expression', () => {
		const [table] = prepareScalarTables({
			results: [
				scalarResult(
					[
						{
							name: '__result_0',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 0,
						},
						{
							name: '__result_1',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 1,
						},
					],
					[[10, 20]],
				),
			],
			legendMap: { A: 'Ignored legend' },
			requestPayload: requestWith([
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						aggregations: [{ expression: 'count()' }, { expression: 'avg(x)' }],
					},
				},
			]),
		});

		expect(table.columns.map((col) => col.name)).toStrictEqual([
			'count()',
			'avg(x)',
		]);
		expect(table.columns.map((col) => col.id)).toStrictEqual([
			'A.count()',
			'A.avg(x)',
		]);
		expect(table.rows).toStrictEqual([
			{ data: { 'A.count()': 10, 'A.avg(x)': 20 } },
		]);
	});

	it('one table per scalar result (multi-query separation)', () => {
		const tables = prepareScalarTables({
			results: [
				scalarResult(
					[{ name: '__result_0', queryName: 'A', columnType: 'aggregation' }],
					[[1]],
				),
				scalarResult(
					[{ name: '__result_0', queryName: 'B', columnType: 'aggregation' }],
					[[2]],
				),
			],
			legendMap: {},
			requestPayload: requestWith([]),
		});
		expect(tables.map((t) => t.queryName)).toStrictEqual(['A', 'B']);
	});

	it('clickhouse_sql single value column uses the SQL alias over the legend', () => {
		const [table] = prepareScalarTables({
			results: [
				scalarResult(
					[
						{
							name: 'current_availability',
							queryName: 'A',
							columnType: 'aggregation',
						},
					],
					[],
				),
			],
			legendMap: { A: 'Legend' },
			requestPayload: requestWith([
				{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT ...' } },
			]),
		});
		// The query is clickhouse_sql, so the response column's real SQL alias is
		// used for both header and key (a single legend can't be the column name).
		expect(table.columns[0].name).toBe('current_availability');
		expect(table.columns[0].id).toBe('current_availability');
	});

	it('non-clickhouse query without aggregation metadata falls back to legend || queryName', () => {
		const [table] = prepareScalarTables({
			results: [
				// Formulas/promql carry placeholder names and are not clickhouse_sql,
				// so they must not adopt the response column name.
				scalarResult(
					[{ name: '__result_0', queryName: 'A', columnType: 'aggregation' }],
					[],
				),
			],
			legendMap: { A: 'Legend' },
			requestPayload: requestWith([
				{ type: 'promql', spec: { name: 'A', query: 'up' } },
			]),
		});
		expect(table.columns[0].name).toBe('Legend');
		expect(table.columns[0].id).toBe('A');
	});

	it('clickhouse_sql query keeps each value column distinct (regression: all-"A" collapse)', () => {
		const [table] = prepareScalarTables({
			results: [
				scalarResult(
					[
						{ name: 'service.name', queryName: 'A', columnType: 'group' },
						{
							name: 'current_availability',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 0,
						},
						{
							name: 'error_budget_remaining',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 1,
						},
						{ name: 'budget_status', queryName: 'A', columnType: 'group' },
						{
							name: 'total_requests',
							queryName: 'A',
							columnType: 'aggregation',
							aggregationIndex: 4,
						},
					],
					[['demo-service', 99.985, 0.985, 'Healthy ✅', 2181216]],
				),
			],
			legendMap: { A: '' },
			// A clickhouse_sql envelope contributes no aggregation metadata.
			requestPayload: requestWith([
				{
					type: 'clickhouse_sql',
					spec: { name: 'A', query: 'SELECT ...' },
				},
			]),
		});

		// Headers keep their real names instead of collapsing to "A".
		expect(table.columns.map((col) => col.name)).toStrictEqual([
			'service.name',
			'current_availability',
			'error_budget_remaining',
			'budget_status',
			'total_requests',
		]);
		// Ids are unique, so value columns don't overwrite each other in the row.
		expect(table.columns.map((col) => col.id)).toStrictEqual([
			'service.name',
			'current_availability',
			'error_budget_remaining',
			'budget_status',
			'total_requests',
		]);
		expect(table.rows).toStrictEqual([
			{
				data: {
					'service.name': 'demo-service',
					current_availability: 99.985,
					error_budget_remaining: 0.985,
					budget_status: 'Healthy ✅',
					total_requests: 2181216,
				},
			},
		]);
	});
});
