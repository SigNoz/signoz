/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind as AreaChartKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind as BarChartKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind as HeatmapKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind as HistogramKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind as ListKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind as NumberKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind as PieChartKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind as TableKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind as TextKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind';
import { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind as TopListKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind';
import { MetrictypesSpaceAggregationDTO as SpaceAggregation } from 'api/generated/services/sigNoz.schemas/metrictypesSpaceAggregationDTO';
import { DashboardtypesStackModeDTO as StackMode } from 'api/generated/services/sigNoz.schemas/dashboardtypesStackModeDTO';
import { DashboardtypesTextModeDTO as TextMode } from 'api/generated/services/sigNoz.schemas/dashboardtypesTextModeDTO';
import { Querybuildertypesv5RequestTypeDTO as RequestType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { DashboardtypesPanelPluginDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesPanelPluginDTO';
import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesQueryDTO';

import {
	HEATMAP_FIXED_COUNTS,
	TABLE_SECOND_COLUMN,
	TABLE_THRESHOLD_VALUE,
	TABLE_VALUE_COLUMN,
	TOP_LIST_BAR_COLOR,
} from './constants';
import {
	comparisonThresholds,
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
				queries: [
					metricQuery(RequestType.scalar, { grouped: true }),
					metricQuery(RequestType.scalar, {
						grouped: true,
						name: TABLE_SECOND_COLUMN,
						metricName: 'signoz_errors',
					}),
				],
			};
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
