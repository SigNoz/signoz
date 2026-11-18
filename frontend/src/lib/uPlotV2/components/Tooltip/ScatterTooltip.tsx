import { useMemo } from 'react';

import { ScatterTooltipProps } from '../types';
import TooltipCard from './components/TooltipCard/TooltipCard';
import { buildChannelRows, resolveHoveredPoint } from './scatterTooltipContent';

/** Own component: the shared Tooltip lists one row per series at a shared x. */
export default function ScatterTooltip({
	uPlotInstance,
	dataIndexes,
	seriesIndex,
	channels,
	resolvePointGroupValues,
	decimalPrecision,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: ScatterTooltipProps): JSX.Element | null {
	const hoveredPoint = useMemo(
		() => resolveHoveredPoint(uPlotInstance, seriesIndex, dataIndexes),
		[uPlotInstance, seriesIndex, dataIndexes],
	);

	const rows = useMemo(
		() =>
			hoveredPoint
				? buildChannelRows(hoveredPoint, channels, decimalPrecision)
				: [],
		[hoveredPoint, channels, decimalPrecision],
	);

	const labels = useMemo(
		() =>
			hoveredPoint
				? (resolvePointGroupValues?.(
						hoveredPoint.seriesIndex,
						hoveredPoint.dataIndex,
					) ?? [])
				: [],
		[hoveredPoint, resolvePointGroupValues],
	);

	if (!hoveredPoint) {
		return null;
	}

	return (
		<TooltipCard
			title={hoveredPoint.label}
			color={hoveredPoint.color}
			rows={rows.map((row) => ({ key: row.label, ...row }))}
			mutedRows={labels.map((label) => ({
				key: label.key,
				label: label.key,
				value: label.value,
			}))}
			isPinned={isPinned}
			footer={renderTooltipFooter?.({ isPinned, dismiss })}
			testId="scatter-tooltip"
		/>
	);
}
