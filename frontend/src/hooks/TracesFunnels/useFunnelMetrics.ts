import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { MetricItem } from 'pages/TracesFunnelDetails/components/FunnelResults/FunnelMetricsTable';
import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

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
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const {
		mutate: getFunnelOverview,
		data: overviewData,
		isLoading,
	} = useFunnelOverview(funnelId);

	const fetchFunnelData = useCallback(() => {
		if (!funnelId) return;

		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: selectedTime,
		});

		const payload = {
			start_time: Math.floor(Number(start) * 1e9),
			end_time: Math.floor(Number(end) * 1e9),
			...(stepStart !== undefined && { step_start: stepStart }),
			...(stepEnd !== undefined && { step_end: stepEnd }),
		};

		getFunnelOverview(payload);
	}, [funnelId, selectedTime, getFunnelOverview, stepStart, stepEnd]);

	useEffect(fetchFunnelData, [fetchFunnelData]);

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
