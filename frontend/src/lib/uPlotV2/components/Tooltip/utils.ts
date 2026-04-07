import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot, { AlignedData, Series } from 'uplot';

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
}: {
	data: AlignedData;
	series: Series[];
	dataIndexes: Array<number | null>;
	activeSeriesIndex: number | null;
	uPlotInstance: uPlot;
	yAxisUnit: string;
	decimalPrecision?: PrecisionOption;
	isStackedBarChart?: boolean;
}): TooltipContentItem[] {
	const items: TooltipContentItem[] = [];

	for (let seriesIndex = 1; seriesIndex < series.length; seriesIndex += 1) {
		const seriesItem = series[seriesIndex];
		if (!seriesItem?.show) {
			continue;
		}

		const dataIndex = dataIndexes[seriesIndex];
		// Skip series with no data at the current cursor position
		if (dataIndex === null) {
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
			});
		}
	}

	return items;
}
