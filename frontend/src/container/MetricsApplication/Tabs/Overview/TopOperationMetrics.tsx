import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { topOperationQueries } from 'container/MetricsApplication/MetricsPageQueries/TopOperationQueries';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useNotifications } from 'hooks/useNotifications';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { isEmpty } from 'lodash-es';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../types';

function TopOperationMetrics(): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const { notifications } = useNotifications();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const keyOperationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: topOperationQueries({
						servicename,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				panelTypes: PANEL_TYPES.TABLE,
			}),
		[servicename],
	);

	const updatedQuery = useStepInterval(keyOperationWidget.query);

	const isEmptyWidget = useMemo(
		() => keyOperationWidget.id === 'empty' || isEmpty(keyOperationWidget),
		[keyOperationWidget],
	);

	const { data, isLoading } = useGetQueryRange(
		{
			selectedTime: keyOperationWidget?.timePreferance,
			graphType: keyOperationWidget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(),
		},
		{
			queryKey: [
				`GetMetricsQueryRange-${keyOperationWidget?.timePreferance}-${globalSelectedInterval}-${keyOperationWidget?.id}`,
				keyOperationWidget,
				maxTime,
				minTime,
				globalSelectedInterval,
			],
			keepPreviousData: true,
			enabled: !isEmptyWidget,
			refetchOnMount: false,
			onError: (error) => {
				notifications.error({ message: error.message });
			},
		},
	);

	const queryTableData = data?.payload.data.newResult.data.result || [];

	return (
		<QueryTable
			query={updatedQuery}
			queryTableData={queryTableData}
			loading={isLoading}
		/>
	);
}

export default TopOperationMetrics;
