import { OPERATORS } from 'constants/queryBuilder';

export function isInNotInOperator(value: string): boolean {
	return value?.includes(OPERATORS.IN || OPERATORS.NIN);
}

export function isExistsNotExistsOperator(value: string): boolean {
	return value?.includes(OPERATORS.EXISTS || OPERATORS.NOT_EXISTS);
}
