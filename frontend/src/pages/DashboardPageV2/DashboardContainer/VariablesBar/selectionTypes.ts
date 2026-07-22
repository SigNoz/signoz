/** A user-selected variable value at runtime (not persisted to the spec). */
export type SelectedVariableValue =
	| string
	| number
	| boolean
	| (string | number | boolean)[]
	| null;

export interface VariableSelection {
	value: SelectedVariableValue;
	/** True when every option is selected ("ALL"); for dynamic vars value may be null. */
	allSelected: boolean;
}

/** Selected values for a dashboard's variables, keyed by variable name. */
export type VariableSelectionMap = Record<string, VariableSelection>;
