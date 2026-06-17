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
import { getBuilderQueries } from '../Panels/utils/getBuilderQueries';
import { PANEL_KIND_TO_PANEL_TYPE } from '../Panels/types/panelKind';
import { resolvePanelTimeWindow } from './resolvePanelTimeWindow';
import { useGetQueryRangeV5 } from './useGetQueryRangeV5';

// V1 list page-size choices (PER_PAGE_OPTIONS); default mirrors V1's list views.
const LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];
const DEFAULT_LIST_PAGE_SIZE = 25;

export interface UsePanelQueryArgs {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	/**
	 * Gate the underlying fetch. Defaults to true. PanelV2 sets this false when
	 * no plugin is registered for the panel's kind so the unknown-kind fallback
	 * UI doesn't trigger a wasted API call.
	 *
	 * The hook *also* auto-disables internally when the panel has no runnable
	 * queries — callers don't need to compute that themselves.
	 */
	enabled?: boolean;
	/**
	 * Override the time window instead of reading global Redux time. Used by the
	 * panel editor preview to stay isolated from the dashboard — changing the
	 * preview time neither touches nor re-runs the dashboard behind the overlay.
	 */
	time?: PanelQueryTimeOverride;
}

/**
 * Editor-local time window in epoch milliseconds (the V5 request native unit).
 * The caller resolves its selection — relative or custom — to an absolute
 * window so the fetch can ignore global Redux time entirely. Fractional ms are
 * floored before the request: the V1 time helpers some callers resolve through
 * (e.g. getStartEndRangeTime → getMicroSeconds) divide without truncating, and
 * the V5 start/end are int64 — a float breaks the API call.
 */
export interface PanelQueryTimeOverride {
	startMs: number;
	endMs: number;
}

export interface UsePanelQueryResult {
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	/**
	 * First fetch only — a request is in flight and there's no cached data yet.
	 * Drives the full-panel loader (nothing to show). A background refetch with
	 * data already present does NOT set this — watch `isFetching` for that.
	 */
	isLoading: boolean;
	/**
	 * Any request in flight, including a background refetch while stale data is
	 * still displayed. Drives a subtle "refreshing" affordance, never a blank panel.
	 */
	isFetching: boolean;
	error: Error | null;
	/** Re-run the query (e.g. a retry button on the error state). */
	refetch: () => void;
	/** Abort the in-flight fetch (e.g. the editor's Stage & Run cancel). */
	cancelQuery: () => void;
	/** Server-side paging handles — present only for raw/list panels. */
	pagination?: PanelPagination;
}

/**
 * Fetches the query-range data for a V2 panel over the pure-V5 contract.
 *
 *   1. Request — `buildQueryRangeRequest` assembles the generated
 *      `Querybuildertypesv5QueryRangeRequestDTO` directly from the panel's
 *      perses queries (a CompositeQuery plugin already nests the V5
 *      envelope list). No V1 `Query` intermediary.
 *   2. Time + variables — reads the global time selection from Redux
 *      (variables substitution is intentionally deferred until V2 has its
 *      own variable plumbing).
 *   3. Fetch — `useGetQueryRangeV5` posts via the generated `queryRangeV5`
 *      call with a react-query cache key composed from panel identity +
 *      time range + kind + queries.
 *
 * Renderers consume the raw V5 response through the `queryV5` prep utils
 * (`flattenTimeSeries`, `prepareScalarTables`, …).
 *
 * The hook is consumed today by PanelV2 (renderer dispatch) and will be
 * consumed by PanelEditor (1.8) for "preview as you edit."
 */
export function usePanelQuery({
	panel,
	panelId,
	enabled = true,
	time,
}: UsePanelQueryArgs): UsePanelQueryResult {
	const fullKind = panel?.spec?.plugin?.kind;
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind]) ?? PANEL_TYPES.TIME_SERIES;
	const queries = panel?.spec?.queries;

	// A list query with its own explicit `limit` caps results and shows them
	// without a server pager (V1 parity: Controls render is gated on no limit).
	// Without a limit, the list pages server-side at a user-selectable page size.
	const hasExplicitLimit = useMemo(
		() => !!getBuilderQueries(queries ?? [])[0]?.limit,
		[queries],
	);
	const isPaginated = panelType === PANEL_TYPES.LIST && !hasExplicitLimit;

	const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
	const [offset, setOffset] = useState(0);

	// Changing page size restarts paging from the first page.
	const handleSetPageSize = useCallback((size: number): void => {
		setPageSize(size);
		setOffset(0);
	}, []);

	const {
		selectedTime: globalSelectedInterval,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	// `visualization` carries panel-level options but only on the variants that
	// declare it — read it via `in` narrowing over the generated union (no cast).
	// `timePreference` pins the panel to a fixed relative window (every visualization
	// variant has it); `fillSpans` backend-fills missing points with 0 and exists
	// only on TimeSeries/Bar (→ formatOptions.fillGaps).
	const pluginSpec = panel?.spec?.plugin?.spec;
	const visualization =
		pluginSpec && 'visualization' in pluginSpec
			? pluginSpec.visualization
			: undefined;
	const timePreference = visualization?.timePreference;
	const fillGaps = Boolean(
		visualization && 'fillSpans' in visualization && visualization.fillSpans,
	);

	// Redux global time is in nanoseconds; the V5 API takes epoch ms. Precedence: an
	// editor time override (already in ms) wins so the preview stays independent of the
	// dashboard, then the panel's time preference, then the global window. See
	// resolvePanelTimeWindow for the flooring/anchoring rationale.
	const { startMs, endMs } = resolvePanelTimeWindow({
		timePreference,
		globalStartMs: minTime / 1e6,
		globalEndMs: maxTime / 1e6,
		override: time,
	});

	// A new query or time window invalidates the current page — snap back to the
	// first page so we never request an offset past a now-shorter result set.
	useEffect(() => {
		setOffset(0);
	}, [queries, startMs, endMs]);

	const requestPayload = useMemo(
		() =>
			buildQueryRangeRequest({
				queries: queries ?? [],
				panelType,
				startMs,
				endMs,
				fillGaps,
				pagination: isPaginated ? { offset, limit: pageSize } : undefined,
			}),
		[queries, panelType, startMs, endMs, fillGaps, isPaginated, offset, pageSize],
	);

	const legendMap = useMemo(() => extractLegendMap(queries ?? []), [queries]);

	const runnable = useMemo(() => hasRunnableQueries(queries ?? []), [queries]);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
			panelId,
			// Dashboard keys off Redux min/max + interval; the editor passes an
			// explicit ms window. Keep each distinct so they refetch on their own
			// time without colliding in the react-query cache. The floored values
			// key the cache so it matches what was actually requested. The panel time
			// preference participates too: it changes the resolved window off the same
			// global min/max, so the key must distinguish it (else a preference switch
			// would read a stale cache entry).
			...(time
				? [`override-${startMs}-${endMs}`]
				: [minTime, maxTime, globalSelectedInterval, timePreference]),
			// fillGaps changes the request payload (formatOptions), so it must key the
			// cache too — otherwise toggling it would read a stale response.
			fillGaps,
			fullKind,
			queries,
			// Offset + page size key the cache so each page is its own entry (0/default
			// for non-paged kinds).
			offset,
			pageSize,
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
		],
	);

	const response = useGetQueryRangeV5({
		requestPayload,
		queryKey,
		enabled: enabled && runnable,
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

	// Paging handles for raw/list panels. `canNext` is a heuristic: a full page
	// or a response `nextCursor` implies more rows (no total count on the wire).
	const pagination = useMemo<PanelPagination | undefined>(() => {
		if (!isPaginated) {
			return undefined;
		}
		const result = getRawResults(response.data)[0];
		const rowCount = result?.rows?.length ?? 0;
		return {
			pageIndex: pageSize > 0 ? Math.floor(offset / pageSize) : 0,
			canPrev: offset > 0,
			canNext: !!result?.nextCursor || rowCount === pageSize,
			goPrev,
			goNext,
			pageSize,
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
		// Coerce undefined → null so the contract is `Error | null`, not
		// `Error | null | undefined`. Consumers can rely on a single
		// "no error" sentinel.
		error: response.error ?? null,
		refetch: response.refetch,
		cancelQuery,
		pagination,
	};
}
