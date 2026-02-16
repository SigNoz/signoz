import { useCallback, useMemo, useState } from 'react';
import { isEmpty } from 'lodash-es';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { ALL_SELECT_VALUE } from '../utils';
import { areArraysEqual, getSelectValue } from './util';
import { VariableSelectStrategy } from './variableSelectStrategy/variableSelectStrategyTypes';
import {
	areArraysEqualIgnoreOrder,
	uniqueValues,
} from './variableSelectStrategy/variableSelectStrategyUtils';

interface UseDashboardVariableSelectHelperParams {
	variableData: IDashboardVariable;
	optionsData: (string | number | boolean)[];
	onValueUpdate: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		haveCustomValuesSelected?: boolean,
	) => void;
	strategy: VariableSelectStrategy;
	/** Override for all available option strings (default: optionsData.map(String)) */
	allAvailableOptionStrings?: string[];
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

	// Default value helpers
	applyDefaultIfNeeded: (
		overrideOptions?: (string | number | boolean)[],
	) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function useDashboardVariableSelectHelper({
	variableData,
	optionsData,
	onValueUpdate,
	strategy,
	allAvailableOptionStrings,
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

	const effectiveAllAvailableOptionStrings = useMemo(
		() => allAvailableOptionStrings ?? optionsData.map((v) => v.toString()),
		[allAvailableOptionStrings, optionsData],
	);

	const selectValue =
		variableData.allSelected && enableSelectAll
			? ALL_SELECT_VALUE
			: selectedValueStringified;

	const getDefaultValue = useCallback(
		(overrideOptions?: (string | number | boolean)[]) => {
			const options = overrideOptions || optionsData;
			if (variableData.multiSelect) {
				if (variableData.showALLOption) {
					return variableData.defaultValue || options.map((o) => o.toString());
				}
				return variableData.defaultValue || options?.[0]?.toString();
			}
			return variableData.defaultValue || options[0]?.toString();
		},
		[
			variableData.multiSelect,
			variableData.showALLOption,
			variableData.defaultValue,
			optionsData,
		],
	);

	const defaultValue = useMemo(() => getDefaultValue(), [getDefaultValue]);

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

			strategy.handleChange({
				value,
				variableData,
				optionsData,
				allAvailableOptionStrings: effectiveAllAvailableOptionStrings,
				onValueUpdate,
			});
		},
		[
			variableData,
			optionsData,
			effectiveAllAvailableOptionStrings,
			onValueUpdate,
			strategy,
		],
	);

	const handleTempChange = useCallback(
		(inputValue: string | string[]): void => {
			// Store the selection in temporary state while dropdown is open
			const value = variableData.multiSelect && !inputValue ? [] : inputValue;
			setTempSelection(uniqueValues(value));
		},
		[variableData.multiSelect],
	);

	// Single select onChange: apply default if value is empty
	const handleSingleSelectChange = useCallback(
		(inputValue: string | string[]): void => {
			if (isEmpty(inputValue)) {
				if (defaultValue !== undefined) {
					handleChange(defaultValue as string | string[]);
				}
				return;
			}
			handleChange(inputValue);
		},
		[handleChange, defaultValue],
	);

	// Handle dropdown visibility changes
	const onDropdownVisibleChange = useCallback(
		(visible: boolean): void => {
			// Initialize temp selection when opening dropdown
			if (visible) {
				if (variableData.allSelected && enableSelectAll) {
					// When ALL is selected, show all available options as individually checked
					setTempSelection([...effectiveAllAvailableOptionStrings]);
				} else {
					setTempSelection(getSelectValue(variableData.selectedValue, variableData));
				}
			}
			// Apply changes when closing dropdown
			else if (!visible && tempSelection !== undefined) {
				// If ALL was selected before AND all options remain selected, skip updating
				const wasAllSelected = enableSelectAll && variableData.allSelected;
				const isAllSelectedAfter =
					enableSelectAll &&
					Array.isArray(tempSelection) &&
					tempSelection.length === effectiveAllAvailableOptionStrings.length &&
					effectiveAllAvailableOptionStrings.every((v) => tempSelection.includes(v));

				if (wasAllSelected && isAllSelectedAfter) {
					setTempSelection(undefined);
					return;
				}

				// Apply default if closing with empty selection
				let valueToApply = tempSelection;
				if (isEmpty(tempSelection) && defaultValue !== undefined) {
					valueToApply = defaultValue as string | string[];
				}

				// Order-agnostic change detection
				const currentValue = variableData.selectedValue;
				const hasChanged =
					valueToApply !== currentValue &&
					!(
						Array.isArray(valueToApply) &&
						Array.isArray(currentValue) &&
						areArraysEqualIgnoreOrder(valueToApply, currentValue)
					);

				if (hasChanged) {
					handleChange(valueToApply);
				}
				setTempSelection(undefined);
			}
		},
		[
			variableData,
			enableSelectAll,
			effectiveAllAvailableOptionStrings,
			tempSelection,
			handleChange,
			defaultValue,
		],
	);

	// Explicit function for callers to apply default on mount / data load
	// Pass overrideOptions when freshly-loaded options aren't in state yet (async callers)
	const applyDefaultIfNeeded = useCallback(
		(overrideOptions?: (string | number | boolean)[]): void => {
			if (isEmpty(selectValue)) {
				const defaultValueFromOptions = getDefaultValue(overrideOptions);
				if (defaultValueFromOptions !== undefined) {
					handleChange(defaultValueFromOptions as string | string[]);
				}
			}
		},
		[selectValue, handleChange, getDefaultValue],
	);

	const handleClear = useCallback((): void => {
		handleChange([]);
	}, [handleChange]);

	const value = variableData.multiSelect
		? tempSelection || selectValue
		: selectValue;

	const onChange = useMemo(() => {
		return variableData.multiSelect ? handleTempChange : handleSingleSelectChange;
	}, [variableData.multiSelect, handleTempChange, handleSingleSelectChange]);

	return {
		tempSelection,
		setTempSelection,
		enableSelectAll,
		onDropdownVisibleChange,
		handleClear,
		value,
		defaultValue,
		onChange,
		applyDefaultIfNeeded,
	};
}
