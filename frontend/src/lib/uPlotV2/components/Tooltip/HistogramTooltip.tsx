import { useMemo } from 'react';

import { HistogramTooltipProps, TooltipContentItem } from '../types';
import Tooltip from './Tooltip';
import { buildTooltipContent } from './utils';

export default function HistogramTooltip(
	props: HistogramTooltipProps,
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
				syncedSeriesIndexes: props.syncedSeriesIndexes,
			}),
		[
			props.uPlotInstance,
			props.seriesIndex,
			props.dataIndexes,
			props.yAxisUnit,
			props.decimalPrecision,
			props.syncedSeriesIndexes,
		],
	);

	return <Tooltip {...props} content={content} showTooltipHeader={false} />;
}
