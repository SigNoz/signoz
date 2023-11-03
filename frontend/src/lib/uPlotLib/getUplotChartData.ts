import './uPlotLib.styles.scss';

import { getToolTipValue } from 'components/Graph/yAxisConfig';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Dimensions } from 'hooks/useDimensions';
import _noop from 'lodash-es/noop';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import getLabelName from '../getLabelName';
import { colors } from '../getRandomColor';
import { placement } from './placement';

dayjs.extend(customParseFormat);

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadProps,
): uPlot.AlignedData => {
	const seriesList = apiResponse?.data?.result || [];
	const uPlotData: uPlot.AlignedData = [];

	// sort seriesList
	for (let index = 0; index < seriesList.length; index += 1) {
		seriesList[index]?.values?.sort((a, b) => a[0] - b[0]);
	}

	// timestamp
	uPlotData.push(new Float64Array(seriesList[0]?.values?.map((v) => v[0])));

	// for each series, push the values
	seriesList.forEach((series) => {
		const seriesData = series?.values?.map((v) => parseFloat(v[1])) || [];

		uPlotData.push(new Float64Array(seriesData));
	});

	return uPlotData;
};

const getSeries = (
	apiResponse?: MetricRangePayloadProps,
	widgetMetaData: QueryData[] = [],
	graphsVisibilityStates?: boolean[],
): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.data.result || [];

	const newGraphVisibilityStates = graphsVisibilityStates?.slice(1);

	// console.log('seriesList', seriesList);

	for (let i = 0; i < seriesList?.length; i += 1) {
		const color = colors[i % colors.length]; // Use modulo to loop through colors if there are more series than colors

		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i] || {};

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const series: uPlot.Series = {
			show: newGraphVisibilityStates ? newGraphVisibilityStates[i] : true,
			label,
			stroke: color,
			width: 1.5,
			spanGaps: true,
			points: {
				show: false,
			},
		};

		configurations.push(series);
	}

	return configurations;
};

const getGridColor = (isDarkMode: boolean): string => {
	if (isDarkMode) {
		return 'rgba(231,233,237,0.2)';
	}
	return 'rgba(231,233,237,0.8)';
};

interface GetUPlotChartOptions {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	onDragSelect: (startTime: number, endTime: number) => void;
	yAxisUnit?: string;
	onClickHandler?: OnClickPluginOpts['onClick'];
	graphsVisibilityStates?: boolean[];
}

const createDivsFromArray = (
	seriesList: any[],
	data: any[],
	idx: string | number,
	yAxisUnit?: string,
): HTMLElement => {
	const container = document.createElement('div');
	container.classList.add('tooltip-container');

	// console.log('seriesList', seriesList);

	if (Array.isArray(data) && data.length > 0) {
		data.forEach((item, index) => {
			const div = document.createElement('div');
			div.classList.add('tooltip-content-row');

			if (index === 0) {
				const formattedDate = dayjs(item[idx] * 1000).format(
					'MMM DD YYYY HH:mm:ss',
				);

				// console.log('formattedDate', formattedDate);

				div.textContent = formattedDate;
			} else {
				const color = colors[(index - 1) % colors.length];

				if (item[idx]) {
					const squareBox = document.createElement('div');
					squareBox.classList.add('pointSquare');

					squareBox.style.borderColor = color;

					div.appendChild(squareBox);

					const text = document.createElement('div');
					text.classList.add('tooltip-data-point');

					const { metric = {}, queryName = '', legend = '' } =
						seriesList[index - 1] || {};

					const label = getLabelName(
						metric,
						queryName || '', // query
						legend || '',
					);

					// console.log('label', label);

					const tooltipValue = getToolTipValue(item[idx], yAxisUnit);

					text.textContent = `${label} : ${tooltipValue}`;
					text.style.color = color;

					div.appendChild(text);
				}
			}

			container.appendChild(div);
		});
	}

	return container;
};

const tooltipPlugin = (
	apiResponse: MetricRangePayloadProps | undefined,
	yAxisUnit?: string,
): any => {
	let over: HTMLElement;
	let bound: HTMLElement;
	let bLeft: any;
	let bTop: any;

	const syncBounds = (): void => {
		const bbox = over.getBoundingClientRect();
		bLeft = bbox.left;
		bTop = bbox.top;
	};

	let overlay = document.getElementById('overlay');

	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'overlay';
		overlay.style.display = 'none';
		overlay.style.position = 'absolute';
		document.body.appendChild(overlay);
	}

	const seriesList = apiResponse?.data?.result || [];

	return {
		hooks: {
			init: (u: any): void => {
				over = u?.over;
				bound = over;
				over.onmouseenter = (): void => {
					if (overlay) {
						overlay.style.display = 'block';
					}
				};
				over.onmouseleave = (): void => {
					if (overlay) {
						overlay.style.display = 'none';
					}
				};
			},
			setSize: (): void => {
				syncBounds();
			},
			setCursor: (u: {
				cursor: { left: any; top: any; idx: any };
				data: any[];
			}): void => {
				if (overlay) {
					overlay.textContent = '';
					const { left, top, idx } = u.cursor;

					if (idx) {
						const anchor = { left: left + bLeft, top: top + bTop };
						const content = createDivsFromArray(seriesList, u.data, idx, yAxisUnit);
						overlay.appendChild(content);
						placement(overlay, anchor, 'right', 'start', { bound });
					}
				}
			},
		},
	};
};

export interface OnClickPluginOpts {
	onClick: (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
	) => void;
}

function onClickPlugin(opts: OnClickPluginOpts): uPlot.Plugin {
	let handleClick: (event: MouseEvent) => void;

	const hooks: uPlot.Plugin['hooks'] = {
		init: (u: uPlot) => {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			handleClick = function (event: MouseEvent) {
				const mouseX = event.offsetX;
				const mouseY = event.offsetY;

				// Convert pixel positions to data values
				const xValue = u.posToVal(mouseX, 'x');
				const yValue = u.posToVal(mouseY, 'y');

				opts.onClick(xValue, yValue, mouseX, mouseY);
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

export const getUPlotChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
	yAxisUnit,
	onClickHandler = _noop,
	graphsVisibilityStates,
}: GetUPlotChartOptions): uPlot.Options => ({
	id,
	width: dimensions.width,
	height: dimensions.height - 50,
	legend: {
		show: true,
		live: false,
	},
	focus: {
		alpha: 1,
	},
	padding: [10, 10, 10, 10],
	scales: {
		x: {
			time: true,
		},
		y: {
			auto: true,
		},
	},
	plugins: [
		tooltipPlugin(apiResponse, yAxisUnit),
		onClickPlugin({
			onClick: onClickHandler,
		}),
	],
	hooks: {
		setSelect: [
			(self): void => {
				const selection = self.select;
				if (selection) {
					const startTime = self.posToVal(selection.left, 'x');
					const endTime = self.posToVal(selection.left + selection.width, 'x');

					const diff = endTime - startTime;

					if (diff > 0) {
						onDragSelect(startTime * 1000, endTime * 1000);
					}
				}
			},
		],
	},
	series: getSeries(
		apiResponse,
		apiResponse?.data.result,
		graphsVisibilityStates,
	),
	axes: [
		{
			// label: 'Date',
			stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
			grid: {
				stroke: getGridColor(isDarkMode), // Color of the grid lines
				dash: [10, 10], // Dash pattern for grid lines,
				width: 0.5, // Width of the grid lines,
				show: true,
			},
			ticks: {
				// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
				width: 0.3, // Width of the tick lines,
				show: true,
			},
			gap: 5,
		},
		{
			// label: 'Value',
			stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
			grid: {
				stroke: getGridColor(isDarkMode), // Color of the grid lines
				dash: [10, 10], // Dash pattern for grid lines,
				width: 0.3, // Width of the grid lines
			},
			ticks: {
				// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
				width: 0.3, // Width of the tick lines
				show: true,
			},
			values: (_, t): string[] =>
				t.map((v) => {
					const value = getToolTipValue(v.toString(), yAxisUnit);

					return `${value}`;
				}),
			gap: 5,
		},
	],
});
