import { MetrictypesSpaceAggregationDTO } from 'api/generated/services/sigNoz.schemas/metrictypesSpaceAggregationDTO';
import { Querybuildertypesv5OrderDirectionDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5OrderDirectionDTO';
import type { Querybuildertypesv5MetricAggregationDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5MetricAggregationDTO';
import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeDTO';
import type { Querybuildertypesv5TraceAggregationDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5TraceAggregationDTO';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import {
	appearance,
	builderQuery,
	formulaQuery as formula,
	groupColumn,
	metricQuery,
	requestWith,
	scalarResponse,
	topListPanel,
	traceQuery,
	valueColumn,
} from '../../__tests__/fixtures';
import { prepareTopListData } from '../prepareData';
import { getTopListDataWarning } from '../warnings';

const panel = topListPanel();

interface Result {
	queryName: string;
	rows: [string, number][];
}

function dataWith(
	results: Result[],
	queries: Querybuildertypesv5QueryEnvelopeDTO[],
): PanelQueryData {
	return {
		response: scalarResponse(
			results.map(({ queryName, rows }) => ({
				queryName,
				columns: [
					groupColumn('service.name', queryName),
					valueColumn('__result', 0, queryName),
				],
				data: rows,
			})),
		),
		requestPayload: requestWith(queries),
		legendMap: {},
	};
}

const query = (
	name: string,
	limit?: number,
): Querybuildertypesv5QueryEnvelopeDTO => builderQuery({ name, limit });

type Aggregation =
	| Querybuildertypesv5TraceAggregationDTO
	| Querybuildertypesv5MetricAggregationDTO;

/** Metrics aggregate a metric, traces and logs an expression. */
const isMetric = (
	aggregation: Aggregation,
): aggregation is Querybuildertypesv5MetricAggregationDTO =>
	'metricName' in aggregation;

const aggregated = (
	aggregation: Aggregation,
): Querybuildertypesv5QueryEnvelopeDTO =>
	isMetric(aggregation) ? metricQuery(aggregation) : traceQuery(aggregation);

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

	it('stays quiet about limited formula inputs when the list ranks a query', () => {
		const data = dataWith(
			[A],
			[query('A', 10), query('B', 10), formula('F1', 'A / B')],
		);

		expect(prepareTopListData(data).rows[0].queryName).toBe('A');
		expect(getTopListDataWarning(panel, data)).toBeNull();
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
				builderQuery({
					name: 'A',
					order: [
						{
							key: { name: 'count()' },
							direction: Querybuildertypesv5OrderDirectionDTO.asc,
						},
					],
				}),
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
				builderQuery({
					name: 'A',
					groupBy: [{ name: 'service.name' }],
					order: [
						{
							key: { name: 'service.name' },
							direction: Querybuildertypesv5OrderDirectionDTO.asc,
						},
					],
				}),
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
			aggregation: {
				metricName: 'signoz_calls_total',
				spaceAggregation: MetrictypesSpaceAggregationDTO.sum,
			},
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

describe('share of total warning', () => {
	const sharePanel = topListPanel({
		appearance: appearance({ showShare: true }),
	});
	const shareMessage = (data: PanelQueryData): string | undefined =>
		getTopListDataWarning(sharePanel, data)?.messages?.find((message) =>
			message.startsWith('Share of total'),
		);

	it.each([
		{
			scenario: 'a percentile',
			aggregation: { expression: 'p99(duration_nano)' },
		},
		{ scenario: 'an average', aggregation: { expression: 'avg(duration_nano)' } },
		{ scenario: 'a maximum', aggregation: { expression: 'max(duration_nano)' } },
		{
			scenario: 'a metric averaged across series',
			aggregation: {
				metricName: 'cpu',
				spaceAggregation: MetrictypesSpaceAggregationDTO.avg,
			},
		},
	])('warns when ranking $scenario', ({ aggregation }) => {
		expect(shareMessage(dataWith([A], [aggregated(aggregation)]))).toBeDefined();
	});

	it.each([
		{ scenario: 'a count', aggregation: { expression: 'count()' } },
		{ scenario: 'a sum', aggregation: { expression: 'sum(bytes)' } },
		{
			scenario: 'a metric summed across series',
			aggregation: {
				metricName: 'signoz_calls_total',
				spaceAggregation: MetrictypesSpaceAggregationDTO.sum,
			},
		},
	])('stays quiet when ranking $scenario', ({ aggregation }) => {
		expect(
			shareMessage(dataWith([A], [aggregated(aggregation)])),
		).toBeUndefined();
	});

	it('stays quiet for a formula, whose aggregation it cannot tell', () => {
		const data = dataWith([F1], [query('A'), query('B'), formula('F1', 'A / B')]);

		expect(shareMessage(data)).toBeUndefined();
	});

	it('stays quiet when the panel does not show shares', () => {
		const data = dataWith(
			[A],
			[aggregated({ expression: 'p99(duration_nano)' })],
		);

		expect(getTopListDataWarning(panel, data)).toBeNull();
	});
});
