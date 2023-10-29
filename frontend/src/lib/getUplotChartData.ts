import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { Dimensions } from 'hooks/useDimensions';
import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import getLabelName from './getLabelName';
import { colors } from './getRandomColor';
import { placement } from './uPlotLib/placement';

export const getUPlotChartData = (
	apiResponse?: MetricRangePayloadV3['data'],
): uPlot.AlignedData => {
	const seriesList = apiResponse?.result[0]?.series || [];

	const uPlotData: uPlot.AlignedData = [];

	uPlotData.push(
		new Float64Array(seriesList[0]?.values?.map((v) => v.timestamp / 1000)),
	);

	seriesList.forEach((series) => {
		const seriesData = new Float64Array(
			series.values.map((v) => parseFloat(v.value)),
		);

		uPlotData.push(seriesData);
	});

	return uPlotData;
};

const getSeries = (
	apiResponse?: MetricRangePayloadV3['data'],
	widgetMetaData: QueryData[] = [],
): uPlot.Options['series'] => {
	const configurations: uPlot.Series[] = [
		{ label: 'Timestamp', stroke: 'purple' },
	];

	const seriesList = apiResponse?.result[0]?.series || [];

	for (let i = 0; i < seriesList?.length; i += 1) {
		const color = colors[i % colors.length]; // Use modulo to loop through colors if there are more series than colors

		const { metric = {}, queryName = '', legend = '' } = widgetMetaData[i];

		const label = getLabelName(
			metric,
			queryName || '', // query
			legend || '',
		);

		const series: uPlot.Series = {
			label,
			stroke: color,
			width: 1.5,
			points: {
				size: 5,
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
	apiResponse?: MetricRangePayloadV3['data'];
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
	widgetMetaData = [],
	yAxisUnit,
}: GetUPlotChartOptions): uPlot.Options => ({
	width: dimensions.width,
	height: dimensions.height - 30,
	legend: {
		live: false,
		isolate: true,
		show: false,
	},
	focus: {
		alpha: 1,
	},
	cursor: {
		focus: {
			prox: 1e6,
			bias: 1,
		},
	},
	padding: [10, 10, 10, 10],
	scales: {
		x: {
			time: true,
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
	series: getSeries(apiResponse, widgetMetaData),
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
				stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
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
				stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
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
