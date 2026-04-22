import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PrecisionOption } from 'components/Graph/types';
import { LegendConfig, TooltipRenderArgs } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import {
	DashboardCursorSync,
	TooltipClickData,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';

interface BaseChartProps {
	width: number;
	height: number;
	showTooltip?: boolean;
	showLegend?: boolean;
	canPinTooltip?: boolean;
	pinnedTooltipElement?: (clickData: TooltipClickData) => React.ReactNode;
	customTooltip?: (props: TooltipRenderArgs) => React.ReactNode;
	'data-testid'?: string;
}
interface UPlotBasedChartProps {
	config: UPlotConfigBuilder;
	data: uPlot.AlignedData;
	legendConfig: LegendConfig;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	plotRef?: (plot: uPlot | null) => void;
	onDestroy?: (plot: uPlot) => void;
	children?: React.ReactNode;
	layoutChildren?: React.ReactNode;
}

interface UPlotChartDataProps {
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}

export interface TimeSeriesChartProps
	extends BaseChartProps,
		UPlotBasedChartProps,
		UPlotChartDataProps {
	timezone?: Timezone;
}

export interface HistogramChartProps
	extends BaseChartProps,
		UPlotBasedChartProps,
		UPlotChartDataProps {
	isQueriesMerged?: boolean;
}

export interface BarChartProps
	extends BaseChartProps,
		UPlotBasedChartProps,
		UPlotChartDataProps {
	isStackedBarChart?: boolean;
	timezone?: Timezone;
}

export type ChartProps =
	| TimeSeriesChartProps
	| BarChartProps
	| HistogramChartProps;
