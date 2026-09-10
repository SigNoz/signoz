import type { VariableSelection } from '../selectionTypes';

/**
 * What a selection reads as in a tooltip: the ALL label, nothing at all, or the
 * concrete values. Never truncated — the tooltip scrolls instead.
 */
export type SelectionDisplay =
	| { kind: 'all' }
	| { kind: 'empty' }
	| { kind: 'values'; values: string[] };

/** Describes a selection for display. */
export function describeSelection(
	selection: VariableSelection | undefined,
): SelectionDisplay {
	if (!selection) {
		return { kind: 'empty' };
	}
	if (selection.allSelected) {
		return { kind: 'all' };
	}

	const { value } = selection;
	const values = (Array.isArray(value) ? value : [value])
		.filter((entry) => entry !== '' && entry !== null && entry !== undefined)
		.map(String);

	return values.length === 0 ? { kind: 'empty' } : { kind: 'values', values };
}
