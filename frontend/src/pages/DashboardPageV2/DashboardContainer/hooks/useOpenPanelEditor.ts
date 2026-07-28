import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import type { PanelEditorHandoffState } from '../PanelEditor/panelEditorHandoff';
import { useDashboardStore } from '../store/useDashboardStore';
import { useTimeSearchParams } from './useTimeSearchParams';
import logEvent from '@/api/common/logEvent';
import { DashboardDetailEvents } from '../../constants/events';

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
		(panelId: string, options?: OpenPanelEditorOptions): void => {
			void logEvent(DashboardDetailEvents.PanelAction, {
				action: 'edit',
				panelId,
				dashboardId,
			});
			const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
				dashboardId,
				panelId,
			});
			const params = new URLSearchParams(options?.search);
			new URLSearchParams(timeSearch).forEach((value, key) => {
				params.set(key, value);
			});
			const search = params.toString();
			safeNavigate(
				search ? `${path}?${search}` : path,
				options?.handoffState ? { state: options.handoffState } : undefined,
			);
		},
		[safeNavigate, dashboardId, timeSearch],
	);
}
