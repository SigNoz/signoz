import type { PanelTable } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { prepareTopListRows } from '../prepareData';

describe('prepareTopListRows with an unlimited SQL result', () => {
	it('ranks more rows than a function call can take as arguments', () => {
		const count = 200_000;
		const table: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [
				{ name: 'host', id: 'host', queryName: 'A', isValueColumn: false },
				{ name: 'hits', id: 'hits', queryName: 'A', isValueColumn: true },
			],
			rows: Array.from({ length: count }, (_, index) => ({
				data: { host: `host-${index}`, hits: index + 1 },
			})),
		};

		const { rows } = prepareTopListRows([table]);

		expect(rows).toHaveLength(count);
		expect(rows[0]).toMatchObject({ label: `host-${count - 1}`, ratio: 1 });
	});
});
