import { PrecisionOption } from 'components/Graph/types';
import { LegendConfig, TooltipRenderArgs } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

interface BaseChartProps {
	width: number;
	height: number;
	disableTooltip?: boolean;
	timezone: string;
	canPinTooltip?: boolean;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	'data-testid'?: string;
}
interface UPlotChartBaseProps {
	config: UPlotConfigBuilder;
	data: uPlot.AlignedData;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	plotRef?: (plot: uPlot | null) => void;
	onDestroy?: (plot: uPlot) => void;
	children?: React.ReactNode;
	layoutChildren?: React.ReactNode;
}

export interface TimeSeriesChartProps
	extends BaseChartProps,
		UPlotChartBaseProps {
	legendConfig: LegendConfig;
}

export interface BarChartProps extends BaseChartProps, UPlotChartBaseProps {
	legendConfig: LegendConfig;
	isStackedBarChart?: boolean;
}

export type ChartProps = (TimeSeriesChartProps | BarChartProps) & {
	renderTooltip: (props: TooltipRenderArgs) => React.ReactNode;
};
