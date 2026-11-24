import { useCallback, useRef } from 'react';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { resolveNearestSeries } from './layout';
import { resolveClickedGroup } from './topGroups';
import type {
	UseDistributionBarClickArgs,
	UseDistributionBarClickReturn,
} from './types';

/** Resolves a plot click to the group under it; Other and empty buckets report none. */
export function useDistributionBarClick({
	xAxis,
	layout,
	drawn,
	series,
	onBarClick,
}: UseDistributionBarClickArgs): UseDistributionBarClickReturn {
	const onBarClickRef = useRef(onBarClick);
	onBarClickRef.current = onBarClick;

	const handleClick = useCallback(
		({
			xValue,
			yValue,
			absoluteMouseX,
			absoluteMouseY,
		}: ChartClickData): void => {
			const bucket = resolveRowIndex(xAxis.edges, xValue);
			const clicked = resolveClickedGroup(
				drawn,
				bucket === null
					? null
					: resolveNearestSeries(layout, bucket, xValue, yValue),
				series,
			);
			if (clicked) {
				onBarClickRef.current?.({
					...clicked,
					coordinates: { x: absoluteMouseX, y: absoluteMouseY },
				});
			}
		},
		[xAxis, layout, drawn, series],
	);

	return onBarClick ? handleClick : undefined;
}
