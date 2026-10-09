import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { prepareTopListData } from '../prepareData';
import { getTopListDataWarning } from '../warnings';

const panel = {} as PanelOfKind<'signoz/TopListPanel'>;

interface Result {
	queryName: string;
	rows: [string, number][];
}

interface Envelope {
	type: 'builder_query' | 'builder_formula';
	spec: {
		name: string;
		limit?: number;
		expression?: string;
		disabled?: boolean;
		order?: { key: { name: string }; direction: 'asc' | 'desc' }[];
		groupBy?: { name: string }[];
		aggregations?: Partial<Record<string, string>>[];
	};
}

function dataWith(results: Result[], queries: Envelope[]): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: results.map(({ queryName, rows }) => ({
						queryName,
						columns: [
							{ name: 'service.name', queryName, columnType: 'group' },
							{
								name: '__result',
								queryName,
								columnType: 'aggregation',
								aggregationIndex: 0,
							},
						],
						data: rows,
					})),
				},
			},
		} as unknown as QueryRangeV5200,
		requestPayload: {
			compositeQuery: { queries },
		} as unknown as Querybuildertypesv5QueryRangeRequestDTO,
		legendMap: {},
	};
}

const query = (name: string, limit?: number): Envelope => ({
	type: 'builder_query',
	spec: { name, limit },
});
const formula = (name: string, expression: string): Envelope => ({
	type: 'builder_formula',
	spec: { name, expression },
});

const A: Result = { queryName: 'A', rows: [['checkout', 10]] };
const B: Result = { queryName: 'B', rows: [['checkout', 2]] };
const F1: Result = { queryName: 'F1', rows: [['checkout', 5]] };

describe('top list with several queries', () => {
	it('ranks the first query in builder order, whatever order the response lists them in', () => {
		const data = dataWith(
			[F1, B, A],
			[query('A'), query('B'), formula('F1', 'A / B')],
		);

		const { rows, ignoredResults } = prepareTopListData(data);

		expect(rows.map((row) => [row.queryName, row.value])).toStrictEqual([
			['A', 10],
		]);
		expect(ignoredResults).toStrictEqual(['B', 'F1']);
	});

	it('ranks the formula when its inputs are disabled', () => {
		// The server leaves disabled queries out of the response.
		const data = dataWith([F1], [query('A'), query('B'), formula('F1', 'A / B')]);

		expect(prepareTopListData(data).rows[0].queryName).toBe('F1');
		expect(getTopListDataWarning(panel, data)).toBeNull();
	});

	it('names the results the ranking leaves out', () => {
		const data = dataWith([A, B], [query('A'), query('B')]);

		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'The list ranks "A" only; "B" is not shown. Disable the queries you don\'t want to rank.',
		]);
	});

	it('warns when a formula reads inputs cut to their own limit', () => {
		const data = dataWith(
			[F1],
			[query('A', 10), query('B', 10), query('C', 5), formula('F1', 'A / B')],
		);

		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'"A", "B" are limited before the formula combines them, so the formula only sees groups in every input\'s top N. Set the limit on the formula instead.',
		]);
	});

	it("lists rows in the query's ascending order for a bottom N", () => {
		const data = dataWith(
			[
				{
					queryName: 'A',
					rows: [
						['checkout', 10],
						['auth', 2],
						['search', 5],
					],
				},
			],
			[
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						order: [{ key: { name: 'count()' }, direction: 'asc' }],
					},
				},
			],
		);

		expect(prepareTopListData(data).rows.map((row) => row.value)).toStrictEqual([
			2, 5, 10,
		]);
	});

	it('warns when the query orders by a group key instead of the value', () => {
		const data = dataWith(
			[
				{
					queryName: 'A',
					rows: [
						['auth', 2],
						['checkout', 10],
					],
				},
			],
			[
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						groupBy: [{ name: 'service.name' }],
						order: [{ key: { name: 'service.name' }, direction: 'asc' }],
					},
				},
			],
		);

		const { rows } = prepareTopListData(data);
		expect(rows.map((row) => row.value)).toStrictEqual([10, 2]);
		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'The query orders by "service.name", so the list shows the first groups by that key rather than the top values. Order by the value instead.',
		]);
	});
});

describe('top list value name', () => {
	const aggregated = (
		aggregation: Partial<Record<string, string>>,
	): Envelope => ({
		type: 'builder_query',
		spec: { name: 'A', aggregations: [aggregation] },
	});

	it.each([
		{
			scenario: 'an alias',
			aggregation: { alias: 'requests', expression: 'count()' },
			expected: 'requests',
		},
		{
			scenario: 'an expression',
			aggregation: { expression: 'p99(duration_nano)' },
			expected: 'p99(duration_nano)',
		},
		{
			scenario: 'a metric',
			aggregation: { metricName: 'signoz_calls_total', spaceAggregation: 'sum' },
			expected: 'sum(signoz_calls_total)',
		},
	])('names the value after $scenario', ({ aggregation, expected }) => {
		expect(
			prepareTopListData(dataWith([A], [aggregated(aggregation)])).valueName,
		).toBe(expected);
	});

	it('names a ranked formula after its expression', () => {
		const data = dataWith([F1], [query('A'), query('B'), formula('F1', 'A / B')]);

		expect(prepareTopListData(data).valueName).toBe('A / B');
	});

	it('falls back to the query name with nothing to describe it', () => {
		expect(prepareTopListData(dataWith([A], [query('A')])).valueName).toBe('A');
	});
});
