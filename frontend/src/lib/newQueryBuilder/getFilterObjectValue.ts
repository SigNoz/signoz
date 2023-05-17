import { TYPE_ADDON_REGEXP } from 'constants/regExp';
import {
	AutocompleteType,
	BaseAutocompleteData,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

const getType = (str: string): AutocompleteType | null => {
	const types: AutocompleteType[] = ['tag', 'resource'];

	let currentType: AutocompleteType | null = null;

	types.forEach((type) => {
		if (str.includes(type)) {
			currentType = type;
		}
	});

	return currentType;
};

export const getFilterObjectValue = (
	value: string,
): Omit<BaseAutocompleteData, 'dataType' | 'id'> => {
	const type = getType(value);

	if (!type) {
		return { isColumn: true, key: value, type: null };
	}

	const splittedValue = value.split(TYPE_ADDON_REGEXP);

	return { isColumn: false, key: splittedValue[1], type };
};
