import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

interface UseSwitchToViewModeArgs {
	dashboardId: string;
	panelId: string;
	panelType: PANEL_TYPES;
	query: Query;
}

/**
 * Callback that leaves the editor for the dashboard with this panel expanded in the
 * View modal, seeded with the live (un-saved) query — V1's "Switch to View Mode".
 */
export function useSwitchToViewMode({
	dashboardId,
	panelId,
	panelType,
	query,
}: UseSwitchToViewModeArgs): () => void {
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	return useCallback((): void => {
		const params = new URLSearchParams();
		const variables = urlQuery.get(QueryParams.variables);
		if (variables) {
			params.set(QueryParams.variables, variables);
		}
		params.set(QueryParams.expandedWidgetId, panelId);
		params.set(QueryParams.graphType, panelType);
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(query)),
		);
		safeNavigate(
			`${generatePath(ROUTES.DASHBOARD, { dashboardId })}?${params.toString()}`,
		);
	}, [safeNavigate, urlQuery, dashboardId, panelId, panelType, query]);
}
