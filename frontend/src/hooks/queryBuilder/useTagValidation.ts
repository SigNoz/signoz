import { QUERY_BUILDER_SEARCH_VALUES } from 'constants/queryBuilder';

import { useIsValidTag } from './useIsValidTag';
import { useOperatorType } from './useOperatorType';

type ITagValidation = {
	isValidTag: boolean;
	isExist: boolean;
	isValidOperator: boolean;
	isMulti: boolean;
};

export const useTagValidation = (
	operator: string,
	result: string[],
): ITagValidation => {
	const operatorType = useOperatorType(operator);
	const resultLength =
		operatorType === 'SINGLE_VALUE' ? [result]?.length : result?.length;
	const isValidTag = useIsValidTag(operatorType, resultLength);

	const isExist = operatorType === QUERY_BUILDER_SEARCH_VALUES.NON;
	const isValidOperator = operatorType !== QUERY_BUILDER_SEARCH_VALUES.NOT_VALID;
	const isMulti = operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY;

	return { isValidTag, isExist, isValidOperator, isMulti };
};
