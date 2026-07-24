import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { writeViewPanelHandoff } from '../../PanelsAndSectionsLayout/Panel/ViewPanelModal/viewPanelHandoffStore';

interface UseSwitchToViewModeArgs {
	dashboardId: string;
	panelId: string;
	panelType: PANEL_TYPES;
	query: Query;
	/** Live (un-saved) draft spec — the query rides in the URL, the rest via the handoff. */
	spec: DashboardtypesPanelSpecDTO;
}

/**
 * Leaves the editor for the dashboard with this panel expanded in the View modal, seeded with
 * the live (un-saved) query + config — V1's "Switch to View Mode". The query rides in the URL
 * (`compositeQuery`); the rest of the spec rides in a tab-scoped sessionStorage handoff.
 */
export function useSwitchToViewMode({
	dashboardId,
	panelId,
	panelType,
	query,
	spec,
}: UseSwitchToViewModeArgs): () => void {
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	return useCallback((): void => {
		writeViewPanelHandoff({ dashboardId, panelId, spec });

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
	}, [safeNavigate, urlQuery, dashboardId, panelId, panelType, query, spec]);
}
