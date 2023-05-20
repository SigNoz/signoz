import { operatorsByTypes } from 'constants/queryBuilder';
import { LocalDataType } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const findDataTypeOfOperator = (value: string): LocalDataType | null => {
	const entries = Object.entries(operatorsByTypes) as [
		LocalDataType,
		string[],
	][];

	for (let i = 0; i < entries.length; i += 1) {
		for (let j = 0; j < entries[i][1].length; j += 1) {
			const currentOperator = entries[i][1][j];
			const type = entries[i][0];

			if (currentOperator === value) {
				return type;
			}
		}
	}

	return null;
};
