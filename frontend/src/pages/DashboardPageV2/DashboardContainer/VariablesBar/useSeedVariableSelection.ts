import { useEffect, useMemo } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useQueryState } from 'nuqs';

import { dtoToFormModel } from '../DashboardSettings/Variables/variableAdapters';
import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import { selectVariableValues } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';
import type {
	SelectedVariableValue,
	VariableSelection,
	VariableSelectionMap,
} from './selectionTypes';
import {
	deriveFetchContext,
	type VariableFetchContext,
} from './variableDependencies';
import { ALL_SELECTED, variablesUrlParser } from './variablesUrlState';

function defaultSelection(model: VariableFormModel): VariableSelection {
	const def = model.defaultValue;
	if (
		def === ALL_SELECTED ||
		(Array.isArray(def) && def.length === 1 && def[0] === ALL_SELECTED)
	) {
		return { value: null, allSelected: true };
	}
	if (Array.isArray(def) && def.length > 0) {
		return { value: def, allSelected: false };
	}
	if (typeof def === 'string' && def !== '') {
		return { value: model.multiSelect ? [def] : def, allSelected: false };
	}
	if (model.multiSelect && model.showAllOption) {
		return { value: null, allSelected: true };
	}
	return { value: model.multiSelect ? [] : '', allSelected: false };
}

// The `__ALL__` sentinel only means "ALL" for variables that support it — a
// legitimate value of "__ALL__" (e.g. a text var) is taken literally.
function fromUrlValue(
	raw: SelectedVariableValue,
	model: VariableFormModel,
): VariableSelection {
	if (raw === ALL_SELECTED && model.multiSelect && model.showAllOption) {
		return { value: null, allSelected: true };
	}
	return { value: raw, allSelected: false };
}

interface UseSeedVariableSelectionResult {
	variables: VariableFormModel[];
	fetchContext: VariableFetchContext;
}

/**
 * Seeds the runtime variable engine: each value (URL → persisted store →
 * default) plus the fetch context panel queries scope their cache keys by.
 * Mounted by the variables bar and by the panel-editor page, which renders
 * without the bar — without this seed a hard refresh of the editor leaves the
 * store cold and the preview fetches with unresolved variables.
 */
export function useSeedVariableSelection(
	dashboard: DashboardtypesGettableDashboardV2DTO | undefined,
): UseSeedVariableSelectionResult {
	const dashboardId = dashboard?.id ?? '';
	const specVariables = dashboard?.spec?.variables;
	const variables = useMemo(
		() => (specVariables ?? []).map(dtoToFormModel),
		[specVariables],
	);
	const fetchContext = useMemo(() => deriveFetchContext(variables), [variables]);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValues = useDashboardStore((s) => s.setVariableValues);
	const initVariableFetch = useDashboardStore((s) => s.initVariableFetch);

	const [urlValues, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);

	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
		const seeded: VariableSelectionMap = {};
		variables.forEach((variable) => {
			const urlValue = urlValues?.[variable.name];
			if (urlValue !== undefined) {
				seeded[variable.name] = fromUrlValue(urlValue, variable);
			} else if (selection[variable.name]) {
				seeded[variable.name] = selection[variable.name];
			} else {
				seeded[variable.name] = defaultSelection(variable);
			}
		});
		setVariableValues(dashboardId, seeded);

		// Drop URL selections for variables that no longer exist (renamed/removed),
		// so a shared link doesn't carry stale entries a later variable could inherit.
		if (urlValues) {
			const validNames = new Set(variables.map((v) => v.name));
			const orphaned = Object.keys(urlValues).some((n) => !validNames.has(n));
			if (orphaned) {
				const pruned: Record<string, SelectedVariableValue> = {};
				Object.entries(urlValues).forEach(([name, value]) => {
					if (validNames.has(name)) {
						pruned[name] = value;
					}
				});
				void setUrlValues(pruned);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per dashboard/variable set; the URL is read as of that moment
	}, [dashboardId, variables]);

	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
		const names = variables
			.map((v) => v.name)
			.filter((name): name is string => !!name);
		initVariableFetch(names, fetchContext);
	}, [dashboardId, variables, fetchContext, initVariableFetch]);

	return { variables, fetchContext };
}
