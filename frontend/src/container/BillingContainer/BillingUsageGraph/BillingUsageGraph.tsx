import './BillingUsageGraph.styles.scss';
import '../../../lib/uPlotLib/uPlotLib.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Card, Flex, Typography } from 'antd';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import tooltipPlugin from 'lib/uPlotLib/plugins/tooltipPlugin';
import getAxes from 'lib/uPlotLib/utils/getAxes';
import getRenderer from 'lib/uPlotLib/utils/getRenderer';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { getXAxisScale } from 'lib/uPlotLib/utils/getXAxisScale';
import { getYAxisScale } from 'lib/uPlotLib/utils/getYAxisScale';
import { useMemo, useRef } from 'react';
import uPlot from 'uplot';

import {
	convertDataToMetricRangePayload,
	fillMissingValuesForQuantities,
} from './utils';

interface BillingUsageGraphProps {
	data: any;
	billAmount: number;
}
const paths = (
	u: any,
	seriesIdx: number,
	idx0: number,
	idx1: number,
	extendGap: boolean,
	buildClip: boolean,
): uPlot.Series.PathBuilder => {
	const s = u.series[seriesIdx];
	const style = s.drawStyle;
	const interp = s.lineInterpolation;

	const renderer = getRenderer(style, interp);

	return renderer(u, seriesIdx, idx0, idx1, extendGap, buildClip);
};

const calculateStartEndTime = (
	data: any,
): { startTime: number; endTime: number } => {
	const timestamps: number[] = [];
	data?.details?.breakdown?.forEach((breakdown: any) => {
		breakdown?.dayWiseBreakdown?.breakdown?.forEach((entry: any) => {
			timestamps.push(entry?.timestamp);
		});
	});
	const billingTime = [data?.billingPeriodStart, data?.billingPeriodEnd];
	const startTime: number = Math.min(...timestamps, ...billingTime);
	const endTime: number = Math.max(...timestamps, ...billingTime);
	return { startTime, endTime };
};

export function BillingUsageGraph(props: BillingUsageGraphProps): JSX.Element {
	const { data, billAmount } = props;
	// Added this to fix the issue where breakdown with one day data are causing the bars to spread across multiple days
	data?.details?.breakdown?.forEach((breakdown: any) => {
		if (breakdown?.dayWiseBreakdown?.breakdown?.length === 1) {
			const currentDay = breakdown.dayWiseBreakdown.breakdown[0];
			const nextDay = {
				...currentDay,
				timestamp: currentDay.timestamp + 86400,
				count: 0,
				size: 0,
				quantity: 0,
				total: 0,
			};
			breakdown.dayWiseBreakdown.breakdown.push(nextDay);
		}
	});
	const graphCompatibleData = useMemo(
		() => convertDataToMetricRangePayload(data),
		[data],
	);
	const chartData = getUPlotChartData(graphCompatibleData);
	const graphRef = useRef<HTMLDivElement>(null);
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	const { startTime, endTime } = useMemo(() => calculateStartEndTime(data), [
		data,
	]);

	const getGraphSeries = (color: string, label: string): any => ({
		drawStyle: 'bars',
		paths,
		lineInterpolation: 'spline',
		show: true,
		label,
		fill: color,
		stroke: color,
		width: 2,
		spanGaps: true,
		points: {
			size: 5,
			show: false,
			stroke: color,
		},
	});

	const uPlotSeries: any = useMemo(
		() => [
			{ label: 'Timestamp', stroke: 'purple' },
			getGraphSeries(
				'#7CEDBE',
				graphCompatibleData.data.result[0]?.legend as string,
			),
			getGraphSeries(
				'#4E74F8',
				graphCompatibleData.data.result[1]?.legend as string,
			),
			getGraphSeries(
				'#F24769',
				graphCompatibleData.data.result[2]?.legend as string,
			),
		],
		[graphCompatibleData.data.result],
	);

	const axesOptions = getAxes({ isDarkMode, yAxisUnit: '' });

	const optionsForChart: uPlot.Options = useMemo(
		() => ({
			id: 'billing-usage-breakdown',
			series: uPlotSeries,
			width: containerDimensions.width,
			height: containerDimensions.height - 30,
			axes: [
				{
					...axesOptions[0],
					grid: {
						...axesOptions.grid,
						show: false,
						stroke: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400,
					},
				},
				{
					...axesOptions[1],
					stroke: isDarkMode ? Color.BG_SLATE_200 : Color.BG_INK_400,
				},
			],
			scales: {
				x: {
					...getXAxisScale(startTime - 86400, endTime), // Minus 86400 from startTime to decrease a day to have a buffer start
				},
				y: {
					...getYAxisScale({
						series: graphCompatibleData?.data?.newResult?.data?.result,
						yAxisUnit: '',
						softMax: null,
						softMin: null,
					}),
				},
			},
			legend: {
				show: true,
				live: false,
				isolate: true,
			},
			cursor: {
				lock: false,
				focus: {
					prox: 1e6,
					bias: 1,
				},
			},
			focus: {
				alpha: 0.3,
			},
			padding: [32, 32, 16, 16],
			plugins: [
				tooltipPlugin({
					apiResponse: fillMissingValuesForQuantities(
						graphCompatibleData,
						chartData[0],
					),
					yAxisUnit: '',
					isBillingUsageGraphs: true,
					isDarkMode,
				}),
			],
		}),
		[
			axesOptions,
			chartData,
			containerDimensions.height,
			containerDimensions.width,
			endTime,
			graphCompatibleData,
			isDarkMode,
			startTime,
			uPlotSeries,
		],
	);

	const numberFormatter = new Intl.NumberFormat('en-US');

	return (
		<Card bordered={false} className="billing-graph-card">
			<Flex justify="space-between">
				<Flex vertical gap={6}>
					<Typography.Text className="total-spent-title">
						TOTAL SPENT
					</Typography.Text>
					<Typography.Text color={Color.BG_VANILLA_100} className="total-spent">
						${numberFormatter.format(billAmount)}
					</Typography.Text>
				</Flex>
			</Flex>
			<div ref={graphRef} style={{ height: '100%', paddingBottom: 48 }}>
				<Uplot data={chartData} options={optionsForChart} />
			</div>
		</Card>
	);
}
