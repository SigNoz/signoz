import './ListView.styles.scss';

import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { ResizeTable } from 'components/ResizeTable';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { useOptionsMenu } from 'container/OptionsMenu';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import { getDefaultPaginationConfig } from 'hooks/queryPagination/utils';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ArrowUp10, Minus } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TracesLoading } from '../TraceLoading/TraceLoading';
import { defaultSelectedColumns, PER_PAGE_OPTIONS } from './configs';
import { Container, tableStyles } from './styles';
import { getListColumns, transformDataWithDate } from './utils';

interface ListViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
}

function ListView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: ListViewProps): JSX.Element {
	const {
		stagedQuery,
		panelType: panelTypeFromQueryBuilder,
	} = useQueryBuilder();

	const panelType = panelTypeFromQueryBuilder || PANEL_TYPES.LIST;

	const [orderBy, setOrderBy] = useState<string>('timestamp:desc');

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

	const requestQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueriesMap.traces, orderBy),
		[stagedQuery, orderBy],
	);

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
			orderBy,
		],
		[
			stagedQuery,
			panelType,
			globalSelectedTime,
			paginationConfig,
			options?.selectColumns,
			maxTime,
			minTime,
			orderBy,
		],
	);

	if (queryKeyRef) {
		// eslint-disable-next-line no-param-reassign
		queryKeyRef.current = queryKey;
	}

	const { data, isFetching, isLoading, isError, error } = useGetQueryRange(
		{
			query: requestQuery,
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
		// ENTITY_VERSION_V4,
		ENTITY_VERSION_V5,
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

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

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

	const handleOrderChange = useCallback((value: string) => {
		setOrderBy(value);
	}, []);

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
			<div className="trace-explorer-controls">
				<div className="order-by-container">
					<div className="order-by-label">
						Order by <Minus size={14} /> <ArrowUp10 size={14} />
					</div>

					<ListViewOrderBy
						value={orderBy}
						onChange={handleOrderChange}
						dataSource={DataSource.TRACES}
					/>
				</div>

				<TraceExplorerControls
					isLoading={isFetching}
					totalCount={totalCount}
					config={config}
					perPageOptions={PER_PAGE_OPTIONS}
				/>
			</div>

			{isError && error && <ErrorInPlace error={error as APIError} />}

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

ListView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(ListView);
