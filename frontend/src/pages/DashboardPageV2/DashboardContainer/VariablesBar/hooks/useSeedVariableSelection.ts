import { useEffect, useMemo } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useQueryState } from 'nuqs';

import { dtoToFormModel } from '../../DashboardSettings/Variables/variableAdapters';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { selectVariableValues } from '../../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../../store/useDashboardStore';
import { resolveDefaultSelection } from '../utils/resolveVariableSelection';
import type {
	SelectedVariableValue,
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import {
	deriveFetchContext,
	type VariableFetchContext,
} from '../utils/variableDependencies';
import { ALL_SELECTED, variablesUrlParser } from '../utils/variablesUrlState';

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
			const stored = selection[variable.name];
			if (urlValue !== undefined) {
				const fromUrl = fromUrlValue(urlValue, variable);
				// When the URL carries only the ALL sentinel but the store already holds
				// the materialized full-option array, reuse it — avoids the re-fetch +
				// re-materialize round-trip (and its dependent-refetch cascade) on load.
				seeded[variable.name] =
					fromUrl.allSelected && stored?.allSelected && Array.isArray(stored.value)
						? stored
						: fromUrl;
			} else if (stored) {
				seeded[variable.name] = stored;
			} else {
				seeded[variable.name] = resolveDefaultSelection(variable);
			}
		});
		setVariableValues(dashboardId, seeded);

		// Read-once: a share link's `?variables=` seeds the store, then the param is
		// dropped so the store is the sole source of truth. Selection changes never
		// write it back (only an explicit Share action re-materializes it).
		if (urlValues) {
			void setUrlValues(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per dashboard/variable set; the URL is read as of that moment
	}, [dashboardId, variables]);

	// Always init the context (even with no variables) so panels can tell "ready, none"
	// from "not ready yet"; also clears it when the last variable is removed.
	useEffect(() => {
		if (!dashboardId) {
			return;
		}
		const names = variables
			.map((v) => v.name)
			.filter((name): name is string => !!name);
		initVariableFetch(names, fetchContext);
	}, [dashboardId, variables, fetchContext, initVariableFetch]);

	return { variables, fetchContext };
}
