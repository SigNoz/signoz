import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	Querybuildertypesv5ScalarDataDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	extractAggregationsPerQuery,
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

	it('queries without aggregation metadata fall back to legend || queryName', () => {
		const [table] = prepareScalarTables({
			results: [
				scalarResult(
					[{ name: '__result_0', queryName: 'A', columnType: 'aggregation' }],
					[],
				),
			],
			legendMap: { A: 'Legend' },
			requestPayload: requestWith([]),
		});
		expect(table.columns[0].name).toBe('Legend');
		expect(table.columns[0].id).toBe('A');
	});
});
