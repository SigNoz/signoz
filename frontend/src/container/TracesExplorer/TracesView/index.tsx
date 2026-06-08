/* eslint-disable sonarjs/cognitive-complexity */
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
import { generatePath, useHistory } from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import TanStackTable from 'components/TanStackTableView';
import { useTracesTableColumns } from 'components/Traces/TableView/useTracesTableColumns';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getAbsoluteUrl } from 'utils/basePath';
import DOCLINKS from 'utils/docLinks';

import { TracesLoading } from '../TraceLoading/TraceLoading';
import { columns as baseColumns, TraceRow } from './configs';
import { ActionsContainer, Container } from './styles';

const PAGE_SIZE = 50;

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: TracesViewProps): JSX.Element {
	const history = useHistory();
	const { stagedQuery, panelType } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	// Infinite-scroll state — owned by this view.
	const [pagination, setPagination] = useState<Pagination>({
		offset: 0,
		limit: PAGE_SIZE,
	});
	const [accumulatedRows, setAccumulatedRows] = useState<TraceRow[]>([]);
	const [hasMore, setHasMore] = useState(true);

	// Reset accumulator + offset whenever the underlying query identity changes.
	useEffect(() => {
		setPagination({ offset: 0, limit: PAGE_SIZE });
		setAccumulatedRows([]);
		setHasMore(true);
	}, [stagedQuery?.id, globalSelectedTime, maxTime, minTime]);

	const transformedQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueriesMap.traces),
		[stagedQuery],
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
		],
		[globalSelectedTime, maxTime, minTime, stagedQuery, panelType, pagination],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		{
			query: transformedQuery,
			graphType: panelType || PANEL_TYPES.TRACE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination,
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey,
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TRACE,
		},
	);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	// Append fetched page to accumulator (replace when offset === 0).
	const responseList = data?.payload?.data?.newResult?.data?.result?.[0]?.list;
	useEffect(() => {
		if (!responseList) {
			return;
		}
		// API returns trace-summary rows; the `ListItem.data` static type is the
		// legacy logs shape, so route through `unknown` to land on `TraceRow`.
		const newRows = responseList.map((li) => li.data) as unknown as TraceRow[];
		setAccumulatedRows((prev) =>
			pagination.offset === 0 ? newRows : [...prev, ...newRows],
		);
		setHasMore(newRows.length >= pagination.limit);
	}, [responseList, pagination.offset, pagination.limit]);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && accumulatedRows.length !== 0) {
			void logEvent('Traces Explorer: Data present', {
				panelType: 'TRACE',
			});
		}
	}, [isLoading, isFetching, isError, accumulatedRows.length]);

	const handleEndReached = useCallback(() => {
		if (!hasMore) {
			return;
		}
		setPagination((p) => ({ ...p, offset: p.offset + p.limit }));
	}, [hasMore]);

	const tableColumns = useTracesTableColumns<TraceRow>({ baseColumns });

	const handleRowClick = useCallback(
		(row: TraceRow): void => {
			const traceId = String(row.trace_id);
			history.push(generatePath(ROUTES.TRACE_DETAIL, { id: traceId }));
		},
		[history],
	);

	const handleRowClickNewTab = useCallback((row: TraceRow): void => {
		const traceId = String(row.trace_id);
		const path = generatePath(ROUTES.TRACE_DETAIL, { id: traceId });
		window.open(getAbsoluteUrl(path), '_blank', 'noopener,noreferrer');
	}, []);

	//oxlint-disable-next-line no-console
	console.log('TracesView rendered with rows:', {
		accumulatedRows,
		tableColumns,
		isLoading,
		isFetching,
		isError,
		error,
	});
	return (
		<Container>
			{accumulatedRows.length !== 0 && (
				<ActionsContainer>
					<Typography>
						This tab only shows Root Spans. More details
						<Typography.Link href={DOCLINKS.TRACES_DETAILS_LINK} target="_blank">
							{' '}
							here
						</Typography.Link>
					</Typography>
				</ActionsContainer>
			)}

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
					<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="TRACE" />
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
					<TanStackTable<TraceRow>
						data={accumulatedRows}
						columns={tableColumns}
						columnStorageKey={LOCALSTORAGE.TRACES_VIEW_COLUMNS}
						cellTypographySize="medium"
						isLoading={isLoading || isFetching}
						onEndReached={handleEndReached}
						onRowClick={handleRowClick}
						onRowClickNewTab={handleRowClickNewTab}
					/>
				</div>
			)}
		</Container>
	);
}

TracesView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(TracesView);
