import { ResizeTable } from 'components/ResizeTable';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination, URL_PAGINATION } from 'hooks/queryPagination';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import history from 'lib/history';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { HTMLAttributes, memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import TraceExplorerControls from '../Controls';
import { defaultSelectedColumns, PER_PAGE_OPTIONS } from './configs';
import { Container, ErrorText, tableStyles } from './styles';
import { getListColumns, getTraceLink, transformDataWithDate } from './utils';

function ListView(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		dataSource: DataSource.TRACES,
		aggregateOperator: 'count',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	const { draggedColumns, onDragColumns } = useDragColumns<RowData>(
		LOCALSTORAGE.TRACES_LIST_COLUMNS,
	);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		URL_PAGINATION,
	);

	const { data, isFetching, isError } = useGetQueryRange(
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
			enabled:
				!!stagedQuery &&
				panelType === PANEL_TYPES.LIST &&
				!!options?.selectColumns?.length,
		},
	);

	const dataLength =
		data?.payload?.data?.newResult?.data?.result[0]?.list?.length;
	const totalCount = useMemo(() => dataLength || 0, [dataLength]);

	const queryTableDataResult = data?.payload.data.newResult.data.result;
	const queryTableData = useMemo(() => queryTableDataResult || [], [
		queryTableDataResult,
	]);

	const columns = useMemo(() => {
		const updatedColumns = getListColumns(options?.selectColumns || []);
		return getDraggedColumns(updatedColumns, draggedColumns);
	}, [options?.selectColumns, draggedColumns]);

	const transformedQueryTableData = useMemo(
		() => transformDataWithDate(queryTableData) || [],
		[queryTableData],
	);

	const handleRow = useCallback(
		(record: RowData): HTMLAttributes<RowData> => ({
			onClick: (event): void => {
				event.preventDefault();
				event.stopPropagation();
				if (event.metaKey || event.ctrlKey) {
					window.open(getTraceLink(record), '_blank');
				} else {
					history.push(getTraceLink(record));
				}
			},
		}),
		[],
	);

	const handleDragColumn = useCallback(
		(fromIndex: number, toIndex: number) =>
			onDragColumns(columns, fromIndex, toIndex),
		[columns, onDragColumns],
	);

	return (
		<Container>
			<TraceExplorerControls
				isLoading={isFetching}
				totalCount={totalCount}
				config={config}
				perPageOptions={PER_PAGE_OPTIONS}
			/>

			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}

			{!isError && (
				<ResizeTable
					tableLayout="fixed"
					pagination={false}
					scroll={{ x: true }}
					loading={isFetching}
					style={tableStyles}
					dataSource={transformedQueryTableData}
					columns={columns}
					onRow={handleRow}
					onDragColumn={handleDragColumn}
				/>
			)}
		</Container>
	);
}

export default memo(ListView);
