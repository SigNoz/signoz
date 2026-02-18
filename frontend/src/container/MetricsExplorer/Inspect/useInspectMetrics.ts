import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { themeColors } from 'constants/theme';
import { useGetInspectMetricsDetails } from 'hooks/metricsExplorer/useGetInspectMetricsDetails';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';

import { INITIAL_INSPECT_METRICS_OPTIONS } from './constants';
import {
	GraphPopoverData,
	InspectionStep,
	MetricInspectionAction,
	MetricInspectionOptions,
	UseInspectMetricsReturnData,
} from './types';
import {
	applySpaceAggregation,
	applyTimeAggregation,
	getAllTimestampsOfMetrics,
} from './utils';

const metricInspectionReducer = (
	state: MetricInspectionOptions,
	action: MetricInspectionAction,
): MetricInspectionOptions => {
	switch (action.type) {
		case 'SET_TIME_AGGREGATION_OPTION':
			return {
				...state,
				currentOptions: {
					...state.currentOptions,
					timeAggregationOption: action.payload,
				},
			};
		case 'SET_TIME_AGGREGATION_INTERVAL':
			return {
				...state,
				currentOptions: {
					...state.currentOptions,
					timeAggregationInterval: action.payload,
				},
			};
		case 'SET_SPACE_AGGREGATION_OPTION':
			return {
				...state,
				currentOptions: {
					...state.currentOptions,
					spaceAggregationOption: action.payload,
				},
			};
		case 'SET_SPACE_AGGREGATION_LABELS':
			return {
				...state,
				currentOptions: {
					...state.currentOptions,
					spaceAggregationLabels: action.payload,
				},
			};
		case 'SET_FILTERS':
			return {
				...state,
				currentOptions: {
					...state.currentOptions,
					filters: action.payload,
				},
			};
		case 'APPLY_INSPECTION_OPTIONS':
			return {
				...state,
				appliedOptions: {
					...state.appliedOptions,
					...state.currentOptions,
				},
			};
		case 'RESET_INSPECTION':
			return {
				...INITIAL_INSPECT_METRICS_OPTIONS,
			};
		default:
			return state;
	}
};

export function useInspectMetrics(
	metricName: string | null,
): UseInspectMetricsReturnData {
	// Inspect Metrics API Call and data formatting
	const { start, end } = useMemo(() => {
		const now = Date.now();
		return {
			start: now - 30 * 60 * 1000, // 30 minutes ago
			end: now, // now
		};
	}, []);

	// Inspect metrics data selection
	const [metricInspectionOptions, dispatchMetricInspectionOptions] = useReducer(
		metricInspectionReducer,
		INITIAL_INSPECT_METRICS_OPTIONS,
	);

	const {
		data: inspectMetricsData,
		isLoading: isInspectMetricsLoading,
		isError: isInspectMetricsError,
		isRefetching: isInspectMetricsRefetching,
	} = useGetInspectMetricsDetails(
		{
			metricName: metricName ?? '',
			start,
			end,
			filters: metricInspectionOptions.appliedOptions.filters,
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

	// Evaluate inspection step
	const currentInspectionStep = useMemo(() => {
		if (metricInspectionOptions.currentOptions.spaceAggregationOption) {
			return InspectionStep.COMPLETED;
		}
		if (
			metricInspectionOptions.currentOptions.timeAggregationOption &&
			metricInspectionOptions.currentOptions.timeAggregationInterval
		) {
			return InspectionStep.SPACE_AGGREGATION;
		}
		return InspectionStep.TIME_AGGREGATION;
	}, [metricInspectionOptions]);

	const appliedInspectionStep = useMemo(() => {
		if (metricInspectionOptions.appliedOptions.spaceAggregationOption) {
			return InspectionStep.COMPLETED;
		}
		if (
			metricInspectionOptions.appliedOptions.timeAggregationOption &&
			metricInspectionOptions.appliedOptions.timeAggregationInterval
		) {
			return InspectionStep.SPACE_AGGREGATION;
		}
		return InspectionStep.TIME_AGGREGATION;
	}, [metricInspectionOptions]);

	const [spaceAggregatedSeriesMap, setSpaceAggregatedSeriesMap] = useState<
		Map<string, InspectMetricsSeries[]>
	>(new Map());
	const [timeAggregatedSeriesMap, setTimeAggregatedSeriesMap] = useState<
		Map<number, GraphPopoverData[]>
	>(new Map());
	const [aggregatedTimeSeries, setAggregatedTimeSeries] = useState<
		InspectMetricsSeries[]
	>(inspectMetricsTimeSeries);

	useEffect(() => {
		setAggregatedTimeSeries(inspectMetricsTimeSeries);
	}, [inspectMetricsTimeSeries]);

	const formattedInspectMetricsTimeSeries = useMemo(() => {
		let timeSeries: InspectMetricsSeries[] = [...inspectMetricsTimeSeries];

		// Apply time aggregation once required options are set
		if (
			appliedInspectionStep >= InspectionStep.SPACE_AGGREGATION &&
			metricInspectionOptions.appliedOptions.timeAggregationOption &&
			metricInspectionOptions.appliedOptions.timeAggregationInterval
		) {
			const {
				timeAggregatedSeries,
				timeAggregatedSeriesMap,
			} = applyTimeAggregation(
				inspectMetricsTimeSeries,
				metricInspectionOptions.appliedOptions,
			);
			timeSeries = timeAggregatedSeries;
			setTimeAggregatedSeriesMap(timeAggregatedSeriesMap);
			setAggregatedTimeSeries(timeSeries);
		}
		// Apply space aggregation
		if (appliedInspectionStep === InspectionStep.COMPLETED) {
			const { aggregatedSeries, spaceAggregatedSeriesMap } = applySpaceAggregation(
				timeSeries,
				metricInspectionOptions.appliedOptions,
			);
			timeSeries = aggregatedSeries;
			setSpaceAggregatedSeriesMap(spaceAggregatedSeriesMap);
			setAggregatedTimeSeries(aggregatedSeries);
		}

		const timestamps = getAllTimestampsOfMetrics(timeSeries);

		const timeseriesArray = timeSeries.map((series) => {
			const valuesMap = new Map<number, number>();

			series.values.forEach(({ timestamp, value }) => {
				valuesMap.set(timestamp, parseFloat(value));
			});

			return timestamps.map((timestamp) => valuesMap.get(timestamp) ?? NaN);
		});

		const rawData = [timestamps, ...timeseriesArray];
		return rawData.map((series) => new Float64Array(series));
	}, [inspectMetricsTimeSeries, appliedInspectionStep, metricInspectionOptions]);

	const spaceAggregationLabels = useMemo(() => {
		const labels = new Set<string>();
		inspectMetricsData?.payload?.data.series.forEach((series) => {
			Object.keys(series.labels).forEach((label) => {
				labels.add(label);
			});
		});
		return Array.from(labels);
	}, [inspectMetricsData]);

	const reset = useCallback(() => {
		dispatchMetricInspectionOptions({
			type: 'RESET_INSPECTION',
		});
		setSpaceAggregatedSeriesMap(new Map());
		setTimeAggregatedSeriesMap(new Map());
		setAggregatedTimeSeries(inspectMetricsTimeSeries);
	}, [dispatchMetricInspectionOptions, inspectMetricsTimeSeries]);

	return {
		inspectMetricsTimeSeries,
		inspectMetricsStatusCode,
		isInspectMetricsLoading,
		isInspectMetricsError,
		formattedInspectMetricsTimeSeries,
		spaceAggregationLabels,
		metricInspectionOptions,
		dispatchMetricInspectionOptions,
		inspectionStep: currentInspectionStep,
		isInspectMetricsRefetching,
		spaceAggregatedSeriesMap,
		aggregatedTimeSeries,
		timeAggregatedSeriesMap,
		reset,
	};
}
