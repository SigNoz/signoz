import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot, { AlignedData, Series } from 'uplot';

import { SyncTooltipFilterMode } from '../../plugins/TooltipPlugin/types';
import { TooltipContentItem } from '../types';

export const FALLBACK_SERIES_COLOR = '#000000';

export function resolveSeriesColor(
	stroke: Series.Stroke | undefined,
	u: uPlot,
	seriesIndex: number,
): string {
	if (typeof stroke === 'function') {
		return String(stroke(u, seriesIndex));
	}
	if (typeof stroke === 'string') {
		return stroke;
	}
	return FALLBACK_SERIES_COLOR;
}

export function getTooltipBaseValue({
	data,
	index,
	dataIndex,
	isStackedBarChart,
	series,
}: {
	data: AlignedData;
	index: number;
	dataIndex: number;
	isStackedBarChart?: boolean;
	series?: Series[];
}): number | null {
	let baseValue = data[index][dataIndex] ?? null;
	// Top-down stacking (first series at top): raw = stacked[i] - stacked[nextVisible].
	// When series are hidden, we must use the next *visible* series, not index+1,
	// since hidden series keep raw values and would produce negative/wrong results.
	if (isStackedBarChart && baseValue !== null && series) {
		let nextVisibleSeriesIdx = -1;
		for (let seriesIdx = index + 1; seriesIdx < series.length; seriesIdx++) {
			if (series[seriesIdx]?.show) {
				nextVisibleSeriesIdx = seriesIdx;
				break;
			}
		}
		if (nextVisibleSeriesIdx >= 1) {
			const nextStackedValue = data[nextVisibleSeriesIdx][dataIndex] ?? 0;
			baseValue = baseValue - nextStackedValue;
		}
	}
	return baseValue;
}

export function buildTooltipContent({
	data,
	series,
	dataIndexes,
	activeSeriesIndex,
	uPlotInstance,
	yAxisUnit,
	decimalPrecision,
	isStackedBarChart,
	syncedSeriesIndexes,
	syncFilterMode,
}: {
	data: AlignedData;
	series: Series[];
	dataIndexes: Array<number | null>;
	activeSeriesIndex: number | null;
	uPlotInstance: uPlot;
	yAxisUnit: string;
	decimalPrecision?: PrecisionOption;
	isStackedBarChart?: boolean;
	syncedSeriesIndexes?: number[] | null;
	syncFilterMode?: SyncTooltipFilterMode;
}): TooltipContentItem[] {
	const items: TooltipContentItem[] = [];
	const matchedIndexes =
		syncedSeriesIndexes != null ? new Set(syncedSeriesIndexes) : null;
	const filterMode = syncFilterMode ?? SyncTooltipFilterMode.Filtered;
	// In Filtered mode the matched indexes act as a whitelist; in All mode every
	// series renders and matched indexes only drive row highlighting.
	const allowedIndexes =
		filterMode === SyncTooltipFilterMode.All ? null : matchedIndexes;

	for (let seriesIndex = 1; seriesIndex < series.length; seriesIndex += 1) {
		const seriesItem = series[seriesIndex];
		if (!seriesItem?.show) {
			continue;
		}
		if (allowedIndexes != null && !allowedIndexes.has(seriesIndex)) {
			continue;
		}

		const dataIndex = dataIndexes[seriesIndex];
		const isSync = allowedIndexes != null;
		const isHighlighted = matchedIndexes?.has(seriesIndex) ?? false;

		if (dataIndex === null) {
			if (isSync) {
				items.push({
					label: String(seriesItem.label ?? ''),
					value: 0,
					tooltipValue: 'No Data',
					color: resolveSeriesColor(seriesItem.stroke, uPlotInstance, seriesIndex),
					isActive: false,
					isHighlighted,
				});
			}
			continue;
		}

		const baseValue = getTooltipBaseValue({
			data,
			index: seriesIndex,
			dataIndex,
			isStackedBarChart,
			series,
		});

		if (Number.isFinite(baseValue) && baseValue !== null) {
			items.push({
				label: String(seriesItem.label ?? ''),
				value: baseValue,
				tooltipValue: getToolTipValue(baseValue, yAxisUnit, decimalPrecision),
				color: resolveSeriesColor(seriesItem.stroke, uPlotInstance, seriesIndex),
				isActive: seriesIndex === activeSeriesIndex,
				isHighlighted,
			});
		} else if (isSync) {
			items.push({
				label: String(seriesItem.label ?? ''),
				value: 0,
				tooltipValue: 'No Data',
				color: resolveSeriesColor(seriesItem.stroke, uPlotInstance, seriesIndex),
				isActive: false,
				isHighlighted,
			});
		}
	}

	return items;
}
