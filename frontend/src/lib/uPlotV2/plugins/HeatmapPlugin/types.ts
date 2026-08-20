export enum HeatmapColorScale {
	Log = 'log',
	Sqrt = 'sqrt',
	Linear = 'linear',
}

export enum HeatmapColorMode {
	Palette = 'palette',
	Opacity = 'opacity',
}

/** Sequential ramps only: colour means "count", so a midpoint or hue cycle would
 *  read as a threshold that does not exist. */
export enum HeatmapColorPalette {
	Ice = 'ice',
	Moss = 'moss',
	Rust = 'rust',
	Graphite = 'graphite',
	Ember = 'ember',
	Lagoon = 'lagoon',
	Orchid = 'orchid',
	Verdant = 'verdant',
	Lava = 'lava',
	Beacon = 'beacon',
}

export interface HeatmapColorOptions {
	mode: HeatmapColorMode;
	scale: HeatmapColorScale;
	/** `null` derives it, which is always 0 — a count of 0 belongs at the bottom. */
	minCount: number | null;
	/** `null` derives it from the grid's highest count. */
	maxCount: number | null;
	palette: HeatmapColorPalette;
	/** Colour steps the ramp is quantised into, 2..128. Unrelated to `step`, the
	 *  column width in seconds. */
	steps: number;
	/** Opacity mode. Empty falls back to the caller's series colour. */
	fill: string;
}

/** Row-height distribution of the bucket axis. */
export enum HeatmapAxisScale {
	Log = 'log',
	Linear = 'linear',
}

export interface HeatmapSeriesPoint {
	/** Column start, in seconds. */
	timestamp: number;
	/** One per bucket row, lowest first. `null` is "no data", never `0`. */
	counts: Array<number | null>;
}

export interface HeatmapSeriesLabel {
	key: string;
	value: string;
}

export interface HeatmapSeries {
	/** Group label, as the legend names it. Empty when there is no grouping. */
	label: string;
	/** The pairs behind `label`, letting the tooltip name rows by value alone. */
	labels?: HeatmapSeriesLabel[];
	points: HeatmapSeriesPoint[];
}

/** Counts pivoted into rows and aligned to one column axis. Internal to the
 *  chart, which resolves it from `buckets` and `series`. */
export interface HeatmapGrid {
	/** Ascending. N boundaries describe N+1 rows, including the `+Inf` overflow. */
	bounds: number[];
	/** Column starts, in seconds. */
	timestamps: number[];
	/** Column width in seconds. Cells span `[timestamps[j], timestamps[j] + step)`,
	 *  and the last column has no successor to infer it from. */
	step: number;
	/** `counts[row][column]`, row 0 lowest. `null` (no data) renders hatched, `0`
	 *  at the bottom of the scale — conflating them hides an outage. */
	counts: Array<Array<number | null>>;
}

export interface HeatmapRow {
	/** Synthetic on the underflow row. */
	lower: number;
	/** Synthetic on the overflow row. */
	upper: number;
	isUnderflow: boolean;
	isOverflow: boolean;
}

/** The bucket axis in uPlot y-scale space. A log axis is log10 values on a
 *  *linear* scale, not uPlot's log distribution, so boundaries stay exactly on
 *  ticks and uPlot's decade-only label filter cannot hide them. */
export interface HeatmapYAxis {
	rows: HeatmapRow[];
	/** Row edges, ascending. Length is `rows.length + 1`. */
	edges: number[];
	/** Real bucket boundaries — one tick each. */
	splits: number[];
	/** Where the `∞` tick goes: the overflow row's upper edge, not its centre,
	 *  which would sit half a row from the last boundary and collide with it. */
	overflowSplit: number | null;
	toBucketValue: (axisValue: number) => number;
	min: number;
	max: number;
}

export interface HeatmapCell {
	row: number;
	column: number;
	count: number | null;
}
