import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	ChartOptions,
	ChartType,
	Decimation,
	Filler,
	Legend,
	// LegendItem,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	ScaleOptions,
	SubTitle,
	TimeScale,
	TimeSeriesScale,
	Title,
	Tooltip,
} from 'chart.js';
import chartjsAdapter from 'chartjs-adapter-date-fns';
// import { colors } from 'lib/getRandomColor';
// import stringToHTML from 'lib/stringToHTML';
import React, { useCallback, useEffect, useRef } from 'react';
import { useThemeSwitcher } from 'react-css-theme-switcher';

// import Legends from './Legend';
// import { LegendsContainer } from './styles';
Chart.register(
	LineElement,
	PointElement,
	LineController,
	CategoryScale,
	LinearScale,
	TimeScale,
	TimeSeriesScale,
	Decimation,
	Filler,
	Legend,
	Title,
	Tooltip,
	SubTitle,
	BarController,
	BarElement,
);

const Graph = ({
	data,
	type,
	title,
	isStacked,
	label,
	xAxisType,
	onClickHandler,
}: GraphProps): JSX.Element => {
	const chartRef = useRef<HTMLCanvasElement>(null);
	const { currentTheme } = useThemeSwitcher();

	// const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
	const lineChartRef = useRef<Chart>();

	const getGridColor = useCallback(() => {
		if (currentTheme === undefined) {
			return 'rgba(231,233,237,0.1)';
		}

		if (currentTheme === 'dark') {
			return 'rgba(231,233,237,0.1)';
		}

		return 'rgba(231,233,237,0.8)';
	}, [currentTheme]);

	const buildChart = useCallback(() => {
		if (lineChartRef.current !== undefined) {
			lineChartRef.current.destroy();
		}

		if (chartRef.current !== null) {
			const options: ChartOptions = {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					title: {
						display: title === undefined ? false : true,
						text: title,
					},
					legend: {
						// just making sure that label is present
						display: !(
							data.datasets.find((e) => e.label !== undefined) === undefined
						),
						labels: {
							usePointStyle: true,
							pointStyle: 'circle',
						},
						position: 'bottom',
						// labels: {
						// 	generateLabels: (chart: Chart): LegendItem[] => {
						// 		return (data.datasets || []).map((e, index) => {
						// 			return {
						// 				text: e.label || '',
						// 				datasetIndex: index,
						// 			};
						// 		});
						// 	},
						// 	pointStyle: 'circle',
						// 	usePointStyle: true,
						// },
					},
				},
				layout: {
					padding: 0,
				},
				scales: {
					x: {
						animate: false,
						grid: {
							display: true,
							color: getGridColor(),
						},
						labels: label,
						adapters: {
							date: chartjsAdapter,
						},
						type: xAxisType,
					},
					y: {
						display: true,
						grid: {
							display: true,
							color: getGridColor(),
						},
					},
					stacked: {
						display: isStacked === undefined ? false : 'auto',
					},
				},
				elements: {
					line: {
						tension: 0,
						cubicInterpolationMode: 'monotone',
					},
				},
				onClick: onClickHandler,
			};

			lineChartRef.current = new Chart(chartRef.current, {
				type: type,
				data: data,
				options,
				// plugins: [
				// 	{
				// 		id: 'htmlLegendPlugin',
				// 		afterUpdate: (chart: Chart): void => {
				// 			if (
				// 				chart &&
				// 				chart.options &&
				// 				chart.options.plugins &&
				// 				chart.options.plugins.legend &&
				// 				chart.options.plugins.legend.labels &&
				// 				chart.options.plugins.legend.labels.generateLabels
				// 			) {
				// 				const labels = chart.options.plugins?.legend?.labels?.generateLabels(
				// 					chart,
				// 				);

				// 				const id = 'htmlLegend';

				// 				const response = document.getElementById(id);

				// 				if (labels && response && response?.childNodes.length === 0) {
				// 					const labelComponent = labels.map((e, index) => {
				// 						return {
				// 							element: Legends({
				// 								text: e.text,
				// 								color: colors[index] || 'white',
				// 							}),
				// 							dataIndex: e.datasetIndex,
				// 						};
				// 					});

				// 					labelComponent.map((e) => {
				// 						const el = stringToHTML(e.element);

				// 						if (el) {
				// 							el.addEventListener('click', () => {
				// 								chart.setDatasetVisibility(
				// 									e.dataIndex,
				// 									!chart.isDatasetVisible(e.dataIndex),
				// 								);
				// 								chart.update();
				// 							});
				// 							response.append(el);
				// 						}
				// 					});
				// 				}
				// 			}
				// 		},
				// 	},
				// ],
			});
		}
	}, [chartRef, data, type, title, isStacked, label, xAxisType, getGridColor]);

	useEffect(() => {
		buildChart();
	}, [buildChart]);

	return (
		<>
			<canvas ref={chartRef} />
			{/* <LegendsContainer id="htmlLegend" /> */}
		</>
	);
};

interface GraphProps {
	type: ChartType;
	data: Chart['data'];
	title?: string;
	isStacked?: boolean;
	label?: string[];
	xAxisType?: ScaleOptions['type'];
	onClickHandler?: ChartOptions['onClick'];
}

export default Graph;
