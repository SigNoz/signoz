import { UseQueryResult } from 'react-query';
import { SuccessResponse, SuccessResponseV2 } from 'types/api';
import { PublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData, QueryDataV3, SeriesItem } from 'types/api/widgets/getQuery';

/**
 * Transforms public dashboard widget data to the queryResponse format expected by WidgetGraphComponent
 */
export function transformPublicDashboardDataToQueryResponse(
	publicDashboardWidgetData:
		| SuccessResponseV2<PublicDashboardWidgetDataProps>
		| undefined,
	isLoading: boolean,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> {
	if (!publicDashboardWidgetData?.data) {
		return {
			data: undefined,
			error: null,
			isError: false,
			isLoading,
			isSuccess: false,
			isIdle: false,
			status: isLoading ? 'loading' : 'idle',
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			errorUpdateCount: 0,
			isFetched: false,
			isFetchedAfterMount: false,
			isFetching: isLoading,
			isRefetching: false,
			isLoadingError: false,
			isPlaceholderData: false,
			isPreviousData: false,
			isRefetchError: false,
			isStale: false,
			refetch: async () => ({
				data: undefined,
				error: null,
				isError: false,
				isLoading: false,
				isSuccess: false,
				isIdle: false,
				status: 'idle' as const,
			}),
			remove: () => {},
		} as UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error>;
	}

	// The actual API response structure has: { type, meta, data: { results: [...] } }
	// Access it as: publicDashboardWidgetData.data.data.results
	const widgetData = publicDashboardWidgetData.data as any; // Type doesn't match actual API response
	const resultType = widgetData.type || 'time_series';
	const results = widgetData.data?.results || [];

	// Transform to QueryDataV3 format (newResult)
	const newResultData: QueryDataV3[] = results.map((result) => {
		const { queryName } = result;
		const aggregations = result.aggregations || [];

		// Process series data from aggregations
		const series: SeriesItem[] = aggregations.flatMap((aggregation) => {
			const { index, alias, series: aggregationSeries = [] } = aggregation;

			return aggregationSeries.map((seriesItem) => {
				// Convert values from {timestamp, value, partial?} to {timestamp, value}[]
				const values = seriesItem.values.map((val) => ({
					timestamp: val.timestamp,
					value: String(val.value),
				}));

				// Extract labels from series if available, otherwise use queryName
				const labels: Record<string, string> = {};
				if (queryName) {
					labels[queryName] = queryName;
				}

				return {
					labels,
					labelsArray: [],
					values,
					metaData: {
						alias: alias || `__result_${index}`,
						index,
						queryName,
					},
				};
			});
		});

		return {
			queryName,
			legend: queryName,
			series: series.length > 0 ? series : null,
			predictedSeries: null,
			upperBoundSeries: null,
			lowerBoundSeries: null,
			anomalyScores: null,
			list: null,
		};
	});

	// Transform to QueryData format (legacy result)
	const legacyResult: QueryData[] = results.flatMap((result) => {
		const { queryName } = result;
		const aggregations = result.aggregations || [];

		return aggregations.flatMap((aggregation) => {
			const { index, alias, series: aggregationSeries = [] } = aggregation;

			return aggregationSeries.map((seriesItem) => {
				// Convert values to [timestamp_in_seconds, value_string][] format
				const values: [number, string][] = seriesItem.values
					.map((val) => [
						Math.floor(val.timestamp / 1000), // Convert milliseconds to seconds
						String(val.value),
					])
					.sort((a, b) => a[0] - b[0]); // Sort by timestamp

				// Create metric object from queryName
				const metric: Record<string, string> = {};
				if (queryName) {
					metric[queryName] = queryName;
				}

				return {
					metric,
					values,
					queryName,
					legend: queryName,
					metaData: {
						alias: alias || `__result_${index}`,
						index,
						queryName,
					},
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

	return {
		data: successResponse,
		error: null,
		isError: false,
		isLoading: false,
		isSuccess: true,
		isIdle: false,
		status: 'success',
		dataUpdatedAt: Date.now(),
		errorUpdatedAt: 0,
		failureCount: 0,
		errorUpdateCount: 0,
		isFetched: true,
		isFetchedAfterMount: true,
		isFetching: false,
		isRefetching: false,
		isLoadingError: false,
		isPlaceholderData: false,
		isPreviousData: false,
		isRefetchError: false,
		isStale: false,
		refetch: async () => ({
			data: successResponse,
			error: null,
			isError: false,
			isLoading: false,
			isSuccess: true,
			isIdle: false,
			status: 'success' as const,
		}),
		remove: () => {},
	} as UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error>;
}
