/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesComparisonOperatorDTO as ComparisonOperator,
	DashboardtypesHeatmapPaletteDTO as HeatmapPalette,
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind as GridKind,
	DashboardtypesLegendPositionDTO as LegendPosition,
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesPanelKindDTO as PanelKindDTO,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind as AreaChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind as BarChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind as HeatmapKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind as HistogramKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind as ListKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind as NumberKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind as PieChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind as TableKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind as TextKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryKind,
	DashboardtypesSourceDTO,
	DashboardtypesStackModeDTO as StackMode,
	DashboardtypesTextAlignDTO as TextAlign,
	DashboardtypesTextModeDTO as TextMode,
	DashboardtypesThresholdFormatDTO as ThresholdFormat,
	MetrictypesSpaceAggregationDTO as SpaceAggregation,
	MetrictypesTimeAggregationDTO as TimeAggregation,
	Querybuildertypesv5BucketOptionsLinearDTOKind as LinearBuckets,
	Querybuildertypesv5OrderDirectionDTO as OrderDirection,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogSignal,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	Querybuildertypesv5RequestTypeDTO as RequestType,
	type DashboardtypesComparisonThresholdDTO,
	type DashboardtypesGettableDashboardV2DTO,
	type DashboardtypesJSONPatchOperationDTO,
	type DashboardtypesPanelPluginDTO,
	type DashboardtypesQueryDTO,
	type DashboardtypesTableThresholdDTO,
	type DashboardtypesThresholdWithLabelDTO,
	type GetDashboardV2200,
	type QueryRangeV5200,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO as LogBuilderQuery,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO as MetricBuilderQuery,
} from 'api/generated/services/sigNoz.schemas';
import type { Warning } from 'types/api';
import type { MetricRangePayloadV5, RawRow } from 'types/api/v5/queryRange';

import {
	queryRangeV5EmptyResponse,
	queryRangeV5HeatmapResponse,
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import { applyJsonPatch } from '../../../DashboardContainer/optimistic/applyJsonPatch';

export const PANELS_DASHBOARD_ID = 'storybook-panels-1';

export const STORY_PANEL_ID = 'story-panel';

export const PANEL_KINDS = [
	'TimeSeries',
	'Bar',
	'Area',
	'Histogram',
	'Heatmap',
	'Pie',
	'Number',
	'Table',
	'List',
	'Text',
] as const;

export type PanelKind = (typeof PANEL_KINDS)[number];

export const PANEL_RESULTS = ['data', 'empty', 'warning'] as const;

export type PanelResult = (typeof PANEL_RESULTS)[number];

export const LEGEND_POSITIONS = [
	LegendPosition.bottom,
	LegendPosition.right,
] as const;

export const UNITS = ['none', 'ms', 'bytes'] as const;

export type PanelUnit = (typeof UNITS)[number];

export const STACK_MODES = [
	StackMode.none,
	StackMode.normal,
	StackMode.percent,
] as const;

export const HEATMAP_PALETTES = Object.values(HeatmapPalette);

export const HEATMAP_Y_SCALES = Object.values(HeatmapYScale);

export const TEXT_SAMPLES = ['runbook', 'note', 'blank'] as const;

export type TextSample = (typeof TEXT_SAMPLES)[number];

export const TEXT_ALIGNS = Object.values(TextAlign);

export const Y_SCALES = ['linear', 'log'] as const;

export type YScale = (typeof Y_SCALES)[number];

export const LINE_STYLES = Object.values(LineStyle);

export const GAPS = ['none', 'hole'] as const;

export type Gaps = (typeof GAPS)[number];

export const SPAN_GAPS = ['bridge', 'break-10m'] as const;

export type SpanGaps = (typeof SPAN_GAPS)[number];

/** Points cut out of every series by `hole`: 12 of the 30, a gap past the 10m break. */
export const HOLE = { from: 10, to: 22 };

export interface PanelArgs {
	kind: PanelKind;
	legend: LegendPosition;
	thresholds: boolean;
	unit: PanelUnit;
	stack: StackMode;
	palette: HeatmapPalette;
	heatmapScale: HeatmapYScale;
	textSample: TextSample;
	textAlign: TextAlign;
	hideHeader: boolean;
	yScale: YScale;
	lineStyle: LineStyle;
	showPoints: boolean;
	spanGaps: SpanGaps;
	columnUnits: boolean;
}

export const PANEL_NAME: Record<PanelKind, string> = {
	TimeSeries: 'p99 latency by service',
	Bar: 'Errors by service',
	Area: 'Request rate by service',
	Histogram: 'Latency distribution',
	Heatmap: 'Latency heatmap',
	Pie: 'Traffic share',
	Number: 'p99 latency',
	Table: 'Calls by service',
	List: 'Recent logs',
	Text: 'Runbook',
};

/** A colour no series palette draws in, so a canvas probe for it finds only the line. */
export const THRESHOLD_COLOR = '#00e5ff';

/** Inside every chart kind's y range: the series below oscillate around it. */
export const CHART_THRESHOLD_VALUE = 200;

/** Below `NUMBER_VALUE`, so the comparison holds. */
export const NUMBER_THRESHOLD_VALUE = 500;

export const NUMBER_VALUE = 812.6;

/** Splits the table rows: `TABLE_VALUES` above it are filled, the rest are not. */
export const TABLE_THRESHOLD_VALUE = 2500;

const QUERY_NAME = 'A';

/** The aggregation column's key, which table thresholds and units address. */
export const TABLE_VALUE_COLUMN = QUERY_NAME;

const SERVICES = [
	'checkout',
	'payments',
	'inventory',
	'notifications',
	'search',
	'shipping',
	'recommendations',
	'auth',
] as const;

export const MAX_SERIES = SERVICES.length;

const serviceAt = (index: number): string =>
	index < SERVICES.length
		? SERVICES[index]
		: `${SERVICES[index % SERVICES.length]}-${Math.floor(index / SERVICES.length) + 1}`;

export const TABLE_VALUES = (count: number): number[] =>
	Array.from({ length: count }, (_unused, index) => 3800 - index * 480);

/** Linear, so `auto` lays the rows out linearly and `log` visibly changes it. */
export const HEATMAP_BUCKETS = [
	100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

const unitOf = (unit: PanelUnit): string | undefined =>
	unit === 'none' ? undefined : unit;

const labelThresholds = (on: boolean): DashboardtypesThresholdWithLabelDTO[] =>
	on
		? [{ value: CHART_THRESHOLD_VALUE, color: THRESHOLD_COLOR, label: 'SLO' }]
		: [];

const comparisonThresholds = (
	on: boolean,
): DashboardtypesComparisonThresholdDTO[] =>
	on
		? [
				{
					value: NUMBER_THRESHOLD_VALUE,
					operator: ComparisonOperator.above,
					color: THRESHOLD_COLOR,
					format: ThresholdFormat.background,
				},
			]
		: [];

const tableThresholds = (on: boolean): DashboardtypesTableThresholdDTO[] =>
	on
		? [
				{
					columnName: TABLE_VALUE_COLUMN,
					value: TABLE_THRESHOLD_VALUE,
					operator: ComparisonOperator.above,
					color: THRESHOLD_COLOR,
					format: ThresholdFormat.background,
				},
			]
		: [];

const TEXT_BODIES: Record<TextSample, string> = {
	runbook: [
		'# Checkout runbook',
		'',
		'When **p99 latency** crosses the SLO:',
		'',
		'- Check the [payments dashboard](https://signoz.io/docs/)',
		'- Scale the `checkout` deployment',
		'- Page the on-call',
		'',
		'```sh',
		'kubectl scale deploy/checkout --replicas=6',
		'```',
	].join('\n'),
	note: 'Latency panels read from the **checkout** service only.',
	blank: '',
};

const metricQuery = (
	requestType: RequestType,
	{ grouped, heatmap }: { grouped: boolean; heatmap?: boolean },
): DashboardtypesQueryDTO[] => {
	const spec: MetricBuilderQuery = {
		name: QUERY_NAME,
		signal: MetricSignal.metrics,
		aggregations: [
			{
				metricName: heatmap ? 'signoz_latency_bucket' : 'signoz_latency',
				spaceAggregation: heatmap ? undefined : SpaceAggregation.p99,
				timeAggregation: heatmap ? TimeAggregation.increase : TimeAggregation.avg,
			},
		],
		groupBy: grouped ? [{ name: 'service.name' }] : undefined,
		legend:
			grouped && requestType !== RequestType.scalar
				? '{{service.name}}'
				: undefined,
		bucketOptions: heatmap
			? { kind: LinearBuckets.linear, spec: { maxValue: 1000, numBuckets: 10 } }
			: undefined,
	};

	return [
		{
			kind: requestType,
			spec: {
				name: QUERY_NAME,
				plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
			},
		},
	];
};

const logQuery = (): DashboardtypesQueryDTO[] => {
	const spec: LogBuilderQuery = {
		name: QUERY_NAME,
		signal: LogSignal.logs,
		order: [{ key: { name: 'timestamp' }, direction: OrderDirection.desc }],
	};

	return [
		{
			kind: RequestType.raw,
			spec: {
				name: QUERY_NAME,
				plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
			},
		},
	];
};

interface PanelShape {
	plugin: DashboardtypesPanelPluginDTO;
	queries: DashboardtypesQueryDTO[];
}

const panelShape = (args: PanelArgs): PanelShape => {
	const formatting = { unit: unitOf(args.unit) };
	const legend = { position: args.legend };
	const axes = { isLogScale: args.yScale === 'log' };
	const chartAppearance = {
		lineStyle: args.lineStyle,
		showPoints: args.showPoints,
		spanGaps:
			args.spanGaps === 'break-10m'
				? { fillOnlyBelow: true, fillLessThan: '10m' }
				: { fillOnlyBelow: false },
	};

	switch (args.kind) {
		case 'Bar':
			return {
				plugin: {
					kind: BarChartKind['signoz/BarChartPanel'],
					spec: {
						axes,
						formatting,
						legend,
						thresholds: labelThresholds(args.thresholds),
						visualization: { stackedBarChart: args.stack !== StackMode.none },
					},
				},
				queries: metricQuery(RequestType.time_series, { grouped: true }),
			};
		case 'Area':
			return {
				plugin: {
					kind: AreaChartKind['signoz/AreaChartPanel'],
					spec: {
						axes,
						chartAppearance,
						formatting,
						legend,
						thresholds: labelThresholds(args.thresholds),
						visualization: { stack: args.stack },
					},
				},
				queries: metricQuery(RequestType.time_series, { grouped: true }),
			};
		case 'Histogram':
			return {
				plugin: { kind: HistogramKind['signoz/HistogramPanel'], spec: { legend } },
				queries: metricQuery(RequestType.time_series, { grouped: true }),
			};
		case 'Heatmap':
			return {
				plugin: {
					kind: HeatmapKind['signoz/HeatmapPanel'],
					spec: {
						formatting,
						legend,
						axes: { y: { scale: args.heatmapScale } },
						chartAppearance: { colors: { palette: args.palette } },
					},
				},
				queries: metricQuery(RequestType.heatmap, { grouped: true, heatmap: true }),
			};
		case 'Pie':
			return {
				plugin: {
					kind: PieChartKind['signoz/PieChartPanel'],
					spec: { formatting, legend },
				},
				queries: metricQuery(RequestType.scalar, { grouped: true }),
			};
		case 'Number':
			return {
				plugin: {
					kind: NumberKind['signoz/NumberPanel'],
					spec: {
						formatting,
						thresholds: comparisonThresholds(args.thresholds),
					},
				},
				queries: metricQuery(RequestType.scalar, { grouped: false }),
			};
		case 'Table':
			return {
				plugin: {
					kind: TableKind['signoz/TablePanel'],
					spec: {
						formatting: {
							columnUnits:
								args.columnUnits && formatting.unit
									? { [TABLE_VALUE_COLUMN]: formatting.unit }
									: {},
						},
						thresholds: tableThresholds(args.thresholds),
					},
				},
				queries: metricQuery(RequestType.scalar, { grouped: true }),
			};
		case 'List':
			return {
				plugin: {
					kind: ListKind['signoz/ListPanel'],
					spec: {
						selectFields: [{ name: 'timestamp' }, { name: 'body' }],
					},
				},
				queries: logQuery(),
			};
		case 'Text':
			return {
				plugin: {
					kind: TextKind['signoz/TextPanel'],
					spec: {
						mode: TextMode.markdown,
						text: TEXT_BODIES[args.textSample],
						presentation: { textAlign: args.textAlign },
						headerOptions: args.hideHeader ? { hide: true } : {},
					},
				},
				queries: [],
			};
		case 'TimeSeries':
		default:
			return {
				plugin: {
					kind: TimeSeriesKind['signoz/TimeSeriesPanel'],
					spec: {
						axes,
						chartAppearance,
						formatting,
						legend,
						thresholds: labelThresholds(args.thresholds),
					},
				},
				queries: metricQuery(RequestType.time_series, { grouped: true }),
			};
	}
};

export const panelsDashboardResponse = (args: PanelArgs): GetDashboardV2200 => {
	const { plugin, queries } = panelShape(args);

	return {
		status: 'success',
		data: {
			id: PANELS_DASHBOARD_ID,
			orgId: 'storybook-org',
			name: 'Panel gallery',
			image: '/assets/Icons/circus-tent',
			schemaVersion: 'v6',
			source: DashboardtypesSourceDTO.user,
			locked: false,
			createdBy: 'ada@signoz.io',
			updatedBy: 'ada@signoz.io',
			createdAt: '2026-05-04T09:12:00Z',
			updatedAt: '2026-08-21T16:40:00Z',
			tags: [],
			spec: {
				display: { name: 'Panel gallery' },
				layouts: [
					{
						kind: GridKind.Grid,
						spec: {
							items: [
								{
									x: 0,
									y: 0,
									width: 12,
									height: 8,
									content: { $ref: `#/spec/panels/${STORY_PANEL_ID}` },
								},
							],
						},
					},
				],
				panels: {
					[STORY_PANEL_ID]: {
						kind: PanelKindDTO.Panel,
						spec: { display: { name: PANEL_NAME[args.kind] }, plugin, queries },
					},
				},
				variables: [],
			},
		},
	};
};

/**
 * Spec edits travel as a JSON Patch whose response replaces the cache, so the
 * document is kept where the handler can apply the ops. Reseeded on every
 * control change, which is also when the story remounts.
 */
let document: DashboardtypesGettableDashboardV2DTO | undefined;

export const seedPanelsDocument = (args: PanelArgs): void => {
	document = panelsDashboardResponse(args).data;
};

const envelope = (
	data: DashboardtypesGettableDashboardV2DTO,
): GetDashboardV2200 => ({ status: 'success', data });

export const currentPanelsDocument = (args: PanelArgs): GetDashboardV2200 =>
	envelope(document ?? panelsDashboardResponse(args).data);

export const patchPanelsDocument = (
	args: PanelArgs,
	ops: DashboardtypesJSONPatchOperationDTO[],
): GetDashboardV2200 => {
	document = applyJsonPatch(document ?? panelsDashboardResponse(args).data, ops);

	return envelope(document);
};

export interface PanelWindow {
	start: number;
	end: number;
}

export const PANEL_WARNING: Warning = {
	code: 'partial_data',
	message:
		'Some series were dropped: the metric changed temporality partway through the selected window.',
	url: 'https://signoz.io/docs/metrics-management/types-and-aggregation/',
	warnings: [{ message: 'Narrow the window to a period with one temporality.' }],
};

const latencySeries = (
	{ start, end }: PanelWindow,
	count: number,
	gaps: Gaps,
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse([
		{
			queryName: QUERY_NAME,
			series: Array.from({ length: count }, (_unused, index) => ({
				labels: [{ key: { name: 'service.name' }, value: serviceAt(index) }],
				values: timeSeriesPoints({
					start,
					end,
					base: 260 - index * 20,
					amplitude: 60,
					seed: index * 3,
				}).filter(
					(_point, position) =>
						gaps === 'none' || position < HOLE.from || position >= HOLE.to,
				),
			})),
		},
	]);

const heatmapCounts = (column: number, group: number): number[] =>
	Array.from(
		{ length: HEATMAP_BUCKETS.length + 1 },
		(_unused, row) =>
			1 + ((column * 7 + row * 3 + group * 5) % 17) * (row < 6 ? 3 : 1),
	);

const HEATMAP_COLUMNS = 30;

const heatmapResponse = (
	{ start, end }: PanelWindow,
	count: number,
): QueryRangeV5200 => {
	const stepMs = (end - start) / HEATMAP_COLUMNS;

	return queryRangeV5HeatmapResponse({
		buckets: HEATMAP_BUCKETS,
		stepSeconds: Math.max(1, Math.round(stepMs / 1000)),
		series: Array.from({ length: count }, (_unused, group) => ({
			labels: [{ key: { name: 'service.name' }, value: serviceAt(group) }],
			values: Array.from({ length: HEATMAP_COLUMNS }, (_point, column) => ({
				timestamp: Math.round(start + column * stepMs),
				values: heatmapCounts(column, group),
			})),
		})),
	});
};

/** Spaced by the window, newest first, as the `timestamp desc` order asks for. */
const logRows = (
	{ start, end }: PanelWindow,
	total: number,
	offset: number,
	limit: number,
): RawRow[] =>
	Array.from(
		{ length: Math.max(0, Math.min(limit, total - offset)) },
		(_unused, position) => {
			const index = offset + position;
			const service = serviceAt(index % SERVICES.length);

			return {
				timestamp: new Date(
					end - ((end - start) / Math.max(total, 1)) * index,
				).toISOString(),
				data: {
					id: `storybook-log-${index + 1}`,
					body: `log line ${index + 1}: ${service} served the request in ${
						8 + (index % 9) * 3
					}ms`,
					severity_text: index % 5 === 0 ? 'ERROR' : 'INFO',
					resources_string: { 'service.name': service },
				},
			};
		},
	);

export interface PanelRequest {
	kind: PanelKind;
	result: PanelResult;
	series: number;
	listRows: number;
	gaps: Gaps;
	window: PanelWindow;
	offset: number;
	limit: number;
}

const withWarning = <T extends MetricRangePayloadV5 | QueryRangeV5200>(
	payload: T,
	warn: boolean,
): T => {
	if (warn) {
		payload.data.warning = PANEL_WARNING;
	}

	return payload;
};

/** What the panel's `query_range` answers, per kind and result. */
export const panelQueryResponse = ({
	kind,
	result,
	series,
	listRows,
	gaps,
	window,
	offset,
	limit,
}: PanelRequest): MetricRangePayloadV5 | QueryRangeV5200 => {
	if (result === 'empty') {
		return queryRangeV5EmptyResponse();
	}

	const warn = result === 'warning';

	switch (kind) {
		case 'Heatmap':
			return withWarning(heatmapResponse(window, series), warn);
		case 'Pie':
		case 'Table':
			return withWarning(
				queryRangeV5ScalarTableResponse({
					groupBy: ['service.name'],
					aggregations: [QUERY_NAME],
					rows: TABLE_VALUES(series).map((value, index) => [
						serviceAt(index),
						value,
					]),
				}),
				warn,
			);
		case 'Number':
			return withWarning(queryRangeV5ScalarResponse(NUMBER_VALUE), warn);
		case 'List':
			return withWarning(
				queryRangeV5RawResponse(logRows(window, listRows, offset, limit)),
				warn,
			);
		default:
			return withWarning(latencySeries(window, series, gaps), warn);
	}
};
