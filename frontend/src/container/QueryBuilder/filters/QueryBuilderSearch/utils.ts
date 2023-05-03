import { OPERATORS } from 'constants/queryBuilder';

export function isValueHaveInNotInOperator(value: string): boolean {
	return value?.includes(OPERATORS.IN || OPERATORS.NIN);
}

export function isExistsNotExistsOperator(value: string): boolean {
	return value?.includes(OPERATORS.EXISTS || OPERATORS.NOT_EXISTS);
}

export function checkCommaAndSpace(value: string): boolean {
	return value.endsWith(',') || value.endsWith(' ');
}

export function isInNInOperator(value: string): boolean {
	return value === OPERATORS.IN || value === OPERATORS.NIN;
}

export function createTagValues(tagValue: string[]): string[] {
	return tagValue
		.join(' ')
		.split(', ')
		.filter(Boolean)
		.map((tag) => (tag.endsWith(',') ? tag.slice(0, -1).trim() : tag.trim()));
}
