import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { topOperationQueryFactory } from 'container/MetricsApplication/MetricsPageQueries/TopOperationQueryFactory';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { isEmpty } from 'lodash-es';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../types';

function TopOperationMetrics(): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const [errorMessage, setErrorMessage] = useState<string | undefined>('');
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
					builder: topOperationQueryFactory({
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

	const queryResponse = useGetQueryRange(
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
				setErrorMessage(error.message);
			},
		},
	);

	console.log('QueryResponse', updatedQuery);

	if (queryResponse.isLoading && queryResponse.data === undefined) {
		return <div>Loading...</div>;
	}

	if (errorMessage) {
		return <div>{errorMessage}</div>;
	}

	return (
		<QueryTable
			query={updatedQuery}
			queryTableData={queryResponse.data?.payload.data.newResult.data.result || []}
			loading={queryResponse.isLoading}
		/>
	);
}

export default TopOperationMetrics;
