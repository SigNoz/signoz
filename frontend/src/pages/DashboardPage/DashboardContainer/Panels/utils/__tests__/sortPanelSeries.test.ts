import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesSeriesOrderDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { sortSeriesByMeanDesc } from '../sortSeriesByMean';
import {
	sortPanelSeries,
	sortSeriesByDefinitionOrder,
} from '../sortPanelSeries';

function makeSeries(
	queryName: string,
	values: number[],
	overrides: Partial<PanelSeries> = {},
): PanelSeries {
	return {
		queryName,
		legend: '',
		labels: {},
		kind: 'series',
		values: values.map((value, index) => ({
			timestamp: (index + 1) * 1_000,
			value,
		})),
		aggregation: { index: 0, alias: '' },
		...overrides,
	};
}

/** A panel whose one CompositeQuery defines these queries, in this order. */
function compositePanelQueries(
	queries: { name: string; type?: string }[],
): DashboardtypesQueryDTO[] {
	return [
		{
			spec: {
				plugin: {
					kind: 'signoz/CompositeQuery',
					spec: {
						queries: queries.map(({ name, type = 'builder_query' }) => ({
							type,
							spec: { name },
						})),
					},
				},
			},
		},
	] as unknown as DashboardtypesQueryDTO[];
}

const names = (series: PanelSeries[]): string[] =>
	series.map((item) => item.queryName);

describe('sortSeriesByDefinitionOrder', () => {
	it('orders series by their position in the query list, not by mean', () => {
		// B has the largest mean, so the mean sort would lead with it.
		const series = [
			makeSeries('C', [5]),
			makeSeries('B', [100]),
			makeSeries('A', [1]),
		];

		expect(
			names(sortSeriesByDefinitionOrder(series, ['A', 'B', 'C'])),
		).toStrictEqual(['A', 'B', 'C']);
	});

	it('puts the first query at the top of a stacked bar', () => {
		// `stackSeries` accumulates from the last series upward, so index 0 is the top segment.
		const [topSegment] = sortSeriesByDefinitionOrder(
			[makeSeries('B', [1]), makeSeries('A', [1])],
			['A', 'B'],
		);

		expect(topSegment.queryName).toBe('A');
	});

	it('tiebreaks a grouped query on labels, so its series keep one order', () => {
		const forward = sortSeriesByDefinitionOrder(
			[
				makeSeries('A', [1], { labels: { host: 'c' } }),
				makeSeries('A', [9], { labels: { host: 'a' } }),
				makeSeries('A', [5], { labels: { host: 'b' } }),
			],
			['A'],
		);
		const reversed = sortSeriesByDefinitionOrder(
			[
				makeSeries('A', [5], { labels: { host: 'b' } }),
				makeSeries('A', [9], { labels: { host: 'a' } }),
				makeSeries('A', [1], { labels: { host: 'c' } }),
			],
			['A'],
		);

		expect(forward.map((item) => item.labels.host)).toStrictEqual([
			'a',
			'b',
			'c',
		]);
		expect(reversed.map((item) => item.labels.host)).toStrictEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('tiebreaks on the aggregation index when one query carries several', () => {
		const sorted = sortSeriesByDefinitionOrder(
			[
				makeSeries('A', [1], { aggregation: { index: 1, alias: '' } }),
				makeSeries('A', [1], { aggregation: { index: 0, alias: '' } }),
			],
			['A'],
		);

		expect(sorted.map((item) => item.aggregation.index)).toStrictEqual([0, 1]);
	});

	it('orders aggregation indices numerically, not as text', () => {
		// As text, "10" sorts before "2"; a query with more than ten aggregations
		// must still follow its definition order.
		const sorted = sortSeriesByDefinitionOrder(
			[
				makeSeries('A', [1], { aggregation: { index: 10, alias: '' } }),
				makeSeries('A', [1], { aggregation: { index: 2, alias: '' } }),
				makeSeries('A', [1], { aggregation: { index: 1, alias: '' } }),
			],
			['A'],
		);

		expect(sorted.map((item) => item.aggregation.index)).toStrictEqual([
			1, 2, 10,
		]);
	});

	it('keeps label sets distinct when a value contains the old delimiters', () => {
		// `{a: "x,b=y"}` and `{a: "x", b: "y"}` used to serialise to the same key,
		// which handed their relative order back to the wire.
		const joined = makeSeries('A', [1], { labels: { a: 'x,b=y' } });
		const split = makeSeries('A', [1], { labels: { a: 'x', b: 'y' } });

		const forward = sortSeriesByDefinitionOrder([joined, split], ['A']);
		const backward = sortSeriesByDefinitionOrder([split, joined], ['A']);

		expect(forward.map((item) => item.labels)).toStrictEqual(
			backward.map((item) => item.labels),
		);
	});

	it('sinks series whose query the panel no longer defines to the bottom', () => {
		const sorted = sortSeriesByDefinitionOrder(
			[makeSeries('Z', [1]), makeSeries('B', [1]), makeSeries('A', [1])],
			['A', 'B'],
		);

		expect(names(sorted)).toStrictEqual(['A', 'B', 'Z']);
	});

	it('orders several unknown query names deterministically', () => {
		const forward = sortSeriesByDefinitionOrder(
			[makeSeries('Z', [1]), makeSeries('A', [1]), makeSeries('Y', [1])],
			['A'],
		);
		const reversed = sortSeriesByDefinitionOrder(
			[makeSeries('Y', [1]), makeSeries('A', [1]), makeSeries('Z', [1])],
			['A'],
		);

		expect(names(forward)).toStrictEqual(['A', 'Y', 'Z']);
		expect(names(reversed)).toStrictEqual(['A', 'Y', 'Z']);
	});

	it('ranks every series last when the panel defines no queries', () => {
		const sorted = sortSeriesByDefinitionOrder(
			[makeSeries('B', [1]), makeSeries('A', [1])],
			[],
		);

		expect(names(sorted)).toStrictEqual(['A', 'B']);
	});

	it('does not mutate the input array', () => {
		const input = [makeSeries('B', [1]), makeSeries('A', [1])];

		const sorted = sortSeriesByDefinitionOrder(input, ['A', 'B']);

		expect(names(input)).toStrictEqual(['B', 'A']);
		expect(names(sorted)).toStrictEqual(['A', 'B']);
	});

	it('returns an empty array for no series', () => {
		expect(sortSeriesByDefinitionOrder([], ['A'])).toStrictEqual([]);
	});
});

describe('sortPanelSeries', () => {
	const series = [
		makeSeries('A', [1]),
		makeSeries('B', [100]),
		makeSeries('C', [5]),
	];
	const queries = compositePanelQueries([
		{ name: 'A' },
		{ name: 'B' },
		{ name: 'C' },
	]);

	it('falls back to the mean sort when the panel sets no series order', () => {
		const sorted = sortPanelSeries({ series, seriesOrder: undefined, queries });

		expect(names(sorted)).toStrictEqual(['B', 'C', 'A']);
		expect(sorted).toStrictEqual(sortSeriesByMeanDesc(series));
	});

	it('keeps the mean sort on an explicit mean_desc', () => {
		const sorted = sortPanelSeries({
			series,
			seriesOrder: DashboardtypesSeriesOrderDTO.mean_desc,
			queries,
		});

		expect(names(sorted)).toStrictEqual(['B', 'C', 'A']);
		expect(sorted).toStrictEqual(sortSeriesByMeanDesc(series));
	});

	it('reads the query list off the panel on definition order', () => {
		const sorted = sortPanelSeries({
			series,
			seriesOrder: DashboardtypesSeriesOrderDTO.definition,
			queries,
		});

		expect(names(sorted)).toStrictEqual(['A', 'B', 'C']);
	});

	it('ranks formulas by where they sit among the queries', () => {
		const withFormula = [...series, makeSeries('F1', [1000])];

		const sorted = sortPanelSeries({
			series: withFormula,
			seriesOrder: DashboardtypesSeriesOrderDTO.definition,
			queries: compositePanelQueries([
				{ name: 'A' },
				{ name: 'F1', type: 'builder_formula' },
				{ name: 'B' },
				{ name: 'C' },
			]),
		});

		expect(names(sorted)).toStrictEqual(['A', 'F1', 'B', 'C']);
	});
});
