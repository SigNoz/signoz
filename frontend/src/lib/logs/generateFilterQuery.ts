import { QueryOperatorsMultiVal } from 'lib/logql/tokens';

type Keys = keyof typeof QueryOperatorsMultiVal;
type Values = typeof QueryOperatorsMultiVal[Keys];

interface GenerateFilterQueryParams {
	fieldKey: string;
	fieldValue: string;
	type: Values;
}
export const generateFilterQuery = ({
	fieldKey,
	fieldValue,
	type,
}: GenerateFilterQueryParams): string => {
	let generatedQueryString = `${fieldKey} ${type} `;
	if (typeof fieldValue === 'number') {
		generatedQueryString += `(${fieldValue})`;
	} else {
		generatedQueryString += `('${fieldValue}')`;
	}

	return generatedQueryString;
};
