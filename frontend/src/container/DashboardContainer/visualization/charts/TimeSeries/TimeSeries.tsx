import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import TimeSeriesTooltip from 'lib/uPlotV2/components/Tooltip/TimeSeriesTooltip';
import { buildTooltipContent } from 'lib/uPlotV2/components/Tooltip/utils';
import {
	TimeSeriesTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { TimeSeriesChartProps } from '../types';

export default function TimeSeries(props: TimeSeriesChartProps): JSX.Element {
	const { children, renderTooltip: customRenderTooltip, ...rest } = props;

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			if (customRenderTooltip) {
				return customRenderTooltip(props);
			}
			const content = buildTooltipContent({
				data: props.uPlotInstance.data,
				series: props.uPlotInstance.series,
				dataIndexes: props.dataIndexes,
				activeSeriesIndex: props.seriesIndex,
				uPlotInstance: props.uPlotInstance,
				yAxisUnit: rest.yAxisUnit ?? '',
				decimalPrecision: rest.decimalPrecision,
			});
			const tooltipProps: TimeSeriesTooltipProps = {
				...props,
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				content,
			};
			return <TimeSeriesTooltip {...tooltipProps} />;
		},
		[customRenderTooltip, rest.timezone, rest.yAxisUnit, rest.decimalPrecision],
	);

	return (
		<ChartWrapper {...rest} renderTooltip={renderTooltip}>
			{children}
		</ChartWrapper>
	);
}
