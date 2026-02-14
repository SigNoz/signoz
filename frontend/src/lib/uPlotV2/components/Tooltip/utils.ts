import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot, { AlignedData, Series } from 'uplot';

import { TooltipContentItem } from '../types';

const FALLBACK_SERIES_COLOR = '#000000';

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
		let nextVisibleIdx = -1;
		for (let j = index + 1; j < series.length; j++) {
			if (series[j]?.show) {
				nextVisibleIdx = j;
				break;
			}
		}
		if (nextVisibleIdx >= 1) {
			const nextValue = data[nextVisibleIdx][dataIndex] ?? 0;
			baseValue = baseValue - nextValue;
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
	const active: TooltipContentItem[] = [];
	const rest: TooltipContentItem[] = [];

	for (let index = 1; index < series.length; index += 1) {
		const s = series[index];
		if (!s?.show) {
			continue;
		}

		const dataIndex = dataIndexes[index];
		// Skip series with no data at the current cursor position
		if (dataIndex === null) {
			continue;
		}

		const baseValue = getTooltipBaseValue({
			data,
			index,
			dataIndex,
			isStackedBarChart,
			series,
		});

		const isActive = index === activeSeriesIndex;

		if (Number.isFinite(baseValue) && baseValue !== null) {
			const item: TooltipContentItem = {
				label: String(s.label ?? ''),
				value: baseValue,
				tooltipValue: getToolTipValue(baseValue, yAxisUnit, decimalPrecision),
				color: resolveSeriesColor(s.stroke, uPlotInstance, index),
				isActive,
			};

			if (isActive) {
				active.push(item);
			} else {
				rest.push(item);
			}
		}
	}

	return [...active, ...rest];
}
