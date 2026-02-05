import { PrecisionOption } from 'components/Graph/types';
import { LegendConfig } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

interface BaseChartProps {
	width: number;
	height: number;
	disableTooltip?: boolean;
	timezone: string;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	canPinTooltip?: boolean;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}

interface TimeSeriesChartProps extends BaseChartProps {
	config: UPlotConfigBuilder;
	legendConfig: LegendConfig;
	data: uPlot.AlignedData;
	plotRef?: (plot: uPlot | null) => void;
	onDestroy?: (plot: uPlot) => void;
	children?: React.ReactNode;
	layoutChildren?: React.ReactNode;
	'data-testid'?: string;
}

export type ChartProps = TimeSeriesChartProps;
