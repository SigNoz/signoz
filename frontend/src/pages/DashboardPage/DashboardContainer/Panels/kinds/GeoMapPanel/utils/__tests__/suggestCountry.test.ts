import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { suggestCountry } from '../suggestCountry';

const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});

function makeTable(
	columns: string[],
	rows: Record<string, unknown>[],
): PanelTable {
	return {
		queryName: 'A',
		legend: '',
		columns: columns.map(group),
		rows: rows.map((data) => ({ data })),
	};
}

describe('suggestCountry', () => {
	it('takes the most common prefix of ISO 3166-2 codes', () => {
		const table = makeTable(
			['geo.region.iso_code'],
			[
				{ 'geo.region.iso_code': 'US-CA' },
				{ 'geo.region.iso_code': 'US-NY' },
				{ 'geo.region.iso_code': 'FR-75' },
			],
		);

		expect(suggestCountry(table, undefined)).toBe('US');
	});

	it('falls back to the country column', () => {
		const table = makeTable(
			['geo.country.iso_code', 'geo.region.iso_code'],
			[{ 'geo.country.iso_code': 'India', 'geo.region.iso_code': 'KA' }],
		);

		expect(suggestCountry(table, undefined)).toBe('IN');
	});

	it('suggests nothing without a location', () => {
		expect(
			suggestCountry(
				makeTable(['service.name'], [{ 'service.name': 'cart' }]),
				undefined,
			),
		).toBeUndefined();
		expect(suggestCountry(undefined, undefined)).toBeUndefined();
	});
});
