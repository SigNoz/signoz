import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import {
	signalForApi,
	sortValuesByOrder,
} from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableFormModel } from '../../DashboardSettings/Variables/variableFormModel';
import { buildExistingDynamicVariableQuery } from '../dynamicFilter';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../selectionTypes';
import { useAutoSelect } from '../useAutoSelect';
import ValueSelector from './ValueSelector';

interface DynamicSelectorProps {
	variable: VariableFormModel;
	/** All variables + current selections, to scope options by sibling dynamics. */
	variables: VariableFormModel[];
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
}

/**
 * Dynamic-variable options sourced from live telemetry field values for the
 * chosen signal + attribute, scoped by the other dynamic variables' selections
 * (so e.g. `pod` narrows to the chosen `namespace`).
 */
function DynamicSelector({
	variable,
	variables,
	selections,
	selection,
	onChange,
}: DynamicSelectorProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const existingQuery = useMemo(
		() => buildExistingDynamicVariableQuery(variables, selections, variable.name),
		[variables, selections, variable.name],
	);

	const { data, isFetching } = useGetFieldValues({
		signal: signalForApi(variable.dynamicSignal),
		name: variable.dynamicAttribute,
		startUnixMilli: minTime,
		endUnixMilli: maxTime,
		existingQuery: existingQuery || undefined,
		enabled: !!variable.dynamicAttribute,
	});

	const options = useMemo(() => {
		const payload = data?.data;
		const values =
			payload?.normalizedValues ?? payload?.values?.StringValues ?? [];
		return sortValuesByOrder(values, variable.sort).map(String);
	}, [data, variable.sort]);

	useAutoSelect(variable, options, selection, onChange);

	return (
		<ValueSelector
			options={options}
			multiSelect={variable.multiSelect}
			showAllOption={variable.showAllOption}
			loading={isFetching}
			selection={selection}
			onChange={onChange}
			testId={`variable-select-${variable.name}`}
		/>
	);
}

export default DynamicSelector;
