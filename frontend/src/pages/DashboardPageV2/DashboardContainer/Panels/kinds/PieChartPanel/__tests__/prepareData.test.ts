import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { preparePieData } from '../prepareData';

function tableWith(
	columns: PanelTable['columns'],
	rows: PanelTable['rows'],
	overrides: Partial<PanelTable> = {},
): PanelTable {
	return { queryName: 'A', legend: '', columns, rows, ...overrides };
}

const args = (tables: PanelTable[]): Parameters<typeof preparePieData>[0] => ({
	tables,
	isDarkMode: true,
});

describe('preparePieData', () => {
	it('renders a slice per value column for a multi-column ClickHouse scalar', () => {
		const table = tableWith(
			[
				{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
				{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
			],
			[{ data: { col1: 23399927, col2: 588691297 } }],
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => [s.label, s.value])).toStrictEqual([
			['col1', 23399927],
			['col2', 588691297],
		]);
	});

	it('serialises a single group-by column as {key="value"} (V1 parity)', () => {
		const table = tableWith(
			[
				{
					name: 'service.name',
					queryName: 'A',
					isValueColumn: false,
					id: 'service.name',
				},
				{ name: 'count', queryName: 'A', isValueColumn: true, id: 'A' },
			],
			[
				{ data: { 'service.name': 'adservice', A: 100 } },
				{ data: { 'service.name': 'cartservice', A: 200 } },
			],
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => [s.label, s.value])).toStrictEqual([
			['{service.name="adservice"}', 100],
			['{service.name="cartservice"}', 200],
		]);
	});

	it('serialises a grouped metrics query as {direction="write"} (V1 parity)', () => {
		const table = tableWith(
			[
				{
					name: 'direction',
					queryName: 'A',
					isValueColumn: false,
					id: 'direction',
				},
				{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' },
			],
			[
				{ data: { direction: 'write', A: 3170000000 } },
				{ data: { direction: 'read', A: 10000000 } },
			],
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => s.label)).toStrictEqual([
			'{direction="write"}',
			'{direction="read"}',
		]);
	});

	it('substitutes a legend format template with the group-by values', () => {
		const table = tableWith(
			[
				{
					name: 'service.name',
					queryName: 'A',
					isValueColumn: false,
					id: 'service.name',
				},
				{ name: 'count', queryName: 'A', isValueColumn: true, id: 'A' },
			],
			[
				{ data: { 'service.name': 'adservice', A: 100 } },
				{ data: { 'service.name': 'cartservice', A: 200 } },
			],
			{ legend: 'service.name = {{service.name}}' },
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => s.label)).toStrictEqual([
			'service.name = adservice',
			'service.name = cartservice',
		]);
	});

	it('prefixes the group when multiple value columns are grouped', () => {
		const table = tableWith(
			[
				{ name: 'env', queryName: 'A', isValueColumn: false, id: 'env' },
				{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
				{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
			],
			[{ data: { env: 'prod', col1: 10, col2: 20 } }],
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => s.label)).toStrictEqual([
			'prod · col1',
			'prod · col2',
		]);
	});

	it('falls back to legend/query name when a single value column has no group', () => {
		const table = tableWith(
			[{ name: 'count', queryName: 'A', isValueColumn: true, id: 'A' }],
			[{ data: { A: 42 } }],
			{ legend: 'requests' },
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => [s.label, s.value])).toStrictEqual([
			['requests', 42],
		]);
	});

	it('honours customColors over the generated palette', () => {
		const table = tableWith(
			[
				{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
				{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
			],
			[{ data: { col1: 10, col2: 20 } }],
		);

		const slices = preparePieData({
			tables: [table],
			isDarkMode: true,
			customColors: { col1: '#ff0000' },
		});

		expect(slices[0].color).toBe('#ff0000');
		expect(slices[1].color).not.toBe('#ff0000');
	});

	it('drops non-positive and non-numeric values', () => {
		const table = tableWith(
			[
				{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
				{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
				{ name: 'col3', queryName: 'A', isValueColumn: true, id: 'col3' },
			],
			[{ data: { col1: 5, col2: 0, col3: 'n/a' } }],
		);

		const slices = preparePieData(args([table]));

		expect(slices.map((s) => s.label)).toStrictEqual(['col1']);
	});

	it('returns no slices for empty tables', () => {
		expect(preparePieData(args([]))).toStrictEqual([]);
	});

	it('carries the value column query name and group-by labels for drilldown', () => {
		const table = tableWith(
			[
				{
					name: 'service.name',
					queryName: 'A',
					isValueColumn: false,
					id: 'service.name',
				},
				{ name: 'count', queryName: 'A', isValueColumn: true, id: 'A' },
			],
			[{ data: { 'service.name': 'adservice', A: 100 } }],
		);

		const [slice] = preparePieData(args([table]));

		expect(slice.queryName).toBe('A');
		expect(slice.labels).toStrictEqual({ 'service.name': 'adservice' });
	});

	it('leaves labels empty for an ungrouped slice', () => {
		const table = tableWith(
			[{ name: 'count', queryName: 'A', isValueColumn: true, id: 'A' }],
			[{ data: { A: 42 } }],
			{ legend: 'requests' },
		);

		const [slice] = preparePieData(args([table]));

		expect(slice.queryName).toBe('A');
		expect(slice.labels).toStrictEqual({});
	});
});
