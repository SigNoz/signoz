import { hasUsableValue } from '../VariablesBar/utils/selectionUtils';
import { VariableFetchState } from '../store/slices/variableFetchSlice';
import { selectVariableValues } from '../store/slices/variableSelectionSlice';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Whether a panel should stay loading because a QUERY/DYNAMIC variable it references
 * isn't ready to substitute. A concrete pick (not ALL) and a DYNAMIC ALL are ready
 * immediately; an unselected value or a QUERY/CUSTOM ALL waits while it's still
 * resolving, then until it settles with a value — so a panel on a chain holds until
 * the last variable it depends on resolves. A fetch error or a settled-empty variable
 * releases it (no value is coming — render rather than hang).
 */
export function useIsPanelWaitingOnVariable(names: string[]): boolean {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const variableTypes = useDashboardStore(
		(s) => s.variableFetchContext?.variableTypes,
	);
	const fetchStates = useDashboardStore((s) => s.variableFetchStates);
	const resolvedEmpty = useDashboardStore((s) => s.variableResolvedEmpty);
	const selection = useDashboardStore(selectVariableValues(dashboardId));

	// Before the variable bar seeds the fetch context there are no types to gate on;
	// usePanelQuery holds such panels via its own `!fetchContext` check.
	if (!variableTypes) {
		return false;
	}

	return names.some((name) => {
		const type = variableTypes[name];
		if (type !== 'QUERY' && type !== 'DYNAMIC') {
			return false;
		}

		const value = selection[name];

		// A concrete pick is authoritative; a DYNAMIC ALL is the stable `__all__`
		// sentinel — both ready without waiting.
		if (value && !value.allSelected && hasUsableValue(value, type)) {
			return false;
		}

		if (type === 'DYNAMIC' && value?.allSelected) {
			return false;
		}

		// Unselected, or a QUERY/CUSTOM ALL whose array the fetch produces: wait while
		// resolving, then until it settles with a usable value.
		const state = fetchStates[name];
		if (
			state === VariableFetchState.Waiting ||
			state === VariableFetchState.Loading
		) {
			return true;
		}

		if (hasUsableValue(value, type)) {
			return false;
		}

		return state !== VariableFetchState.Error && !resolvedEmpty[name];
	});
}
