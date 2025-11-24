/* eslint-disable sonarjs/no-identical-functions */
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { QueryObserverResult, UseQueryResult } from 'react-query';
import { SuccessResponse, SuccessResponseV2 } from 'types/api';
import { PublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';

/**
 * Builds a legend map from widget query configuration
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
function buildLegendMapFromQuery(
	query: Query | undefined,
): Record<string, string> {
	if (!query) {
		return {};
	}

	const legendMap: Record<string, string> = {};

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			// Extract legends from queryData
			if (query.builder?.queryData) {
				query.builder.queryData.forEach((q) => {
					if (q.queryName) {
						legendMap[q.queryName] = q.legend || '';
					}
				});
			}
			// Extract legends from queryFormulas
			if (query.builder?.queryFormulas) {
				query.builder.queryFormulas.forEach((q: any) => {
					if (q.queryName) {
						legendMap[q.queryName] = q.legend || '';
					}
				});
			}
			break;
		}
		case EQueryType.CLICKHOUSE: {
			if (query.clickhouse_sql) {
				query.clickhouse_sql.forEach((q) => {
					if (q.name) {
						legendMap[q.name] = q.legend || '';
					}
				});
			}
			break;
		}
		case EQueryType.PROM: {
			if (query.promql) {
				query.promql.forEach((q) => {
					if (q.name) {
						legendMap[q.name] = q.legend || '';
					}
				});
			}
			break;
		}
		default:
			break;
	}

	return legendMap;
}

/**
 * Extracts labels from seriesItem in V5 format
 */
function extractLabelsFromSeriesItem(seriesItem: any): Record<string, string> {
	if (!seriesItem?.labels) {
		return {};
	}

	// Handle V5 format: labels is an array of {key: {name: string}, value: string}
	if (Array.isArray(seriesItem.labels)) {
		return Object.fromEntries(
			seriesItem.labels.map((label: any) => [
				label.key?.name || label.key,
				label.value || '',
			]),
		);
	}

	// Handle legacy format: labels is already an object
	if (typeof seriesItem.labels === 'object') {
		return seriesItem.labels;
	}

	return {};
}

/**
 * Transforms public dashboard widget data to the queryResponse format expected by WidgetGraphComponent
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function transformPublicDashboardDataToQueryResponse(
	publicDashboardWidgetData:
		| SuccessResponseV2<PublicDashboardWidgetDataProps>
		| undefined,
	isLoading: boolean,
	widgetQuery?: Query,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> {
	if (!publicDashboardWidgetData?.data) {
		const loadingResult = {
			data: undefined,
			error: null,
			isError: false as const,
			isLoading,
			isSuccess: false as const,
			isIdle: false as const,
			status: (isLoading ? 'loading' : 'idle') as 'loading' | 'idle',
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			errorUpdateCount: 0,
			isFetched: false as const,
			isFetchedAfterMount: false as const,
			isFetching: isLoading,
			isRefetching: false as const,
			isLoadingError: false as const,
			isPlaceholderData: false as const,
			isPreviousData: false as const,
			isRefetchError: false as const,
			isStale: false as const,
			refetch: async (): Promise<
				QueryObserverResult<
					SuccessResponse<MetricRangePayloadProps, unknown>,
					Error
				>
			> =>
				loadingResult as QueryObserverResult<
					SuccessResponse<MetricRangePayloadProps, unknown>,
					Error
				>,
			remove: (): void => {},
		};
		return loadingResult as UseQueryResult<
			SuccessResponse<MetricRangePayloadProps, unknown>,
			Error
		>;
	}

	// The actual API response structure has: { type, meta, data: { results: [...] } }
	// Access it as: publicDashboardWidgetData.data.data.results
	const widgetData = publicDashboardWidgetData.data as any; // Type doesn't match actual API response
	const resultType = widgetData.type || 'time_series';
	const results = widgetData.data?.results || [];

	// Build legend map from widget query
	const legendMap = buildLegendMapFromQuery(widgetQuery);

	// Transform to QueryDataV3 format (newResult)
	const newResultData: QueryDataV3[] = results.map((result: any) => {
		const { queryName } = result;
		const aggregations = result.aggregations || [];

		// Process series data from aggregations
		const series: SeriesItem[] = aggregations.flatMap((aggregation: any) => {
			const { index, alias, series: aggregationSeries = [] } = aggregation;

			return aggregationSeries.map((seriesItem: any) => {
				// Convert values from {timestamp, value, partial?} to {timestamp, value}[]
				const values = seriesItem.values.map((val: any) => ({
					timestamp: val.timestamp,
					value: String(val.value),
				}));

				// Extract labels from seriesItem (V5 format)
				const labels = extractLabelsFromSeriesItem(seriesItem);

				// Build labelsArray from labels object
				const labelsArray = Object.entries(labels).map(([key, value]) => ({
					[key]: value,
				}));

				return {
					labels,
					labelsArray,
					values,
					metaData: {
						alias: alias || `__result_${index}`,
						index,
						queryName,
					},
				};
			});
		});

		// For QueryDataV3, compute legend using the first series (if available)
		// The actual rendering will use series-level legends from legacyResult
		let computedLegend = legendMap[queryName] || queryName;
		if (series.length > 0 && widgetQuery) {
			const firstSeries = series[0];
			const labelName = getLabelName(
				firstSeries.labels || {},
				queryName,
				legendMap[queryName] || '',
			);
			const mockQueryData: QueryData = {
				metric: firstSeries.labels || {},
				values: [],
				queryName,
				legend: legendMap[queryName] || '',
				metaData: firstSeries.metaData,
			};
			computedLegend = getLegend(mockQueryData, widgetQuery, labelName);

			// If the computed legend is just an aggregation expression (like "count()", "sum()", etc.)
			// and we have metric labels, prefer the labelName instead
			const isAggregationExpression =
				computedLegend &&
				(computedLegend.endsWith('()') ||
					/^(count|sum|avg|min|max|p\d+|quantile|rate|increase|delta)\(/.test(
						computedLegend,
					));

			// Check if we have metric labels (non-empty metric object)
			const hasMetricLabels =
				firstSeries.labels && Object.keys(firstSeries.labels).length > 0;

			// If we got an aggregation expression and have metric labels, always prefer labelName
			// This ensures we show meaningful labels like {key="value"} instead of "count()"
			// Even if labelName equals queryName, if we have metric labels, getLabelName should format them
			if (
				isAggregationExpression &&
				hasMetricLabels &&
				labelName &&
				labelName.trim()
			) {
				computedLegend = labelName;
			}
		}

		return {
			queryName,
			legend: computedLegend,
			series: series.length > 0 ? series : null,
			predictedSeries: null,
			upperBoundSeries: null,
			lowerBoundSeries: null,
			anomalyScores: null,
			list: null,
		};
	});

	// Transform to QueryData format (legacy result)
	const legacyResult: QueryData[] = results.flatMap((result: any) => {
		const { queryName } = result;
		const aggregations = result.aggregations || [];

		return aggregations.flatMap((aggregation: any) => {
			const { index, alias, series: aggregationSeries = [] } = aggregation;

			return aggregationSeries.map((seriesItem: any) => {
				// Convert values to [timestamp_in_seconds, value_string][] format
				const values: [number, string][] = seriesItem.values
					.map((val: any) => [
						Math.floor(val.timestamp / 1000), // Convert milliseconds to seconds
						String(val.value),
					])
					.sort((a: any, b: any) => a[0] - b[0]); // Sort by timestamp

				// Extract labels from seriesItem (V5 format) and use as metric
				const metric = extractLabelsFromSeriesItem(seriesItem);

				// Compute labelName from metric labels (same as regular dashboard)
				const legendFromMap = legendMap[queryName] || '';
				const labelName = getLabelName(metric, queryName, legendFromMap);

				// Create QueryData object for getLegend function
				const queryData: QueryData = {
					metric,
					values,
					queryName,
					legend: legendFromMap,
					metaData: {
						alias: alias || `__result_${index}`,
						index, // This index corresponds to the aggregation index
						queryName,
					},
				};

				// Use getLegend to compute the final legend (same as regular dashboard)
				// getLegend uses createAggregation to extract aggregation alias/expression from widgetQuery
				// and combines it with labelName to compute the final legend
				let computedLegend = widgetQuery
					? getLegend(queryData, widgetQuery, labelName)
					: labelName || queryName;

				// If the computed legend is just an aggregation expression (like "count()", "sum()", etc.)
				// and we have metric labels, prefer the labelName instead
				const isAggregationExpression =
					computedLegend &&
					(computedLegend.endsWith('()') ||
						/^(count|sum|avg|min|max|p\d+|quantile|rate|increase|delta)\(/.test(
							computedLegend,
						));

				// Check if we have metric labels (non-empty metric object)
				const hasMetricLabels = metric && Object.keys(metric).length > 0;

				// If we got an aggregation expression and have metric labels, always prefer labelName
				// This ensures we show meaningful labels like {key="value"} instead of "count()"
				// Even if labelName equals queryName, if we have metric labels, getLabelName should format them
				if (
					isAggregationExpression &&
					hasMetricLabels &&
					labelName &&
					labelName.trim()
				) {
					computedLegend = labelName;
				}

				return {
					...queryData,
					legend: computedLegend,
				};
			});
		});
	});

	// Create the response structure
	const successResponse: SuccessResponse<MetricRangePayloadProps, unknown> = {
		statusCode: publicDashboardWidgetData.httpStatusCode as any,
		message: 'Success',
		payload: {
			data: {
				result: legacyResult,
				resultType,
				newResult: {
					data: {
						result: newResultData,
						resultType,
					},
				},
			},
		},
		error: null,
	};

	const successResult = {
		data: successResponse,
		error: null,
		isError: false as const,
		isLoading: false as const,
		isSuccess: true as const,
		isIdle: false as const,
		status: 'success' as const,
		dataUpdatedAt: Date.now(),
		errorUpdatedAt: 0,
		failureCount: 0,
		errorUpdateCount: 0,
		isFetched: true as const,
		isFetchedAfterMount: true as const,
		isFetching: false as const,
		isRefetching: false as const,
		isLoadingError: false as const,
		isPlaceholderData: false as const,
		isPreviousData: false as const,
		isRefetchError: false as const,
		isStale: false as const,
		refetch: async (): Promise<
			QueryObserverResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error>
		> =>
			successResult as QueryObserverResult<
				SuccessResponse<MetricRangePayloadProps, unknown>,
				Error
			>,
		remove: (): void => {},
	};
	return successResult as UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}
