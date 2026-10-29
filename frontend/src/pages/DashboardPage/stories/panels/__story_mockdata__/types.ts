/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	DashboardtypesHeatmapPaletteDTO as HeatmapPalette,
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLegendPositionDTO as LegendPosition,
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesStackModeDTO as StackMode,
	DashboardtypesTextAlignDTO as TextAlign,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelWindow } from '../../__story_mockdata__/panelData';

import type {
	BUCKET_WIDTHS,
	GAPS,
	HEATMAP_COUNT_RANGES,
	PANEL_KINDS,
	PANEL_RESULTS,
	SPAN_GAPS,
	TEXT_SAMPLES,
	UNITS,
	Y_SCALES,
} from './constants';

export type PanelKind = (typeof PANEL_KINDS)[number];

export type PanelResult = (typeof PANEL_RESULTS)[number];

export type PanelUnit = (typeof UNITS)[number];

export type HeatmapCountRange = (typeof HEATMAP_COUNT_RANGES)[number];

export type BucketWidth = (typeof BUCKET_WIDTHS)[number];

export type TextSample = (typeof TEXT_SAMPLES)[number];

export type YScale = (typeof Y_SCALES)[number];

export type Gaps = (typeof GAPS)[number];

export type SpanGaps = (typeof SPAN_GAPS)[number];

/** The controls that shape the dashboard document. */
export interface PanelArgs {
	kind: PanelKind;
	legend: LegendPosition;
	thresholds: boolean;
	unit: PanelUnit;
	stack: StackMode;
	palette: HeatmapPalette;
	heatmapScale: HeatmapYScale;
	heatmapCounts: HeatmapCountRange;
	bucketWidth: BucketWidth;
	textSample: TextSample;
	textAlign: TextAlign;
	hideHeader: boolean;
	yScale: YScale;
	lineStyle: LineStyle;
	showPoints: boolean;
	spanGaps: SpanGaps;
	columnUnits: boolean;
}

/** What one `query_range` call asked for, as the handler reads it. */
export interface PanelRequest {
	window: PanelWindow;
	offset: number;
	limit: number;
}

export interface PanelResponseArgs extends PanelRequest {
	kind: PanelKind;
	result: PanelResult;
	series: number;
	listRows: number;
	gaps: Gaps;
}
