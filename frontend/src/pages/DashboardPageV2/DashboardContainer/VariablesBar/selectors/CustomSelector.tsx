import { useMemo } from 'react';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';

import { sortValuesByOrder } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelection } from '../selectionTypes';
import { useAutoSelect } from '../useAutoSelect';
import ValueSelector from './ValueSelector';

interface CustomSelectorProps {
	variable: VariableFormModel;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	onAutoSelect: (selection: VariableSelection) => void;
}

/**
 * Custom-variable options come from the comma-separated `customValue` (no fetch),
 * but still auto-select a default/first option so the variable is never left blank.
 */
function CustomSelector({
	variable,
	selection,
	onChange,
	onAutoSelect,
}: CustomSelectorProps): JSX.Element {
	const options = useMemo(
		() =>
			sortValuesByOrder(
				commaValuesParser(variable.customValue),
				variable.sort,
			).map(String),
		[variable.customValue, variable.sort],
	);

	useAutoSelect(variable, options, selection, onAutoSelect);

	return (
		<ValueSelector
			options={options}
			multiSelect={variable.multiSelect}
			showAllOption={variable.showAllOption}
			selection={selection}
			onChange={onChange}
			testId={`variable-select-${variable.name}`}
		/>
	);
}

export default CustomSelector;
