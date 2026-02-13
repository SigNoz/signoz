import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import BarChartTooltip from 'lib/uPlotV2/components/Tooltip/BarChartTooltip';
import {
	BarTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { useBarChartStacking } from '../../hooks/useBarChartStacking';
import { BarChartProps } from '../types';

export default function BarChart(props: BarChartProps): JSX.Element {
	const { children, isStackedBarChart, config, data, ...rest } = props;

	const chartData = useBarChartStacking({
		data,
		isStackedBarChart,
		config,
	});

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			const tooltipProps: BarTooltipProps = {
				...props,
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				isStackedBarChart: isStackedBarChart,
			};
			return <BarChartTooltip {...tooltipProps} />;
		},
		[rest.timezone, rest.yAxisUnit, rest.decimalPrecision, isStackedBarChart],
	);

	return (
		<ChartWrapper
			{...rest}
			config={config}
			data={chartData}
			renderTooltip={renderTooltip}
		>
			{children}
		</ChartWrapper>
	);
}
