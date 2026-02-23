import { useMemo } from 'react';

import { BarTooltipProps, TooltipContentItem } from '../types';
import Tooltip from './Tooltip';
import { buildTooltipContent } from './utils';

export default function BarChartTooltip(props: BarTooltipProps): JSX.Element {
	const content = useMemo(
		(): TooltipContentItem[] =>
			buildTooltipContent({
				data: props.uPlotInstance.data,
				series: props.uPlotInstance.series,
				dataIndexes: props.dataIndexes,
				activeSeriesIndex: props.seriesIndex,
				uPlotInstance: props.uPlotInstance,
				yAxisUnit: props.yAxisUnit ?? '',
				decimalPrecision: props.decimalPrecision,
				isStackedBarChart: props.isStackedBarChart,
			}),
		[
			props.uPlotInstance,
			props.seriesIndex,
			props.dataIndexes,
			props.yAxisUnit,
			props.decimalPrecision,
			props.isStackedBarChart,
		],
	);

	return <Tooltip {...props} content={content} />;
}
