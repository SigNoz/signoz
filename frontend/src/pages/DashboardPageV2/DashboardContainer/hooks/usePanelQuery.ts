import { useMemo } from 'react';
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
import type { PanelQueryData } from '../queryV5/types';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from '../Panels/types/panelKind';
import { useGetQueryRangeV5 } from './useGetQueryRangeV5';

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
}

export interface UsePanelQueryResult {
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	/** Combines `isLoading` (first fetch) and `isFetching` (background refresh). */
	isLoading: boolean;
	/** Background refresh in flight while data is already present. */
	isFetching: boolean;
	error: Error | null;
	/** Re-run the query (e.g. a retry button on the error state). */
	refetch: () => void;
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
}: UsePanelQueryArgs): UsePanelQueryResult {
	const fullKind = panel?.spec?.plugin?.kind;
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind as PanelKind]) ??
		PANEL_TYPES.TIME_SERIES;
	const queries = panel?.spec?.queries;

	const {
		selectedTime: globalSelectedInterval,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	// Redux global time is in nanoseconds; the V5 API takes epoch ms.
	const startMs = Math.floor(minTime / 1e6);
	const endMs = Math.floor(maxTime / 1e6);

	const requestPayload = useMemo(
		() =>
			buildQueryRangeRequest({
				queries: queries ?? [],
				panelType,
				startMs,
				endMs,
			}),
		[queries, panelType, startMs, endMs],
	);

	const legendMap = useMemo(() => extractLegendMap(queries ?? []), [queries]);

	const runnable = useMemo(() => hasRunnableQueries(queries ?? []), [queries]);

	const response = useGetQueryRangeV5({
		requestPayload,
		queryKey: [
			REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
			panelId,
			minTime,
			maxTime,
			globalSelectedInterval,
			fullKind,
			queries,
		],
		enabled: enabled && runnable,
	});

	const data = useMemo<PanelQueryData>(
		() => ({ response: response.data, requestPayload, legendMap }),
		[response.data, requestPayload, legendMap],
	);

	return {
		data,
		isLoading: response.isLoading || response.isFetching,
		isFetching: response.isFetching,
		// Coerce undefined → null so the contract is `Error | null`, not
		// `Error | null | undefined`. Consumers can rely on a single
		// "no error" sentinel.
		error: (response.error as Error | null) ?? null,
		refetch: response.refetch,
	};
}
