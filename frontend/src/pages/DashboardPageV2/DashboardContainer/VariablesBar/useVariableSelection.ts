import { useCallback, useEffect, useRef } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useQueryState } from 'nuqs';
// eslint-disable-next-line no-restricted-imports -- global time selector still on redux
import { useSelector } from 'react-redux';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import { selectVariableValues } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';
import type { VariableSelection, VariableSelectionMap } from './selectionTypes';
import { useSeedVariableSelection } from './useSeedVariableSelection';
import { doAllQueryVariablesHaveValues } from './variableDependencies';
import { ALL_SELECTED, variablesUrlParser } from './variablesUrlState';

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
 * Runtime variable selection for the variables bar: seeds values and the fetch
 * context (via useSeedVariableSelection), runs the options fetch cycle, and
 * persists changes to both the store and the URL. Never writes to the dashboard
 * spec.
 */
export function useVariableSelection(
	dashboard: DashboardtypesGettableDashboardV2DTO,
): UseVariableSelection {
	const dashboardId = dashboard.id ?? '';

	const { variables, fetchContext } = useSeedVariableSelection(dashboard);

	const selection = useDashboardStore(selectVariableValues(dashboardId));
	const setVariableValue = useDashboardStore((s) => s.setVariableValue);
	const setVariableValues = useDashboardStore((s) => s.setVariableValues);
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

	const [, setUrlValues] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);

	// Start a full fetch cycle on load / dependency-order / time change. A value
	// change instead goes through `enqueueDescendants`, not this effect.
	const orderKey = `${fetchContext.queryVariableOrder.join(
		',',
	)}|${fetchContext.dynamicVariableOrder.join(',')}`;
	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return;
		}
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
