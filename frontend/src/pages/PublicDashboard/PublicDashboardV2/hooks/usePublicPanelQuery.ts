import { getPublicDashboardPanelQueryRangeV2 } from 'api/generated/services/dashboard';
import type {
	DashboardtypesPanelDTO,
	GetPublicDashboardPanelQueryRangeV2200,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { retryUnlessClientError } from 'pages/DashboardPageV2/DashboardContainer/hooks/useGetQueryRangeV5';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import {
	buildQueryRangeRequest,
	extractLegendMap,
	hasRunnableQueries,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest';
import type {
	PanelQueryData,
	PanelPagination,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';

export interface UsePublicPanelQueryArgs {
	panel: DashboardtypesPanelDTO;
	/** Panel key in `spec.panels` — addresses the panel on the public endpoint. */
	panelKey: string;
	publicDashboardId: string;
	/** Epoch milliseconds. */
	startMs: number;
	/** Epoch milliseconds. */
	endMs: number;
	/** Gate the fetch (default true). */
	enabled?: boolean;
}

// Same shape as `usePanelQuery` so the V2 renderers consume it unchanged.
export interface UsePublicPanelQueryResult {
	data: PanelQueryData;
	isLoading: boolean;
	isFetching: boolean;
	isPreviousData: boolean;
	error: Error | null;
	refetch: () => void;
	cancelQuery: () => void;
	/** Always undefined — the public endpoint has no paging (#5557). */
	pagination?: PanelPagination;
}

/**
 * Fetches one v2 public panel by key + time. The public endpoint holds the query server-side
 * (no body, variables, or paging); we still build the request DTO locally so the renderers get
 * the `requestPayload`/`legendMap` they need — it is not sent.
 */
export function usePublicPanelQuery({
	panel,
	panelKey,
	publicDashboardId,
	startMs,
	endMs,
	enabled = true,
}: UsePublicPanelQueryArgs): UsePublicPanelQueryResult {
	const fullKind = panel.spec.plugin.kind;
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind]) ?? PANEL_TYPES.TIME_SERIES;
	const { queries } = panel.spec;

	const pluginSpec = panel.spec.plugin.spec;
	const visualization =
		pluginSpec && 'visualization' in pluginSpec
			? pluginSpec.visualization
			: undefined;
	const fillGaps = Boolean(
		visualization && 'fillSpans' in visualization && visualization.fillSpans,
	);

	// For the renderers only — not sent to the server.
	const requestPayload = useMemo(
		() =>
			buildQueryRangeRequest({
				queries,
				panelType,
				startMs,
				endMs,
				fillGaps,
				variables: {},
			}),
		[queries, panelType, startMs, endMs, fillGaps],
	);

	const legendMap = useMemo(() => extractLegendMap(queries), [queries]);
	const runnable = useMemo(() => hasRunnableQueries(queries), [queries]);

	// Redacted payloads are identical across panels — key on panel + time to avoid cache collisions.
	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD_WIDGET_DATA,
			publicDashboardId,
			panelKey,
			startMs,
			endMs,
		],
		[publicDashboardId, panelKey, startMs, endMs],
	);

	const response = useQuery<GetPublicDashboardPanelQueryRangeV2200, Error>({
		queryKey,
		queryFn: ({ signal }) =>
			getPublicDashboardPanelQueryRangeV2(
				{ id: publicDashboardId, key: panelKey },
				{ startTime: String(startMs), endTime: String(endMs) },
				signal,
			),
		enabled: enabled && runnable && !!publicDashboardId && !!panelKey,
		retry: retryUnlessClientError,
	});

	const data = useMemo<PanelQueryData>(
		() => ({ response: response.data, requestPayload, legendMap }),
		[response.data, requestPayload, legendMap],
	);

	const queryClient = useQueryClient();
	const cancelQuery = useCallback((): void => {
		void queryClient.cancelQueries(queryKey);
	}, [queryClient, queryKey]);

	return {
		data,
		isLoading: response.isLoading,
		isFetching: response.isFetching,
		isPreviousData: response.isPreviousData,
		error: response.error ?? null,
		refetch: response.refetch,
		cancelQuery,
		pagination: undefined,
	};
}
