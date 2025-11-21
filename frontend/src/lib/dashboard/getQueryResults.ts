/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import {
	convertV5ResponseToLegacy,
	getQueryRangeV5,
	prepareQueryRangePayloadV5,
} from 'api/v5/v5';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { Pagination } from 'hooks/queryPagination';
import { convertNewDataToOld } from 'lib/newQueryBuilder/convertNewDataToOld';
import { isEmpty } from 'lodash-es';
import { SuccessResponse, SuccessResponseV2, Warning } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { prepareQueryRangePayload } from './prepareQueryRangePayload';
import { QueryData } from 'types/api/widgets/getQuery';
import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

/**
 * Validates if metric name is available for METRICS data source
 */
function validateMetricNameForMetricsDataSource(query: Query): boolean {
	if (query.queryType !== 'builder') {
		return true; // Non-builder queries don't need this validation
	}

	const { queryData } = query.builder;

	// Check if any METRICS data source queries exist
	const metricsQueries = queryData.filter(
		(queryItem) => queryItem.dataSource === DataSource.METRICS,
	);

	// If no METRICS queries, validation passes
	if (metricsQueries.length === 0) {
		return true;
	}

	// Check if ALL METRICS queries are missing metric names
	const allMetricsQueriesMissingNames = metricsQueries.every((queryItem) => {
		const metricName =
			queryItem.aggregations?.[0]?.metricName || queryItem.aggregateAttribute?.key;
		return !metricName || metricName.trim() === '';
	});

	// Return false only if ALL METRICS queries are missing metric names
	return !allMetricsQueriesMissingNames;
}

/**
 * Helper function to get the data source for a specific query
 */
const getQueryDataSource = (
	queryData: QueryData,
	payloadQuery: Query,
): DataSource | null => {
	const queryItem = payloadQuery.builder?.queryData.find(
		(query) => query.queryName === queryData.queryName,
	);
	return queryItem?.dataSource || null;
};

const getLegendForSingleAggregation = (
	queryData: QueryData,
	allQueries: IBuilderQuery[],
	aggregationAlias: string,
	aggregationExpression: string,
	labelName: string,
	singleAggregation: boolean,
) => {
	const queryItem = allQueries.find(
		(query) => query.queryName === queryData.queryName,
	);

	const legend = queryItem?.legend;
	// Check if groupBy exists and has items
	const hasGroupBy = queryItem?.groupBy && queryItem.groupBy.length > 0;

	if (hasGroupBy) {
		if (singleAggregation) {
			return labelName;
		} else {
			return `${aggregationAlias || aggregationExpression}-${labelName}`;
		}
	} else {
		if (singleAggregation) {
			return aggregationAlias || legend || aggregationExpression;
		} else {
			return aggregationAlias || aggregationExpression;
		}
	}
};

const getLegendForMultipleAggregations = (
	queryData: QueryData,
	allQueries: IBuilderQuery[],
	aggregationAlias: string,
	aggregationExpression: string,
	labelName: string,
	singleAggregation: boolean,
) => {
	const queryItem = allQueries.find(
		(query) => query.queryName === queryData.queryName,
	);

	const legend = queryItem?.legend;
	// Check if groupBy exists and has items
	const hasGroupBy = queryItem?.groupBy && queryItem.groupBy.length > 0;

	if (hasGroupBy) {
		if (singleAggregation) {
			return labelName;
		} else {
			return `${aggregationAlias || aggregationExpression}-${labelName}`;
		}
	} else {
		if (singleAggregation) {
			return aggregationAlias || labelName || aggregationExpression;
		} else {
			return `${aggregationAlias || aggregationExpression}-${labelName}`;
		}
	}
};

export const getLegend = (
	queryData: QueryData,
	payloadQuery: Query,
	labelName: string,
) => {
	// For non-query builder queries, return the label name directly
	if (payloadQuery.queryType !== EQueryType.QUERY_BUILDER) {
		return labelName;
	}

	// Combine queryData and queryTraceOperator
	const allQueries = [
		...(payloadQuery?.builder?.queryData || []),
		...(payloadQuery?.builder?.queryTraceOperator || []),
	];

	const aggregationPerQuery = allQueries.reduce((acc, query) => {
		if (query.queryName === queryData.queryName) {
			acc[query.queryName] = createAggregation(query);
		}
		return acc;
	}, {});

	const metaData = queryData?.metaData;
	const aggregation =
		aggregationPerQuery?.[metaData?.queryName]?.[metaData?.index];

	const aggregationAlias = aggregation?.alias || '';
	const aggregationExpression = aggregation?.expression || '';

	// Check if there's only one total query
	const singleQuery = allQueries.length === 1;
	const singleAggregation =
		aggregationPerQuery?.[metaData?.queryName]?.length === 1;

	if (aggregationAlias || aggregationExpression) {
		return singleQuery
			? getLegendForSingleAggregation(
					queryData,
					allQueries,
					aggregationAlias,
					aggregationExpression,
					labelName,
					singleAggregation,
			  )
			: getLegendForMultipleAggregations(
					queryData,
					allQueries,
					aggregationAlias,
					aggregationExpression,
					labelName,
					singleAggregation,
			  );
	}
	return labelName || metaData?.queryName || queryData.queryName;
};

export async function GetMetricQueryRange(
	props: GetQueryResultsProps,
	version: string,
	dynamicVariables?: IDashboardVariable[],
	signal?: AbortSignal,
	headers?: Record<string, string>,
	isInfraMonitoring?: boolean,
): Promise<SuccessResponse<MetricRangePayloadProps> & { warning?: Warning }> {
	let legendMap: Record<string, string>;
	let response:
		| SuccessResponse<MetricRangePayloadProps>
		| SuccessResponseV2<MetricRangePayloadV5>
		| (SuccessResponse<MetricRangePayloadProps> & { warning?: Warning });
	let warning: Warning | undefined;

	const panelType = props.originalGraphType || props.graphType;

	const finalFormatForWeb =
		props.formatForWeb || panelType === PANEL_TYPES.TABLE;

	// Validate metric name for METRICS data source before making the API call
	if (
		version === ENTITY_VERSION_V5 &&
		!validateMetricNameForMetricsDataSource(props.query)
	) {
		// Return empty response to avoid 400 error when metric name is missing
		return {
			statusCode: 200,
			error: null,
			message: 'Metric name is required for metrics data source',
			payload: {
				data: {
					result: [],
					resultType: '',
					newResult: {
						data: {
							result: [],
							resultType: '',
						},
					},
				},
				warning: undefined,
			},
			params: props,
			warnings: [],
		};
	}

	if (version === ENTITY_VERSION_V5) {
		const v5Result = prepareQueryRangePayloadV5({
			...props,
			dynamicVariables,
		});
		legendMap = v5Result.legendMap;

		// atleast one query should be there to make call to v5 api
		if (v5Result.queryPayload.compositeQuery.queries.length === 0) {
			return {
				statusCode: 200,
				error: null,
				message: 'At least one query is required',
				payload: {
					data: {
						result: [],
						resultType: '',
						newResult: {
							data: {
								result: [],
								resultType: '',
							},
						},
					},
				},
				warning: undefined,
				params: props,
				warnings: [],
			};
		}

		const v5Response = await getQueryRangeV5(
			v5Result.queryPayload,
			version,
			signal,
			headers,
		);

		// Convert V5 response to legacy format for components
		response = convertV5ResponseToLegacy(
			{
				payload: v5Response.data,
				params: v5Result.queryPayload,
			},
			legendMap,
			finalFormatForWeb,
		);

		warning = response.payload.warning || undefined;
	} else {
		const legacyResult = prepareQueryRangePayload(props);
		legendMap = legacyResult.legendMap;

		response = await getMetricsQueryRange(
			legacyResult.queryPayload,
			version || 'v3',
			signal,
			headers,
		);
	}

	if (response.statusCode >= 400 && version !== ENTITY_VERSION_V5) {
		let error = `API responded with ${response.statusCode} -  ${response.error} status: ${response.message}`;
		if (response.body && !isEmpty(response.body)) {
			error = `${error}, errors: ${response.body}`;
		}
		throw new Error(error);
	}

	if (finalFormatForWeb) {
		return response;
	}

	if (response.payload?.data?.result) {
		const v2Range = convertNewDataToOld(response.payload);

		response.payload = v2Range;

		response.payload.data.result = response.payload.data.result.map(
			(queryData) => {
				const newQueryData = queryData;
				newQueryData.legend = legendMap[queryData.queryName]; // Adds the legend if it is already defined by the user.
				// If metric names is an empty object
				if (isEmpty(queryData.metric)) {
					// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
					if (!newQueryData.legend) {
						newQueryData.legend = queryData.queryName;
					}
					// If name of the query and the legend if inserted is same then add the same to the metrics object.
					if (queryData.queryName === newQueryData.legend) {
						newQueryData.metric[queryData.queryName] = queryData.queryName;
					}
				}

				return newQueryData;
			},
		);
	}

	if (response.payload?.data?.newResult?.data?.resultType === 'anomaly') {
		response.payload.data.newResult.data.result = response.payload.data.newResult.data.result.map(
			(queryData) => {
				if (legendMap[queryData.queryName]) {
					queryData.legend = legendMap[queryData.queryName];
				}

				return queryData;
			},
		);
	}

	return {
		...response,
		warning,
	};
}

export interface GetQueryResultsProps {
	query: Query;
	graphType: PANEL_TYPES;
	selectedTime: timePreferenceType;
	globalSelectedInterval?: Time | TimeV2 | CustomTimeType;
	variables?: Record<string, unknown>;
	params?: Record<string, unknown>;
	fillGaps?: boolean;
	formatForWeb?: boolean;
	tableParams?: {
		pagination?: Pagination;
		selectColumns?: any;
	};
	start?: number;
	end?: number;
	step?: number;
	originalGraphType?: PANEL_TYPES;
	dynamicVariables?: IDashboardVariable[];
}
