import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import type {
	PanelSeries,
	PanelTable,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownContext } from '../../../types/drilldown';
import { buildAggregateData } from '../buildAggregateData';
import { stepClickTimeRange } from '../chartClickTimeRange';
import { enrichChartClick } from '../enrichChartClick';
import { enrichNumberClick } from '../enrichNumberClick';
import { enrichPieClick } from '../enrichPieClick';
import { enrichTableClick } from '../enrichTableClick';
import { getDataLinks } from '../getDataLinks';
import { resolvePanelContextLinks } from '../resolvePanelContextLinks';
import { resolveDrilldownSignal } from '../signal';

// The v5 BuilderQuery union is too verbose to construct field-typed inline; cast at the boundary.
function builderQuery(spec: Record<string, unknown>): BuilderQuery {
	return spec as unknown as BuilderQuery;
}

function panelSeries(overrides: Partial<PanelSeries> = {}): PanelSeries {
	return {
		queryName: 'A',
		legend: '',
		labels: { 'service.name': 'frontend' },
		kind: 'series',
		values: [],
		aggregation: { index: 0, alias: '' },
		...overrides,
	};
}

function chartClick(
	focusedSeries: ChartClickData['focusedSeries'],
): ChartClickData {
	return {
		xValue: 0,
		yValue: 0,
		focusedSeries,
		clickedDataTimestamp: 1_700_000_000,
		mouseX: 10,
		mouseY: 20,
		absoluteMouseX: 110,
		absoluteMouseY: 220,
	};
}

function focused(seriesIndex: number): ChartClickData['focusedSeries'] {
	return { seriesIndex, seriesName: 'frontend', value: 1, color: '#fff' };
}

describe('resolveDrilldownSignal', () => {
	it('maps logs/traces directly', () => {
		expect(resolveDrilldownSignal(builderQuery({ signal: 'logs' }))).toBe('logs');
		expect(resolveDrilldownSignal(builderQuery({ signal: 'traces' }))).toBe(
			'traces',
		);
	});

	it('falls back to metrics for metrics, meter and unknown/missing signals', () => {
		expect(resolveDrilldownSignal(builderQuery({ signal: 'metrics' }))).toBe(
			'metrics',
		);
		expect(resolveDrilldownSignal(builderQuery({ signal: 'meter' }))).toBe(
			'metrics',
		);
		expect(resolveDrilldownSignal(undefined)).toBe('metrics');
	});
});

describe('enrichChartClick', () => {
	const series = [
		panelSeries({ queryName: 'A', labels: { 'service.name': 'frontend' } }),
		panelSeries({ queryName: 'B', labels: { 'service.name': 'cart' } }),
	];

	it('maps the uPlot series index to the (index - 1) flattened series', () => {
		// uPlot series[0] is the x-axis, so data series start at 1.
		const payload = enrichChartClick({
			clickData: chartClick(focused(2)),
			series,
			builderQueries: [
				builderQuery({
					name: 'A',
					signal: 'metrics',
					groupBy: [{ name: 'service.name' }],
				}),
				builderQuery({
					name: 'B',
					signal: 'logs',
					groupBy: [{ name: 'service.name' }],
				}),
			],
		});

		expect(payload?.context.queryName).toBe('B');
		expect(payload?.context.signal).toBe('logs');
		expect(payload?.context.filters).toStrictEqual([
			expect.objectContaining({ filterKey: 'service.name', filterValue: 'cart' }),
		]);
		expect(payload?.context.seriesColor).toBe('#fff');
		expect(payload?.coordinates).toStrictEqual({ x: 110, y: 220 });
	});

	it('passes through the caller-computed time range and resolves the signal', () => {
		const payload = enrichChartClick({
			clickData: chartClick(focused(1)),
			series,
			builderQueries: [builderQuery({ name: 'A', signal: 'traces' })],
			timeRange: { startTime: 100, endTime: 200 },
		});

		expect(payload?.context.signal).toBe('traces');
		expect(payload?.context.timeRange).toStrictEqual({
			startTime: 100,
			endTime: 200,
		});
	});

	it('returns null when there is no focused series', () => {
		expect(
			enrichChartClick({
				clickData: chartClick(null),
				series,
				builderQueries: [],
			}),
		).toBeNull();
	});

	it('returns null when the series index maps to no series', () => {
		expect(
			enrichChartClick({
				clickData: chartClick(focused(99)),
				series,
				builderQueries: [],
			}),
		).toBeNull();
	});

	it('returns null for formula queries (queryName starts with F)', () => {
		expect(
			enrichChartClick({
				clickData: chartClick(focused(1)),
				series: [panelSeries({ queryName: 'F1' })],
				builderQueries: [],
			}),
		).toBeNull();
	});

	it('emits empty filters for an ungrouped series (drops the legend backfill label)', () => {
		const payload = enrichChartClick({
			clickData: chartClick(focused(1)),
			series: [panelSeries({ queryName: 'A', labels: { A: 'A' } })],
			builderQueries: [builderQuery({ name: 'A', signal: 'metrics' })],
		});

		expect(payload?.context.filters).toStrictEqual([]);
		expect(payload?.context.queryName).toBe('A');
	});

	it('drops labels that are not group-by dimensions', () => {
		const payload = enrichChartClick({
			clickData: chartClick(focused(1)),
			series: [
				panelSeries({
					queryName: 'A',
					labels: { 'service.name': 'frontend', __name__: 'http_requests' },
				}),
			],
			builderQueries: [
				builderQuery({
					name: 'A',
					signal: 'metrics',
					groupBy: [{ name: 'service.name' }],
				}),
			],
		});

		expect(payload?.context.filters).toStrictEqual([
			{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
		]);
	});
});

describe('buildAggregateData', () => {
	it('projects the drilldown context onto the V1 AggregateData shape', () => {
		const context: DrilldownContext = {
			queryName: 'A',
			signal: TelemetrytypesSignalDTO.logs,
			filters: [{ filterKey: 'k', filterValue: 'v', operator: '=' }],
			timeRange: { startTime: 1, endTime: 2 },
			label: 'frontend',
			seriesColor: '#abc',
			columnKind: 'aggregate',
		};

		expect(buildAggregateData(context)).toStrictEqual({
			queryName: 'A',
			filters: [{ filterKey: 'k', filterValue: 'v', operator: '=' }],
			timeRange: { startTime: 1, endTime: 2 },
			label: 'frontend',
			seriesColor: '#abc',
		});
	});
});

describe('enrichNumberClick', () => {
	const numberTable = (queryName: string): PanelTable => ({
		queryName,
		legend: '',
		columns: [{ name: 'value', queryName, isValueColumn: true, id: queryName }],
		rows: [{ data: { [queryName]: 42 } }],
	});

	it('drills down on the displayed value column with empty filters and no label', () => {
		const payload = enrichNumberClick({
			tables: [numberTable('A')],
			builderQueries: [builderQuery({ name: 'A', signal: 'logs' })],
			coordinates: { x: 5, y: 6 },
			timeRange: { startTime: 1, endTime: 2 },
		});

		// No label: the menu header falls back to the aggregation expression (V1 parity).
		expect(payload?.context).toStrictEqual({
			queryName: 'A',
			signal: 'logs',
			filters: [],
			timeRange: { startTime: 1, endTime: 2 },
		});
		expect(payload?.coordinates).toStrictEqual({ x: 5, y: 6 });
	});

	it('drills into the displayed value column, not the first builder query', () => {
		// Panel shows query B's value column; drilldown must target B, not A.
		const payload = enrichNumberClick({
			tables: [numberTable('B')],
			builderQueries: [
				builderQuery({ name: 'A', signal: 'logs' }),
				builderQuery({ name: 'B', signal: 'traces' }),
			],
			coordinates: { x: 0, y: 0 },
		});

		expect(payload?.context.queryName).toBe('B');
		expect(payload?.context.signal).toBe('traces');
	});

	it('returns null when there is no drillable query', () => {
		expect(
			enrichNumberClick({
				tables: [],
				builderQueries: [],
				coordinates: { x: 0, y: 0 },
			}),
		).toBeNull();
	});

	it('returns null for a formula query', () => {
		expect(
			enrichNumberClick({
				tables: [numberTable('F1')],
				builderQueries: [],
				coordinates: { x: 0, y: 0 },
			}),
		).toBeNull();
	});
});

describe('enrichTableClick', () => {
	const table: PanelTable = {
		queryName: 'A',
		legend: '',
		columns: [
			{
				name: 'service.name',
				queryName: 'A',
				isValueColumn: false,
				id: 'service.name',
			},
			{ name: 'p99', queryName: 'A', isValueColumn: true, id: 'A' },
		],
		rows: [{ data: { 'service.name': 'frontend', A: 42 } }],
	};
	const record = { 'service.name': 'frontend', A: 42 };
	const builderQueries = [builderQuery({ name: 'A', signal: 'traces' })];

	it('builds equality filters from the row group cells for a value-column click', () => {
		const payload = enrichTableClick({
			record,
			columnId: 'A',
			table,
			builderQueries,
			coordinates: { x: 1, y: 2 },
			timeRange: { startTime: 10, endTime: 20 },
		});

		expect(payload?.context.queryName).toBe('A');
		expect(payload?.context.signal).toBe('traces');
		expect(payload?.context.columnKind).toBe('aggregate');
		expect(payload?.context.clickedKey).toBeUndefined();
		// No label: the aggregate menu header falls back to the aggregation expression,
		// not the value column name (V1 parity).
		expect(payload?.context.label).toBeUndefined();
		expect(payload?.context.filters).toStrictEqual([
			{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
		]);
	});

	it('falls back to the row value column and carries the clicked cell for a group click', () => {
		const payload = enrichTableClick({
			record,
			columnId: 'service.name',
			table,
			builderQueries,
			coordinates: { x: 1, y: 2 },
		});

		expect(payload?.context.queryName).toBe('A');
		expect(payload?.context.columnKind).toBe('group');
		expect(payload?.context.clickedKey).toBe('service.name');
		expect(payload?.context.clickedValue).toBe('frontend');
	});

	it('returns null when the table has no value column', () => {
		const groupOnly: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [
				{
					name: 'service.name',
					queryName: 'A',
					isValueColumn: false,
					id: 'service.name',
				},
			],
			rows: [{ data: { 'service.name': 'frontend' } }],
		};
		expect(
			enrichTableClick({
				record,
				columnId: 'service.name',
				table: groupOnly,
				builderQueries,
				coordinates: { x: 1, y: 2 },
			}),
		).toBeNull();
	});
});

describe('enrichPieClick', () => {
	it('builds filters from the slice labels and resolves the signal', () => {
		const payload = enrichPieClick({
			slice: {
				label: 'frontend',
				value: 12,
				color: '#abc',
				queryName: 'A',
				labels: { 'service.name': 'frontend' },
			},
			builderQueries: [
				builderQuery({
					name: 'A',
					signal: 'traces',
					groupBy: [{ name: 'service.name' }],
				}),
			],
			coordinates: { x: 7, y: 8 },
			timeRange: { startTime: 1, endTime: 2 },
		});

		expect(payload?.context.queryName).toBe('A');
		expect(payload?.context.signal).toBe('traces');
		expect(payload?.context.filters).toStrictEqual([
			{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
		]);
	});

	it('returns null for a slice with no source query', () => {
		expect(
			enrichPieClick({
				slice: { label: 'x', value: 1, color: '#000' },
				builderQueries: [],
				coordinates: { x: 0, y: 0 },
			}),
		).toBeNull();
	});
});

describe('resolvePanelContextLinks', () => {
	it('substitutes the clicked field value (_-prefixed) into the label and URL', () => {
		const resolved = resolvePanelContextLinks(
			[
				{
					name: 'Runbook for {{_service.name}}',
					url: 'https://wiki/{{_service.name}}',
				},
			],
			{ '_service.name': 'frontend' },
		);

		expect(resolved).toHaveLength(1);
		expect(resolved[0].label).toBe('Runbook for frontend');
		expect(resolved[0].url).toBe('https://wiki/frontend');
	});

	it('drops links without a URL', () => {
		expect(resolvePanelContextLinks([{ name: 'No URL' }], {})).toStrictEqual([]);
		expect(resolvePanelContextLinks(undefined, {})).toStrictEqual([]);
	});

	it('keeps the raw URL when renderVariables is false', () => {
		const resolved = resolvePanelContextLinks(
			[
				{
					name: 'Literal',
					url: 'https://wiki/{{_service.name}}',
					renderVariables: false,
				},
			],
			{ '_service.name': 'frontend' },
		);

		expect(resolved[0].url).toBe('https://wiki/{{_service.name}}');
	});
});

describe('stepClickTimeRange', () => {
	it('returns [clickedTs, clickedTs + step] for a non-APM query', () => {
		expect(
			stepClickTimeRange({
				clickedDataTimestamp: 1000,
				queryName: 'A',
				builderQueries: [builderQuery({ name: 'A', signal: 'logs' })],
				stepInterval: 30,
			}),
		).toStrictEqual({ startTime: 1000, endTime: 1030 });
	});

	it('falls back to a 60s step when no interval is provided', () => {
		expect(
			stepClickTimeRange({
				clickedDataTimestamp: 1000,
				queryName: 'A',
				builderQueries: [
					builderQuery({
						name: 'A',
						signal: 'metrics',
						aggregations: [{ metricName: 'custom_metric' }],
					}),
				],
			}),
		).toStrictEqual({ startTime: 1000, endTime: 1060 });
	});
});

describe('getDataLinks', () => {
	it('adds a "View Trace Details" link when the filters carry a trace_id', () => {
		expect(
			getDataLinks([
				{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
				{ filterKey: 'trace_id', filterValue: 'abc123', operator: '=' },
			]),
		).toStrictEqual([
			{
				id: 'view-trace-details',
				label: 'View Trace Details',
				url: '/trace/abc123',
			},
		]);
	});

	it('returns no links when there is no trace_id', () => {
		expect(
			getDataLinks([
				{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
			]),
		).toStrictEqual([]);
	});
});
