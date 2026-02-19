import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import HistogramTooltip from 'lib/uPlotV2/components/Tooltip/HistogramTooltip';
import { buildTooltipContent } from 'lib/uPlotV2/components/Tooltip/utils';
import {
	HistogramTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import { HistogramChartProps } from '../types';

export default function Histogram(props: HistogramChartProps): JSX.Element {
	const {
		children,
		renderTooltip: customRenderTooltip,
		isQueriesMerged,
		...rest
	} = props;

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
			const tooltipProps: HistogramTooltipProps = {
				...props,
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				content,
			};
			return <HistogramTooltip {...tooltipProps} />;
		},
		[customRenderTooltip, rest.timezone, rest.yAxisUnit, rest.decimalPrecision],
	);

	return (
		<ChartWrapper
			showLegend={!isQueriesMerged}
			{...rest}
			renderTooltip={renderTooltip}
		>
			{children}
		</ChartWrapper>
	);
}
