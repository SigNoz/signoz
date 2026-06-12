import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';

/**
 * Returns a callback that opens the V2 panel editor overlay for a panel by
 * setting the `editPanelId` query param on the current dashboard URL.
 * DashboardContainer reads the param and renders the editor — the dashboard
 * stays mounted underneath. URL-driven so any entry point (panel actions menu,
 * future title interactions, empty states) can open the editor without
 * threading callbacks through the layout tree.
 */
export function useOpenPanelEditor(): (panelId: string) => void {
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	return useCallback(
		(panelId: string): void => {
			urlQuery.set(QueryParams.editPanelId, panelId);
			safeNavigate(`${pathname}?${urlQuery.toString()}`);
		},
		[urlQuery, safeNavigate, pathname],
	);
}
