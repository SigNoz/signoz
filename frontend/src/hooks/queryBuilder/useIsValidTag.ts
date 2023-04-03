import { useMemo } from 'react';

import { QUERY_BUILDER_SEARCH_VALUES } from '../../constants/queryBuilder';

export const useIsValidTag = (
	operatorType: string,
	resultLength: number,
): boolean =>
	useMemo(() => {
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.SINGLE) {
			return resultLength === 1;
		}
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.MULTIPLY) {
			return resultLength >= 1;
		}
		if (operatorType === QUERY_BUILDER_SEARCH_VALUES.NON) {
			return resultLength === 0;
		}
		return false;
	}, [operatorType, resultLength]);
