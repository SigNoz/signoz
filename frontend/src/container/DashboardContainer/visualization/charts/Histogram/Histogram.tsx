import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import HistogramTooltip from 'lib/uPlotV2/components/Tooltip/HistogramTooltip';
import {
	HistogramTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { HistogramChartProps } from '../types';

export default function Histogram(props: HistogramChartProps): JSX.Element {
	const {
		children,
		customTooltip,
		isQueriesMerged,
		pinnedTooltipElement,
		...rest
	} = props;

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(props);
			}
			const tooltipProps: HistogramTooltipProps = {
				...props,
				id: rest.config.getId(),
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				canPinTooltip: rest.canPinTooltip,
				renderTooltipFooter: rest.renderTooltipFooter,
			};
			return <HistogramTooltip {...tooltipProps} />;
		},
		[
			customTooltip,
			rest.yAxisUnit,
			rest.decimalPrecision,
			rest.canPinTooltip,
			rest.renderTooltipFooter,
		],
	);

	return (
		<ChartWrapper
			showLegend={!isQueriesMerged}
			{...rest}
			customTooltip={renderTooltip}
			pinnedTooltipElement={pinnedTooltipElement}
		>
			{children}
		</ChartWrapper>
	);
}
