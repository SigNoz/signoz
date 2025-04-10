import { useGetInspectMetricsDetails } from 'hooks/metricsExplorer/useGetInspectMetricsDetails';
import { useMemo, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { convertNanoToMilliseconds } from '../Summary/utils';
import { INITIAL_INSPECT_METRICS_OPTIONS } from './constants';
import {
	InspectionStep,
	MetricInspectionAction,
	MetricInspectionOptions,
	UseInspectMetricsReturnData,
} from './types';

const metricInspectionReducer = (
	state: MetricInspectionOptions,
	action: MetricInspectionAction,
): MetricInspectionOptions => {
	switch (action.type) {
		case 'SET_TIME_AGGREGATION_OPTION':
			return {
				...state,
				timeAggregationOption: action.payload,
			};
		case 'SET_TIME_AGGREGATION_INTERVAL':
			return {
				...state,
				timeAggregationInterval: action.payload,
			};
		case 'SET_SPACE_AGGREGATION_OPTION':
			return {
				...state,
				spaceAggregationOption: action.payload,
			};
		case 'SET_SPACE_AGGREGATION_LABELS':
			return {
				...state,
				spaceAggregationLabels: action.payload,
			};
		case 'SET_FILTERS':
			return {
				...state,
				filters: action.payload,
			};
		default:
			return state;
	}
};

export function useInspectMetrics(
	metricName: string | null,
): UseInspectMetricsReturnData {
	// Inspect Metrics API Call and data formatting
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

	const spaceAggregationLabels = useMemo(() => {
		const labels = new Set<string>();
		inspectMetricsData?.payload?.data.series.forEach((series) => {
			Object.keys(series.labels).forEach((label) => {
				labels.add(label);
			});
		});
		return Array.from(labels);
	}, [inspectMetricsData]);

	// Inspect metrics data selection
	const [metricInspectionOptions, dispatchMetricInspectionOptions] = useReducer(
		metricInspectionReducer,
		INITIAL_INSPECT_METRICS_OPTIONS,
	);

	// Evaluate inspection step
	const inspectionStep = useMemo(() => {
		if (
			metricInspectionOptions.spaceAggregationOption &&
			metricInspectionOptions.spaceAggregationLabels.length > 0
		) {
			return InspectionStep.COMPLETED;
		}
		if (
			metricInspectionOptions.timeAggregationOption &&
			metricInspectionOptions.timeAggregationInterval
		) {
			return InspectionStep.SPACE_AGGREGATION;
		}
		return InspectionStep.TIME_AGGREGATION;
	}, [metricInspectionOptions]);

	return {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
		formattedInspectMetricsTimeSeries,
		spaceAggregationLabels,
		metricInspectionOptions,
		dispatchMetricInspectionOptions,
		inspectionStep,
	};
}
