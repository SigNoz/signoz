import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { ServicesList } from 'types/api/metrics/getService';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { serviceMetricsQuery } from './ServiceMetrics/ServiceMetricsQuery';
import {
	GetQueryRangeRequestDataProps,
	GetServiceListFromQueryProps,
} from './types';

function getRowValue(
	row: Record<string, unknown> | undefined,
	queryName: string,
): number {
	const value = Number(row?.[queryName]);
	return Number.isFinite(value) ? value : 0;
}

export const getQueryRangeRequestData = ({
	topLevelOperations,
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

		const updatedQuery = updateStepInterval(serviceMetricsWidget.query);

		requestData.push({
			selectedTime: serviceMetricsWidget?.timePreferance,
			graphType: serviceMetricsWidget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
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
			} else if (query.data) {
				const row = query.data?.payload?.data?.result?.[0]?.table?.rows?.[0]?.data;
				const serviceData: ServicesList = {
					serviceName: topLevelOperations[index][0].toString(),
					p99: getRowValue(row, 'A'),
					callRate: getRowValue(row, 'D'),
					errorRate: getRowValue(row, 'F1'),
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
