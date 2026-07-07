import { useCallback, useEffect, useMemo, useRef } from 'react';
import { parseAsJson, useQueryState } from 'nuqs';
// eslint-disable-next-line no-restricted-imports -- global time selector still on redux
import { useSelector } from 'react-redux';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

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
	doAllQueryVariablesHaveValues,
} from './variableDependencies';

/** URL sentinel for an "ALL values selected" state (matches V1). */
export const ALL_SELECTED = '__ALL__';

/** `?variables=` holds `{ [name]: value }` (ALL encoded as the sentinel). */
export const variablesUrlParser = parseAsJson<
	Record<string, SelectedVariableValue>
>((v) =>
	typeof v === 'object' && v !== null
		? (v as Record<string, SelectedVariableValue>)
		: null,
);

function defaultSelection(model: VariableFormModel): VariableSelection {
	// `defaultValue` is a string | string[] on the wire.
	const def = model.defaultValue;
	if (Array.isArray(def) && def.length > 0) {
		return { value: def, allSelected: false };
	}
	if (typeof def === 'string' && def !== '') {
		return { value: model.multiSelect ? [def] : def, allSelected: false };
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
	const fetchContext = useMemo(() => deriveFetchContext(variables), [variables]);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValue = useDashboardStore((s) => s.setVariableValue);
	const setVariableValues = useDashboardStore((s) => s.setVariableValues);
	const initVariableFetch = useDashboardStore((s) => s.initVariableFetch);
	const enqueueFetchAll = useDashboardStore((s) => s.enqueueFetchAll);
	const enqueueDescendants = useDashboardStore((s) => s.enqueueDescendants);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// Latest selection, read by the fetch-cycle effect without subscribing to it
	// (so a value change doesn't re-trigger a full fetch cycle).
	const selectionRef = useRef(selection);
	selectionRef.current = selection;

	const [urlValues, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);

	// Seed selections: URL wins, then persisted store, then default.
	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
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

	// Start a full fetch cycle on load / dependency-order / time change. Runs after
	// the seeding effect above, so it reads the seeded selection from the store; a
	// value change instead goes through `enqueueDescendants`, not this effect.
	const orderKey = `${fetchContext.queryVariableOrder.join(
		',',
	)}|${fetchContext.dynamicVariableOrder.join(',')}`;
	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
		const names = variables
			.map((v) => v.name)
			.filter((name): name is string => !!name);
		initVariableFetch(names, fetchContext);
		enqueueFetchAll(
			doAllQueryVariablesHaveValues(variables, selectionRef.current),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardId, orderKey, minTime, maxTime]);

	const setSelection = useCallback(
		(name: string, next: VariableSelection): void => {
			setVariableValue(dashboardId, name, next);
			enqueueDescendants(name);
			void setUrlValues((prev) => ({
				...(prev ?? {}),
				[name]: next.allSelected ? ALL_SELECTED : next.value,
			}));
		},
		[dashboardId, setVariableValue, enqueueDescendants, setUrlValues],
	);

	return { variables, selection, setSelection };
}
