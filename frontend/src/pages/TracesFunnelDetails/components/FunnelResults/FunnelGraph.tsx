import './FunnelGraph.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Empty } from 'antd';
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	ChartConfiguration,
	Legend,
	LinearScale,
	Title,
} from 'chart.js';
import ChangePercentagePill from 'components/ChangePercentagePill/ChangePercentagePill';
import Spinner from 'components/Spinner';
import { NotFoundContainer } from 'container/GridCardLayout/GridCard/FullView/styles';
import { useCallback, useEffect, useRef, useState } from 'react';

// Register required components
Chart.register(
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Legend,
	Title,
);

interface FunnelGraphProps {
	data: {
		[key: string]: number;
	};
	isLoading?: boolean;
	isEmpty?: boolean;
	isError?: boolean;
}

interface StepData {
	successSteps: number[];
	errorSteps: number[];
	totalSteps: number;
}

const CHART_CONFIG: Partial<ChartConfiguration> = {
	type: 'bar',
	options: {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			x: {
				stacked: true,
				grid: {
					display: false,
				},
				ticks: {
					font: {
						family: "'Geist Mono', monospace",
					},
				},
			},
			y: {
				stacked: true,
				beginAtZero: true,
				grid: {
					color: 'rgba(192, 193, 195, 0.04)',
				},
				ticks: {
					font: {
						family: "'Geist Mono', monospace",
					},
				},
			},
		},
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				enabled: false,
			},
		},
	},
};

function FunnelGraph({
	data,
	isLoading,
	isEmpty,
	isError,
}: FunnelGraphProps): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const chartRef = useRef<Chart | null>(null);
	const [columnWidth, setColumnWidth] = useState<number>(0);

	const getPercentageChange = useCallback(
		(current: number, previous: number): number => {
			if (previous === 0) return 0;
			return Math.abs(Math.round(((current - previous) / previous) * 100));
		},
		[],
	);

	const getStepData = useCallback((): StepData => {
		const successSteps: number[] = [];
		const errorSteps: number[] = [];
		let stepCount = 1;

		while (
			data[`total_s${stepCount}_spans`] !== undefined &&
			data[`total_s${stepCount}_errored_spans`] !== undefined
		) {
			const totalSpans = data[`total_s${stepCount}_spans`];
			const erroredSpans = data[`total_s${stepCount}_errored_spans`];
			const successSpans = totalSpans - erroredSpans;

			successSteps.push(successSpans);
			errorSteps.push(erroredSpans);
			stepCount += 1;
		}

		return {
			successSteps,
			errorSteps,
			totalSteps: stepCount - 1,
		};
	}, [data]);

	useEffect(() => {
		if (!canvasRef.current) return;

		if (chartRef.current) {
			chartRef.current.destroy();
		}

		const ctx = canvasRef.current.getContext('2d');
		if (!ctx) return;

		const { successSteps, errorSteps, totalSteps } = getStepData();

		chartRef.current = new Chart(ctx, {
			...CHART_CONFIG,
			data: {
				labels: Array.from({ length: totalSteps }, (_, i) => String(i + 1)),
				datasets: [
					{
						label: 'Success spans',
						data: successSteps,
						backgroundColor: Color.BG_ROBIN_500,
						stack: 'Stack 0',
						borderRadius: 2,
						borderSkipped: false,
					},
					{
						label: 'Error spans',
						data: errorSteps,
						backgroundColor: Color.BG_CHERRY_500,
						stack: 'Stack 0',
						borderRadius: 2,
						borderSkipped: false,
						borderWidth: {
							top: 2,
							bottom: 2,
						},
						borderColor: 'rgba(0, 0, 0, 0)',
					},
				],
			},
			options: {
				...CHART_CONFIG.options,
				animation: {
					onComplete: () => {
						if (!chartRef.current) return;

						// Get the bar widths from the first dataset
						const meta = chartRef.current.getDatasetMeta(0);
						const widths = meta.data.map((bar) => {
							const { width } = bar.getProps(['width']);
							return width;
						});
						if (widths?.length) {
							setColumnWidth(widths[0] as number);
						}
					},
				},
			},
		} as ChartConfiguration);
	}, [data, getStepData]);

	// Log the widths when they change

	const renderLegendItem = useCallback(
		(
			step: number,
			successSpans: number,
			errorSpans: number,
			prevTotalSpans: number,
		): JSX.Element => {
			const totalSpans = successSpans + errorSpans;

			return (
				<div
					key={step}
					className="funnel-graph__legend-column"
					style={{
						width: columnWidth + 50,
					}}
				>
					<div className="legend-item">
						<div className="legend-item__left">
							<span className="legend-item__dot legend-item--total" />
							<span className="legend-item__label">Total spans</span>
						</div>
						<div className="legend-item__right">
							<span className="legend-item__value">{totalSpans}</span>
							{step > 1 && (
								<ChangePercentagePill
									direction={totalSpans < prevTotalSpans ? -1 : 1}
									percentage={getPercentageChange(totalSpans, prevTotalSpans)}
								/>
							)}
						</div>
					</div>
					<div className="legend-item">
						<div className="legend-item__left">
							<span className="legend-item__dot legend-item--error" />
							<span className="legend-item__label">Error spans</span>
						</div>
						<div className="legend-item__right">
							<span className="legend-item__value">{errorSpans}</span>
						</div>
					</div>
				</div>
			);
		},
		[columnWidth, getPercentageChange],
	);

	const { successSteps, errorSteps, totalSteps } = getStepData();

	if (isLoading)
		return (
			<div className="funnel-graph">
				<Spinner size="default" />
			</div>
		);

	if (isEmpty) {
		return <NotFoundContainer>No data available</NotFoundContainer>;
	}

	if (isError) {
		return (
			<Empty description="Error fetching metrics. If the problem persists, please contact support." />
		);
	}

	return (
		<div className="funnel-graph">
			<div className="funnel-graph__chart-container">
				<canvas ref={canvasRef} />
			</div>
			<div className="funnel-graph__legends">
				{Array.from({ length: totalSteps }, (_, index) => {
					const prevTotalSpans =
						index > 0
							? successSteps[index - 1] + errorSteps[index - 1]
							: successSteps[0] + errorSteps[0];

					return renderLegendItem(
						index + 1,
						successSteps[index],
						errorSteps[index],
						prevTotalSpans,
					);
				})}
			</div>
		</div>
	);
}

FunnelGraph.defaultProps = {
	isLoading: false,
	isEmpty: false,
	isError: false,
};

export default FunnelGraph;
