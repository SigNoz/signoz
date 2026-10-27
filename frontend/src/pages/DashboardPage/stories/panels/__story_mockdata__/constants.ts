/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesHeatmapPaletteDTO as HeatmapPalette,
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLegendPositionDTO as LegendPosition,
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesStackModeDTO as StackMode,
	DashboardtypesTextAlignDTO as TextAlign,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelKind } from './types';

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

export const PANEL_RESULTS = ['data', 'empty', 'warning'] as const;

export const LEGEND_POSITIONS = [
	LegendPosition.bottom,
	LegendPosition.right,
] as const;

export const UNITS = ['none', 'ms', 'bytes'] as const;

export const STACK_MODES = [
	StackMode.none,
	StackMode.normal,
	StackMode.percent,
] as const;

export const HEATMAP_PALETTES = Object.values(HeatmapPalette);

export const HEATMAP_Y_SCALES = Object.values(HeatmapYScale);

export const HEATMAP_COUNT_RANGES = ['auto', 'fixed'] as const;

/** The colour bar's bounds under the `fixed` count range. */
export const HEATMAP_FIXED_COUNTS = { min: 5, max: 250 };

export const BUCKET_WIDTHS = ['auto', '10', '50'] as const;

export const TEXT_SAMPLES = ['runbook', 'note', 'blank'] as const;

export const TEXT_ALIGNS = Object.values(TextAlign);

export const Y_SCALES = ['linear', 'log'] as const;

export const LINE_STYLES = Object.values(LineStyle);

export const GAPS = ['none', 'hole'] as const;

export const SPAN_GAPS = ['bridge', 'break-10m'] as const;

/** Points cut out of every series by `hole`: 12 of the 30, a gap past the 10m break. */
export const HOLE = { from: 10, to: 22 };

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

/**
 * Splits the table rows on the `A` column. The `B` column crosses it on other rows,
 * which the rule must leave unpainted because it targets `A` only.
 */
export const TABLE_THRESHOLD_VALUE = 2500;

export const QUERY_NAME = 'A';

/** The aggregation column the table thresholds and units address. */
export const TABLE_VALUE_COLUMN = QUERY_NAME;

/** The table's second value column, which no threshold targets. */
export const TABLE_SECOND_COLUMN = 'B';

/** Linear, so `auto` lays the rows out linearly and `log` visibly changes it. */
export const HEATMAP_BUCKETS = [
	100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

export const HEATMAP_COLUMNS = 30;

export const SERVICES = [
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
