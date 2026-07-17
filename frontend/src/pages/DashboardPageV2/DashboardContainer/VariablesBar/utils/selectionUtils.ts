import type { VariableType } from '../../DashboardSettings/Variables/variableFormModel';
import type {
	SelectedVariableValue,
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';

/** A selection counts as resolved (usable as a parent value) when it's non-empty. */
export function isResolved(selection?: VariableSelection): boolean {
	if (!selection) {
		return false;
	}
	if (selection.allSelected) {
		return true;
	}
	const { value } = selection;
	if (Array.isArray(value)) {
		return value.length > 0;
	}
	return value !== '' && value !== null && value !== undefined;
}

/**
 * Whether a selection carries a value usable when scheduling a dependent
 * variable/panel fetch. Unlike {@link isResolved}, an ALL selection counts only
 * once it holds the concrete option array — for QUERY that's after its fetch, for
 * CUSTOM it's materialized synchronously (no fetch). A DYNAMIC ALL is usable
 * immediately via the `__all__` sentinel.
 */
export function hasUsableValue(
	selection: VariableSelection | undefined,
	type: VariableType | undefined,
): boolean {
	if (!selection) {
		return false;
	}
	if (selection.allSelected) {
		if (type === 'DYNAMIC') {
			return true;
		}
		return Array.isArray(selection.value) && selection.value.length > 0;
	}
	const { value } = selection;
	if (Array.isArray(value)) {
		return value.length > 0;
	}
	return value !== '' && value !== null && value !== undefined;
}

/** Flatten the selection map into the `{ name: value }` payload a query expects. */
export function selectionToPayload(
	selection: VariableSelectionMap,
): Record<string, SelectedVariableValue> {
	const payload: Record<string, SelectedVariableValue> = {};
	Object.entries(selection).forEach(([name, sel]) => {
		payload[name] = sel.value;
	});
	return payload;
}
