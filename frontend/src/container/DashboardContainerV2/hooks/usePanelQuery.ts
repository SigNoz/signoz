import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time selector off redux
import { useSelector } from 'react-redux';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { fromPerses } from 'container/DashboardContainerV2/queryAdapter/fromPerses';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

import { PANEL_KIND_TO_PANEL_TYPE, type PanelKind } from '../Panels/types';

/**
 * Editor-local time window. When passed, the fetch ignores the global Redux
 * time (so changing time in the panel editor doesn't touch the dashboard behind
 * it). `interval` is the relative shorthand (e.g. `30m`); for a custom range
 * pass `startTime`/`endTime` in seconds with `selectedTime: 'CUSTOM'`.
 */
export interface PanelQueryTimeOverride {
	selectedTime: GetQueryResultsProps['selectedTime'];
	interval: GetQueryResultsProps['globalSelectedInterval'];
	startTime?: number;
	endTime?: number;
}

export interface UsePanelQueryArgs {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	/**
	 * Gate the underlying fetch. Defaults to true. PanelV2 sets this false when
	 * no plugin is registered for the panel's kind so the unknown-kind fallback
	 * UI doesn't trigger a wasted API call.
	 *
	 * The hook *also* auto-disables internally when the panel has no queries —
	 * callers don't need to compute that themselves.
	 */
	enabled?: boolean;
	/**
	 * Override the time window instead of reading global Redux time. Used by the
	 * panel editor preview to stay isolated from the dashboard.
	 */
	time?: PanelQueryTimeOverride;
}

export interface UsePanelQueryResult {
	data: MetricQueryRangeSuccessResponse | undefined;
	/** Combines `isLoading` (first fetch) and `isFetching` (background refresh). */
	isLoading: boolean;
	error: Error | null;
}

/**
 * Fetches the query-range data for a V2 panel.
 *
 * Encapsulates three concerns the dashboard shell otherwise has to wire by
 * hand at every call site:
 *
 *   1. Adapter — runs `fromPerses` on the panel's perses queries to produce
 *      the V1 in-memory Query shape `useGetQueryRange` still consumes
 *      internally. This is a fetch-time detail; the V1 Query is not surfaced
 *      to callers — renderers that need it derive it themselves from
 *      `panel.spec.queries` (single source of truth).
 *   2. Time + variables — reads the global time selection from Redux
 *      (variables substitution is intentionally deferred until V2 has its
 *      own variable plumbing).
 *   3. Fetch — calls `useGetQueryRange` with the v5 entity version and a
 *      react-query cache key composed from panel identity + time range +
 *      kind + queries so cache invalidation matches the inputs that affect
 *      the result.
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
	// HISTOGRAM and BAR panels both bin/derive from raw time-series data
	// client-side, so the backend `requestType` for them is `time_series`.
	// `getGraphType` encodes the V1-established mapping — using it keeps
	// V2 in lockstep with how the API has always been called.
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind as PanelKind]) ??
		PANEL_TYPES.TIME_SERIES;
	const graphType = getGraphType(panelType);

	const query = useMemo(
		() => fromPerses(panel?.spec?.queries ?? []),
		[panel?.spec?.queries],
	);

	const {
		selectedTime: globalSelectedInterval,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const hasQuery = useMemo(() => {
		return (
			query.builder.queryData.length > 0 ||
			query.promql.length > 0 ||
			query.clickhouse_sql.length > 0
		);
	}, [query]);

	const response = useGetQueryRange(
		{
			query,
			graphType,
			selectedTime: time?.selectedTime ?? 'GLOBAL_TIME',
			globalSelectedInterval: time?.interval ?? globalSelectedInterval,
			...(time?.startTime != null && time?.endTime != null
				? { start: time.startTime, end: time.endTime }
				: {}),
		},
		ENTITY_VERSION_V5,
		{
			queryKey: [
				REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
				panelId,
				// Editor passes an explicit window; the dashboard keys off Redux
				// min/max. Keep both in the key so each refetches on its own time.
				time
					? `${time.selectedTime}-${time.interval}-${time.startTime}-${time.endTime}`
					: `${minTime}-${maxTime}-${globalSelectedInterval}`,
				fullKind,
				panel?.spec?.queries,
			],
			enabled: enabled && hasQuery,
		},
	);

	return {
		data: response.data,
		isLoading: response.isLoading || response.isFetching,
		// Coerce undefined → null so the contract is `Error | null`, not
		// `Error | null | undefined`. Consumers can rely on a single
		// "no error" sentinel.
		error: (response.error as Error | null) ?? null,
	};
}
