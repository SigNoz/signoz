import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { sortSeriesByMeanDesc } from '../sortSeriesByMean';

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

const names = (series: PanelSeries[]): string[] =>
	series.map((item) => item.queryName);

describe('sortSeriesByMeanDesc', () => {
	it('orders series by descending mean', () => {
		const sorted = sortSeriesByMeanDesc([
			makeSeries('A', [1, 1]),
			makeSeries('B', [10, 20]),
			makeSeries('C', [5, 5]),
		]);

		expect(names(sorted)).toStrictEqual(['B', 'C', 'A']);
	});

	it('sinks series with no finite points to the bottom', () => {
		const sorted = sortSeriesByMeanDesc([
			makeSeries('A', []),
			makeSeries('B', [NaN, Infinity]),
			makeSeries('C', [1]),
		]);

		expect(names(sorted)).toStrictEqual(['C', 'A', 'B']);
	});

	it('ignores non-finite points when averaging', () => {
		const sorted = sortSeriesByMeanDesc([
			makeSeries('A', [2, 2]),
			// Mean over finite points only is 10, so NaN must not poison it to last place.
			makeSeries('B', [10, NaN]),
		]);

		expect(names(sorted)).toStrictEqual(['B', 'A']);
	});

	it('produces the same order regardless of input order', () => {
		const a = makeSeries('A', [5]);
		const b = makeSeries('B', [5]);
		const c = makeSeries('C', [9]);

		expect(names(sortSeriesByMeanDesc([a, b, c]))).toStrictEqual(
			names(sortSeriesByMeanDesc([c, b, a])),
		);
		expect(names(sortSeriesByMeanDesc([b, a, c]))).toStrictEqual(['C', 'A', 'B']);
	});

	it('tiebreaks equal means on labels when the query name matches', () => {
		const forward = sortSeriesByMeanDesc([
			makeSeries('A', [1], { labels: { host: 'b' } }),
			makeSeries('A', [1], { labels: { host: 'a' } }),
		]);
		const reversed = sortSeriesByMeanDesc([
			makeSeries('A', [1], { labels: { host: 'a' } }),
			makeSeries('A', [1], { labels: { host: 'b' } }),
		]);

		expect(forward.map((item) => item.labels.host)).toStrictEqual(['a', 'b']);
		expect(reversed.map((item) => item.labels.host)).toStrictEqual(['a', 'b']);
	});

	it('does not mutate the input array', () => {
		const input = [makeSeries('A', [1]), makeSeries('B', [9])];

		const sorted = sortSeriesByMeanDesc(input);

		expect(names(input)).toStrictEqual(['A', 'B']);
		expect(names(sorted)).toStrictEqual(['B', 'A']);
	});

	it('returns an empty array for no series', () => {
		expect(sortSeriesByMeanDesc([])).toStrictEqual([]);
	});
});
