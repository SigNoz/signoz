import { OPERATORS } from 'constants/queryBuilder';
import { parse } from 'papaparse';

import { orderByValueDelimiter } from '../OrderByFilter/utils';

// eslint-disable-next-line no-useless-escape
export const tagRegexp = /^\s*(.*?)\s*(IN|NOT_IN|LIKE|NOT_LIKE|REGEX|NOT_REGEX|=|!=|EXISTS|NOT_EXISTS|CONTAINS|NOT_CONTAINS|>=|>|<=|<|HAS|NHAS)\s*(.*)$/g;

export function isInNInOperator(value: string): boolean {
	return value === OPERATORS.IN || value === OPERATORS.NIN;
}

interface ITagToken {
	tagKey: string;
	tagOperator: string;
	tagValue: string[];
}

export function getTagToken(tag: string): ITagToken {
	const matches = tag?.matchAll(tagRegexp);
	const [match] = matches ? Array.from(matches) : [];

	if (match) {
		const [, matchTagKey, matchTagOperator, matchTagValue] = match;
		return {
			tagKey: matchTagKey,
			tagOperator: matchTagOperator,
			tagValue: isInNInOperator(matchTagOperator)
				? parse(matchTagValue).data.flat()
				: matchTagValue,
		} as ITagToken;
	}

	return {
		tagKey: tag,
		tagOperator: '',
		tagValue: [],
	};
}

export function isExistsNotExistsOperator(value: string): boolean {
	const { tagOperator } = getTagToken(value);
	return (
		tagOperator?.trim() === OPERATORS.NOT_EXISTS ||
		tagOperator?.trim() === OPERATORS.EXISTS
	);
}

export function getRemovePrefixFromKey(tag: string): string {
	return tag?.replace(/^(tag_|resource_)/, '').trim();
}

export function getOperatorValue(op: string): string {
	switch (op) {
		case 'IN':
			return 'in';
		case 'NOT_IN':
			return 'nin';
		case OPERATORS.REGEX:
			return 'regex';
		case OPERATORS.HAS:
			return 'has';
		case OPERATORS.NHAS:
			return 'nhas';
		case OPERATORS.NREGEX:
			return 'nregex';
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
		case 'regex':
			return OPERATORS.REGEX;
		case 'nregex':
			return OPERATORS.NREGEX;
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
		case 'has':
			return OPERATORS.HAS;
		case 'nhas':
			return OPERATORS.NHAS;
		default:
			return op;
	}
}

export function replaceStringWithMaxLength(
	mainString: string,
	array: string[],
	replacementString: string,
): string {
	const lastSearchValue = array.pop() ?? '';
	if (lastSearchValue === '') {
		return `${mainString}${replacementString},`;
	}
	const updatedString = mainString.replace(
		new RegExp(`${lastSearchValue}(?=[^${lastSearchValue}]*$)`),
		replacementString,
	);
	return `${updatedString},`;
}

export function checkCommaInValue(str: string): string {
	return str.includes(',') ? `"${str}"` : str;
}

export function getRemoveOrderFromValue(tag: string): string {
	const match = parse(tag, { delimiter: orderByValueDelimiter });
	if (match) {
		const [key] = match.data.flat() as string[];
		return key;
	}
	return tag;
}
