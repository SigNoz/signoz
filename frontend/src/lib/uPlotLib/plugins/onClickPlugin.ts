/* eslint-disable sonarjs/cognitive-complexity */
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { getSeriesIndexFromPixel } from '../utils/getSeriesIndexFromPixel';

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
							const { metric: focusedMetric, queryName } = apiResult[index - 1] || [];
							metric = focusedMetric;
							outputMetric.queryName = queryName;
							outputMetric.inFocusOrNot = true;
						}
					});
				}

				if (!outputMetric.queryName) {
					// // Get the series index based on pixel coordinates
					const seriesIndex = getSeriesIndexFromPixel(event, u);

					// If we found a valid series, get its data
					if (seriesIndex > 0 && seriesIndex <= apiResult.length) {
						const { metric: focusedMetric, queryName } =
							apiResult[seriesIndex - 1] || [];
						metric = focusedMetric;
						outputMetric.queryName = queryName;
						outputMetric.inFocusOrNot = true;
					}
				}

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
