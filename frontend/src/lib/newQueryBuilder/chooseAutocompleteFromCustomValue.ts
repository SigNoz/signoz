import { initialAutocompleteData } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const chooseAutocompleteFromCustomValue = (
	sourceList: BaseAutocompleteData[],
	values: string[],
): BaseAutocompleteData[] => {
	console.log({ sourceList });
	return values.map((value) => {
		const firstBaseAutoCompleteValue = sourceList.find(
			(sourceAutoComplete) => value === sourceAutoComplete.key,
		);

		if (!firstBaseAutoCompleteValue)
			return { ...initialAutocompleteData, key: value };

		return firstBaseAutoCompleteValue;
	});
};
