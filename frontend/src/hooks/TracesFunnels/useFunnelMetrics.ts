import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { MetricItem } from 'pages/TracesFunnelDetails/components/FunnelResults/FunnelMetricsTable';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';

import { useFunnelOverview } from './useFunnels';

interface FunnelMetricsParams {
	funnelId: string;
	stepStart?: number;
	stepEnd?: number;
}

export function useFunnelMetrics({
	funnelId,
	stepStart,
	stepEnd,
}: FunnelMetricsParams): {
	isLoading: boolean;
	isError: boolean;
	metricsData: MetricItem[];
	conversionRate: number;
} {
	const { startTime, endTime, steps } = useFunnelContext();
	const payload = {
		start_time: startTime,
		end_time: endTime,
		...(stepStart !== undefined && { step_start: stepStart }),
		...(stepEnd !== undefined && { step_end: stepEnd }),
	};

	const {
		data: overviewData,
		isLoading,
		isFetching,
		isError,
	} = useFunnelOverview(funnelId, payload);

	const latencyType = useMemo(
		() => (stepStart ? steps[stepStart - 1]?.latency_type : 'p99'),
		[stepStart, steps],
	);

	const metricsData = useMemo(() => {
		const sourceData = overviewData?.payload?.data?.[0]?.data;
		if (!sourceData) return [];

		return [
			{
				title: 'Avg. Rate',
				value: `${Number(sourceData.avg_rate.toFixed(2))} req/s`,
			},
			{ title: 'Errors', value: sourceData.errors },
			{
				title: 'Avg. Duration',
				value: getYAxisFormattedValue(sourceData.avg_duration.toString(), 'ns'),
			},
			{
				title: `${latencyType.toUpperCase()} Latency`,
				value: getYAxisFormattedValue(sourceData.p99_latency.toString(), 'ns'),
			},
		];
	}, [latencyType, overviewData?.payload?.data]);

	const conversionRate =
		overviewData?.payload?.data?.[0]?.data?.conversion_rate ?? 0;

	return {
		isLoading: isLoading || isFetching,
		isError,
		metricsData,
		conversionRate,
	};
}
