import { OPERATORS } from 'constants/queryBuilder';

export type OperatorType =
	| 'SINGLE_VALUE'
	| 'MULTIPLY_VALUE'
	| 'NON_VALUE'
	| 'NOT_VALID';

const operatorTypeMapper: Record<string, OperatorType> = {
	[OPERATORS.IN]: 'MULTIPLY_VALUE',
	[OPERATORS.NIN]: 'MULTIPLY_VALUE',
	[OPERATORS.EXISTS]: 'NON_VALUE',
	[OPERATORS.NOT_EXISTS]: 'NON_VALUE',
	[OPERATORS['<=']]: 'SINGLE_VALUE',
	[OPERATORS['<']]: 'SINGLE_VALUE',
	[OPERATORS['>=']]: 'SINGLE_VALUE',
	[OPERATORS['>']]: 'SINGLE_VALUE',
	[OPERATORS.LIKE]: 'SINGLE_VALUE',
	[OPERATORS.NLIKE]: 'SINGLE_VALUE',
	[OPERATORS.CONTAINS]: 'SINGLE_VALUE',
	[OPERATORS.NOT_CONTAINS]: 'SINGLE_VALUE',
	[OPERATORS['=']]: 'SINGLE_VALUE',
	[OPERATORS['!=']]: 'SINGLE_VALUE',
};

export const useOperatorType = (operator: string): OperatorType =>
	operatorTypeMapper[operator] || 'NOT_VALID';
