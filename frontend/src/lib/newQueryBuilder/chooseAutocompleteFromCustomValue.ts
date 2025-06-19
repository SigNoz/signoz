import { initialAutocompleteData } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

const getDataTypeForCustomValue = (dataType?: string): DataTypes => {
	if (dataType === 'number') {
		return DataTypes.Float64;
	}

	if (dataType === 'string') {
		return DataTypes.String;
	}

	if (dataType === 'bool') {
		return DataTypes.bool;
	}

	return (dataType as DataTypes) || DataTypes.EMPTY;
};

export const chooseAutocompleteFromCustomValue = (
	sourceList: BaseAutocompleteData[],
	value: string,
	isJSON?: boolean,
	dataType?: DataTypes | 'number',
): BaseAutocompleteData => {
	const dataTypeToUse = getDataTypeForCustomValue(dataType);
	const firstBaseAutoCompleteValue = sourceList.find(
		(sourceAutoComplete) =>
			value === sourceAutoComplete.key &&
			(dataType === undefined || dataTypeToUse === sourceAutoComplete.dataType),
	);

	if (!firstBaseAutoCompleteValue) {
		return {
			...initialAutocompleteData,
			key: value,
			dataType: dataTypeToUse,
			isJSON,
		};
	}

	return firstBaseAutoCompleteValue;
};
