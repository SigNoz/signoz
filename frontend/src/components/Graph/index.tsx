import Chart, { ChartOptions } from 'chart.js';
import React, { useCallback, useEffect, useRef } from 'react';

const Graph = ({ data, type, stepX, stepY }: GraphProps): JSX.Element => {
	const chartRef = useRef<HTMLCanvasElement>(null);
	// const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
	const lineChartRef = useRef<Chart>();

	const buildChart = useCallback(() => {
		if (lineChartRef.current !== undefined) {
			lineChartRef.current.destroy();
		}

		if (chartRef.current !== null) {
			// const charContext = chartRef.current.getContext("2d");

			const toolTipOptions: Chart.ChartTooltipOptions = {
				enabled: true,
			};
			const options: ChartOptions = {
				responsive: true,
				maintainAspectRatio: true,
				scales: {
					xAxes: [
						{
							display: true,
							ticks: {
								stepSize: stepX,
							},
						},
					],
					yAxes: [
						{
							display: true,
							ticks: {
								stepSize: stepY,
							},
							gridLines: {
								display: true,
							},
						},
					],
				},
				tooltips: toolTipOptions,
				legend: {
					display: true,
					fullWidth: true,
				},
				showLines: true,
				spanGaps: true,
			};

			lineChartRef.current = new Chart(chartRef.current, {
				type: type,
				data: data,
				options,
			});
		}
	}, [chartRef, data.datasets?.length]);

	useEffect(() => {
		buildChart();
	}, [data.datasets?.length]);

	return <canvas ref={chartRef} />;
};

interface GraphProps {
	type: Chart.ChartType;
	data: Chart.ChartData;
	stepX?: number;
	stepY?: number;
}

export default Graph;
