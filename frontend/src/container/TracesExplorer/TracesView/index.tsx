import { Typography } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination, URL_PAGINATION } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import TraceExplorerControls from '../Controls';
import { columns, PER_PAGE_OPTIONS, TRACES_DETAILS_LINK } from './configs';
import { ActionsContainer, Container } from './styles';

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

	const responseData = data?.payload?.data?.newResult?.data?.result[0]?.list;
	const tableData = useMemo(
		() => responseData?.map((listItem) => listItem.data),
		[responseData],
	);

	return (
		<Container>
			<ActionsContainer>
				<Typography>
					This tab only shows Root Spans. More details
					<Typography.Link href={TRACES_DETAILS_LINK} target="_blank">
						{' '}
						here
					</Typography.Link>
				</Typography>
				<TraceExplorerControls
					isLoading={isLoading}
					totalCount={responseData?.length || 0}
					perPageOptions={PER_PAGE_OPTIONS}
				/>
			</ActionsContainer>
			<ResizeTable
				loading={isLoading}
				columns={columns}
				tableLayout="fixed"
				dataSource={tableData}
				scroll={{ x: true }}
				pagination={false}
			/>
		</Container>
	);
}

export default memo(TracesView);
