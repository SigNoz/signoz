/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind as AreaChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind as BarChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesGeoMapPanelSpecDTOKind as GeoMapKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind as HeatmapKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind as HistogramKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind as ListKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind as NumberKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind as PieChartKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind as ScatterPlotKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind as TableKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind as TextKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind,
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind as TopListKind,
	MetrictypesSpaceAggregationDTO as SpaceAggregation,
	DashboardtypesStackModeDTO as StackMode,
	DashboardtypesTextModeDTO as TextMode,
	Querybuildertypesv5RequestTypeDTO as RequestType,
	type DashboardtypesPanelPluginDTO,
	type DashboardtypesQueryDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	GEO_COUNTRY_KEY,
	HEATMAP_FIXED_COUNTS,
	TABLE_SECOND_COLUMN,
	TABLE_THRESHOLD_VALUE,
	TABLE_VALUE_COLUMN,
	TOP_LIST_BAR_COLOR,
	VALUE_NAMES,
} from './constants';
import {
	comparisonThresholds,
	geoMapThresholds,
	labelThresholds,
	logQuery,
	metricQuery,
	tableThresholds,
	TEXT_BODIES,
} from './panelQueries';
import type { PanelArgs, PanelUnit } from './types';

interface PanelShape {
	plugin: DashboardtypesPanelPluginDTO;
	queries: DashboardtypesQueryDTO[];
}

const unitOf = (unit: PanelUnit): string | undefined =>
	unit === 'none' ? undefined : unit;

const timeSeriesQueries = (): DashboardtypesQueryDTO[] => [
	metricQuery(RequestType.time_series, { grouped: true }),
];

/** Latency (`A`) and errors (`B`) per service, joined into one row each. */
const callsAndErrorsQueries = (named: boolean): DashboardtypesQueryDTO[] => [
	metricQuery(RequestType.scalar, {
		grouped: true,
		legend: named ? VALUE_NAMES[TABLE_VALUE_COLUMN] : undefined,
	}),
	metricQuery(RequestType.scalar, {
		grouped: true,
		name: TABLE_SECOND_COLUMN,
		metricName: 'signoz_errors',
		legend: named ? VALUE_NAMES[TABLE_SECOND_COLUMN] : undefined,
	}),
];

const geoMapShape = (args: PanelArgs): PanelShape => {
	const unit = unitOf(args.unit);
	return {
		plugin: {
			kind: GeoMapKind['signoz/GeoMapPanel'],
			spec: {
				legend: { position: args.legend },
				formatting: {
					columnUnits: unit ? { [TABLE_VALUE_COLUMN]: unit } : {},
				},
				thresholds: geoMapThresholds(args.thresholds),
			},
		},
		queries: [
			metricQuery(RequestType.scalar, {
				grouped: true,
				groupBy: GEO_COUNTRY_KEY,
				legend: args.valueNames ? VALUE_NAMES[TABLE_VALUE_COLUMN] : undefined,
			}),
		],
	};
};

export const panelShape = (args: PanelArgs): PanelShape => {
	const formatting = { unit: unitOf(args.unit) };
	const legend = { position: args.legend };
	const axes = { isLogScale: args.yScale === 'log' };
	const thresholds = labelThresholds(args.thresholds);
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
						thresholds,
						visualization: { stackedBarChart: args.stack !== StackMode.none },
					},
				},
				queries: timeSeriesQueries(),
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
						thresholds,
						visualization: { stack: args.stack },
					},
				},
				queries: timeSeriesQueries(),
			};
		case 'Histogram':
			return {
				plugin: {
					kind: HistogramKind['signoz/HistogramPanel'],
					spec: {
						legend,
						histogramBuckets: {
							bucketWidth:
								args.bucketWidth === 'auto' ? undefined : Number(args.bucketWidth),
						},
					},
				},
				queries: timeSeriesQueries(),
			};
		case 'Heatmap':
			return {
				plugin: {
					kind: HeatmapKind['signoz/HeatmapPanel'],
					spec: {
						formatting,
						legend,
						axes: { y: { scale: args.heatmapScale } },
						chartAppearance: {
							colors: {
								palette: args.palette,
								...(args.heatmapCounts === 'fixed'
									? {
											minCount: HEATMAP_FIXED_COUNTS.min,
											maxCount: HEATMAP_FIXED_COUNTS.max,
										}
									: {}),
							},
						},
					},
				},
				queries: [
					metricQuery(RequestType.heatmap, { grouped: true, heatmap: true }),
				],
			};
		case 'Pie':
			return {
				plugin: {
					kind: PieChartKind['signoz/PieChartPanel'],
					spec: { formatting, legend },
				},
				queries: [metricQuery(RequestType.scalar, { grouped: true })],
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
				queries: [metricQuery(RequestType.scalar, { grouped: false })],
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
				queries: callsAndErrorsQueries(args.valueNames),
			};
		case 'ScatterPlot':
			return {
				plugin: {
					kind: ScatterPlotKind['signoz/ScatterPlotPanel'],
					spec: { legend },
				},
				queries: callsAndErrorsQueries(args.valueNames),
			};
		case 'GeoMap':
			return geoMapShape(args);
		case 'List':
			return {
				plugin: {
					kind: ListKind['signoz/ListPanel'],
					spec: {
						selectFields: [{ name: 'timestamp' }, { name: 'body' }],
					},
				},
				queries: [logQuery()],
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
		case 'TopList':
			return {
				plugin: {
					kind: TopListKind['signoz/TopListPanel'],
					spec: {
						formatting,
						appearance: {
							barColor: TOP_LIST_BAR_COLOR,
							showRank: args.showRank,
							showShare: args.showShare,
						},
						thresholds: comparisonThresholds(args.thresholds, TABLE_THRESHOLD_VALUE),
					},
				},
				queries: [
					metricQuery(RequestType.scalar, {
						grouped: true,
						metricName: 'signoz_calls',
						spaceAggregation:
							args.topListAggregation === 'sum'
								? SpaceAggregation.sum
								: SpaceAggregation.p99,
					}),
				],
			};
		case 'TimeSeries':
		default:
			return {
				plugin: {
					kind: TimeSeriesKind['signoz/TimeSeriesPanel'],
					spec: { axes, chartAppearance, formatting, legend, thresholds },
				},
				queries: timeSeriesQueries(),
			};
	}
};
