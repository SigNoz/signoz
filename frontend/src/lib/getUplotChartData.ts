import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { Dimensions } from 'hooks/useDimensions';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import getLabelName from './getLabelName';
import { colors } from './getRandomColor';
import { placement } from './uPlotLib/placement';

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
): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.data.result || [];

	for (let i = 0; i < seriesList?.length; i += 1) {
		const color = colors[i % colors.length]; // Use modulo to loop through colors if there are more series than colors

		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i] || {};

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const series: uPlot.Series = {
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
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	onDragSelect: (startTime: number, endTime: number) => void;
	yAxisUnit?: string;
	widgetMetaData?: QueryData[];
}

const createDivsFromArray = (
	data: any[],
	idx: string | number,
	yAxisUnit?: string,
): HTMLElement => {
	const container = document.createElement('div');
	container.classList.add('tooltip-container');

	if (Array.isArray(data) && data.length > 0) {
		data.forEach((item, index) => {
			const div = document.createElement('div');
			div.classList.add('tooltip-content-row');

			if (index === 0) {
				div.textContent = new Date(item[idx] * 1000).toDateString();
			} else {
				const color = colors[(index - 1) % colors.length];

				const squareBox = document.createElement('div');

				squareBox.style.width = '10px';
				squareBox.style.height = '10px';
				squareBox.style.backgroundColor = color;

				div.appendChild(squareBox);

				const text = document.createElement('div');

				text.textContent = getToolTipValue(item[idx], yAxisUnit);
				text.style.color = color;

				div.appendChild(text);
			}

			container.appendChild(div);
		});
	}

	return container;
};

const tooltipPlugin = (yAxisUnit?: string): any => {
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
						const content = createDivsFromArray(u.data, idx, yAxisUnit);
						overlay.appendChild(content);
						placement(overlay, anchor, 'right', 'start', { bound });
					}
				}
			},
		},
	};
};

export const getUPlotChartOptions = ({
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
	yAxisUnit,
}: GetUPlotChartOptions): uPlot.Options => ({
	width: dimensions.width,
	height: dimensions.height - 50,
	legend: {
		show: true,
		live: false,
	},
	focus: {
		alpha: 1,
	},
	cursor: {
		show: true,
		focus: {
			prox: 1e6,
			bias: 1,
		},
		drag: {
			// setScale: true, // Allow zooming using selection
			setScale: false,
			x: true,
			y: false,
		},
		sync: {
			key: 'select',
		},
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

	plugins: [tooltipPlugin(yAxisUnit)],
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
	series: getSeries(apiResponse, apiResponse?.data.result),
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
