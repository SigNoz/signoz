import { useMemo } from 'react';

import { OperatorType } from './useOperatorType';

export const validationMapper: Record<
	OperatorType,
	(resultLength: number) => boolean
> = {
	SINGLE_VALUE: (resultLength: number) => resultLength === 1,
	MULTIPLY_VALUE: (resultLength: number) => resultLength >= 1,
	NON_VALUE: (resultLength: number) => resultLength === 0,
	NOT_VALID: () => false,
};

export const useIsValidTag = (
	operatorType: OperatorType,
	resultLength: number,
): boolean =>
	useMemo(() => validationMapper[operatorType]?.(resultLength), [
		operatorType,
		resultLength,
	]);
