import 'uplot/dist/uPlot.min.css';
import './AnomalyAlertEvaluationView.styles.scss';

import { Checkbox, Typography } from 'antd';
import Search from 'antd/es/input/Search';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useResizeObserver } from 'hooks/useDimensions';
import getAxes from 'lib/uPlotLib/utils/getAxes';
import { getUplotChartDataForAnomalyDetection } from 'lib/uPlotLib/utils/getUplotChartData';
import { getYAxisScaleForAnomalyDetection } from 'lib/uPlotLib/utils/getYAxisScale';
import { LineChart } from 'lucide-react';
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
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			plotInstance.current.destroy();
		}

		if (data && data.length > 0) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			// eslint-disable-next-line new-cap
			plotInstance.current = new uPlot(options, data, chartRef.current);
		}

		return (): void => {
			if (plotInstance.current) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				plotInstance.current.destroy();
			}
		};
	}, [data, options, chartRef]);

	return <div ref={chartRef} />;
}

function AnomalyAlertEvaluationView({
	data,
	yAxisUnit,
}: {
	data: any;
	yAxisUnit: string;
}): JSX.Element {
	const { spline } = uPlot.paths;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const _spline = spline ? spline() : undefined;
	const chartRef = useRef<HTMLDivElement>(null);
	const isDarkMode = useIsDarkMode();
	const [seriesData, setSeriesData] = useState<any>({});
	const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

	const [filteredSeriesKeys, setFilteredSeriesKeys] = useState<string[]>([]);
	const [allSeries, setAllSeries] = useState<string[]>([]);

	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	useEffect(() => {
		const chartData = getUplotChartDataForAnomalyDetection(data);
		setSeriesData(chartData);

		setAllSeries(Object.keys(chartData));

		setFilteredSeriesKeys(Object.keys(chartData));
	}, [data]);

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
				(u: any): void => {
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

	const initialData = allSeries.length
		? [
				seriesData[allSeries[0]].data[0], // Shared X-axis
				...allSeries.map((key) => seriesData[key].data[1]), // Map through Y-axis data for all series
		  ]
		: [];

	const options = {
		width: dimensions.width,
		height: dimensions.height - 36,
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
			},
			y: {
				...getYAxisScaleForAnomalyDetection({
					seriesData,
					selectedSeries,
					initialData,
					yAxisUnit,
				}),
			},
		},
		grid: {
			show: true,
		},
		legend: {
			show: true,
		},
		axes: getAxes(isDarkMode, yAxisUnit),
	};

	const handleSearch = (searchText: string): void => {
		if (!searchText || searchText.length === 0) {
			setFilteredSeriesKeys(allSeries);
			return;
		}

		const filteredSeries = allSeries.filter((series) =>
			series.toLowerCase().includes(searchText.toLowerCase()),
		);

		setFilteredSeriesKeys(filteredSeries);
	};

	const handleSearchValueChange = useDebouncedFn((event): void => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const value = event?.target?.value || '';

		handleSearch(value);
	}, 300);

	return (
		<div className="anomaly-alert-evaluation-view">
			<div
				className={`anomaly-alert-evaluation-view-chart-section ${
					allSeries.length > 1 ? 'has-multi-series-data' : ''
				}`}
				ref={graphRef}
			>
				{allSeries.length > 0 ? (
					<UplotChart
						data={selectedSeries ? seriesData[selectedSeries].data : initialData}
						options={options}
						chartRef={chartRef}
					/>
				) : (
					<div className="anomaly-alert-evaluation-view-no-data-container">
						<LineChart size={48} strokeWidth={0.5} />

						<Typography>No Data</Typography>
					</div>
				)}
			</div>

			{allSeries.length > 1 && (
				<div className="anomaly-alert-evaluation-view-series-selection">
					{allSeries.length > 1 && (
						<div className="anomaly-alert-evaluation-view-series-list">
							<Search
								className="anomaly-alert-evaluation-view-series-list-search"
								placeholder="Search a series"
								allowClear
								onChange={handleSearchValueChange}
							/>

							<div className="anomaly-alert-evaluation-view-series-list-items">
								{filteredSeriesKeys.length > 0 && (
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
								)}

								{filteredSeriesKeys.map((seriesKey) => (
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

								{filteredSeriesKeys.length === 0 && (
									<Typography>No series found</Typography>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default AnomalyAlertEvaluationView;
