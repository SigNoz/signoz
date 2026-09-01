import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import type { PanelEditorHandoffState } from '../PanelEditor/panelEditorHandoff';
import { isQuerylessPanelKind } from '../Panels/capabilities';
import { getPanelBuilderQuery } from '../Panels/utils/getPanelBuilderQuery';
import { useDashboardStore } from '../store/useDashboardStore';
import { useTimeSearchParams } from './useTimeSearchParams';
import logEvent from '@/api/common/logEvent';
import { DashboardDetailEvents } from '../../constants/events';

interface OpenPanelEditorOptions {
	handoffState?: PanelEditorHandoffState;
	/** Extra query merged into the editor URL (leading `?` optional). */
	search?: string;
	/** The panel being edited — its query rides in the URL as `compositeQuery`. */
	panel?: DashboardtypesPanelDTO;
}

/** Opens the V2 panel editor, carrying the active time window in the URL. */
export function useOpenPanelEditor(): (
	panelId: string,
	options?: OpenPanelEditorOptions,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const timeSearch = useTimeSearchParams();
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { resetQuery } = useQueryBuilder();

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
			// A static kind carries no query state — nothing to stage or persist.
			if (
				options?.panel &&
				!isQuerylessPanelKind(options.panel.spec.plugin.kind)
			) {
				const query = getPanelBuilderQuery(options.panel);
				// Single-encoded: `useGetCompositeQueryParam` decodes once on top of the decode
				// `URLSearchParams` already does.
				params.set(
					QueryParams.compositeQuery,
					encodeURIComponent(JSON.stringify(query)),
				);
				// The provider applies the URL in an effect, a tick after the builder's fields
				// have mounted and read the query they keep (PromQL inputs, add-on rows).
				resetQuery(query);
			}
			const search = params.toString();
			safeNavigate(
				search ? `${path}?${search}` : path,
				options?.handoffState ? { state: options.handoffState } : undefined,
			);
		},
		[safeNavigate, dashboardId, timeSearch, resetQuery],
	);
}
