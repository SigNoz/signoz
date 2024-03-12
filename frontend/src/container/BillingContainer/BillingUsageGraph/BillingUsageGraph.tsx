import './BillingUsageGraph.styles.scss';
import '../../../lib/uPlotLib/uPlotLib.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Card, Flex, Select, Typography } from 'antd';
import { SelectProps } from 'antd/lib';
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
import { chunk, isEmpty, isNull } from 'lodash-es';
import { FC, useRef, useState } from 'react';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

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

const makeDataCompatible = (data: any): MetricRangePayloadProps => {
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

	const payload = breakdown.map((info: any) => {
		const metric = info.type;
		const values = (
			info?.dayWiseBreakdown?.breakdown || []
		).map((categoryInfo: any) => [categoryInfo.timestamp, categoryInfo.total]);
		const queryName = info.type;
		const legend = info.type;
		const { unit } = info;
		const quantity = (info?.dayWiseBreakdown?.breakdown || []).map(
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

enum BillingUsageGraphOptions {
	DAILY = 'Daily',
	WEEKLY = 'Weekly',
}

const convertDailyToWeekly = (
	data: number[][],
	startTime: number,
): number[][] => {
	const numberOfChunks = data[0].length;
	const xAxisWeekly = chunk(data[0], 7).map((item) => item[item.length - 1]);
	const timeGapXAxis = xAxisWeekly[0] - startTime;

	// populate xAxis data if required
	const currentXAxisSize = xAxisWeekly.length;
	if (currentXAxisSize < numberOfChunks) {
		const count = numberOfChunks - currentXAxisSize;
		const lastValue = xAxisWeekly[xAxisWeekly.length - 1] || 0; // Get the last available value or default to 0
		xAxisWeekly.push(
			...Array(count)
				.fill(null)
				.map((_, index) => lastValue + (index + 1) * timeGapXAxis),
		);
	}

	const yAxisWeekly = data
		.slice(1)
		.map((item) =>
			chunk(item, 7).map((value) => value.reduce((acc, curr) => acc + curr, 0)),
		);
	// populate data with null if required
	const currentSize = yAxisWeekly[0]?.length;
	if (currentSize < numberOfChunks) {
		yAxisWeekly.forEach((item) =>
			item.push(...Array(numberOfChunks - currentSize).fill(null)),
		);
	}
	return [xAxisWeekly, ...yAxisWeekly];
};

interface BillingUsageGraphProps {
	data: any;
	billAmount: number;
}
export function BillingUsageGraph(props: BillingUsageGraphProps): JSX.Element {
	const { data, billAmount } = props;
	const graphCompatibleData = makeDataCompatible(data);
	const [
		billingUsageOption,
		setBillingUsageOption,
	] = useState<BillingUsageGraphOptions>(BillingUsageGraphOptions.DAILY);

	const dailyChartData = getUPlotChartData(graphCompatibleData);
	console.log(graphCompatibleData, dailyChartData);

	const [chartData, setChartData] = useState(dailyChartData);

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
					stroke: isDarkMode ? Color.BG_VANILLA_400 : 'black',
				},
			},
			{
				...axesOptions[1],
				stroke: isDarkMode ? Color.BG_SLATE_200 : 'black',
			},
		],
		scales: {
			x: {
				...getXAxisScale(startTime, endTime),
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
		focus: {
			alpha: 0.3,
		},
		padding: [32, 32, 16, 16],
		plugins: [tooltipPlugin(graphCompatibleData, '', true)],
	};

	const numberFormatter = new Intl.NumberFormat('en-US');

	const onSelectChange: SelectProps['onChange'] = (value): void => {
		if (value === BillingUsageGraphOptions.WEEKLY) {
			setChartData(convertDailyToWeekly(dailyChartData, startTime));
		} else {
			setChartData(dailyChartData);
		}
		setBillingUsageOption(value);
	};

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
				<Select
					value={billingUsageOption}
					className="selectStyles"
					onChange={onSelectChange}
				>
					<Select.Option
						value={BillingUsageGraphOptions.DAILY}
						key={BillingUsageGraphOptions.DAILY}
					>
						Daily
					</Select.Option>
					<Select.Option
						value={BillingUsageGraphOptions.WEEKLY}
						key={BillingUsageGraphOptions.WEEKLY}
					>
						Weekly
					</Select.Option>
				</Select>
			</Flex>
			<div ref={graphRef} style={{ height: '100%', paddingBottom: 48 }}>
				<Component data={chartData} options={getOptionsForChart} />
			</div>
		</Card>
	);
}
