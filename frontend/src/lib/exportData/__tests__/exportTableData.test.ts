import { exportTableData } from '../exportTableData';

const columns = [
	{ name: 'service.name', key: 'service.name' },
	{ name: 'count()', key: 'A', isValueColumn: true },
	{ name: 'avg(duration)', key: 'B', isValueColumn: true },
];

describe('exportTableData', () => {
	it('serializes raw values in display column order', () => {
		const table = exportTableData({
			columns,
			dataSource: [
				{ 'service.name': 'frontend', A: 120, B: 45.5 },
				{ 'service.name': 'cart', A: 80, B: 12 },
			],
		});

		expect(table).toStrictEqual({
			headers: ['service.name', 'count()', 'avg(duration)'],
			rows: [
				['frontend', 120, 45.5],
				['cart', 80, 12],
			],
		});
	});

	it('appends column units to value columns only, skipping display-only ids', () => {
		const table = exportTableData({
			columns,
			dataSource: [{ 'service.name': 'frontend', A: 120, B: 45.5 }],
			columnUnits: { A: 'short', B: 'ms', 'service.name': 'ms' },
		});

		// group column never gets a unit; 'short' is display-only and skipped
		expect(table.headers).toStrictEqual([
			'service.name',
			'count()',
			'avg(duration) (ms)',
		]);
	});

	it('marks missing cells as blank gaps', () => {
		const table = exportTableData({
			columns,
			dataSource: [{ 'service.name': 'frontend', A: 120 }],
		});

		expect(table.rows).toStrictEqual([['frontend', 120, '']]);
	});

	it('returns a headers-only table for empty data', () => {
		expect(exportTableData({ columns, dataSource: [] })).toStrictEqual({
			headers: ['service.name', 'count()', 'avg(duration)'],
			rows: [],
		});
	});
});
