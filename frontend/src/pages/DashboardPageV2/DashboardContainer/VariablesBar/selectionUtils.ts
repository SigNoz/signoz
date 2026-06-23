import type {
	SelectedVariableValue,
	VariableSelection,
	VariableSelectionMap,
} from './selectionTypes';

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
