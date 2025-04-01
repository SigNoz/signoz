/* eslint-disable sonarjs/cognitive-complexity */
import { OptionData } from './CustomSelect';

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
	let foundOptions: OptionData[] = [];

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
					foundOptions = extractedOptions;
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

	// Add found & new options to the top
	return [...newOptions, ...foundOptions, ...filteredOptions];
};
