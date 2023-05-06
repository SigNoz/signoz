import { OPERATORS } from 'constants/queryBuilder';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Papa from 'papaparse';

export const TAG_FSM = /(\w+(?:\.\w+)*)\s*(!=|=|<|<=|>|>=|IN|NOT_IN|LIKE|NOT_LIKE|EXISTS|NOT_EXISTS|CONTAINS|NOT_CONTAINS)\s*([\s\S]*)/g;

export function isInNInOperator(value: string): boolean {
	return value === OPERATORS.IN || value === OPERATORS.NIN;
}

export function isExistsNotExistsOperator(value: string): boolean {
	return value?.includes(OPERATORS.EXISTS || OPERATORS.NOT_EXISTS);
}

export function checkCommaAndSpace(value: string): boolean {
	return value.endsWith(',') || value.endsWith(' ');
}

interface ITagToken {
	tagKey: string;
	tagOperator: string;
	tagValue: string[];
}

export function getTagToken(tag: string): ITagToken {
	const matches = tag?.matchAll(TAG_FSM);
	const [match] = matches ? Array.from(matches) : [];

	if (match) {
		const [, matchTagKey, matchTagOperator, matchTagValue] = match;
		return {
			tagKey: matchTagKey,
			tagOperator: matchTagOperator,
			tagValue: isInNInOperator(matchTagOperator)
				? Papa.parse(matchTagValue).data.flat()
				: matchTagValue,
		} as ITagToken;
	}

	return {
		tagKey: tag,
		tagOperator: '',
		tagValue: [],
	};
}

export function getRemovePrefixFromKey(tag: string): string {
	return tag?.replace(/^(tag_|resource_)/, '');
}

export function getOperatorValue(op: string): string {
	switch (op) {
		case 'IN':
			return 'in';
		case 'NOT_IN':
			return 'nin';
		case 'LIKE':
			return 'like';
		case 'NOT_LIKE':
			return 'nlike';
		case 'EXISTS':
			return 'exists';
		case 'NOT_EXISTS':
			return 'nexists';
		case 'CONTAINS':
			return 'contains';
		case 'NOT_CONTAINS':
			return 'ncontains';
		default:
			return op;
	}
}

export function getOperatorFromValue(op: string): string {
	switch (op) {
		case 'in':
			return 'IN';
		case 'nin':
			return 'NOT_IN';
		case 'like':
			return 'LIKE';
		case 'nlike':
			return 'NOT_LIKE';
		case 'exists':
			return 'EXISTS';
		case 'nexists':
			return 'NOT_EXISTS';
		case 'contains':
			return 'CONTAINS';
		case 'ncontains':
			return 'NOT_CONTAINS';
		default:
			return op;
	}
}

export function replaceStringWithMaxLength(
	mainString: string,
	array: string[],
	replacementString: string,
): string {
	const lastSearchValue = array.pop() ?? ''; // Remove the last search value from the array
	if (lastSearchValue === '') return `${mainString}${replacementString},`; // if user select direclty from options
	return mainString.replace(lastSearchValue, `${replacementString},`);
}
