import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PrecisionOption } from 'components/Graph/types';
import {
	IRenderTooltipFooterArgs,
	LegendConfig,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
	TooltipClickData,
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
	onClick?: (clickData: TooltipClickData) => void;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	pinnedTooltipElement?: (clickData: TooltipClickData) => React.ReactNode;
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
