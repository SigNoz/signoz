import { initialAutocompleteData } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

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
			dataType: dataType || DataTypes.EMPTY,
			isJSON,
		};
	}

	return firstBaseAutoCompleteValue;
};
