import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';

import {
	computeAxisScale,
	getMetricKey,
	getScatterQueryNames,
	prepareScatterData,
} from '../scatterUtils';

const makeSeries = (
	queryName: string,
	metric: Record<string, string>,
	value: string,
): QueryData => ({
	queryName,
	metric,
	values: [[1700000000, value]],
});

describe('getMetricKey', () => {
	it('builds a stable, order-independent key from group-by labels', () => {
		expect(getMetricKey({ b: '2', a: '1' })).toBe('a=1,b=2');
		expect(getMetricKey({ a: '1', b: '2' })).toBe('a=1,b=2');
	});

	it('ignores intrinsic labels wrapped in double underscores', () => {
		expect(getMetricKey({ __name__: 'http_latency', service: 'cart' })).toBe(
			'service=cart',
		);
	});

	it('returns an empty string when there are no group-by labels', () => {
		expect(getMetricKey({})).toBe('');
	});
});

describe('prepareScatterData', () => {
	it('pairs the first two queries by their group-by labels', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('A', { service: 'pay' }, '20'),
			makeSeries('B', { service: 'cart' }, '100'),
			makeSeries('B', { service: 'pay' }, '200'),
		];

		const { points, xQueryName, yQueryName } = prepareScatterData({
			panelData,
			isDarkMode: true,
		});

		expect(xQueryName).toBe('A');
		expect(yQueryName).toBe('B');
		expect(points).toHaveLength(2);
		expect(points).toStrictEqual(
			expect.arrayContaining([
				expect.objectContaining({ x: 10, y: 100 }),
				expect.objectContaining({ x: 20, y: 200 }),
			]),
		);
	});

	it('drops groups that are present in only one of the two queries', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('A', { service: 'only-in-a' }, '99'),
			makeSeries('B', { service: 'cart' }, '100'),
		];

		const { points } = prepareScatterData({ panelData, isDarkMode: false });

		expect(points).toHaveLength(1);
		expect(points[0]).toStrictEqual(expect.objectContaining({ x: 10, y: 100 }));
	});

	it('returns no points when fewer than two queries are present', () => {
		const { points, yQueryName } = prepareScatterData({
			panelData: [makeSeries('A', { service: 'cart' }, '10')],
			isDarkMode: false,
		});

		expect(points).toHaveLength(0);
		expect(yQueryName).toBe('');
	});

	it('honors explicit X/Y query selection over order of appearance', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('B', { service: 'cart' }, '100'),
			makeSeries('C', { service: 'cart' }, '1000'),
		];

		const { points, xQueryName, yQueryName } = prepareScatterData({
			panelData,
			isDarkMode: false,
			preferredXQuery: 'C',
			preferredYQuery: 'A',
		});

		expect(xQueryName).toBe('C');
		expect(yQueryName).toBe('A');
		expect(points[0]).toStrictEqual(expect.objectContaining({ x: 1000, y: 10 }));
	});

	it('falls back to order when a preferred query is not in the data', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('B', { service: 'cart' }, '100'),
		];

		const { xQueryName, yQueryName } = prepareScatterData({
			panelData,
			isDarkMode: false,
			preferredXQuery: 'missing',
		});

		expect(xQueryName).toBe('A');
		expect(yQueryName).toBe('B');
	});

	it('returns no points when X and Y resolve to the same query', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('B', { service: 'cart' }, '100'),
		];

		const { points } = prepareScatterData({
			panelData,
			isDarkMode: false,
			preferredXQuery: 'A',
			preferredYQuery: 'A',
		});

		expect(points).toHaveLength(0);
	});

	it('skips rows with non-numeric values', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, 'NaN'),
			makeSeries('B', { service: 'cart' }, '100'),
		];

		const { points } = prepareScatterData({ panelData, isDarkMode: false });

		expect(points).toHaveLength(0);
	});

	it('honors custom legend colors keyed by point label', () => {
		const panelData: QueryData[] = [
			makeSeries('A', { service: 'cart' }, '10'),
			makeSeries('B', { service: 'cart' }, '100'),
		];

		const { points } = prepareScatterData({
			panelData,
			isDarkMode: false,
			customLegendColors: { '{service="cart"}': '#ff0000' },
		});

		expect(points[0].label).toBe('{service="cart"}');
		expect(points[0].color).toBe('#ff0000');
	});
});

describe('getScatterQueryNames', () => {
	it('returns enabled builder queries, formulas and clickhouse queries in order', () => {
		const query = {
			builder: {
				queryData: [
					{ queryName: 'A', disabled: false },
					{ queryName: 'B', disabled: true },
					{ queryName: 'C', disabled: false },
				],
				queryFormulas: [{ queryName: 'F1', disabled: false }],
			},
			clickhouse_sql: [
				{ name: 'CH1', disabled: false },
				{ name: 'CH2', disabled: true },
			],
		} as unknown as Query;

		expect(getScatterQueryNames(query)).toStrictEqual(['A', 'C', 'F1', 'CH1']);
	});

	it('returns an empty array when no query is provided', () => {
		expect(getScatterQueryNames(undefined)).toStrictEqual([]);
	});
});

describe('computeAxisScale', () => {
	it('produces a padded range with nice ticks covering the data', () => {
		const scale = computeAxisScale([3, 17, 42]);

		expect(scale.min).toBeLessThanOrEqual(3);
		expect(scale.max).toBeGreaterThanOrEqual(42);
		expect(scale.ticks.length).toBeGreaterThan(1);
		expect(scale.normalize(scale.min)).toBeCloseTo(0);
		expect(scale.normalize(scale.max)).toBeCloseTo(1);
	});

	it('pads around a single flat value so it is not on the edge', () => {
		const scale = computeAxisScale([5, 5, 5]);

		expect(scale.min).toBeLessThan(5);
		expect(scale.max).toBeGreaterThan(5);
	});

	it('falls back to a unit range when there are no values', () => {
		const scale = computeAxisScale([]);

		expect(Number.isFinite(scale.min)).toBe(true);
		expect(Number.isFinite(scale.max)).toBe(true);
		expect(scale.max).toBeGreaterThan(scale.min);
	});
});
