import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useOptionsMenu } from 'container/OptionsMenu';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination, URL_PAGINATION } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import TraceExplorerControls from '../Controls';
import { PER_PAGE_OPTIONS, selectedColumns } from './configs';
import { Container } from './styles';

function ListView(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { options, config, isLoading: isOptionsMenuLoading } = useOptionsMenu({
		dataSource: DataSource.TRACES,
		aggregateOperator: 'count',
		initialOptions: {
			selectColumns: selectedColumns,
		},
	});

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		URL_PAGINATION,
	);

	const { data, isLoading } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelType || PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationQueryData,
				selectColumns: options?.selectColumns,
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
				options?.selectColumns,
			],
			enabled: !!stagedQuery && panelType === PANEL_TYPES.LIST,
		},
	);

	const dataLength =
		data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const queryTableDataResult = data?.payload.data.newResult.data.result;
	const queryTableData = useMemo(() => queryTableDataResult || [], [
		queryTableDataResult,
	]);

	return (
		<Container>
			<TraceExplorerControls
				isLoading={isLoading}
				totalCount={totalCount}
				config={config}
				perPageOptions={PER_PAGE_OPTIONS}
			/>
			<QueryTable
				query={stagedQuery || initialQueriesMap.traces}
				queryTableData={queryTableData}
				loading={isLoading || isOptionsMenuLoading}
				pagination={false}
			/>
		</Container>
	);
}

export default memo(ListView);
