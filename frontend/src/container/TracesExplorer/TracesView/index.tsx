import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination, URL_PAGINATION } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import TraceExplorerControls from '../Controls';
import { modifiedColumns, PER_PAGE_OPTIONS } from './configs';
import { Container } from './styles';

function TracesView(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		URL_PAGINATION,
	);

	const { data, isLoading } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelType || PANEL_TYPES.TRACE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationQueryData,
			},
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
				panelType,
				paginationQueryData,
			],
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TRACE,
		},
	);

	return (
		<Container>
			<TraceExplorerControls
				isLoading={isLoading}
				totalCount={
					data?.payload?.data?.newResult?.data?.result[0]?.list?.length || 0
				}
				perPageOptions={PER_PAGE_OPTIONS}
			/>
			<QueryTable
				query={stagedQuery || initialQueriesMap.traces}
				queryTableData={data?.payload.data.newResult.data.result || []}
				loading={isLoading}
				pagination={false}
				modifyColumns={modifiedColumns}
			/>
		</Container>
	);
}

export default TracesView;
