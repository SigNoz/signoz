import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getColorGroupLabels, UNGROUPED_SERIES_LABEL } from '../prepareData';

const column = (id: string, isValueColumn = false): PanelTableColumn => ({
	id,
	name: id,
	queryName: 'A',
	isValueColumn,
});

function makeTable(
	columns: PanelTableColumn[],
	rows: Record<string, unknown>[],
): PanelTable {
	return {
		queryName: 'A',
		legend: '',
		columns,
		rows: rows.map((data) => ({ data })),
	};
}

describe('getColorGroupLabels', () => {
	it('labels each row by the selected keys, in row order', () => {
		const table = makeTable(
			[column('region'), column('env'), column('A', true)],
			[
				{ region: 'eu', env: 'prod', A: 1 },
				{ region: 'us', env: 'dev', A: 2 },
			],
		);

		expect(getColorGroupLabels(table, ['env'])).toStrictEqual(['prod', 'dev']);
		expect(getColorGroupLabels(table, undefined)).toStrictEqual([
			'eu, prod',
			'us, dev',
		]);
	});

	it('keeps groups apart when a value holds the separator', () => {
		const table = makeTable(
			[column('region'), column('env'), column('A', true)],
			[
				{ region: 'us, east', env: 'prod', A: 1 },
				{ region: 'us', env: 'east, prod', A: 2 },
			],
		);

		expect(getColorGroupLabels(table, undefined)).toStrictEqual([
			'"us, east", prod',
			'us, "east, prod"',
		]);
	});

	it('puts every row in one group when the query has no group by', () => {
		const table = makeTable([column('A', true)], [{ A: 1 }, { A: 2 }]);

		expect(getColorGroupLabels(table, undefined)).toStrictEqual([
			UNGROUPED_SERIES_LABEL,
			UNGROUPED_SERIES_LABEL,
		]);
	});
});
