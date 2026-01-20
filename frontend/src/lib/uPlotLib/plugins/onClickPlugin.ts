/* eslint-disable sonarjs/cognitive-complexity */
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

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
}

function onClickPlugin(opts: OnClickPluginOpts): uPlot.Plugin {
	let handleClick: (event: MouseEvent) => void;

	const hooks: uPlot.Plugin['hooks'] = {
		init: (u: uPlot) => {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			handleClick = function (event: MouseEvent) {
				// relative coordinates
				const mouseX = event.offsetX + 40;
				const mouseY = event.offsetY + 40;

				// absolute coordinates
				const absoluteMouseX = event.clientX;
				const absoluteMouseY = event.clientY;

				// Convert pixel positions to data values
				// do not use mouseX and mouseY here as it offsets the timestamp as well
				const xValue = u.posToVal(event.offsetX, 'x');
				const yValue = u.posToVal(event.offsetY, 'y');

				// Get the focused/highlighted series (the one that would be bold in hover)
				const focusedSeriesData = getFocusedSeriesAtPosition(event, u);

				let metric = {};
				const apiResult = opts.apiResponse?.data?.result || [];
				const outputMetric = {
					queryName: '',
					inFocusOrNot: false,
				};

				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				if (
					focusedSeriesData &&
					focusedSeriesData.seriesIndex <= apiResult.length
				) {
					const { metric: focusedMetric, queryName } =
						apiResult[focusedSeriesData.seriesIndex - 1] || {};
					metric = focusedMetric;
					outputMetric.queryName = queryName;
					outputMetric.inFocusOrNot = true;
				}

				// Get the actual data point timestamp from the focused series
				let actualDataTimestamp = xValue; // fallback to click position timestamp
				if (focusedSeriesData) {
					// Get the data index from the focused series
					const dataIndex = u.posToIdx(event.offsetX);
					// Get the actual timestamp from the x-axis data (u.data[0])
					if (u.data[0] && u.data[0][dataIndex] !== undefined) {
						actualDataTimestamp = u.data[0][dataIndex];
					}
				}

				metric = {
					...metric,
					clickedTimestamp: actualDataTimestamp,
				};

				const axesData = {
					xAxis: u.axes[0],
					yAxis: u.axes[1],
				};

				opts.onClick(
					xValue,
					yValue,
					mouseX,
					mouseY,
					metric,
					outputMetric,
					absoluteMouseX,
					absoluteMouseY,
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
