import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';

export interface UseViewPanelApi {
	/** Panel id currently expanded in the View modal; null when none is open. */
	expandedPanelId: string | null;
	/** Open the View modal on the saved panel (clears any leftover in-modal query/kind). */
	openView: (panelId: string) => void;
	/** Close the View modal by clearing the URL param. */
	closeView: () => void;
}

/**
 * Drives the panel View modal off the `expandedWidgetId` URL param (V1 parity):
 * the open state is shareable, survives refresh, and the browser back-button
 * closes it. Reuses V1's param key so a deep-linked V1 URL maps cleanly.
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

	return { expandedPanelId, openView, closeView };
}
