import { OPERATORS, QUERY_BUILDER_SEARCH_VALUES } from 'constants/queryBuilder';
import { useMemo } from 'react';

export const useOperatorType = (operator: string): string =>
	useMemo(() => {
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
