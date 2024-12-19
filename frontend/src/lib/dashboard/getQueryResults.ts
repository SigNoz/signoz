/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
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
	const { legendMap, queryPayload } = prepareQueryRangePayload(props);
	const response = await getMetricsQueryRange(
		queryPayload,
		version || 'v3',
		signal,
		headers,
	);

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
}
