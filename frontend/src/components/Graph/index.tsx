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
import React, { useCallback, useEffect, useRef } from 'react';

const Graph = ({
	data,
	type,
	title,
	isStacked,
	label,
	displayLegend = false,
	xAxisType,
}: GraphProps): JSX.Element => {
	const chartRef = useRef<HTMLCanvasElement>(null);
	// const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
	const lineChartRef = useRef<Chart>();

	const buildChart = useCallback(() => {
		if (lineChartRef.current !== undefined) {
			lineChartRef.current.destroy();
		}

		if (chartRef.current !== null) {
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
						display: displayLegend,
					},
				},
				layout: {
					padding: 0,
				},
				scales: {
					x: {
						animate: true,
						grid: {
							display: true,
							color: 'rgba(231,233,237,0.1)',
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
							color: 'rgba(231,233,237,0.1)',
						},
						type: 'linear',
					},
					stacked: {
						display: isStacked === undefined ? false : 'auto',
					},
				},
			};

			lineChartRef.current = new Chart(chartRef.current, {
				type: type,
				data: data,
				options,
			});
		}
	}, [chartRef, data, type, title, isStacked, label, displayLegend, xAxisType]);

	useEffect(() => {
		buildChart();
	}, [data.datasets?.length, data.labels, buildChart]);

	return <canvas ref={chartRef} />;
};

interface GraphProps {
	type: ChartType;
	data: Chart['data'];
	title?: string;
	isStacked?: boolean;
	label?: string[];
	displayLegend?: boolean;
	xAxisType?: ScaleOptions['type'];
}

export default Graph;
