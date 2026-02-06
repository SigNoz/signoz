import { memo, useMemo } from 'react';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';

import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import { VariableItemProps } from './VariableItem';

type CustomVariableInputProps = Pick<
	VariableItemProps,
	'variableData' | 'onValueUpdate'
>;

function CustomVariableInput({
	variableData,
	onValueUpdate,
}: CustomVariableInputProps): JSX.Element {
	const optionsData: (string | number | boolean)[] = useMemo(() => {
		return sortValues(
			commaValuesParser(variableData.customValue || ''),
			variableData.sort,
		) as (string | number | boolean)[];
	}, [variableData.customValue, variableData.sort]);

	const {
		value,
		defaultValue,
		enableSelectAll,
		onChange,
		onDropdownVisibleChange,
		handleClear,
	} = useDashboardVariableSelectHelper({
		variableData,
		optionsData,
		onValueUpdate,
	});

	return (
		<SelectVariableInput
			variableId={variableData.id}
			options={optionsData}
			value={value}
			onChange={onChange}
			onDropdownVisibleChange={onDropdownVisibleChange}
			onClear={handleClear}
			enableSelectAll={enableSelectAll}
			defaultValue={defaultValue}
			isMultiSelect={variableData.multiSelect}
		/>
	);
}

export default memo(CustomVariableInput);
