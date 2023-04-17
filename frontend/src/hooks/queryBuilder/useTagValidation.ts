import { QUERY_BUILDER_SEARCH_VALUES } from 'constants/queryBuilder';
import { useMemo } from 'react';
import { checkStringEndsWithSpace } from 'utils/checkStringEndsWithSpace';

import { useIsValidTag } from './useIsValidTag';
import { useOperatorType } from './useOperatorType';

type ITagValidation = {
	isValidTag: boolean;
	isExist: boolean;
	isValidOperator: boolean;
	isMulti: boolean;
	isFreeText: boolean;
};

export const useTagValidation = (
	value: string,
	operator: string,
	result: string[],
): ITagValidation => {
	const operatorType = useOperatorType(operator);
	const isValidTag = useIsValidTag(operatorType, result.length);

	const { isExist, isValidOperator, isMulti, isFreeText } = useMemo(() => {
		const isExist = operatorType === QUERY_BUILDER_SEARCH_VALUES.NON;
		const isValidOperator =
			operatorType !== QUERY_BUILDER_SEARCH_VALUES.NOT_VALID;
		const isMulti = operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY;
		const isFreeText = operator === '' && !checkStringEndsWithSpace(value);

		return { isExist, isValidOperator, isMulti, isFreeText };
	}, [operator, operatorType, value]);

	return { isValidTag, isExist, isValidOperator, isMulti, isFreeText };
};
