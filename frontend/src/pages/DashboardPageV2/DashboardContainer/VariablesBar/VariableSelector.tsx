import { useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import sortValues from 'lib/dashboardVariables/sortVariableValues';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableModel';
import type { VariableSelection, VariableSelectionMap } from './selectionTypes';
import DynamicSelector from './selectors/DynamicSelector';
import QuerySelector from './selectors/QuerySelector';
import TextSelector from './selectors/TextSelector';
import ValueSelector from './selectors/ValueSelector';
import styles from './VariablesBar.module.scss';

interface VariableSelectorProps {
	variable: VariableFormModel;
	/** Names this variable depends on (for Query gating). */
	parents: string[];
	/** All current selections (Query passes them as the request payload). */
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
}

/** One labelled variable control; dispatches on the variable type. */
function VariableSelector({
	variable,
	parents,
	selections,
	selection,
	onChange,
}: VariableSelectorProps): JSX.Element {
	const customOptions = useMemo(
		() =>
			variable.type === 'CUSTOM'
				? sortValues(commaValuesParser(variable.customValue), variable.sort).map(
						String,
					)
				: [],
		[variable],
	);

	const renderControl = (): JSX.Element => {
		switch (variable.type) {
			case 'TEXT':
				return (
					<TextSelector
						selection={selection}
						onChange={onChange}
						testId={`variable-input-${variable.name}`}
					/>
				);
			case 'QUERY':
				return (
					<QuerySelector
						variable={variable}
						parents={parents}
						selections={selections}
						selection={selection}
						onChange={onChange}
					/>
				);
			case 'DYNAMIC':
				return (
					<DynamicSelector
						variable={variable}
						selection={selection}
						onChange={onChange}
					/>
				);
			case 'CUSTOM':
			default:
				return (
					<ValueSelector
						options={customOptions}
						multiSelect={variable.multiSelect}
						showAllOption={variable.showAllOption}
						selection={selection}
						onChange={onChange}
						testId={`variable-select-${variable.name}`}
					/>
				);
		}
	};

	return (
		<div className={styles.variable} data-testid={`variable-${variable.name}`}>
			<Typography.Text className={styles.label}>${variable.name}</Typography.Text>
			{renderControl()}
		</div>
	);
}

export default VariableSelector;
