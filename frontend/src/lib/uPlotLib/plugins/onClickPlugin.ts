/* eslint-disable sonarjs/cognitive-complexity */
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

// Helper function to get the focused/highlighted series at a specific position
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
	const top = e.clientY - bbox.top;

	const timestampIndex = u.posToIdx(left);
	let focusedSeriesIndex = -1;
	let closestPixelDiff = Infinity;

	// Check all series (skip index 0 which is the x-axis)
	for (let i = 1; i < u.data.length; i++) {
		const series = u.data[i];
		const seriesValue = series[timestampIndex];

		if (
			seriesValue !== undefined &&
			seriesValue !== null &&
			!Number.isNaN(seriesValue)
		) {
			const seriesYPx = u.valToPos(seriesValue, 'y');
			const pixelDiff = Math.abs(seriesYPx - top);

			if (pixelDiff < closestPixelDiff) {
				closestPixelDiff = pixelDiff;
				focusedSeriesIndex = i;
			}
		}
	}

	// If we found a focused series, return its data
	if (focusedSeriesIndex > 0) {
		const series = u.series[focusedSeriesIndex];
		const seriesValue = u.data[focusedSeriesIndex][timestampIndex];

		// Ensure we have a valid value
		if (
			seriesValue !== undefined &&
			seriesValue !== null &&
			!Number.isNaN(seriesValue)
		) {
			// Get color - try series stroke first, then generate based on label
			let color = '#000000';
			if (typeof series.stroke === 'string') {
				color = series.stroke;
			} else if (typeof series.fill === 'string') {
				color = series.fill;
			} else {
				// Generate color based on series label (like the tooltip plugin does)
				const seriesLabel = series.label || `Series ${focusedSeriesIndex}`;
				color = generateColor(seriesLabel, themeColors.chartcolors);
			}

			return {
				seriesIndex: focusedSeriesIndex,
				seriesName: series.label || `Series ${focusedSeriesIndex}`,
				value: seriesValue as number,
				color,
				show: series.show !== false,
				isFocused: true, // This indicates it's the highlighted/bold one
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
				const focusedSeries = getFocusedSeriesAtPosition(event, u);

				let metric = {};
				const { series } = u;
				const apiResult = opts.apiResponse?.data?.result || [];
				const outputMetric = {
					queryName: '',
					inFocusOrNot: false,
				};

				// this is to get the metric value of the focused series
				if (Array.isArray(series) && series.length > 0) {
					series.forEach((item, index) => {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						if (item?.show && item?._focus) {
							console.log('>> outputMetric', apiResult[index - 1]);

							const { metric: focusedMetric, queryName } = apiResult[index - 1] || [];
							metric = focusedMetric;
							outputMetric.queryName = queryName;
							outputMetric.inFocusOrNot = true;
						}
					});
				}

				if (!outputMetric.queryName) {
					// Get the focused series data
					const focusedSeriesData = getFocusedSeriesAtPosition(event, u);

					// If we found a valid focused series, get its data
					if (
						focusedSeriesData &&
						focusedSeriesData.seriesIndex <= apiResult.length
					) {
						console.log(
							'>> outputMetric',
							apiResult[focusedSeriesData.seriesIndex - 1],
						);
						const { metric: focusedMetric, queryName } =
							apiResult[focusedSeriesData.seriesIndex - 1] || [];
						metric = focusedMetric;
						outputMetric.queryName = queryName;
						outputMetric.inFocusOrNot = true;
					}
				}

				const axesData = {
					xAxis: u.axes[0],
					yAxis: u.axes[1],
				};

				console.log('>> graph click', {
					xValue,
					yValue,
					mouseX,
					mouseY,
					metric,
					outputMetric,
					absoluteMouseX,
					absoluteMouseY,
					axesData,
					focusedSeries,
				});

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
					focusedSeries,
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
