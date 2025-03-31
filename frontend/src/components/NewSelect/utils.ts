import { OptionData } from './CustomSelect';

export const prioritizeOrAddOption = (
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
