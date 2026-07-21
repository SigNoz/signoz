import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import type { PanelEditorHandoffState } from '../PanelEditor/panelEditorHandoff';
import { useDashboardStore } from '../store/useDashboardStore';
import { useTimeSearchParams } from './useTimeSearchParams';

interface OpenPanelEditorOptions {
	handoffState?: PanelEditorHandoffState;
	/** Extra query merged into the editor URL (leading `?` optional). */
	search?: string;
}

/** Opens the V2 panel editor, carrying the active time window in the URL. */
export function useOpenPanelEditor(): (
	panelId: string,
	options?: OpenPanelEditorOptions,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const timeSearch = useTimeSearchParams();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	return useCallback(
		(panelId: string, handoffState?: PanelEditorHandoffState): void => {
			void logEvent(DashboardDetailEvents.PanelAction, {
				action: 'edit',
				panelId,
				dashboardId,
			});
			safeNavigate(
				search ? `${path}?${search}` : path,
				options?.handoffState ? { state: options.handoffState } : undefined,
			);
		},
		[safeNavigate, dashboardId, timeSearch],
	);
}
