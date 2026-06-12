import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MutableRefObject,
} from 'react';
import logEvent from 'api/common/logEvent';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import type { Pagination } from 'hooks/queryPagination';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import type { Warning } from 'types/api';
import type APIError from 'types/api/error';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';

const PAGE_SIZE = 50;

export type UseTraceInfiniteQueryOptions<TRow> = {
	queryDeps: unknown[];
	buildRequest: (pagination: Pagination) => GetQueryResultsProps;
	transformResponse: (
		payload: MetricQueryRangeSuccessResponse['payload'] | undefined,
	) => TRow[];
	enabled: boolean;
	entityVersion: string;
	queryKeyRef?: MutableRefObject<unknown>;
	setIsLoadingQueries?: (loading: boolean) => void;
	setWarning?: (warning: Warning | undefined) => void;
	panelType: string;
};

export type UseTraceInfiniteQueryResult<TRow> = {
	rows: TRow[];
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	error: APIError | Error | null;
	handleEndReached: () => void;
};

export function useTraceInfiniteQuery<TRow>({
	queryDeps,
	buildRequest,
	transformResponse,
	enabled,
	entityVersion,
	queryKeyRef,
	setIsLoadingQueries,
	setWarning,
	panelType,
}: UseTraceInfiniteQueryOptions<TRow>): UseTraceInfiniteQueryResult<TRow> {
	const [pagination, setPagination] = useState<Pagination>({
		offset: 0,
		limit: PAGE_SIZE,
	});
	const [accumulatedRows, setAccumulatedRows] = useState<TRow[]>([]);
	const [hasMore, setHasMore] = useState(true);

	useEffect(() => {
		setPagination({ offset: 0, limit: PAGE_SIZE });
		setAccumulatedRows([]);
		setHasMore(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, queryDeps);

	const requestParams = useMemo(
		() => buildRequest(pagination),
		[buildRequest, pagination],
	);

	const queryKey = useMemo(
		() => [REACT_QUERY_KEY.GET_QUERY_RANGE, pagination, ...queryDeps],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pagination, ...queryDeps],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		requestParams,
		entityVersion,
		{ queryKey, enabled, keepPreviousData: true },
	);

	useEffect(() => {
		if (data?.payload && setWarning) {
			setWarning(data.warning);
		}
	}, [data?.payload, data?.warning, setWarning]);

	// Append-only. Fires solely on new data arriving (pagination is not a dep —
	// pagination state changes drive the queryKey, which drives a new fetch,
	// which lands here as a fresh data.payload). Functional updater so the new
	// rows always pile onto the latest queued accumulator (which is [] right
	// after reset).
	useEffect(() => {
		if (!data?.payload) {
			return;
		}
		const newRows = transformResponse(data.payload);
		setAccumulatedRows((prev) => [...prev, ...newRows]);
		setHasMore(newRows.length >= PAGE_SIZE);
	}, [data?.payload, transformResponse]);

	useEffect(() => {
		setIsLoadingQueries?.(isLoading || isFetching);
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

	return {
		rows: accumulatedRows,
		isLoading,
		isFetching,
		isError,
		error,
		handleEndReached,
	};
}
