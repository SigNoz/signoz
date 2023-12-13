/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { Pagination } from 'hooks/queryPagination';
import { convertNewDataToOld } from 'lib/newQueryBuilder/convertNewDataToOld';
import { isEmpty } from 'lodash-es';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { prepareQueryRangePayload } from './prepareQueryRangePayload';

export async function GetMetricQueryRange(
	props: GetQueryResultsProps,
	signal?: AbortSignal,
): Promise<SuccessResponse<MetricRangePayloadProps>> {
	const { legendMap, queryPayload } = prepareQueryRangePayload(props);

	const response = await getMetricsQueryRange(queryPayload, signal);

	if (response.statusCode >= 400) {
		throw new Error(
			`API responded with ${response.statusCode} -  ${response.error}`,
		);
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
	return response;
}

export interface GetQueryResultsProps {
	query: Query;
	graphType: PANEL_TYPES;
	selectedTime: timePreferenceType;
	globalSelectedInterval: Time;
	variables?: Record<string, unknown>;
	params?: Record<string, unknown>;
	tableParams?: {
		pagination?: Pagination;
		selectColumns?: any;
	};
}
