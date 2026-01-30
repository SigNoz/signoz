import {
	baseAutoCompleteIdKeysOrder,
	initialAutocompleteData,
} from 'constants/queryBuilder';
import { MetricsType } from 'container/MetricsApplication/constant';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
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
		const baseFieldsForId = {
			key: value,
			dataType: dataTypeToUse,
			type: fieldType || '',
		};

		return {
			...initialAutocompleteData,
			...baseFieldsForId,
			id: createIdFromObjectFields(baseFieldsForId, baseAutoCompleteIdKeysOrder),
		};
	}

	return firstBaseAutoCompleteValue;
};
