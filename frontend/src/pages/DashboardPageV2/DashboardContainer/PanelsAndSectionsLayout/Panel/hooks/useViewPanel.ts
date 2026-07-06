import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

export interface UseViewPanelApi {
	/** Panel id currently expanded in the View modal; null when none is open. */
	expandedPanelId: string | null;
	/** Open the View modal on the saved panel (clears any leftover in-modal query/kind). */
	openView: (panelId: string) => void;
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

	const expandedPanelId = urlQuery.get(QueryParams.expandedWidgetId);

	const openView = useCallback(
		(panelId: string): void => {
			// Copy before mutating: useUrlQuery returns a memoized instance.
			const next = new URLSearchParams(urlQuery);
			next.set(QueryParams.expandedWidgetId, panelId);
			// Drop any leftover in-modal query/kind so a plain View opens on the saved
			// panel, not a stale URL query the modal would otherwise hydrate from.
			next.delete(QueryParams.compositeQuery);
			next.delete(QueryParams.graphType);
			safeNavigate(`${pathname}?${next.toString()}`);
		},
		[pathname, safeNavigate, urlQuery],
	);

	const openViewWithQuery = useCallback(
		(panelId: string, query: Query, panelType: PANEL_TYPES): void => {
			const next = new URLSearchParams(urlQuery);
			next.set(QueryParams.expandedWidgetId, panelId);
			next.set(QueryParams.graphType, panelType);
			// Same encoding the query builder uses (see `useGetCompositeQueryParam`): the URL
			// value is `encodeURIComponent(JSON.stringify(query))`, decoded once on read.
			next.set(
				QueryParams.compositeQuery,
				encodeURIComponent(JSON.stringify(query)),
			);
			safeNavigate(`${pathname}?${next.toString()}`);
		},
		[pathname, safeNavigate, urlQuery],
	);

	const closeView = useCallback((): void => {
		const next = new URLSearchParams(urlQuery);
		next.delete(QueryParams.expandedWidgetId);
		// Drop the drilldown editor's URL state so it doesn't leak to the dashboard
		// (the in-modal query builder writes compositeQuery, V1 parity).
		next.delete(QueryParams.compositeQuery);
		next.delete(QueryParams.graphType);
		const search = next.toString();
		safeNavigate(search ? `${pathname}?${search}` : pathname);
	}, [pathname, safeNavigate, urlQuery]);

	return { expandedPanelId, openView, openViewWithQuery, closeView };
}
