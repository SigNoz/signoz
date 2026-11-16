import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import {
	groupColumn,
	requestWith,
	scalarResponse,
	topListPanel as panelWith,
	traceQuery,
	valueColumn,
} from '../../__tests__/fixtures';
import { getTopListCsvRows } from '../csv';

function dataWith(groupColumns: string[], rows: unknown[][]): PanelQueryData {
	return {
		response: scalarResponse([
			{
				queryName: 'A',
				columns: [...groupColumns.map((name) => groupColumn(name)), valueColumn()],
				data: rows,
			},
		]),
		requestPayload: undefined,
		legendMap: {},
	};
}

describe('getTopListCsvRows', () => {
	it('exports the rows in ranked order with formatted values', () => {
		const data = dataWith(
			['service.name'],
			[
				['auth', 25],
				['payment', 1500],
			],
		);

		expect(
			getTopListCsvRows(panelWith({ formatting: { unit: 'ms' } }), data),
		).toStrictEqual([
			{ 'service.name': 'payment', A: '1.5 s' },
			{ 'service.name': 'auth', A: '25 ms' },
		]);
	});

	it('names the label column after every group-by key', () => {
		const data = dataWith(['http.route', 'region'], [['GET /orders', 'eu', 3]]);

		expect(Object.keys(getTopListCsvRows(panelWith({}), data)[0])).toStrictEqual([
			'http.route, region',
			'A',
		]);
	});

	it('heads the value column with what it measures, not the legend template', () => {
		const data = {
			...dataWith(['service.name'], [['auth', 25]]),
			legendMap: { A: '{{service.name}}' },
		};

		expect(getTopListCsvRows(panelWith({}), data)).toStrictEqual([
			{ 'service.name': 'auth', A: '25' },
		]);
	});

	it('falls back to a generic label header without a group-by', () => {
		const data = dataWith([], [[42]]);

		expect(getTopListCsvRows(panelWith({}), data)).toStrictEqual([
			{ Label: 'A', A: '42' },
		]);
	});

	it('adds rank and share columns when the panel shows them', () => {
		const data = dataWith(
			['service.name'],
			[
				['auth', 25],
				['payment', 75],
			],
		);
		const panel = panelWith({
			appearance: { showRank: true, showShare: true, barColor: '#4E74F8' },
		});

		expect(getTopListCsvRows(panel, data)).toStrictEqual([
			{ Rank: '1', 'service.name': 'payment', A: '75', Share: '75%' },
			{ Rank: '2', 'service.name': 'auth', A: '25', Share: '25%' },
		]);
	});

	it('suffixes a header that repeats another instead of overwriting its column', () => {
		const data = {
			...dataWith(['Rank'], [['auth', 25]]),
			requestPayload: requestWith([
				traceQuery({ expression: 'count()', alias: 'Share' }),
			]),
		};
		const panel = panelWith({
			appearance: { showRank: true, showShare: true, barColor: '#4E74F8' },
		});

		expect(getTopListCsvRows(panel, data)).toStrictEqual([
			{ Rank: '1', 'Rank (2)': 'auth', Share: '25', 'Share (2)': '100%' },
		]);
	});

	it('exports nothing for an empty result', () => {
		expect(getTopListCsvRows(panelWith({}), dataWith([], []))).toStrictEqual([]);
	});
});
