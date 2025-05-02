import logEvent from 'api/common/logEvent';
import { ResizeTable } from 'components/ResizeTable';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { useOptionsMenu } from 'container/OptionsMenu';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import { getDefaultPaginationConfig } from 'hooks/queryPagination/utils';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useTimezone } from 'providers/Timezone';
import { memo, useCallback, useEffect, useMemo } from 'react';
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
	const {
		stagedQuery,
		panelType: panelTypeFromQueryBuilder,
	} = useQueryBuilder();

	const panelType = panelTypeFromQueryBuilder || PANEL_TYPES.LIST;

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
		loading: timeRangeUpdateLoading,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

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
	const paginationConfig =
		paginationQueryData ?? getDefaultPaginationConfig(PER_PAGE_OPTIONS);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			paginationConfig,
			options?.selectColumns,
		],
		[
			stagedQuery,
			panelType,
			globalSelectedTime,
			paginationConfig,
			options?.selectColumns,
			maxTime,
			minTime,
		],
	);

	const { data, isFetching, isLoading, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelType,
			selectedTime: 'GLOBAL_TIME' as const,
			globalSelectedInterval: globalSelectedTime as CustomTimeType,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationConfig,
				selectColumns: options?.selectColumns,
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey,
			enabled:
				// don't make api call while the time range state in redux is loading
				!timeRangeUpdateLoading &&
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

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = useMemo(() => {
		const updatedColumns = getListColumns(
			options?.selectColumns || [],
			formatTimezoneAdjustedTimestamp,
		);
		return getDraggedColumns(updatedColumns, draggedColumns);
	}, [options?.selectColumns, formatTimezoneAdjustedTimestamp, draggedColumns]);

	const transformedQueryTableData = useMemo(
		() => transformDataWithDate(queryTableData) || [],
		[queryTableData],
	);

	const handleDragColumn = useCallback(
		(fromIndex: number, toIndex: number) =>
			onDragColumns(columns, fromIndex, toIndex),
		[columns, onDragColumns],
	);

	const isDataAbsent =
		!isLoading &&
		!isFetching &&
		!isError &&
		transformedQueryTableData.length === 0;

	useEffect(() => {
		if (
			!isLoading &&
			!isFetching &&
			!isError &&
			transformedQueryTableData.length !== 0
		) {
			logEvent('Traces Explorer: Data present', {
				panelType,
			});
		}
	}, [isLoading, isFetching, isError, transformedQueryTableData, panelType]);
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

			{isDataAbsent && !isFilterApplied && (
				<NoLogs dataSource={DataSource.TRACES} />
			)}

			{isDataAbsent && isFilterApplied && (
				<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="LIST" />
			)}

			{!isError && transformedQueryTableData.length !== 0 && (
				<ResizeTable
					tableLayout="fixed"
					pagination={false}
					scroll={{ x: 'max-content' }}
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
