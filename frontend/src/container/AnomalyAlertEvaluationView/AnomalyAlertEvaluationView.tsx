import 'uplot/dist/uPlot.min.css';
import './AnomalyAlertEvaluationView.styles.scss';

import { Checkbox } from 'antd';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotChartDataForAnomalyDetection } from 'lib/uPlotLib/utils/getUplotChartData';
import { getXAxisScale } from 'lib/uPlotLib/utils/getXAxisScale';
import { getYAxisScaleForAnomalyDetection } from 'lib/uPlotLib/utils/getYAxisScale';
import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';

function UplotChart({
	data,
	options,
	chartRef,
}: {
	data: any;
	options: any;
	chartRef: any;
}): JSX.Element {
	const plotInstance = useRef(null);

	useEffect(() => {
		if (plotInstance.current) {
			plotInstance.current.destroy();
		}

		if (data && data.length > 0) {
			plotInstance.current = new uPlot(options, data, chartRef.current);
		}

		return (): void => {
			if (plotInstance.current) {
				plotInstance.current.destroy();
			}
		};
	}, [data, options, chartRef]);

	return <div ref={chartRef} />;
}

function AnomalyAlertEvaluationView({
	data,
	minTimeScale,
	maxTimeScale,
}: {
	data: any;
	minTimeScale: number | undefined;
	maxTimeScale: number | undefined;
}): JSX.Element {
	const { spline } = uPlot.paths;
	const _spline = spline ? spline() : undefined;
	const chartRef = useRef<HTMLDivElement>(null);

	console.log('AnomalyAlertEvaluationView', data);

	const chartData = getUplotChartDataForAnomalyDetection(data);
	const timeScaleProps = getXAxisScale(minTimeScale, maxTimeScale);

	// Example of dynamic seriesData which can have 0 to N series
	const [seriesData, setSeriesData] = useState(chartData);

	const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	useEffect(() => {
		const seriesKeys = Object.keys(seriesData);
		if (seriesKeys.length === 1) {
			setSelectedSeries(seriesKeys[0]); // Automatically select if only one series
		} else {
			setSelectedSeries(null); // Default to "Show All" if multiple series
		}
	}, [seriesData]);

	const handleSeriesChange = (series: string | null): void => {
		setSelectedSeries(series);
	};

	const bandsPlugin = {
		hooks: {
			draw: [
				(u) => {
					if (!selectedSeries) return;

					const { ctx } = u;
					const upperBandIdx = 3;
					const lowerBandIdx = 4;

					const xData = u.data[0];
					const yUpperData = u.data[upperBandIdx];
					const yLowerData = u.data[lowerBandIdx];

					const strokeStyle =
						u.series[1]?.stroke || seriesData[selectedSeries].color;
					const fillStyle =
						typeof strokeStyle === 'string'
							? strokeStyle.replace(')', ', 0.1)')
							: 'rgba(255, 255, 255, 0.1)';

					ctx.beginPath();
					const firstX = u.valToPos(xData[0], 'x', true);
					const firstUpperY = u.valToPos(yUpperData[0], 'y', true);
					ctx.moveTo(firstX, firstUpperY);

					for (let i = 0; i < xData.length; i++) {
						const x = u.valToPos(xData[i], 'x', true);
						const y = u.valToPos(yUpperData[i], 'y', true);
						ctx.lineTo(x, y);
					}

					for (let i = xData.length - 1; i >= 0; i--) {
						const x = u.valToPos(xData[i], 'x', true);
						const y = u.valToPos(yLowerData[i], 'y', true);
						ctx.lineTo(x, y);
					}

					ctx.closePath();
					ctx.fillStyle = fillStyle;
					ctx.fill();
				},
			],
		},
	};

	const allSeries = Object.keys(seriesData);

	const initialData = allSeries.length
		? [
				seriesData[allSeries[0]].data[0], // Shared X-axis
				...allSeries.map((key) => seriesData[key].data[1]), // Map through Y-axis data for all series
		  ]
		: [];

	const options = {
		title: selectedSeries
			? `Evaluation View - (${selectedSeries})`
			: 'Evaluation View - All',
		width: dimensions.width,
		height: dimensions.height - 86,
		plugins: [bandsPlugin],
		focus: {
			alpha: 0.3,
		},
		series: [
			{
				label: 'Time',
			},
			...(selectedSeries
				? [
						{
							label: `Main Series`,
							stroke: seriesData[selectedSeries].color,
							width: 2,
							show: true,
							paths: _spline,
						},
						{
							label: `Predicted Value`,
							stroke: seriesData[selectedSeries].color,
							width: 1,
							dash: [2, 2],
							show: true,
							paths: _spline,
						},
						{
							label: `Upper Band`,
							stroke: 'transparent',
							show: false,
							paths: _spline,
						},
						{
							label: `Lower Band`,
							stroke: 'transparent',
							show: false,
							paths: _spline,
						},
				  ]
				: allSeries.map((seriesKey) => ({
						label: seriesKey,
						stroke: seriesData[seriesKey].color,
						width: 2,
						show: true,
						paths: _spline,
				  }))),
		],
		scales: {
			x: {
				time: true,
				// ...timeScaleProps,
			},
			y: {
				...getYAxisScaleForAnomalyDetection({
					seriesData,
					selectedSeries,
				}),
			},
			// y: {
			// 	auto: true,
			// 	range: (u, min, max) => [0, max],

			// range: (u, min, max) => {
			// 	// Get the y-values for the main series, predicted series, upper band, and lower band
			// 	const mainSeries = u.series[1].data || [];
			// 	const predictedSeries = u.series[2]?.data || [];
			// 	const upperBound = u.series[3]?.data || [];
			// 	const lowerBound = u.series[4]?.data || [];

			// 	console.log('u', u);

			// 	// Combine all the y-values to find the min and max
			// 	const allYValues = [
			// 		...mainSeries,
			// 		...predictedSeries,
			// 		...upperBound,
			// 		...lowerBound,
			// 	];

			// 	const newMin = Math.min(...allYValues); // Find the minimum value
			// 	const newMax = Math.max(...allYValues); // Find the maximum value

			// 	return [0, max]; // Return the adjusted range
			// },
			// },
		},
		axes: [
			{
				scale: 'x',
				stroke: 'white', // Axis line color
				grid: { stroke: 'rgba(255,255,255,0.1)' }, // Grid lines color
				// ticks: { stroke: 'white' }, // Tick marks color
				// font: '12px Arial', // Font for labels
				// label: 'X-Axis Label',
				size: 50, // Adjust size as needed
			},
			{
				scale: 'y',
				stroke: 'white', // Axis line color
				grid: { stroke: 'rgba(255,255,255,0.1)' }, // Grid lines color
				// ticks: { stroke: 'white' }, // Tick marks color
				// font: '12px Arial', // Font for labels
				// label: 'Y-Axis Label',
				size: 50, // Adjust size as needed
			},
		],
		grid: {
			show: true,
		},
		legend: {
			show: true,
		},
	};

	return (
		<div className="anomaly-alert-evaluation-view">
			<div className="anomaly-alert-evaluation-view-chart-section" ref={graphRef}>
				{allSeries.length > 0 ? (
					<UplotChart
						data={selectedSeries ? seriesData[selectedSeries].data : initialData}
						options={options}
						chartRef={chartRef}
					/>
				) : (
					<p>No data available</p>
				)}
			</div>
			<div className="anomaly-alert-evaluation-view-series-selection">
				{allSeries.length > 1 && (
					<div className="anomaly-alert-evaluation-view-series-list">
						<h4>Select a series to display evaluation view:</h4>
						<div className="anomaly-alert-evaluation-view-series-list-items">
							{allSeries.map((seriesKey) => (
								<Checkbox
									className="anomaly-alert-evaluation-view-series-list-item"
									key={seriesKey}
									type="checkbox"
									name="series"
									value={seriesKey}
									checked={selectedSeries === seriesKey}
									onChange={(): void => handleSeriesChange(seriesKey)}
								>
									{seriesKey}
								</Checkbox>
							))}

							<Checkbox
								className="anomaly-alert-evaluation-view-series-list-item"
								type="checkbox"
								name="series"
								value="all"
								checked={selectedSeries === null}
								onChange={(): void => handleSeriesChange(null)}
							>
								Show All
							</Checkbox>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default AnomalyAlertEvaluationView;
