/**
 * A single variable's selected value.
 *
 * - `kind: 'list'` is used for QUERY / CUSTOM / DYNAMIC list variables.
 *   - `allSelected: true` represents the user picking "ALL"; `values` is
 *     ignored in that case.
 *   - `values` is an array even for single-select to keep the shape uniform;
 *     single-select uses index 0.
 * - `kind: 'text'` is the TextVariable case: one freeform string.
 */
export type VariableSelection =
	| { kind: 'list'; values: string[]; allSelected: boolean }
	| { kind: 'text'; value: string };

/**
 * Map of `variable name` → selection. Per dashboard, in memory + persisted.
 */
export type SelectionsByName = Record<string, VariableSelection | undefined>;

export const ALL_SENTINEL = '__ALL__';
