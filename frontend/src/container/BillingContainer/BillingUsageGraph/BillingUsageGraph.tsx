import { useCallback, useMemo, useRef } from 'react';
import { Card, Flex } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';
import {
	LegendPosition,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type uPlot from 'uplot';
import type { UsageResponsePayloadProps } from 'api/billing/getUsage';

import { BillingBarChartTooltip } from './BillingBarChartTooltip';
import { prepareBillingBarConfig } from './prepareBillingBarConfig';
import {
	calculateStartEndTime,
	convertDataToMetricRangePayload,
	fillMissingValuesForQuantities,
} from './utils';

import styles from './BillingUsageGraph.module.scss';

interface BillingUsageGraphProps {
	data: Partial<UsageResponsePayloadProps>;
	billAmount: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');

export function BillingUsageGraph(props: BillingUsageGraphProps): JSX.Element {
	const { data, billAmount } = props;

	const graphRef = useRef<HTMLDivElement>(null);
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	// Single-day data causes bars to span multiple days — add a synthetic
	// zero-value next-day entry so uPlot renders a correctly-sized single-day bar.
	const normalizedData = useMemo(() => {
		if (!data?.details?.breakdown) {
			return data;
		}
		return {
			...data,
			details: {
				...data.details,
				breakdown: data.details.breakdown.map((breakdown) => {
					if (breakdown?.dayWiseBreakdown?.breakdown?.length !== 1) {
						return breakdown;
					}
					const currentDay = breakdown.dayWiseBreakdown.breakdown[0];
					const nextDay = {
						...currentDay,
						timestamp: currentDay.timestamp + 86400,
						count: 0,
						size: 0,
						quantity: 0,
						total: 0,
					};
					return {
						...breakdown,
						dayWiseBreakdown: {
							...breakdown.dayWiseBreakdown,
							breakdown: [...breakdown.dayWiseBreakdown.breakdown, nextDay],
						},
					};
				}),
			},
		};
	}, [data]);

	const graphCompatibleData = useMemo(
		() => convertDataToMetricRangePayload(normalizedData),
		[normalizedData],
	);

	const chartData = useMemo(
		() => prepareChartData(graphCompatibleData) as uPlot.AlignedData,
		[graphCompatibleData],
	);

	const filledApiResponse = useMemo(
		(): MetricRangePayloadProps =>
			fillMissingValuesForQuantities(
				graphCompatibleData,
				chartData[0] as number[],
			),
		[graphCompatibleData, chartData],
	);

	const { startTime, endTime } = useMemo(
		() =>
			calculateStartEndTime(normalizedData as Partial<UsageResponsePayloadProps>),
		[normalizedData],
	);

	const config = useMemo(
		() =>
			prepareBillingBarConfig({
				isDarkMode,
				// Subtract 86400s (one day) from startTime to add a buffer before first bar
				minTimeScale: startTime !== undefined ? startTime - 86400 : undefined,
				maxTimeScale: endTime,
				apiResponse: graphCompatibleData,
			}),
		[isDarkMode, startTime, endTime, graphCompatibleData],
	);

	const renderBillingTooltip = useCallback(
		(args: TooltipRenderArgs) => (
			<BillingBarChartTooltip billingApiResponse={filledApiResponse} {...args} />
		),
		[filledApiResponse],
	);

	return (
		<Card bordered={false} className={styles.billingGraphCard}>
			<Flex justify="space-between">
				<Flex vertical gap={6}>
					<Typography.Text className={styles.totalSpentTitle}>
						TOTAL SPENT
					</Typography.Text>
					<Typography.Text className={styles.totalSpent}>
						${numberFormatter.format(billAmount)}
					</Typography.Text>
				</Flex>
			</Flex>
			<div ref={graphRef} className={styles.graphContainer}>
				{containerDimensions.width > 0 && containerDimensions.height > 0 && (
					<BarChart
						config={config}
						data={chartData}
						isStackedBarChart
						legendConfig={{ position: LegendPosition.BOTTOM }}
						customTooltip={renderBillingTooltip}
						width={containerDimensions.width}
						height={containerDimensions.height - 30}
						canPinTooltip
					/>
				)}
			</div>
		</Card>
	);
}
