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
	metricsData: MetricItem[];
	conversionRate: number;
} {
	const { startTime, endTime } = useFunnelContext();
	const payload = {
		start_time: startTime,
		end_time: endTime,
		...(stepStart !== undefined && { step_start: stepStart }),
		...(stepEnd !== undefined && { step_end: stepEnd }),
	};

	const { data: overviewData, isLoading } = useFunnelOverview(funnelId, payload);

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
				value: getYAxisFormattedValue(sourceData.avg_duration.toString(), 'ms'),
			},
			{
				title: 'P99 Latency',
				value: getYAxisFormattedValue(sourceData.p99_latency.toString(), 'ms'),
			},
		];
	}, [overviewData]);

	const conversionRate =
		overviewData?.payload?.data?.[0]?.data?.conversion_rate ?? 0;

	return {
		isLoading,
		metricsData,
		conversionRate,
	};
}
