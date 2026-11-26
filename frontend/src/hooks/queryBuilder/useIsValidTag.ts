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
