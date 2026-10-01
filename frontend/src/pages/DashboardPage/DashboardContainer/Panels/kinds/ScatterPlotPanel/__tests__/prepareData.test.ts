import { DashboardtypesAxisScaleDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { prepareScatterPlotData, UNGROUPED_SERIES_LABEL } from '../prepareData';
import { ScatterPlotDataStatus } from '../types';

const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});

const value = (id: string, name = id): PanelTableColumn => ({
	id,
	name,
	queryName: id.split('.')[0],
	isValueColumn: true,
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

const tracesTable = makeTable(
	[
		group('service.name'),
		value('A.count()', 'count()'),
		value('A.p99(duration_nano)', 'p99(duration_nano)'),
		value('A.countIf(has_error = true)', 'errors'),
	],
	[
		{
			'service.name': 'cart',
			'A.count()': 12000,
			'A.p99(duration_nano)': 340,
			'A.countIf(has_error = true)': 15,
		},
		{
			'service.name': 'payment',
			'A.count()': 8500,
			'A.p99(duration_nano)': 900,
			'A.countIf(has_error = true)': 420,
		},
	],
);

describe('prepareScatterPlotData', () => {
	it('plots the first two value columns when no dimensions are set', () => {
		const result = prepareScatterPlotData({
			table: tracesTable,
			dimensions: undefined,
			columnUnits: {},
		});

		expect(result.status).toBe(ScatterPlotDataStatus.Ready);
		if (result.status !== ScatterPlotDataStatus.Ready) {
			return;
		}
		expect(result.channels.x.label).toBe('A.count()');
		expect(result.channels.y.label).toBe('A.p99(duration_nano)');
		expect(result.channels.size).toBeUndefined();
		expect(result.series).toStrictEqual([
			{ label: 'cart', xs: [12000], ys: [340] },
			{ label: 'payment', xs: [8500], ys: [900] },
		]);
		expect(result.pointLabels).toStrictEqual([
			[[{ key: 'service.name', value: 'cart' }]],
			[[{ key: 'service.name', value: 'payment' }]],
		]);
	});

	it('binds x, y and size to the configured columns, with their units', () => {
		const result = prepareScatterPlotData({
			table: tracesTable,
			dimensions: {
				x: 'A.p99(duration_nano)',
				y: 'A.count()',
				size: 'A.countIf(has_error = true)',
			},
			columnUnits: { 'A.p99(duration_nano)': 'ns' },
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.channels).toStrictEqual({
			x: { label: 'A.p99(duration_nano)', unit: 'ns' },
			y: { label: 'A.count()', unit: undefined },
			size: { label: 'A.errors', unit: undefined },
		});
		expect(result.series[1]).toStrictEqual({
			label: 'payment',
			xs: [900],
			ys: [8500],
			sizes: [420],
		});
	});

	it('falls back to the defaults when a dimension names a column that is gone', () => {
		const result = prepareScatterPlotData({
			table: tracesTable,
			dimensions: { x: 'B', y: 'A.avg(duration_nano)', size: 'C' },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.channels.x.label).toBe('A.count()');
		expect(result.channels.y.label).toBe('A.p99(duration_nano)');
		expect(result.channels.size).toBeUndefined();
	});

	it('labels each value column with its query, so shared names read apart', () => {
		const result = prepareScatterPlotData({
			table: makeTable(
				[
					group('service.name'),
					value('A.count()', 'count()'),
					value('A.p99(duration_nano)', 'p99(duration_nano)'),
					value('B', 'count()'),
				],
				[
					{
						'service.name': 'cart',
						'A.count()': 1,
						'A.p99(duration_nano)': 2,
						B: 3,
					},
				],
			),
			dimensions: { size: 'B' },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.channels.x.label).toBe('A.count()');
		expect(result.channels.y.label).toBe('A.p99(duration_nano)');
		expect(result.channels.size?.label).toBe('B.count()');
	});

	it('names an axis channel by its axis label when one is set', () => {
		const result = prepareScatterPlotData({
			table: tracesTable,
			dimensions: undefined,
			axes: { x: { label: 'Throughput' }, y: { label: '' } },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.channels.x.label).toBe('Throughput');
		expect(result.channels.y.label).toBe('A.p99(duration_nano)');
	});

	it('picks a y column other than the bound x', () => {
		const result = prepareScatterPlotData({
			table: tracesTable,
			dimensions: { x: 'A.count()' },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.channels.y.label).toBe('A.p99(duration_nano)');
	});

	it('colours by the configured group label and keeps every label for the tooltip', () => {
		const table = makeTable(
			[group('k8s.namespace.name'), group('k8s.pod.name'), value('A'), value('B')],
			[
				{ 'k8s.namespace.name': 'prod', 'k8s.pod.name': 'p1', A: 1, B: 2 },
				{ 'k8s.namespace.name': 'dev', 'k8s.pod.name': 'p2', A: 3, B: 4 },
				{ 'k8s.namespace.name': 'prod', 'k8s.pod.name': 'p3', A: 5, B: 6 },
			],
		);

		const result = prepareScatterPlotData({
			table,
			dimensions: { color: ['k8s.namespace.name'] },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.series.map((series) => series.label)).toStrictEqual([
			'prod',
			'dev',
		]);
		expect(result.series[0]).toMatchObject({ xs: [1, 5], ys: [2, 6] });
		expect(result.pointLabels[0][1]).toStrictEqual([
			{ key: 'k8s.namespace.name', value: 'prod' },
			{ key: 'k8s.pod.name', value: 'p3' },
		]);
	});

	describe('colour keys', () => {
		const table = makeTable(
			[group('k8s.namespace.name'), group('k8s.pod.name'), value('A'), value('B')],
			[
				{ 'k8s.namespace.name': 'prod', 'k8s.pod.name': 'p1', A: 1, B: 2 },
				{ 'k8s.namespace.name': 'prod', 'k8s.pod.name': 'p2', A: 3, B: 4 },
			],
		);
		const seriesLabels = (color: string[] | null | undefined): string[] => {
			const result = prepareScatterPlotData({
				table,
				dimensions: { color },
				columnUnits: {},
			});
			return result.status === ScatterPlotDataStatus.Ready
				? result.series.map((series) => series.label)
				: [];
		};

		it.each([
			['none selected', []],
			['an unset field', undefined],
			['null from the wire', null],
		])('colours by every group key with %s', (_, color) => {
			expect(seriesLabels(color)).toStrictEqual(['prod, p1', 'prod, p2']);
		});

		it('colours by the combination of the selected keys, in result order', () => {
			expect(seriesLabels(['k8s.pod.name', 'k8s.namespace.name'])).toStrictEqual([
				'prod, p1',
				'prod, p2',
			]);
		});

		it('colours by one key alone', () => {
			expect(seriesLabels(['k8s.namespace.name'])).toStrictEqual(['prod']);
		});

		it('ignores keys the result does not have', () => {
			expect(seriesLabels(['host.name', 'k8s.pod.name'])).toStrictEqual([
				'p1',
				'p2',
			]);
			expect(seriesLabels(['host.name'])).toStrictEqual(['prod, p1', 'prod, p2']);
		});
	});

	it('draws everything as one series when there is no group by', () => {
		const result = prepareScatterPlotData({
			table: makeTable([value('A'), value('B')], [{ A: 1, B: 2 }]),
			dimensions: undefined,
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.series).toStrictEqual([
			{ label: UNGROUPED_SERIES_LABEL, xs: [1], ys: [2] },
		]);
	});

	it.each([
		['a join miss', 'n/a'],
		['NaN', 'NaN'],
		['Inf', 'Inf'],
		['-Inf', '-Inf'],
		['an empty cell', undefined],
	])('drops a row whose y is %s and counts it', (_, cell) => {
		const table = makeTable(
			[group('service.name'), value('A'), value('B')],
			[
				{ 'service.name': 'cart', A: 120, B: 340 },
				{ 'service.name': 'checkout', A: 45, B: cell },
			],
		);

		const result = prepareScatterPlotData({
			table,
			dimensions: undefined,
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.series.map((series) => series.label)).toStrictEqual(['cart']);
		expect(result.totalGroups).toBe(2);
		expect(result.drawnGroups).toBe(1);
	});

	describe('log axes', () => {
		const table = makeTable(
			[group('service.name'), value('A'), value('B')],
			[
				{ 'service.name': 'cart', A: 120, B: 340 },
				{ 'service.name': 'idle', A: 0, B: 12 },
				{ 'service.name': 'refund', A: 4, B: -1 },
			],
		);

		it('drops values ≤ 0 on a log axis and counts them apart from missing values', () => {
			const result = prepareScatterPlotData({
				table,
				dimensions: undefined,
				axes: {
					x: { scale: DashboardtypesAxisScaleDTO.log },
					y: { scale: DashboardtypesAxisScaleDTO.log },
				},
				columnUnits: {},
			});

			if (result.status !== ScatterPlotDataStatus.Ready) {
				throw new Error('expected ready data');
			}
			expect(result.series.map((series) => series.label)).toStrictEqual(['cart']);
			expect(result.nonPositiveOnLogGroups).toBe(2);
			expect(result.missingValueGroups).toBe(0);
		});

		it.each([
			DashboardtypesAxisScaleDTO.symlog,
			DashboardtypesAxisScaleDTO.auto,
			DashboardtypesAxisScaleDTO.linear,
		])('keeps values ≤ 0 on a %s axis', (scale) => {
			const result = prepareScatterPlotData({
				table,
				dimensions: undefined,
				axes: { x: { scale }, y: { scale } },
				columnUnits: {},
			});

			if (result.status !== ScatterPlotDataStatus.Ready) {
				throw new Error('expected ready data');
			}
			expect(result.drawnGroups).toBe(3);
			expect(result.nonPositiveOnLogGroups).toBe(0);
		});
	});

	it('draws a row with a missing size at the default size', () => {
		const table = makeTable(
			[group('service.name'), value('A'), value('B'), value('C')],
			[
				{ 'service.name': 'search', A: 300, B: 120, C: 'n/a' },
				{ 'service.name': 'cart', A: 120, B: 340, C: '0.2' },
			],
		);

		const result = prepareScatterPlotData({
			table,
			dimensions: { size: 'C' },
			columnUnits: {},
		});

		if (result.status !== ScatterPlotDataStatus.Ready) {
			throw new Error('expected ready data');
		}
		expect(result.series.map((series) => series.sizes)).toStrictEqual([
			[null],
			[0.2],
		]);
		expect(result.drawnGroups).toBe(2);
	});

	it('asks for a second value when the query has one aggregation', () => {
		const result = prepareScatterPlotData({
			table: makeTable(
				[group('service.name'), value('A')],
				[{ 'service.name': 'cart', A: 1 }],
			),
			dimensions: undefined,
			columnUnits: {},
		});

		expect(result).toStrictEqual({
			status: ScatterPlotDataStatus.NeedsSecondValue,
			totalGroups: 1,
		});
	});

	it('asks for a second value when there is no table yet', () => {
		expect(
			prepareScatterPlotData({
				table: undefined,
				dimensions: undefined,
				columnUnits: {},
			}).status,
		).toBe(ScatterPlotDataStatus.NeedsSecondValue);
	});
});
