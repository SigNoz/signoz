import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

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
	) => void;
	apiResponse?: MetricRangePayloadProps;
}

function onClickPlugin(opts: OnClickPluginOpts): uPlot.Plugin {
	let handleClick: (event: MouseEvent) => void;

	const hooks: uPlot.Plugin['hooks'] = {
		init: (u: uPlot) => {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			handleClick = function (event: MouseEvent) {
				const mouseX = event.offsetX + 40;
				const mouseY = event.offsetY + 40;

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

				opts.onClick(xValue, yValue, mouseX, mouseY, metric, outputMetric);
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
