import { VariableFormModel } from './variableFormModel';

/** `null` index = adding a new variable; a number = editing that row. */
export type EditingState =
	| { type: 'new' }
	| { type: 'edit'; index: number }
	| null;

export interface VariableFormProps {
	initial: VariableFormModel;
	/** The other variables (excluding this one), for uniqueness & cycle checks. */
	siblings: VariableFormModel[];
	/** True when adding a new variable (enables auto-naming from the attribute). */
	isNew: boolean;
	isSaving: boolean;
	onClose: () => void;
	onSave: (model: VariableFormModel) => void;
}
