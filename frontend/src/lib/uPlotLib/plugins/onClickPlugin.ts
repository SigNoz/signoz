/* eslint-disable sonarjs/cognitive-complexity */
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { TimeSeriesData } from 'types/api/v5/queryRange';

function isSeriesValueValid(seriesValue: number | undefined | null): boolean {
	return (
		seriesValue !== undefined &&
		seriesValue !== null &&
		!Number.isNaN(seriesValue)
	);
}

// Helper function to get the focused/highlighted series at a specific position
function resolveSeriesColor(series: uPlot.Series, index: number): string {
	let color = '#000000';
	if (typeof series.stroke === 'string') {
		color = series.stroke;
	} else if (typeof series.fill === 'string') {
		color = series.fill;
	} else {
		const seriesLabel = series.label || `Series ${index}`;
		const isDarkMode = !document.body.classList.contains('lightMode');
		color = generateColor(
			seriesLabel,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		);
	}
	return color;
}

function getPreferredSeriesIndex(
	u: uPlot,
	timestampIndex: number,
	e: MouseEvent,
): number {
	const bbox = u.over.getBoundingClientRect();
	const top = e.clientY - bbox.top;
	// Prefer series explicitly marked as focused
	for (let i = 1; i < u.series.length; i++) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const isSeriesFocused = u.series[i]?._focus === true;
		const isSeriesShown = u.series[i].show !== false;
		const seriesValue = u.data[i]?.[timestampIndex];
		if (isSeriesFocused && isSeriesShown && isSeriesValueValid(seriesValue)) {
			return i;
		}
	}

	// Fallback: choose series with Y closest to mouse position
	let focusedSeriesIndex = -1;
	let closestPixelDiff = Infinity;
	for (let i = 1; i < u.series.length; i++) {
		const series = u.data[i];
		const seriesValue = series?.[timestampIndex];

		if (isSeriesValueValid(seriesValue) && u.series[i].show !== false) {
			const yPx = u.valToPos(seriesValue as number, 'y');
			const diff = Math.abs(yPx - top);
			if (diff < closestPixelDiff) {
				closestPixelDiff = diff;
				focusedSeriesIndex = i;
			}
		}
	}

	return focusedSeriesIndex;
}

export const getFocusedSeriesAtPosition = (
	e: MouseEvent,
	u: uPlot,
): {
	seriesIndex: number;
	seriesName: string;
	value: number;
	color: string;
	show: boolean;
	isFocused: boolean;
} | null => {
	const bbox = u.over.getBoundingClientRect();
	const left = e.clientX - bbox.left;

	const timestampIndex = u.posToIdx(left);
	const preferredIndex = getPreferredSeriesIndex(u, timestampIndex, e);

	if (preferredIndex > 0) {
		const series = u.series[preferredIndex];
		const seriesValue = u.data[preferredIndex][timestampIndex];
		if (isSeriesValueValid(seriesValue)) {
			const color = resolveSeriesColor(series, preferredIndex);
			return {
				seriesIndex: preferredIndex,
				seriesName: series.label || `Series ${preferredIndex}`,
				value: seriesValue as number,
				color,
				show: series.show !== false,
				isFocused: true,
			};
		}
	}

	return null;
};

const getClickCoordinates = (
	u: uPlot,
	event: MouseEvent,
): {
	mouseX: number;
	mouseY: number;
	absoluteMouseX: number;
	absoluteMouseY: number;
	xValue: number;
	yValue: number;
} => ({
	mouseX: event.offsetX + 40,
	mouseY: event.offsetY + 40,
	absoluteMouseX: event.clientX,
	absoluteMouseY: event.clientY,
	xValue: u.posToVal(event.offsetX, 'x'),
	yValue: u.posToVal(event.offsetY, 'y'),
});

const getAxesData = (u: uPlot): { xAxis: any; yAxis: any } => ({
	xAxis: u.axes[0],
	yAxis: u.axes[1],
});

const getActualDataTimestamp = (
	u: uPlot,
	event: MouseEvent,
	fallbackTimestamp: number,
): number => {
	const dataIndex = u.posToIdx(event.offsetX);
	const timestamp = u.data?.[0]?.[dataIndex];
	return timestamp !== undefined ? (timestamp as number) : fallbackTimestamp;
};

const getFocusedMetricData = (
	focusedSeriesData: ReturnType<typeof getFocusedSeriesAtPosition>,
	apiResult: Array<{ metric?: Record<string, string>; queryName?: string }>,
): {
	metric: Record<string, string>;
	outputMetric: { queryName: string; inFocusOrNot: boolean };
} => {
	const outputMetric = { queryName: '', inFocusOrNot: false };
	if (focusedSeriesData && focusedSeriesData.seriesIndex <= apiResult.length) {
		const { metric: focusedMetric, queryName } =
			apiResult[focusedSeriesData.seriesIndex - 1] || {};
		return {
			metric: focusedMetric || {},
			outputMetric: { queryName: queryName || '', inFocusOrNot: true },
		};
	}

	return { metric: {}, outputMetric };
};

const getHeatmapMetric = (
	heatmapTimeSeriesData: TimeSeriesData,
): { metric: Record<string, string>; queryName: string } => {
	const series = heatmapTimeSeriesData.aggregations?.[0]?.series?.[0];
	const metric: Record<string, string> = {};
	if (Array.isArray(series?.labels)) {
		series.labels.forEach((label: any) => {
			if (label?.key?.name && label?.value !== undefined) {
				metric[label.key.name] = String(label.value);
			}
		});
	} else if (series?.labels && typeof series.labels === 'object') {
		Object.entries(series.labels).forEach(([key, value]) => {
			metric[key] = String(value);
		});
	}

	return { metric, queryName: heatmapTimeSeriesData.queryName || '' };
};

const getHeatmapCellAtCursor = (
	u: uPlot,
	coords: ReturnType<typeof getClickCoordinates>,
	bucketLabels: string[],
): {
	bucketIdx: number;
	timestampSec: number;
	count: number;
} | null => {
	const yData = u.data[1] as any;
	const ys = yData as number[];
	const xs = yData?.xs as number[];
	const counts = yData?.counts as number[];

	if (!xs || !ys || !counts || xs.length === 0 || ys.length === 0) {
		return null;
	}

	const dlen = xs.length;
	const yBinQty = dlen - ys.lastIndexOf(ys[0]);
	if (!yBinQty || yBinQty <= 0) {
		return null;
	}
	const xBinQty = dlen / yBinQty;
	const xBinIncr = xs[yBinQty] - xs[0];
	const bucketSizeSec = Number.isFinite(xBinIncr) && xBinIncr > 0 ? xBinIncr : 0;

	const bucketIdx = Math.floor(coords.yValue);
	if (bucketIdx < 0 || bucketIdx >= bucketLabels.length) {
		return null;
	}

	const scaleMin = (u.scales.x as any)?.min;
	const xStart = Number.isFinite(scaleMin) ? (scaleMin as number) : xs[0];
	let timeIdx = 0;
	if (bucketSizeSec > 0) {
		timeIdx = Math.floor((coords.xValue - xStart) / bucketSizeSec);
	}
	if (timeIdx < 0) {
		timeIdx = 0;
	}
	if (timeIdx >= xBinQty) {
		timeIdx = xBinQty - 1;
	}

	const bucketStartSec = xStart + timeIdx * bucketSizeSec;
	const eps = 1e-6;
	let dataTimeIdx = -1;
	for (let i = 0; i < xBinQty; i++) {
		const timeVal = xs[i * yBinQty];
		if (Math.abs(timeVal - bucketStartSec) < eps) {
			dataTimeIdx = i;
			break;
		}
	}

	const count =
		dataTimeIdx >= 0 ? counts[dataTimeIdx * yBinQty + bucketIdx] || 0 : 0;

	return { bucketIdx, timestampSec: bucketStartSec, count };
};

const handleHeatmapClick = (
	opts: OnClickPluginOpts,
	u: uPlot,
	coords: ReturnType<typeof getClickCoordinates>,
	axesData: { xAxis: any; yAxis: any },
): boolean => {
	if (!opts.isHeatmap || !opts.heatmapTimeSeriesData || !opts.bucketLabels) {
		return false;
	}

	const cell = getHeatmapCellAtCursor(u, coords, opts.bucketLabels);
	if (cell) {
		const { metric, queryName } = getHeatmapMetric(opts.heatmapTimeSeriesData);
		metric.clickedTimestamp = String(cell.timestampSec);

		// Add range filters for heatmap drill-down
		const bounds = opts.heatmapBounds;
		if (
			opts.aggregateAttributeKey &&
			bounds &&
			cell.bucketIdx >= 0 &&
			cell.bucketIdx < bounds.length - 1
		) {
			const fieldNames = opts.aggregateAttributeKey
				.split(',')
				.map((f) => f.trim());
			for (const fieldName of fieldNames) {
				metric[`${fieldName}_min`] = String(bounds[cell.bucketIdx]);
				metric[`${fieldName}_max`] = String(bounds[cell.bucketIdx + 1]);
			}
		}

		const outputMetric = { queryName, inFocusOrNot: true };
		const focusedSeries = {
			seriesIndex: 1,
			seriesName: opts.bucketLabels[cell.bucketIdx] || '',
			value: cell.count,
			color: '',
			show: true,
			isFocused: true,
		};

		opts.onClick(
			cell.timestampSec,
			cell.bucketIdx,
			coords.mouseX,
			coords.mouseY,
			metric,
			outputMetric,
			coords.absoluteMouseX,
			coords.absoluteMouseY,
			axesData,
			focusedSeries,
		);

		return true;
	}

	return false;
};
export interface OnClickPluginOpts {
	onClick: (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		data?: {
			[key: string]: string;
		},
		queryData?: {
			queryName: string;
			inFocusOrNot: boolean;
		},
		absoluteMouseX?: number,
		absoluteMouseY?: number,
		axesData?: {
			xAxis: any;
			yAxis: any;
		},
		focusedSeries?: {
			seriesIndex: number;
			seriesName: string;
			value: number;
			color: string;
			show: boolean;
			isFocused: boolean;
		} | null,
	) => void;
	apiResponse?: MetricRangePayloadProps;
	isHeatmap?: boolean;
	bucketLabels?: string[];
	heatmapBounds?: number[];
	heatmapTimeSeriesData?: TimeSeriesData;
	aggregateAttributeKey?: string;
}

function onClickPlugin(opts: OnClickPluginOpts): uPlot.Plugin {
	let handleClick: (event: MouseEvent) => void;

	const hooks: uPlot.Plugin['hooks'] = {
		init: (u: uPlot) => {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			handleClick = function (event: MouseEvent) {
				const coords = getClickCoordinates(u, event);
				const axesData = getAxesData(u);

				if (handleHeatmapClick(opts, u, coords, axesData)) {
					return;
				}

				// Standard time-series click handling
				const focusedSeriesData = getFocusedSeriesAtPosition(event, u);
				const apiResult = (opts.apiResponse?.data?.result || []) as Array<{
					metric?: Record<string, string>;
					queryName?: string;
				}>;
				const { metric, outputMetric } = getFocusedMetricData(
					focusedSeriesData,
					apiResult,
				);
				const actualDataTimestamp = getActualDataTimestamp(u, event, coords.xValue);

				const metricWithTimestamp = {
					...metric,
					clickedTimestamp: actualDataTimestamp.toString(),
				};

				opts.onClick(
					coords.xValue,
					coords.yValue,
					coords.mouseX,
					coords.mouseY,
					metricWithTimestamp,
					outputMetric,
					coords.absoluteMouseX,
					coords.absoluteMouseY,
					axesData,
					focusedSeriesData,
				);
			};
			u.over.addEventListener('click', handleClick);
		},
		destroy: (u: uPlot) => {
			u.over.removeEventListener('click', handleClick);
		},
	};

	return {
		hooks,
	};
}

export default onClickPlugin;
