import { useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import sortValues from 'lib/dashboardVariables/sortVariableValues';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableModel';
import type { VariableSelection } from './selectionTypes';
import TextSelector from './selectors/TextSelector';
import ValueSelector from './selectors/ValueSelector';
import styles from './VariablesBar.module.scss';

interface VariableSelectorProps {
	variable: VariableFormModel;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
}

/** One labelled variable control; dispatches on the variable type. */
function VariableSelector({
	variable,
	selection,
	onChange,
}: VariableSelectorProps): JSX.Element {
	// Static option set for Custom; Query/Dynamic options are fetched (added in a
	// later phase) — they render an (empty) picker for now.
	const options = useMemo(() => {
		if (variable.type === 'CUSTOM') {
			return sortValues(
				commaValuesParser(variable.customValue),
				variable.sort,
			).map(String);
		}
		return [] as string[];
	}, [variable]);

	return (
		<div className={styles.variable} data-testid={`variable-${variable.name}`}>
			<Typography.Text className={styles.label}>${variable.name}</Typography.Text>
			{variable.type === 'TEXT' ? (
				<TextSelector
					selection={selection}
					onChange={onChange}
					testId={`variable-input-${variable.name}`}
				/>
			) : (
				<ValueSelector
					options={options}
					multiSelect={variable.multiSelect}
					showAllOption={variable.showAllOption}
					selection={selection}
					onChange={onChange}
					testId={`variable-select-${variable.name}`}
				/>
			)}
		</div>
	);
}

export default VariableSelector;
