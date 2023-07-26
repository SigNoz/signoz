import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { UseQueryResult } from 'react-query';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { ServicesList } from 'types/api/metrics/getService';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { serviceMetricsQuery } from './ServiceMetrics/ServiceMetricsQuery';
import { GetQueryRangeRequestDataProps } from './types';

export function getSeriesValue(
	queryArray: QueryDataV3[],
	queryName: string,
): string {
	const queryObject = queryArray.find((item) => item.queryName === queryName);
	const series = queryObject ? queryObject.series : 0;
	return series ? series[0].values[0].value : '0';
}

export const getQueryRangeRequestData = ({
	topLevelOperations,
	maxTime,
	minTime,
	globalSelectedInterval,
}: GetQueryRangeRequestDataProps): GetQueryResultsProps[] => {
	const requestData: GetQueryResultsProps[] = [];
	topLevelOperations.forEach((operation) => {
		const serviceMetricsWidget = getWidgetQueryBuilder({
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				builder: serviceMetricsQuery(operation),
				clickhouse_sql: [],
				id: uuid(),
			},
			panelTypes: PANEL_TYPES.TABLE,
		});

		const updatedQuery = updateStepInterval(
			serviceMetricsWidget.query,
			maxTime,
			minTime,
		);

		requestData.push({
			selectedTime: serviceMetricsWidget?.timePreferance,
			graphType: serviceMetricsWidget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(),
		});
	});
	return requestData;
};

export const getServiceListFromQuery = (
	queries: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>[],
	topLevelOperations: [keyof ServiceDataProps, string[]][],
): ServicesList[] => {
	const services: ServicesList[] = [];
	queries.forEach((query, index) => {
		if (query.data) {
			const serviceData: ServicesList = {
				serviceName: topLevelOperations[index][0].toString(),
				p99: parseFloat(
					getSeriesValue(query.data.payload.data.newResult.data.result, 'A'),
				),
				avgDuration: 0,
				numCalls: 0,
				callRate: parseFloat(
					getSeriesValue(query.data.payload.data.newResult.data.result, 'D'),
				),
				numErrors: 0,
				errorRate: parseFloat(
					getSeriesValue(query.data.payload.data.newResult.data.result, 'F1'),
				),
			};
			services.push(serviceData);
		}
	});
	return services;
};
