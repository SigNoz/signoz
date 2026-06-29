import { useCallback, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time dispatch off redux
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { UpdateTimeInterval } from 'store/actions';

export interface PanelInteractions {
	/** Drag-select a chart range → write it to the URL + global time so every panel re-fetches the same range. */
	onDragSelect: (start: number, end: number) => void;
	/** Dashboard-wide rendering preferences (cursor sync, tooltip filter). */
	dashboardPreference: DashboardPreference;
}

/**
 * Cross-panel interactions shared by every dashboard-view panel: drag-to-zoom
 * time selection and the cursor-sync / tooltip-filter preferences.
 */
export function usePanelInteractions(): PanelInteractions {
	const dispatch = useDispatch();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const [syncMode] = useDashboardCursorSyncMode(
		dashboardId,
		PanelMode.DASHBOARD_VIEW,
	);
	const [syncFilterMode] = useSyncTooltipFilterMode(dashboardId);

	const dashboardPreference = useMemo<DashboardPreference>(
		() => ({ syncMode, syncFilterMode, dashboardId }),
		[syncMode, syncFilterMode, dashboardId],
	);

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			safeNavigate(`${pathname}?${urlQuery.toString()}`);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, safeNavigate, urlQuery],
	);

	return { onDragSelect, dashboardPreference };
}
