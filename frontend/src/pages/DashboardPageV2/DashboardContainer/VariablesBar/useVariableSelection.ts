import { useCallback, useEffect, useMemo } from 'react';
import { parseAsJson, useQueryState } from 'nuqs';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

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
	computeVariableDependencies,
	type VariableDependencyData,
} from './variableDependencies';

/** URL sentinel for an "ALL values selected" state (matches V1). */
export const ALL_SELECTED = '__ALL__';

/** `?variables=` holds `{ [name]: value }` (ALL encoded as the sentinel). */
const variablesUrlParser = parseAsJson<Record<string, SelectedVariableValue>>(
	(v) =>
		typeof v === 'object' && v !== null
			? (v as Record<string, SelectedVariableValue>)
			: null,
);

function defaultSelection(model: VariableFormModel): VariableSelection {
	const def = (
		model.defaultValue as { value?: SelectedVariableValue } | undefined
	)?.value;
	if (def !== undefined && def !== null && def !== '') {
		return { value: def, allSelected: false };
	}
	return { value: model.multiSelect ? [] : '', allSelected: false };
}

function fromUrlValue(raw: SelectedVariableValue): VariableSelection {
	return raw === ALL_SELECTED
		? { value: null, allSelected: true }
		: { value: raw, allSelected: false };
}

interface UseVariableSelection {
	variables: VariableFormModel[];
	dependencyData: VariableDependencyData;
	selection: VariableSelectionMap;
	setSelection: (name: string, selection: VariableSelection) => void;
}

/**
 * Runtime variable selection: derives the variable list from the spec, seeds
 * each value from URL → localStorage(store) → default, and persists changes to
 * both the store and the URL. Never writes to the dashboard spec.
 */
export function useVariableSelection(
	dashboard: DashboardtypesGettableDashboardV2DTO,
): UseVariableSelection {
	const dashboardId = dashboard.id ?? '';

	const variables = useMemo(
		() => (dashboard.spec?.variables ?? []).map(dtoToFormModel),
		[dashboard.spec?.variables],
	);
	const dependencyData = useMemo(
		() => computeVariableDependencies(variables),
		[variables],
	);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValue = useDashboardStore((s) => s.setVariableValue);
	const setVariableValues = useDashboardStore((s) => s.setVariableValues);

	const [urlValues, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);

	// Seed selections for this dashboard: URL wins, then persisted store, then default.
	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
		// `selection` here is the persisted (localStorage) map on mount — the
		// effect deliberately doesn't depend on it, so seeding runs once per set.
		const stored = selection;
		const seeded: VariableSelectionMap = {};
		variables.forEach((variable) => {
			const urlValue = urlValues?.[variable.name];
			if (urlValue !== undefined) {
				seeded[variable.name] = fromUrlValue(urlValue);
			} else if (stored[variable.name]) {
				seeded[variable.name] = stored[variable.name];
			} else {
				seeded[variable.name] = defaultSelection(variable);
			}
		});
		setVariableValues(dashboardId, seeded);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardId, variables]);

	const setSelection = useCallback(
		(name: string, next: VariableSelection): void => {
			setVariableValue(dashboardId, name, next);
			void setUrlValues((prev) => ({
				...(prev ?? {}),
				[name]: next.allSelected ? ALL_SELECTED : next.value,
			}));
		},
		[dashboardId, setVariableValue, setUrlValues],
	);

	return { variables, dependencyData, selection, setSelection };
}
