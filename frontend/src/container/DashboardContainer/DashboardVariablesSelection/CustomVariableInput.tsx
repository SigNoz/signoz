import { memo, useEffect, useMemo } from 'react';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';
import sortValues from 'lib/dashboardVariables/sortVariableValues';

import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import { VariableItemProps } from './VariableItem';
import { customVariableSelectStrategy } from './variableSelectStrategy/customVariableSelectStrategy';

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
		applyDefaultIfNeeded,
	} = useDashboardVariableSelectHelper({
		variableData,
		optionsData,
		onValueUpdate,
		strategy: customVariableSelectStrategy,
	});

	// Apply default on mount — options are available synchronously for custom variables
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(applyDefaultIfNeeded, []);

	const selectOptions = useMemo(
		() =>
			optionsData.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		[optionsData],
	);

	return (
		<SelectVariableInput
			variableId={variableData.id}
			options={selectOptions}
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
