import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { prepareGeoMapData } from '../prepareData';
import { withTooltipDetails } from '../tooltipDetails';

const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});
const value = (id: string, name: string): PanelTableColumn => ({
	id,
	name,
	queryName: 'A',
	isValueColumn: true,
});

const table: PanelTable = {
	queryName: 'A',
	legend: '',
	columns: [
		group('country'),
		value('A.requests', 'requests'),
		value('A.error_rate', 'error_rate'),
		value('A.p95_ms', 'p95_ms'),
	],
	rows: [
		{
			data: {
				country: 'US',
				'A.requests': 23350,
				'A.error_rate': 1.58,
				'A.p95_ms': 'n/a',
			},
		},
	],
};

const formatterFor =
	(id: string) =>
	(n: number): string =>
		`${n} ${id}`;

describe('withTooltipDetails', () => {
	it("lists the row's other values in their own format, the color one left out", () => {
		const data = prepareGeoMapData({
			table,
			location: undefined,
			map: { colorBy: 'A.error_rate' },
			scale: ColorRampScale.Linear,
			subdivisions: null,
		});

		const { regions } = withTooltipDetails({
			table,
			data,
			labels: { 'A.requests': 'A.requests' },
			formatterFor,
		});

		expect(regions[0].details).toStrictEqual([
			{ label: 'A.requests', value: '23350 A.requests' },
			{ label: 'p95_ms', value: '—' },
		]);
	});

	it('adds nothing when color is the only value', () => {
		const single: PanelTable = { ...table, columns: table.columns.slice(0, 2) };
		const data = prepareGeoMapData({
			table: single,
			location: undefined,
			map: undefined,
			scale: ColorRampScale.Linear,
			subdivisions: null,
		});

		expect(
			withTooltipDetails({ table: single, data, labels: {}, formatterFor })
				.regions[0].details,
		).toBeUndefined();
	});
});
