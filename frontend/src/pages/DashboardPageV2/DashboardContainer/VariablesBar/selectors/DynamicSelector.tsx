import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import sortValues from 'lib/dashboardVariables/sortVariableValues';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

import type { VariableFormModel } from '../../DashboardSettings/Variables/variableModel';
import type { VariableSelection } from '../selectionTypes';
import { useAutoSelect } from '../useAutoSelect';
import ValueSelector from './ValueSelector';

interface DynamicSelectorProps {
	variable: VariableFormModel;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
}

/**
 * Dynamic-variable options sourced from live telemetry field values for the
 * chosen signal + attribute. (Sibling-dynamic filtering is a later refinement.)
 */
function DynamicSelector({
	variable,
	selection,
	onChange,
}: DynamicSelectorProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isFetching } = useGetFieldValues({
		signal: variable.dynamicSignal,
		name: variable.dynamicAttribute,
		startUnixMilli: minTime,
		endUnixMilli: maxTime,
		enabled: !!variable.dynamicAttribute,
	});

	const options = useMemo(() => {
		const payload = data?.data;
		const values =
			payload?.normalizedValues ?? payload?.values?.StringValues ?? [];
		return sortValues(values, variable.sort).map(String);
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
