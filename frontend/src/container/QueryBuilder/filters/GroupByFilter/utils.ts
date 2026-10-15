import {
	baseAutoCompleteIdKeysOrder,
	initialAutocompleteData,
} from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { fieldDataTypeToDataType } from 'utils/fieldDataType';

export const toAttributeKey = (
	key: TelemetryFieldKey,
): BaseAutocompleteData => {
	const fields = {
		key: key.name,
		dataType: fieldDataTypeToDataType(key.fieldDataType),
		type: key.fieldContext ?? '',
	};

	return {
		...initialAutocompleteData,
		...fields,
		id: createIdFromObjectFields(fields, baseAutoCompleteIdKeysOrder),
	};
};
