import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetRelatedMetrics } from 'hooks/metricsExplorer/useGetRelatedMetrics';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuidv4 } from 'uuid';

import { convertNanoToMilliseconds } from '../Summary/utils';
import {
	UseGetRelatedMetricsGraphsProps,
	UseGetRelatedMetricsGraphsReturn,
} from './types';

export const useGetRelatedMetricsGraphs = ({
	selectedMetricName,
	startMs,
	endMs,
}: UseGetRelatedMetricsGraphsProps): UseGetRelatedMetricsGraphsReturn => {
	const { maxTime, minTime, selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	// Build the query for the related metrics
	const relatedMetricsQuery = useMemo(
		() => ({
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			currentMetricName: selectedMetricName ?? '',
		}),
		[selectedMetricName, minTime, maxTime],
	);

	// Get the related metrics
	const {
		data: relatedMetricsData,
		isLoading: isRelatedMetricsLoading,
		isError: isRelatedMetricsError,
	} = useGetRelatedMetrics(relatedMetricsQuery, {
		enabled: !!selectedMetricName,
	});

	// Build the related metrics array
	const relatedMetrics = useMemo(() => {
		if (relatedMetricsData?.payload?.data?.related_metrics) {
			return relatedMetricsData.payload.data.related_metrics;
		}
		return [];
	}, [relatedMetricsData]);

	// Build the query results for the related metrics
	const relatedMetricsQueryResults = useQueries(
		useMemo(
			() =>
				relatedMetrics.map((metric) => ({
					queryKey: ['related-metrics', metric.name],
					queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
						GetMetricQueryRange(
							{
								query: {
									queryType: EQueryType.QUERY_BUILDER,
									promql: [],
									builder: {
										queryData: [metric.query],
										queryFormulas: [],
										queryTraceOperator: [],
									},
									clickhouse_sql: [],
									id: uuidv4(),
								},
								graphType: PANEL_TYPES.TIME_SERIES,
								selectedTime: 'GLOBAL_TIME',
								globalSelectedInterval: globalSelectedTime,
								start: startMs,
								end: endMs,
								formatForWeb: false,
								params: {
									dataSource: DataSource.METRICS,
								},
							},
							ENTITY_VERSION_V4,
						),
					enabled: !!metric.query,
				})),
			[relatedMetrics, globalSelectedTime, startMs, endMs],
		),
	);

	// Build the related metrics with query results
	const relatedMetricsWithQueryResults = useMemo(
		() =>
			relatedMetrics.map((metric, index) => ({
				...metric,
				queryResult: relatedMetricsQueryResults[index],
			})),
		[relatedMetrics, relatedMetricsQueryResults],
	);

	return {
		relatedMetrics: relatedMetricsWithQueryResults,
		isRelatedMetricsLoading,
		isRelatedMetricsError,
	};
};
