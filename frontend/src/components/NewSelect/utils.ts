/* eslint-disable sonarjs/cognitive-complexity */
import { uniqueOptions } from 'container/NewDashboard/DashboardVariablesSelection/util';

import { OptionData } from './types';

export const SPACEKEY = ' ';

export const ALL_SELECTED_VALUE = '__ALL__'; // Constant for the special value

export const prioritizeOrAddOptionForSingleSelect = (
	options: OptionData[],
	value: string,
	label?: string,
): OptionData[] => {
	let foundOption: OptionData | null = null;

	// Separate the found option and the rest
	const filteredOptions = options
		.map((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				// Filter out the value from nested options
				const remainingSubOptions = option.options.filter(
					(subOption) => subOption.value !== value,
				);
				const extractedOption = option.options.find(
					(subOption) => subOption.value === value,
				);

				if (extractedOption) foundOption = extractedOption;

				// Keep the group if it still has remaining options
				return remainingSubOptions.length > 0
					? { ...option, options: remainingSubOptions }
					: null;
			}

			// Check top-level options
			if (option.value === value) {
				foundOption = option;
				return null; // Remove it from the list
			}

			return option;
		})
		.filter(Boolean) as OptionData[]; // Remove null values

	// If not found, create a new option
	if (!foundOption) {
		foundOption = { value, label: label ?? value };
	}

	// Add the found/new option at the top
	return [foundOption, ...filteredOptions];
};

export const prioritizeOrAddOptionForMultiSelect = (
	options: OptionData[],
	values: string[], // Only supports multiple values (string[])
	labels?: Record<string, string>,
): OptionData[] => {
	const foundOptions: OptionData[] = [];

	// Separate the found options and the rest
	const filteredOptions = options
		.map((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				// Filter out selected values from nested options
				const remainingSubOptions = option.options.filter(
					(subOption) => subOption.value && !values.includes(subOption.value),
				);
				const extractedOptions = option.options.filter(
					(subOption) => subOption.value && values.includes(subOption.value),
				);

				if (extractedOptions.length > 0) {
					foundOptions.push(...extractedOptions);
				}

				// Keep the group if it still has remaining options
				return remainingSubOptions.length > 0
					? { ...option, options: remainingSubOptions }
					: null;
			}

			// Check top-level options
			if (option.value && values.includes(option.value)) {
				foundOptions.push(option);
				return null; // Remove it from the list
			}

			return option;
		})
		.filter(Boolean) as OptionData[]; // Remove null values

	// Find missing values that were not present in the original options and create new ones
	const missingValues = values.filter(
		(value) => !foundOptions.some((opt) => opt.value === value),
	);

	const newOptions = missingValues.map((value) => ({
		value,
		label: labels?.[value] ?? value, // Use provided label or default to value
	}));

	const flatOutSelectedOptions = uniqueOptions([...newOptions, ...foundOptions]);

	// Add found & new options to the top
	return [...flatOutSelectedOptions, ...filteredOptions];
};

/**
 * Filters options based on search text
 */
export const filterOptionsBySearch = (
	options: OptionData[],
	searchText: string,
): OptionData[] => {
	if (!searchText.trim()) return options;

	const lowerSearchText = searchText.toLowerCase();

	return options
		.map((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				// Filter nested options
				const filteredSubOptions = option.options.filter((subOption) =>
					subOption.label.toLowerCase().includes(lowerSearchText),
				);

				return filteredSubOptions.length > 0
					? { ...option, options: filteredSubOptions }
					: undefined;
			}

			// Filter top-level options
			return option.label.toLowerCase().includes(lowerSearchText)
				? option
				: undefined;
		})
		.filter(Boolean) as OptionData[];
};

/**
 * Utility function to handle dropdown scroll and detect when scrolled to bottom
 * Returns true when scrolled to within 20px of the bottom
 */
export const handleScrollToBottom = (
	e: React.UIEvent<HTMLDivElement>,
): boolean => {
	const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
	// Consider "scrolled to bottom" when within 20px of the bottom or at the bottom
	return scrollHeight - scrollTop - clientHeight < 20;
};
