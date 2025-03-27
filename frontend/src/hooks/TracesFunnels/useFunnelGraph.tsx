import { Color } from '@signozhq/design-tokens';
import { FunnelStepGraphMetrics } from 'api/traceFunnels';
import { Chart, ChartConfiguration } from 'chart.js';
import ChangePercentagePill from 'components/ChangePercentagePill/ChangePercentagePill';
import { useCallback, useEffect, useRef } from 'react';

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

interface UseFunnelGraphProps {
	data: FunnelStepGraphMetrics | undefined;
}

interface UseFunnelGraph {
	successSteps: number[];
	errorSteps: number[];
	totalSteps: number;
	canvasRef: React.RefObject<HTMLCanvasElement>;
	renderLegendItem: (
		step: number,
		successSpans: number,
		errorSpans: number,
		prevTotalSpans: number,
	) => JSX.Element;
}

function useFunnelGraph({ data }: UseFunnelGraphProps): UseFunnelGraph {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const chartRef = useRef<Chart | null>(null);

	const getPercentageChange = useCallback(
		(current: number, previous: number): number => {
			if (previous === 0) return 0;
			return Math.abs(Math.round(((current - previous) / previous) * 100));
		},
		[],
	);

	interface StepGraphData {
		successSteps: number[];
		errorSteps: number[];
		totalSteps: number;
	}
	const getStepGraphData = useCallback((): StepGraphData => {
		const successSteps: number[] = [];
		const errorSteps: number[] = [];
		let stepCount = 1;

		if (!data) return { successSteps, errorSteps, totalSteps: 0 };

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

		const { successSteps, errorSteps, totalSteps } = getStepGraphData();

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
			options: CHART_CONFIG.options,
		} as ChartConfiguration);
	}, [data, getStepGraphData]);

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
				<div key={step} className="funnel-graph__legend-column">
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
		[getPercentageChange],
	);

	const { successSteps, errorSteps, totalSteps } = getStepGraphData();

	return {
		successSteps,
		errorSteps,
		totalSteps,
		canvasRef,
		renderLegendItem,
	};
}

export default useFunnelGraph;
