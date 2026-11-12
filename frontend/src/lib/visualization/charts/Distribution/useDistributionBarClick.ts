import { useCallback, useRef } from 'react';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { type DistributionBarsLayout, resolveNearestSeries } from './layout';
import { type DrawnGroups, resolveClickedGroup } from './topGroups';
import type {
	DistributionBarClick,
	DistributionSeries,
	DistributionXAxis,
} from './types';

/** Resolves a plot click to the group under it; Other and empty buckets report none. */
export function useDistributionBarClick({
	xAxis,
	layout,
	drawn,
	series,
	onBarClick,
}: {
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	drawn: DrawnGroups;
	series: DistributionSeries[];
	onBarClick?: (click: DistributionBarClick) => void;
}): ((data: ChartClickData) => void) | undefined {
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
