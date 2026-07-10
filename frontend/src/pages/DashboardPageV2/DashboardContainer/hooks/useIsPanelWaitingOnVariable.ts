import { isResolved } from '../VariablesBar/selectionUtils';
import { selectVariableValues } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * True while a panel should stay in its loading state because a variable it
 * references is still loading/waiting and has no usable value yet — i.e. the
 * first load. Once the variable has a value, a later change no longer blocks the
 * panel (it refetches over stale data instead). V1 parity with
 * `useIsPanelWaitingOnVariable`.
 */
export function useIsPanelWaitingOnVariable(names: string[]): boolean {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const states = useDashboardStore((s) => s.variableFetchStates);
	const selection = useDashboardStore(selectVariableValues(dashboardId));

	return names.some((name) => {
		const state = states[name];
		const inFlight =
			state === 'loading' || state === 'revalidating' || state === 'waiting';
		return isResolved(selection[name]) ? false : inFlight;
	});
}
