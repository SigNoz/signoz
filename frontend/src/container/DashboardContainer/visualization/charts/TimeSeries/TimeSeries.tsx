import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import TimeSeriesTooltip from 'lib/uPlotV2/components/Tooltip/TimeSeriesTooltip';
import {
	TimeSeriesTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { TimeSeriesChartProps } from '../types';

export default function TimeSeries(props: TimeSeriesChartProps): JSX.Element {
	const { children, customTooltip, pinnedTooltipElement, ...rest } = props;

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(props);
			}
			const tooltipProps: TimeSeriesTooltipProps = {
				...props,
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				canPinTooltip: rest.canPinTooltip,
			};
			return <TimeSeriesTooltip {...tooltipProps} />;
		},
		[
			customTooltip,
			rest.timezone,
			rest.yAxisUnit,
			rest.decimalPrecision,
			rest.canPinTooltip,
		],
	);

	return (
		<ChartWrapper
			{...rest}
			customTooltip={renderTooltip}
			pinnedTooltipElement={pinnedTooltipElement}
		>
			{children}
		</ChartWrapper>
	);
}
