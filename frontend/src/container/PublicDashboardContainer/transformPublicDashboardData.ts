/**
 * Transforms public dashboard widget data to the format expected by WidgetGraphComponent.
 *
 * This module acts as an adapter between the public dashboard API response and
 * the regular dashboard rendering components. It reuses the same transformation
 * functions used in GetMetricQueryRange (lib/dashboard/getQueryResults.ts) to ensure
 * consistent data handling.
 */

import { convertV5ResponseToLegacy } from 'api/v5/queryRange/convertV5Response';
import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { convertNewDataToOld } from 'lib/newQueryBuilder/convertNewDataToOld';
import { isEmpty } from 'lodash-es';
import { QueryObserverResult, UseQueryResult } from 'react-query';
import { SuccessResponse, SuccessResponseV2 } from 'types/api';
import { PublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';
import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryEnvelope, QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';

interface LegendSource {
	queryName?: string;
	name?: string;
	legend?: string;
}

/**
 * Helper to extract legend from query items.
 * This matches the legendMap building in prepareQueryRangePayloadV5.
 */
function extractLegends(
	items: LegendSource[] | undefined,
): Record<string, string> {
	const legends: Record<string, string> = {};
	items?.forEach((item) => {
		const key = item.queryName || item.name;
		if (key) {
			legends[key] = item.legend || '';
		}
	});
	return legends;
}

/**
 * Builds a legend map from widget query configuration.
 * This matches the logic in prepareQueryRangePayloadV5.
 */
function buildLegendMapFromQuery(
	query: Query | undefined,
): Record<string, string> {
	if (!query) {
		return {};
	}

	if (query.queryType === EQueryType.QUERY_BUILDER) {
		return {
			...extractLegends(query.builder?.queryData),
			...extractLegends(query.builder?.queryFormulas),
		};
	}

	if (query.queryType === EQueryType.CLICKHOUSE) {
		return extractLegends(query.clickhouse_sql);
	}

	if (query.queryType === EQueryType.PROM) {
		return extractLegends(query.promql);
	}

	return {};
}

/**
 * Builds query envelope params from widget query configuration.
 * This provides aggregation info needed by convertV5ResponseToLegacy.
 */
function buildQueryEnvelopesFromWidgetQuery(
	widgetQuery: Query | undefined,
): QueryEnvelope[] {
	if (!widgetQuery || widgetQuery.queryType !== EQueryType.QUERY_BUILDER) {
		return [];
	}

	const queryEnvelopes: QueryEnvelope[] = [];

	widgetQuery.builder?.queryData?.forEach((queryData) => {
		if (queryData.queryName) {
			const aggregations = createAggregation(queryData);

			queryEnvelopes.push({
				type: 'builder_query',
				spec: {
					name: queryData.queryName,
					signal: queryData.dataSource as 'traces' | 'logs' | 'metrics',
					aggregations,
				},
			} as QueryEnvelope);
		}
	});

	return queryEnvelopes;
}

/**
 * Applies legend mapping to query results.
 * This EXACTLY matches the logic in GetMetricQueryRange (lines 322-340).
 */
function applyLegendMapping(
	result: QueryData[],
	legendMap: Record<string, string>,
): QueryData[] {
	return result.map((queryData) => {
		const newQueryData = { ...queryData };
		// Adds the legend if it is already defined by the user.
		newQueryData.legend = legendMap[queryData.queryName];

		// If metric names is an empty object
		if (isEmpty(queryData.metric)) {
			// If metrics list is empty && the user haven't defined a legend
			// then add the legend equal to the name of the query.
			if (!newQueryData.legend) {
				newQueryData.legend = queryData.queryName;
			}
			// If name of the query and the legend if inserted is same
			// then add the same to the metrics object.
			if (queryData.queryName === newQueryData.legend) {
				newQueryData.metric = { ...newQueryData.metric };
				newQueryData.metric[queryData.queryName] = queryData.queryName;
			}
		}

		return newQueryData;
	});
}

/**
 * Creates a loading/idle query result when no data is available.
 */
function createLoadingResult(
	isLoading: boolean,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> {
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
			QueryObserverResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error>
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

/**
 * Creates a success query result wrapper.
 */
function createSuccessResult(
	data: SuccessResponse<MetricRangePayloadProps, unknown>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> {
	const successResult = {
		data,
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

/**
 * Converts QueryDataV3[] to QueryData[] for scalar/table results.
 */
function convertScalarResultToLegacy(v3Result: QueryDataV3[]): QueryData[] {
	return v3Result.map((item) => {
		// Convert Column[] to { [key: string]: string }[] format
		const legacyColumns = item.table?.columns?.map((col) => ({
			name: col.name,
			queryName: col.queryName,
			isValueColumn: String(col.isValueColumn),
			id: col.id || '',
		}));

		return {
			metric: {},
			values: [],
			queryName: item.queryName,
			legend: item.legend,
			table: item.table
				? {
						rows: item.table.rows,
						columns: legacyColumns || [],
				  }
				: undefined,
		};
	});
}

/**
 * Transforms public dashboard widget data to the queryResponse format expected by WidgetGraphComponent.
 *
 * This function mirrors the transformation logic in GetMetricQueryRange:
 * 1. Builds legendMap from widget query (same as prepareQueryRangePayloadV5)
 * 2. Calls convertV5ResponseToLegacy (same function used in GetMetricQueryRange)
 * 3. For non-table data: calls convertNewDataToOld (same function)
 * 4. Applies legend mapping (same logic as GetMetricQueryRange lines 322-340)
 */
export function transformPublicDashboardDataToQueryResponse(
	publicDashboardWidgetData:
		| SuccessResponseV2<PublicDashboardWidgetDataProps>
		| undefined,
	isLoading: boolean,
	widgetQuery?: Query,
	startTime?: number,
	endTime?: number,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> {
	if (!publicDashboardWidgetData?.data) {
		return createLoadingResult(isLoading);
	}

	// Step 1: Build legendMap from widget query (matches prepareQueryRangePayloadV5)
	const legendMap = buildLegendMapFromQuery(widgetQuery);

	// Build query envelopes to provide aggregation info for convertV5ResponseToLegacy
	const queryEnvelopes = buildQueryEnvelopesFromWidgetQuery(widgetQuery);

	// Determine if this is a table/scalar format (formatForWeb case)
	const isScalarFormat = publicDashboardWidgetData.data.type === 'scalar';

	// Step 2: Prepare V5 response structure for convertV5ResponseToLegacy
	// This matches the structure passed in GetMetricQueryRange:
	// convertV5ResponseToLegacy({ payload: v5Response.data, params: v5Result.queryPayload }, legendMap, finalFormatForWeb)
	const v5Response = {
		statusCode: publicDashboardWidgetData.httpStatusCode as 200,
		message: 'Success',
		error: null,
		payload: {
			data: publicDashboardWidgetData.data,
		},
		params: ({
			compositeQuery: {
				queries: queryEnvelopes,
			},
			start: startTime,
			end: endTime,
		} as unknown) as QueryRangeRequestV5,
	};

	// Step 3: Call convertV5ResponseToLegacy (same as GetMetricQueryRange line 283-290)
	const v3Response = convertV5ResponseToLegacy(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		v5Response as any,
		legendMap,
		isScalarFormat, // formatForWeb for table/scalar panels
	);

	let finalPayload: MetricRangePayloadProps;

	// Step 4: Handle based on format (same as GetMetricQueryRange lines 313-341)
	if (isScalarFormat) {
		// For tables (formatForWeb=true), return directly without convertNewDataToOld
		// This matches GetMetricQueryRange line 314: "return response;"
		const v3Result = (v3Response.payload?.data?.result || []) as QueryDataV3[];
		const legacyResult = convertScalarResultToLegacy(v3Result);
		const resultType = v3Response.payload?.data?.resultType || 'scalar';

		finalPayload = {
			data: {
				result: legacyResult,
				resultType,
				newResult: {
					data: {
						result: v3Result,
						resultType,
					},
				},
			},
		};
	} else {
		// For time series: call convertNewDataToOld then apply legends
		// This matches GetMetricQueryRange lines 317-340
		const v3Payload = v3Response.payload as MetricRangePayloadV3;

		// Step 4a: convertNewDataToOld (matches line 318)
		finalPayload = convertNewDataToOld(v3Payload);

		// Step 4b: Apply legend mapping (matches lines 322-340)
		if (finalPayload?.data?.result) {
			finalPayload = {
				...finalPayload,
				data: {
					...finalPayload.data,
					result: applyLegendMapping(finalPayload.data.result, legendMap),
				},
			};
		}
	}

	// Wrap in SuccessResponse format
	const finalResponse: SuccessResponse<MetricRangePayloadProps, unknown> = {
		statusCode: 200,
		message: 'Success',
		error: null,
		payload: finalPayload,
		// Include params with start/end times for UplotPanelWrapper time range
		params: {
			start: startTime,
			end: endTime,
		},
	};

	return createSuccessResult(finalResponse);
}
