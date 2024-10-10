import { ResizeTable } from 'components/ResizeTable';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { useOptionsMenu } from 'container/OptionsMenu';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TracesLoading } from '../TraceLoading/TraceLoading';
import { defaultSelectedColumns, PER_PAGE_OPTIONS } from './configs';
import { Container, ErrorText, tableStyles } from './styles';
import { getListColumns, transformDataWithDate } from './utils';

interface ListViewProps {
	isFilterApplied: boolean;
}

function ListView({ isFilterApplied }: ListViewProps): JSX.Element {
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
		QueryParams.pagination,
	);

	const { data, isFetching, isLoading, isError } = useGetQueryRange(
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
		DEFAULT_ENTITY_VERSION,
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

	const queryTableDataResult = data?.payload?.data?.newResult?.data?.result;
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

	const handleDragColumn = useCallback(
		(fromIndex: number, toIndex: number) =>
			onDragColumns(columns, fromIndex, toIndex),
		[columns, onDragColumns],
	);

	const isDataPresent =
		!isLoading &&
		!isFetching &&
		!isError &&
		transformedQueryTableData.length === 0;

	return (
		<Container>
			{transformedQueryTableData.length !== 0 && (
				<TraceExplorerControls
					isLoading={isFetching}
					totalCount={totalCount}
					config={config}
					perPageOptions={PER_PAGE_OPTIONS}
				/>
			)}

			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}

			{(isLoading || (isFetching && transformedQueryTableData.length === 0)) && (
				<TracesLoading />
			)}

			{isDataPresent && !isFilterApplied && (
				<NoLogs dataSource={DataSource.TRACES} />
			)}

			{isDataPresent && isFilterApplied && (
				<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="LIST" />
			)}

			{!isError && transformedQueryTableData.length !== 0 && (
				<ResizeTable
					tableLayout="fixed"
					pagination={false}
					scroll={{ x: true }}
					loading={isFetching}
					style={tableStyles}
					dataSource={transformedQueryTableData}
					columns={columns}
					onDragColumn={handleDragColumn}
				/>
			)}
		</Container>
	);
}

export default memo(ListView);
