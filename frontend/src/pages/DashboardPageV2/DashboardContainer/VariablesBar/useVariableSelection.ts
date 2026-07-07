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
	/**
	 * Auto-selection fill (default/first-option) applied when options arrive. Unlike
	 * {@link UseVariableSelection.setSelection}, fills from the initial load burst are
	 * coalesced into one store write + one downstream refresh.
	 */
	autoSelect: (name: string, selection: VariableSelection) => void;
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
	const enqueueDescendantsBatch = useDashboardStore(
		(s) => s.enqueueDescendantsBatch,
	);

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

	// Coalesce the initial load burst of auto-selections: each selector fills its
	// value as its options resolve (at different times). Collecting them into one
	// store write + one `enqueueDescendantsBatch` means dependents re-fetch once
	// with the settled parent values, instead of once per fill.
	const pendingAutoFillRef = useRef<VariableSelectionMap>({});
	const autoFillFrameRef = useRef<number | null>(null);

	const flushAutoFills = useCallback((): void => {
		autoFillFrameRef.current = null;
		const fills = pendingAutoFillRef.current;
		pendingAutoFillRef.current = {};
		const names = Object.keys(fills);
		if (names.length === 0 || !dashboardId) {
			return;
		}
		setVariableValues(dashboardId, { ...selectionRef.current, ...fills });
		void setUrlValues((prev) => {
			const next = { ...(prev ?? {}) };
			names.forEach((name) => {
				const sel = fills[name];
				next[name] = sel.allSelected ? ALL_SELECTED : sel.value;
			});
			return next;
		});
		enqueueDescendantsBatch(names);
	}, [dashboardId, setVariableValues, setUrlValues, enqueueDescendantsBatch]);

	const autoSelect = useCallback(
		(name: string, next: VariableSelection): void => {
			pendingAutoFillRef.current[name] = next;
			if (autoFillFrameRef.current == null) {
				autoFillFrameRef.current = requestAnimationFrame(flushAutoFills);
			}
		},
		[flushAutoFills],
	);

	useEffect(
		() => (): void => {
			if (autoFillFrameRef.current != null) {
				cancelAnimationFrame(autoFillFrameRef.current);
			}
		},
		[],
	);

	return { variables, selection, setSelection, autoSelect };
}
