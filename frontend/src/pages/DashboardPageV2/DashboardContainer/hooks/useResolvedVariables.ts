import { useEffect, useMemo } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { dtoToFormModel } from '../DashboardSettings/Variables/variableAdapters';
import { buildVariablesPayload } from '../queryV5/buildVariablesPayload';
import { selectVariableValues } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Resolves the dashboard's variable selection into the V5 query payload and
 * publishes it to the store, so `usePanelQuery` reads it by dashboardId without
 * the spec being threaded through the panel tree (the `setEditContext` pattern).
 *
 * Definitions come from the spec; values come from the runtime selection (seeded
 * by the variable bar). Re-publishes whenever either changes, which re-keys the
 * panel queries and triggers a refetch with the new values.
 */
export function useResolvedVariables(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): void {
	const dashboardId = dashboard?.id ?? '';

	const specVariables = dashboard?.spec?.variables;
	const definitions = useMemo(
		() => (specVariables ?? []).map(dtoToFormModel),
		[specVariables],
	);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setResolvedVariables = useDashboardStore((s) => s.setResolvedVariables);

	const resolved = useMemo(
		() => buildVariablesPayload(definitions, selection),
		[definitions, selection],
	);

	useEffect(() => {
		if (!dashboardId) {
			return;
		}
		setResolvedVariables(dashboardId, resolved);
	}, [dashboardId, resolved, setResolvedVariables]);
}
