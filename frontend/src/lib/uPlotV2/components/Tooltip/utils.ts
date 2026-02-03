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

export function buildTooltipContent({
	data,
	series,
	dataIndexes,
	activeSeriesIndex,
	uPlotInstance,
	yAxisUnit,
	decimalPrecision,
}: {
	data: AlignedData;
	series: Series[];
	dataIndexes: Array<number | null>;
	activeSeriesIndex: number | null;
	uPlotInstance: uPlot;
	yAxisUnit: string;
	decimalPrecision?: PrecisionOption;
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

		const raw = data[index]?.[dataIndex];
		const value = Number(raw);
		const displayValue = Number.isNaN(value) ? 0 : value;
		const isActive = index === activeSeriesIndex;

		const item: TooltipContentItem = {
			label: String(s.label ?? ''),
			value: displayValue,
			tooltipValue: getToolTipValue(displayValue, yAxisUnit, decimalPrecision),
			color: resolveSeriesColor(s.stroke, uPlotInstance, index),
			isActive,
		};

		if (isActive) {
			active.push(item);
		} else {
			rest.push(item);
		}
	}

	return [...active, ...rest];
}
