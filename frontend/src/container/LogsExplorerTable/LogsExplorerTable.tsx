import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { QueryTable } from 'container/QueryTable';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

export function LogsExplorerTable(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const panelTypeParam = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const { data, isFetching } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.metrics,
			graphType: panelTypeParam,
			globalSelectedInterval: selectedTime,
			selectedTime: 'GLOBAL_TIME',
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				selectedTime,
				stagedQuery,
				panelTypeParam,
			],
			enabled: !!stagedQuery,
		},
	);
	return (
		<QueryTable
			query={stagedQuery || initialQueriesMap.metrics}
			queryTableData={data?.payload.data.newResult.data.result || []}
			loading={isFetching}
		/>
	);
}
