import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { EMPTY_LABEL, prepareTopListRows } from '../prepareData';

const groupColumn = (name: string): PanelTableColumn => ({
	name,
	id: name,
	queryName: 'A',
	isValueColumn: false,
});
const valueColumn = (name = 'count()'): PanelTableColumn => ({
	name,
	id: name,
	queryName: 'A',
	isValueColumn: true,
});

function serviceTable(
	rows: [unknown, unknown][],
	overrides: Partial<PanelTable> = {},
): PanelTable {
	return {
		queryName: 'A',
		legend: '',
		columns: [groupColumn('service.name'), valueColumn()],
		rows: rows.map(([service, value]) => ({
			data: { 'service.name': service, 'count()': value },
		})),
		...overrides,
	};
}

const summarize = (table: PanelTable): [string, number | null, number][] =>
	prepareTopListRows([table]).rows.map((row) => [
		row.label,
		row.value,
		row.ratio,
	]);

describe('prepareTopListRows', () => {
	it('ranks rows by value, descending, with bars relative to the largest value', () => {
		const table = serviceTable([
			['auth', 30],
			['payment', 40],
			['checkout', 10],
		]);

		expect(summarize(table)).toStrictEqual([
			['payment', 40, 1],
			['auth', 30, 0.75],
			['checkout', 10, 0.25],
		]);
	});

	it('breaks ties by label so the order is stable across refreshes', () => {
		const table = serviceTable([
			['search', 5],
			['auth', 5],
			['checkout', 5],
		]);

		expect(summarize(table).map(([label]) => label)).toStrictEqual([
			'auth',
			'checkout',
			'search',
		]);
	});

	it('keeps non-numeric values without a bar, sorted last, with the raw cell for display', () => {
		const table = serviceTable([
			['nan', 'NaN'],
			['inf', 'Inf'],
			['missing', 'n/a'],
			['null', null],
			['ok', 7],
		]);

		const { rows } = prepareTopListRows([table]);

		expect(rows.map((row) => [row.label, row.value, row.ratio])).toStrictEqual([
			['ok', 7, 1],
			['inf', null, 0],
			['missing', null, 0],
			['nan', null, 0],
			['null', null, 0],
		]);
		expect(rows[1].rawValue).toBe('Inf');
	});

	it('keeps zero and negative values with an empty bar', () => {
		const table = serviceTable([
			['down', -4],
			['flat', 0],
			['up', 8],
		]);

		expect(summarize(table)).toStrictEqual([
			['up', 8, 1],
			['flat', 0, 0],
			['down', -4, 0],
		]);
	});

	it('shows rows with empty bars when no value is positive', () => {
		const table = serviceTable([
			['a', 0],
			['b', -1],
		]);

		expect(summarize(table)).toStrictEqual([
			['a', 0, 0],
			['b', -1, 0],
		]);
	});

	it('parses numeric strings', () => {
		const table = serviceTable([
			['a', '12'],
			['b', ' '],
		]);

		expect(summarize(table)).toStrictEqual([
			['a', 12, 1],
			['b', null, 0],
		]);
	});

	it('labels a missing group value as empty for both null (traces/logs) and "" (metrics)', () => {
		const table = serviceTable([
			[null, 2],
			['', 1],
		]);

		const { rows } = prepareTopListRows([table]);

		expect(rows.map((row) => [row.label, row.isEmptyLabel])).toStrictEqual([
			[EMPTY_LABEL, true],
			[EMPTY_LABEL, true],
		]);
		expect(rows.map((row) => row.key)).toStrictEqual(['A-0', 'A-1']);
	});

	it('joins several group values, marking only the missing ones', () => {
		const table: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [groupColumn('http.route'), groupColumn('region'), valueColumn()],
			rows: [
				{
					data: { 'http.route': 'GET /orders', region: 'us-east-1', 'count()': 3 },
				},
				{ data: { 'http.route': 'GET /cart', region: null, 'count()': 1 } },
			],
		};

		expect(summarize(table).map(([label]) => label)).toStrictEqual([
			'GET /orders · us-east-1',
			`GET /cart · ${EMPTY_LABEL}`,
		]);
	});

	it('fills a legend template, rendering a key the row lacks as empty', () => {
		const table = serviceTable([['checkout', 1]], {
			legend: '{{service.name}} ({{region}})',
		});

		expect(summarize(table)[0][0]).toBe('checkout ()');
	});

	it('keeps rows distinct when a legend without variables gives them all one label', () => {
		const table = serviceTable(
			[
				['a', 2],
				['b', 1],
			],
			{ legend: 'requests' },
		);

		const { rows } = prepareTopListRows([table]);

		expect(rows.map((row) => row.label)).toStrictEqual(['requests', 'requests']);
		expect(new Set(rows.map((row) => row.key)).size).toBe(2);
	});

	it('labels a query without a group-by by its name', () => {
		const table: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [valueColumn()],
			rows: [{ data: { 'count()': 42 } }],
		};

		const data = prepareTopListRows([table]);

		expect(data.labelColumnNames).toStrictEqual([]);
		expect(data.rows.map((row) => [row.label, row.value])).toStrictEqual([
			['A', 42],
		]);
	});

	it('ranks by the first value column and reports the rest as ignored', () => {
		const table: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [groupColumn('host'), valueColumn('p99'), valueColumn('p50')],
			rows: [
				{ data: { host: 'a', p99: 1, p50: 9 } },
				{ data: { host: 'b', p99: 2, p50: 1 } },
			],
		};

		const data = prepareTopListRows([table]);

		expect(data.rows.map((row) => [row.label, row.value])).toStrictEqual([
			['b', 2],
			['a', 1],
		]);
		expect(data.ignoredValueColumns).toStrictEqual(['p50']);
	});

	it('carries the query and group values for drilldown filters', () => {
		const table = serviceTable([
			['checkout', 1],
			['', 2],
			[null, 3],
		]);

		const { rows } = prepareTopListRows([table]);

		expect(rows.map((row) => [row.queryName, row.labels])).toStrictEqual([
			['A', {}],
			['A', { 'service.name': '' }],
			['A', { 'service.name': 'checkout' }],
		]);
	});

	it('returns no rows when no table has a value column', () => {
		expect(prepareTopListRows([])).toStrictEqual({
			rows: [],
			labelColumnNames: [],
			valueColumnName: '',
			ignoredValueColumns: [],
			ignoredResults: [],
			orderedByGroupKey: null,
		});
		expect(
			prepareTopListRows([
				{ queryName: 'A', legend: '', columns: [groupColumn('x')], rows: [] },
			]).rows,
		).toStrictEqual([]);
	});
});
