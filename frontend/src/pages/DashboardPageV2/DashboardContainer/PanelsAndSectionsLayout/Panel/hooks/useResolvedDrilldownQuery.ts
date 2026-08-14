import { useEffect, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- global time still lives in redux
import { useSelector } from 'react-redux';
import { useReplaceVariables } from 'api/generated/services/querier';
import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryCapabilities } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelCapabilities';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { buildQueryRangeRequest } from 'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest';
import { envelopesToQuery } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import { selectResolvedVariables } from 'pages/DashboardPageV2/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import { AppState } from 'store/reducers';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

interface UseResolvedDrilldownQueryArgs {
	/** Panel's perses queries — the substitution source (carries the `$var` refs). */
	queries: DashboardtypesQueryDTO[];
	panelKind: PanelKind;
	/** The panel kind's declared query capabilities — shapes the substitution request. */
	queryCapabilities: PanelQueryCapabilities;
	/** The raw V5→V1 query; the fallback until substitution resolves / when no vars exist. */
	v1Query: Query;
	/** Resolve only while the aggregate menu is open (V1 parity: fires when it appears). */
	enabled: boolean;
}

interface UseResolvedDrilldownQueryResult {
	/** The variable-substituted query for View-in-X navigation. */
	resolvedQuery: Query;
	/** True while the round-trip is in flight — View-in-X shows a spinner and is disabled. */
	isResolving: boolean;
}

/**
 * Resolves the panel's dashboard-variable references (`$var`) into concrete values before
 * View in Logs/Traces builds the explorer URL — V1 parity (`useBaseAggregateOptions` runs the
 * same `/substitute_vars` round-trip). Skipped when the dashboard has no selections: the raw
 * query already carries the refs verbatim and the round-trip would be a no-op. Mirrors the
 * V2-native path in {@link useCreateAlertFromPanel}.
 */
export function useResolvedDrilldownQuery({
	queries,
	panelKind,
	queryCapabilities,
	v1Query,
	enabled,
}: UseResolvedDrilldownQueryArgs): UseResolvedDrilldownQueryResult {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variables = useDashboardStore(selectResolvedVariables(dashboardId));
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { mutate: substituteVars, data, isLoading } = useReplaceVariables();

	const hasVariables = Object.keys(variables).length > 0;

	useEffect(() => {
		if (!enabled || !hasVariables) {
			return;
		}
		// Redux global time is nanoseconds; the request DTO takes integer epoch ms — the
		// backend rejects fractional bounds, so floor after the ns→ms divide.
		substituteVars({
			data: buildQueryRangeRequest({
				queries,
				queryCapabilities,
				startMs: Math.floor(minTime / 1e6),
				endMs: Math.floor(maxTime / 1e6),
				variables,
			}),
		});
	}, [
		enabled,
		hasVariables,
		queries,
		queryCapabilities,
		minTime,
		maxTime,
		variables,
		substituteVars,
	]);

	const resolvedQuery = useMemo(() => {
		if (!hasVariables || !data) {
			return v1Query;
		}
		// View-in-X navigates to a V1 explorer, so the resolved query crosses back into the
		// V1 `Query` shape — the one place this hook still needs a legacy panel type.
		return envelopesToQuery(
			data.data.compositeQuery?.queries ?? [],
			PANEL_KIND_TO_PANEL_TYPE[panelKind],
		);
	}, [hasVariables, data, v1Query, panelKind]);

	return { resolvedQuery, isResolving: enabled && hasVariables && isLoading };
}
