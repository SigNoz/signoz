import {
	VARIABLE_TYPE_EVENT_LABEL,
	type VariableFormModel,
} from '../../../DashboardSettings/Variables/variableFormModel';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../../selectionTypes';
import { useAutoSelect } from '../../hooks/useAutoSelect';
import ValueSelector from './ValueSelector';
import { useVariableOptions } from '../../hooks/useVariableOptions';

interface VariableValueControlProps {
	variable: VariableFormModel;
	/** All variables (Dynamic scopes its options by sibling selections). */
	variables: VariableFormModel[];
	/** All current selections (fed to the Query request payload). */
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	/** Batched auto-selection fill applied when options resolve. */
	onAutoSelect: (selection: VariableSelection) => void;
}

/**
 * The single value picker for QUERY / CUSTOM / DYNAMIC variables. Options + fetch
 * state come from {@link useVariableOptions}; this component only reconciles the
 * selection against the options and renders — the view is decoupled from how the
 * options are sourced (Container/Presentational).
 */
function VariableValueControl({
	variable,
	variables,
	selections,
	selection,
	onChange,
	onAutoSelect,
}: VariableValueControlProps): JSX.Element {
	const { options, loading, errorMessage, onRetry } = useVariableOptions(
		variable,
		variables,
		selections,
	);

	useAutoSelect(variable, options, selection, onAutoSelect);

	return (
		<ValueSelector
			options={options}
			variableType={VARIABLE_TYPE_EVENT_LABEL[variable.type]}
			multiSelect={variable.multiSelect}
			showAllOption={variable.showAllOption}
			loading={loading}
			errorMessage={errorMessage}
			onRetry={onRetry}
			selection={selection}
			onChange={onChange}
			testId={`variable-select-${variable.name}`}
		/>
	);
}

export default VariableValueControl;
