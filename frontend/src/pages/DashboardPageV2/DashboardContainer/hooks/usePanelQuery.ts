import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time selector off redux
import { useSelector } from 'react-redux';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	buildQueryRangeRequest,
	extractLegendMap,
	hasRunnableQueries,
} from '../queryV5/buildQueryRangeRequest';
import type { PanelPagination, PanelQueryData } from '../queryV5/types';
import { getRawResults } from '../queryV5/v5ResponseData';
import { getReferencedVariables } from '../queryV5/getReferencedVariables';
import { getBuilderQueries } from '../Panels/utils/getBuilderQueries';
import { PANEL_KIND_TO_PANEL_TYPE } from '../Panels/types/panelKind';
import { selectResolvedVariables } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';
import { resolvePanelTimeWindow } from './resolvePanelTimeWindow';
import { useGetQueryRangeV5 } from './useGetQueryRangeV5';
import { useIsPanelWaitingOnVariable } from './useIsPanelWaitingOnVariable';

// V1 parity: PER_PAGE_OPTIONS + default page size from V1's list views.
const LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];
const DEFAULT_LIST_PAGE_SIZE = 25;

export interface UsePanelQueryArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/**
	 * Gate the fetch (default true). PanelV2 sets false for unregistered kinds to skip a wasted
	 * call. The hook also auto-disables internally when the panel has no runnable queries.
	 */
	enabled?: boolean;
	/** Override the time window instead of global Redux time, so the editor preview stays isolated from the dashboard. */
	time?: PanelQueryTimeOverride;
}

/**
 * Editor-local absolute time window in epoch ms. Floored before the request: V5 start/end are
 * int64 and the V1 helpers callers resolve through divide without truncating, so a float breaks
 * the API call.
 */
export interface PanelQueryTimeOverride {
	startMs: number;
	endMs: number;
}

export interface UsePanelQueryResult {
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	/** First fetch only (no cached data yet) — drives the full-panel loader. A background refetch does NOT set this; use `isFetching`. */
	isLoading: boolean;
	/** Any request in flight, including a background refetch over stale data — drives a "refreshing" affordance, never a blank panel. */
	isFetching: boolean;
	/** Showing a prior page's data (keepPreviousData) while the next page loads — list renderers swap in skeleton rows. */
	isPreviousData: boolean;
	error: Error | null;
	/** Re-run the query (e.g. a retry button on the error state). */
	refetch: () => void;
	/** Abort the in-flight fetch (e.g. the editor's Stage & Run cancel). */
	cancelQuery: () => void;
	/** Server-side paging handles — present only for raw/list panels. */
	pagination?: PanelPagination;
}

/**
 * Fetches query-range data for a V2 panel over the pure-V5 contract: builds the request DTO
 * from the panel's perses queries (no V1 `Query` intermediary), reads global time from Redux,
 * substitutes the dashboard's resolved variable values (published to the store by
 * `useResolvedVariables`), and posts via `useGetQueryRangeV5`. Renderers consume the raw
 * response through the `queryV5` prep utils.
 */
export function usePanelQuery({
	panel,
	panelId,
	enabled = true,
	time,
}: UsePanelQueryArgs): UsePanelQueryResult {
	const fullKind = panel.spec.plugin.kind;
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind]) ?? PANEL_TYPES.TIME_SERIES;
	const queries = panel.spec.queries;

	// V1 parity: a list query with an explicit `limit` shows without a server pager; without
	// one it pages server-side at a user-selectable size.
	const hasExplicitLimit = useMemo(
		() => !!getBuilderQueries(queries)[0]?.limit,
		[queries],
	);
	const isPaginated = panelType === PANEL_TYPES.LIST && !hasExplicitLimit;

	const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
	const [offset, setOffset] = useState(0);

	const handleSetPageSize = useCallback((size: number): void => {
		// Ignore a non-positive/NaN size so the pager state never goes invalid.
		if (!Number.isFinite(size) || size <= 0) {
			return;
		}
		setPageSize(size);
		setOffset(0);
	}, []);

	const {
		selectedTime: globalSelectedInterval,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	// Resolved variable values for this dashboard, published by useResolvedVariables.
	// The full set is substituted into every request, but only the values this panel
	// *references* key the cache — so a variable change refetches only the panels that
	// use it (V1 parity). Names come from the fetch context (all variables, even
	// unresolved ones); null before the variable bar initializes it.
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variables = useDashboardStore(selectResolvedVariables(dashboardId));
	const fetchContext = useDashboardStore((s) => s.variableFetchContext);

	const referencedVariableNames = useMemo(() => {
		const allNames = fetchContext ? Object.keys(fetchContext.variableTypes) : [];
		return getReferencedVariables(queries, allNames);
	}, [queries, fetchContext]);

	const scopedVariables = useMemo(() => {
		const scoped: typeof variables = {};
		referencedVariableNames.forEach((name) => {
			if (variables[name] !== undefined) {
				scoped[name] = variables[name];
			}
		});
		return scoped;
	}, [variables, referencedVariableNames]);

	// First-load gate: hold the panel in its loading state until every referenced
	// variable has resolved a value.
	const isWaitingOnVariable = useIsPanelWaitingOnVariable(
		referencedVariableNames,
	);

	// `visualization` exists only on variants that declare it — read via `in` narrowing over the
	// generated union (no cast). `fillSpans` (TimeSeries/Bar only) → formatOptions.fillGaps.
	const pluginSpec = panel.spec.plugin.spec;
	const visualization =
		pluginSpec && 'visualization' in pluginSpec
			? pluginSpec.visualization
			: undefined;
	const timePreference = visualization?.timePreference;
	const fillGaps = Boolean(
		visualization && 'fillSpans' in visualization && visualization.fillSpans,
	);

	// Redux global time is in nanoseconds; V5 takes epoch ms. See resolvePanelTimeWindow for
	// precedence and the flooring/anchoring rationale.
	const { startMs, endMs } = resolvePanelTimeWindow({
		timePreference,
		globalStartMs: minTime / 1e6,
		globalEndMs: maxTime / 1e6,
		override: time,
	});

	// New query/time window: snap to the first page so we never request an offset past a
	// now-shorter result set.
	useEffect(() => {
		setOffset(0);
	}, [queries, startMs, endMs]);

	const requestPayload = useMemo(
		() =>
			buildQueryRangeRequest({
				queries,
				panelType,
				startMs,
				endMs,
				fillGaps,
				pagination: isPaginated ? { offset, limit: pageSize } : undefined,
				variables,
			}),
		[
			queries,
			panelType,
			startMs,
			endMs,
			fillGaps,
			isPaginated,
			offset,
			pageSize,
			variables,
		],
	);

	const legendMap = useMemo(() => extractLegendMap(queries), [queries]);

	const runnable = useMemo(() => hasRunnableQueries(queries), [queries]);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
			panelId,
			// Dashboard keys off Redux min/max + interval; the editor passes an explicit ms window.
			// Keep them distinct so they don't collide in the cache. timePreference participates too:
			// it changes the resolved window off the same global min/max, so a switch must not read a
			// stale entry.
			...(time
				? [`override-${startMs}-${endMs}`]
				: [minTime, maxTime, globalSelectedInterval, timePreference]),
			// fillGaps changes the payload (formatOptions), so it must key the cache too.
			fillGaps,
			fullKind,
			queries,
			// Each page is its own cache entry (0/default for non-paged kinds).
			offset,
			pageSize,
			// Only the variables this panel references re-key the cache, so an unrelated
			// variable change doesn't refetch it.
			scopedVariables,
		],
		[
			panelId,
			time,
			startMs,
			endMs,
			minTime,
			maxTime,
			globalSelectedInterval,
			timePreference,
			fillGaps,
			fullKind,
			queries,
			offset,
			pageSize,
			scopedVariables,
		],
	);

	const response = useGetQueryRangeV5({
		requestPayload,
		queryKey,
		enabled: enabled && runnable && !isWaitingOnVariable,
		// Hold the current page while the next loads (offset re-keys) so the pager doesn't flash.
		keepPreviousData: isPaginated,
	});

	const queryClient = useQueryClient();
	const cancelQuery = useCallback((): void => {
		void queryClient.cancelQueries(queryKey);
	}, [queryClient, queryKey]);

	const data = useMemo<PanelQueryData>(
		() => ({ response: response.data, requestPayload, legendMap }),
		[response.data, requestPayload, legendMap],
	);

	const goPrev = useCallback(
		() => setOffset((current) => Math.max(0, current - pageSize)),
		[pageSize],
	);
	const goNext = useCallback(
		() => setOffset((current) => current + pageSize),
		[pageSize],
	);

	// Paging handles for raw/list panels. The backend sets `nextCursor` iff the page filled,
	// so it's the authoritative has-more signal (there's no total count on the wire).
	const pagination = useMemo<PanelPagination | undefined>(() => {
		if (!isPaginated) {
			return undefined;
		}
		const safePageSize =
			Number.isFinite(pageSize) && pageSize > 0
				? pageSize
				: DEFAULT_LIST_PAGE_SIZE;
		const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;
		// `getRawResults` returns [] for a missing/non-raw response, so this stays
		// defined and zero-rowed rather than throwing while data is absent.
		const result = getRawResults(response.data)[0];
		return {
			pageIndex: Math.floor(safeOffset / safePageSize),
			canPrev: safeOffset > 0,
			canNext: !!result?.nextCursor,
			goPrev,
			goNext,
			pageSize: safePageSize,
			pageSizeOptions: LIST_PAGE_SIZE_OPTIONS,
			setPageSize: handleSetPageSize,
		};
	}, [
		isPaginated,
		response.data,
		offset,
		pageSize,
		goPrev,
		goNext,
		handleSetPageSize,
	]);

	return {
		data,
		isLoading: response.isLoading,
		isFetching: response.isFetching,
		isPreviousData: response.isPreviousData,
		error: response.error ?? null,
		refetch: response.refetch,
		cancelQuery,
		pagination,
	};
}
