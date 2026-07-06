import { useCallback } from 'react';
// eslint-disable-next-line no-restricted-imports -- global time still lives in redux
import { useSelector } from 'react-redux';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { useReplaceVariables } from 'api/generated/services/querier';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getPanelQueryType } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getPanelQueryType';
import { buildQueryRangeRequest } from 'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest';
import { envelopesToQuery } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import { selectResolvedVariables } from 'pages/DashboardPageV2/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

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
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { mutate: substituteVars } = useReplaceVariables();

	return useCallback(
		(panel: DashboardtypesPanelDTO, panelId: string): void => {
			const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];

			void logEvent('Dashboard Detail: Panel action', {
				action: 'createAlerts',
				panelType,
				dashboardId,
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
				panelType,
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
						const url = buildAlertUrl(
							query,
							panelType,
							readPanelUnit(panel.spec.plugin),
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
		[dashboardId, variables, minTime, maxTime, substituteVars, safeNavigate],
	);
}
