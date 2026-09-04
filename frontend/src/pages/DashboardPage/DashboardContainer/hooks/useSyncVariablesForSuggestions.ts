import { useEffect, useMemo } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import {
	type DynamicVariableSuggestion,
	setDynamicVariableSuggestions,
} from 'providers/Dashboard/store/dynamicVariableSuggestions';

import { dtoToFormModel } from '../DashboardSettings/Variables/variableAdapters';

/**
 * Publishes the dashboard's dynamic variables into the shared suggestion store that
 * the query builder's autocomplete (`QuerySearch`) reads, so `$variable` is offered
 * as a value for the attribute each one backs — in the panel editor and the
 * dashboards-page query builder. Suggestion-only: the runtime engine lives in the
 * dashboard store. Clears on unmount so the shared store doesn't leak into other
 * pages.
 */
export function useSyncVariablesForSuggestions(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): void {
	const dashboardId = dashboard?.id ?? '';
	const specVariables = dashboard?.spec?.variables;
	const suggestions = useMemo<DynamicVariableSuggestion[]>(
		() =>
			(specVariables ?? [])
				.map(dtoToFormModel)
				.filter(
					(model) =>
						model.type === 'DYNAMIC' && !!model.name && !!model.dynamicAttribute,
				)
				.map((model) => ({
					name: model.name,
					attribute: model.dynamicAttribute,
				})),
		[specVariables],
	);

	useEffect(() => {
		if (!dashboardId) {
			return undefined;
		}
		setDynamicVariableSuggestions(suggestions);
		return (): void => setDynamicVariableSuggestions([]);
	}, [dashboardId, suggestions]);
}
