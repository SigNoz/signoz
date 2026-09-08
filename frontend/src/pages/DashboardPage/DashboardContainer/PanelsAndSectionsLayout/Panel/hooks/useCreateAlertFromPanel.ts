import { useCallback } from 'react';
// eslint-disable-next-line no-restricted-imports -- global time still lives in redux
import { useSelector } from 'react-redux';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { useReplaceVariables } from 'api/generated/services/querier';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { getPanelQueryType } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getPanelQueryType';
import { useDashboardEventMeta } from 'pages/DashboardPage/DashboardContainer/hooks/useDashboardEventMeta';
import { buildQueryRangeRequest } from 'pages/DashboardPage/DashboardContainer/queryV5/buildQueryRangeRequest';
import { envelopesToQuery } from 'pages/DashboardPage/DashboardContainer/queryV5/persesQueryAdapters';
import { selectResolvedVariables } from 'pages/DashboardPage/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { deriveAlertPrefill } from '../utils/deriveAlertPrefill';
import {
	buildAlertUrl,
	buildCreateAlertUrl,
	readPanelUnit,
} from '../utils/buildCreateAlertUrl';
import { NANO_SECOND_MULTIPLIER } from '@/store/globalTime';

/**
 * Callback that seeds the alert builder from a panel's query in a new tab (V1 parity
 * with `useCreateAlerts`; panel supplied at call time so the callback stays stable).
 * With variable selections, resolves them via `/substitute_vars` first; otherwise
 * seeds synchronously (the round-trip would be a no-op).
 */
export function useCreateAlertFromPanel(): (
	panel: DashboardtypesPanelDTO,
	panelId: string,
) => void {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variables = useDashboardStore(selectResolvedVariables(dashboardId));
	const eventMeta = useDashboardEventMeta();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { mutate: substituteVars } = useReplaceVariables();

	return useCallback(
		(panel: DashboardtypesPanelDTO, panelId: string): void => {
			const panelKind = panel.spec.plugin.kind;
			// Alerts are a V1 surface: the query pivots through the V1 `Query` shape and the
			// URL carries a legacy panel type, so this flow keeps translating.
			const panelType = PANEL_KIND_TO_PANEL_TYPE[panelKind];

			void logEvent(DashboardDetailEvents.PanelAction, {
				action: 'createAlerts',
				panelType,
				panelKind,
				...eventMeta,
				widgetId: panelId,
				queryType: getPanelQueryType(panel),
			});

			if (Object.keys(variables).length === 0) {
				safeNavigate(buildCreateAlertUrl(panel), { newTab: true });
				return;
			}

			// Redux global time is nanoseconds; the request DTO takes epoch ms.
			const request = buildQueryRangeRequest({
				queries: panel.spec.queries,
				queryCapabilities: getPanelDefinition(panelKind).queryCapabilities,
				startMs: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
				endMs: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
				variables,
			});

			substituteVars(
				{ data: request },
				{
					onSuccess: (response) => {
						const query = envelopesToQuery(
							response.data.compositeQuery?.queries ?? [],
							panelType,
						);
						const unit = readPanelUnit(panel.spec.plugin);
						const url = buildAlertUrl(
							query,
							panelType,
							unit,
							deriveAlertPrefill(panel, query, unit),
						);
						safeNavigate(url, { newTab: true });
					},
					onError: () => {
						toast.error(SOMETHING_WENT_WRONG, {
							description: 'Failed to create alert from panel',
						});
					},
				},
			);
		},
		[eventMeta, variables, minTime, maxTime, substituteVars, safeNavigate],
	);
}
