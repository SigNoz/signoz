import { PrecisionOption } from 'components/Graph/types';
import { LegendConfig, TooltipRenderArgs } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { CrossPanelSync } from 'types/api/dashboard/getAll';

interface BaseChartProps {
	width: number;
	height: number;
	showTooltip?: boolean;
	timezone: string;
	canPinTooltip?: boolean;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	renderTooltip?: (props: TooltipRenderArgs) => React.ReactNode;
	'data-testid'?: string;
}
interface UPlotBasedChartProps {
	config: UPlotConfigBuilder;
	data: uPlot.AlignedData;
	syncMode?: CrossPanelSync;
	syncKey?: string;
	plotRef?: (plot: uPlot | null) => void;
	onDestroy?: (plot: uPlot) => void;
	children?: React.ReactNode;
	layoutChildren?: React.ReactNode;
}

export interface TimeSeriesChartProps
	extends BaseChartProps,
		UPlotBasedChartProps {
	legendConfig: LegendConfig;
}

export interface BarChartProps extends BaseChartProps, UPlotBasedChartProps {
	legendConfig: LegendConfig;
	isStackedBarChart?: boolean;
}

export type ChartProps = TimeSeriesChartProps | BarChartProps;
