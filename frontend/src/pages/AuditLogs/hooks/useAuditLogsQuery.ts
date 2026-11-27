import {
	MutableRefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialFilters, PANEL_TYPES } from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import {
	getListQuery,
	getQueryByPanelType,
} from 'container/LogsExplorerViews/explorerUtils';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getListOrderBy } from 'utils/explorerUtils';

import { AuditLog } from '../AuditLogs.types';

const PAGE_SIZE = DEFAULT_PER_PAGE_VALUE;

interface UseAuditLogsQueryProps {
	listAuditLogsKeyRef: MutableRefObject<unknown>;
}

interface UseAuditLogsQueryResult {
	logs: AuditLog[];
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: Error | null;
	warning?: Warning;
	onEndReached: () => void;
}

export function useAuditLogsQuery({
	listAuditLogsKeyRef,
}: UseAuditLogsQueryProps): UseAuditLogsQueryResult {
	const { stagedQuery } = useQueryBuilder();

	const { minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const currentMinTimeRef = useRef<number>(minTime);

	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [hasMore, setHasMore] = useState<boolean>(true);
	const [requestData, setRequestData] = useState<Query | null>(null);

	const isNextPageRequestedRef = useRef(false);

	const listQuery = useMemo(() => getListQuery(stagedQuery), [stagedQuery]);
	const orderBy = useMemo(() => getListOrderBy(stagedQuery), [stagedQuery]);

	const getRequestData = useCallback(
		(pageNumber: number): Query | null =>
			getQueryByPanelType(stagedQuery, PANEL_TYPES.LIST, {
				page: pageNumber,
				pageSize: PAGE_SIZE,
				filters: listQuery?.filters || initialFilters,
				filter: listQuery?.filter || { expression: '' },
				orderBy,
			}),
		[stagedQuery, listQuery, orderBy],
	);

	useEffect(() => {
		if (
			requestData?.id !== stagedQuery?.id ||
			currentMinTimeRef.current !== minTime
		) {
			setLogs([]);
			setPage(1);
			setHasMore(true);
			setRequestData(getRequestData(1));
			currentMinTimeRef.current = minTime;
		}
	}, [stagedQuery, requestData, getRequestData, minTime]);

	const { data, isLoading, isFetching, isError, error } =
		useGetExplorerQueryRange(
			requestData,
			PANEL_TYPES.LIST,
			ENTITY_VERSION_V5,
			{
				keepPreviousData: true,
				enabled: !!requestData,
			},
			{},
			undefined,
			listAuditLogsKeyRef,
			undefined,
			'custom',
		);

	useEffect(() => {
		const result = data?.payload?.data?.newResult?.data?.result ?? [];
		const list = result[0]?.list;

		if (!list) {
			return;
		}

		const pageLogs = list.map((item) => item.data as unknown as AuditLog);

		setLogs((previous) => [...previous, ...pageLogs]);
		setHasMore(pageLogs.length === PAGE_SIZE);
	}, [data]);

	useEffect(() => {
		if (!isFetching) {
			isNextPageRequestedRef.current = false;
		}
	}, [isFetching]);

	const onEndReached = useCallback((): void => {
		if (!stagedQuery || !hasMore || isNextPageRequestedRef.current) {
			return;
		}

		isNextPageRequestedRef.current = true;

		const nextPage = page + 1;
		setPage(nextPage);
		setRequestData(getRequestData(nextPage));
	}, [stagedQuery, hasMore, page, getRequestData]);

	return {
		logs,
		isLoading,
		isFetching,
		isError,
		error,
		warning: data?.warning,
		onEndReached,
	};
}
