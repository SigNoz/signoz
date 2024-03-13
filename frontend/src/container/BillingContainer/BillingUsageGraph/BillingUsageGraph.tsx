import './BillingUsageGraph.styles.scss';
import '../../../lib/uPlotLib/uPlotLib.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Card, Flex, Typography } from 'antd';
import { getComponentForPanelType } from 'constants/panelTypes';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PropsTypePropsMap } from 'container/GridPanelSwitch/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import tooltipPlugin from 'lib/uPlotLib/plugins/tooltipPlugin';
import getAxes from 'lib/uPlotLib/utils/getAxes';
import getRenderer from 'lib/uPlotLib/utils/getRenderer';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { getXAxisScale } from 'lib/uPlotLib/utils/getXAxisScale';
import { getYAxisScale } from 'lib/uPlotLib/utils/getYAxisScale';
import { isEmpty, isNull } from 'lodash-es';
import { FC, useRef } from 'react';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

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

const convertDataToMetricRangePayload = (
	data: any,
): MetricRangePayloadProps => {
	const emptyStateData = {
		data: {
			newResult: { data: { result: [], resultType: '' } },
			result: [],
			resultType: '',
		},
	};
	if (isEmpty(data)) {
		return emptyStateData;
	}
	const {
		details: { breakdown = [] },
	} = data || {};

	if (isNull(breakdown) || breakdown.length === 0) {
		return emptyStateData;
	}

	const payload = breakdown
		.sort((a: any, b: any) => a.timestamp - b.timestamp)
		.map((info: any) => {
			const metric = info.type;
			const sortedBreakdownData = (info?.dayWiseBreakdown?.breakdown || []).sort(
				(a: any, b: any) => a.timestamp - b.timestamp,
			);
			const values = (sortedBreakdownData || [])
				.sort((a: any, b: any) => a.timestamp - b.timestamp)
				.map((categoryInfo: any) => [categoryInfo.timestamp, categoryInfo.total]);
			const queryName = info.type;
			const legend = info.type;
			const { unit } = info;
			const quantity = sortedBreakdownData.map(
				(categoryInfo: any) => categoryInfo.quantity,
			);
			return { metric, values, queryName, legend, quantity, unit };
		});

	const sortedData = payload.sort((a: any, b: any) => {
		const sumA = a.values.reduce((acc: any, val: any) => acc + val[1], 0);
		const avgA = sumA / a.values.length;
		const sumB = b.values.reduce((acc: any, val: any) => acc + val[1], 0);
		const avgB = sumB / b.values.length;

		if (sumA === sumB) {
			return avgB - avgA;
		}
		return sumB - sumA;
	});

	return {
		data: {
			newResult: { data: { result: sortedData, resultType: '' } },
			result: sortedData,
			resultType: '',
		},
	};
};

function fillMissingValuesForQuantities(
	data: any,
	timestampArray: number[],
): MetricRangePayloadProps {
	const { result } = data.data;

	const transformedResultArr: any[] = [];
	result.forEach((item: any) => {
		const timestampToQuantityMap: { [timestamp: number]: number } = {};
		item.values.forEach((val: number[], index: number) => {
			timestampToQuantityMap[val[0]] = item.quantity[index];
		});

		const quantityArray = timestampArray.map(
			(timestamp: number) => timestampToQuantityMap[timestamp] ?? null,
		);
		transformedResultArr.push({ ...item, quantity: quantityArray });
	});

	return {
		data: {
			newResult: { data: { result: transformedResultArr, resultType: '' } },
			result: transformedResultArr,
			resultType: '',
		},
	};
}

export function BillingUsageGraph(props: BillingUsageGraphProps): JSX.Element {
	const { data, billAmount } = props;
	const graphCompatibleData = convertDataToMetricRangePayload(data);
	const chartData = getUPlotChartData(graphCompatibleData);
	const graphRef = useRef<HTMLDivElement>(null);
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	const { billingPeriodStart: startTime, billingPeriodEnd: endTime } = data;

	const Component = getComponentForPanelType(PANEL_TYPES.BAR) as FC<
		PropsTypePropsMap[PANEL_TYPES]
	>;

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

	const uPlotSeries: any = [
		{ label: 'Timestamp', stroke: 'purple' },
		getGraphSeries(
			'#DECCBC',
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
	];

	const axesOptions = getAxes(isDarkMode, '');

	const getOptionsForChart: uPlot.Options = {
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
					series: graphCompatibleData?.data.newResult.data.result,
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
			tooltipPlugin(
				fillMissingValuesForQuantities(graphCompatibleData, chartData[0]),
				'',
				true,
			),
		],
	};

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
				<Component data={chartData} options={getOptionsForChart} />
			</div>
		</Card>
	);
}
