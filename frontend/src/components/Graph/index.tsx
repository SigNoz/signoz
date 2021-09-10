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
	SubTitle,
	TimeScale,
	TimeSeriesScale,
	Title,
	Tooltip,
} from 'chart.js';
import React, { useCallback, useEffect, useRef } from 'react';

const Graph = ({ data, type, title, isStacked }: GraphProps): JSX.Element => {
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
				},
				layout: {
					padding: 0,
				},

				scales: {
					x: {
						grid: {
							display: true,
							color: 'rgba(231,233,237,0.1)',
						},
					},
					y: {
						display: true,
						grid: {
							display: true,
							color: 'rgba(231,233,237,0.1)',
						},
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
	}, [chartRef, data, type, title, isStacked]);

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
}

export default Graph;
