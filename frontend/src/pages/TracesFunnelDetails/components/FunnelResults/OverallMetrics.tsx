import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useFunnelOverview } from 'hooks/TracesFunnels/useFunnels';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import FunnelMetricsTable from './FunnelMetricsTable';

function OverallMetrics(): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const {
		mutate: getFunnelOverview,
		data: overviewData,
		isLoading,
	} = useFunnelOverview(funnelId || '');

	const fetchFunnelData = useCallback(() => {
		if (!funnelId) return;

		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: selectedTime,
		});

		getFunnelOverview({
			start_time: Math.floor(Number(start) * 1e9),
			end_time: Math.floor(Number(end) * 1e9),
		});
	}, [funnelId, selectedTime, getFunnelOverview]);

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

	return (
		<FunnelMetricsTable
			title="Overall Funnel Metrics"
			subtitle={{
				label: 'Conversion rate',
				value: `${conversionRate.toFixed(2)}%`,
			}}
			isLoading={isLoading}
			emptyState={<div>No data available</div>}
			data={metricsData}
		/>
	);
}

export default OverallMetrics;
