import { TYPE_ADDON_REGEXP } from 'constants/regExp';
import {
	AutocompleteType,
	BaseAutocompleteData,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

const isTypeExist = (str: string): boolean => {
	const types: AutocompleteType[] = ['tag', 'resource'];
	let isExist = false;
	types.forEach((type) => {
		if (str.includes(type)) {
			isExist = true;
		}
	});

	return isExist;
};

export const getFilterObjectValue = (
	value: string,
): Omit<BaseAutocompleteData, 'dataType' | 'type'> => {
	const isExist = isTypeExist(value);

	if (!isExist) {
		return { isColumn: true, key: value };
	}

	const splittedValue = value.split(TYPE_ADDON_REGEXP);

	return { isColumn: false, key: splittedValue[1] };
};
