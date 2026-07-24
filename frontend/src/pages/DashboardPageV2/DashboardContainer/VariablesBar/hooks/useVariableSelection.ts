import { useCallback, useEffect, useRef } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
// eslint-disable-next-line no-restricted-imports -- global time selector still on redux
import { useSelector } from 'react-redux';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { selectVariableValues } from '../../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../../store/useDashboardStore';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import { useSeedVariableSelection } from './useSeedVariableSelection';

/**
 * Debounce for the fetch cycle, so the on-load time-range settle (default → saved)
 * and rapid time-picker changes collapse into one cycle instead of double-fetching.
 */
const FETCH_CYCLE_DEBOUNCE_MS = 250;

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
 * persists changes to the store (the source of truth). Never writes to the URL
 * or the dashboard spec.
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

	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	// Latest selection, read by the fetch-cycle effect without subscribing to it
	// (so a value change doesn't re-trigger a full fetch cycle).
	const selectionRef = useRef(selection);
	selectionRef.current = selection;

	// Start a full fetch cycle on load / dependency-order / time change, debounced so
	// the initial time-window settle (and rapid time changes) collapse into ONE cycle
	// instead of double-fetching every variable. Variables stay disabled until the
	// cycle runs, so the transient window is never fetched. A value change instead
	// goes through `enqueueDescendants` — immediate, not this effect.
	const orderKey = `${fetchContext.queryVariableOrder.join(
		',',
	)}|${fetchContext.dynamicVariableOrder.join(',')}`;
	// Key on the time *selection*, not raw min/max: a relative range recomputes those
	// as `now` drifts, which shouldn't refetch. The fetchers still read current time.
	const timeKey =
		selectedTime === 'custom' ? `custom:${minTime}-${maxTime}` : selectedTime;
	// A re-mount re-runs this effect with the same key, which enqueueFetchAll skips.
	const fetchCycleKey = `${dashboardId}|${orderKey}|${timeKey}`;
	const fetchCycleTimer = useRef<ReturnType<typeof setTimeout>>();
	useEffect(() => {
		if (!dashboardId || variables.length === 0) {
			return undefined;
		}

		if (fetchCycleTimer.current) {
			clearTimeout(fetchCycleTimer.current);
		}

		fetchCycleTimer.current = setTimeout(
			() => enqueueFetchAll(fetchCycleKey),
			FETCH_CYCLE_DEBOUNCE_MS,
		);

		return (): void => {
			if (fetchCycleTimer.current) {
				clearTimeout(fetchCycleTimer.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardId, fetchCycleKey]);

	const setSelection = useCallback(
		(name: string, next: VariableSelection): void => {
			setVariableValue(dashboardId, name, next);
			enqueueDescendants(name);
		},
		[dashboardId, setVariableValue, enqueueDescendants],
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
		enqueueDescendantsBatch(names);
	}, [dashboardId, setVariableValues, enqueueDescendantsBatch]);

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
