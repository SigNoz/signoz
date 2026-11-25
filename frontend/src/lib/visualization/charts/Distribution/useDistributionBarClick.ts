import { useCallback, useRef } from 'react';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { resolveNearestSeries } from './layout';
import { resolveClickedGroup } from './topGroups';
import type {
	UseDistributionBarClickArgs,
	UseDistributionBarClickReturn,
} from './types';

/**
 * Resolves a plot click to the group under it. A click on Other pins the tooltip instead,
 * as Pie's Other does, so one of its groups can be picked; an empty bucket reports none.
 */
export function useDistributionBarClick({
	xAxis,
	layout,
	drawn,
	series,
	colors,
	onBarClick,
}: UseDistributionBarClickArgs): UseDistributionBarClickReturn {
	const onBarClickRef = useRef(onBarClick);
	onBarClickRef.current = onBarClick;

	const resolveDrawnIndex = useCallback(
		({ xValue, yValue }: ChartClickData): number | null => {
			const bucket = resolveRowIndex(xAxis.edges, xValue);
			return bucket === null
				? null
				: resolveNearestSeries(layout, bucket, xValue, yValue);
		},
		[xAxis, layout],
	);

	const handleClick = useCallback(
		(data: ChartClickData): void => {
			const clicked = resolveClickedGroup(drawn, resolveDrawnIndex(data), series);
			if (clicked) {
				onBarClickRef.current?.({
					...clicked,
					coordinates: { x: data.absoluteMouseX, y: data.absoluteMouseY },
				});
			}
		},
		[resolveDrawnIndex, drawn, series],
	);

	const shouldPinOnClick = useCallback(
		(data: ChartClickData): boolean => {
			const drawnIndex = resolveDrawnIndex(data);
			return drawnIndex !== null && drawn.sourceIndexes[drawnIndex] === null;
		},
		[resolveDrawnIndex, drawn],
	);

	const handleOtherMemberClick = useCallback(
		(sourceIndex: number, coordinates: { x: number; y: number }): void => {
			onBarClickRef.current?.({
				series: series[sourceIndex],
				color: colors[sourceIndex],
				coordinates,
			});
		},
		[series, colors],
	);

	return {
		onClick: onBarClick ? handleClick : undefined,
		onOtherMemberClick: onBarClick ? handleOtherMemberClick : undefined,
		shouldPinOnClick:
			drawn.otherSourceIndexes.length > 0 ? shouldPinOnClick : undefined,
	};
}
