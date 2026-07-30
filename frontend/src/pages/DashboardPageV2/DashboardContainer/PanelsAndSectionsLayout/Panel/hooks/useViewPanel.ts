import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { clearViewPanelHandoff } from '../ViewPanelModal/viewPanelHandoffStore';

export interface UseViewPanelApi {
	/** Panel id currently expanded in the View modal; null when none is open. */
	expandedPanelId: string | null;
	/** Open the View modal on the saved panel (clears any leftover in-modal query/kind). */
	openView: (panelId: string, panel: DashboardtypesPanelDTO) => void;
	/**
	 * Open the View modal pre-seeded with a drilldown query + kind, persisted in the URL so it
	 * survives refresh (V1 parity); the modal hydrates its draft from these on mount.
	 */
	openViewWithQuery: (
		panelId: string,
		query: Query,
		panelType: PANEL_TYPES,
	) => void;
	/** Close the View modal by clearing its URL params. */
	closeView: () => void;
}

/**
 * Drives the panel View modal off the URL (V1 parity): `expandedWidgetId` holds the open
 * panel, and a drilldown additionally seeds `compositeQuery` + `graphType`. URL-backed state
 * is shareable, survives refresh, and the browser back-button closes it.
 */
export function useViewPanel(): UseViewPanelApi {
	const { safeNavigate } = useSafeNavigate();
	const { pathname } = useLocation();
	const urlQuery = useUrlQuery();
	const { resetQuery } = useQueryBuilder();

	const expandedPanelId = urlQuery.get(QueryParams.expandedWidgetId);

	const openView = useCallback(
		(panelId: string, panel: DashboardtypesPanelDTO): void => {
			// Copy before mutating: useUrlQuery returns a memoized instance.
			const next = new URLSearchParams(urlQuery);
			next.set(QueryParams.expandedWidgetId, panelId);
			// Drop leftover in-modal query/kind + the editor's handoff so a plain View opens
			// on the saved panel, not stale state the modal would otherwise hydrate from.
			next.delete(QueryParams.compositeQuery);
			next.delete(QueryParams.graphType);
			clearViewPanelHandoff();
			// Before the modal mounts: its builder fields seed themselves on mount, so a
			// later swap leaves them on the previously-viewed panel. Must be `resetQuery`
			// — replacing one staged id with another re-anchors global time
			// (`useSyncTimeOnStagedQueryChange`) and refetches the whole grid.
			const v1Query = fromPerses(
				panel.spec.queries,
				PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind],
			);
			resetQuery(v1Query);
			void logEvent(DashboardDetailEvents.PanelViewed, { panelId });
			safeNavigate(`${pathname}?${next.toString()}`);
		},
		[pathname, safeNavigate, urlQuery, resetQuery],
	);

	const openViewWithQuery = useCallback(
		(panelId: string, query: Query, panelType: PANEL_TYPES): void => {
			const next = new URLSearchParams(urlQuery);
			next.set(QueryParams.expandedWidgetId, panelId);
			next.set(QueryParams.graphType, panelType);
			// A grid drilldown opens on the saved panel, never a stale editor handoff.
			clearViewPanelHandoff();
			// As in `openView`. Clearing the staged query matters twice over here: the URL
			// below carries this query's own id, and a staged query with a matching id
			// makes the provider skip the hydration that normalises legacy filter fields.
			resetQuery(query);
			// Same encoding the query builder uses (see `useGetCompositeQueryParam`): the URL
			// value is `encodeURIComponent(JSON.stringify(query))`, decoded once on read.
			next.set(
				QueryParams.compositeQuery,
				encodeURIComponent(JSON.stringify(query)),
			);
			safeNavigate(`${pathname}?${next.toString()}`);
		},
		[pathname, safeNavigate, urlQuery, resetQuery],
	);

	const closeView = useCallback((): void => {
		const next = new URLSearchParams(urlQuery);
		next.delete(QueryParams.expandedWidgetId);
		// Drop the drilldown editor's URL state so it doesn't leak to the dashboard
		// (the in-modal query builder writes compositeQuery, V1 parity).
		next.delete(QueryParams.compositeQuery);
		next.delete(QueryParams.graphType);
		clearViewPanelHandoff();
		const search = next.toString();
		safeNavigate(search ? `${pathname}?${search}` : pathname);
	}, [pathname, safeNavigate, urlQuery]);

	return { expandedPanelId, openView, openViewWithQuery, closeView };
}
