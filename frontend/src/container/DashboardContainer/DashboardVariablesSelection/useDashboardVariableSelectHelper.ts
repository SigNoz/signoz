import { useCallback, useEffect, useMemo, useState } from 'react';
import { isEmpty } from 'lodash-es';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { areArraysEqual, getSelectValue } from './util';

interface UseDashboardVariableSelectHelperParams {
	variableData: IDashboardVariable;
	optionsData: (string | number | boolean)[];
	onValueUpdate: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
}

interface UseDashboardVariableSelectHelperReturn {
	// State
	tempSelection: string | string[] | undefined;
	setTempSelection: React.Dispatch<
		React.SetStateAction<string | string[] | undefined>
	>;
	value: string | string[] | undefined;
	defaultValue: string | string[] | undefined;

	// Derived values
	enableSelectAll: boolean;

	// Handlers
	onChange: (value: string | string[]) => void;
	onDropdownVisibleChange: (visible: boolean) => void;
	handleClear: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function useDashboardVariableSelectHelper({
	variableData,
	optionsData,
	onValueUpdate,
}: UseDashboardVariableSelectHelperParams): UseDashboardVariableSelectHelperReturn {
	const { selectedValue } = variableData;

	const [tempSelection, setTempSelection] = useState<
		string | string[] | undefined
	>(undefined);

	const selectedValueStringified = useMemo(
		() => getSelectValue(selectedValue, variableData),
		[selectedValue, variableData],
	);

	const enableSelectAll = variableData.multiSelect && variableData.showALLOption;

	const selectValue =
		variableData.allSelected && enableSelectAll
			? 'ALL'
			: selectedValueStringified;

	const handleChange = useCallback(
		(inputValue: string | string[]): void => {
			const value = variableData.multiSelect && !inputValue ? [] : inputValue;

			if (
				value === variableData.selectedValue ||
				(Array.isArray(value) &&
					Array.isArray(variableData.selectedValue) &&
					areArraysEqual(value, variableData.selectedValue))
			) {
				return;
			}
			if (variableData.name) {
				// Check if ALL is effectively selected by comparing with available options
				const isAllSelected =
					Array.isArray(value) &&
					value.length > 0 &&
					optionsData.every((option) => value.includes(option.toString()));

				if (isAllSelected && variableData.showALLOption) {
					// For ALL selection, pass optionsData as the value and set allSelected to true
					onValueUpdate(variableData.name, variableData.id, optionsData, true);
				} else {
					onValueUpdate(variableData.name, variableData.id, value, false);
				}
			}
		},
		[
			variableData.multiSelect,
			variableData.selectedValue,
			variableData.name,
			variableData.id,
			variableData.showALLOption,
			onValueUpdate,
			optionsData,
		],
	);

	const handleTempChange = useCallback(
		(inputValue: string | string[]): void => {
			// Store the selection in temporary state while dropdown is open
			const value = variableData.multiSelect && !inputValue ? [] : inputValue;
			setTempSelection(value);
		},
		[variableData.multiSelect],
	);

	// Apply default value on first render if no selection exists
	const finalSelectedValues = useMemo(() => {
		if (variableData.multiSelect) {
			let value = tempSelection || selectedValue;
			if (isEmpty(value)) {
				if (variableData.showALLOption) {
					if (variableData.defaultValue) {
						value = variableData.defaultValue;
					} else {
						value = optionsData;
					}
				} else if (variableData.defaultValue) {
					value = variableData.defaultValue;
				} else {
					value = optionsData?.[0];
				}
			}

			return value;
		}
		if (isEmpty(selectedValue)) {
			if (variableData.defaultValue) {
				return variableData.defaultValue;
			}
			return optionsData[0]?.toString();
		}

		return selectedValue;
	}, [
		variableData.multiSelect,
		variableData.showALLOption,
		variableData.defaultValue,
		selectedValue,
		tempSelection,
		optionsData,
	]);

	// Apply default values when needed
	useEffect(() => {
		if (
			(variableData.multiSelect && !(tempSelection || selectValue)) ||
			isEmpty(selectValue)
		) {
			handleChange(finalSelectedValues as string[] | string);
		}
	}, [
		finalSelectedValues,
		handleChange,
		selectValue,
		tempSelection,
		variableData.multiSelect,
	]);

	// Handle dropdown visibility changes
	const onDropdownVisibleChange = useCallback(
		(visible: boolean): void => {
			// Initialize temp selection when opening dropdown
			if (visible) {
				setTempSelection(getSelectValue(variableData.selectedValue, variableData));
			}
			// Apply changes when closing dropdown
			else if (!visible && tempSelection !== undefined) {
				// Call handleChange with the temporarily stored selection
				handleChange(tempSelection);
				setTempSelection(undefined);
			}
		},
		[variableData, tempSelection, handleChange],
	);

	const handleClear = useCallback((): void => {
		handleChange([]);
	}, [handleChange]);

	const value = variableData.multiSelect
		? tempSelection || selectValue
		: selectValue;

	const defaultValue = variableData.defaultValue || selectValue;

	const onChange = useMemo(() => {
		return variableData.multiSelect ? handleTempChange : handleChange;
	}, [variableData.multiSelect, handleTempChange, handleChange]);

	return {
		tempSelection,
		setTempSelection,
		enableSelectAll,
		onDropdownVisibleChange,
		handleClear,
		value,
		defaultValue,
		onChange,
	};
}
