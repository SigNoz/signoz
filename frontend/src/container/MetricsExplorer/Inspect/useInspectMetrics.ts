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

	const formattedInspectMetricsTimeSeries = useMemo(() => {
		const allTimestamps = new Set<number>();
		const seriesValuesMap: Map<number, number | null>[] = [];

		// Collect timestamps and map values
		inspectMetricsTimeSeries.forEach((series, idx) => {
			seriesValuesMap[idx] = new Map();
			series.values.forEach(({ timestamp, value }) => {
				allTimestamps.add(timestamp);
				seriesValuesMap[idx].set(timestamp, parseFloat(value));
			});
		});

		// Convert timestamps to sorted array
		const timestamps = Float64Array.from(
			[...allTimestamps].sort((a, b) => a - b),
		);

		// Map values to corresponding timestamps, filling missing ones with `0`
		const formattedSeries = inspectMetricsTimeSeries.map((_, idx) =>
			timestamps.map((t) => seriesValuesMap[idx].get(t) ?? 0),
		);

		return [timestamps, ...formattedSeries];
	}, [inspectMetricsTimeSeries]);

	return {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
		formattedInspectMetricsTimeSeries,
	};
}
