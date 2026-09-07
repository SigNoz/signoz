import { VariableFormModel } from './variableFormModel';

/** `null` index = adding a new variable; a number = editing that row. */
export type EditingState =
	| { type: 'new' }
	| { type: 'edit'; index: number }
	| null;

export interface PanelOption {
	label: string;
	value: string;
}

export interface VariableFormProps {
	initial: VariableFormModel;
	/** The other variables (excluding this one), for uniqueness & cycle checks. */
	siblings: VariableFormModel[];
	/** True when adding a new variable (enables auto-naming from the attribute). */
	isNew: boolean;
	isSaving: boolean;
	/** All panels, for the dynamic "apply to panels" picker. */
	panelOptions: PanelOption[];
	/** Panels this variable is already applied to — pre-checks the picker. */
	appliedPanelIds: string[];
	onClose: () => void;
	onSave: (model: VariableFormModel, selectedPanelIds: string[]) => void;
}
