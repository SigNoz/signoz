import { initialAutocompleteData } from 'constants/queryBuilder';
import { DataTypes } from 'container/LogDetailedView/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const chooseAutocompleteFromCustomValue = (
	sourceList: BaseAutocompleteData[],
	value: string,
	isJSON?: boolean,
	dataType?: DataTypes,
): BaseAutocompleteData => {
	const firstBaseAutoCompleteValue = sourceList.find(
		(sourceAutoComplete) => value === sourceAutoComplete.key,
	);

	if (!firstBaseAutoCompleteValue) {
		return {
			...initialAutocompleteData,
			key: value,
			dataType: dataType || '',
			isJSON,
		};
	}

	return firstBaseAutoCompleteValue;
};
