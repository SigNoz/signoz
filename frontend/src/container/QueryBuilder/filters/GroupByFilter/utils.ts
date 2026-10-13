import {
	baseAutoCompleteIdKeysOrder,
	initialAutocompleteData,
} from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

// A pick is stored as typed, context prefix included, with no type or data type;
// the backend splits the prefix out of the name.
export const getGroupByData = (key: string): BaseAutocompleteData => {
	const fields = { key, dataType: initialAutocompleteData.dataType, type: '' };

	return {
		...initialAutocompleteData,
		...fields,
		id: createIdFromObjectFields(fields, baseAutoCompleteIdKeysOrder),
	};
};
