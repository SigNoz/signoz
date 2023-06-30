import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { Container } from './styles';

function TableView(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { queryData: panelTypeParam } = useUrlQueryData<GRAPH_TYPES>(
		PANEL_TYPES_QUERY,
		PANEL_TYPES.TABLE,
	);

	const { data, isLoading } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelTypeParam,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
				panelTypeParam,
			],
			enabled: !!stagedQuery && panelTypeParam === PANEL_TYPES.TABLE,
		},
	);

	return (
		<Container>
			<QueryTable
				query={stagedQuery || initialQueriesMap.traces}
				queryTableData={data?.payload.data.newResult.data.result || []}
				loading={isLoading}
			/>
		</Container>
	);
}

export default memo(TableView);
