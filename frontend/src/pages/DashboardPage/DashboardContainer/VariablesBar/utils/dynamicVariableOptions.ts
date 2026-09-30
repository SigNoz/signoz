import type { OptionData } from 'components/NewSelect/types';

const toOptions = (values: string[]): OptionData[] =>
	values.map((value) => ({ label: value, value }));

/**
 * Dropdown options for a DYNAMIC variable: values scoped by the other dynamic
 * variables' selections get their own section above the unscoped list. Without
 * related values there is nothing to contrast, so the list stays flat.
 */
export function dynamicVariableOptions(
	values: string[],
	relatedValues: string[],
): OptionData[] {
	if (relatedValues.length === 0) {
		return toOptions(values);
	}

	return [
		{
			label: 'Related Values',
			value: 'relatedValues',
			options: toOptions(relatedValues),
		},
		{ label: 'All Values', value: 'allValues', options: toOptions(values) },
	];
}
