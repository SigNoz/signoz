import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { MetricItem } from 'pages/TracesFunnelDetails/components/FunnelResults/FunnelMetricsTable';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';
import { LatencyOptions } from 'types/api/traceFunnels';

import { useFunnelOverview, useFunnelStepsOverview } from './useFunnels';

interface FunnelMetricsParams {
	funnelId: string;
	stepStart?: number;
	stepEnd?: number;
}

export function useFunnelMetrics({
	funnelId,
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
		steps,
	};

	const {
		data: overviewData,
		isLoading,
		isFetching,
		isError,
	} = useFunnelOverview(funnelId, payload);

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
				title: `P99 Latency`,
				value: getYAxisFormattedValue(sourceData.latency.toString(), 'ms'),
			},
		];
	}, [overviewData?.payload?.data]);

	const conversionRate =
		overviewData?.payload?.data?.[0]?.data?.conversion_rate ?? 0;

	return {
		isLoading: isLoading || isFetching,
		isError,
		metricsData,
		conversionRate,
	};
}
export function useFunnelStepsMetrics({
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
		step_start: stepStart,
		step_end: stepEnd,
		steps,
	};

	const {
		data: stepsOverviewData,
		isLoading,
		isFetching,
		isError,
	} = useFunnelStepsOverview(funnelId, payload);

	const latencyType = useMemo(
		() =>
			stepStart
				? steps[stepStart]?.latency_type ?? LatencyOptions.P99
				: LatencyOptions.P99,
		[stepStart, steps],
	);

	const metricsData = useMemo(() => {
		const sourceData = stepsOverviewData?.payload?.data?.[0]?.data;
		if (!sourceData) return [];

		return [
			{
				title: 'Avg. Rate',
				value: `${Number(sourceData.avg_rate.toFixed(2))} req/s`,
			},
			{ title: 'Errors', value: sourceData.errors },
			{
				title: 'Avg. Duration',
				value: getYAxisFormattedValue(
					(sourceData.avg_duration * 1_000_000).toString(),
					'ns',
				),
			},
			{
				title: `${latencyType.toUpperCase()} Latency`,
				value: getYAxisFormattedValue(
					(sourceData.latency * 1_000_000).toString(),
					'ns',
				),
			},
		];
	}, [stepsOverviewData, latencyType]);

	const conversionRate =
		stepsOverviewData?.payload?.data?.[0]?.data?.conversion_rate ?? 0;

	return {
		isLoading: isLoading || isFetching,
		isError,
		metricsData,
		conversionRate,
	};
}
