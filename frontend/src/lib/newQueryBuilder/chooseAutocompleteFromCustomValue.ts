import { initialAutocompleteData } from 'constants/queryBuilder';
import { MetricsType } from 'container/MetricsApplication/constant';
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
	fieldType?: MetricsType | undefined,
): BaseAutocompleteData => {
	const dataTypeToUse = getDataTypeForCustomValue(dataType);
	const firstBaseAutoCompleteValue = sourceList.find(
		(sourceAutoComplete) =>
			value === sourceAutoComplete.key &&
			(dataType === undefined || dataTypeToUse === sourceAutoComplete.dataType) &&
			((fieldType === undefined && sourceAutoComplete.type === '') ||
				(fieldType !== undefined && fieldType === sourceAutoComplete.type)),
	);

	if (!firstBaseAutoCompleteValue) {
		return {
			...initialAutocompleteData,
			key: value,
			dataType: dataTypeToUse,
			type: fieldType || '',
			isJSON,
		};
	}

	return firstBaseAutoCompleteValue;
};
