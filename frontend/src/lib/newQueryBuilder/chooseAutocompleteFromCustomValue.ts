import { initialAutocompleteData } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const chooseAutocompleteFromCustomValue = (
	sourceList: BaseAutocompleteData[],
	value: string,
): BaseAutocompleteData => {
	const firstBaseAutoCompleteValue = sourceList.find(
		(sourceAutoComplete) => value === sourceAutoComplete.key,
	);

	if (!firstBaseAutoCompleteValue)
		return { ...initialAutocompleteData, key: value };

	return firstBaseAutoCompleteValue;
};
