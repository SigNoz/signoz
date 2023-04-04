import { QUERY_BUILDER_SEARCH_VALUES } from 'constants/queryBuilder';
import { useMemo } from 'react';

import { checkStringEndWIthSpace } from '../../utils/checkStringEndWIthSpace';
import { useIsValidTag } from './useIsValidTag';
import { useOperatorType } from './useOperatorType';

type HookReturnValues = {
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
): HookReturnValues => {
	const operatorType = useOperatorType(operator);

	const isValidTag = useIsValidTag(operatorType, result.length);

	const { isExist, isValidOperator, isMulti, isFreeText } = useMemo(
		() => ({
			isExist: operatorType === QUERY_BUILDER_SEARCH_VALUES.NON,
			isValidOperator: operatorType !== QUERY_BUILDER_SEARCH_VALUES.NOT_VALID,
			isMulti: operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY,
			isFreeText: operator === '' && !checkStringEndWIthSpace(value),
		}),
		[operator, operatorType, value],
	);

	return { isValidTag, isExist, isValidOperator, isMulti, isFreeText };
};
