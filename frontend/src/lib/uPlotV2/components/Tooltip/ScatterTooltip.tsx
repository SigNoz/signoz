import { useMemo } from 'react';

import { ScatterTooltipProps } from '../types';
import TooltipCard from './components/TooltipCard/TooltipCard';
import { buildChannelRows, resolveHoveredPoint } from './scatterTooltipContent';

/**
 * One point, its channels, then the group values that name it. Purpose-built
 * rather than composed from the shared `Tooltip`, whose list is one row per
 * series at a shared x; a scatter point has no such neighbours.
 */
export default function ScatterTooltip({
	uPlotInstance,
	dataIndexes,
	seriesIndex,
	channels,
	resolvePointLabels,
	decimalPrecision,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: ScatterTooltipProps): JSX.Element | null {
	const point = useMemo(
		() => resolveHoveredPoint(uPlotInstance, seriesIndex, dataIndexes),
		[uPlotInstance, seriesIndex, dataIndexes],
	);

	const rows = useMemo(
		() => (point ? buildChannelRows(point, channels, decimalPrecision) : []),
		[point, channels, decimalPrecision],
	);

	const labels = useMemo(
		() =>
			point
				? (resolvePointLabels?.(point.seriesIndex, point.dataIndex) ?? [])
				: [],
		[point, resolvePointLabels],
	);

	if (!point) {
		return null;
	}

	return (
		<TooltipCard
			title={point.label}
			color={point.color}
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
