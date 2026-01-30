import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot, { AlignedData, Series } from 'uplot';

import { TooltipContentItem } from '../types';

const FALLBACK_SERIES_COLOR = '#000000';

export function resolveSeriesColor(
	stroke: Series.Stroke | undefined,
	u: uPlot,
	seriesIdx: number,
): string {
	if (typeof stroke === 'function') {
		return String(stroke(u, seriesIdx));
	}
	if (typeof stroke === 'string') {
		return stroke;
	}
	return FALLBACK_SERIES_COLOR;
}

export function buildTooltipContent({
	data,
	series,
	dataIdxs,
	activeSeriesIdx,
	u,
	yAxisUnit,
	decimalPrecision,
}: {
	data: AlignedData;
	series: Series[];
	dataIdxs: Array<number | null>;
	activeSeriesIdx: number | null;
	u: uPlot;
	yAxisUnit: string;
	decimalPrecision?: PrecisionOption;
}): TooltipContentItem[] {
	const active: TooltipContentItem[] = [];
	const rest: TooltipContentItem[] = [];

	for (let idx = 1; idx < series.length; idx += 1) {
		const s = series[idx];
		if (!s?.show) {
			continue;
		}

		const dataIdx = dataIdxs[idx];
		// Skip series with no data at the current cursor position
		if (dataIdx === null || dataIdx === undefined) {
			continue;
		}

		const raw = data[idx]?.[dataIdx];
		const value = Number(raw);
		const isActive = idx === activeSeriesIdx;

		const item: TooltipContentItem = {
			label: String(s.label ?? ''),
			value: Number.isNaN(value) ? 0 : value,
			tooltipValue: getToolTipValue(value, yAxisUnit, decimalPrecision),
			color: resolveSeriesColor(s.stroke, u, idx),
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
