import type { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import type { PrecisionOption } from 'components/Graph/types';
import type {
	IRenderTooltipFooterArgs,
	LegendPosition,
} from 'lib/uPlotV2/components/types';
import type {
	HeatmapAxisScale,
	HeatmapCell,
	HeatmapColorOptions,
	HeatmapSeries,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

/**
 * Data arrives as the query response carries it — bucket bounds plus one series per
 * group — and the chart pivots and sums it, so no caller has to get the transpose
 * or the combined view right. It builds its own `UPlotConfigBuilder` too, since the
 * y axis *is* the bucket axis and `buckets` fully determines it.
 *
 * `buckets`, `series` and `colors` must be referentially stable: a new identity
 * rebuilds the config, which recreates the plot.
 */
export interface HeatmapChartProps {
	id: string;
	/** Ascending. N boundaries describe N+1 rows. */
	buckets: number[];
	/** The *effective* step the server used (`meta.stepIntervals[queryName]`), not
	 *  the requested one. Cannot be inferred: the last column has no successor. */
	step: number;
	/** One entry per group; a query without grouping yields one series. */
	series: HeatmapSeries[];
	width: number;
	height: number;
	isDarkMode: boolean;
	/** Overrides on top of `DEFAULT_HEATMAP_COLORS`. */
	colors?: Partial<HeatmapColorOptions>;
	/** Default log. */
	axisScale?: HeatmapAxisScale;
	/** Unit of the bucket boundaries; counts are always plain numbers. */
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	timezone?: Timezone;
	/** Colour bar below the grid. Default true. */
	showVisualMap?: boolean;
	/** Default true; hidden anyway when there is only one group. Every group starts
	 *  enabled — the label isolates one, the marker excludes one. */
	showLegend?: boolean;
	legendPosition?: LegendPosition;
	/** Default true. */
	dimOnHover?: boolean;
	showTooltip?: boolean;
	canPinTooltip?: boolean;
	pinKey?: string;
	/** Overrides the opacity-mode fill, which otherwise follows the selected
	 *  group's legend colour so the grid matches the swatch that was clicked. */
	seriesColor?: string;
	/** Query window, in seconds. Falls back to the data's own extent. */
	minTimeScale?: number;
	maxTimeScale?: number;
	onDragSelect?: (startTime: number, endTime: number) => void;
	onCellClick?: (cell: HeatmapCell, clickData: ChartClickData) => void;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
	tooltipPortalRoot?: HTMLElement | null;
	layoutChildren?: React.ReactNode;
	'data-testid'?: string;
}
