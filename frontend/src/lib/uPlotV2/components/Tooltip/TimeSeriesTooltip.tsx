import { useMemo } from 'react';

import { TimeSeriesTooltipProps, TooltipContentItem } from '../types';
import Tooltip from './Tooltip';
import { buildTooltipContent } from './utils';

export default function TimeSeriesTooltip(
	props: TimeSeriesTooltipProps,
): JSX.Element {
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
			}),
		[
			props.uPlotInstance,
			props.seriesIndex,
			props.dataIndexes,
			props.yAxisUnit,
			props.decimalPrecision,
		],
	);

	return <Tooltip {...props} content={content} />;
}
