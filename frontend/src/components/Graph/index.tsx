import {
	ActiveElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	ChartData,
	ChartEvent,
	ChartOptions,
	ChartType,
	Decimation,
	Filler,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	SubTitle,
	TimeScale,
	TimeSeriesScale,
	Title,
	Tooltip,
} from 'chart.js';
import * as chartjsAdapter from 'chartjs-adapter-date-fns';
import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { useXAxisTimeUnit } from './xAxisConfig';
import { getYAxisFormattedValue } from './yAxisConfig';

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
import { legend } from './Plugin';
import { LegendsContainer } from './styles';

const Graph = ({
	data,
	type,
	title,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit = 'short',
}: GraphProps): JSX.Element => {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const chartRef = useRef<HTMLCanvasElement>(null);
	const currentTheme = isDarkMode ? 'dark' : 'light';

	const xAxisTimeUnit = useXAxisTimeUnit(data); // Computes the relevant time unit for x axis by analyzing the time stamp data

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
						display: false,
					},
				},
				layout: {
					padding: 0,
				},
				scales: {
					x: {
						grid: {
							display: true,
							color: getGridColor(),
						},
						adapters: {
							date: chartjsAdapter,
						},
						time: {
							unit: xAxisTimeUnit?.unitName || 'minute',
							stepSize: xAxisTimeUnit?.stepSize || 1,
							displayFormats: {
								millisecond: 'hh:mm:ss',
								second: 'hh:mm:ss',
								minute: 'HH:mm',
								hour: 'MM/dd HH:mm',
								day: 'MM/dd',
								week: 'MM/dd',
								month: 'yy-MM',
								year: 'yy',
							},
						},
						type: 'time',
					},
					y: {
						display: true,
						grid: {
							display: true,
							color: getGridColor(),
						},
						ticks: {
							// Include a dollar sign in the ticks
							callback: function (value, index, ticks) {
								return getYAxisFormattedValue(value, yAxisUnit);
							},
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
				onClick: (event, element, chart) => {
					if (onClickHandler) {
						onClickHandler(event, element, chart, data);
					}
				},
			};

			lineChartRef.current = new Chart(chartRef.current, {
				type: type,
				data: data,
				options,
				plugins: [legend(name, data.datasets.length > 3)],
			});
		}
	}, [chartRef, data, type, title, isStacked, getGridColor, onClickHandler]);

	useEffect(() => {
		buildChart();
	}, [buildChart]);

	return (
		<div style={{ height: '85%' }}>
			<canvas ref={chartRef} />
			<LegendsContainer id={name} />
		</div>
	);
};

interface GraphProps {
	type: ChartType;
	data: Chart['data'];
	title?: string;
	isStacked?: boolean;
	label?: string[];
	onClickHandler?: graphOnClickHandler;
	name: string;
	yAxisUnit?: string;
}

export type graphOnClickHandler = (
	event: ChartEvent,
	elements: ActiveElement[],
	chart: Chart,
	data: ChartData,
) => void;

export default Graph;
