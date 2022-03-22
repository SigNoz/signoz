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

import { legend } from './Plugin';
import { LegendsContainer } from './styles';
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

function Graph({
	animate = true,
	data,
	type,
	title,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit = 'short',
	forceReRender,
}: GraphProps): JSX.Element {
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
				animation: {
					duration: animate ? 200 : 0,
				},
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					title: {
						display: title !== undefined,
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
								millisecond: 'HH:mm:ss',
								second: 'HH:mm:ss',
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
							callback(value, index, ticks) {
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
				type,
				data,
				options,
				plugins: [legend(name, data.datasets.length > 3)],
			});
		}
	}, [
		animate,
		title,
		getGridColor,
		xAxisTimeUnit?.unitName,
		xAxisTimeUnit?.stepSize,
		isStacked,
		type,
		data,
		name,
		yAxisUnit,
		onClickHandler,
	]);

	useEffect(() => {
		buildChart();
	}, [buildChart, forceReRender]);

	return (
		<div style={{ height: '85%' }}>
			<canvas ref={chartRef} />
			<LegendsContainer id={name} />
		</div>
	);
}

interface GraphProps {
	animate?: boolean;
	type: ChartType;
	data: Chart['data'];
	title?: string;
	isStacked?: boolean;
	label?: string[];
	onClickHandler?: graphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	forceReRender?: boolean | null | number;
}

export type graphOnClickHandler = (
	event: ChartEvent,
	elements: ActiveElement[],
	chart: Chart,
	data: ChartData,
) => void;

export default Graph;
