import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery } from 'react-query';
import { inspectMetrics } from 'api/generated/services/metrics';
import { isAxiosError } from 'axios';
import { MAX_QUERY_RETRIES } from 'constants/reactQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';

import { INITIAL_INSPECT_METRICS_OPTIONS } from './constants';
import {
	GraphPopoverData,
	InspectionStep,
	InspectMetricsSeries,
	MetricInspectionAction,
	MetricInspectionState,
	UseInspectMetricsReturnData,
} from './types';
import {
	applySpaceAggregation,
	applyTimeAggregation,
	getAllTimestampsOfMetrics,
} from './utils';

const metricInspectionReducer = (
	state: MetricInspectionState,
	action: MetricInspectionAction,
): MetricInspectionState => {
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
					filterExpression: action.payload,
				},
			};
		case 'APPLY_METRIC_INSPECTION_OPTIONS':
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
		data: inspectMetricsResponse,
		isLoading: isInspectMetricsLoading,
		isError: isInspectMetricsError,
		isRefetching: isInspectMetricsRefetching,
	} = useQuery({
		queryKey: [
			REACT_QUERY_KEY.GET_INSPECT_METRICS_DETAILS,
			metricName,
			start,
			end,
			metricInspectionOptions.appliedOptions.filterExpression,
		],
		queryFn: ({ signal }) =>
			inspectMetrics(
				{
					metricName: metricName ?? '',
					start,
					end,
					filter: metricInspectionOptions.appliedOptions.filterExpression
						? { expression: metricInspectionOptions.appliedOptions.filterExpression }
						: undefined,
				},
				signal,
			),
		enabled: !!metricName,
		keepPreviousData: true,
		retry: (failureCount: number, error: Error): boolean => {
			if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
				return false;
			}
			return failureCount < MAX_QUERY_RETRIES;
		},
	});

	const inspectMetricsData = useMemo(
		() => ({
			series: (inspectMetricsResponse?.data?.series ?? []).map((s) => {
				const labels: Record<string, string> = {};
				for (const l of s.labels ?? []) {
					if (l.key?.name) {
						labels[l.key.name] = String(l.value ?? '');
					}
				}
				return {
					labels,
					values: (s.values ?? []).map((v) => ({
						timestamp: v.timestamp ?? 0,
						value: String(v.value ?? 0),
					})),
				};
			}) as InspectMetricsSeries[],
		}),
		[inspectMetricsResponse],
	);
	const isDarkMode = useIsDarkMode();

	const inspectMetricsTimeSeries = useMemo(() => {
		const series = inspectMetricsData?.series ?? [];

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
			const { timeAggregatedSeries, timeAggregatedSeriesMap } =
				applyTimeAggregation(
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
				valuesMap.set(timestamp, Number.parseFloat(value));
			});

			return timestamps.map((timestamp) => valuesMap.get(timestamp) ?? Number.NaN);
		});

		const rawData = [timestamps, ...timeseriesArray];
		return rawData.map((series) => new Float64Array(series));
	}, [inspectMetricsTimeSeries, appliedInspectionStep, metricInspectionOptions]);

	const spaceAggregationLabels = useMemo(() => {
		const labels = new Set<string>();
		inspectMetricsData?.series?.forEach((series) => {
			Object.keys(series.labels).forEach((label) => {
				labels.add(label);
			});
		});
		return [...labels];
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
