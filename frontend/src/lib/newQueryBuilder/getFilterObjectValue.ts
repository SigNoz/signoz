import { TYPE_ADDON_REGEXP } from 'constants/regExp';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getFilterObjectValue = (
	value: string,
): Omit<BaseAutocompleteData, 'dataType'> => {
	const splittedValue = value.split(TYPE_ADDON_REGEXP);
	const currentValue = splittedValue[1] || splittedValue[0];
	const isColumn = !splittedValue[1];
	const type: BaseAutocompleteData['type'] = splittedValue[1]
		? (splittedValue[0] as BaseAutocompleteData['type'])
		: null;

	return { type, isColumn, key: currentValue };
};
