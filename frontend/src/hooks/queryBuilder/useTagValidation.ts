import { OPERATORS, QUERY_BUILDER_SEARCH_VALUES } from 'constants/queryBuilder';
import { useMemo } from 'react';

type ReturnT = {
	isValidTag: boolean;
	isExist: boolean;
	isValidOperator: boolean;
};

export const useTagValidation = (
	operator: string,
	result: string[],
): ReturnT => {
	const operatorType = useMemo(() => {
		switch (operator) {
			case OPERATORS.IN:
			case OPERATORS.NIN:
				return QUERY_BUILDER_SEARCH_VALUES.MULTIPLY;
			case OPERATORS.EXISTS:
			case OPERATORS.NOT_EXISTS:
				return QUERY_BUILDER_SEARCH_VALUES.NON;
			case OPERATORS.LTE:
			case OPERATORS.LT:
			case OPERATORS.GTE:
			case OPERATORS.GT:
			case OPERATORS.LIKE:
			case OPERATORS.NLIKE:
			case OPERATORS.CONTAINS:
			case OPERATORS.NOT_CONTAINS:
			case OPERATORS.EQUALS:
			case OPERATORS.NOT_EQUALS:
				return QUERY_BUILDER_SEARCH_VALUES.SINGLE;
			default:
				return QUERY_BUILDER_SEARCH_VALUES.NOT_VALID;
		}
	}, [operator]);

	const isValidTag = useMemo(() => {
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.SINGLE) {
			return result.length === 1;
		}
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY) {
			return result.length >= 1;
		}
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.NON) {
			return result.length === 0;
		}
		return false;
	}, [operatorType, result.length]);

	const { isExist, isValidOperator } = useMemo(
		() => ({
			isExist: operatorType === QUERY_BUILDER_SEARCH_VALUES.NON,
			isValidOperator: operatorType !== QUERY_BUILDER_SEARCH_VALUES.NOT_VALID,
		}),
		[operatorType],
	);

	return { isValidTag, isExist, isValidOperator };
};
