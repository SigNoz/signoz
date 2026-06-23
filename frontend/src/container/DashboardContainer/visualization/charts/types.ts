import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PrecisionOption } from 'components/Graph/types';
import {
	IRenderTooltipFooterArgs,
	LegendConfig,
	LegendPosition,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
	ChartClickData,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

interface BaseChartProps {
	width: number;
	height: number;
	showTooltip?: boolean;
	showLegend?: boolean;
	canPinTooltip?: boolean;
	/** Key that pins the tooltip while hovering. Defaults to DEFAULT_PIN_TOOLTIP_KEY ('l'). */
	pinKey?: string;
	/** Called when the user clicks the uPlot overlay. Receives resolved click data. */
	onClick?: (clickData: ChartClickData) => void;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	pinnedTooltipElement?: (clickData: ChartClickData) => React.ReactNode;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
	customTooltip?: (props: TooltipRenderArgs) => React.ReactNode;
	'data-testid'?: string;
}
interface UPlotBasedChartProps {
	config: UPlotConfigBuilder;
	data: uPlot.AlignedData;
	legendConfig: LegendConfig;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	syncFilterMode?: SyncTooltipFilterMode;
	plotRef?: (plot: uPlot | null) => void;
	onDestroy?: (plot: uPlot) => void;
	children?: React.ReactNode;
	layoutChildren?: React.ReactNode;
}

interface UPlotChartDataProps {
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	groupByPerQuery?: Record<string, BaseAutocompleteData[]>;
}

export interface TimeSeriesChartProps
	extends BaseChartProps, UPlotBasedChartProps, UPlotChartDataProps {
	timezone?: Timezone;
}

export interface HistogramChartProps
	extends BaseChartProps, UPlotBasedChartProps, UPlotChartDataProps {
	isQueriesMerged?: boolean;
}

export interface BarChartProps
	extends BaseChartProps, UPlotBasedChartProps, UPlotChartDataProps {
	isStackedBarChart?: boolean;
	timezone?: Timezone;
}

export type ChartProps =
	| TimeSeriesChartProps
	| BarChartProps
	| HistogramChartProps;

/**
 * One resolved pie/donut slice: a display label, its (already parsed) positive
 * numeric value, and the colour used for the arc + legend swatch.
 */
export interface PieSlice {
	label: string;
	value: number;
	color: string;
}

/**
 * Props for the Pie chart. Unlike the others above, Pie is NOT uPlot-based
 * (it renders with @visx), so it deliberately does not extend BaseChartProps /
 * UPlotBasedChartProps — it takes pre-resolved slices and self-measures its
 * draw area rather than receiving a uPlot config + aligned data.
 */
export interface PieChartProps {
	data: PieSlice[];
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	isDarkMode: boolean;
	/** Legend placement. Drives the chart-vs-legend layout. Default BOTTOM. */
	position?: LegendPosition;
	/**
	 * Widget id used to persist per-slice hide/unhide state to localStorage
	 * (shared GRAPH_VISIBILITY_STATES, keyed by label). Omit to disable persistence.
	 */
	id?: string;
	/** Fired when a slice (or its legend entry) is clicked. */
	onSliceClick?: (slice: PieSlice) => void;
	'data-testid'?: string;
}
