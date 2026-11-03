// The (Perses-shaped) dashboard spec. Mirrors Go's `dashboardtypes.DashboardSpec`.

import type { PanelKind } from './dashboard-spec';

export type Signal = 'metrics' | 'logs' | 'traces';

export interface MetricAggregation {
	metricName: string;
	timeAggregation: string;
	spaceAggregation: string;
	reduceTo: string;
}

/** Logs/traces aggregations are expression-shaped ("count()"), not metric-shaped. */
export interface ExpressionAggregation {
	expression: string;
}

export interface OrderBy {
	key: { name: string };
	direction: 'asc' | 'desc';
}

export interface BuilderQuerySpec {
	name: string;
	signal: Signal;
	aggregations: (MetricAggregation | ExpressionAggregation)[];
	filter?: { expression: string };
	groupBy?: { name: string }[];
	order?: OrderBy[];
	limit?: number;
}

export type QueryPlugin =
	| { kind: 'signoz/BuilderQuery'; spec: BuilderQuerySpec }
	| { kind: 'signoz/PromQLQuery'; spec: { name: string; query: string } }
	| { kind: 'signoz/ClickHouseSQL'; spec: { name: string; query: string } };

/**
 * List reads `raw`, Heatmap `heatmap`, Number / Pie / Table `scalar`; the
 * charts read `time_series`. Mixing them renders empty.
 */
export type QueryResultKind = 'time_series' | 'scalar' | 'raw' | 'heatmap';

export interface Query {
	kind: QueryResultKind;
	spec: { plugin: QueryPlugin };
}

// ─── Panel plugin specs ──────────────────────────────────────────────────

export interface Threshold {
	value: number;
	color: string;
	operator?:
		| 'above'
		| 'aboveOrEqual'
		| 'below'
		| 'belowOrEqual'
		| 'equal'
		| 'notEqual';
	format?: 'background' | 'text';
	unit?: string;
	label?: string;
	columnName?: string;
}

export type StackMode = 'none' | 'normal' | 'percent';

export type HeatmapPalette =
	| 'ice'
	| 'moss'
	| 'rust'
	| 'graphite'
	| 'ember'
	| 'lagoon'
	| 'orchid'
	| 'verdant'
	| 'lava'
	| 'beacon';

export interface HeatmapColors {
	mode?: 'palette' | 'opacity';
	palette?: HeatmapPalette;
	scale?: 'log' | 'sqrt' | 'linear';
	/** 2–128. */
	steps?: number;
	minCount?: number | null;
	maxCount?: number | null;
	/** Opacity mode only. */
	fill?: string;
}

export interface TextPresentation {
	textAlign?: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'center' | 'bottom';
	/** A hex colour. */
	background?: string;
}

/**
 * One bag for every kind; the server's strict decoder rejects a key the kind
 * does not declare, so a mismatch fails the seed rather than rendering wrong.
 */
export interface PanelPluginSpec {
	visualization?: {
		timePreference?: string;
		fillSpans?: boolean;
		stackedBarChart?: boolean;
		/** Area only. */
		stack?: StackMode;
	};
	formatting?: {
		unit?: string;
		decimalPrecision?: string;
		columnUnits?: Record<string, string>;
	};
	axes?: {
		softMin?: number | null;
		softMax?: number | null;
		isLogScale?: boolean;
		/** Heatmap only, and its only axis key. */
		y?: { scale: 'auto' | 'linear' | 'log' | 'symlog' };
	};
	legend?: {
		position?: 'bottom' | 'right';
		customColors?: Record<string, string>;
	};
	chartAppearance?: {
		lineStyle?: 'solid' | 'dashed';
		lineInterpolation?: 'linear' | 'spline' | 'step_before' | 'step_after';
		/** Area drops `none`. */
		fillMode?: 'none' | 'solid' | 'gradient';
		/** Area only, 0–1. */
		fillOpacity?: number;
		showPoints?: boolean;
		spanGaps?: { fillOnlyBelow?: boolean; fillLessThan?: string };
		/** Heatmap only, and its only appearance key. */
		colors?: HeatmapColors;
	};
	histogramBuckets?: {
		bucketCount?: number;
		bucketWidth?: number;
		mergeAllActiveQueries?: boolean;
	};
	selectFields?: { name: string; signal?: Signal; fieldDataType?: string }[];
	thresholds?: Threshold[];
	/** Text only. */
	mode?: 'markdown';
	text?: string;
	presentation?: TextPresentation;
	headerOptions?: { hide: boolean };
}

/**
 * Perses' link model — NOT the editor dialog's field names. The dialog labels
 * its first field "Label", but it persists as `name`; there is no `label` key
 * and the strict decoder rejects one.
 */
export interface ContextLink {
	name: string;
	url: string;
	tooltip?: string;
	renderVariables?: boolean;
	targetBlank?: boolean;
}

export interface Panel {
	kind: 'Panel';
	spec: {
		display: { name: string; description?: string };
		links: ContextLink[];
		plugin: { kind: PanelKind; spec: PanelPluginSpec };
		/** Empty for Text, exactly one query for every other kind. */
		queries: Query[];
	};
}

// ─── Layout ──────────────────────────────────────────────────────────────

export interface GridItem {
	x: number;
	y: number;
	width: number;
	height: number;
	content: { $ref: string };
}

export interface Layout {
	kind: 'Grid';
	spec: { display: { title: string }; items: GridItem[] };
}

// ─── Variables ───────────────────────────────────────────────────────────

export type Variable =
	| {
			kind: 'ListVariable';
			spec: {
				name: string;
				display: { name: string; description?: string };
				allowAllValue: boolean;
				allowMultiple: boolean;
				sort: 'none' | 'alphabetical-asc' | 'alphabetical-desc';
				plugin:
					| { kind: 'signoz/CustomVariable'; spec: { customValue: string } }
					| { kind: 'signoz/QueryVariable'; spec: { queryValue: string } }
					| {
							kind: 'signoz/DynamicVariable';
							spec: { name: string; signal: Signal };
					  };
			};
	  }
	| {
			kind: 'TextVariable';
			spec: {
				name: string;
				display: { name: string; description?: string };
				value: string;
			};
	  };

// ─── Dashboard ───────────────────────────────────────────────────────────

export interface DashboardSpec {
	display: { name: string; description?: string };
	variables: Variable[];
	panels: Record<string, Panel>;
	layouts: Layout[];
	links: ContextLink[];
}

export interface Tag {
	key: string;
	value: string;
}

export interface PostableDashboard {
	schemaVersion: 'v6';
	/** Must be EMPTY when `generateName` is true; the server derives it. */
	name: string;
	generateName: boolean;
	tags: Tag[];
	spec: DashboardSpec;
}

export interface GettableDashboard {
	id: string;
	name: string;
	locked: boolean;
	tags: Tag[];
	spec: DashboardSpec;
}
