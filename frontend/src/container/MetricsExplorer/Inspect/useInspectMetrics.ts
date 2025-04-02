import { useGetInspectMetricsDetails } from 'hooks/metricsExplorer/useGetInspectMetricsDetails';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { convertNanoToMilliseconds } from '../Summary/utils';
import { UseInspectMetricsReturnData } from './types';

export function useInspectMetrics(
	metricName: string | null,
): UseInspectMetricsReturnData {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const {
		data: inspectMetricsData,
		isLoading: isInspectMetricsLoading,
		isError: isInspectMetricsError,
	} = useGetInspectMetricsDetails(
		{
			metricName: metricName ?? '',
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
		},
		{
			enabled: !!metricName,
		},
	);

	const inspectMetricsTimeSeries = useMemo(
		() => inspectMetricsData?.payload?.data?.series ?? [],
		[inspectMetricsData],
	);

	const inspectMetricsStatusCode = useMemo(
		() => inspectMetricsData?.statusCode || 200,
		[inspectMetricsData],
	);

	return {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
	};
}
