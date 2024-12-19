import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { ServicesList } from 'types/api/metrics/getService';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { serviceMetricsQuery } from './ServiceMetrics/ServiceMetricsQuery';
import {
	GetQueryRangeRequestDataProps,
	GetServiceListFromQueryProps,
} from './types';

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

export const getServiceListFromQuery = ({
	queries,
	topLevelOperations,
	isLoading,
}: GetServiceListFromQueryProps): ServicesList[] => {
	const services: ServicesList[] = [];
	if (!isLoading) {
		queries.forEach((query, index) => {
			// handling error case if query fails
			if (query.isError) {
				const serviceData: ServicesList = {
					serviceName: topLevelOperations[index][0].toString(),
					p99: 0,
					callRate: 0,
					errorRate: 0,
					avgDuration: 0,
					numCalls: 0,
					numErrors: 0,
				};
				services.push(serviceData);
			}
			if (query.data) {
				const queryArray = query.data?.payload?.data?.newResult?.data?.result;
				const serviceData: ServicesList = {
					serviceName: topLevelOperations[index][0].toString(),
					p99: parseFloat(getSeriesValue(queryArray, 'A')),
					callRate: parseFloat(getSeriesValue(queryArray, 'D')),
					errorRate: parseFloat(getSeriesValue(queryArray, 'F1')),
					avgDuration: 0,
					numCalls: 0,
					numErrors: 0,
				};
				services.push(serviceData);
			}
		});
	}
	return services;
};
