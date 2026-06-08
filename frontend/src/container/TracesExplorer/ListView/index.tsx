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
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ArrowUp10, Minus } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import TanStackTable from 'components/TanStackTableView';
import { useTracesTableColumns } from 'components/Traces/TableView/useTracesTableColumns';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { useOptionsMenu } from 'container/OptionsMenu';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/types';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useTimezone } from 'providers/Timezone';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getAbsoluteUrl } from 'utils/basePath';

import { TracesLoading } from '../TraceLoading/TraceLoading';
import { Container } from './styles';
import {
	getTraceLink,
	makeListFieldCol,
	makeTimestampCol,
	SpanRow,
	transformSpanRows,
} from './utils';

import './ListView.styles.scss';

const PAGE_SIZE = 50;

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
	const history = useHistory();
	const { stagedQuery, panelType: panelTypeFromQueryBuilder } =
		useQueryBuilder();

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
	});

	// Infinite-scroll state — owned by this view.
	const [pagination, setPagination] = useState<{
		offset: number;
		limit: number;
	}>({
		offset: 0,
		limit: PAGE_SIZE,
	});
	const [accumulatedRows, setAccumulatedRows] = useState<SpanRow[]>([]);
	const [hasMore, setHasMore] = useState(true);

	// Stable sorted-name signature for the queryKey + reset trigger.
	// - Drag updates selectColumns; raw queryKey would churn on reorder.
	// - Trace API fetches only listed columns → add/remove must refetch from scratch.
	// - Sorted-name signature: stable on reorder, changes on add/remove.
	const selectColumnsSignature = useMemo(
		() =>
			(options?.selectColumns ?? [])
				.map((c) => c.name)
				.sort()
				.join(','),
		[options?.selectColumns],
	);

	// Reset accumulator + offset whenever the underlying query identity changes.
	useEffect(() => {
		setPagination({ offset: 0, limit: PAGE_SIZE });
		setAccumulatedRows([]);
		setHasMore(true);
	}, [
		stagedQuery?.id,
		globalSelectedTime,
		maxTime,
		minTime,
		orderBy,
		selectColumnsSignature,
	]);

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
			pagination,
			selectColumnsSignature,
			orderBy,
		],
		[
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			pagination,
			selectColumnsSignature,
			orderBy,
		],
	);

	if (queryKeyRef) {
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
				pagination,
				selectColumns: options?.selectColumns,
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey,
			enabled:
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

	// Append fetched page to accumulator (replace when offset === 0).
	const responseResult = data?.payload?.data?.newResult?.data?.result;
	useEffect(() => {
		if (!responseResult) {
			return;
		}
		const newRows = transformSpanRows(responseResult);
		setAccumulatedRows((prev) =>
			pagination.offset === 0 ? newRows : [...prev, ...newRows],
		);
		setHasMore(newRows.length >= pagination.limit);
	}, [responseResult, pagination.offset, pagination.limit]);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && accumulatedRows.length !== 0) {
			void logEvent('Traces Explorer: Data present', { panelType });
		}
	}, [isLoading, isFetching, isError, accumulatedRows.length, panelType]);

	const handleEndReached = useCallback(() => {
		if (!hasMore) {
			return;
		}
		setPagination((p) => ({ ...p, offset: p.offset + p.limit }));
	}, [hasMore]);

	const handleOrderChange = useCallback((value: string) => {
		setOrderBy(value);
	}, []);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const baseColumns = useMemo(
		() => [
			makeTimestampCol(formatTimezoneAdjustedTimestamp),
			...(options?.selectColumns ?? []).map(makeListFieldCol),
		],
		[formatTimezoneAdjustedTimestamp, options?.selectColumns],
	);

	const tableColumns = useTracesTableColumns<SpanRow>({ baseColumns });

	const handleRowClick = useCallback(
		(row: SpanRow): void => {
			history.push(getTraceLink(row));
		},
		[history],
	);

	const handleRowClickNewTab = useCallback((row: SpanRow): void => {
		window.open(
			getAbsoluteUrl(getTraceLink(row)),
			'_blank',
			'noopener,noreferrer',
		);
	}, []);

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

				<DownloadOptionsMenu
					dataSource={DataSource.TRACES}
					selectedColumns={options?.selectColumns}
				/>

				<TraceExplorerControls config={config} />
			</div>

			{isError && error && <ErrorInPlace error={error as APIError} />}

			{(isLoading || isFetching) && accumulatedRows.length === 0 && (
				<TracesLoading />
			)}

			{!isLoading &&
				!isFetching &&
				!isError &&
				!isFilterApplied &&
				accumulatedRows.length === 0 && <NoLogs dataSource={DataSource.TRACES} />}

			{!isLoading &&
				!isFetching &&
				accumulatedRows.length === 0 &&
				!isError &&
				isFilterApplied && (
					<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="LIST" />
				)}

			{accumulatedRows.length !== 0 && (
				<div
					style={{
						flex: 1,
						minHeight: 0,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<TanStackTable<SpanRow>
						data={accumulatedRows}
						columns={tableColumns}
						columnStorageKey={LOCALSTORAGE.TRACES_LIST_COLUMNS}
						respectColumnOrder={false}
						cellTypographySize="medium"
						isLoading={isLoading || isFetching}
						onEndReached={handleEndReached}
						onColumnOrderChange={(cols): void =>
							config?.addColumn?.onReorder(cols.map((c) => c.id))
						}
						onColumnRemove={config?.addColumn?.onRemove}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
					/>
				</div>
			)}
		</Container>
	);
}

ListView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(ListView);
