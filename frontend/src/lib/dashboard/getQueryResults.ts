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
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { prepareQueryRangePayload } from './prepareQueryRangePayload';

export async function GetMetricQueryRange(
	props: GetQueryResultsProps,
	version: string,
	signal?: AbortSignal,
	headers?: Record<string, string>,
	isInfraMonitoring?: boolean,
): Promise<SuccessResponse<MetricRangePayloadProps>> {
	let legendMap: Record<string, string>;
	let response: SuccessResponse<MetricRangePayloadProps>;

	if (version === ENTITY_VERSION_V5) {
		const v5Result = prepareQueryRangePayloadV5(props);
		legendMap = v5Result.legendMap;

		const v5Response = await getQueryRangeV5(
			v5Result.queryPayload,
			version,
			signal,
			headers,
		);

		// Convert V5 response to legacy format for components
		response = convertV5ResponseToLegacy(v5Response, legendMap);
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

	// todo: Sagar
	if (response.statusCode >= 400 && version === ENTITY_VERSION_V5) {
		let error = `API responded with ${response.statusCode} -  ${response.error?.message} status: ${response?.status}`;
		if (response.body && !isEmpty(response.body)) {
			error = `${error}, errors: ${response.body}`;
		}
		throw new Error(error);
	}

	if (response.statusCode >= 400) {
		let error = `API responded with ${response.statusCode} -  ${response.error} status: ${response.message}`;
		if (response.body && !isEmpty(response.body)) {
			error = `${error}, errors: ${response.body}`;
		}
		throw new Error(error);
	}

	if (props.formatForWeb) {
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

	return response;
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
}
