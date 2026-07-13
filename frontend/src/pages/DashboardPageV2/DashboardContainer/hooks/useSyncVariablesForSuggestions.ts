import { useEffect, useMemo } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { setDashboardVariablesStore } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import type {
	IDashboardVariable,
	TVariableQueryType,
} from 'types/api/dashboard/getAll';

import { dtoToFormModel } from '../DashboardSettings/Variables/variableAdapters';
import {
	DYNAMIC_SIGNAL_ALL,
	type VariableFormModel,
	type VariableType,
} from '../DashboardSettings/Variables/variableFormModel';

const TYPE_TO_V1: Record<VariableType, TVariableQueryType> = {
	QUERY: 'QUERY',
	CUSTOM: 'CUSTOM',
	TEXT: 'TEXTBOX',
	DYNAMIC: 'DYNAMIC',
};

/** Minimal V1-shaped variable — only the fields the shared query builder reads. */
function toV1Variable(model: VariableFormModel): IDashboardVariable {
	return {
		id: model.name,
		name: model.name,
		description: model.description,
		type: TYPE_TO_V1[model.type],
		queryValue: model.queryValue,
		customValue: model.customValue,
		textboxValue: model.textValue,
		sort: 'DISABLED',
		multiSelect: model.multiSelect,
		showALLOption: model.showAllOption,
		dynamicVariablesAttribute: model.dynamicAttribute,
		dynamicVariablesSource:
			model.dynamicSignal === DYNAMIC_SIGNAL_ALL
				? 'all sources'
				: model.dynamicSignal,
	};
}

/**
 * Publishes the V2 dashboard's variables into the shared `dashboardVariablesStore`
 * that the query builder's autocomplete (`QuerySearch`) reads, so `$variable`
 * suggestions show up in the panel editor and the dashboards-page query builder.
 * Suggestion-only — the runtime engine lives in the V2 store. Clears on unmount so
 * the shared store doesn't leak into other pages.
 */
export function useSyncVariablesForSuggestions(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): void {
	const dashboardId = dashboard?.id ?? '';
	const specVariables = dashboard?.spec?.variables;
	const variables = useMemo(
		() => (specVariables ?? []).map(dtoToFormModel),
		[specVariables],
	);

	useEffect(() => {
		if (!dashboardId) {
			return undefined;
		}
		const record: Record<string, IDashboardVariable> = {};
		variables.forEach((model) => {
			if (model.name) {
				record[model.name] = toV1Variable(model);
			}
		});
		setDashboardVariablesStore({ dashboardId, variables: record });
		return (): void =>
			setDashboardVariablesStore({ dashboardId: '', variables: {} });
	}, [dashboardId, variables]);
}
