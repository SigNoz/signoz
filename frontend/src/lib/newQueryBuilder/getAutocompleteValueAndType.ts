import { autocompleteType } from 'constants/queryBuilder';
import { SPLIT_FIRST_UNDERSCORE } from 'constants/regExp';

export const getAutocompleteValueAndType = (str: string): [string, string] => {
	const [firstValue, secondValue] = str.split(SPLIT_FIRST_UNDERSCORE);

	if (
		firstValue === autocompleteType.tag ||
		firstValue === autocompleteType.resource
	) {
		return [firstValue, secondValue];
	}

	return [str, str];
};
