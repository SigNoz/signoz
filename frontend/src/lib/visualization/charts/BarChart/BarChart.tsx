import { useCallback } from 'react';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import BarChartTooltip from 'lib/uPlotV2/components/Tooltip/BarChartTooltip';
import {
	BarTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { StackMode } from 'lib/uPlotV2/config/types';

import { BarChartProps } from 'lib/visualization/charts/types';

export default function BarChart(props: BarChartProps): JSX.Element {
	const {
		children,
		customTooltip,
		config,
		data,
		stack = StackMode.None,
		pinnedTooltipElement,
		...rest
	} = props;

	// Written during render so it lands before UPlotChart's effect reads the config,
	// which derives the fill bands, percent axis unit and percent range from it.
	config.setStackMode(stack);

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(props);
			}
			const tooltipProps: BarTooltipProps = {
				...props,
				id: config.getId(),
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				canPinTooltip: rest.canPinTooltip,
				renderTooltipFooter: rest.renderTooltipFooter,
			};
			return <BarChartTooltip {...tooltipProps} />;
		},
		[
			customTooltip,
			rest.timezone,
			rest.yAxisUnit,
			rest.decimalPrecision,
			rest.canPinTooltip,
			rest.renderTooltipFooter,
		],
	);

	return (
		<ChartWrapper
			{...rest}
			config={config}
			data={data}
			customTooltip={renderTooltip}
			pinnedTooltipElement={pinnedTooltipElement}
		>
			{children}
		</ChartWrapper>
	);
}
