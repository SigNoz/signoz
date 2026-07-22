import { themeColors } from 'constants/theme';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';

import { preparePieChartData } from '../preparePieChartData';

const options = { colorMap: themeColors.chartcolors };

/**
 * Mirrors a query-range payload: the (possibly collapsed) time-series `result`
 * plus the scalar table nested under `newResult` (as getQueryResults produces it).
 */
function makePayload(
	result: QueryData[],
	tables: QueryDataV3[],
): MetricRangePayloadProps {
	return {
		data: {
			result,
			resultType: 'scalar',
			newResult: { data: { result: tables, resultType: 'scalar' } },
		},
	} as MetricRangePayloadProps;
}

function tableEntry(
	columns: NonNullable<QueryDataV3['table']>['columns'],
	rows: NonNullable<QueryDataV3['table']>['rows'],
	overrides: Partial<QueryDataV3> = {},
): QueryDataV3 {
	return {
		queryName: 'A',
		legend: '',
		series: null,
		list: null,
		table: { columns, rows },
		...overrides,
	} as QueryDataV3;
}

describe('preparePieChartData', () => {
	it('renders a slice per value column for a multi-column ClickHouse scalar', () => {
		// SELECT count() AS col1, sum(value) AS col2 — the backend collapses the
		// time-series result onto col1; the full data lives in the scalar table.
		const payload = makePayload(
			[
				{
					metric: {},
					queryName: 'A',
					legend: '',
					values: [[0, '23399927']],
				} as QueryData,
			],
			[
				tableEntry(
					[
						{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
						{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
					],
					[{ data: { col1: 23399927, col2: 588691297 } }],
				),
			],
		);

		const slices = preparePieChartData(payload, options);

		expect(slices).toHaveLength(2);
		expect(slices.map((s) => [s.label, s.value])).toStrictEqual([
			['col1', '23399927'],
			['col2', '588691297'],
		]);
	});

	it('prefixes the group when multiple value columns are grouped', () => {
		const payload = makePayload(
			[],
			[
				tableEntry(
					[
						{ name: 'env', queryName: 'A', isValueColumn: false, id: 'env' },
						{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
						{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
					],
					[{ data: { env: 'prod', col1: 10, col2: 20 } }],
				),
			],
		);

		const slices = preparePieChartData(payload, options);

		expect(slices.map((s) => s.label)).toStrictEqual([
			'prod · col1',
			'prod · col2',
		]);
		expect(slices[0].record.metric).toStrictEqual({ env: 'prod' });
	});

	it('drops non-positive and non-numeric values', () => {
		const payload = makePayload(
			[],
			[
				tableEntry(
					[
						{ name: 'col1', queryName: 'A', isValueColumn: true, id: 'col1' },
						{ name: 'col2', queryName: 'A', isValueColumn: true, id: 'col2' },
						{ name: 'col3', queryName: 'A', isValueColumn: true, id: 'col3' },
					],
					[{ data: { col1: 5, col2: 0, col3: 'n/a' } }],
				),
			],
		);

		const slices = preparePieChartData(payload, options);

		expect(slices.map((s) => s.label)).toStrictEqual(['col1']);
	});

	it('keeps the series path for a single value column (grouped panel)', () => {
		// One value column → the time-series result is authoritative (one slice per
		// group), so existing behaviour is preserved.
		const payload = makePayload(
			[
				{
					metric: { 'service.name': 'adservice' },
					queryName: 'A',
					legend: 'adservice',
					values: [[0, '100']],
				} as QueryData,
				{
					metric: { 'service.name': 'cartservice' },
					queryName: 'A',
					legend: 'cartservice',
					values: [[0, '200']],
				} as QueryData,
			],
			[
				tableEntry(
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
				),
			],
		);

		const slices = preparePieChartData(payload, options);

		expect(slices.map((s) => [s.label, s.value])).toStrictEqual([
			['adservice', '100'],
			['cartservice', '200'],
		]);
	});

	it('uses the legacy series result when there is no scalar table', () => {
		const payload = makePayload(
			[
				{
					metric: { 'service.name': 'adservice' },
					queryName: 'A',
					legend: '{{service.name}}',
					values: [[1000, '42']],
				} as QueryData,
			],
			[],
		);

		const slices = preparePieChartData(payload, options);

		expect(slices).toHaveLength(1);
		expect(slices[0].value).toBe('42');
	});

	it('returns no slices for an empty payload', () => {
		expect(preparePieChartData(undefined, options)).toStrictEqual([]);
	});
});
