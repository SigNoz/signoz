import {
	idDivider,
	initialAutocompleteData,
	selectValueDivider,
} from 'constants/queryBuilder';
import { isEqual, uniqWith } from 'lodash-es';
import {
	AutocompleteType,
	BaseAutocompleteData,
	DataType,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SelectOption } from 'types/common/select';

export const transformGroupByFilterValues = (
	values: SelectOption<string, string>[],
): BaseAutocompleteData[] => {
	const groupByValues: BaseAutocompleteData[] = values.map((item) => {
		const [currentValue, id] = item.value.split(selectValueDivider);
		if (id && id.includes(idDivider)) {
			const [key, dataType, type, isColumn] = id.split(idDivider);

			return {
				id,
				key,
				dataType: dataType as DataType,
				type: type as AutocompleteType,
				isColumn: isColumn === 'true',
			};
		}

		return { ...initialAutocompleteData, key: currentValue };
	});

	return uniqWith(groupByValues, isEqual);
};
