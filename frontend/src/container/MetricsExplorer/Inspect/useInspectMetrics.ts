import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { themeColors } from 'constants/theme';
import { useGetInspectMetricsDetails } from 'hooks/metricsExplorer/useGetInspectMetricsDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { useEffect, useMemo, useReducer, useState } from 'react';
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
import {
	applyFilters,
	applySpaceAggregation,
	applyTimeAggregation,
} from './utils';

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
		case 'RESET_INSPECTION':
			return { ...INITIAL_INSPECT_METRICS_OPTIONS };
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
		isRefetching: isInspectMetricsRefetching,
	} = useGetInspectMetricsDetails(
		{
			metricName: metricName ?? '',
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
		},
		{
			enabled: !!metricName,
			keepPreviousData: true,
		},
	);
	const isDarkMode = useIsDarkMode();

	const inspectMetricsTimeSeries = useMemo(() => {
		const series = inspectMetricsData?.payload?.data?.series ?? [];

		return series.map((series, index) => {
			const title = `TS${index + 1}`;
			const strokeColor = generateColor(
				title,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			);
			return {
				...series,
				values: [...series.values].sort((a, b) => a.timestamp - b.timestamp),
				title,
				strokeColor,
			};
		});
	}, [inspectMetricsData, isDarkMode]);

	const inspectMetricsStatusCode = useMemo(
		() => inspectMetricsData?.statusCode || 200,
		[inspectMetricsData],
	);

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

	const [spaceAggregatedSeriesMap, setSpaceAggregatedSeriesMap] = useState<
		Map<string, InspectMetricsSeries[]>
	>(new Map());
	const [aggregatedTimeSeries, setAggregatedTimeSeries] = useState<
		InspectMetricsSeries[]
	>(inspectMetricsTimeSeries);

	useEffect(() => {
		setAggregatedTimeSeries(inspectMetricsTimeSeries);
	}, [inspectMetricsTimeSeries]);

	const formattedInspectMetricsTimeSeries = useMemo(() => {
		const allTimestamps = new Set<number>();
		const seriesValuesMap: Map<number, number | null>[] = [];

		let timeSeries: InspectMetricsSeries[] = [...inspectMetricsTimeSeries];

		// Apply filters
		if (metricInspectionOptions.filters.items.length > 0) {
			timeSeries = applyFilters(
				inspectMetricsTimeSeries,
				metricInspectionOptions.filters,
			);
		}

		// Apply time aggregation once required options are set
		if (
			inspectionStep === InspectionStep.SPACE_AGGREGATION &&
			metricInspectionOptions.timeAggregationOption &&
			metricInspectionOptions.timeAggregationInterval
		) {
			timeSeries = applyTimeAggregation(
				inspectMetricsTimeSeries,
				metricInspectionOptions,
			);
			setAggregatedTimeSeries(timeSeries);
		}
		// Apply space aggregation
		if (inspectionStep === InspectionStep.COMPLETED) {
			const { aggregatedSeries, spaceAggregatedSeriesMap } = applySpaceAggregation(
				inspectMetricsTimeSeries,
				metricInspectionOptions,
			);
			timeSeries = aggregatedSeries;
			setSpaceAggregatedSeriesMap(spaceAggregatedSeriesMap);
			setAggregatedTimeSeries(aggregatedSeries);
		}

		// Collect timestamps and format into chart compatible format
		timeSeries.forEach((series, idx) => {
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
		const formattedSeries = timeSeries.map((_, idx) =>
			timestamps.map((t) => seriesValuesMap[idx].get(t) ?? 0),
		);

		return [timestamps, ...formattedSeries];
	}, [inspectMetricsTimeSeries, inspectionStep, metricInspectionOptions]);

	const spaceAggregationLabels = useMemo(() => {
		const labels = new Set<string>();
		inspectMetricsData?.payload?.data.series.forEach((series) => {
			Object.keys(series.labels).forEach((label) => {
				labels.add(label);
			});
		});
		return Array.from(labels);
	}, [inspectMetricsData]);

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
		isInspectMetricsRefetching,
		spaceAggregatedSeriesMap,
		aggregatedTimeSeries,
	};
}
