import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { prepareNumberData } from '../prepareData';

function tableWith(
	columns: PanelTable['columns'],
	rows: PanelTable['rows'],
): PanelTable {
	return { queryName: 'A', legend: '', columns, rows };
}

describe('prepareNumberData', () => {
	it('returns null for no tables', () => {
		expect(prepareNumberData([])).toBeNull();
	});

	it('reads the first row of the value column', () => {
		const table = tableWith(
			[
				{ name: 'group', queryName: 'A', isValueColumn: false, id: 'group' },
				{ name: 'value', queryName: 'A', isValueColumn: true, id: 'val' },
			],
			[
				{ data: { group: 'prod', val: '295.4299833508185' } },
				{ data: { group: 'dev', val: '7' } },
			],
		);

		expect(prepareNumberData([table])).toBeCloseTo(295.43, 2);
	});

	it('falls back to the row first value when no column is tagged isValueColumn', () => {
		const table = tableWith(
			[{ name: 'value', queryName: 'A', isValueColumn: false, id: 'value' }],
			[{ data: { value: '7' } }],
		);

		expect(prepareNumberData([table])).toBe(7);
	});

	it('skips empty tables and reads the first one with rows', () => {
		const empty = tableWith(
			[{ name: 'value', queryName: 'A', isValueColumn: true, id: 'A' }],
			[],
		);
		const filled = tableWith(
			[{ name: 'value', queryName: 'B', isValueColumn: true, id: 'B' }],
			[{ data: { B: 42 } }],
		);

		expect(prepareNumberData([empty, filled])).toBe(42);
	});

	it('returns null when the value is non-numeric', () => {
		const table = tableWith(
			[{ name: 'value', queryName: 'A', isValueColumn: true, id: 'A' }],
			[{ data: { A: 'n/a' } }],
		);

		expect(prepareNumberData([table])).toBeNull();
	});
});
